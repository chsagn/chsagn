<template>
  <div class="game-detail" v-if="game">
    <!-- 导航栏 -->
    <van-nav-bar
      :title="game.gameName || `${game.gameType}牌局`"
      left-arrow
      @click-left="$router.back()"
      fixed
      placeholder
    >
      <template #right>
        <van-icon name="share-o" @click="shareGame" />
      </template>
    </van-nav-bar>

    <!-- 牌局信息 -->
    <div class="game-info">
      <van-cell-group inset>
        <van-cell title="游戏类型" :value="game.gameType" />
        <van-cell title="开始时间" :value="formatDateTime(game.startTime)" />
        <van-cell title="参与人数" :value="`${game.players.length}人`" />
        <van-cell title="当前轮数" :value="`第${game.currentRound}局`" />
        <van-cell
          v-if="game.status === 'finished'"
          title="结束时间"
          :value="formatDateTime(game.endTime)"
        />
      </van-cell-group>
    </div>

    <!-- 实时积分榜 -->
    <ScoreBoard
      :scores="game.scores"
      :players="game.players"
      :users="users"
      :current-round="game.currentRound"
      :last-round-scores="lastRoundScores"
    />

    <!-- 快速操作按钮 -->
    <div class="quick-actions" v-if="game.status === 'playing'">
      <van-button
        type="primary"
        size="large"
        icon="add-o"
        block
        @click="showRecordForm = true"
      >
        记录本局得分
      </van-button>
    </div>

    <!-- 历史轮次 -->
    <RoundHistory ref="historyRef" :game-id="gameId" :users="users" />

    <!-- 底部操作 -->
    <div class="bottom-actions">
      <van-button
        v-if="game.status === 'playing'"
        block
        type="warning"
        @click="endGameConfirm"
      >
        结束牌局
      </van-button>
      <van-button
        v-else
        block
        plain
        @click="viewFullReport"
      >
        查看完整报表
      </van-button>
    </div>

    <!-- 记录得分弹窗 -->
    <van-popup
      v-model:show="showRecordForm"
      position="bottom"
      round
      :style="{ height: '70%' }"
      closeable
    >
      <RecordForm
        :players="game.players"
        :users="users"
        :round-number="game.currentRound + 1"
        @submit="onRecordSubmit"
        @cancel="showRecordForm = false"
      />
    </van-popup>

    <!-- 结算报表弹窗 -->
    <van-popup
      v-model:show="showReport"
      position="center"
      round
      :style="{ width: '90%' }"
      closeable
    >
      <div class="report-content" id="game-report">
        <h2>{{ game.gameName || `${game.gameType}牌局` }}</h2>
        <p class="report-time">
          {{ formatDateTime(game.startTime) }} -
          {{ game.endTime ? formatDateTime(game.endTime) : '进行中' }}
        </p>
        <van-divider />
        <div class="final-scores">
          <h3>最终排名</h3>
          <div v-for="(item, index) in sortedFinalScores" :key="item.userId" class="rank-item">
            <span class="rank">{{ index + 1 }}</span>
            <span class="name">{{ item.userName }}</span>
            <span class="score" :class="{ positive: item.score > 0, negative: item.score < 0 }">
              {{ item.score > 0 ? '+' : '' }}{{ item.score }}
            </span>
          </div>
        </div>
        <van-divider />
        <p class="stats">共进行 {{ game.totalRounds }} 局</p>
      </div>
      <div class="report-actions">
        <van-button type="primary" block @click="captureReport">
          <van-icon name="photo-o" />
          截图保存
        </van-button>
      </div>
    </van-popup>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { showToast, showConfirmDialog } from 'vant'
import storage from '../utils/storage'
import dayjs from 'dayjs'
import ScoreBoard from '../components/ScoreBoard.vue'
import RecordForm from '../components/RecordForm.vue'
import RoundHistory from '../components/RoundHistory.vue'

const route = useRoute()
const router = useRouter()

const gameId = ref(Number(route.params.id))
const game = ref(null)
const users = ref([])
const showRecordForm = ref(false)
const showReport = ref(false)
const historyRef = ref(null)

// 上一局的得分变化
const lastRoundScores = ref({})

// 最终排名
const sortedFinalScores = computed(() => {
  if (!game.value) return []

  const playerData = game.value.players.map(userId => {
    const user = users.value.find(u => u.id === userId)
    return {
      userId,
      userName: user ? user.nickname : `玩家${userId}`,
      score: game.value.scores[userId] || 0
    }
  })

  return playerData.sort((a, b) => b.score - a.score)
})

onMounted(async () => {
  await loadData()
})

// 加载数据
async function loadData() {
  game.value = await storage.getById('games', gameId.value)
  users.value = await storage.getAll('users')

  // 加载最后一轮的得分变化
  if (game.value && game.value.currentRound > 0) {
    const records = await storage.getByIndex('records', 'gameId', gameId.value)
    const lastRecord = records[records.length - 1]
    if (lastRecord) {
      lastRoundScores.value = lastRecord.scores
    }
  }
}

// 提交记录
async function onRecordSubmit(recordData) {
  try {
    // 更新累计得分
    for (const [userId, score] of Object.entries(recordData.scores)) {
      game.value.scores[userId] = (game.value.scores[userId] || 0) + score
    }

    // 增加轮数
    game.value.currentRound++
    game.value.totalRounds++

    // 保存牌局
    await storage.update('games', game.value)

    // 保存记录
    await storage.add('records', {
      gameId: gameId.value,
      roundNumber: game.value.currentRound,
      timestamp: recordData.timestamp,
      scores: recordData.scores,
      note: recordData.note
    })

    // 更新最后一轮得分
    lastRoundScores.value = recordData.scores

    // 刷新历史记录
    if (historyRef.value) {
      historyRef.value.refresh()
    }

    showRecordForm.value = false
    showToast('记录成功')
  } catch (error) {
    console.error('记录失败:', error)
    showToast('记录失败')
  }
}

// 结束牌局
async function endGameConfirm() {
  try {
    await showConfirmDialog({
      title: '确认结束牌局？',
      message: '结束后将无法继续记录得分',
      confirmButtonText: '确认结束',
      cancelButtonText: '取消'
    })

    game.value.status = 'finished'
    game.value.endTime = new Date().toISOString()
    await storage.update('games', game.value)

    showToast('牌局已结束')
    showReport.value = true
  } catch {
    // 用户取消
  }
}

// 查看完整报表
function viewFullReport() {
  showReport.value = true
}

// 截图保存
async function captureReport() {
  try {
    // 动态导入html2canvas
    const html2canvas = (await import('html2canvas')).default
    const element = document.getElementById('game-report')

    const canvas = await html2canvas(element, {
      backgroundColor: '#ffffff',
      scale: 2,
      useCORS: true
    })

    const dataURL = canvas.toDataURL('image/png')

    // 下载图片
    const link = document.createElement('a')
    link.download = `${game.value.gameName}_${Date.now()}.png`
    link.href = dataURL
    link.click()

    showToast('截图已保存')
  } catch (error) {
    console.error('截图失败:', error)
    showToast('截图失败')
  }
}

// 分享牌局
function shareGame() {
  if (navigator.share) {
    navigator.share({
      title: game.value.gameName || '打牌记账',
      text: `${game.value.gameType}牌局，已进行${game.value.totalRounds}局`
    })
  } else {
    showToast('浏览器不支持分享功能')
  }
}

// 格式化日期时间
function formatDateTime(datetime) {
  return dayjs(datetime).format('YYYY-MM-DD HH:mm')
}
</script>

<style scoped>
.game-detail {
  min-height: 100vh;
  background: #f7f8fa;
  padding-bottom: 80px;
}

.game-info {
  padding: 12px;
}

.quick-actions {
  padding: 12px;
}

.bottom-actions {
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  padding: 12px;
  background: #fff;
  box-shadow: 0 -2px 8px rgba(0, 0, 0, 0.1);
}

.report-content {
  padding: 20px;
  background: #fff;
}

.report-content h2 {
  margin: 0 0 8px;
  text-align: center;
  font-size: 20px;
  color: #323233;
}

.report-time {
  margin: 0 0 16px;
  text-align: center;
  font-size: 12px;
  color: #969799;
}

.final-scores h3 {
  margin: 0 0 16px;
  font-size: 16px;
  color: #323233;
}

.rank-item {
  display: flex;
  align-items: center;
  padding: 12px;
  margin-bottom: 8px;
  background: #f7f8fa;
  border-radius: 8px;
}

.rank-item .rank {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 28px;
  height: 28px;
  margin-right: 12px;
  background: #1989fa;
  color: #fff;
  border-radius: 50%;
  font-size: 14px;
  font-weight: bold;
}

.rank-item .name {
  flex: 1;
  font-size: 14px;
  color: #323233;
}

.rank-item .score {
  font-size: 18px;
  font-weight: 600;
}

.rank-item .score.positive {
  color: #07c160;
}

.rank-item .score.negative {
  color: #ee0a24;
}

.stats {
  margin: 16px 0 0;
  text-align: center;
  font-size: 12px;
  color: #969799;
}

.report-actions {
  padding: 0 20px 20px;
}
</style>
