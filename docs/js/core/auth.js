/* 密码认证模块 — 安全加固版 */

const K = (s) => 'dp2_' + s;
const PWD = K('pwd'), QUES = K('ques'), ANS = K('ans');
const SESS = K('sess'), SESS_ID = K('sid');
const AT_PWD = K('at_pwd'), LOCK_PWD = K('lock_pwd');
const AT_ANS = K('at_ans'), LOCK_ANS = K('lock_ans');

const MAX_TRY = 5, LOCK_SEC = 300;        // 密码：5次锁定5分钟
const MAX_TRY_ANS = 3, LOCK_ANS_SEC = 900; // 安全问题：3次锁定15分钟
const SESSION_DAYS = 30;

// ====== 密码 ======

export function hasPassword() { return !!localStorage.getItem(PWD); }

export async function setPassword(password) {
  localStorage.setItem(PWD, await hash(password));
}
export async function verifyPassword(password) {
  const stored = localStorage.getItem(PWD);
  if (!stored) return false;
  return timingSafeEqual(await hash(password), stored);
}

// ====== 安全问题 ======

export function hasQuestion() { return !!localStorage.getItem(QUES); }
export function getQuestion() { return localStorage.getItem(QUES) || ''; }
export async function setQuestion(question, answer) {
  localStorage.setItem(QUES, sanitize(question));
  localStorage.setItem(ANS, await hash(answer.toLowerCase().trim()));
}
export async function verifyAnswer(answer) {
  const stored = localStorage.getItem(ANS);
  if (!stored) return false; // 没有设置答案 → 拒绝
  return timingSafeEqual(await hash(answer.toLowerCase().trim()), stored);
}

// ====== 会话（30天自动过期） ======

export function createSession() {
  const id = randomToken(32);
  const expiry = Date.now() + SESSION_DAYS * 86400000;
  localStorage.setItem(SESS, String(expiry));
  localStorage.setItem(SESS_ID, id + '|' + String(expiry));
}
export function hasValidSession() {
  const exp = localStorage.getItem(SESS);
  const sid = localStorage.getItem(SESS_ID);
  if (!exp || !sid) return false;
  const parts = sid.split('|');
  if (parts.length !== 2) return false;
  if (Date.now() >= parseInt(exp)) { clearSession(); return false; }
  // 验证 token 完整性（防篡改）
  if (parts[1] !== exp) { clearSession(); return false; }
  return true;
}
export function clearSession() {
  localStorage.removeItem(SESS);
  localStorage.removeItem(SESS_ID);
}

// ====== 密码锁定 ======

export function isLocked() {
  const until = parseInt(localStorage.getItem(LOCK_PWD) || '0');
  if (!until) return false;
  if (Date.now() >= until) { localStorage.removeItem(LOCK_PWD); resetPwdAttempts(); return false; }
  return true;
}
export function lockSeconds() {
  return Math.max(0, Math.ceil((parseInt(localStorage.getItem(LOCK_PWD) || '0') - Date.now()) / 1000));
}
export function recordPwdAttempt() {
  const n = Math.min(MAX_TRY, parseInt(localStorage.getItem(AT_PWD) || '0') + 1);
  localStorage.setItem(AT_PWD, String(n));
  if (n >= MAX_TRY) localStorage.setItem(LOCK_PWD, String(Date.now() + LOCK_SEC * 1000));
  return n;
}
export function remainingPwd() { return Math.max(0, MAX_TRY - parseInt(localStorage.getItem(AT_PWD) || '0')); }
export function resetPwdAttempts() { localStorage.removeItem(AT_PWD); localStorage.removeItem(LOCK_PWD); }

// ====== 安全问题锁定（独立计数，不因点"忘记密码"而重置） ======

export function isAnsLocked() {
  const until = parseInt(localStorage.getItem(LOCK_ANS) || '0');
  if (!until) return false;
  if (Date.now() >= until) { localStorage.removeItem(LOCK_ANS); resetAnsAttempts(); return false; }
  return true;
}
export function ansLockSeconds() {
  return Math.max(0, Math.ceil((parseInt(localStorage.getItem(LOCK_ANS) || '0') - Date.now()) / 1000));
}
export function recordAnsAttempt() {
  const n = Math.min(MAX_TRY_ANS, parseInt(localStorage.getItem(AT_ANS) || '0') + 1);
  localStorage.setItem(AT_ANS, String(n));
  if (n >= MAX_TRY_ANS) localStorage.setItem(LOCK_ANS, String(Date.now() + LOCK_ANS_SEC * 1000));
  return n;
}
export function remainingAns() { return Math.max(0, MAX_TRY_ANS - parseInt(localStorage.getItem(AT_ANS) || '0')); }
export function resetAnsAttempts() { localStorage.removeItem(AT_ANS); localStorage.removeItem(LOCK_ANS); }

// ====== 工具 ======

async function hash(p) {
  const d = new TextEncoder().encode(p + ':anime-planner-v2:');
  const h = await crypto.subtle.digest('SHA-256', d);
  return Array.from(new Uint8Array(h)).map(b => b.toString(16).padStart(2, '0')).join('');
}

/** 时间恒定比较（防时序攻击） */
function timingSafeEqual(a, b) {
  if (a.length !== b.length) { let r = 0; for (let i = 0; i < a.length; i++) r |= a.charCodeAt(i) ^ 0; return false; }
  let r = 0;
  for (let i = 0; i < a.length; i++) r |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return r === 0;
}

function randomToken(len) {
  const arr = new Uint8Array(len);
  crypto.getRandomValues(arr);
  return Array.from(arr, b => b.toString(16).padStart(2, '0')).join('');
}

/** 过滤敏感字符（防 XSS） */
function sanitize(s) {
  return String(s).replace(/[<>&"']/g, '').substring(0, 200);
}
