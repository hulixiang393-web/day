/* 通知管理 */

import eventBus from '../core/eventBus.js';
import store from '../data/store.js';

let permissionGranted = false;

/** 请求通知权限 */
export async function requestPermission() {
  if (!('Notification' in window)) return false;

  if (Notification.permission === 'granted') {
    permissionGranted = true;
    return true;
  }

  const result = await Notification.requestPermission();
  permissionGranted = result === 'granted';
  return permissionGranted;
}

/** 发送通知 */
export function sendNotification(title, options = {}) {
  if (!permissionGranted || !('Notification' in window)) return null;

  // 检查静默时段
  if (isQuietHours()) return null;

  const defaults = {
    icon: 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><text y=".9em" font-size="90">🌸</text></svg>',
    badge: '🌸',
    tag: 'daily-planner',
    requireInteraction: false,
  };

  const notif = new Notification(title, { ...defaults, ...options });

  notif.onclick = () => {
    window.focus();
    notif.close();
  };

  return notif;
}

/** 调度提醒 */
export function scheduleReminder(task) {
  if (!task.dueDate || !task.reminders || task.reminders.length === 0) return [];

  const timers = [];

  for (const reminder of task.reminders) {
    const dueDateTime = new Date(task.dueDate);
    if (task.dueTime) {
      const [h, m] = task.dueTime.split(':').map(Number);
      dueDateTime.setHours(h, m, 0, 0);
    } else {
      dueDateTime.setHours(9, 0, 0, 0);
    }

    const notifyTime = new Date(dueDateTime.getTime() - reminder.minutes * 60 * 1000);
    const now = new Date();
    const delay = notifyTime.getTime() - now.getTime();

    if (delay <= 0) continue;

    const timer = setTimeout(() => {
      sendNotification(`⏰ ${task.title}`, {
        body: `将在 ${reminder.minutes} 分钟后到期${task.dueTime ? ` (${task.dueTime})` : ''}`,
        requireInteraction: true,
      });
      eventBus.emit('reminder:fired', { task, reminder });
    }, delay);

    timers.push(timer);
  }

  return timers;
}

/** 检查是否在静默时段 */
function isQuietHours() {
  const settings = store.getSettings();
  if (!settings.notifications || !settings.notifications.quietStart) return false;

  const now = new Date();
  const currentMinutes = now.getHours() * 60 + now.getMinutes();

  const [sh, sm] = (settings.notifications.quietStart || '22:00').split(':').map(Number);
  const [eh, em] = (settings.notifications.quietEnd || '08:00').split(':').map(Number);
  const quietStart = sh * 60 + sm;
  const quietEnd = eh * 60 + em;

  if (quietStart <= quietEnd) {
    return currentMinutes >= quietStart && currentMinutes < quietEnd;
  } else {
    return currentMinutes >= quietStart || currentMinutes < quietEnd;
  }
}

/** 检查逾期任务并提醒 */
export function checkOverdueTasks(tasks) {
  const today = new Date().toISOString().split('T')[0];
  const overdue = tasks.filter((t) => {
    if (!t.dueDate || t.status === 'completed' || t.status === 'cancelled') return false;
    return t.dueDate < today;
  });

  if (overdue.length > 0) {
    sendNotification(`⚠️ ${overdue.length} 个任务已逾期`, {
      body: overdue.map((t) => t.title).slice(0, 3).join('、') + (overdue.length > 3 ? `等${overdue.length}个任务` : ''),
    });
  }

  return overdue;
}

// 初始化
requestPermission().catch(() => {});
