/**
 * 数据同步引擎
 * 本地 IndexedDB ↔ 云端 CloudBase 双向同步
 */
const SyncEngine = {
  _watchers: {},
  _syncQueue: [],
  _syncing: false,
  
  /**
   * 初始化同步
   */
  async init() {
    if (!CloudConfig.enabled) {
      console.log('[Sync] 云同步未启用');
      return;
    }
    
    // 首次全量同步：云端 → 本地
    await this.pullAll();
    
    // 启动实时监听
    this.startWatching();
    
    // 处理本地待同步队列
    this.processQueue();
    
    console.log('[Sync] 同步引擎启动完成');
  },
  
  /**
   * 从云端拉取全部数据
   */
  async pullAll() {
    if (!CloudConfig.enabled) return;
    
    const db = CloudConfig.db;
    const collections = ['tasks', 'events', 'notes', 'transactions', 'habits', 'birthdays', 'outfits', 'userConfig'];
    
    for (const col of collections) {
      try {
        const res = await db.collection(col).where({ uid: CloudConfig.uid }).get();
        if (res.data && res.data.length > 0) {
          await Storage.clear(col);
          await Storage.putAll(col, res.data);
        }
      } catch (err) {
        console.warn(`[Sync] 拉取 ${col} 失败:`, err);
      }
    }
  },
  
  /**
   * 推送本地数据到云端
   */
  async push(collection, doc) {
    if (!CloudConfig.enabled) return;
    
    const db = CloudConfig.db;
    const cloudDoc = { ...doc, uid: CloudConfig.uid };
    
    try {
      // 尝试更新
      const existing = await db.collection(collection).doc(doc._id).get();
      if (existing.data && existing.data.length > 0) {
        await db.collection(collection).doc(doc._id).update(cloudDoc);
      } else {
        await db.collection(collection).add(cloudDoc);
      }
    } catch (err) {
      // 文档不存在则新增
      if (err.code === 'DOC_NOT_EXIST' || err.message?.includes('not found')) {
        try {
          await db.collection(collection).add(cloudDoc);
        } catch (addErr) {
          console.warn(`[Sync] 推送 ${collection}/${doc._id} 失败:`, addErr);
          this._syncQueue.push({ collection, doc });
        }
      } else {
        console.warn(`[Sync] 推送 ${collection}/${doc._id} 失败:`, err);
        this._syncQueue.push({ collection, doc });
      }
    }
  },
  
  /**
   * 从云端删除
   */
  async pushDelete(collection, id) {
    if (!CloudConfig.enabled) return;
    
    try {
      await CloudConfig.db.collection(collection).doc(id).remove();
    } catch (err) {
      console.warn(`[Sync] 删除 ${collection}/${id} 失败:`, err);
    }
  },
  
  /**
   * 启动实时监听
   */
  startWatching() {
    if (!CloudConfig.enabled) return;
    
    const collections = ['tasks', 'events', 'notes', 'transactions', 'habits', 'birthdays', 'outfits', 'userConfig'];
    
    collections.forEach(col => {
      try {
        const watcher = CloudConfig.db.collection(col)
          .where({ uid: CloudConfig.uid })
          .watch({
            onChange: (snapshot) => {
              console.log(`[Sync] ${col} 云端变化, docs:`, snapshot.docs.length);
              // 更新本地
              snapshot.docs.forEach(doc => {
                Storage.put(col, doc).catch(() => {});
              });
              // 通知 UI 刷新
              if (window._onCloudChange) {
                window._onCloudChange(col);
              }
            },
            onError: (err) => {
              console.warn(`[Sync] ${col} 监听错误:`, err);
            }
          });
        
        this._watchers[col] = watcher;
      } catch (err) {
        console.warn(`[Sync] 启动 ${col} 监听失败:`, err);
      }
    });
  },
  
  /**
   * 停止监听
   */
  stopWatching() {
    Object.values(this._watchers).forEach(w => {
      try { w.close(); } catch (e) {}
    });
    this._watchers = {};
  },
  
  /**
   * 处理待同步队列
   */
  async processQueue() {
    if (this._syncing || this._syncQueue.length === 0) return;
    this._syncing = true;
    
    while (this._syncQueue.length > 0) {
      const item = this._syncQueue.shift();
      await this.push(item.collection, item.doc);
    }
    
    this._syncing = false;
  }
};
