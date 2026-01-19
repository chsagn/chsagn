<template>
  <div class="record-form">
    <div class="form-header">
      <h3>记录第{{ roundNumber }}局得分</h3>
      <p class="tips">输入每位玩家的得分变化（赢为正数，输为负数）</p>
    </div>

    <van-form @submit="onSubmit">
      <div class="player-scores">
        <div v-for="player in playerList" :key="player.userId" class="player-input">
          <div class="player-name">
            <van-icon name="user-o" />
            <span>{{ player.userName }}</span>
          </div>
          <van-field
            v-model.number="scores[player.userId]"
            type="digit"
            placeholder="0"
            :rules="[{ required: true, message: '请输入得分' }]"
          >
            <template #button>
              <div class="quick-buttons">
                <van-button size="mini" @click="scores[player.userId] = (scores[player.userId] || 0) + 100">
                  +100
                </van-button>
                <van-button size="mini" @click="scores[player.userId] = (scores[player.userId] || 0) - 100">
                  -100
                </van-button>
              </div>
            </template>
          </van-field>
        </div>
      </div>

      <!-- 得分总和检查 -->
      <div class="score-sum" :class="{ valid: isScoreSumValid, invalid: !isScoreSumValid }">
        <van-icon :name="isScoreSumValid ? 'success' : 'warning-o'" />
        <span>得分总和: {{ scoreSum }}</span>
        <span v-if="!isScoreSumValid" class="error-tip">（应为0）</span>
      </div>

      <!-- 备注 -->
      <van-field
        v-model="note"
        rows="2"
        autosize
        type="textarea"
        placeholder="添加备注（可选）"
        show-word-limit
        maxlength="100"
      />

      <!-- 提交按钮 -->
      <div class="form-actions">
        <van-button block type="primary" native-type="submit" :disabled="!isScoreSumValid">
          确认提交
        </van-button>
        <van-button block plain @click="$emit('cancel')">
          取消
        </van-button>
      </div>
    </van-form>
  </div>
</template>

<script setup>
import { ref, computed, watch } from 'vue'
import { showToast } from 'vant'

const props = defineProps({
  players: {
    type: Array,
    required: true
  },
  users: {
    type: Array,
    required: true
  },
  roundNumber: {
    type: Number,
    required: true
  }
})

const emit = defineEmits(['submit', 'cancel'])

// 得分数据
const scores = ref({})
const note = ref('')

// 初始化得分为0
props.players.forEach(userId => {
  scores.value[userId] = 0
})

// 玩家列表
const playerList = computed(() => {
  return props.players.map(userId => {
    const user = props.users.find(u => u.id === userId)
    return {
      userId,
      userName: user ? user.nickname : `玩家${userId}`
    }
  })
})

// 得分总和
const scoreSum = computed(() => {
  return Object.values(scores.value).reduce((sum, score) => sum + (Number(score) || 0), 0)
})

// 检查得分总和是否为0
const isScoreSumValid = computed(() => {
  return Math.abs(scoreSum.value) < 0.01 // 允许浮点误差
})

// 提交表单
function onSubmit() {
  if (!isScoreSumValid.value) {
    showToast('得分总和必须为0')
    return
  }

  // 转换为数字
  const finalScores = {}
  for (const [userId, score] of Object.entries(scores.value)) {
    finalScores[userId] = Number(score) || 0
  }

  emit('submit', {
    scores: finalScores,
    note: note.value,
    timestamp: new Date().toISOString()
  })

  // 重置表单
  props.players.forEach(userId => {
    scores.value[userId] = 0
  })
  note.value = ''
}
</script>

<style scoped>
.record-form {
  padding: 16px;
  background: #fff;
}

.form-header {
  margin-bottom: 20px;
  text-align: center;
}

.form-header h3 {
  margin: 0 0 8px;
  font-size: 18px;
  color: #323233;
}

.tips {
  margin: 0;
  font-size: 12px;
  color: #969799;
}

.player-scores {
  margin-bottom: 16px;
}

.player-input {
  margin-bottom: 16px;
}

.player-name {
  display: flex;
  align-items: center;
  margin-bottom: 8px;
  font-size: 14px;
  font-weight: 500;
  color: #323233;
}

.player-name .van-icon {
  margin-right: 6px;
  color: #1989fa;
}

.quick-buttons {
  display: flex;
  gap: 4px;
}

.score-sum {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 12px;
  margin: 16px 0;
  border-radius: 8px;
  font-size: 16px;
  font-weight: 600;
}

.score-sum.valid {
  background: #f0f9ff;
  color: #07c160;
}

.score-sum.invalid {
  background: #fff1f0;
  color: #ee0a24;
}

.score-sum .van-icon {
  margin-right: 8px;
  font-size: 20px;
}

.error-tip {
  margin-left: 4px;
  font-size: 12px;
}

.form-actions {
  margin-top: 20px;
}

.form-actions .van-button {
  margin-bottom: 12px;
}
</style>
