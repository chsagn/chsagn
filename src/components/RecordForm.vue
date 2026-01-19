<template>
  <div class="record-form">
    <div class="form-header">
      <h3>记录第{{ roundNumber }}局得分</h3>
      <p class="tips">输入您本局的得分（赢为正数，输为负数）</p>
    </div>

    <van-form @submit="onSubmit">
      <!-- 选择自己 -->
      <van-field
        label="选择您的昵称"
        :model-value="selectedPlayerName"
        placeholder="请选择"
        readonly
        clickable
        @click="showPlayerPicker = true"
      />

      <!-- 得分输入 -->
      <div class="score-input-section">
        <van-field
          v-model.number="score"
          type="number"
          label="您的得分"
          placeholder="请输入得分"
          :rules="[{ required: true, message: '请输入得分' }]"
        >
          <template #button>
            <div class="quick-buttons">
              <van-button size="mini" @click="score = (score || 0) + 100">+100</van-button>
              <van-button size="mini" @click="score = (score || 0) - 100">-100</van-button>
              <van-button size="mini" @click="score = (score || 0) + 10">+10</van-button>
              <van-button size="mini" @click="score = (score || 0) - 10">-10</van-button>
            </div>
          </template>
        </van-field>
      </div>

      <!-- 备注 -->
      <van-field
        v-model="note"
        rows="2"
        autosize
        type="textarea"
        label="备注"
        placeholder="添加备注（可选）"
        show-word-limit
        maxlength="100"
      />

      <!-- 提交按钮 -->
      <div class="form-actions">
        <van-button block type="primary" native-type="submit" :disabled="!selectedPlayerId">
          确认提交
        </van-button>
        <van-button block plain @click="$emit('cancel')">
          取消
        </van-button>
      </div>
    </van-form>

    <!-- 玩家选择器 -->
    <van-popup v-model:show="showPlayerPicker" position="bottom" round>
      <van-picker
        :columns="playerColumns"
        @confirm="onPlayerConfirm"
        @cancel="showPlayerPicker = false"
      />
    </van-popup>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'
import { showToast } from 'vant'

const props = defineProps({
  players: {
    type: Array,
    required: true
  },
  playerNames: {
    type: Object,
    required: true
  },
  roundNumber: {
    type: Number,
    required: true
  }
})

const emit = defineEmits(['submit', 'cancel'])

// 表单数据
const selectedPlayerId = ref(null)
const score = ref(0)
const note = ref('')
const showPlayerPicker = ref(false)

// 从localStorage读取上次选择的玩家
const savedPlayerId = localStorage.getItem('currentPlayerId')
if (savedPlayerId && props.players.includes(Number(savedPlayerId))) {
  selectedPlayerId.value = Number(savedPlayerId)
}

// 玩家列表选项
const playerColumns = computed(() => {
  return props.players.map(userId => ({
    text: props.playerNames[userId] || `玩家${userId}`,
    value: userId
  }))
})

// 选中的玩家名称
const selectedPlayerName = computed(() => {
  if (!selectedPlayerId.value) return ''
  return props.playerNames[selectedPlayerId.value] || `玩家${selectedPlayerId.value}`
})

// 选择玩家
function onPlayerConfirm({ selectedOptions }) {
  selectedPlayerId.value = selectedOptions[0].value
  localStorage.setItem('currentPlayerId', selectedPlayerId.value)
  showPlayerPicker.value = false
}

// 提交表单
function onSubmit() {
  if (!selectedPlayerId.value) {
    showToast('请选择您的昵称')
    return
  }

  if (score.value === undefined || score.value === null || score.value === '') {
    showToast('请输入得分')
    return
  }

  emit('submit', {
    playerId: selectedPlayerId.value,
    playerName: selectedPlayerName.value,
    score: Number(score.value) || 0,
    note: note.value,
    timestamp: new Date().toISOString()
  })

  // 重置表单（保留玩家选择）
  score.value = 0
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

.score-input-section {
  margin: 16px 0;
}

.quick-buttons {
  display: flex;
  gap: 4px;
  flex-wrap: wrap;
}

.form-actions {
  margin-top: 20px;
}

.form-actions .van-button {
  margin-bottom: 12px;
}
</style>
