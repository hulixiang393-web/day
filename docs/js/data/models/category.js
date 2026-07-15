/* 分类数据模型 */

import db from '../db.js';
import eventBus from '../../core/eventBus.js';
import { generateId } from '../../core/utils.js';

const STORE = 'categories';

/** 默认分类 */
const DEFAULT_CATEGORIES = [
  { name: '📚 学习', icon: '📚', color: '#7EC8FF', order: 0 },
  { name: '💼 工作', icon: '💼', color: '#FFB347', order: 1 },
  { name: '🏠 生活', icon: '🏠', color: '#7ED321', order: 2 },
  { name: '✅ 打卡', icon: '✅', color: '#FF7EB3', order: 3 },
  { name: '🎬 追剧', icon: '🎬', color: '#C586FF', order: 4 },
  { name: '✏️ 创作', icon: '✏️', color: '#48DBFB', order: 5 },
];

export const CategoryModel = {
  async getAll() {
    const cats = await db.getAll(STORE);
    if (cats.length === 0) {
      await this.seedDefaults();
      return db.getAll(STORE);
    }
    return cats.sort((a, b) => a.order - b.order);
  },

  async getById(id) {
    return db.get(STORE, id);
  },

  async create(data) {
    const category = {
      id: generateId(),
      name: data.name || '',
      parentId: data.parentId || null,
      icon: data.icon || '📁',
      color: data.color || '#FF7EB3',
      order: data.order || 0,
    };
    await db.put(STORE, category);
    eventBus.emit('category:created', category);
    return category;
  },

  async update(id, data) {
    const existing = await db.get(STORE, id);
    if (!existing) throw new Error('Category not found');
    const updated = { ...existing, ...data, id: existing.id };
    await db.put(STORE, updated);
    eventBus.emit('category:updated', updated);
    return updated;
  },

  async delete(id) {
    const cat = await db.get(STORE, id);
    if (!cat) return null;
    await db.delete(STORE, id);
    eventBus.emit('category:deleted', cat);
    return cat;
  },

  async seedDefaults() {
    const existing = await db.getAll(STORE);
    if (existing.length > 0) return;

    for (const cat of DEFAULT_CATEGORIES) {
      await this.create(cat);
    }
  },
};
