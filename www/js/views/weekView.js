/* 周视图 */

import { TaskModel } from '../data/models/task.js';
import { TaskForm } from '../components/taskForm.js';
import eventBus from '../core/eventBus.js';
import { formatDate, getWeekDays, getWeekStart, today, isToday, DAY_NAMES_FULL, addDays } from '../core/utils.js';

export class WeekView {
  constructor(container) {
    this.container = container;
    this.weekStart = formatDate(getWeekStart(new Date()));
    this.tasks = [];
  }

  async render(startDate) {
    if (startDate) this.weekStart = formatDate(getWeekStart(new Date(startDate)));
    const weekEnd = addDays(this.weekStart, 6);
    this.tasks = await TaskModel.getByDateRange(this.weekStart, weekEnd);

    this._renderUI();
  }

  _renderUI() {
    const days = getWeekDays(this.weekStart);
    const todayStr = today();
    const weekEnd = addDays(this.weekStart, 6);

    // 按日期索引
    const tasksByDate = {};
    for (const d of days) tasksByDate[d] = [];
    for (const task of this.tasks) {
      if (!task.endDate && !task.startDate) continue;
      const date = task.endDate || task.startDate;
      if (tasksByDate[date]) tasksByDate[date].push(task);
    }

    const getPriorityClass = (p) => ['low', 'normal', 'high', 'urgent'][p] || 'low';

    this.container.innerHTML = `
      <div class="week-view fade-in">
        <div class="calendar-nav">
          <div class="flex items-center gap-3">
            <button class="btn-icon" id="week-prev">◀</button>
            <h2 class="calendar-nav__title">
              ${this.weekStart} ~ ${weekEnd}
            </h2>
            <button class="btn-icon" id="week-next">▶</button>
            <button class="btn btn-sm btn-secondary" id="week-today">本周</button>
          </div>
          <div>
            <button class="btn btn-primary btn-sm" id="week-add-task">＋ 新建</button>
          </div>
        </div>

        <div class="week-grid">
          <div class="week-grid__header"></div>
          ${days.map((d) => `
            <div class="week-grid__header ${d === todayStr ? 'today' : ''}">
              <div style="font-size:10px">${DAY_NAMES_FULL[new Date(d).getDay()]}</div>
              <div style="font-size:1.2em">${new Date(d).getDate()}</div>
            </div>`).join('')}

          ${[0,1,2,3].map(() => `
            <div style="padding:4px;border-bottom:1px solid var(--border-color-light);color:var(--text-muted);font-size:10px;text-align:right">全天</div>
            ${days.map((d) => {
              const cellTasks = tasksByDate[d] || [];
              return `<div style="padding:2px;border-bottom:1px solid var(--border-color-light);min-height:60px">
                ${cellTasks.slice(0, 4).map((t) => `
                  <div class="month-grid__task ${t.status === 'completed' ? 'task-card--completed' : ''}"
                       style="background:var(--priority-${getPriorityClass(t.priority)}-bg);color:var(--priority-${getPriorityClass(t.priority)});font-size:10px;margin-bottom:1px;cursor:pointer"
                       data-task-id="${t.id}">
                    ${t.startTime || t.endTime ? (t.startTime || t.endTime) + ' ' : ''}${t.title}
                  </div>`).join('')}
                ${cellTasks.length > 4 ? `<div style="font-size:9px;color:var(--text-muted)">+${cellTasks.length - 4}</div>` : ''}
              </div>`;
            }).join('')}
          `).join('')}
        </div>
      </div>`;

    this._bindEvents();
  }

  _bindEvents() {
    this.container.querySelector('#week-prev')?.addEventListener('click', () => {
      this.render(addDays(this.weekStart, -7));
    });
    this.container.querySelector('#week-next')?.addEventListener('click', () => {
      this.render(addDays(this.weekStart, 7));
    });
    this.container.querySelector('#week-today')?.addEventListener('click', () => {
      this.render(formatDate(new Date()));
    });
    this.container.querySelector('#week-add-task')?.addEventListener('click', () => {
      new TaskForm(() => this.render()).show();
    });

    this.container.querySelectorAll('.month-grid__task[data-task-id]').forEach((el) => {
      el.addEventListener('click', async () => {
        const task = await TaskModel.getById(el.dataset.taskId);
        if (task) {
          new TaskForm(() => this.render(), task).show();
        }
      });
    });

    eventBus.on('task:created', () => this.render());
    eventBus.on('task:card-updated', () => this.render());
    eventBus.on('task:card-deleted', () => this.render());
  }
}
