/* 密码认证模块 */

const STORAGE_KEY = 'dp_app_password';

/** 检查是否已设置密码 */
export function hasPassword() {
  return !!localStorage.getItem(STORAGE_KEY);
}

/** 设置新密码 */
export async function setPassword(password) {
  const hash = await hashPassword(password);
  localStorage.setItem(STORAGE_KEY, hash);
  return true;
}

/** 验证密码 */
export async function verifyPassword(password) {
  const stored = localStorage.getItem(STORAGE_KEY);
  if (!stored) return true; // 未设置密码，允许进入
  const hash = await hashPassword(password);
  return hash === stored;
}

/** 修改密码 */
export async function changePassword(oldPassword, newPassword) {
  const ok = await verifyPassword(oldPassword);
  if (!ok) return false;
  return setPassword(newPassword);
}

/** 移除密码 */
export function removePassword() {
  localStorage.removeItem(STORAGE_KEY);
}

async function hashPassword(password) {
  const encoder = new TextEncoder();
  const data = encoder.encode(password + 'anime-planner-salt');
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}
