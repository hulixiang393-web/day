/* 密码认证模块 */

const PWD_KEY = 'dp_app_password';
const QUESTION_KEY = 'dp_app_question';
const ANSWER_KEY = 'dp_app_answer';
const SESSION_KEY = 'dp_app_session';
const ATTEMPT_KEY = 'dp_auth_attempts';
const LOCK_KEY = 'dp_auth_locked_until';
const MAX_ATTEMPTS = 5;
const LOCK_MINUTES = 5;
const SESSION_DAYS = 30;

/** 是否有密码 */
export function hasPassword() { return !!localStorage.getItem(PWD_KEY); }

/** 是否有安全问题 */
export function hasQuestion() { return !!localStorage.getItem(QUESTION_KEY); }

/** 获取安全问题 */
export function getQuestion() { return localStorage.getItem(QUESTION_KEY) || ''; }

/** 设置密码 + 安全问题 */
export async function setPassword(password, question, answer) {
  localStorage.setItem(PWD_KEY, await hashPassword(password));
  localStorage.setItem(QUESTION_KEY, question);
  localStorage.setItem(ANSWER_KEY, answer.toLowerCase().trim());
  clearAttempts();
  createSession();
}

/** 验证密码 */
export async function verifyPassword(password) {
  const stored = localStorage.getItem(PWD_KEY);
  if (!stored) return true;
  return (await hashPassword(password)) === stored;
}

/** 验证安全问题答案 */
export function verifyAnswer(answer) {
  const stored = localStorage.getItem(ANSWER_KEY);
  if (!stored) return true;
  return answer.toLowerCase().trim() === stored;
}

/** 重置密码（需先验证答案） */
export async function resetPassword(newPassword) {
  localStorage.setItem(PWD_KEY, await hashPassword(newPassword));
  clearAttempts();
  createSession();
}

/** 创建会话（30天有效） */
export function createSession() {
  const expiry = Date.now() + SESSION_DAYS * 24 * 60 * 60 * 1000;
  localStorage.setItem(SESSION_KEY, String(expiry));
}

/** 检查会话是否有效 */
export function hasValidSession() {
  const expiry = localStorage.getItem(SESSION_KEY);
  if (!expiry) return false;
  return Date.now() < parseInt(expiry);
}

/** 清除会话 */
export function clearSession() {
  localStorage.removeItem(SESSION_KEY);
}

/** 锁定相关 */
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
export function lockRemaining() {
  const until = localStorage.getItem(LOCK_KEY);
  return until ? Math.max(0, Math.ceil((parseInt(until) - Date.now()) / 1000)) : 0;
}
export function recordAttempt() {
  const n = parseInt(localStorage.getItem(ATTEMPT_KEY) || '0') + 1;
  localStorage.setItem(ATTEMPT_KEY, String(n));
  if (n >= MAX_ATTEMPTS) {
    localStorage.setItem(LOCK_KEY, String(Date.now() + LOCK_MINUTES * 60 * 1000));
  }
  return n;
}
export function remainingAttempts() {
  return Math.max(0, MAX_ATTEMPTS - parseInt(localStorage.getItem(ATTEMPT_KEY) || '0'));
}
export function clearAttempts() {
  localStorage.removeItem(ATTEMPT_KEY);
  localStorage.removeItem(LOCK_KEY);
}

async function hashPassword(p) {
  const d = new TextEncoder().encode(p + 'anime-planner');
  const h = await crypto.subtle.digest('SHA-256', d);
  return Array.from(new Uint8Array(h)).map(b => b.toString(16).padStart(2, '0')).join('');
}
