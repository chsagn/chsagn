/**
 * 本地存储管理模块
 * 使用IndexedDB存储数据，支持离线使用
 */

import syncManager from './syncManager'

const DB_NAME = 'BookkingDB'
const DB_VERSION = 2  // 升级版本号以支持新的数据结构

class Storage {
  constructor() {
    this.db = null
    this.initDB()
  }

  // 初始化IndexedDB
  async initDB() {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION)

      request.onerror = () => reject(request.error)
      request.onsuccess = () => {
        this.db = request.result
        resolve(this.db)
      }

      request.onupgradeneeded = (event) => {
        const db = event.target.result

        // 用户表
        if (!db.objectStoreNames.contains('users')) {
          const userStore = db.createObjectStore('users', { keyPath: 'id', autoIncrement: true })
          userStore.createIndex('nickname', 'nickname', { unique: false })
        }

        // 牌局表
        if (!db.objectStoreNames.contains('games')) {
          const gameStore = db.createObjectStore('games', { keyPath: 'id', autoIncrement: true })
          gameStore.createIndex('startTime', 'startTime', { unique: false })
          gameStore.createIndex('status', 'status', { unique: false })
        }

        // 记录表（每个玩家每轮的得分记录）
        if (!db.objectStoreNames.contains('records')) {
          const recordStore = db.createObjectStore('records', { keyPath: 'id', autoIncrement: true })
          recordStore.createIndex('gameId', 'gameId', { unique: false })
          recordStore.createIndex('roundNumber', 'roundNumber', { unique: false })
          recordStore.createIndex('playerId', 'playerId', { unique: false })
          recordStore.createIndex('gameRound', ['gameId', 'roundNumber'], { unique: false })
          recordStore.createIndex('timestamp', 'timestamp', { unique: false })
        }
      }
    })
  }

  // 确保数据库已初始化
  async ensureDB() {
    if (!this.db) {
      await this.initDB()
    }
    return this.db
  }

  // 通用添加方法
  async add(storeName, data) {
    const db = await this.ensureDB()
    // 将数据转换为纯对象,去除Vue响应式代理
    const plainData = JSON.parse(JSON.stringify(data))

    return new Promise((resolve, reject) => {
      const transaction = db.transaction([storeName], 'readwrite')
      const store = transaction.objectStore(storeName)
      const request = store.add(plainData)

      request.onsuccess = () => {
        const id = request.result
        // 通知其他标签页
        syncManager.notify('add', storeName, { id, data: plainData })
        resolve(id)
      }
      request.onerror = () => reject(request.error)
    })
  }

  // 通用更新方法
  async update(storeName, data) {
    const db = await this.ensureDB()
    // 将数据转换为纯对象,去除Vue响应式代理
    const plainData = JSON.parse(JSON.stringify(data))

    return new Promise((resolve, reject) => {
      const transaction = db.transaction([storeName], 'readwrite')
      const store = transaction.objectStore(storeName)
      const request = store.put(plainData)

      request.onsuccess = () => {
        // 通知其他标签页
        syncManager.notify('update', storeName, { id: plainData.id, data: plainData })
        resolve(request.result)
      }
      request.onerror = () => reject(request.error)
    })
  }

  // 通用删除方法
  async delete(storeName, id) {
    const db = await this.ensureDB()
    return new Promise((resolve, reject) => {
      const transaction = db.transaction([storeName], 'readwrite')
      const store = transaction.objectStore(storeName)
      const request = store.delete(id)

      request.onsuccess = () => {
        // 通知其他标签页
        syncManager.notify('delete', storeName, { id })
        resolve()
      }
      request.onerror = () => reject(request.error)
    })
  }

  // 通用查询所有方法
  async getAll(storeName) {
    const db = await this.ensureDB()
    return new Promise((resolve, reject) => {
      const transaction = db.transaction([storeName], 'readonly')
      const store = transaction.objectStore(storeName)
      const request = store.getAll()

      request.onsuccess = () => resolve(request.result)
      request.onerror = () => reject(request.error)
    })
  }

  // 通过ID获取单条记录
  async getById(storeName, id) {
    const db = await this.ensureDB()
    return new Promise((resolve, reject) => {
      const transaction = db.transaction([storeName], 'readonly')
      const store = transaction.objectStore(storeName)
      const request = store.get(id)

      request.onsuccess = () => resolve(request.result)
      request.onerror = () => reject(request.error)
    })
  }

  // 通过索引查询
  async getByIndex(storeName, indexName, value) {
    const db = await this.ensureDB()
    return new Promise((resolve, reject) => {
      const transaction = db.transaction([storeName], 'readonly')
      const store = transaction.objectStore(storeName)
      const index = store.index(indexName)
      const request = index.getAll(value)

      request.onsuccess = () => resolve(request.result)
      request.onerror = () => reject(request.error)
    })
  }

  // 清空表
  async clear(storeName) {
    const db = await this.ensureDB()
    return new Promise((resolve, reject) => {
      const transaction = db.transaction([storeName], 'readwrite')
      const store = transaction.objectStore(storeName)
      const request = store.clear()

      request.onsuccess = () => resolve()
      request.onerror = () => reject(request.error)
    })
  }
}

// 导出单例
export default new Storage()
