/**
 * 存储抽象层
 * 本地 IndexedDB 为主，云端 CloudBase 为辅
 */
const Storage = {
  DB_NAME: 'WorkbenchDB',
  DB_VERSION: 1,
  _db: null,
  
  // 集合列表
  COLLECTIONS: ['tasks', 'events', 'notes', 'transactions', 'habits', 'birthdays', 'outfits', 'userConfig'],
  
  /**
   * 初始化 IndexedDB
   */
  async init() {
    return new Promise((resolve, reject) => {
      const req = indexedDB.open(this.DB_NAME, this.DB_VERSION);
      
      req.onupgradeneeded = (e) => {
        const db = e.target.result;
        this.COLLECTIONS.forEach(name => {
          if (!db.objectStoreNames.contains(name)) {
            db.createObjectStore(name, { keyPath: '_id' });
          }
        });
      };
      
      req.onsuccess = (e) => {
        this._db = e.target.result;
        console.log('[Storage] IndexedDB 初始化完成');
        resolve(true);
      };
      
      req.onerror = () => {
        console.error('[Storage] IndexedDB 初始化失败:', req.error);
        reject(req.error);
      };
    });
  },
  
  /**
   * 读取集合全部数据
   */
  async getAll(collection) {
    return new Promise((resolve, reject) => {
      if (!this._db) { resolve([]); return; }
      const tx = this._db.transaction(collection, 'readonly');
      const store = tx.objectStore(collection);
      const req = store.getAll();
      req.onsuccess = () => resolve(req.result || []);
      req.onerror = () => reject(req.error);
    });
  },
  
  /**
   * 读取单条
   */
  async get(collection, id) {
    return new Promise((resolve, reject) => {
      if (!this._db) { resolve(null); return; }
      const tx = this._db.transaction(collection, 'readonly');
      const store = tx.objectStore(collection);
      const req = store.get(id);
      req.onsuccess = () => resolve(req.result || null);
      req.onerror = () => reject(req.error);
    });
  },
  
  /**
   * 写入（插入或更新）
   */
  async put(collection, doc) {
    return new Promise((resolve, reject) => {
      if (!this._db) { reject(new Error('DB not ready')); return; }
      const tx = this._db.transaction(collection, 'readwrite');
      const store = tx.objectStore(collection);
      const req = store.put(doc);
      req.onsuccess = () => resolve(doc);
      req.onerror = () => reject(req.error);
    });
  },
  
  /**
   * 批量写入
   */
  async putAll(collection, docs) {
    for (const doc of docs) {
      await this.put(collection, doc);
    }
  },
  
  /**
   * 删除
   */
  async delete(collection, id) {
    return new Promise((resolve, reject) => {
      if (!this._db) { reject(new Error('DB not ready')); return; }
      const tx = this._db.transaction(collection, 'readwrite');
      const store = tx.objectStore(collection);
      const req = store.delete(id);
      req.onsuccess = () => resolve(true);
      req.onerror = () => reject(req.error);
    });
  },
  
  /**
   * 清空集合
   */
  async clear(collection) {
    return new Promise((resolve, reject) => {
      if (!this._db) { resolve(); return; }
      const tx = this._db.transaction(collection, 'readwrite');
      const store = tx.objectStore(collection);
      const req = store.clear();
      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
    });
  },
  
  /**
   * 清空全部数据
   */
  async clearAll() {
    for (const col of this.COLLECTIONS) {
      await this.clear(col);
    }
  },
  
  /**
   * 生成唯一 ID
   */
  generateId() {
    return Date.now().toString(36) + Math.random().toString(36).substr(2, 9);
  },
  
  /**
   * 导出全部数据为 JSON
   */
  async exportAll() {
    const data = {};
    for (const col of this.COLLECTIONS) {
      data[col] = await this.getAll(col);
    }
    return data;
  },
  
  /**
   * 从 JSON 导入全部数据
   */
  async importAll(data) {
    for (const [col, docs] of Object.entries(data)) {
      if (this.COLLECTIONS.includes(col) && Array.isArray(docs)) {
        await this.clear(col);
        await this.putAll(col, docs);
      }
    }
  }
};
