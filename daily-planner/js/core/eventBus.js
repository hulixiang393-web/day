/* 事件总线 — 发布/订阅模式 */

class EventBus {
  constructor() {
    this._events = {};
  }

  /** 订阅事件 */
  on(event, callback) {
    if (!this._events[event]) {
      this._events[event] = [];
    }
    this._events[event].push(callback);
    // 返回取消订阅函数
    return () => this.off(event, callback);
  }

  /** 单次订阅 */
  once(event, callback) {
    const wrapper = (...args) => {
      callback(...args);
      this.off(event, wrapper);
    };
    this.on(event, wrapper);
  }

  /** 取消订阅 */
  off(event, callback) {
    if (!this._events[event]) return;
    this._events[event] = this._events[event].filter((cb) => cb !== callback);
  }

  /** 触发事件 */
  emit(event, data) {
    if (!this._events[event]) return;
    this._events[event].forEach((callback) => {
      try {
        callback(data);
      } catch (e) {
        console.error(`[EventBus] Error in "${event}":`, e);
      }
    });
  }

  /** 清除所有订阅 */
  clear() {
    this._events = {};
  }
}

// 全局单例
export const eventBus = new EventBus();
export default eventBus;
