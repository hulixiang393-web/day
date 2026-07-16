/* localStorage 封装 — 用于设置等轻量数据 */

const PREFIX = 'dp_';

class Store {
  get(key, defaultValue = null) {
    try {
      const raw = localStorage.getItem(PREFIX + key);
      if (raw === null) return defaultValue;
      return JSON.parse(raw);
    } catch {
      return defaultValue;
    }
  }

  set(key, value) {
    try {
      localStorage.setItem(PREFIX + key, JSON.stringify(value));
    } catch (e) {
      console.warn('[Store] Write failed:', e);
    }
  }

  remove(key) {
    localStorage.removeItem(PREFIX + key);
  }

  /** 获取设置 */
  getSettings() {
    return this.get('settings', getDefaultSettings());
  }

  /** 保存设置 */
  setSettings(settings) {
    this.set('settings', settings);
  }

  /** 获取当前主题 */
  getTheme() {
    const settings = this.getSettings();
    return settings.theme || 'light';
  }

  /** 设置主题 */
  setTheme(theme) {
    const settings = this.getSettings();
    settings.theme = theme;
    this.setSettings(settings);
    document.documentElement.setAttribute('data-theme', theme);
  }
}

function getDefaultSettings() {
  return {
    theme: 'light',
    customColors: null,
    fontSize: { base: 14, scale: 1.0 },
    wallpaper: { type: 'default', url: '', opacity: 0.2 },
    notifications: { enabled: true, quietStart: '22:00', quietEnd: '08:00' },
    pomodoro: { focusMinutes: 25, breakMinutes: 5, longBreakMinutes: 15, longBreakInterval: 4 },
    effects: { completionEffect: true, sakura: true, mascot: true },
    privacy: { encryptionEnabled: false, autoLockMinutes: 0 },
    layout: { pcLayout: '3col' },
    language: 'zh-CN',
  };
}

export const store = new Store();
export default store;
