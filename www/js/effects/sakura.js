/* 樱花飘落特效 */

export function initSakuraEffect() {
  const container = document.getElementById('effects-layer');
  if (!container) return;

  const petalCount = 20;
  const petals = [];

  for (let i = 0; i < petalCount; i++) {
    const petal = document.createElement('div');
    petal.className = 'sakura-petal';
    petal.innerHTML = Math.random() > 0.5 ? '🌸' : '💮';
    petal.style.cssText = `
      position: absolute;
      font-size: ${12 + Math.random() * 16}px;
      top: -20px;
      left: ${Math.random() * 100}%;
      opacity: ${0.3 + Math.random() * 0.5};
      animation: sakuraFall ${5 + Math.random() * 10}s linear infinite;
      animation-delay: ${Math.random() * 10}s;
      pointer-events: none;
    `;
    container.appendChild(petal);
    petals.push(petal);
  }

  // 添加 CSS 关键帧
  if (!document.getElementById('sakura-style')) {
    const style = document.createElement('style');
    style.id = 'sakura-style';
    style.textContent = `
      @keyframes sakuraFall {
        0% { transform: translateY(-20px) rotate(0deg) translateX(0); }
        25% { transform: translateY(25vh) rotate(90deg) translateX(30px); }
        50% { transform: translateY(50vh) rotate(200deg) translateX(-20px); }
        75% { transform: translateY(75vh) rotate(280deg) translateX(15px); }
        100% { transform: translateY(105vh) rotate(360deg) translateX(-10px); }
      }
    `;
    document.head.appendChild(style);
  }
}
