/* 交互式看板娘 */

import eventBus from '../core/eventBus.js';
import store from '../data/store.js';

const CHARACTERS = {
  neko: { emoji: '🐱', name: '小喵' },
  shiba: { emoji: '🐕', name: '小柴' },
  kitsune: { emoji: '🦊', name: '小狐' },
};

const SPEECHES = {
  morning: ['早上好！今天也要加油哦 ✨', '新的一天开始啦～', '早安！记得吃早餐哦 🍞'],
  afternoon: ['下午好！别忘了休息一下 ☕', '今天效率怎么样呀？', '下午茶时间到～🍰'],
  evening: ['晚上好！今天辛苦了 🌙', '记得复盘今天的计划哦 📝', '晚安前把明天计划列好吧～'],
  idle: ['有什么我可以帮忙的吗？', '记得按时完成任务哦～', '加油！你是最棒的！🌟', '别忘了休息眼睛哦 👀'],
  completed: ['太棒了！又完成了一项！🎉', '了不起！继续保持！💪', '好厉害！给你一朵小花 🌸', '效率满分！✨'],
  overdue: ['有任务逾期了哦，快去处理吧 ⚠️', '别担心，现在开始还来得及！', '加油！把逾期的任务补上吧 💪'],
  streak: ['连续打卡记录刷新！🔥', '坚持就是胜利！🏆', '你的毅力让人佩服！✨'],
};

let idleTimer = null;
let sleepTimer = null;

export function initMascot() {
  const mascotEl = document.getElementById('mascot');
  const characterEl = document.getElementById('mascot-character');
  const speechEl = document.getElementById('mascot-speech');
  if (!mascotEl || !characterEl || !speechEl) return;

  const settings = store.getSettings();
  if (!settings.effects || settings.effects.mascot === false) {
    mascotEl.classList.add('hidden');
  }

  const character = settings.mascot?.character || 'neko';
  const charInfo = CHARACTERS[character] || CHARACTERS.neko;
  characterEl.textContent = charInfo.emoji;

  // 显示对话
  function speak(text, duration = 4000) {
    speechEl.textContent = text;
    speechEl.classList.remove('hidden');
    clearTimeout(idleTimer);
    idleTimer = setTimeout(() => {
      speechEl.classList.add('hidden');
    }, duration);
  }

  // 随机对话
  function randomSpeak(bucket) {
    const speeches = SPEECHES[bucket];
    if (!speeches) return;
    speak(speeches[Math.floor(Math.random() * speeches.length)]);
  }

  // 看板娘状态
  function setState(state) {
    mascotEl.setAttribute('data-state', state);
  }

  // 点击事件
  mascotEl.addEventListener('click', () => {
    const hour = new Date().getHours();
    let bucket = 'idle';
    if (hour < 11) bucket = 'morning';
    else if (hour < 17) bucket = 'afternoon';
    else bucket = 'evening';
    randomSpeak(bucket);
    setState('happy');
    setTimeout(() => setState('idle'), 600);
  });

  // 事件监听
  eventBus.on('task:completed', () => {
    randomSpeak('completed');
    setState('happy');
    setTimeout(() => setState('idle'), 1500);
  });

  eventBus.on('habit:checked-in', () => {
    speak('打卡成功！坚持就是胜利！✅', 3000);
    setState('happy');
    setTimeout(() => setState('idle'), 1000);
  });

  eventBus.on('streak:milestone', ({ days }) => {
    speak(`连续${days}天打卡！你太厉害了！🔥`, 5000);
    setState('happy');
  });

  eventBus.on('medal:unlocked', ({ medal }) => {
    speak(`获得新勋章：${medal.name}！🎖️`, 5000);
    setState('happy');
  });

  eventBus.on('task:overdue', () => {
    randomSpeak('overdue');
    setState('worried');
    setTimeout(() => setState('idle'), 2000);
  });

  // 空闲时随机说话
  function scheduleRandom() {
    clearTimeout(idleTimer);
    const delay = 30000 + Math.random() * 120000; // 30-150秒
    idleTimer = setTimeout(() => {
      randomSpeak('idle');
      scheduleRandom();
    }, delay);
  }
  scheduleRandom();

  // 拖动
  let dragging = false, startX, startY, origX, origY;
  mascotEl.addEventListener('pointerdown', (e) => {
    if (e.pointerType === 'mouse' && e.button !== 0) return;
    dragging = true;
    startX = e.clientX;
    startY = e.clientY;
    const rect = mascotEl.getBoundingClientRect();
    origX = rect.left;
    origY = rect.top;
    mascotEl.style.transition = 'none';
    mascotEl.setPointerCapture(e.pointerId);
  });

  window.addEventListener('pointermove', (e) => {
    if (!dragging) return;
    const dx = e.clientX - startX;
    const dy = e.clientY - startY;
    mascotEl.style.left = (origX + dx) + 'px';
    mascotEl.style.top = (origY + dy) + 'px';
    mascotEl.style.right = 'auto';
    mascotEl.style.bottom = 'auto';
  });

  window.addEventListener('pointerup', () => {
    if (!dragging) return;
    dragging = false;
    mascotEl.style.transition = '';
    // 保存位置
    const rect = mascotEl.getBoundingClientRect();
    const s = store.getSettings();
    if (!s.mascot) s.mascot = {};
    s.mascot.position = 'custom';
    s.mascot.left = rect.left;
    s.mascot.top = rect.top;
    store.setSettings(s);
  });

  console.log('[Mascot] Initialized:', charInfo.name);
}

/** 看板娘说话 (外部调用) */
export function mascotSay(text, duration = 4000) {
  const speechEl = document.getElementById('mascot-speech');
  if (!speechEl) return;
  speechEl.textContent = text;
  speechEl.classList.remove('hidden');
  setTimeout(() => speechEl.classList.add('hidden'), duration);
}
