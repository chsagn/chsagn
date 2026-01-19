<template>
  <div class="users-page">
    <van-nav-bar title="用户管理" left-arrow @click-left="$router.back()" fixed placeholder />

    <!-- 用户列表 -->
    <div class="user-list">
      <van-cell-group inset>
        <van-cell
          v-for="user in users"
          :key="user.id"
          :title="user.nickname"
          :label="`创建时间: ${formatDate(user.createdAt)}`"
        >
          <template #icon>
            <van-icon name="user-o" size="20" style="margin-right: 12px;" />
          </template>
          <template #right-icon>
            <van-button size="small" type="primary" plain @click="editUser(user)">
              编辑
            </van-button>
            <van-button size="small" type="danger" plain @click="deleteUserConfirm(user)" style="margin-left: 8px;">
              删除
            </van-button>
          </template>
        </van-cell>
      </van-cell-group>
    </div>

    <!-- 添加用户按钮 -->
    <div class="add-button">
      <van-button type="primary" size="large" icon="plus" block @click="showAddDialog = true">
        添加用户
      </van-button>
    </div>

    <!-- 添加/编辑用户弹窗 -->
    <van-dialog
      v-model:show="showAddDialog"
      :title="editingUser ? '编辑用户' : '添加用户'"
      show-cancel-button
      @confirm="saveUser"
    >
      <van-form style="padding: 16px;">
        <van-field
          v-model="userForm.nickname"
          label="昵称"
          placeholder="请输入昵称"
          required
          :rules="[{ required: true, message: '请输入昵称' }]"
        />
      </van-form>
    </van-dialog>

    <!-- 底部导航 -->
    <van-tabbar v-model="active" route>
      <van-tabbar-item icon="home-o" to="/">首页</van-tabbar-item>
      <van-tabbar-item icon="orders-o" to="/history">历史</van-tabbar-item>
      <van-tabbar-item icon="friends-o" to="/users">用户</van-tabbar-item>
    </van-tabbar>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { showToast, showConfirmDialog } from 'vant'
import storage from '../utils/storage'
import dayjs from 'dayjs'

const active = ref(2)
const users = ref([])
const showAddDialog = ref(false)
const editingUser = ref(null)
const userForm = ref({
  nickname: ''
})

onMounted(async () => {
  await loadUsers()
})

// 加载用户列表
async function loadUsers() {
  users.value = await storage.getAll('users')
}

// 编辑用户
function editUser(user) {
  editingUser.value = user
  userForm.value.nickname = user.nickname
  showAddDialog.value = true
}

// 保存用户
async function saveUser() {
  if (!userForm.value.nickname.trim()) {
    showToast('请输入昵称')
    return
  }

  try {
    if (editingUser.value) {
      // 更新用户
      editingUser.value.nickname = userForm.value.nickname.trim()
      await storage.update('users', editingUser.value)
      showToast('更新成功')
    } else {
      // 添加用户
      await storage.add('users', {
        nickname: userForm.value.nickname.trim(),
        avatar: 'default.png',
        createdAt: new Date().toISOString()
      })
      showToast('添加成功')
    }

    await loadUsers()
    showAddDialog.value = false
    editingUser.value = null
    userForm.value.nickname = ''
  } catch (error) {
    console.error('保存失败:', error)
    showToast('操作失败')
  }
}

// 删除用户确认
async function deleteUserConfirm(user) {
  try {
    // 检查用户是否在进行中的牌局
    const games = await storage.getAll('games')
    const activeGames = games.filter(g => g.status === 'playing' && g.players.includes(user.id))

    if (activeGames.length > 0) {
      showToast('该用户正在进行中的牌局，无法删除')
      return
    }

    await showConfirmDialog({
      title: '确认删除？',
      message: `确定要删除用户"${user.nickname}"吗？`,
      confirmButtonText: '删除',
      cancelButtonText: '取消'
    })

    await storage.delete('users', user.id)
    await loadUsers()
    showToast('删除成功')
  } catch (error) {
    // 用户取消或删除失败
    if (error !== 'cancel') {
      console.error('删除失败:', error)
      showToast('删除失败')
    }
  }
}

// 格式化日期
function formatDate(date) {
  return dayjs(date).format('YYYY-MM-DD HH:mm')
}
</script>

<style scoped>
.users-page {
  min-height: 100vh;
  background: #f7f8fa;
  padding-bottom: 60px;
}

.user-list {
  padding: 12px;
}

.add-button {
  position: fixed;
  bottom: 70px;
  left: 0;
  right: 0;
  padding: 12px;
}
</style>
