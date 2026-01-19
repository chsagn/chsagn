<template>
  <div class="round-history">
    <van-divider>历史轮次</van-divider>

    <div v-if="records.length === 0" class="empty">
      <van-empty description="暂无记录" />
    </div>

    <van-collapse v-else v-model="activeNames" accordion>
      <van-collapse-item
        v-for="record in reversedRecords"
        :key="record.id"
        :name="record.id"
      >
        <template #title>
          <div class="round-title">
            <van-tag type="primary">第{{ record.roundNumber }}局</van-tag>
            <span class="time">{{ formatTime(record.timestamp) }}</span>
          </div>
        </template>
        <template #default>
          <div class="round-detail">
            <div v-for="(score, userId) in record.scores" :key="userId" class="player-score">
              <span class="player-name">{{ getUserName(userId) }}</span>
              <span class="score" :class="{ positive: score > 0, negative: score < 0 }">
                {{ score > 0 ? '+' : '' }}{{ score }}
              </span>
            </div>
            <div v-if="record.note" class="note">
              <van-icon name="chat-o" />
              <span>{{ record.note }}</span>
            </div>
          </div>
        </template>
      </van-collapse-item>
    </van-collapse>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import storage from '../utils/storage'
import dayjs from 'dayjs'

const props = defineProps({
  gameId: {
    type: Number,
    required: true
  },
  users: {
    type: Array,
    default: () => []
  }
})

const records = ref([])
const activeNames = ref([])

// 反转记录顺序（最新的在前）
const reversedRecords = computed(() => {
  return [...records.value].reverse()
})

onMounted(async () => {
  await loadRecords()
})

// 加载记录
async function loadRecords() {
  const allRecords = await storage.getByIndex('records', 'gameId', props.gameId)
  records.value = allRecords.sort((a, b) => a.roundNumber - b.roundNumber)
}

// 格式化时间
function formatTime(timestamp) {
  return dayjs(timestamp).format('HH:mm:ss')
}

// 获取用户名
function getUserName(userId) {
  const user = props.users.find(u => u.id === Number(userId))
  return user ? user.nickname : `玩家${userId}`
}

// 暴露刷新方法
defineExpose({
  refresh: loadRecords
})
</script>

<style scoped>
.round-history {
  padding: 0 12px 12px;
}

.empty {
  padding: 40px 0;
}

.round-title {
  display: flex;
  align-items: center;
  width: 100%;
}

.time {
  margin-left: auto;
  font-size: 12px;
  color: #969799;
}

.round-detail {
  padding: 12px;
  background: #f7f8fa;
  border-radius: 8px;
}

.player-score {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 8px 0;
  border-bottom: 1px solid #ebedf0;
}

.player-score:last-of-type {
  border-bottom: none;
}

.player-name {
  font-size: 14px;
  color: #323233;
}

.score {
  font-size: 16px;
  font-weight: 600;
}

.score.positive {
  color: #07c160;
}

.score.negative {
  color: #ee0a24;
}

.note {
  display: flex;
  align-items: center;
  margin-top: 12px;
  padding: 8px;
  background: #fff;
  border-radius: 4px;
  font-size: 12px;
  color: #646566;
}

.note .van-icon {
  margin-right: 6px;
  color: #1989fa;
}
</style>
