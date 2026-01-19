// 跨标签页同步工具
class SyncManager {
  constructor() {
    this.channel = new BroadcastChannel('bookking_sync')
    this.listeners = new Map()

    // 监听其他标签页的消息
    this.channel.onmessage = (event) => {
      const { type, storeName, data } = event.data

      // 触发对应的监听器
      const key = `${type}:${storeName}`
      const callbacks = this.listeners.get(key) || []
      callbacks.forEach(callback => callback(data))
    }
  }

  // 通知其他标签页数据变化
  notify(type, storeName, data) {
    this.channel.postMessage({ type, storeName, data, timestamp: Date.now() })
  }

  // 监听数据变化
  on(type, storeName, callback) {
    const key = `${type}:${storeName}`
    const callbacks = this.listeners.get(key) || []
    callbacks.push(callback)
    this.listeners.set(key, callbacks)

    // 返回取消监听函数
    return () => {
      const cbs = this.listeners.get(key) || []
      const index = cbs.indexOf(callback)
      if (index > -1) {
        cbs.splice(index, 1)
      }
    }
  }

  // 关闭同步
  close() {
    this.channel.close()
    this.listeners.clear()
  }
}

export default new SyncManager()
