/* 习惯数据模型 */

import db from '../db.js';
import eventBus from '../../core/eventBus.js';
import { generateId, now, today } from '../../core/utils.js';

const STORE = 'habits';

export const HabitModel = {
  async getAll() {
    const habits = await db.getAll(STORE);
    return habits.filter((h) => !h.archived);
  },

  async getById(id) {
    return db.get(STORE, id);
  },

  async create(data) {
    const habit = {
      id: generateId(),
      name: data.name || '',
      description: data.description || '',
      categoryId: data.categoryId || null,
      icon: data.icon || '✅',
      color: data.color || '#7ED321',
      frequency: data.frequency || { type: 'daily', count: 1 },
      streak: 0,
      bestStreak: 0,
      history: {},
      medals: [],
      archived: false,
      createdAt: now(),
    };
    await db.put(STORE, habit);
    eventBus.emit('habit:created', habit);
    return habit;
  },

  async update(id, data) {
    const existing = await db.get(STORE, id);
    if (!existing) throw new Error('Habit not found');
    const updated = { ...existing, ...data, id: existing.id };
    await db.put(STORE, updated);
    eventBus.emit('habit:updated', updated);
    return updated;
  },

  async delete(id) {
    const habit = await db.get(STORE, id);
    if (!habit) return null;
    await db.delete(STORE, id);
    eventBus.emit('habit:deleted', habit);
    return habit;
  },

  /** 打卡 */
  async checkIn(id, dateStr) {
    const habit = await db.get(STORE, id);
    if (!habit) return null;

    dateStr = dateStr || today();
    if (!habit.history) habit.history = {};

    if (habit.history[dateStr]) {
      // 已打卡，增加计数
      habit.history[dateStr].count = (habit.history[dateStr].count || 1) + 1;
      habit.history[dateStr].completedAt.push(now());
    } else {
      habit.history[dateStr] = { count: 1, completedAt: [now()], note: '' };
    }

    // 计算连续天数
    habit.streak = this._calcStreak(habit.history);
    if (habit.streak > (habit.bestStreak || 0)) {
      habit.bestStreak = habit.streak;
    }

    await db.put(STORE, habit);
    eventBus.emit('habit:checked-in', { habit, date: dateStr });

    // 检查勋章解锁
    this._checkMedals(habit);
    return habit;
  },

  /** 取消打卡 */
  async uncheck(id, dateStr) {
    const habit = await db.get(STORE, id);
    if (!habit || !habit.history || !habit.history[dateStr]) return habit;

    delete habit.history[dateStr];
    habit.streak = this._calcStreak(habit.history);
    await db.put(STORE, habit);
    eventBus.emit('habit:unchecked', { habit, date: dateStr });
    return habit;
  },

  /** 获取指定日期的打卡状态 */
  async getCheckIns(dateStr) {
    const habits = await this.getAll();
    return habits.map((h) => ({
      ...h,
      checked: h.history && h.history[dateStr],
      count: h.history?.[dateStr]?.count || 0,
    }));
  },

  /** 计算连续天数 */
  _calcStreak(history) {
    if (!history || Object.keys(history).length === 0) return 0;

    const dates = Object.keys(history).sort().reverse();
    let streak = 0;
    const todayDate = new Date(today());

    for (let i = 0; i < dates.length; i++) {
      const expected = new Date(todayDate);
      expected.setDate(todayDate.getDate() - i);
      const expectedStr = expected.toISOString().split('T')[0];

      if (dates[i] === expectedStr) {
        streak++;
      } else if (i === 0 && dates[0] < expectedStr) {
        // 今天还没打卡，从昨天开始算
        const yesterday = new Date(todayDate);
        yesterday.setDate(todayDate.getDate() - 1);
        if (dates[0] === yesterday.toISOString().split('T')[0]) {
          streak++;
          continue;
        }
        break;
      } else {
        break;
      }
    }
    return streak;
  },

  /** 检查勋章 */
  async _checkMedals(habit) {
    const medals = [];

    if (habit.streak >= 3 && !habit.medals?.find((m) => m.id === 'streak-3')) {
      medals.push({ id: 'streak-3', name: '三天坚持', description: '连续打卡3天', unlockedAt: now(), tier: 'bronze' });
    }
    if (habit.streak >= 7 && !habit.medals?.find((m) => m.id === 'streak-7')) {
      medals.push({ id: 'streak-7', name: '一周坚持', description: '连续打卡7天', unlockedAt: now(), tier: 'silver' });
    }
    if (habit.streak >= 30 && !habit.medals?.find((m) => m.id === 'streak-30')) {
      medals.push({ id: 'streak-30', name: '月度之星', description: '连续打卡30天', unlockedAt: now(), tier: 'gold' });
    }
    if (habit.streak >= 100 && !habit.medals?.find((m) => m.id === 'streak-100')) {
      medals.push({ id: 'streak-100', name: '百日传说', description: '连续打卡100天', unlockedAt: now(), tier: 'diamond' });
    }

    if (medals.length > 0) {
      habit.medals = [...(habit.medals || []), ...medals];
      await db.put(STORE, habit);
      for (const medal of medals) {
        eventBus.emit('medal:unlocked', { habit, medal });
      }
    }
  },
};
