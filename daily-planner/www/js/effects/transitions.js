/* 页面过渡动画 */

export function pageTransition(fromView, toView, callback) {
  const container = document.getElementById('view-container');
  if (!container) {
    callback();
    return;
  }

  // 淡出当前内容
  container.style.opacity = '0';
  container.style.transform = 'translateY(10px)';
  container.style.transition = 'opacity 200ms ease-out, transform 200ms ease-out';

  setTimeout(() => {
    callback();

    // 淡入新内容
    container.style.opacity = '1';
    container.style.transform = 'translateY(0)';

    // 清理 transition
    setTimeout(() => {
      container.style.transition = '';
    }, 250);
  }, 200);
}

/** 列表项交错进入动画 */
export function staggerIn(container, delay = 50) {
  const items = container.children;
  Array.from(items).forEach((item, i) => {
    item.style.opacity = '0';
    item.style.transform = 'translateY(12px)';
    item.style.transition = `opacity 300ms ease-out ${i * delay}ms, transform 300ms ease-out ${i * delay}ms`;

    requestAnimationFrame(() => {
      item.style.opacity = '1';
      item.style.transform = 'translateY(0)';
    });
  });
}
