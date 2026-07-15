/* 日视图 — 小时时间轴 */

import { TaskModel } from '../data/models/task.js';
import { TaskCard } from '../components/taskCard.js';
import { TaskForm } from '../components/taskForm.js';
import { renderEmptyState } from '../components/emptyState.js';
import eventBus from '../core/eventBus.js';
import { formatDate, isToday, dateLabel, isOverdue } from '../core/utils.js';

export class DayView {
  constructor(container) {
    this.container = container;
    this.date = formatDate(new Date());
    this.tasks = [];
  }

  async render(dateStr) {
    if (dateStr) this.date = dateStr;
    this.tasks = await TaskModel.getByDate(this.date);

    this._renderUI();
  }

  _renderUI() {
    const todayDate = formatDate(new Date());
    const isCurrentDay = this.date === todayDate;
    const prevDate = new Date(this.date);
    prevDate.setDate(prevDate.getDate() - 1);
    const nextDate = new Date(this.date);
    nextDate.setDate(nextDate.getDate() + 1);

    this.container.innerHTML = `
      <div class="day-view fade-in">
        <div class="calendar-nav">
          <div class="flex items-center gap-3">
            <button class="btn-icon" id="day-prev" title="前一天">◀</button>
            <h2 class="calendar-nav__title" id="day-date-label">
              ${dateLabel(this.date)} · ${formatDate(this.date, 'M月D日 ddd')}
            </h2>
            <button class="btn-icon" id="day-next" title="后一天">▶</button>
            <button class="btn btn-sm btn-secondary" id="day-today" ${isCurrentDay ? 'disabled' : ''}>今天</button>
            <input type="date" id="day-date-picker" class="form-input" style="width:auto" value="${this.date}">
          </div>
          <div>
            <button class="btn btn-primary btn-sm" id="day-add-task">＋ 新建任务</button>
          </div>
        </div>

        <div id="day-tasks-container" class="task-list fade-stagger"></div>

        <div class="day-timeline mt-4" id="day-timeline"></div>
      </div>`;

    // 任务列表
    const taskContainer = this.container.querySelector('#day-tasks-container');
    if (this.tasks.length === 0) {
      renderEmptyState(taskContainer, {
        icon: isCurrentDay ? '☀️' : '📅',
        title: isCurrentDay ? '今天还没有任务' : '当天没有任务',
        description: '点击右上角按钮添加任务吧 ✨',
        actionText: '＋ 新建任务',
        actionCallback: () => new TaskForm(() => this.render()).show(),
      });
    } else {
      this.tasks.forEach((task) => {
        const card = new TaskCard(taskContainer, task);
        card.render();
      });
    }

    // 时间轴
    this._renderTimeline();

    this._bindEvents();
  }

  _renderTimeline() {
    const timeline = this.container.querySelector('#day-timeline');
    if (!timeline) return;

    // 有时段的任务
    const timedTasks = this.tasks.filter((t) => t.dueTime);

    let html = '';
    for (let hour = 0; hour < 24; hour++) {
      const hourStr = String(hour).padStart(2, '0');
      const hourTasks = timedTasks.filter((t) => {
        if (!t.dueTime) return false;
        const h = parseInt(t.dueTime.split(':')[0]);
        return h === hour;
      });

      html += `<div class="day-timeline__hour">
        <span class="day-timeline__hour-label">${hourStr}:00</span>
        <div class="day-timeline__tasks">
          ${hourTasks.map((t) => `
            <div class="task-card task-card--${['low','normal','high','urgent'][t.priority] || 'low'} task-card--${t.status === 'completed' ? 'completed' : ''} mb-1" style="padding:4px 8px;min-height:auto;margin-bottom:2px">
              <span style="font-size:12px">${t.dueTime || ''} ${t.title}</span>
            </div>`).join('')}
        </div>
      </div>`;
    }

    if (timedTasks.length === 0) {
      html = '<div class="text-center text-muted text-sm py-4">没有设置具体时间的任务</div>';
    }

    timeline.innerHTML = html;
  }

  _bindEvents() {
    this.container.querySelector('#day-prev')?.addEventListener('click', () => {
      const d = new Date(this.date);
      d.setDate(d.getDate() - 1);
      this.render(formatDate(d));
    });

    this.container.querySelector('#day-next')?.addEventListener('click', () => {
      const d = new Date(this.date);
      d.setDate(d.getDate() + 1);
      this.render(formatDate(d));
    });

    this.container.querySelector('#day-today')?.addEventListener('click', () => {
      this.render(formatDate(new Date()));
    });

    this.container.querySelector('#day-date-picker')?.addEventListener('change', (e) => {
      this.render(e.target.value);
    });

    this.container.querySelector('#day-add-task')?.addEventListener('click', () => {
      const form = new TaskForm(() => this.render());
      form.show();
    });

    eventBus.on('task:card-updated', () => this.render());
    eventBus.on('task:card-deleted', () => this.render());
  }
}
