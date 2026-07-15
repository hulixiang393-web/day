/* 工具函数库 */

/** 生成 UUID v4 */
export function generateId() {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

/** 获取当前 ISO 时间戳 */
export function now() {
  return new Date().toISOString();
}

/** 格式化日期 */
export function formatDate(date, format = 'YYYY-MM-DD') {
  if (!date) return '';
  const d = typeof date === 'string' ? new Date(date) : date;
  if (isNaN(d.getTime())) return '';

  const pad = (n) => String(n).padStart(2, '0');
  const map = {
    YYYY: d.getFullYear(),
    MM: pad(d.getMonth() + 1),
    DD: pad(d.getDate()),
    HH: pad(d.getHours()),
    mm: pad(d.getMinutes()),
    ss: pad(d.getSeconds()),
    M: d.getMonth() + 1,
    D: d.getDate(),
  };

  return format.replace(/YYYY|MM|DD|HH|mm|ss|M|D/g, (m) => map[m]);
}

/** 格式化时间 */
export function formatTime(date) {
  return formatDate(date, 'HH:mm');
}

/** 今天日期字符串 */
export function today() {
  return formatDate(new Date());
}

/** 判断是否逾期 */
export function isOverdue(task) {
  if (!task.dueDate || task.status === 'completed' || task.status === 'cancelled') return false;
  const now = new Date();
  const due = new Date(task.dueDate);
  if (task.dueTime) {
    const [h, m] = task.dueTime.split(':').map(Number);
    due.setHours(h, m, 0, 0);
  } else {
    due.setHours(23, 59, 59, 999);
  }
  return due < now;
}

/** 判断是否是今天 */
export function isToday(dateStr) {
  return formatDate(new Date()) === formatDate(dateStr);
}

/** 判断是否是本周 */
export function isThisWeek(dateStr) {
  const d = new Date(dateStr);
  const now = new Date();
  const weekStart = new Date(now);
  weekStart.setDate(now.getDate() - now.getDay());
  weekStart.setHours(0, 0, 0, 0);
  const weekEnd = new Date(weekStart);
  weekEnd.setDate(weekStart.getDate() + 7);
  return d >= weekStart && d < weekEnd;
}

/** 防抖 */
export function debounce(fn, delay = 300) {
  let timer;
  return function (...args) {
    clearTimeout(timer);
    timer = setTimeout(() => fn.apply(this, args), delay);
  };
}

/** 节流 */
export function throttle(fn, delay = 100) {
  let last = 0;
  return function (...args) {
    const now = Date.now();
    if (now - last >= delay) {
      last = now;
      fn.apply(this, args);
    }
  };
}

/** 深拷贝 */
export function deepClone(obj) {
  if (obj === null || typeof obj !== 'object') return obj;
  if (obj instanceof Date) return new Date(obj);
  if (obj instanceof Array) return obj.map(deepClone);
  const cloned = {};
  for (const key in obj) {
    if (Object.prototype.hasOwnProperty.call(obj, key)) {
      cloned[key] = deepClone(obj[key]);
    }
  }
  return cloned;
}

/** HTML 转义 */
export function escapeHTML(str) {
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}

/** 获取日期所在周的起始日期 */
export function getWeekStart(date) {
  const d = new Date(date);
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1); // 周一为起始
  d.setDate(diff);
  d.setHours(0, 0, 0, 0);
  return d;
}

/** 获取日期所在周的每一天 */
export function getWeekDays(date) {
  const start = getWeekStart(date);
  const days = [];
  for (let i = 0; i < 7; i++) {
    const d = new Date(start);
    d.setDate(start.getDate() + i);
    days.push(formatDate(d));
  }
  return days;
}

/** 获取月份的日历网格 (6行7列) */
export function getMonthGrid(year, month) {
  const firstDay = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0);
  const startDay = firstDay.getDay(); // 0=Sun

  const grid = [];
  const totalDays = lastDay.getDate();
  const prevMonthLastDay = new Date(year, month, 0).getDate();

  let day = 1;
  let nextMonthDay = 1;
  let prevMonthDay = prevMonthLastDay - startDay + 1;

  for (let row = 0; row < 6; row++) {
    const week = [];
    for (let col = 0; col < 7; col++) {
      if (row === 0 && col < startDay) {
        // 上月
        const date = new Date(year, month - 1, prevMonthDay);
        week.push({ date: formatDate(date), day: prevMonthDay, isOtherMonth: true });
        prevMonthDay++;
      } else if (day > totalDays) {
        // 下月
        const date = new Date(year, month + 1, nextMonthDay);
        week.push({ date: formatDate(date), day: nextMonthDay, isOtherMonth: true });
        nextMonthDay++;
      } else {
        const date = new Date(year, month, day);
        week.push({ date: formatDate(date), day, isOtherMonth: false });
        day++;
      }
    }
    grid.push(week);
    if (day > totalDays) break;
  }

  return grid;
}

/** 解析日期字符串为 Date */
export function parseDate(str) {
  if (!str) return null;
  const d = new Date(str);
  return isNaN(d.getTime()) ? null : d;
}

/** 比较两个日期 */
export function compareDates(a, b) {
  const da = parseDate(a);
  const db = parseDate(b);
  if (!da || !db) return 0;
  return da - db;
}

/** 添加天数 */
export function addDays(dateStr, days) {
  const d = new Date(dateStr);
  d.setDate(d.getDate() + days);
  return formatDate(d);
}

/** 日期本地化显示 */
export function dateLabel(dateStr) {
  if (!dateStr) return '';
  if (isToday(dateStr)) return '今天';
  const tomorrow = addDays(today(), 1);
  if (dateStr === tomorrow) return '明天';
  const yesterday = addDays(today(), -1);
  if (dateStr === yesterday) return '昨天';
  return formatDate(dateStr, 'M月D日');
}

/** 优先级名称映射 */
export const PRIORITY_MAP = {
  0: { label: '普通', cssClass: 'low', emoji: '🟢' },
  1: { label: '重要', cssClass: 'normal', emoji: '🔵' },
  2: { label: '紧急', cssClass: 'high', emoji: '🟠' },
  3: { label: '极致重要', cssClass: 'urgent', emoji: '🔴' },
};

/** 状态名称映射 */
export const STATUS_MAP = {
  'pending': { label: '未开始', emoji: '⏳' },
  'in_progress': { label: '进行中', emoji: '🔄' },
  'completed': { label: '已完成', emoji: '✅' },
  'overdue': { label: '已逾期', emoji: '⚠️' },
  'cancelled': { label: '已取消', emoji: '❌' },
};

/** 星期名称 */
export const DAY_NAMES = ['日', '一', '二', '三', '四', '五', '六'];
export const DAY_NAMES_FULL = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'];
