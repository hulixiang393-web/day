/* 星光完成特效 */

import eventBus from '../core/eventBus.js';

export function initSparkleEffect() {
  eventBus.on('task:completed', (task) => {
    showSparkles(task);
  });

  eventBus.on('habit:checked-in', () => {
    showSparkles(null);
  });
}

function showSparkles(task) {
  const container = document.getElementById('effects-layer');
  if (!container) return;

  const centerX = task ? window.innerWidth * 0.5 : window.innerWidth * 0.7;
  const centerY = task ? window.innerHeight * 0.3 : window.innerHeight * 0.5;

  const emojis = ['✨', '⭐', '💫', '🌟', '💖', '🎉', '🌸'];

  for (let i = 0; i < 12; i++) {
    const particle = document.createElement('div');
    particle.textContent = emojis[Math.floor(Math.random() * emojis.length)];
    particle.style.cssText = `
      position: fixed;
      font-size: ${14 + Math.random() * 20}px;
      left: ${centerX + (Math.random() - 0.5) * 200}px;
      top: ${centerY + (Math.random() - 0.5) * 150}px;
      pointer-events: none;
      z-index: 9999;
      animation: sparkleBurst ${0.6 + Math.random() * 0.8}s ease-out forwards;
      animation-delay: ${Math.random() * 0.15}s;
    `;
    container.appendChild(particle);

    // 动画结束后移除
    setTimeout(() => {
      if (particle.parentNode) particle.parentNode.removeChild(particle);
    }, 1500);
  }

  // 添加 CSS
  if (!document.getElementById('sparkle-style')) {
    const style = document.createElement('style');
    style.id = 'sparkle-style';
    style.textContent = `
      @keyframes sparkleBurst {
        0% { transform: translate(0, 0) scale(0); opacity: 1; }
        50% { transform: translate(${50 + Math.random() * 50}px, ${-50 - Math.random() * 80}px) scale(1.5); opacity: 0.8; }
        100% { transform: translate(${100 + Math.random() * 100}px, ${50 + Math.random() * 100}px) scale(0); opacity: 0; }
      }
    `;
    document.head.appendChild(style);
  }
}
