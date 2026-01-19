<template>
  <div class="game-detail" v-if="game">
    <!-- 导航栏 -->
    <van-nav-bar
      :title="game.gameName || '牌局'"
      left-arrow
      @click-left="$router.back()"
      fixed
      placeholder
    >
      <template #right>
        <van-icon name="replay" @click="refreshData" style="margin-right: 12px;" />
        <van-icon name="share-o" @click="shareGame" />
      </template>
    </van-nav-bar>

    <!-- 提示信息 -->
    <van-notice-bar left-icon="info-o" color="#1989fa" background="#ecf9ff" v-if="game.status === 'playing'">
      本地存储模式，点击右上角刷新图标查看最新数据
    </van-notice-bar>

    <!-- 牌局信息 -->
    <div class="game-info">
      <van-cell-group inset>
        <van-cell title="房间号" :value="game.roomCode" is-link @click="copyRoomCode">
          <template #right-icon>
            <van-icon name="share-o" style="margin-left: 4px;" />
          </template>
        </van-cell>
        <van-cell title="创建者" :value="game.creator" />
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
        :player-names="game.playerNames"
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
        <h2>{{ game.gameName || '牌局' }}</h2>
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
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { showToast, showConfirmDialog, showDialog } from 'vant'
import QRCode from 'qrcode'
import storage from '../utils/storage'
import syncManager from '../utils/syncManager'
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

// 自动刷新定时器
let refreshTimer = null
let unsubscribeSync = null

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

  // 监听跨标签页同步
  unsubscribeSync = syncManager.on('update', 'games', async (data) => {
    if (data.id === gameId.value) {
      await loadData()
      showToast('数据已更新')
    }
  })

  // 每5秒自动刷新一次数据
  refreshTimer = setInterval(async () => {
    await loadData()
  }, 5000)
})

onUnmounted(() => {
  // 清理定时器和监听器
  if (refreshTimer) {
    clearInterval(refreshTimer)
  }
  if (unsubscribeSync) {
    unsubscribeSync()
  }
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

// 手动刷新数据
async function refreshData() {
  await loadData()
  showToast('数据已刷新')
}

// 提交记录
async function onRecordSubmit(recordData) {
  try {
    const { playerId, playerName, score, note, timestamp } = recordData

    // 更新该玩家的累计得分
    game.value.scores[playerId] = (game.value.scores[playerId] || 0) + score

    // 检查当前轮是否已有记录（查询该游戏的所有记录，然后过滤当前轮）
    const allRecords = await storage.getByIndex('records', 'gameId', gameId.value)
    const nextRound = game.value.currentRound + 1
    const currentRoundRecords = allRecords.filter(r => r.roundNumber === nextRound)

    // 如果当前轮还没有任何记录，则轮数+1（第一个提交的人开启新一轮）
    if (currentRoundRecords.length === 0) {
      game.value.currentRound++
      game.value.totalRounds++
    }

    // 保存牌局
    await storage.update('games', game.value)

    // 保存该玩家的记录
    await storage.add('records', {
      gameId: gameId.value,
      roundNumber: game.value.currentRound,
      playerId: playerId,
      playerName: playerName,
      score: score,
      timestamp: timestamp,
      note: note
    })

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

// 复制房间号
async function copyRoomCode() {
  try {
    await navigator.clipboard.writeText(game.value.roomCode)
    showToast('房间号已复制')
  } catch (error) {
    // 不支持clipboard API,使用fallback方法
    const textArea = document.createElement('textarea')
    textArea.value = game.value.roomCode
    document.body.appendChild(textArea)
    textArea.select()
    try {
      document.execCommand('copy')
      showToast('房间号已复制')
    } catch (err) {
      showToast('复制失败,请手动复制: ' + game.value.roomCode)
    }
    document.body.removeChild(textArea)
  }
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
async function shareGame() {
  const shareUrl = `${window.location.origin}${window.location.pathname}#/join?room=${game.value.roomCode}&game=${encodeURIComponent(game.value.gameName)}&creator=${encodeURIComponent(game.value.creator)}`

  // 生成二维码
  try {
    const qrCodeDataURL = await QRCode.toDataURL(shareUrl, {
      width: 300,
      margin: 2
    })

    // 显示二维码弹窗
    await showDialog({
      title: '分享牌局',
      message: `
        <div style="text-align: center;">
          <p style="font-size: 16px; margin: 10px 0;">房间号: <strong>${game.value.roomCode}</strong></p>
          <p style="font-size: 14px; margin: 5px 0;">${game.value.gameName}</p>
          <img src="${qrCodeDataURL}" style="width: 200px; height: 200px; margin: 10px auto;" />
          <p style="font-size: 12px; color: #666; margin: 10px 0;">扫描二维码或分享链接加入</p>
          <p style="font-size: 11px; color: #999; word-break: break-all; padding: 0 10px;">${shareUrl}</p>
        </div>
      `,
      confirmButtonText: '复制链接',
      showCancelButton: true,
      cancelButtonText: '关闭',
      allowHtml: true
    })

    // 复制链接到剪贴板
    if (navigator.clipboard) {
      await navigator.clipboard.writeText(shareUrl)
      showToast('链接已复制')
    }
  } catch (e) {
    // 用户取消
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
