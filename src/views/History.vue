<template>
  <div class="history-page">
    <van-nav-bar title="历史记录" left-arrow @click-left="$router.back()" fixed placeholder />

    <!-- 筛选器 -->
    <div class="filter-bar">
      <van-dropdown-menu>
        <van-dropdown-item v-model="filterStatus" :options="statusOptions" @change="filterGames" />
        <van-dropdown-item v-model="filterType" :options="typeOptions" @change="filterGames" />
      </van-dropdown-menu>
    </div>

    <!-- 牌局列表 -->
    <div class="game-list">
      <van-pull-refresh v-model="refreshing" @refresh="onRefresh">
        <div v-if="filteredGames.length === 0" class="empty">
          <van-empty description="暂无历史记录" />
        </div>

        <van-card
          v-for="game in filteredGames"
          :key="game.id"
          :title="game.gameName || `${game.gameType}牌局`"
          :desc="getGameDesc(game)"
          @click="toGameDetail(game.id)"
          class="game-card"
        >
          <template #tags>
            <van-tag :type="game.status === 'playing' ? 'primary' : 'default'">
              {{ game.status === 'playing' ? '进行中' : '已结束' }}
            </van-tag>
            <van-tag type="warning" style="margin-left: 4px;">
              {{ game.gameType }}
            </van-tag>
            <van-tag plain style="margin-left: 4px;">
              {{ game.totalRounds }}局
            </van-tag>
          </template>

          <template #footer>
            <div class="game-footer">
              <div class="players">
                <van-icon name="friends-o" />
                <span>{{ getPlayerNames(game.players).join('、') }}</span>
              </div>
              <div class="winner">
                <van-icon name="award-o" color="#ffd700" />
                <span>{{ getWinnerName(game) }}</span>
              </div>
            </div>
          </template>
        </van-card>
      </van-pull-refresh>
    </div>

    <!-- 统计数据 -->
    <van-action-sheet v-model:show="showStats" title="统计数据">
      <div class="stats-content">
        <van-cell-group>
          <van-cell title="总牌局数" :value="`${games.length}场`" />
          <van-cell title="进行中" :value="`${activeGamesCount}场`" />
          <van-cell title="已完成" :value="`${finishedGamesCount}场`" />
          <van-cell title="总局数" :value="`${totalRounds}局`" />
        </van-cell-group>
      </div>
    </van-action-sheet>

    <!-- 底部导航 -->
    <van-tabbar v-model="active" route>
      <van-tabbar-item icon="home-o" to="/">首页</van-tabbar-item>
      <van-tabbar-item icon="orders-o" to="/history">历史</van-tabbar-item>
      <van-tabbar-item icon="friends-o" to="/users">用户</van-tabbar-item>
    </van-tabbar>

    <!-- 悬浮按钮 -->
    <div class="fab">
      <van-button icon="bar-chart-o" type="primary" round @click="showStats = true">
        统计
      </van-button>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import storage from '../utils/storage'
import dayjs from 'dayjs'

const router = useRouter()
const active = ref(1)

const games = ref([])
const users = ref([])
const refreshing = ref(false)
const showStats = ref(false)

// 筛选条件
const filterStatus = ref(0)
const filterType = ref(0)

const statusOptions = [
  { text: '全部状态', value: 0 },
  { text: '进行中', value: 1 },
  { text: '已结束', value: 2 }
]

const typeOptions = [
  { text: '全部类型', value: 0 },
  { text: '麻将', value: 1 },
  { text: '扑克', value: 2 },
  { text: '桥牌', value: 3 },
  { text: '斗地主', value: 4 }
]

// 过滤后的牌局
const filteredGames = computed(() => {
  let result = [...games.value]

  // 状态筛选
  if (filterStatus.value === 1) {
    result = result.filter(g => g.status === 'playing')
  } else if (filterStatus.value === 2) {
    result = result.filter(g => g.status === 'finished')
  }

  // 类型筛选
  if (filterType.value > 0) {
    const typeMap = { 1: '麻将', 2: '扑克', 3: '桥牌', 4: '斗地主' }
    result = result.filter(g => g.gameType === typeMap[filterType.value])
  }

  // 按开始时间倒序排列
  return result.sort((a, b) => new Date(b.startTime) - new Date(a.startTime))
})

// 统计数据
const activeGamesCount = computed(() => games.value.filter(g => g.status === 'playing').length)
const finishedGamesCount = computed(() => games.value.filter(g => g.status === 'finished').length)
const totalRounds = computed(() => games.value.reduce((sum, g) => sum + g.totalRounds, 0))

onMounted(async () => {
  await loadData()
})

// 加载数据
async function loadData() {
  games.value = await storage.getAll('games')
  users.value = await storage.getAll('users')
}

// 下拉刷新
async function onRefresh() {
  await loadData()
  refreshing.value = false
}

// 筛选牌局
function filterGames() {
  // 触发计算属性重新计算
}

// 获取牌局描述
function getGameDesc(game) {
  const start = dayjs(game.startTime).format('MM-DD HH:mm')
  if (game.status === 'finished' && game.endTime) {
    const end = dayjs(game.endTime).format('HH:mm')
    return `${start} - ${end}`
  }
  return `${start} 开始`
}

// 获取玩家名称
function getPlayerNames(playerIds) {
  return playerIds.map(id => {
    const user = users.value.find(u => u.id === id)
    return user ? user.nickname : `玩家${id}`
  }).slice(0, 3) // 最多显示3个
}

// 获取赢家名称
function getWinnerName(game) {
  if (!game.scores || Object.keys(game.scores).length === 0) {
    return '暂无'
  }

  const winnerUserId = Object.entries(game.scores).sort((a, b) => b[1] - a[1])[0][0]
  const user = users.value.find(u => u.id === Number(winnerUserId))
  const score = game.scores[winnerUserId]

  return `${user ? user.nickname : `玩家${winnerUserId}`} (${score > 0 ? '+' : ''}${score})`
}

// 跳转到牌局详情
function toGameDetail(gameId) {
  router.push(`/game/${gameId}`)
}
</script>

<style scoped>
.history-page {
  min-height: 100vh;
  background: #f7f8fa;
  padding-bottom: 60px;
}

.filter-bar {
  position: sticky;
  top: 46px;
  z-index: 99;
}

.game-list {
  padding: 12px;
}

.empty {
  padding: 100px 0;
}

.game-card {
  margin-bottom: 12px;
  cursor: pointer;
  transition: transform 0.2s;
}

.game-card:hover {
  transform: translateY(-2px);
}

.game-footer {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-top: 8px;
  font-size: 12px;
  color: #969799;
}

.players,
.winner {
  display: flex;
  align-items: center;
  gap: 4px;
}

.stats-content {
  padding: 16px;
}

.fab {
  position: fixed;
  bottom: 80px;
  right: 20px;
  z-index: 100;
}
</style>
