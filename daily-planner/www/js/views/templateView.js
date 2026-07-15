/* 模板中心视图 */

import { TemplateModel } from '../data/models/template.js';
import { TaskModel } from '../data/models/task.js';
import { renderEmptyState } from '../components/emptyState.js';
import { showToast } from '../core/toast.js';
import { today } from '../core/utils.js';

export class TemplateView {
  constructor(container) {
    this.container = container;
  }

  async render() {
    const templates = await TemplateModel.getAll();

    this.container.innerHTML = `
      <div class="templates-view fade-in">
        <div class="calendar-nav">
          <h2 class="h2">📦 模板中心</h2>
        </div>

        <p class="text-secondary mb-4">选择一个模板，快速创建一组计划任务 ✨</p>

        <div class="grid grid-cols-2 gap-3" id="templates-container"></div>
      </div>`;

    const tplContainer = this.container.querySelector('#templates-container');

    if (templates.length === 0) {
      renderEmptyState(tplContainer, {
        icon: '📦',
        title: '暂无模板',
        description: '还没有可用的模板',
      });
    } else {
      tplContainer.innerHTML = templates.map((tp) => `
        <div class="card card-clickable" data-template-id="${tp.id}">
          <div class="flex items-center gap-3 mb-2">
            <span style="font-size:2rem">${tp.icon || '📋'}</span>
            <div>
              <div class="card-title">${this.esc(tp.name)}</div>
              <div class="text-xs text-secondary">${tp.isBuiltin ? '📌 内置模板' : '📝 自定义'} · ${tp.category}</div>
            </div>
          </div>
          <p class="text-sm text-secondary mb-3">${this.esc(tp.description || '')}</p>
          <div class="text-xs text-muted mb-3">包含 ${tp.tasks?.length || 0} 个任务</div>
          <button class="btn btn-primary btn-sm template-apply-btn" data-template-id="${tp.id}">
            ✨ 使用此模板
          </button>
        </div>`).join('');
    }

    this._bindEvents(templates);
  }

  _bindEvents(templates) {
    this.container.querySelectorAll('.template-apply-btn').forEach((btn) => {
      btn.addEventListener('click', async (e) => {
        e.stopPropagation();
        const template = templates.find((t) => t.id === btn.dataset.templateId);
        if (!template || !template.tasks) return;

        let count = 0;
        for (const taskData of template.tasks) {
          await TaskModel.create({
            ...taskData,
            endDate: today(),
          });
          count++;
        }

        showToast(`✨ 已从「${template.name}」创建 ${count} 个任务`, 'success');
      });
    });
  }

  esc(str) {
    if (!str) return '';
    const div = document.createElement('div');
    div.textContent = String(str);
    return div.innerHTML;
  }
}
