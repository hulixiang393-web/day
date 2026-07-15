/* 粒子效果系统 */

export function emitParticles(x, y, options = {}) {
  const container = document.getElementById('effects-layer');
  if (!container) return;

  const {
    count = 10,
    colors = ['#FF7EB3', '#7EC8FF', '#FFB347', '#C586FF'],
    size = { min: 4, max: 10 },
    lifetime = { min: 600, max: 1200 },
    spread = { x: 80, y: 80 },
  } = options;

  for (let i = 0; i < count; i++) {
    const particle = document.createElement('div');
    const color = colors[Math.floor(Math.random() * colors.length)];
    const s = size.min + Math.random() * (size.max - size.min);
    const life = lifetime.min + Math.random() * (lifetime.max - lifetime.min);

    particle.style.cssText = `
      position: fixed;
      width: ${s}px;
      height: ${s}px;
      background: ${color};
      border-radius: 50%;
      left: ${x}px;
      top: ${y}px;
      pointer-events: none;
      z-index: 9999;
      box-shadow: 0 0 ${s * 2}px ${color};
      animation: particleFly ${life}ms ease-out forwards;
    `;
    container.appendChild(particle);

    // 随机方向
    const angle = Math.random() * Math.PI * 2;
    const distance = 20 + Math.random() * spread.x;
    const dx = Math.cos(angle) * distance;
    const dy = Math.sin(angle) * distance - 30;

    // 动态设置关键帧 (每个粒子不同方向)
    const animName = `particleFly${Date.now()}${i}`;
    const keyframes = `
      @keyframes ${animName} {
        0% { transform: translate(0, 0) scale(1); opacity: 1; }
        50% { transform: translate(${dx * 0.5}px, ${dy * 0.5}px) scale(1.5); opacity: 0.7; }
        100% { transform: translate(${dx}px, ${dy}px) scale(0); opacity: 0; }
      }
    `;

    const styleEl = document.createElement('style');
    styleEl.textContent = keyframes;
    document.head.appendChild(styleEl);
    particle.style.animationName = animName;

    setTimeout(() => {
      if (particle.parentNode) particle.parentNode.removeChild(particle);
      if (styleEl.parentNode) styleEl.parentNode.removeChild(styleEl);
    }, life + 50);
  }
}
