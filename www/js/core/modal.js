/* 弹窗管理器 */

export function openModal(title, content, options = {}) {
  const overlay = document.getElementById('modal-overlay');
  const container = document.getElementById('modal-container');
  if (!overlay || !container) return { close: () => {} };

  const { footer = '', onClose, wide = false } = options;

  container.innerHTML = `
    <div class="modal-header">
      <h2 class="modal-title">${title}</h2>
      <button class="btn-icon modal-close-btn" aria-label="关闭">✕</button>
    </div>
    <div class="modal-body">${content}</div>
    ${footer ? `<div class="modal-footer">${footer}</div>` : ''}
  `;

  if (wide) {
    container.style.maxWidth = '720px';
  } else {
    container.style.maxWidth = '';
  }

  overlay.classList.remove('hidden');

  const close = () => {
    overlay.classList.add('hidden');
    container.innerHTML = '';
    if (onClose) onClose();
  };

  // 关闭按钮
  const closeBtn = container.querySelector('.modal-close-btn');
  if (closeBtn) closeBtn.addEventListener('click', close);

  // 点击遮罩关闭
  overlay.addEventListener('click', (e) => {
    if (e.target === overlay) close();
  });

  // ESC 关闭
  const escHandler = (e) => {
    if (e.key === 'Escape') { close(); document.removeEventListener('keydown', escHandler); }
  };
  document.addEventListener('keydown', escHandler);

  return { close, container };
}

/** 确认对话框 */
export function confirmDialog(title, message, { confirmText = '确认', cancelText = '取消', danger = false } = {}) {
  return new Promise((resolve) => {
    const footer = `
      <button class="btn btn-secondary modal-cancel-btn">${cancelText}</button>
      <button class="btn ${danger ? 'btn-danger' : 'btn-primary'} modal-confirm-btn">${confirmText}</button>
    `;
    const { close, container } = openModal(title, `<p>${message}</p>`, { footer });

    container.querySelector('.modal-cancel-btn').addEventListener('click', () => { close(); resolve(false); });
    container.querySelector('.modal-confirm-btn').addEventListener('click', () => { close(); resolve(true); });
  });
}
