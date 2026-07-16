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

        <!-- 隐私安全 -->
        <div class="card mb-4" id="privacy-card">
          <h3 class="card-title mb-3">🔐 访问密码</h3>
          <div id="privacy-content"></div>
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

    this._renderPrivacySection();
    this._bindEvents(settings);
  }

  _renderPrivacySection() {
    const container = this.container.querySelector('#privacy-content');
    if (!container) return;

    const hasPwd = PG.hasPassword();
    const hasQues = PG.hasQuestion();
    const question = PG.getQuestion();

    if (!hasPwd) {
      // 未设置密码 → 显示设置表单
      container.innerHTML = `
        <p class="text-sm text-secondary mb-3">设置访问密码后，每次打开页面需要验证</p>
        <div class="grid grid-cols-2 gap-3">
          <div class="form-group">
            <label class="form-label">新密码（至少6位）</label>
            <input type="password" id="ps-set-p1" class="form-input" placeholder="输入新密码" maxlength="64">
            <div id="ps-strength" class="text-xs mt-1"></div>
          </div>
          <div class="form-group">
            <label class="form-label">确认密码</label>
            <input type="password" id="ps-set-p2" class="form-input" placeholder="再次输入密码" maxlength="64">
          </div>
        </div>
        <div class="grid grid-cols-2 gap-3 mt-2">
          <div class="form-group">
            <label class="form-label">密保问题（可选）</label>
            <input id="ps-set-q" class="form-input" placeholder="如：我的小学叫什么？" maxlength="60">
          </div>
          <div class="form-group">
            <label class="form-label">答案</label>
            <input id="ps-set-a" class="form-input" placeholder="密保答案" maxlength="40">
          </div>
        </div>
        <button id="ps-set-btn" class="btn btn-primary btn-sm mt-2">🔒 设置密码</button>
      `;
      this._bindSetPassword(container);
    } else {
      // 已设置密码 → 显示管理选项
      const quesInfo = hasQues ? `<span class="text-sm text-secondary">密保问题：${this.esc(question)}</span>` : `<span class="text-sm text-warning">⚠️ 未设置密保问题</span>`;
      container.innerHTML = `
        <div class="flex items-center justify-between mb-3">
          <span class="text-sm">🔒 访问密码已启用</span>
          ${quesInfo}
        </div>
        <div class="flex flex-wrap gap-2">
          <button id="ps-change-btn" class="btn btn-secondary btn-sm">✏️ 修改密码</button>
          <button id="ps-question-btn" class="btn btn-secondary btn-sm">${hasQues ? '✏️ 修改密保' : '➕ 设置密保'}</button>
          <button id="ps-remove-btn" class="btn btn-danger btn-sm">🗑️ 移除密码</button>
        </div>
        <div id="ps-change-area" class="mt-3" style="display:none"></div>
      `;
      this._bindManagePassword(container, hasQues, question);
    }
  }

  _bindSetPassword(container) {
    const p1 = container.querySelector('#ps-set-p1');
    const p2 = container.querySelector('#ps-set-p2');
    const strength = container.querySelector('#ps-strength');

    // 密码强度实时检测
    p1.addEventListener('input', () => {
      const v = p1.value;
      let s = 0;
      if (v.length >= 6) s++;
      if (v.length >= 10) s++;
      if (/[a-z]/.test(v) && /[A-Z]/.test(v)) s++;
      if (/[0-9]/.test(v)) s++;
      if (/[^a-zA-Z0-9]/.test(v)) s++;
      const labels = ['', '弱', '一般', '中', '强', '很强'];
      const colors = ['', '#FF6B6B', '#FFB347', '#FFB347', '#7ED321', '#7ED321'];
      strength.textContent = s > 0 ? `强度：${labels[s]}` : '';
      strength.style.color = colors[s] || '';
    });

    container.querySelector('#ps-set-btn').addEventListener('click', async () => {
      const v1 = p1.value.trim(), v2 = p2.value.trim();
      if (!v1 || v1.length < 6) return showToast('密码至少6个字符', 'error');
      if (v1 !== v2) return showToast('两次密码不一致', 'error');
      const q = container.querySelector('#ps-set-q').value.trim();
      const a = container.querySelector('#ps-set-a').value.trim();
      if ((q && !a) || (!q && a)) return showToast('密保问题和答案需同时填写', 'error');

      const result = await PG.setPassword(v1, q, a);
      if (result.ok) {
        showToast('✅ 访问密码已设置！下次打开页面需验证', 'success');
        this._renderPrivacySection();
      } else {
        showToast(result.error, 'error');
      }
    });
  }

  _bindManagePassword(container, hasQues, question) {
    // 修改密码
    container.querySelector('#ps-change-btn').addEventListener('click', () => {
      const area = container.querySelector('#ps-change-area');
      area.style.display = 'block';
      area.innerHTML = `
        <div class="form-group">
          <label class="form-label">原密码</label>
          <input type="password" id="ps-old" class="form-input" placeholder="输入原密码" maxlength="64">
        </div>
        <div class="grid grid-cols-2 gap-3">
          <input type="password" id="ps-new1" class="form-input" placeholder="新密码（至少6位）" maxlength="64">
          <input type="password" id="ps-new2" class="form-input" placeholder="确认新密码" maxlength="64">
        </div>
        <div class="flex gap-2 mt-2">
          <button id="ps-change-confirm" class="btn btn-primary btn-sm">确认修改</button>
          <button id="ps-change-cancel" class="btn btn-secondary btn-sm">取消</button>
        </div>
      `;

      area.querySelector('#ps-change-cancel').addEventListener('click', () => { area.style.display = 'none'; });
      area.querySelector('#ps-change-confirm').addEventListener('click', async () => {
        const old = area.querySelector('#ps-old').value.trim();
        const n1 = area.querySelector('#ps-new1').value.trim();
        const n2 = area.querySelector('#ps-new2').value.trim();
        if (!old) return showToast('请输入原密码', 'error');
        if (!n1 || n1.length < 6) return showToast('新密码至少6个字符', 'error');
        if (n1 !== n2) return showToast('两次密码不一致', 'error');

        const result = await PG.changePassword(old, n1);
        if (result.ok) {
          showToast('✅ 密码已修改', 'success');
          this._renderPrivacySection();
        } else {
          showToast(result.error, 'error');
        }
      });
    });

    // 修改/设置密保
    container.querySelector('#ps-question-btn').addEventListener('click', () => {
      const area = container.querySelector('#ps-change-area');
      area.style.display = 'block';
      area.innerHTML = `
        <p class="text-sm text-secondary mb-2">${hasQues ? '当前密保：' + this.esc(question) : '设置密保问题和答案'}</p>
        <input id="ps-q" class="form-input mb-2" placeholder="密保问题" maxlength="60" value="${this.esc(hasQues ? question : '')}">
        <input id="ps-a" class="form-input mb-2" placeholder="答案" maxlength="40">
        <div class="flex gap-2">
          <button id="ps-q-confirm" class="btn btn-primary btn-sm">保存密保</button>
          <button id="ps-q-cancel" class="btn btn-secondary btn-sm">取消</button>
        </div>
      `;

      area.querySelector('#ps-q-cancel').addEventListener('click', () => { area.style.display = 'none'; });
      area.querySelector('#ps-q-confirm').addEventListener('click', async () => {
        const q = area.querySelector('#ps-q').value.trim();
        const a = area.querySelector('#ps-a').value.trim();
        if (!q || !a) return showToast('问题和答案不能为空', 'error');
        // 密保更新需要通过验证原密码
        const oldPwd = prompt('请输入当前访问密码以保存密保设置：');
        if (!oldPwd) return;
        const ok = await PG.verify(oldPwd);
        if (!ok) return showToast('密码错误', 'error');
        await PG.setPassword(oldPwd, q, a);
        showToast('✅ 密保已保存', 'success');
        this._renderPrivacySection();
      });
    });

    // 移除密码
    container.querySelector('#ps-remove-btn').addEventListener('click', async () => {
      const confirmed = confirm('确定要移除访问密码吗？\n\n移除后页面将不再需要密码验证。');
      if (!confirmed) return;
      const oldPwd = prompt('请输入当前访问密码以确认移除：');
      if (!oldPwd) return;
      const ok = await PG.verify(oldPwd);
      if (!ok) return showToast('密码错误，操作取消', 'error');
      await PG.forceReset();
      showToast('✅ 访问密码已移除', 'success');
      this._renderPrivacySection();
    });
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

  esc(str) {
    if (!str) return '';
    const div = document.createElement('div');
    div.textContent = String(str);
    return div.innerHTML;
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
