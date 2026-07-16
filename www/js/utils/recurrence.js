/* 重复任务计算 */

import { formatDate, addDays } from '../core/utils.js';

/**
 * 根据重复规则计算下一次任务日期
 * @param {Date} fromDate 起始日期
 * @param {Object} rule 重复规则
 * @returns {string|null} 下一个日期 YYYY-MM-DD
 */
export function getNextDate(fromDate, rule) {
  if (!rule || rule.type === 'none') return null;

  const d = new Date(fromDate);

  switch (rule.type) {
    case 'daily':
      d.setDate(d.getDate() + (rule.interval || 1));
      break;

    case 'weekly': {
      const interval = rule.interval || 1;
      if (rule.daysOfWeek && rule.daysOfWeek.length > 0) {
        // 在指定星期中找下一个
        const currentDay = d.getDay();
        const sorted = [...rule.daysOfWeek].sort((a, b) => a - b);
        let found = false;
        // 本周剩余的
        for (const day of sorted) {
          if (day > currentDay) { d.setDate(d.getDate() + (day - currentDay)); found = true; break; }
        }
        if (!found) {
          // 下周第一个
          const nextDay = sorted[0];
          d.setDate(d.getDate() + (7 - currentDay) + nextDay);
        }
      } else {
        d.setDate(d.getDate() + 7 * interval);
      }
      break;
    }

    case 'monthly': {
      const interval = rule.interval || 1;
      if (rule.daysOfMonth && rule.daysOfMonth.length > 0) {
        const currentDay = d.getDate();
        const sorted = [...rule.daysOfMonth].sort((a, b) => a - b);
        let found = false;
        for (const day of sorted) {
          if (day > currentDay) {
            d.setDate(Math.min(day, new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate()));
            found = true;
            break;
          }
        }
        if (!found) {
          d.setMonth(d.getMonth() + interval);
          d.setDate(Math.min(sorted[0], new Date(d.getFullYear(), d.getMonth(), 0).getDate()));
        }
      } else {
        d.setMonth(d.getMonth() + interval);
      }
      break;
    }

    case 'yearly':
      d.setFullYear(d.getFullYear() + 1);
      break;

    case 'weekdays':
      d.setDate(d.getDate() + 1);
      while (d.getDay() === 0 || d.getDay() === 6) d.setDate(d.getDate() + 1);
      break;

    case 'interval':
      d.setDate(d.getDate() + (rule.interval || 1));
      break;

    default:
      return null;
  }

  const result = formatDate(d);

  // 检查是否超出结束日期
  if (rule.endDate && result > rule.endDate) return null;
  // 检查是否超出次数限制
  if (rule.endAfterCount) {
    // 调用方维护计数
  }

  return result;
}

/**
 * 展开重复任务实例
 * @param {Object} task 任务对象
 * @param {string} fromDate 起始日期
 * @param {string} toDate 结束日期
 * @returns {Array} 任务实例数组
 */
export function expandRecurrence(task, fromDate, toDate) {
  if (!task.repeatRule || task.repeatRule.type === 'none') return [];
  const baseDate = task.startDate || task.endDate;
  if (!baseDate) return [];

  const instances = [];
  let cursor = baseDate;
  let count = 0;
  const maxInstances = 365; // 安全上限

  while (cursor <= toDate && count < maxInstances) {
    if (cursor >= fromDate) {
      instances.push({
        ...task,
        startDate: task.startDate ? cursor : null,
        endDate: task.endDate || cursor,
        _isRecurrence: true,
        _originalId: task.id,
      });
    }
    const next = getNextDate(new Date(cursor), task.repeatRule);
    if (!next || next === cursor) break;
    cursor = next;
    count++;
  }

  return instances;
}

/** 获取重复规则描述文本 */
export function getRecurrenceLabel(rule) {
  if (!rule || rule.type === 'none') return '不重复';

  const labels = {
    daily: '每天',
    weekly: '每周',
    monthly: '每月',
    yearly: '每年',
    weekdays: '工作日',
    interval: `每${rule.interval || 0}天`,
    custom: '自定义',
  };

  let label = labels[rule.type] || '自定义';

  if (rule.type === 'weekly' && rule.daysOfWeek && rule.daysOfWeek.length > 0) {
    const dayNames = ['日', '一', '二', '三', '四', '五', '六'];
    label += ' (' + rule.daysOfWeek.map((d) => '周' + dayNames[d]).join(', ') + ')';
  }

  if (rule.interval && rule.interval > 1 && rule.type !== 'interval') {
    label = `每${rule.interval}${label.charAt(label.length - 1)}`;
  }

  if (rule.endDate) {
    label += ` · 至${rule.endDate}`;
  }

  return label;
}
