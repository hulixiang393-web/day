/* 二次元时间线视图 */

import { TaskModel } from '../data/models/task.js';
import { TaskCard } from '../components/taskCard.js';
import { TaskForm } from '../components/taskForm.js';
import { renderEmptyState } from '../components/emptyState.js';
import eventBus from '../core/eventBus.js';
import { formatDate, dateLabel } from '../core/utils.js';

export class TimelineView {
  constructor(container) {
    this.container = container;
    this.tasks = [];
  }

  async render() {
    this.tasks = await TaskModel.getAll();
    // 过滤掉没有日期的任务
    const dated = this.tasks.filter((t) => t.dueDate).sort((a, b) => {
      if (!a.dueDate) return 1;
      if (!b.dueDate) return -1;
      return new Date(a.dueDate) - new Date(b.dueDate);
    });

    // 按日期分组
    const groups = {};
    for (const task of dated) {
      const date = task.dueDate;
      if (!groups[date]) groups[date] = [];
      groups[date].push(task);
    }

    this.container.innerHTML = `
      <div class="timeline-view fade-in">
        <div class="calendar-nav">
          <h2 class="h2">✨ 时间线</h2>
          <button class="btn btn-primary btn-sm" id="timeline-add-task">＋ 新建任务</button>
        </div>

        <div class="timeline mt-4" id="timeline-container"></div>
      </div>`;

    const timelineContainer = this.container.querySelector('#timeline-container');

    if (Object.keys(groups).length === 0) {
      renderEmptyState(timelineContainer, {
        icon: '✨',
        title: '时间线上还没有任务',
        description: '创建带日期的任务后，它们会按时间线排列在这里',
        actionText: '＋ 创建任务',
        actionCallback: () => new TaskForm(() => this.render()).show(),
      });
    } else {
      timelineContainer.innerHTML = Object.entries(groups).map(([date, tasks]) => `
        <div class="timeline-item fade-in">
          <div class="timeline-item__date">${dateLabel(date)} · ${formatDate(date, 'M月D日')}</div>
          <div class="task-list">
            ${tasks.map((t) => `<div data-task-id="${t.id}"></div>`).join('')}
          </div>
        </div>`).join('');

      // 渲染每个任务卡片
      timelineContainer.querySelectorAll('[data-task-id]').forEach((el) => {
        const task = dated.find((t) => t.id === el.dataset.taskId);
        if (task) {
          const card = new TaskCard(el, task);
          card.render();
        }
      });
    }

    this._bindEvents();
  }

  _bindEvents() {
    this.container.querySelector('#timeline-add-task')?.addEventListener('click', () => {
      new TaskForm(() => this.render()).show();
    });

    eventBus.on('task:card-updated', () => this.render());
    eventBus.on('task:card-deleted', () => this.render());
  }
}
