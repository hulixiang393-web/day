/* 键盘快捷键管理 */

import eventBus from '../core/eventBus.js';

const shortcuts = {};

/** 注册快捷键 */
export function registerShortcut(key, handler, description = '') {
  shortcuts[key.toLowerCase()] = { handler, description };
}

/** 取消注册 */
export function unregisterShortcut(key) {
  delete shortcuts[key.toLowerCase()];
}

/** 初始化键盘监听 */
export function initKeyboard() {
  document.addEventListener('keydown', (e) => {
    // 在输入框内不触发快捷键
    const tag = e.target.tagName.toLowerCase();
    if (tag === 'input' || tag === 'textarea' || tag === 'select' || e.target.isContentEditable) {
      return;
    }

    const key = [];
    if (e.ctrlKey || e.metaKey) key.push('ctrl');
    if (e.shiftKey) key.push('shift');
    if (e.altKey) key.push('alt');

    // 映射特殊键名
    const keyName = e.key.toLowerCase();
    const keyMap = {
      ' ': 'space',
      'arrowup': 'up',
      'arrowdown': 'down',
      'arrowleft': 'left',
      'arrowright': 'right',
    };
    key.push(keyMap[keyName] || keyName);

    const combo = key.join('+');

    if (shortcuts[combo]) {
      e.preventDefault();
      shortcuts[combo].handler(e);
    }
  });

  // 注册默认快捷键
  registerShortcut('ctrl+n', () => eventBus.emit('shortcut:new-task'), '新建任务');
  registerShortcut('ctrl+k', () => eventBus.emit('shortcut:search'), '搜索');
  registerShortcut('ctrl+s', () => eventBus.emit('shortcut:save'), '保存');
  registerShortcut('escape', () => eventBus.emit('shortcut:escape'), '关闭/取消');
  registerShortcut('ctrl+1', () => { window.location.hash = '#/list'; }, '清单视图');
  registerShortcut('ctrl+2', () => { window.location.hash = '#/day'; }, '日视图');
  registerShortcut('ctrl+3', () => { window.location.hash = '#/week'; }, '周视图');
  registerShortcut('ctrl+4', () => { window.location.hash = '#/month'; }, '月视图');
  registerShortcut('ctrl+5', () => { window.location.hash = '#/timeline'; }, '时间线');
  registerShortcut('ctrl+p', () => { window.location.hash = '#/pomodoro'; }, '番茄钟');
  registerShortcut('ctrl+h', () => { window.location.hash = '#/habits'; }, '习惯打卡');

  console.log('[Keyboard] Shortcuts initialized');
}

/** 获取所有快捷键列表 */
export function getShortcutList() {
  return Object.entries(shortcuts).map(([key, { description }]) => ({ key, description }));
}
