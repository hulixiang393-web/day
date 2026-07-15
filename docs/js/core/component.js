/* 基础组件类 */

export class Component {
  constructor(container) {
    this.container = typeof container === 'string' ? document.querySelector(container) : container;
    this.el = null;
    this._listeners = [];
    this._children = [];
    this._mounted = false;
  }

  /** 返回 HTML 模板字符串 — 子类重写 */
  template(props) {
    return '';
  }

  /** 渲染 */
  render(props = {}) {
    if (!this.el) {
      this.el = document.createElement('div');
      this.el.className = this.constructor.name.toLowerCase().replace('component', '') + '__root';
    }
    this.el.innerHTML = this.template(props);
    if (!this._mounted && this.container) {
      this.mount();
    }
    this.afterRender(props);
    return this.el;
  }

  /** 挂载到 DOM */
  mount() {
    if (this._mounted) return;
    if (this.container && this.el) {
      this.container.appendChild(this.el);
      this._mounted = true;
      this.onMount();
    }
  }

  /** 销毁 */
  destroy() {
    // 移除 DOM 事件监听
    this._listeners.forEach(({ el, event, fn }) => {
      el.removeEventListener(event, fn);
    });
    this._listeners = [];

    // 销毁子组件
    this._children.forEach((c) => c.destroy());
    this._children = [];

    // 从 DOM 移除
    if (this.el && this.el.parentNode) {
      this.el.parentNode.removeChild(this.el);
    }
    this._mounted = false;
    this.onDestroy();
  }

  /** 委托事件绑定 (在组件根元素上) */
  on(event, selector, handler) {
    const fn = (e) => {
      const target = e.target.closest(selector);
      if (target && this.el && this.el.contains(target)) {
        handler.call(this, e, target);
      }
    };
    if (this.el) {
      this.el.addEventListener(event, fn);
    }
    this._listeners.push({ el: this.el, event, fn });
  }

  /** 全局事件绑定 (document) */
  onDocument(event, handler) {
    document.addEventListener(event, handler);
    this._listeners.push({ el: document, event, fn: handler });
  }

  /** 触发自定义事件 */
  emit(name, detail = {}) {
    const event = new CustomEvent(name, { bubbles: true, detail });
    if (this.el) {
      this.el.dispatchEvent(event);
    }
  }

  /** 添加子组件 */
  addChild(component) {
    this._children.push(component);
    return component;
  }

  /** 查询组件内元素 */
  qs(selector) {
    return this.el ? this.el.querySelector(selector) : null;
  }

  qsa(selector) {
    return this.el ? this.el.querySelectorAll(selector) : [];
  }

  /** 显示/隐藏 */
  show() { if (this.el) this.el.classList.remove('hidden'); }
  hide() { if (this.el) this.el.classList.add('hidden'); }
  toggle(show) {
    if (this.el) this.el.classList.toggle('hidden', !show);
  }

  // === 生命周期钩子 (子类重写) ===
  afterRender(props) {}
  onMount() {}
  onDestroy() {}
}
