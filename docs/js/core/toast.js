/* Toast 消息提示 */

let toastId = 0;

export function showToast(message, type = 'info', duration = 3000) {
  const container = document.getElementById('toast-container');
  if (!container) return;

  const id = ++toastId;
  const icons = { success: '✅', error: '❌', warning: '⚠️', info: 'ℹ️' };

  const toast = document.createElement('div');
  toast.className = `toast toast--${type}`;
  toast.innerHTML = `
    <span class="toast__icon">${icons[type] || icons.info}</span>
    <span class="toast__message">${message}</span>
    <span class="toast__close" data-toast="${id}">✕</span>
  `;

  // 关闭按钮
  toast.querySelector('.toast__close').addEventListener('click', () => removeToast(toast));

  container.appendChild(toast);

  // 自动移除
  if (duration > 0) {
    setTimeout(() => removeToast(toast), duration);
  }

  return { id, remove: () => removeToast(toast) };
}

function removeToast(toast) {
  toast.classList.add('toast--leaving');
  setTimeout(() => {
    if (toast.parentNode) toast.parentNode.removeChild(toast);
  }, 200);
}

/** 撤销栏 */
export function showUndo(message, onUndo, duration = 3000) {
  const bar = document.getElementById('undo-bar');
  const msg = document.getElementById('undo-message');
  const btn = document.getElementById('undo-btn');
  const close = document.getElementById('undo-close');
  if (!bar || !msg || !btn) return;

  msg.textContent = message;
  bar.classList.remove('hidden');

  let timer = setTimeout(hideUndo, duration);

  btn.onclick = () => {
    clearTimeout(timer);
    hideUndo();
    if (onUndo) onUndo();
  };

  close.onclick = () => {
    clearTimeout(timer);
    hideUndo();
  };

  function hideUndo() {
    bar.classList.add('hidden');
  }
}
