<template>
  <div class="home-page">
    <!-- 顶部导航 -->
    <van-nav-bar title="打牌记账" fixed placeholder>
      <template #right>
        <van-icon name="replay" size="18" @click="refreshGames" style="margin-right: 12px;" />
        <van-icon name="setting-o" size="18" @click="toSettings" />
      </template>
    </van-nav-bar>

    <!-- 提示信息 -->
    <van-notice-bar left-icon="info-o" color="#ff976a" background="#fff7cc" closeable>
      每个设备独立存储数据，通过分享链接加入牌局
    </van-notice-bar>

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
        :title="game.gameName || '牌局'"
        :desc="`创建者: ${game.creator} | 开始时间: ${formatTime(game.startTime)}`"
        @click="toGameDetail(game.id)"
      >
        <template #tags>
          <van-tag type="primary">房间号: {{ game.roomCode }}</van-tag>
          <van-tag type="success" style="margin-left: 4px">第{{ game.currentRound }}局</van-tag>
          <van-tag plain style="margin-left: 4px">{{ game.players.length }}人</van-tag>
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
        :title="game.gameName || '牌局'"
        :desc="`创建者: ${game.creator} | ${formatTime(game.startTime)} - ${formatTime(game.endTime)}`"
        @click="toGameDetail(game.id)"
      >
        <template #tags>
          <van-tag plain>已结束</van-tag>
          <van-tag type="warning" style="margin-left: 4px">共{{ game.totalRounds }}局</van-tag>
          <van-tag plain style="margin-left: 4px">{{ game.players.length }}人</van-tag>
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
    <van-popup v-model:show="showCreateGame" position="bottom" round :style="{ height: '40%' }">
      <div class="create-game-form">
        <h3>新建牌局</h3>
        <van-field
          v-model="newGame.gameName"
          label="牌局名称"
          placeholder="例如：周末麻将"
          clearable
        />
        <van-field
          v-model="newGame.creatorName"
          label="您的昵称"
          placeholder="请输入您的昵称"
          clearable
        />
        <div style="margin-top: 16px; padding: 0 16px;">
          <van-button type="primary" block @click="createGame">创建牌局</van-button>
        </div>
      </div>
    </van-popup>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { showToast } from 'vant'
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

// 新建牌局表单
const newGame = ref({
  gameName: '',
  creatorName: ''
})

// 加载数据
onMounted(async () => {
  await loadGames()
  // 从localStorage读取保存的昵称
  const savedName = localStorage.getItem('playerName')
  if (savedName) {
    newGame.value.creatorName = savedName
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

// 格式化时间
function formatTime(time) {
  return dayjs(time).format('MM-DD HH:mm')
}

// 创建牌局
async function createGame() {
  if (!newGame.value.creatorName?.trim()) {
    return alert('请输入您的昵称')
  }

  // 保存昵称到localStorage
  localStorage.setItem('playerName', newGame.value.creatorName.trim())

  // 生成3位房间号
  const roomCode = Math.floor(100 + Math.random() * 900).toString()

  // 创建或获取创建者用户
  let creator = users.value.find(u => u.nickname === newGame.value.creatorName.trim())
  if (!creator) {
    const creatorId = await storage.add('users', {
      nickname: newGame.value.creatorName.trim(),
      avatar: 'default.png',
      createdAt: new Date().toISOString()
    })
    creator = { id: creatorId, nickname: newGame.value.creatorName.trim() }
  }

  // 创建游戏数据对象
  const gameData = {
    gameName: newGame.value.gameName?.trim() || '新建牌局',
    creator: creator.nickname,
    creatorId: creator.id,
    players: [creator.id], // 初始只有创建者
    roomCode: roomCode,
    startTime: new Date().toISOString(),
    endTime: null,
    status: 'playing',
    currentRound: 0,
    totalRounds: 0,
    scores: {
      [creator.id]: 0
    },
    playerNames: {
      [creator.id]: creator.nickname
    }
  }

  const gameId = await storage.add('games', gameData)

  showCreateGame.value = false
  newGame.value = { gameName: '', creatorName: localStorage.getItem('playerName') || '' }
  await loadGames()

  // 生成分享链接
  const shareUrl = `${window.location.origin}${window.location.pathname}#/join?room=${roomCode}&game=${encodeURIComponent(gameData.gameName)}&creator=${encodeURIComponent(creator.nickname)}`

  // 显示房间号和分享链接
  const message = `牌局创建成功!\n房间号: ${roomCode}\n\n分享链接给其他玩家：\n${shareUrl}`

  // 尝试复制到剪贴板
  if (navigator.clipboard) {
    try {
      await navigator.clipboard.writeText(shareUrl)
      alert(`${message}\n\n✅ 链接已复制到剪贴板`)
    } catch (e) {
      alert(message)
    }
  } else {
    alert(message)
  }

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

// 刷新牌局列表
async function refreshGames() {
  await loadGames()
  showToast('数据已刷新')
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
