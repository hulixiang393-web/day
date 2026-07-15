/* IndexedDB 封装 */

const DB_NAME = 'daily-planner';
const DB_VERSION = 2;

class Database {
  constructor() {
    this._db = null;
    this._ready = false;
  }

  /** 打开数据库 */
  async open() {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION);

      request.onupgradeneeded = (event) => {
        const db = event.target.result;
        const oldVersion = event.oldVersion;

        // 任务存储
        if (!db.objectStoreNames.contains('tasks')) {
          const tasksStore = db.createObjectStore('tasks', { keyPath: 'id' });
          tasksStore.createIndex('status', 'status', { unique: false });
          tasksStore.createIndex('endDate', 'endDate', { unique: false });
          tasksStore.createIndex('categoryId', 'categoryId', { unique: false });
          tasksStore.createIndex('priority', 'priority', { unique: false });
          tasksStore.createIndex('updatedAt', 'updatedAt', { unique: false });
        } else if (oldVersion < 2) {
          // v1→v2: 迁移 dueDate/dueTime → endDate/endTime
          const tx = event.target.transaction;
          const store = tx.objectStore('tasks');
          store.openCursor().onsuccess = (cursorEvent) => {
            const cursor = cursorEvent.target.result;
            if (cursor) {
              const task = cursor.value;
              if (task.dueDate && !task.endDate) {
                task.endDate = task.dueDate;
                task.endTime = task.dueTime || null;
                delete task.dueDate;
                delete task.dueTime;
                cursor.update(task);
              }
              cursor.continue();
            }
          };
        }

        // 习惯存储
        if (!db.objectStoreNames.contains('habits')) {
          const habitsStore = db.createObjectStore('habits', { keyPath: 'id' });
          habitsStore.createIndex('archived', 'archived', { unique: false });
        }

        // 分类存储
        if (!db.objectStoreNames.contains('categories')) {
          db.createObjectStore('categories', { keyPath: 'id' });
        }

        // 模板存储
        if (!db.objectStoreNames.contains('templates')) {
          db.createObjectStore('templates', { keyPath: 'id' });
        }

        // 备忘录存储
        if (!db.objectStoreNames.contains('memos')) {
          const memosStore = db.createObjectStore('memos', { keyPath: 'id' });
          memosStore.createIndex('taskId', 'taskId', { unique: false });
        }
      };

      request.onsuccess = (event) => {
        this._db = event.target.result;
        this._ready = true;
        resolve(this._db);
      };

      request.onerror = (event) => {
        console.error('[DB] Open failed:', event.target.error);
        reject(event.target.error);
      };
    });
  }

  /** 获取单条记录 */
  async get(storeName, key) {
    await this._ensureReady();
    return new Promise((resolve, reject) => {
      const tx = this._db.transaction(storeName, 'readonly');
      const store = tx.objectStore(storeName);
      const request = store.get(key);
      request.onsuccess = () => resolve(request.result || null);
      request.onerror = () => reject(request.error);
    });
  }

  /** 获取所有记录 */
  async getAll(storeName) {
    await this._ensureReady();
    return new Promise((resolve, reject) => {
      const tx = this._db.transaction(storeName, 'readonly');
      const store = tx.objectStore(storeName);
      const request = store.getAll();
      request.onsuccess = () => resolve(request.result || []);
      request.onerror = () => reject(request.error);
    });
  }

  /** 按索引查询 */
  async getByIndex(storeName, indexName, value) {
    await this._ensureReady();
    return new Promise((resolve, reject) => {
      const tx = this._db.transaction(storeName, 'readonly');
      const store = tx.objectStore(storeName);
      const index = store.index(indexName);
      const request = index.getAll(value);
      request.onsuccess = () => resolve(request.result || []);
      request.onerror = () => reject(request.error);
    });
  }

  /** 保存/更新记录 */
  async put(storeName, value) {
    await this._ensureReady();
    return new Promise((resolve, reject) => {
      const tx = this._db.transaction(storeName, 'readwrite');
      const store = tx.objectStore(storeName);
      const request = store.put(value);
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  /** 批量保存 */
  async putAll(storeName, values) {
    await this._ensureReady();
    return new Promise((resolve, reject) => {
      const tx = this._db.transaction(storeName, 'readwrite');
      const store = tx.objectStore(storeName);
      values.forEach((v) => store.put(v));
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  }

  /** 删除记录 */
  async delete(storeName, key) {
    await this._ensureReady();
    return new Promise((resolve, reject) => {
      const tx = this._db.transaction(storeName, 'readwrite');
      const store = tx.objectStore(storeName);
      const request = store.delete(key);
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  /** 清空存储 */
  async clear(storeName) {
    await this._ensureReady();
    return new Promise((resolve, reject) => {
      const tx = this._db.transaction(storeName, 'readwrite');
      const store = tx.objectStore(storeName);
      const request = store.clear();
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  /** 计数 */
  async count(storeName) {
    await this._ensureReady();
    return new Promise((resolve, reject) => {
      const tx = this._db.transaction(storeName, 'readonly');
      const store = tx.objectStore(storeName);
      const request = store.count();
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  async _ensureReady() {
    if (!this._ready) await this.open();
  }
}

export const db = new Database();
export default db;
