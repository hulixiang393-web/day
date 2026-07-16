/* 设置数据模型 */

import store from '../store.js';
import eventBus from '../../core/eventBus.js';

export const SettingsModel = {
  get() {
    return store.getSettings();
  },

  save(settings) {
    const current = store.getSettings();
    const merged = { ...current, ...settings };
    store.setSettings(merged);
    eventBus.emit('settings:changed', merged);
    return merged;
  },

  getTheme() {
    return store.getTheme();
  },

  setTheme(theme) {
    store.setTheme(theme);
    eventBus.emit('theme:changed', { theme });
  },

  getWallpaper() {
    const s = store.getSettings();
    return s.wallpaper || { type: 'default', url: '', opacity: 0.2 };
  },

  setWallpaper(wallpaper) {
    const s = store.getSettings();
    s.wallpaper = wallpaper;
    store.setSettings(s);
    eventBus.emit('wallpaper:changed', wallpaper);
  },

  reset() {
    store.remove('settings');
    eventBus.emit('settings:reset');
  },
};
