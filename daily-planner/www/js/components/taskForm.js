/* 任务编辑表单 */

import { Component } from '../core/component.js';
import { TaskModel } from '../data/models/task.js';
import { CategoryModel } from '../data/models/category.js';
import { openModal } from '../core/modal.js';
import { showToast } from '../core/toast.js';
import eventBus from '../core/eventBus.js';
import { generateId, PRIORITY_MAP } from '../core/utils.js';
import { getRecurrenceLabel } from '../utils/recurrence.js';

export class TaskForm {
  constructor(onSave, editTask = null) {
    this.onSave = onSave;
    this.editTask = editTask;
    this.reminders = editTask?.reminders || [];
    this.subtasks = editTask?.subtasks || [];
    this.tags = editTask?.tags || [];
  }

  async show() {
    const categories = await CategoryModel.getAll();
    const isEdit = !!this.editTask;
    const t = this.editTask || {};

    const priorityOptions = Object.entries(PRIORITY_MAP)
      .map(([val, info]) => `
        <label class="priority-option ${info.cssClass} ${(t.priority ?? 0) == val ? 'selected' : ''}">
          <input type="radio" name="priority" value="${val}" ${(t.priority ?? 0) == val ? 'checked' : ''} hidden>
          ${info.emoji} ${info.label}
        </label>`).join('');

    const categoryOptions = categories.map((c) => `
      <option value="${c.id}" ${t.categoryId === c.id ? 'selected' : ''}>${c.icon} ${c.name}</option>
    `).join('');

    const statusOptions = [
      { val: 'pending', label: '⏳ 未开始' },
      { val: 'in_progress', label: '🔄 进行中' },
      { val: 'completed', label: '✅ 已完成' },
      { val: 'cancelled', label: '❌ 已取消' },
    ].map((s) => `<option value="${s.val}" ${t.status === s.val ? 'selected' : ''}>${s.label}</option>`).join('');

    const repeatTypes = [
      { val: 'none', label: '不重复' },
      { val: 'daily', label: '每天' },
      { val: 'weekly', label: '每周' },
      { val: 'monthly', label: '每月' },
      { val: 'weekdays', label: '工作日' },
      { val: 'interval', label: '间隔天数' },
    ].map((r) => `<option value="${r.val}" ${(t.repeatRule?.type || 'none') === r.val ? 'selected' : ''}>${r.label}</option>`).join('');

    const subtaskHtml = this.subtasks.map((s, i) => `
      <div class="flex items-center gap-2 mb-2">
        <span class="checkbox-custom ${s.completed ? 'checked' : ''}" style="width:18px;height:18px;font-size:10px">${s.completed ? '✓' : ''}</span>
        <input type="text" class="form-input subtask-input" value="${this.esc(s.title)}" data-index="${i}" style="flex:1">
        <button class="btn-icon subtask-delete" data-index="${i}" style="color:var(--color-danger)">✕</button>
      </div>`).join('');

    const tagHtml = this.tags.map((tag) => `
      <span class="task-tag" style="cursor:pointer">${this.esc(tag)} ✕</span>
    `).join('');

    const reminderHtml = this.reminders.map((r, i) => `
      <div class="flex items-center gap-2 mb-2">
        <select class="form-select reminder-minutes" data-index="${i}" style="flex:1">
          <option value="5" ${r.minutes == 5 ? 'selected' : ''}>提前 5 分钟</option>
          <option value="10" ${r.minutes == 10 ? 'selected' : ''}>提前 10 分钟</option>
          <option value="15" ${r.minutes == 15 ? 'selected' : ''}>提前 15 分钟</option>
          <option value="30" ${r.minutes == 30 ? 'selected' : ''}>提前 30 分钟</option>
          <option value="60" ${r.minutes == 60 ? 'selected' : ''}>提前 1 小时</option>
          <option value="1440" ${r.minutes == 1440 ? 'selected' : ''}>提前 1 天</option>
        </select>
        <button class="btn-icon reminder-delete" data-index="${i}" style="color:var(--color-danger)">✕</button>
      </div>`).join('');

    const content = `
      <div class="task-form">
        <div class="form-group">
          <label class="form-label">任务标题 *</label>
          <input type="text" id="tf-title" class="form-input" placeholder="输入任务标题..." value="${this.esc(t.title || '')}" maxlength="200" autofocus>
        </div>

        <div class="form-group">
          <label class="form-label">详细备注</label>
          <textarea id="tf-description" class="form-textarea" placeholder="添加备注说明..." rows="3">${this.esc(t.description || '')}</textarea>
        </div>

        <div class="form-group">
          <label class="form-label">⏰ 任务时间</label>
          <div class="grid grid-cols-2 gap-3">
            <div>
              <label class="text-xs text-secondary">开始日期</label>
              <input type="date" id="tf-start-date" class="form-input" value="${t.startDate || ''}">
            </div>
            <div>
              <label class="text-xs text-secondary">开始时间</label>
              <input type="time" id="tf-start-time" class="form-input" value="${t.startTime || ''}">
            </div>
          </div>
          <div class="grid grid-cols-2 gap-3 mt-2">
            <div>
              <label class="text-xs text-secondary">结束日期</label>
              <input type="date" id="tf-end-date" class="form-input" value="${t.endDate || ''}">
            </div>
            <div>
              <label class="text-xs text-secondary">结束时间</label>
              <input type="time" id="tf-end-time" class="form-input" value="${t.endTime || ''}">
            </div>
          </div>
        </div>

        <div class="grid grid-cols-2 gap-3">
          <div class="form-group">
            <label class="form-label">分类</label>
            <select id="tf-category" class="form-select">
              <option value="">无分类</option>
              ${categoryOptions}
            </select>
          </div>
          <div class="form-group">
            <label class="form-label">状态</label>
            <select id="tf-status" class="form-select">${statusOptions}</select>
          </div>
        </div>

        <div class="form-group">
          <label class="form-label">优先级</label>
          <div class="priority-selector" id="tf-priority">${priorityOptions}</div>
        </div>

        <div class="form-group">
          <label class="form-label">重复规则</label>
          <div class="flex items-center gap-2">
            <select id="tf-repeat-type" class="form-select" style="flex:1">${repeatTypes}</select>
            <div id="tf-repeat-interval" class="${(t.repeatRule?.type || 'none') === 'interval' ? '' : 'hidden'}" style="width:80px">
              <input type="number" id="tf-interval-num" class="form-input" placeholder="间隔" value="${t.repeatRule?.interval || 1}" min="1" max="365">
            </div>
          </div>
          <input type="date" id="tf-repeat-end" class="form-input mt-2" value="${t.repeatRule?.endDate || ''}" placeholder="重复结束日期 (可选)">
        </div>

        <div class="form-group">
          <label class="form-label">提醒设置</label>
          <div id="tf-reminders">${reminderHtml || '<div class="text-muted text-sm">暂无提醒</div>'}</div>
          <button id="tf-add-reminder" class="btn btn-sm btn-secondary mt-2">＋ 添加提醒</button>
        </div>

        <div class="form-group">
          <label class="form-label">子任务</label>
          <div id="tf-subtasks">${subtaskHtml || '<div class="text-muted text-sm">暂无子任务</div>'}</div>
          <div class="flex items-center gap-2 mt-2">
            <input type="text" id="tf-new-subtask" class="form-input" placeholder="输入子任务...">
            <button id="tf-add-subtask" class="btn btn-sm btn-secondary">添加</button>
          </div>
        </div>

        <div class="form-group">
          <label class="form-label">标签</label>
          <div class="flex items-center gap-2 flex-wrap mb-2" id="tf-tags">${tagHtml || ''}</div>
          <div class="flex items-center gap-2">
            <input type="text" id="tf-new-tag" class="form-input" placeholder="输入标签...">
            <button id="tf-add-tag" class="btn btn-sm btn-secondary">添加</button>
          </div>
        </div>

        <div class="form-group">
          <label class="checkbox-label">
            <input type="checkbox" id="tf-private" ${t.isPrivate ? 'checked' : ''}>
            <span class="checkbox-custom"></span>
            私密任务 (加密保护)
          </label>
        </div>
      </div>`;

    const footer = `
      <button class="btn btn-secondary" id="tf-cancel">取消</button>
      <button class="btn btn-primary" id="tf-save">${isEdit ? '保存修改' : '创建任务'}</button>
    `;

    const { close, container } = openModal(
      isEdit ? '✏️ 编辑任务' : '＋ 新建任务',
      content,
      { footer, wide: true }
    );

    this.bindFormEvents(container, close);
  }

  bindFormEvents(container, close) {
    // 优先级选择
    container.querySelectorAll('.priority-option').forEach((el) => {
      el.addEventListener('click', () => {
        container.querySelectorAll('.priority-option').forEach((o) => o.classList.remove('selected'));
        el.classList.add('selected');
        el.querySelector('input').checked = true;
      });
    });

    // 重复类型切换
    const repeatType = container.querySelector('#tf-repeat-type');
    const repeatInterval = container.querySelector('#tf-repeat-interval');
    repeatType.addEventListener('change', () => {
      repeatInterval.classList.toggle('hidden', repeatType.value !== 'interval');
    });

    // 添加提醒
    container.querySelector('#tf-add-reminder').addEventListener('click', () => {
      const idx = this.reminders.length;
      this.reminders.push({ minutes: 15 });
      const div = document.createElement('div');
      div.className = 'flex items-center gap-2 mb-2';
      div.innerHTML = `
        <select class="form-select reminder-minutes" data-index="${idx}" style="flex:1">
          <option value="5">提前 5 分钟</option>
          <option value="10">提前 10 分钟</option>
          <option value="15" selected>提前 15 分钟</option>
          <option value="30">提前 30 分钟</option>
          <option value="60">提前 1 小时</option>
          <option value="1440">提前 1 天</option>
        </select>
        <button class="btn-icon reminder-delete" data-index="${idx}" style="color:var(--color-danger)">✕</button>`;
      container.querySelector('#tf-reminders').appendChild(div);
      bindReminderEvents(div, idx);
    });

    const bindReminderEvents = (el, idx) => {
      el.querySelector('.reminder-minutes').addEventListener('change', (e) => {
        this.reminders[idx] = { minutes: parseInt(e.target.value) };
      });
      el.querySelector('.reminder-delete').addEventListener('click', () => {
        this.reminders.splice(idx, 1);
        el.remove();
        if (this.reminders.length === 0) {
          container.querySelector('#tf-reminders').innerHTML = '<div class="text-muted text-sm">暂无提醒</div>';
        }
      });
    };

    // 添加子任务
    container.querySelector('#tf-add-subtask').addEventListener('click', () => {
      const input = container.querySelector('#tf-new-subtask');
      const title = input.value.trim();
      if (!title) return;
      this.subtasks.push({ id: generateId(), title, completed: false, order: this.subtasks.length });
      input.value = '';
      refreshSubtasks();
    });

    const refreshSubtasks = () => {
      const div = container.querySelector('#tf-subtasks');
      div.innerHTML = this.subtasks.map((s, i) => `
        <div class="flex items-center gap-2 mb-2">
          <span class="checkbox-custom ${s.completed ? 'checked' : ''}" style="width:18px;height:18px;font-size:10px" data-st-index="${i}">${s.completed ? '✓' : ''}</span>
          <input type="text" class="form-input subtask-input" value="${this.esc(s.title)}" data-st-index="${i}" style="flex:1">
          <button class="btn-icon subtask-delete" data-st-index="${i}" style="color:var(--color-danger)">✕</button>
        </div>`).join('');

      div.querySelectorAll('.checkbox-custom').forEach((cb) => {
        cb.addEventListener('click', () => {
          const i = parseInt(cb.dataset.stIndex);
          this.subtasks[i].completed = !this.subtasks[i].completed;
          cb.classList.toggle('checked');
          cb.textContent = this.subtasks[i].completed ? '✓' : '';
        });
      });

      div.querySelectorAll('.subtask-input').forEach((inp) => {
        inp.addEventListener('change', () => {
          const i = parseInt(inp.dataset.stIndex);
          this.subtasks[i].title = inp.value;
        });
      });

      div.querySelectorAll('.subtask-delete').forEach((btn) => {
        btn.addEventListener('click', () => {
          const i = parseInt(btn.dataset.stIndex);
          this.subtasks.splice(i, 1);
          refreshSubtasks();
        });
      });
    };

    // 添加标签
    container.querySelector('#tf-add-tag').addEventListener('click', () => {
      const input = container.querySelector('#tf-new-tag');
      const tag = input.value.trim();
      if (!tag || this.tags.includes(tag)) return;
      this.tags.push(tag);
      input.value = '';
      refreshTags();
    });

    const refreshTags = () => {
      const div = container.querySelector('#tf-tags');
      div.innerHTML = this.tags.map((tag) => `
        <span class="task-tag" style="cursor:pointer" data-tag="${this.esc(tag)}">${this.esc(tag)} ✕</span>
      `).join('');
      div.querySelectorAll('.task-tag').forEach((el) => {
        el.addEventListener('click', () => {
          const tag = el.dataset.tag;
          this.tags = this.tags.filter((t) => t !== tag);
          refreshTags();
        });
      });
    };

    // 取消
    container.querySelector('#tf-cancel').addEventListener('click', close);

    // 保存
    container.querySelector('#tf-save').addEventListener('click', async () => {
      const title = container.querySelector('#tf-title').value.trim();
      if (!title) { showToast('请输入任务标题', 'error'); return; }

      const priority = parseInt(container.querySelector('input[name="priority"]:checked')?.value || '0');
      const repeatType = container.querySelector('#tf-repeat-type').value;

      const data = {
        title,
        description: container.querySelector('#tf-description').value.trim(),
        endDate: container.querySelector('#tf-end-date').value || null,
        endTime: container.querySelector('#tf-end-time').value || null,
        startDate: container.querySelector('#tf-start-date').value || null,
        startTime: container.querySelector('#tf-start-time').value || null,
        categoryId: container.querySelector('#tf-category').value || null,
        status: container.querySelector('#tf-status').value,
        priority,
        repeatRule: repeatType !== 'none' ? {
          type: repeatType,
          interval: parseInt(container.querySelector('#tf-interval-num')?.value || '1'),
          endDate: container.querySelector('#tf-repeat-end').value || null,
        } : null,
        reminders: this.reminders,
        subtasks: this.subtasks,
        tags: this.tags,
        isPrivate: container.querySelector('#tf-private').checked,
      };

      try {
        if (this.editTask) {
          await TaskModel.update(this.editTask.id, data);
          showToast('✅ 任务已更新', 'success');
        } else {
          await TaskModel.create(data);
          showToast('✨ 任务创建成功!', 'success');
        }
        close();
        if (this.onSave) this.onSave();
      } catch (e) {
        showToast('保存失败: ' + e.message, 'error');
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
