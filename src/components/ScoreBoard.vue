<template>
  <div class="score-board">
    <van-card title="实时积分榜" class="board-card">
      <template #tags>
        <van-tag type="primary">第{{ currentRound }}局</van-tag>
      </template>
      <template #default>
        <div class="player-list">
          <div
            v-for="(item, index) in sortedPlayers"
            :key="item.userId"
            class="player-item"
            :class="{ 'rank-1': index === 0, 'rank-last': index === sortedPlayers.length - 1 }"
          >
            <div class="rank">
              <span class="rank-number">{{ index + 1 }}</span>
              <van-icon v-if="index === 0" name="medal-o" color="#ffd700" />
            </div>
            <div class="player-info">
              <div class="name">{{ item.userName }}</div>
              <div class="change" v-if="item.lastChange !== undefined">
                <span v-if="item.lastChange > 0" class="positive">
                  ↑ +{{ item.lastChange }}
                </span>
                <span v-else-if="item.lastChange < 0" class="negative">
                  ↓ {{ item.lastChange }}
                </span>
                <span v-else class="neutral">-</span>
              </div>
            </div>
            <div class="score" :class="{ positive: item.score > 0, negative: item.score < 0, zero: item.score === 0 }">
              <span class="score-value">{{ item.score > 0 ? '+' : '' }}{{ item.score }}</span>
            </div>
          </div>
        </div>
      </template>
    </van-card>
  </div>
</template>

<script setup>
import { computed } from 'vue'

const props = defineProps({
  scores: {
    type: Object,
    required: true,
    default: () => ({})
  },
  players: {
    type: Array,
    required: true,
    default: () => []
  },
  users: {
    type: Array,
    default: () => []
  },
  currentRound: {
    type: Number,
    default: 0
  },
  lastRoundScores: {
    type: Object,
    default: () => ({})
  }
})

// 按得分排序的玩家列表
const sortedPlayers = computed(() => {
  const playerData = props.players.map(userId => {
    const user = props.users.find(u => u.id === userId)
    const score = props.scores[userId] || 0
    const lastChange = props.lastRoundScores[userId]

    return {
      userId,
      userName: user ? user.nickname : `玩家${userId}`,
      score,
      lastChange
    }
  })

  return playerData.sort((a, b) => b.score - a.score)
})
</script>

<style scoped>
.score-board {
  padding: 12px;
}

.board-card {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  border-radius: 12px;
  overflow: hidden;
}

.board-card :deep(.van-card__title) {
  color: white;
  font-size: 18px;
  font-weight: bold;
}

.player-list {
  margin-top: 12px;
}

.player-item {
  display: flex;
  align-items: center;
  padding: 12px;
  margin-bottom: 8px;
  background: rgba(255, 255, 255, 0.1);
  border-radius: 8px;
  backdrop-filter: blur(10px);
  transition: all 0.3s;
}

.player-item:hover {
  background: rgba(255, 255, 255, 0.2);
  transform: translateX(4px);
}

.rank-1 {
  background: linear-gradient(135deg, rgba(255, 215, 0, 0.3) 0%, rgba(255, 193, 7, 0.3) 100%);
  border: 2px solid rgba(255, 215, 0, 0.5);
}

.rank-last {
  background: rgba(238, 10, 36, 0.1);
}

.rank {
  display: flex;
  align-items: center;
  min-width: 50px;
}

.rank-number {
  font-size: 20px;
  font-weight: bold;
  color: white;
  margin-right: 4px;
}

.player-info {
  flex: 1;
  margin-left: 12px;
}

.name {
  font-size: 16px;
  font-weight: 600;
  color: white;
  margin-bottom: 4px;
}

.change {
  font-size: 12px;
}

.change .positive {
  color: #07c160;
}

.change .negative {
  color: #ee0a24;
}

.change .neutral {
  color: #999;
}

.score {
  min-width: 80px;
  text-align: right;
}

.score-value {
  font-size: 24px;
  font-weight: bold;
}

.score.positive .score-value {
  color: #07c160;
}

.score.negative .score-value {
  color: #ee0a24;
}

.score.zero .score-value {
  color: #ccc;
}
</style>
