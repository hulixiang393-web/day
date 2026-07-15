/* 数据统计视图 */

import { TaskModel } from '../data/models/task.js';
import { HabitModel } from '../data/models/habit.js';
import { today, formatDate } from '../core/utils.js';

export class StatsView {
  constructor(container) {
    this.container = container;
  }

  async render() {
    const todayStr = today();
    const weekAgo = new Date();
    weekAgo.setDate(weekAgo.getDate() - 7);
    const weekAgoStr = formatDate(weekAgo);

    const weekStats = await TaskModel.getStats(weekAgoStr, todayStr);
    const allTasks = await TaskModel.getAll();
    const habits = await HabitModel.getAll();

    // 分类统计
    const categoryStats = {};
    for (const t of allTasks) {
      const cat = t.categoryId || '未分类';
      if (!categoryStats[cat]) categoryStats[cat] = { total: 0, completed: 0 };
      categoryStats[cat].total++;
      if (t.status === 'completed') categoryStats[cat].completed++;
    }

    // 优先级统计
    const priorityStats = { 0: 0, 1: 0, 2: 0, 3: 0 };
    for (const t of allTasks) {
      priorityStats[t.priority] = (priorityStats[t.priority] || 0) + 1;
    }

    const totalHabits = habits.length;
    const checkedToday = habits.filter((h) => h.history?.[todayStr]).length;
    const totalStreak = habits.reduce((s, h) => s + (h.streak || 0), 0);

    this.container.innerHTML = `
      <div class="stats-view fade-in">
        <div class="calendar-nav">
          <h2 class="h2">📊 数据统计</h2>
        </div>

        <!-- 概览卡片 -->
        <div class="grid grid-cols-4 gap-3 mb-5" id="stats-overview">
          <div class="card text-center">
            <div class="text-3xl font-bold" style="color:var(--color-primary)">${allTasks.length}</div>
            <div class="text-sm text-secondary">总任务数</div>
          </div>
          <div class="card text-center">
            <div class="text-3xl font-bold" style="color:var(--color-success)">${weekStats.completionRate}%</div>
            <div class="text-sm text-secondary">周完成率</div>
          </div>
          <div class="card text-center">
            <div class="text-3xl font-bold" style="color:var(--color-warning)">${weekStats.overdue}</div>
            <div class="text-sm text-secondary">逾期任务</div>
          </div>
          <div class="card text-center">
            <div class="text-3xl font-bold" style="color:var(--color-info)">${totalStreak}</div>
            <div class="text-sm text-secondary">总打卡天数</div>
          </div>
        </div>

        <div class="grid grid-cols-2 gap-4">
          <!-- 本周统计 -->
          <div class="card">
            <h4 class="card-title mb-3">📈 本周任务统计</h4>
            <div class="flex items-center justify-between mb-2">
              <span class="text-sm text-secondary">总任务</span>
              <span class="font-semibold">${weekStats.total}</span>
            </div>
            <div class="flex items-center justify-between mb-2">
              <span class="text-sm text-secondary">已完成</span>
              <span class="font-semibold" style="color:var(--color-success)">${weekStats.completed}</span>
            </div>
            <div class="flex items-center justify-between mb-2">
              <span class="text-sm text-secondary">进行中</span>
              <span class="font-semibold" style="color:var(--color-info)">${weekStats.inProgress}</span>
            </div>
            <div class="flex items-center justify-between mb-2">
              <span class="text-sm text-secondary">逾期</span>
              <span class="font-semibold" style="color:var(--color-overdue)">${weekStats.overdue}</span>
            </div>
            <!-- 简易完成率进度条 -->
            <div style="background:var(--border-color);border-radius:4px;height:8px;margin-top:8px">
              <div style="background:linear-gradient(90deg,var(--color-primary),var(--color-success));height:100%;border-radius:4px;width:${weekStats.completionRate}%;transition:width 0.5s"></div>
            </div>
          </div>

          <!-- 习惯统计 -->
          <div class="card">
            <h4 class="card-title mb-3">🔥 习惯打卡</h4>
            <div class="flex items-center justify-between mb-2">
              <span class="text-sm text-secondary">追踪习惯</span>
              <span class="font-semibold">${totalHabits}</span>
            </div>
            <div class="flex items-center justify-between mb-2">
              <span class="text-sm text-secondary">今日打卡</span>
              <span class="font-semibold" style="color:var(--color-success)">${checkedToday}/${totalHabits}</span>
            </div>
            <div class="flex items-center justify-between mb-2">
              <span class="text-sm text-secondary">总连续天数</span>
              <span class="font-semibold" style="color:var(--color-primary)">${totalStreak}</span>
            </div>
          </div>
        </div>

        <!-- 优先级分布 -->
        <div class="card mt-4">
          <h4 class="card-title mb-3">🎯 优先级分布</h4>
          <div class="flex items-center gap-3" style="height:40px">
            ${['低', '中', '高', '紧急'].map((label, i) => {
              const total = allTasks.length || 1;
              const pct = Math.round((priorityStats[i] || 0) / total * 100);
              const colors = ['var(--priority-low)', 'var(--priority-normal)', 'var(--priority-high)', 'var(--priority-urgent)'];
              return `<div style="flex:${priorityStats[i] || 1};background:${colors[i]};height:100%;border-radius:4px;display:flex;align-items:center;justify-content:center;color:#fff;font-size:12px;font-weight:600;min-width:40px">${label} ${pct}%</div>`;
            }).join('')}
          </div>
        </div>
      </div>`;
  }
}
