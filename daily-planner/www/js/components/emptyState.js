/* 空状态组件 */

export function renderEmptyState(container, { icon = '📝', title = '暂无数据', description = '', actionText = '', actionCallback = null } = {}) {
  if (!container) return;

  container.innerHTML = `
    <div class="empty-state fade-in">
      <div class="empty-state__icon">${icon}</div>
      <div class="empty-state__title">${title}</div>
      ${description ? `<div class="empty-state__description">${description}</div>` : ''}
      ${actionText ? `<button class="btn btn-primary empty-state__action">${actionText}</button>` : ''}
    </div>`;

  if (actionCallback && actionText) {
    container.querySelector('.empty-state__action').addEventListener('click', actionCallback);
  }
}
