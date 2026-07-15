/* 设置视图 */

import { SettingsModel } from '../data/models/settings.js';
import store from '../data/store.js';
import { showToast } from '../core/toast.js';
import eventBus from '../core/eventBus.js';
import { exportJSON, exportCSV, printTasks } from '../utils/export.js';
import { TaskModel } from '../data/models/task.js';

export class SettingsView {
  constructor(container) {
    this.container = container;
  }

  async render() {
    const settings = SettingsModel.get();

    this.container.innerHTML = `
      <div class="settings-view fade-in" style="max-width:700px">
        <div class="calendar-nav">
          <h2 class="h2">⚙️ 设置</h2>
        </div>

        <!-- 主题选择 -->
        <div class="card mb-4">
          <h3 class="card-title mb-3">🎨 主题</h3>
          <div class="grid grid-cols-3 gap-3" id="theme-selector">
            ${[
              { id: 'light', name: '白桃二次元', emoji: '🌸', desc: '清新甜美' },
              { id: 'dark', name: '暗夜星穹', emoji: '🌙', desc: '护眼深色' },
              { id: 'macaron', name: '软蓝日系', emoji: '🫧', desc: '马卡龙' },
            ].map((t) => `
              <div class="card card-clickable text-center theme-card ${settings.theme === t.id ? 'selected' : ''}"
                   data-theme="${t.id}"
                   style="${settings.theme === t.id ? 'border-color:var(--color-primary);box-shadow:var(--shadow-glow)' : ''}">
                <div style="font-size:2rem">${t.emoji}</div>
                <div class="font-semibold text-sm">${t.name}</div>
                <div class="text-xs text-muted">${t.desc}</div>
              </div>`).join('')}
          </div>
        </div>

        <!-- 通知设置 -->
        <div class="card mb-4">
          <h3 class="card-title mb-3">🔔 通知</h3>
          <div class="flex items-center justify-between mb-3">
            <span class="text-sm">启用通知</span>
            <label class="toggle-switch">
              <input type="checkbox" id="setting-notify" ${settings.notifications?.enabled !== false ? 'checked' : ''}>
              <span class="toggle-track"><span class="toggle-thumb"></span></span>
            </label>
          </div>
          <div class="grid grid-cols-2 gap-3">
            <div class="form-group">
              <label class="form-label">静默开始</label>
              <input type="time" id="setting-quiet-start" class="form-input" value="${settings.notifications?.quietStart || '22:00'}">
            </div>
            <div class="form-group">
              <label class="form-label">静默结束</label>
              <input type="time" id="setting-quiet-end" class="form-input" value="${settings.notifications?.quietEnd || '08:00'}">
            </div>
          </div>
        </div>

        <!-- 番茄钟设置 -->
        <div class="card mb-4">
          <h3 class="card-title mb-3">🍅 番茄钟</h3>
          <div class="grid grid-cols-3 gap-3">
            <div class="form-group">
              <label class="form-label">专注时长 (分)</label>
              <input type="number" id="setting-focus" class="form-input" value="${settings.pomodoro?.focusMinutes || 25}" min="1" max="120">
            </div>
            <div class="form-group">
              <label class="form-label">短休 (分)</label>
              <input type="number" id="setting-short-break" class="form-input" value="${settings.pomodoro?.breakMinutes || 5}" min="1" max="30">
            </div>
            <div class="form-group">
              <label class="form-label">长休 (分)</label>
              <input type="number" id="setting-long-break" class="form-input" value="${settings.pomodoro?.longBreakMinutes || 15}" min="1" max="60">
            </div>
          </div>
        </div>

        <!-- 特效设置 -->
        <div class="card mb-4">
          <h3 class="card-title mb-3">✨ 特效</h3>
          <div class="flex items-center justify-between mb-2">
            <span class="text-sm">看板娘</span>
            <label class="toggle-switch">
              <input type="checkbox" id="setting-mascot" ${settings.effects?.mascot !== false ? 'checked' : ''}>
              <span class="toggle-track"><span class="toggle-thumb"></span></span>
            </label>
          </div>
          <div class="flex items-center justify-between mb-2">
            <span class="text-sm">樱花飘落</span>
            <label class="toggle-switch">
              <input type="checkbox" id="setting-sakura" ${settings.effects?.sakura !== false ? 'checked' : ''}>
              <span class="toggle-track"><span class="toggle-thumb"></span></span>
            </label>
          </div>
          <div class="flex items-center justify-between">
            <span class="text-sm">完成特效</span>
            <label class="toggle-switch">
              <input type="checkbox" id="setting-completion" ${settings.effects?.completionEffect !== false ? 'checked' : ''}>
              <span class="toggle-track"><span class="toggle-thumb"></span></span>
            </label>
          </div>
        </div>

        <!-- 数据管理 -->
        <div class="card mb-4">
          <h3 class="card-title mb-3">💾 数据管理</h3>
          <div class="flex flex-wrap gap-2">
            <button class="btn btn-secondary btn-sm" id="export-json">📥 导出 JSON</button>
            <button class="btn btn-secondary btn-sm" id="export-csv">📊 导出 CSV</button>
            <button class="btn btn-secondary btn-sm" id="export-print">🖨️ 打印</button>
            <button class="btn btn-danger btn-sm" id="clear-data">🗑️ 清空数据</button>
          </div>
        </div>
      </div>`;

    this._bindEvents(settings);
  }

  _bindEvents(settings) {
    // 主题切换
    this.container.querySelectorAll('.theme-card').forEach((card) => {
      card.addEventListener('click', () => {
        const theme = card.dataset.theme;
        SettingsModel.setTheme(theme);
        showToast(`主题已切换 ✨`, 'success');
        this.render();
      });
    });

    // 设置变更自动保存
    this._autoSave('setting-notify', (v) => {
      const s = SettingsModel.get();
      s.notifications.enabled = v;
      SettingsModel.save(s);
    });
    this._autoSave('setting-quiet-start', (v) => {
      const s = SettingsModel.get();
      s.notifications.quietStart = v;
      SettingsModel.save(s);
    });
    this._autoSave('setting-quiet-end', (v) => {
      const s = SettingsModel.get();
      s.notifications.quietEnd = v;
      SettingsModel.save(s);
    });
    this._autoSave('setting-focus', (v) => {
      const s = SettingsModel.get();
      s.pomodoro.focusMinutes = parseInt(v);
      SettingsModel.save(s);
    });
    this._autoSave('setting-short-break', (v) => {
      const s = SettingsModel.get();
      s.pomodoro.breakMinutes = parseInt(v);
      SettingsModel.save(s);
    });
    this._autoSave('setting-long-break', (v) => {
      const s = SettingsModel.get();
      s.pomodoro.longBreakMinutes = parseInt(v);
      SettingsModel.save(s);
    });
    this._autoSave('setting-mascot', (v) => {
      const s = SettingsModel.get();
      s.effects.mascot = v;
      SettingsModel.save(s);
      document.getElementById('mascot')?.classList.toggle('hidden', !v);
    });
    this._autoSave('setting-sakura', (v) => {
      const s = SettingsModel.get();
      s.effects.sakura = v;
      SettingsModel.save(s);
    });
    this._autoSave('setting-completion', (v) => {
      const s = SettingsModel.get();
      s.effects.completionEffect = v;
      SettingsModel.save(s);
    });

    // 数据导出
    this.container.querySelector('#export-json')?.addEventListener('click', async () => {
      const tasks = await TaskModel.getAll();
      exportJSON(tasks);
      showToast('JSON 已导出', 'success');
    });
    this.container.querySelector('#export-csv')?.addEventListener('click', async () => {
      const tasks = await TaskModel.getAll();
      exportCSV(tasks);
      showToast('CSV 已导出', 'success');
    });
    this.container.querySelector('#export-print')?.addEventListener('click', () => {
      printTasks();
    });
    this.container.querySelector('#clear-data')?.addEventListener('click', async () => {
      const { confirmDialog } = await import('../core/modal.js');
      const ok = await confirmDialog('清空数据', '确定要清空所有数据吗？此操作不可撤销!', { danger: true });
      if (ok) {
        const tasks = await TaskModel.getAll();
        for (const t of tasks) await TaskModel.delete(t.id);
        showToast('数据已清空', 'warning');
      }
    });
  }

  _autoSave(id, callback) {
    const el = this.container.querySelector(`#${id}`);
    if (!el) return;
    const eventType = el.type === 'checkbox' ? 'change' : 'change';
    el.addEventListener(eventType, () => {
      const value = el.type === 'checkbox' ? el.checked : el.value;
      callback(value);
    });
  }
}
