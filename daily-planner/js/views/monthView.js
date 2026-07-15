/* 月视图 */

import { TaskModel } from '../data/models/task.js';
import { TaskForm } from '../components/taskForm.js';
import eventBus from '../core/eventBus.js';
import { formatDate, getMonthGrid, today, isToday, DAY_NAMES } from '../core/utils.js';

export class MonthView {
  constructor(container) {
    this.container = container;
    this.currentDate = new Date();
    this.year = this.currentDate.getFullYear();
    this.month = this.currentDate.getMonth();
    this.tasks = [];
  }

  async render(year, month) {
    if (year !== undefined) { this.year = year; this.month = month; }

    const startDate = formatDate(new Date(this.year, this.month, 1));
    const endDate = formatDate(new Date(this.year, this.month + 1, 0));
    this.tasks = await TaskModel.getByDateRange(startDate, endDate);

    this._renderUI();
  }

  _renderUI() {
    const grid = getMonthGrid(this.year, this.month);
    const todayStr = today();
    const monthNames = ['1月', '2月', '3月', '4月', '5月', '6月', '7月', '8月', '9月', '10月', '11月', '12月'];

    // 按日期索引任务
    const tasksByDate = {};
    for (const task of this.tasks) {
      if (!task.dueDate) continue;
      if (!tasksByDate[task.dueDate]) tasksByDate[task.dueDate] = [];
      tasksByDate[task.dueDate].push(task);
    }

    const getPriorityClass = (p) => ['low', 'normal', 'high', 'urgent'][p] || 'low';

    this.container.innerHTML = `
      <div class="month-view fade-in">
        <div class="calendar-nav">
          <div class="flex items-center gap-3">
            <button class="btn-icon" id="month-prev">◀</button>
            <h2 class="calendar-nav__title" id="month-label">
              ${this.year}年 ${monthNames[this.month]}
            </h2>
            <button class="btn-icon" id="month-next">▶</button>
            <button class="btn btn-sm btn-secondary" id="month-today">今天</button>
          </div>
          <div>
            <button class="btn btn-primary btn-sm" id="month-add-task">＋ 新建</button>
          </div>
        </div>

        <div class="month-grid">
          ${DAY_NAMES.map((d) => `<div class="week-grid__header" style="padding:8px;font-weight:700">${d}</div>`).join('')}
          ${grid.map((week) =>
            week.map((cell) => {
              const cellTasks = tasksByDate[cell.date] || [];
              const isCurMonth = !cell.isOtherMonth;
              const isTodayCell = cell.date === todayStr;
              return `
                <div class="month-grid__cell ${cell.isOtherMonth ? 'other-month' : ''} ${isTodayCell ? 'today' : ''}"
                     data-date="${cell.date}">
                  <div class="month-grid__date ${isTodayCell ? 'today' : ''}">${cell.day}</div>
                  <div class="month-grid__tasks">
                    ${cellTasks.slice(0, 3).map((t) => `
                      <div class="month-grid__task ${t.status === 'completed' ? 'task-card--completed' : ''}"
                           style="background:var(--priority-${getPriorityClass(t.priority)}-bg);color:var(--priority-${getPriorityClass(t.priority)})">
                        ${t.title}
                      </div>`).join('')}
                    ${cellTasks.length > 3 ? `<div class="month-grid__task" style="color:var(--text-muted)">+${cellTasks.length - 3} 更多</div>` : ''}
                  </div>
                </div>`;
            }).join('')
          ).join('')}
        </div>
      </div>`;

    this._bindEvents();
  }

  _bindEvents() {
    this.container.querySelector('#month-prev')?.addEventListener('click', () => {
      if (this.month === 0) { this.year--; this.month = 11; }
      else this.month--;
      this.render();
    });

    this.container.querySelector('#month-next')?.addEventListener('click', () => {
      if (this.month === 11) { this.year++; this.month = 0; }
      else this.month++;
      this.render();
    });

    this.container.querySelector('#month-today')?.addEventListener('click', () => {
      const now = new Date();
      this.year = now.getFullYear();
      this.month = now.getMonth();
      this.render();
    });

    // 点击单元格跳转到日视图
    this.container.querySelectorAll('.month-grid__cell').forEach((cell) => {
      cell.addEventListener('click', () => {
        const date = cell.dataset.date;
        window.location.hash = `#/day/${date}`;
      });
    });

    this.container.querySelector('#month-add-task')?.addEventListener('click', () => {
      new TaskForm(() => this.render()).show();
    });

    eventBus.on('task:created', () => this.render());
    eventBus.on('task:card-updated', () => this.render());
    eventBus.on('task:card-deleted', () => this.render());
  }
}
