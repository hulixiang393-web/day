/* 密码认证模块 */

const STORAGE_KEY = 'dp_app_password';
const ATTEMPT_KEY = 'dp_auth_attempts';
const LOCK_KEY = 'dp_auth_locked_until';
const MAX_ATTEMPTS = 5;
const LOCK_DURATION = 5 * 60 * 1000; // 锁定 5 分钟

/** 检查是否已设置密码 */
export function hasPassword() {
  return !!localStorage.getItem(STORAGE_KEY);
}

/** 设置新密码 */
export async function setPassword(password) {
  const hash = await hashPassword(password);
  localStorage.setItem(STORAGE_KEY, hash);
  clearAttempts();
  return true;
}

/** 验证密码 */
export async function verifyPassword(password) {
  const stored = localStorage.getItem(STORAGE_KEY);
  if (!stored) return true;
  const hash = await hashPassword(password);
  return hash === stored;
}

/** 检查是否被锁定 */
export function isLocked() {
  const until = localStorage.getItem(LOCK_KEY);
  if (!until) return false;
  if (Date.now() > parseInt(until)) {
    localStorage.removeItem(LOCK_KEY);
    clearAttempts();
    return false;
  }
  return true;
}

/** 获取剩余锁定时间（秒） */
export function lockRemaining() {
  const until = localStorage.getItem(LOCK_KEY);
  if (!until) return 0;
  return Math.max(0, Math.ceil((parseInt(until) - Date.now()) / 1000));
}

/** 记录失败尝试 */
export function recordAttempt() {
  const n = parseInt(localStorage.getItem(ATTEMPT_KEY) || '0') + 1;
  localStorage.setItem(ATTEMPT_KEY, String(n));
  if (n >= MAX_ATTEMPTS) {
    localStorage.setItem(LOCK_KEY, String(Date.now() + LOCK_DURATION));
  }
  return n;
}

/** 获取剩余尝试次数 */
export function remainingAttempts() {
  return Math.max(0, MAX_ATTEMPTS - parseInt(localStorage.getItem(ATTEMPT_KEY) || '0'));
}

/** 清除尝试记录 */
export function clearAttempts() {
  localStorage.removeItem(ATTEMPT_KEY);
  localStorage.removeItem(LOCK_KEY);
}

/** 移除密码（重置） */
export function removePassword() {
  localStorage.removeItem(STORAGE_KEY);
  clearAttempts();
}

async function hashPassword(password) {
  const encoder = new TextEncoder();
  const data = encoder.encode(password + 'anime-planner-salt');
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}
