/* 清单视图 */

import { Component } from '../core/component.js';
import { TaskModel } from '../data/models/task.js';
import { CategoryModel } from '../data/models/category.js';
import { TaskCard } from '../components/taskCard.js';
import { TaskForm } from '../components/taskForm.js';
import { renderEmptyState } from '../components/emptyState.js';
import eventBus from '../core/eventBus.js';
import { showToast } from '../core/toast.js';
import { formatDate, isOverdue } from '../core/utils.js';

export class ListView {
  constructor(container) {
    this.container = container;
    this.filter = { status: 'all', priority: 'all', category: 'all', search: '' };
    this.sortBy = 'endDate';
    this.tasks = [];
  }

  async render() {
    this.tasks = await TaskModel.getAll();

    // 更新逾期状态
    for (const task of this.tasks) {
      if (isOverdue(task) && task.status !== 'completed' && task.status !== 'cancelled') {
        if (task.status === 'pending') {
          await TaskModel.update(task.id, { status: 'overdue' });
          task.status = 'overdue';
        }
      }
    }

    this._renderUI();
  }

  _renderUI() {
    const filtered = this._applyFilters();
    const sorted = this._applySort(filtered);

    const categories = {}; // 按分类分组 - 简化处理

    this.container.innerHTML = `
      <div class="list-view fade-in">
        <div class="task-list-header">
          <div>
            <h2 class="h2">📋 任务清单</h2>
            <span class="task-list-count">${filtered.length} 个任务</span>
          </div>
          <div class="flex items-center gap-3">
            <div class="view-switcher" id="list-filter-status">
              <button class="view-switcher__btn ${this.filter.status === 'all' ? 'active' : ''}" data-status="all">全部</button>
              <button class="view-switcher__btn ${this.filter.status === 'pending' ? 'active' : ''}" data-status="pending">未开始</button>
              <button class="view-switcher__btn ${this.filter.status === 'in_progress' ? 'active' : ''}" data-status="in_progress">进行中</button>
              <button class="view-switcher__btn ${this.filter.status === 'completed' ? 'active' : ''}" data-status="completed">已完成</button>
              <button class="view-switcher__btn ${this.filter.status === 'overdue' ? 'active' : ''}" data-status="overdue">已逾期</button>
            </div>
            <select id="list-sort" class="form-select" style="width:auto">
              <option value="endDate" ${this.sortBy === 'endDate' ? 'selected' : ''}>按日期</option>
              <option value="priority" ${this.sortBy === 'priority' ? 'selected' : ''}>按优先级</option>
              <option value="createdAt" ${this.sortBy === 'createdAt' ? 'selected' : ''}>按创建时间</option>
              <option value="title" ${this.sortBy === 'title' ? 'selected' : ''}>按标题</option>
            </select>
          </div>
        </div>

        <div class="quick-add-bar mb-4" id="quick-add-bar">
          <span class="quick-add-bar__icon">＋</span>
          <span class="quick-add-bar__placeholder">快速新建任务...</span>
          <span class="quick-add-bar__shortcut">Ctrl+N</span>
        </div>

        <div id="task-list-container" class="task-list fade-stagger">
          ${filtered.length === 0 ? '' : ''}
        </div>
      </div>`;

    // 渲染任务列表
    const listContainer = this.container.querySelector('#task-list-container');
    if (filtered.length === 0) {
      renderEmptyState(listContainer, {
        icon: '📝',
        title: '暂无任务',
        description: '点击上方快速新建条或按 Ctrl+N 创建任务',
        actionText: '＋ 创建第一个任务',
        actionCallback: () => new TaskForm(() => this.render()).show(),
      });
    } else {
      filtered.forEach((task) => {
        const card = new TaskCard(listContainer, task);
        card.render();
      });
    }

    // 事件绑定
    this._bindEvents();
  }

  _bindEvents() {
    // 状态筛选
    this.container.querySelectorAll('#list-filter-status .view-switcher__btn').forEach((btn) => {
      btn.addEventListener('click', () => {
        this.filter.status = btn.dataset.status;
        this._renderUI();
      });
    });

    // 排序
    const sortSelect = this.container.querySelector('#list-sort');
    if (sortSelect) {
      sortSelect.addEventListener('change', () => {
        this.sortBy = sortSelect.value;
        this._renderUI();
      });
    }

    // 快速新建
    const quickAdd = this.container.querySelector('#quick-add-bar');
    if (quickAdd) {
      quickAdd.addEventListener('click', () => {
        new TaskForm(() => this.render()).show();
      });
    }

    // 监听事件
    eventBus.on('task:card-updated', () => this.render());
    eventBus.on('task:card-deleted', () => this.render());
    eventBus.on('task:created', () => this.render());
    eventBus.on('task:deleted', () => this.render());
  }

  _applyFilters() {
    return this.tasks.filter((t) => {
      if (this.filter.status !== 'all' && t.status !== this.filter.status) return false;
      if (this.filter.priority !== 'all' && t.priority !== parseInt(this.filter.priority)) return false;
      if (this.filter.category !== 'all' && t.categoryId !== this.filter.category) return false;
      if (this.filter.search && !t.title.toLowerCase().includes(this.filter.search.toLowerCase())) return false;
      return true;
    });
  }

  _applySort(tasks) {
    return [...tasks].sort((a, b) => {
      switch (this.sortBy) {
        case 'priority': return b.priority - a.priority;
        case 'createdAt': return new Date(b.createdAt) - new Date(a.createdAt);
        case 'title': return a.title.localeCompare(b.title);
        case 'endDate':
        default:
          if (!a.endDate && !b.endDate) return 0;
          if (!a.endDate) return 1;
          if (!b.endDate) return -1;
          return new Date(a.endDate) - new Date(b.endDate);
      }
    });
  }
}
