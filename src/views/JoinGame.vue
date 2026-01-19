<template>
  <div class="join-game-page">
    <van-nav-bar title="加入牌局" left-arrow @click="$router.back()" fixed placeholder />

    <div class="join-container">
      <van-cell-group inset>
        <van-field
          v-model="roomCode"
          label="房间号"
          placeholder="请输入3位房间号"
          maxlength="3"
          type="digit"
        />
        <van-field
          v-model="playerName"
          label="我的昵称"
          placeholder="请输入你的昵称"
          clearable
        />
      </van-cell-group>

      <div style="margin: 16px;">
        <van-button type="primary" block @click="joinGame">加入牌局</van-button>
      </div>

      <van-divider>或</van-divider>

      <div style="padding: 16px;">
        <van-button block @click="createNewGame">创建新牌局</van-button>
      </div>
    </div>

    <!-- 当前牌局信息 -->
    <div v-if="currentGame" class="current-game">
      <van-cell-group inset title="当前牌局">
        <van-cell title="牌局名称" :value="currentGame.gameName" />
        <van-cell title="房间号" :value="currentGame.roomCode" />
        <van-cell title="创建者" :value="currentGame.creator" />
        <van-cell title="我的昵称" :value="currentPlayer" />
        <van-cell>
          <template #title>
            <div style="display: flex; justify-content: space-between; align-items: center;">
              <span>参与玩家</span>
              <van-tag type="primary">{{ currentGame.players.length }}人</van-tag>
            </div>
          </template>
          <template #value>
            <div style="display: flex; flex-wrap: wrap; gap: 4px;">
              <van-tag v-for="(playerName, index) in Object.values(currentGame.playerNames || {})" :key="index">
                {{ playerName }}
              </van-tag>
            </div>
          </template>
        </van-cell>
      </van-cell-group>

      <div style="padding: 16px;">
        <van-button type="primary" block @click="toGameDetail">进入牌局</van-button>
        <van-button plain block style="margin-top: 12px;" @click="leaveGame">离开牌局</van-button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { showToast } from 'vant'
import storage from '../utils/storage'

const router = useRouter()
const roomCode = ref('')
const playerName = ref('')
const currentGame = ref(null)
const currentPlayer = ref('')
const users = ref([])

onMounted(async () => {
  // 加载本地保存的玩家昵称和房间号
  const savedPlayerName = localStorage.getItem('playerName')
  const savedRoomCode = localStorage.getItem('currentRoomCode')

  if (savedPlayerName) {
    playerName.value = savedPlayerName
    currentPlayer.value = savedPlayerName
  }

  if (savedRoomCode) {
    roomCode.value = savedRoomCode
    await loadCurrentGame(savedRoomCode)
  }

  await loadUsers()
})

// 加载用户列表
async function loadUsers() {
  users.value = await storage.getAll('users')
}

// 获取玩家名称
function getPlayerNames(playerIds) {
  return playerIds.map(id => {
    const user = users.value.find(u => u.id === id)
    return user ? user.nickname : `玩家${id}`
  })
}

// 加载当前牌局
async function loadCurrentGame(code) {
  const games = await storage.getAll('games')
  const game = games.find(g => g.roomCode === code && g.status === 'playing')

  if (game) {
    currentGame.value = game
  }
}

// 加入牌局
async function joinGame() {
  if (!roomCode.value || roomCode.value.length !== 3) {
    showToast('请输入3位房间号')
    return
  }

  if (!playerName.value.trim()) {
    showToast('请输入你的昵称')
    return
  }

  // 查找房间
  const games = await storage.getAll('games')
  const game = games.find(g => g.roomCode === roomCode.value && g.status === 'playing')

  if (!game) {
    showToast('房间不存在或已结束')
    return
  }

  // 检查或创建用户
  let user = users.value.find(u => u.nickname === playerName.value.trim())

  if (!user) {
    const userId = await storage.add('users', {
      nickname: playerName.value.trim(),
      avatar: 'default.png',
      createdAt: new Date().toISOString()
    })
    user = { id: userId, nickname: playerName.value.trim() }
    await loadUsers()
  }

  // 添加玩家到牌局(如果还未加入)
  if (!game.players.includes(user.id)) {
    game.players.push(user.id)
    game.scores[user.id] = 0
    // 初始化或更新playerNames
    if (!game.playerNames) {
      game.playerNames = {}
    }
    game.playerNames[user.id] = user.nickname
    await storage.update('games', game)
  }

  // 保存到本地
  localStorage.setItem('playerName', playerName.value.trim())
  localStorage.setItem('currentRoomCode', roomCode.value)
  localStorage.setItem('currentPlayerId', user.id.toString())
  currentPlayer.value = playerName.value.trim()

  currentGame.value = game
  showToast('加入成功!')
}

// 创建新牌局
function createNewGame() {
  router.push('/')
}

// 进入牌局详情
function toGameDetail() {
  if (currentGame.value) {
    router.push(`/game/${currentGame.value.id}`)
  }
}

// 离开牌局
async function leaveGame() {
  localStorage.removeItem('currentRoomCode')
  currentGame.value = null
  roomCode.value = ''
  showToast('已离开牌局')
}
</script>

<style scoped>
.join-game-page {
  min-height: 100vh;
  background: #f7f8fa;
  padding-bottom: 60px;
}

.join-container {
  padding: 16px 0;
}

.current-game {
  margin-top: 24px;
}
</style>
