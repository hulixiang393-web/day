/* 番茄钟视图 */

import eventBus from '../core/eventBus.js';
import { showToast } from '../core/toast.js';
import store from '../data/store.js';

export class PomodoroView {
  constructor(container) {
    this.container = container;
    this.mode = 'focus'; // focus | shortBreak | longBreak
    this.timeLeft = 25 * 60;
    this.totalTime = 25 * 60;
    this.running = false;
    this.timerInterval = null;
    this.sessionCount = 0;
    this.sessions = [];
  }

  async render() {
    const settings = store.getSettings();
    const pom = settings.pomodoro || { focusMinutes: 25, breakMinutes: 5, longBreakMinutes: 15, longBreakInterval: 4 };

    this.container.innerHTML = `
      <div class="pomodoro-view fade-in" style="display:flex;flex-direction:column;align-items:center;justify-content:center;min-height:70vh;text-align:center">
        <div class="view-switcher mb-4">
          <button class="view-switcher__btn ${this.mode === 'focus' ? 'active' : ''}" data-mode="focus">🍅 专注</button>
          <button class="view-switcher__btn ${this.mode === 'shortBreak' ? 'active' : ''}" data-mode="shortBreak">☕ 短休</button>
          <button class="view-switcher__btn ${this.mode === 'longBreak' ? 'active' : ''}" data-mode="longBreak">🌿 长休</button>
        </div>

        <div style="position:relative;width:260px;height:260px;margin-bottom:24px">
          <svg viewBox="0 0 100 100" style="width:100%;height:100%;transform:rotate(-90deg)">
            <circle cx="50" cy="50" r="45" fill="none" stroke="var(--border-color)" stroke-width="6"/>
            <circle id="pomodoro-progress" cx="50" cy="50" r="45" fill="none"
                    stroke="var(--color-primary)" stroke-width="6"
                    stroke-dasharray="283" stroke-dashoffset="0"
                    stroke-linecap="round"/>
          </svg>
          <div style="position:absolute;inset:0;display:flex;flex-direction:column;align-items:center;justify-content:center">
            <div id="pomodoro-time" style="font-size:3.5rem;font-weight:700;color:var(--text-primary);font-family:var(--font-mono)">${this._formatTime(this.timeLeft)}</div>
            <div style="font-size:0.9rem;color:var(--text-secondary)">
              ${this.mode === 'focus' ? '专注中' : this.mode === 'shortBreak' ? '休息中' : '长休息'}
            </div>
          </div>
        </div>

        <div class="flex items-center gap-3 mb-4">
          <button class="btn btn-primary btn-lg" id="pomodoro-toggle">
            ${this.running ? '⏸️ 暂停' : '▶️ 开始'}
          </button>
          <button class="btn btn-secondary" id="pomodoro-reset">🔄 重置</button>
        </div>

        <div class="text-sm text-secondary">
          🍅 已完成 <strong>${this.sessionCount}</strong> 个番茄 ·
          共专注 <strong>${Math.round(this.sessions.reduce((s, a) => s + a, 0) / 60)}</strong> 分钟
        </div>
      </div>`;

    this._updateProgress();
    this._bindEvents();
  }

  _formatTime(seconds) {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  }

  _updateProgress() {
    const ratio = this.timeLeft / this.totalTime;
    const circle = this.container.querySelector('#pomodoro-progress');
    if (circle) {
      const circumference = 2 * Math.PI * 45;
      circle.style.strokeDasharray = circumference;
      circle.style.strokeDashoffset = circumference * (1 - ratio);
    }
    const timeEl = this.container.querySelector('#pomodoro-time');
    if (timeEl) timeEl.textContent = this._formatTime(this.timeLeft);
  }

  _bindEvents() {
    const toggleBtn = this.container.querySelector('#pomodoro-toggle');

    // 模式切换
    this.container.querySelectorAll('.view-switcher__btn').forEach((btn) => {
      btn.addEventListener('click', () => {
        this.mode = btn.dataset.mode;
        this._setTimeForMode();
        this._stop();
        this.render();
      });
    });

    toggleBtn?.addEventListener('click', () => {
      if (this.running) this._pause();
      else this._start();
      this.render();
    });

    this.container.querySelector('#pomodoro-reset')?.addEventListener('click', () => {
      this._stop();
      this._setTimeForMode();
      this.render();
    });
  }

  _setTimeForMode() {
    const settings = store.getSettings();
    const pom = settings.pomodoro || {};
    switch (this.mode) {
      case 'focus': this.timeLeft = (pom.focusMinutes || 25) * 60; break;
      case 'shortBreak': this.timeLeft = (pom.breakMinutes || 5) * 60; break;
      case 'longBreak': this.timeLeft = (pom.longBreakMinutes || 15) * 60; break;
    }
    this.totalTime = this.timeLeft;
  }

  _start() {
    this.running = true;
    eventBus.emit('timer:started', { mode: this.mode });
    this.timerInterval = setInterval(() => {
      this.timeLeft--;
      this._updateProgress();
      if (this.timeLeft <= 0) this._complete();
    }, 1000);
  }

  _pause() {
    this.running = false;
    clearInterval(this.timerInterval);
  }

  _stop() {
    this.running = false;
    clearInterval(this.timerInterval);
  }

  _complete() {
    this._stop();
    if (this.mode === 'focus') {
      this.sessionCount++;
      this.sessions.push(this.totalTime);
      showToast('🍅 番茄钟完成！休息一下吧~', 'success');
      eventBus.emit('timer:completed', { duration: this.totalTime });
    }

    const settings = store.getSettings();
    const pom = settings.pomodoro || {};
    const longBreakInterval = pom.longBreakInterval || 4;

    if (this.mode === 'focus') {
      this.mode = this.sessionCount % longBreakInterval === 0 ? 'longBreak' : 'shortBreak';
    } else {
      this.mode = 'focus';
    }
    this._setTimeForMode();
    this.render();
  }
}
