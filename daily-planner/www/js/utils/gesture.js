/* 移动端手势识别 */

/**
 * 检测滑动手势
 * @param {HTMLElement} el 元素
 * @param {Object} callbacks 回调 { onSwipeLeft, onSwipeRight, onSwipeUp, onSwipeDown }
 * @param {number} threshold 滑动阈值 (px)
 */
export function detectSwipe(el, callbacks = {}, threshold = 50) {
  let startX = 0, startY = 0;
  let tracking = false;

  el.addEventListener('touchstart', (e) => {
    startX = e.touches[0].clientX;
    startY = e.touches[0].clientY;
    tracking = true;
  }, { passive: true });

  el.addEventListener('touchend', (e) => {
    if (!tracking) return;
    tracking = false;

    const dx = e.changedTouches[0].clientX - startX;
    const dy = e.changedTouches[0].clientY - startY;

    if (Math.abs(dx) > Math.abs(dy)) {
      // 水平滑动
      if (Math.abs(dx) > threshold) {
        if (dx < 0 && callbacks.onSwipeLeft) callbacks.onSwipeLeft();
        if (dx > 0 && callbacks.onSwipeRight) callbacks.onSwipeRight();
      }
    } else {
      // 垂直滑动
      if (Math.abs(dy) > threshold) {
        if (dy < 0 && callbacks.onSwipeUp) callbacks.onSwipeUp();
        if (dy > 0 && callbacks.onSwipeDown) callbacks.onSwipeDown();
      }
    }
  });
}

/**
 * 下拉刷新
 */
export function enablePullToRefresh(el, onRefresh) {
  let startY = 0;
  let pulling = false;
  let indicator = null;

  el.addEventListener('touchstart', (e) => {
    if (el.scrollTop <= 0) {
      startY = e.touches[0].clientY;
      pulling = true;
    }
  }, { passive: true });

  el.addEventListener('touchmove', (e) => {
    if (!pulling) return;
    const dy = e.touches[0].clientY - startY;
    if (dy > 50) {
      if (!indicator) {
        indicator = document.createElement('div');
        indicator.className = 'pull-indicator';
        indicator.textContent = '⬇️ 释放刷新';
        indicator.style.cssText = 'text-align:center;padding:12px;color:var(--color-primary);font-weight:600';
        el.prepend(indicator);
      }
      if (dy > 100) {
        indicator.textContent = '✨ 释放以刷新';
      }
    }
  }, { passive: true });

  el.addEventListener('touchend', () => {
    if (!pulling) return;
    pulling = false;

    if (indicator) {
      const dy = 0; // touchend 无坐标
      indicator.textContent = '🔄 刷新中...';
      if (onRefresh) {
        Promise.resolve(onRefresh()).finally(() => {
          indicator?.remove();
          indicator = null;
        });
      } else {
        setTimeout(() => { indicator?.remove(); indicator = null; }, 500);
      }
    }
  });
}

/**
 * 长按事件
 */
export function detectLongPress(el, callback, duration = 500) {
  let timer = null;

  el.addEventListener('pointerdown', (e) => {
    timer = setTimeout(() => {
      callback(e);
    }, duration);
  });

  el.addEventListener('pointerup', () => clearTimeout(timer));
  el.addEventListener('pointercancel', () => clearTimeout(timer));
  el.addEventListener('pointermove', () => clearTimeout(timer));
}
