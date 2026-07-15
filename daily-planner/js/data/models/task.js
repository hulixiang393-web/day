/* 任务数据模型 */

import db from '../db.js';
import eventBus from '../../core/eventBus.js';
import { generateId, now } from '../../core/utils.js';

const STORE = 'tasks';

export const TaskModel = {
  /** 获取所有任务 */
  async getAll() {
    return db.getAll(STORE);
  },

  /** 按 ID 获取 */
  async getById(id) {
    return db.get(STORE, id);
  },

  /** 按状态获取 */
  async getByStatus(status) {
    return db.getByIndex(STORE, 'status', status);
  },

  /** 按日期范围获取 */
  async getByDateRange(startDate, endDate) {
    const all = await db.getAll(STORE);
    return all.filter((t) => {
      if (!t.dueDate) return false;
      return t.dueDate >= startDate && t.dueDate <= endDate;
    });
  },

  /** 按日期获取 */
  async getByDate(date) {
    const all = await db.getAll(STORE);
    return all.filter((t) => t.dueDate === date);
  },

  /** 按分类获取 */
  async getByCategory(categoryId) {
    return db.getByIndex(STORE, 'categoryId', categoryId);
  },

  /** 创建任务 */
  async create(data) {
    const task = {
      id: generateId(),
      title: data.title || '',
      description: data.description || '',
      categoryId: data.categoryId || null,
      tags: data.tags || [],
      priority: data.priority ?? 0,
      status: data.status || 'pending',
      startDate: data.startDate || null,
      dueDate: data.dueDate || null,
      dueTime: data.dueTime || null,
      repeatRule: data.repeatRule || null,
      reminders: data.reminders || [],
      color: data.color || null,
      icon: data.icon || null,
      isPrivate: data.isPrivate || false,
      memo: data.memo || '',
      subtasks: data.subtasks || [],
      completedAt: null,
      createdAt: now(),
      updatedAt: now(),
      order: data.order || 0,
    };

    await db.put(STORE, task);
    eventBus.emit('task:created', task);
    return task;
  },

  /** 更新任务 */
  async update(id, data) {
    const existing = await db.get(STORE, id);
    if (!existing) throw new Error('Task not found: ' + id);

    const updated = {
      ...existing,
      ...data,
      id: existing.id,
      updatedAt: now(),
    };

    // 如果状态变为 completed，记录完成时间
    if (data.status === 'completed' && existing.status !== 'completed') {
      updated.completedAt = now();
    }
    if (data.status && data.status !== 'completed') {
      updated.completedAt = null;
    }

    await db.put(STORE, updated);
    eventBus.emit('task:updated', { old: existing, new: updated });
    return updated;
  },

  /** 完成/取消完成任务 */
  async toggleComplete(id) {
    const task = await db.get(STORE, id);
    if (!task) return null;

    const newStatus = task.status === 'completed' ? 'pending' : 'completed';
    const taskData = {
      status: newStatus,
      completedAt: newStatus === 'completed' ? now() : null,
    };

    const updated = await this.update(id, taskData);

    if (newStatus === 'completed') {
      eventBus.emit('task:completed', updated);
    }

    return updated;
  },

  /** 删除任务 */
  async delete(id) {
    const task = await db.get(STORE, id);
    if (!task) return null;

    await db.delete(STORE, id);
    eventBus.emit('task:deleted', task);
    return task;
  },

  /** 批量更新 */
  async batchUpdate(ids, data) {
    const results = [];
    for (const id of ids) {
      results.push(await this.update(id, data));
    }
    eventBus.emit('task:batch-updated', { ids, data });
    return results;
  },

  /** 批量删除 */
  async batchDelete(ids) {
    const tasks = [];
    for (const id of ids) {
      const task = await this.getById(id);
      if (task) {
        tasks.push(task);
        await db.delete(STORE, id);
      }
    }
    eventBus.emit('task:batch-deleted', tasks);
    return tasks;
  },

  /** 重新排序 */
  async reorder(orderedIds) {
    for (let i = 0; i < orderedIds.length; i++) {
      await this.update(orderedIds[i], { order: i });
    }
  },

  /** 获取逾期任务 */
  async getOverdue() {
    const all = await db.getAll(STORE);
    const nowDate = new Date();
    const todayStr = nowDate.toISOString().split('T')[0];
    return all.filter((t) => {
      if (!t.dueDate || t.status === 'completed' || t.status === 'cancelled') return false;
      return t.dueDate < todayStr;
    });
  },

  /** 搜索任务 */
  async search(query) {
    if (!query || query.trim() === '') return this.getAll();
    const q = query.toLowerCase();
    const all = await db.getAll(STORE);
    return all.filter((t) => {
      return (
        (t.title && t.title.toLowerCase().includes(q)) ||
        (t.description && t.description.toLowerCase().includes(q)) ||
        (t.tags && t.tags.some((tag) => tag.toLowerCase().includes(q))) ||
        (t.memo && t.memo.toLowerCase().includes(q))
      );
    });
  },

  /** 获取统计数据 */
  async getStats(startDate, endDate) {
    const all = await db.getAll(STORE);
    const filtered = all.filter((t) => {
      if (!t.dueDate) return true;
      return t.dueDate >= startDate && t.dueDate <= endDate;
    });

    const total = filtered.length;
    const completed = filtered.filter((t) => t.status === 'completed').length;
    const overdue = filtered.filter((t) => {
      if (!t.dueDate || t.status === 'completed' || t.status === 'cancelled') return false;
      return t.dueDate < new Date().toISOString().split('T')[0];
    }).length;
    const pending = filtered.filter((t) => t.status === 'pending').length;
    const inProgress = filtered.filter((t) => t.status === 'in_progress').length;

    return { total, completed, overdue, pending, inProgress, completionRate: total > 0 ? Math.round((completed / total) * 100) : 0 };
  },
};
