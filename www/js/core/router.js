/* Hash 路由 */

import eventBus from './eventBus.js';

class Router {
  constructor() {
    this.routes = {};
    this.currentRoute = null;
    this.beforeHooks = [];
  }

  /** 注册路由 */
  add(pattern, handler) {
    this.routes[pattern] = handler;
    return this;
  }

  /** 路由守卫 */
  beforeEach(fn) {
    this.beforeHooks.push(fn);
    return this;
  }

  /** 匹配路由 */
  match(hash) {
    const path = hash.replace(/^#/, '') || '/list';
    const [routePath, queryStr] = path.split('?');

    // 解析查询参数
    const query = {};
    if (queryStr) {
      queryStr.split('&').forEach((pair) => {
        const [k, v] = pair.split('=');
        query[decodeURIComponent(k)] = decodeURIComponent(v || '');
      });
    }

    // 精确匹配
    for (const pattern of Object.keys(this.routes)) {
      const regex = this._patternToRegex(pattern);
      const match = routePath.match(regex);
      if (match) {
        return {
          pattern,
          path: routePath,
          params: match.groups || {},
          query,
          handler: this.routes[pattern],
        };
      }
    }

    // 默认路由
    return {
      pattern: '/list',
      path: '/list',
      params: {},
      query,
      handler: this.routes['/list'] || (() => {}),
    };
  }

  /** 模式转正则 */
  _patternToRegex(pattern) {
    const regexStr = pattern.replace(/:(\w+)/g, '(?<$1>[^/]+)');
    return new RegExp(`^${regexStr}$`);
  }

  /** 导航 */
  navigate(hash) {
    const resolved = this.match(hash);
    const from = this.currentRoute;
    const to = resolved;

    // 执行守卫
    for (const hook of this.beforeHooks) {
      const result = hook(to, from);
      if (result === false) return;
    }

    this.currentRoute = to;
    eventBus.emit('router:changed', { from, to });
    to.handler(to);
  }

  /** 启动 */
  start() {
    const handleHash = () => this.navigate(window.location.hash || '#/list');
    window.addEventListener('hashchange', handleHash);
    handleHash();
  }
}

export const router = new Router();
export default router;
