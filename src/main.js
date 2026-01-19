import { createApp } from 'vue'
import { createRouter, createWebHashHistory } from 'vue-router'
import Vant from 'vant'
import 'vant/lib/index.css'
import './assets/styles/main.css'
import App from './App.vue'

// 导入页面组件
import Home from './views/Home.vue'
import GameDetail from './views/GameDetail.vue'
import History from './views/History.vue'
import Users from './views/Users.vue'
import JoinGame from './views/JoinGame.vue'

// 路由配置
const routes = [
  { path: '/', name: 'Home', component: Home, meta: { title: '打牌记账' } },
  { path: '/game/:id', name: 'GameDetail', component: GameDetail, meta: { title: '牌局详情' } },
  { path: '/history', name: 'History', component: History, meta: { title: '历史记录' } },
  { path: '/users', name: 'Users', component: Users, meta: { title: '用户管理' } },
  { path: '/join', name: 'JoinGame', component: JoinGame, meta: { title: '加入牌局' } }
]

const router = createRouter({
  history: createWebHashHistory(),
  routes
})

// 路由守卫 - 设置页面标题
router.beforeEach((to, from, next) => {
  document.title = to.meta.title || '打牌记账助手'
  next()
})

const app = createApp(App)
app.use(router)
app.use(Vant)
app.mount('#app')
