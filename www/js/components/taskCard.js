/* 任务卡片组件 */

import { Component } from '../core/component.js';
import eventBus from '../core/eventBus.js';
import { TaskModel } from '../data/models/task.js';
import { showToast, showUndo } from '../core/toast.js';
import { openModal } from '../core/modal.js';
import { TaskForm } from './taskForm.js';
import { PRIORITY_MAP, STATUS_MAP, formatDate, formatTime, dateLabel, isOverdue } from '../core/utils.js';

export class TaskCard extends Component {
  constructor(container, task, options = {}) {
    super(container);
    this.task = task;
    this.options = options;
  }

  template() {
    const t = this.task;
    const priority = PRIORITY_MAP[t.priority] || PRIORITY_MAP[0];
    const overdue = isOverdue(t);
    const isCompleted = t.status === 'completed';

    const timeDisplay = (t.startDate || t.endDate) ? `
      <span class="task-card__meta-item ${overdue ? 'text-priority-urgent' : ''}">
        ${overdue ? '⚠️' : '📅'}
        ${t.startDate ? dateLabel(t.startDate) + (t.startTime ? ' ' + t.startTime : '') + ' → ' : ''}
        ${t.endDate ? dateLabel(t.endDate) + (t.endTime ? ' ' + t.endTime : '') : ''}
        ${overdue ? '<span style="font-weight:700">已逾期</span>' : ''}
      </span>` : '';

    const repeatLabel = t.repeatRule && t.repeatRule.type !== 'none'
      ? `<span class="task-card__meta-item">🔁 重复</span>` : '';

    const tagsHtml = (t.tags && t.tags.length > 0) ? `
      <div class="task-card__tags">
        ${t.tags.map((tag) => `<span class="task-tag">${this.esc(tag)}</span>`).join('')}
      </div>` : '';

    return `
      <div class="task-card task-card--${priority.cssClass} ${isCompleted ? 'task-card--completed' : ''} ${overdue ? 'task-card--overdue' : ''}"
           data-task-id="${t.id}">
        <div class="task-card__checkbox ${isCompleted ? 'checked' : ''}" data-action="toggle"></div>
        <div class="task-card__body">
          <div class="task-card__title text-break">${this.esc(t.title)}</div>
          <div class="task-card__meta">
            <span class="priority-badge priority-badge--${priority.cssClass}">${priority.emoji} ${priority.label}</span>
            ${timeDisplay}
            ${repeatLabel}
            ${t.subtasks && t.subtasks.length > 0 ? `<span class="task-card__meta-item">📋 ${t.subtasks.filter(s => s.completed).length}/${t.subtasks.length}</span>` : ''}
          </div>
          ${tagsHtml}
        </div>
        <div class="task-card__actions">
          <button class="btn-icon" data-action="edit" title="编辑" style="font-size:0.9em">✏️</button>
          <button class="btn-icon" data-action="delete" title="删除" style="font-size:0.9em">🗑️</button>
        </div>
      </div>`;
  }

  afterRender() {
    if (!this.el) return;

    this.on('click', '[data-action="toggle"]', async (e) => {
      e.stopPropagation();
      const updated = await TaskModel.toggleComplete(this.task.id);
      if (updated) {
        showToast(updated.status === 'completed' ? '✅ 任务完成!' : '任务已恢复', 'success');
        eventBus.emit('task:card-updated', updated);
      }
    });

    this.on('click', '[data-action="edit"]', async (e) => {
      e.stopPropagation();
      this.openEditForm();
    });

    this.on('click', '[data-action="delete"]', async (e) => {
      e.stopPropagation();
      const deleted = await TaskModel.delete(this.task.id);
      if (deleted) {
        showToast('任务已删除', 'info');
        showUndo('任务已删除', async () => {
          await TaskModel.create(deleted);
          showToast('已撤销删除', 'success');
          eventBus.emit('task:card-updated', deleted);
        });
        eventBus.emit('task:card-deleted', deleted);
      }
    });

    // 点击卡片打开详情
    this.el.addEventListener('click', (e) => {
      if (e.target.closest('[data-action]')) return;
      eventBus.emit('task:open-detail', this.task);
    });
  }

  openEditForm() {
    const form = new TaskForm(null, this.task);
    form.show();
  }

  esc(str) {
    if (!str) return '';
    const div = document.createElement('div');
    div.textContent = String(str);
    return div.innerHTML;
  }
}

export function renderTaskList(container, tasks) {
  if (!container) return;
  container.innerHTML = '';

  if (!tasks || tasks.length === 0) {
    container.innerHTML = `
      <div class="empty-state">
        <div class="empty-state__icon">📝</div>
        <div class="empty-state__title">还没有任务</div>
        <div class="empty-state__description">点击下方按钮或按 Ctrl+N 创建第一个计划吧 ✨</div>
      </div>`;
    return;
  }

  tasks.forEach((task) => {
    const card = new TaskCard(container, task);
    card.render();
  });
}
