<template>
  <div class="home-page">
    <!-- 顶部导航 -->
    <van-nav-bar title="打牌记账" fixed placeholder>
      <template #right>
        <van-icon name="setting-o" size="18" @click="toSettings" />
      </template>
    </van-nav-bar>

    <!-- 快速操作 -->
    <div class="quick-actions">
      <van-row gutter="12">
        <van-col span="12">
          <van-button type="primary" block icon="plus" @click="showCreateGame = true">
            新建牌局
          </van-button>
        </van-col>
        <van-col span="12">
          <van-button block icon="friends-o" @click="toJoinGame">
            加入牌局
          </van-button>
        </van-col>
      </van-row>
    </div>

    <!-- 进行中的牌局 -->
    <van-divider>进行中的牌局</van-divider>
    <div class="game-list" v-if="activeGames.length > 0">
      <van-card
        v-for="game in activeGames"
        :key="game.id"
        :title="game.gameName || `${game.gameType}牌局`"
        :desc="`开始时间: ${formatTime(game.startTime)}`"
        @click="toGameDetail(game.id)"
      >
        <template #tags>
          <van-tag type="primary">{{ game.gameType }}</van-tag>
          <van-tag type="success" style="margin-left: 4px">第{{ game.currentRound }}局</van-tag>
        </template>
        <template #footer>
          <van-button size="small" type="primary" @click.stop="toGameDetail(game.id)">
            继续游戏
          </van-button>
          <van-button size="small" plain @click.stop="endGame(game.id)">
            结束
          </van-button>
        </template>
      </van-card>
    </div>
    <van-empty v-else description="暂无进行中的牌局" />

    <!-- 历史牌局 -->
    <van-divider>历史牌局</van-divider>
    <div class="game-list" v-if="finishedGames.length > 0">
      <van-card
        v-for="game in finishedGames.slice(0, 5)"
        :key="game.id"
        :title="game.gameName || `${game.gameType}牌局`"
        :desc="`${formatTime(game.startTime)} - ${formatTime(game.endTime)}`"
        @click="toGameDetail(game.id)"
      >
        <template #tags>
          <van-tag plain>已结束</van-tag>
          <van-tag type="warning" style="margin-left: 4px">共{{ game.totalRounds }}局</van-tag>
        </template>
      </van-card>
    </div>
    <van-empty v-else description="暂无历史牌局" />

    <!-- 底部导航 -->
    <van-tabbar v-model="active" route>
      <van-tabbar-item icon="home-o" to="/">首页</van-tabbar-item>
      <van-tabbar-item icon="orders-o" to="/history">历史</van-tabbar-item>
      <van-tabbar-item icon="friends-o" to="/users">用户</van-tabbar-item>
    </van-tabbar>

    <!-- 创建牌局弹窗 -->
    <van-popup v-model:show="showCreateGame" position="bottom" round :style="{ height: '60%' }">
      <div class="create-game-form">
        <h3>新建牌局</h3>
        <van-field
          v-model="newGame.gameName"
          label="牌局名称"
          placeholder="例如：周末麻将"
          clearable
        />
        <van-field
          v-model="newGame.gameType"
          label="游戏类型"
          placeholder="请选择"
          readonly
          clickable
          @click="showGameTypePicker = true"
        />
        <van-field
          label="参与玩家"
          placeholder="请选择玩家"
          readonly
          clickable
          @click="showPlayerPicker = true"
        >
          <template #input>
            <van-tag v-for="id in newGame.players" :key="id" style="margin-right: 4px">
              {{ getUserName(id) }}
            </van-tag>
          </template>
        </van-field>
        <div style="margin-top: 16px; padding: 0 16px;">
          <van-button type="primary" block @click="createGame">创建牌局</van-button>
        </div>
      </div>
    </van-popup>

    <!-- 游戏类型选择器 -->
    <van-popup v-model:show="showGameTypePicker" position="bottom" round>
      <van-picker
        :columns="gameTypes"
        @confirm="onGameTypeConfirm"
        @cancel="showGameTypePicker = false"
      />
    </van-popup>

    <!-- 玩家选择器 -->
    <van-popup v-model:show="showPlayerPicker" position="bottom" round :style="{ height: '70%' }">
      <div style="padding: 16px;">
        <h3 style="margin: 0 0 16px; text-align: center;">选择参与玩家</h3>
        <van-checkbox-group v-model="newGame.players">
          <van-space direction="vertical" fill>
            <van-checkbox
              v-for="user in users"
              :key="user.id"
              :name="user.id"
              shape="square"
              icon-size="20px"
            >
              {{ user.nickname }}
            </van-checkbox>
          </van-space>
        </van-checkbox-group>
        <div style="margin-top: 24px;">
          <van-button type="primary" block @click="showPlayerPicker = false">
            确定 (已选{{ newGame.players.length }}人)
          </van-button>
        </div>
      </div>
    </van-popup>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import storage from '../utils/storage'
import dayjs from 'dayjs'

const router = useRouter()
const active = ref(0)

// 数据
const activeGames = ref([])
const finishedGames = ref([])
const users = ref([])

// 弹窗控制
const showCreateGame = ref(false)
const showGameTypePicker = ref(false)
const showPlayerPicker = ref(false)

// 新建牌局表单
const newGame = ref({
  gameName: '',
  gameType: '',
  players: []
})

// 游戏类型选项
const gameTypes = [
  { text: '麻将', value: '麻将' },
  { text: '扑克', value: '扑克' },
  { text: '桥牌', value: '桥牌' },
  { text: '斗地主', value: '斗地主' },
  { text: '跑得快', value: '跑得快' },
  { text: '炸金花', value: '炸金花' },
  { text: '其他', value: '其他' }
]

// 加载数据
onMounted(async () => {
  await loadGames()
  await loadUsers()

  // 如果没有用户，创建默认用户
  if (users.value.length === 0) {
    await createDefaultUsers()
    await loadUsers()
  }
})

// 加载牌局
async function loadGames() {
  const allGames = await storage.getAll('games')
  activeGames.value = allGames.filter(g => g.status === 'playing')
  finishedGames.value = allGames.filter(g => g.status === 'finished').sort((a, b) =>
    new Date(b.endTime) - new Date(a.endTime)
  )
}

// 加载用户
async function loadUsers() {
  users.value = await storage.getAll('users')
}

// 创建默认用户
async function createDefaultUsers() {
  const defaultUsers = [
    '张三', '李四', '王五', '赵六',
    '钱七', '孙八', '周九', '吴十',
    '郑十一', '冯十二'
  ]
  for (const nickname of defaultUsers) {
    await storage.add('users', {
      nickname,
      avatar: 'default.png',
      createdAt: new Date().toISOString()
    })
  }
}

// 格式化时间
function formatTime(time) {
  return dayjs(time).format('MM-DD HH:mm')
}

// 获取用户名
function getUserName(userId) {
  const user = users.value.find(u => u.id === userId)
  return user ? user.nickname : '未知'
}

// 游戏类型确认
function onGameTypeConfirm({ selectedOptions }) {
  newGame.value.gameType = selectedOptions[0].text || selectedOptions[0]
  showGameTypePicker.value = false
}

// 创建牌局
async function createGame() {
  if (!newGame.value.gameType) {
    return alert('请选择游戏类型')
  }
  if (newGame.value.players.length < 2) {
    return alert('至少需要2个玩家')
  }

  // 生成6位房间号
  const roomCode = Math.floor(100000 + Math.random() * 900000).toString()

  const gameId = await storage.add('games', {
    gameName: newGame.value.gameName || `${newGame.value.gameType}牌局`,
    gameType: newGame.value.gameType,
    players: newGame.value.players,
    roomCode: roomCode,
    startTime: new Date().toISOString(),
    endTime: null,
    status: 'playing',
    currentRound: 0,
    totalRounds: 0,
    scores: Object.fromEntries(newGame.value.players.map(id => [id, 0]))
  })

  showCreateGame.value = false
  newGame.value = { gameName: '', gameType: '', players: [] }
  await loadGames()

  // 显示房间号
  alert(`牌局创建成功!\n房间号: ${roomCode}\n分享给其他玩家让他们加入`)

  // 跳转到牌局详情
  router.push(`/game/${gameId}`)
}

// 结束牌局
async function endGame(gameId) {
  const game = await storage.getById('games', gameId)
  game.status = 'finished'
  game.endTime = new Date().toISOString()
  await storage.update('games', game)
  await loadGames()
}

// 跳转到牌局详情
function toGameDetail(gameId) {
  router.push(`/game/${gameId}`)
}

// 跳转到加入牌局
function toJoinGame() {
  router.push('/join')
}

// 跳转到设置
function toSettings() {
  router.push('/users')
}
</script>

<style scoped>
.home-page {
  min-height: 100vh;
  background: #f7f8fa;
  padding-bottom: 60px;
}

.quick-actions {
  padding: 16px;
}

.game-list {
  padding: 0 16px 16px;
}

.create-game-form {
  padding: 16px;
}

.create-game-form h3 {
  margin: 0 0 16px;
  text-align: center;
}
</style>
