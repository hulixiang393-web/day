/* 模板数据模型 */

import db from '../db.js';
import eventBus from '../../core/eventBus.js';
import { generateId, now } from '../../core/utils.js';

const STORE = 'templates';

/** 内置模板 */
const BUILTIN_TEMPLATES = [
  {
    id: 'tpl-study',
    name: '📚 学习计划表',
    description: '每日学习打卡模板，含早晚自习和课程复习',
    category: '学习',
    isBuiltin: true,
    icon: '📚',
    tasks: [
      { title: '晨间阅读 (30分钟)', priority: 1, category: '学习', estimatedMinutes: 30 },
      { title: '课程复习', priority: 2, category: '学习', estimatedMinutes: 60 },
      { title: '练习题巩固', priority: 1, category: '学习', estimatedMinutes: 45 },
      { title: '晚间总结笔记', priority: 0, category: '学习', estimatedMinutes: 20 },
    ],
    createdAt: now(),
  },
  {
    id: 'tpl-work',
    name: '💼 工作计划表',
    description: '高效工作日计划模板，含晨会和复盘',
    category: '工作',
    isBuiltin: true,
    icon: '💼',
    tasks: [
      { title: '晨会准备', priority: 2, category: '工作', estimatedMinutes: 15 },
      { title: '核心任务处理', priority: 3, category: '工作', estimatedMinutes: 120 },
      { title: '邮件回复与沟通', priority: 1, category: '工作', estimatedMinutes: 30 },
      { title: '当日工作复盘', priority: 0, category: '工作', estimatedMinutes: 15 },
    ],
    createdAt: now(),
  },
  {
    id: 'tpl-life',
    name: '🏠 生活作息表',
    description: '健康生活日常打卡，培养良好习惯',
    category: '生活',
    isBuiltin: true,
    icon: '🏠',
    tasks: [
      { title: '早起喝水', priority: 1, category: '生活', estimatedMinutes: 2 },
      { title: '运动30分钟', priority: 2, category: '生活', estimatedMinutes: 30 },
      { title: '整理房间', priority: 0, category: '生活', estimatedMinutes: 15 },
      { title: '早睡准备', priority: 1, category: '生活', estimatedMinutes: 10 },
    ],
    createdAt: now(),
  },
  {
    id: 'tpl-anime',
    name: '🎬 追剧清单',
    description: '二次元追番/追剧记录模板',
    category: '娱乐',
    isBuiltin: true,
    icon: '🎬',
    tasks: [
      { title: '今日更新番剧', priority: 2, category: '娱乐', estimatedMinutes: 24 },
      { title: '补番计划', priority: 0, category: '娱乐', estimatedMinutes: 48 },
      { title: '写番评/记录感想', priority: 0, category: '创作', estimatedMinutes: 20 },
    ],
    createdAt: now(),
  },
  {
    id: 'tpl-create',
    name: '✏️ 创作计划表',
    description: '同人创作/绘画/写作日常计划',
    category: '创作',
    isBuiltin: true,
    icon: '✏️',
    tasks: [
      { title: '灵感收集与素材整理', priority: 1, category: '创作', estimatedMinutes: 20 },
      { title: '核心创作时段', priority: 3, category: '创作', estimatedMinutes: 90 },
      { title: '修改润色', priority: 1, category: '创作', estimatedMinutes: 30 },
      { title: '发布与互动', priority: 0, category: '创作', estimatedMinutes: 15 },
    ],
    createdAt: now(),
  },
];

export const TemplateModel = {
  async getAll() {
    const stored = await db.getAll(STORE);
    if (stored.length === 0) {
      await this.seedBuiltins();
      return db.getAll(STORE);
    }
    return stored;
  },

  async getById(id) {
    return db.get(STORE, id);
  },

  async getByCategory(category) {
    const all = await this.getAll();
    return all.filter((t) => t.category === category);
  },

  async create(data) {
    const template = {
      id: generateId(),
      name: data.name || '',
      description: data.description || '',
      category: data.category || '自定义',
      isBuiltin: false,
      icon: data.icon || '📋',
      tasks: data.tasks || [],
      createdAt: now(),
    };
    await db.put(STORE, template);
    eventBus.emit('template:created', template);
    return template;
  },

  async delete(id) {
    const tp = await db.get(STORE, id);
    if (!tp || tp.isBuiltin) return null;
    await db.delete(STORE, id);
    eventBus.emit('template:deleted', tp);
    return tp;
  },

  async seedBuiltins() {
    const existing = await db.getAll(STORE);
    if (existing.length > 0) return;
    for (const tp of BUILTIN_TEMPLATES) {
      await db.put(STORE, tp);
    }
  },
};
