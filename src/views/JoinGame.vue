<template>
  <div class="join-game-page">
    <van-nav-bar title="加入牌局" left-arrow @click="$router.back()" fixed placeholder />

    <!-- 使用说明 -->
    <van-notice-bar left-icon="info-o" color="#1989fa" background="#ecf9ff">
      请使用创建者分享的链接加入，或手动输入房间号
    </van-notice-bar>

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
import { useRouter, useRoute } from 'vue-router'
import { showToast } from 'vant'
import storage from '../utils/storage'

const router = useRouter()
const route = useRoute()
const roomCode = ref('')
const playerName = ref('')
const currentGame = ref(null)
const currentPlayer = ref('')
const users = ref([])

onMounted(async () => {
  await loadUsers()

  // 从URL参数获取房间信息
  const urlRoomCode = route.query.room
  const urlGameName = route.query.game
  const urlCreator = route.query.creator

  // 加载本地保存的玩家昵称和房间号
  const savedPlayerName = localStorage.getItem('playerName')
  const savedRoomCode = localStorage.getItem('currentRoomCode')

  if (savedPlayerName) {
    playerName.value = savedPlayerName
    currentPlayer.value = savedPlayerName
  }

  // 优先使用URL参数中的房间号
  if (urlRoomCode) {
    roomCode.value = urlRoomCode

    // 尝试从本地数据库加载
    let game = await loadCurrentGame(urlRoomCode)

    // 如果本地不存在，则自动创建（通过分享链接加入的情况）
    if (!game && urlGameName && urlCreator) {
      game = await createSharedGame(urlRoomCode, urlGameName, urlCreator)
    }
  } else if (savedRoomCode) {
    roomCode.value = savedRoomCode
    await loadCurrentGame(savedRoomCode)
  }
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
    return game
  }
  return null
}

// 通过分享链接创建房间（其他设备）
async function createSharedGame(roomCode, gameName, creatorName) {
  // 创建或获取创建者用户
  let creator = users.value.find(u => u.nickname === creatorName)
  if (!creator) {
    const creatorId = await storage.add('users', {
      nickname: creatorName,
      avatar: 'default.png',
      createdAt: new Date().toISOString()
    })
    creator = { id: creatorId, nickname: creatorName }
    await loadUsers()
  }

  // 创建游戏数据对象
  const gameData = {
    gameName: gameName,
    creator: creator.nickname,
    creatorId: creator.id,
    players: [creator.id],
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
  const game = await storage.getById('games', gameId)
  currentGame.value = game

  showToast(`已通过分享链接创建房间 ${roomCode}`)
  return game
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
  let game = games.find(g => g.roomCode === roomCode.value && g.status === 'playing')

  if (!game) {
    // 如果没找到房间，提示用户需要通过分享链接加入
    showToast('房间不存在，请使用创建者分享的链接加入')
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
