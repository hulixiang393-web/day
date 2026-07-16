/* 习惯打卡视图 */

import { Component } from '../core/component.js';
import { HabitModel } from '../data/models/habit.js';
import { openModal } from '../core/modal.js';
import { showToast } from '../core/toast.js';
import { renderEmptyState } from '../components/emptyState.js';
import eventBus from '../core/eventBus.js';
import { today, formatDate, generateId } from '../core/utils.js';

export class HabitsView {
  constructor(container) {
    this.container = container;
  }

  async render() {
    const habits = await HabitModel.getAll();
    const todayStr = today();

    this.container.innerHTML = `
      <div class="habits-view fade-in">
        <div class="calendar-nav">
          <h2 class="h2">✅ 习惯打卡</h2>
          <button class="btn btn-primary btn-sm" id="habit-add">＋ 新建习惯</button>
        </div>

        <div class="grid grid-cols-2 gap-3 mb-4" id="habit-stats">
          <div class="card text-center">
            <div class="text-3xl font-bold" style="color:var(--color-primary)">${habits.length}</div>
            <div class="text-sm text-secondary">追踪中的习惯</div>
          </div>
          <div class="card text-center">
            <div class="text-3xl font-bold" style="color:var(--color-success)">${habits.filter((h) => h.history?.[todayStr]).length}</div>
            <div class="text-sm text-secondary">今日已打卡</div>
          </div>
        </div>

        <div id="habits-container" class="fade-stagger"></div>
      </div>`;

    const habitsContainer = this.container.querySelector('#habits-container');

    if (habits.length === 0) {
      renderEmptyState(habitsContainer, {
        icon: '✅',
        title: '还没有习惯',
        description: '创建每日打卡习惯，培养自律生活 ✨',
        actionText: '＋ 新建习惯',
        actionCallback: () => this.showHabitForm(),
      });
    } else {
      habitsContainer.innerHTML = habits.map((h) => {
        const checked = h.history?.[todayStr];
        const streak = h.streak || 0;
        return `
          <div class="card card-clickable mb-3" data-habit-id="${h.id}">
            <div class="flex items-center justify-between">
              <div class="flex items-center gap-3">
                <span style="font-size:2rem">${h.icon || '✅'}</span>
                <div>
                  <div class="card-title">${this.esc(h.name)}</div>
                  <div class="text-sm text-secondary">
                    🔥 ${streak} 天连续 · 最佳 ${h.bestStreak || 0} 天
                  </div>
                </div>
              </div>
              <div class="flex items-center gap-2">
                <button class="btn ${checked ? 'btn-success' : 'btn-primary'} habit-check-btn" data-habit-id="${h.id}">
                  ${checked ? '✅ 已打卡' : '打卡'}
                </button>
                <button class="btn-icon habit-delete-btn" data-habit-id="${h.id}" title="删除">🗑️</button>
              </div>
            </div>
            ${h.medals && h.medals.length > 0 ? `
              <div class="card-footer">
                ${h.medals.map((m) => `<span class="badge-tier--${m.tier} badge-item__tier" title="${m.description}">🏅 ${m.name}</span>`).join(' ')}
              </div>` : ''}
          </div>`;
      }).join('');
    }

    this._bindEvents(habits);
  }

  _bindEvents(habits) {
    this.container.querySelector('#habit-add')?.addEventListener('click', () => this.showHabitForm());

    // 打卡按钮
    this.container.querySelectorAll('.habit-check-btn').forEach((btn) => {
      btn.addEventListener('click', async (e) => {
        e.stopPropagation();
        const id = btn.dataset.habitId;
        const habit = habits.find((h) => h.id === id);
        if (habit?.history?.[today()]) {
          await HabitModel.uncheck(id);
          showToast('已取消打卡', 'info');
        } else {
          await HabitModel.checkIn(id);
          showToast('✅ 打卡成功!', 'success');
        }
        this.render();
      });
    });

    // 删除
    this.container.querySelectorAll('.habit-delete-btn').forEach((btn) => {
      btn.addEventListener('click', async (e) => {
        e.stopPropagation();
        await HabitModel.delete(btn.dataset.habitId);
        showToast('习惯已删除', 'info');
        this.render();
      });
    });

    // 编辑
    this.container.querySelectorAll('.card-clickable[data-habit-id]').forEach((card) => {
      card.addEventListener('click', () => {
        const habit = habits.find((h) => h.id === card.dataset.habitId);
        if (habit) this.showHabitForm(habit);
      });
    });

    eventBus.on('habit:created', () => this.render());
  }

  showHabitForm(editHabit = null) {
    const h = editHabit || {};
    const content = `
      <div class="form-group">
        <label class="form-label">习惯名称 *</label>
        <input type="text" id="hf-name" class="form-input" value="${this.esc(h.name || '')}" placeholder="例如: 早起、阅读、运动..." maxlength="100">
      </div>
      <div class="form-group">
        <label class="form-label">描述</label>
        <input type="text" id="hf-desc" class="form-input" value="${this.esc(h.description || '')}" placeholder="简短描述...">
      </div>
      <div class="grid grid-cols-2 gap-3">
        <div class="form-group">
          <label class="form-label">图标</label>
          <input type="text" id="hf-icon" class="form-input" value="${h.icon || '✅'}" maxlength="2">
        </div>
        <div class="form-group">
          <label class="form-label">颜色</label>
          <input type="color" id="hf-color" class="form-input" value="${h.color || '#7ED321'}" style="height:40px">
        </div>
      </div>
      <div class="form-group">
        <label class="form-label">频率</label>
        <select id="hf-freq" class="form-select">
          <option value="daily" ${(h.frequency?.type || 'daily') === 'daily' ? 'selected' : ''}>每天</option>
          <option value="weekly" ${h.frequency?.type === 'weekly' ? 'selected' : ''}>每周</option>
          <option value="monthly" ${h.frequency?.type === 'monthly' ? 'selected' : ''}>每月</option>
        </select>
      </div>`;

    const footer = `
      <button class="btn btn-secondary" id="hf-cancel">取消</button>
      <button class="btn btn-primary" id="hf-save">${editHabit ? '保存' : '创建习惯'}</button>
    `;

    const { close, container } = openModal(editHabit ? '✏️ 编辑习惯' : '＋ 新建习惯', content, { footer });

    container.querySelector('#hf-cancel').addEventListener('click', close);
    container.querySelector('#hf-save').addEventListener('click', async () => {
      const name = container.querySelector('#hf-name').value.trim();
      if (!name) { showToast('请输入习惯名称', 'error'); return; }

      const data = {
        name,
        description: container.querySelector('#hf-desc').value.trim(),
        icon: container.querySelector('#hf-icon').value,
        color: container.querySelector('#hf-color').value,
        frequency: { type: container.querySelector('#hf-freq').value, count: 1 },
      };

      try {
        if (editHabit) {
          await HabitModel.update(editHabit.id, data);
          showToast('习惯已更新', 'success');
        } else {
          await HabitModel.create(data);
          showToast('✨ 新习惯创建成功!', 'success');
        }
        close();
        this.render();
      } catch (e) {
        showToast('保存失败', 'error');
      }
    });
  }

  esc(str) {
    if (!str) return '';
    const div = document.createElement('div');
    div.textContent = String(str);
    return div.innerHTML;
  }
}
