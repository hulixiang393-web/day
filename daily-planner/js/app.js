/* 应用主入口 — 二次元计划表 */

import db from './data/db.js';
import store from './data/store.js';
import { seedData } from './data/seed.js';
import router from './core/router.js';
import eventBus from './core/eventBus.js';
import { showToast } from './core/toast.js';
import { openModal } from './core/modal.js';
import { initKeyboard, registerShortcut } from './utils/keyboard.js';
import { initMascot } from './components/mascot.js';
import { hasPassword, hasQuestion, getQuestion, verifyPassword, verifyAnswer, setPassword, resetPassword, hasValidSession, createSession, clearSession, isLocked, lockRemaining, recordAttempt, remainingAttempts, clearAttempts } from './core/auth.js';
import { TaskModel } from './data/models/task.js';
import { TaskForm } from './components/taskForm.js';
import { ListView } from './views/listView.js';
import { DayView } from './views/dayView.js';
import { WeekView } from './views/weekView.js';
import { MonthView } from './views/monthView.js';
import { TimelineView } from './views/timelineView.js';
import { HabitsView } from './views/habitsView.js';
import { PomodoroView } from './views/pomodoroView.js';
import { StatsView } from './views/statsView.js';
import { TemplateView } from './views/templateView.js';
import { SettingsView } from './views/settingsView.js';
import { initSakuraEffect } from './effects/sakura.js';
import { initSparkleEffect } from './effects/sparkle.js';

// 视图实例
let currentView = null;
const viewContainer = document.getElementById('view-container');

/** 切换视图 */
async function switchView(viewName, params = {}) {
  if (!viewContainer) return;

  // 清理旧视图
  viewContainer.innerHTML = '';

  // 更新侧边栏活跃状态
  updateSidebarActive(viewName);

  switch (viewName) {
    case 'list':
      currentView = new ListView(viewContainer);
      await currentView.render();
      break;
    case 'day':
      currentView = new DayView(viewContainer);
      await currentView.render(params.date);
      break;
    case 'week':
      currentView = new WeekView(viewContainer);
      await currentView.render(params.date);
      break;
    case 'month':
      currentView = new MonthView(viewContainer);
      await currentView.render();
      break;
    case 'timeline':
      currentView = new TimelineView(viewContainer);
      await currentView.render();
      break;
    case 'habits':
      currentView = new HabitsView(viewContainer);
      await currentView.render();
      break;
    case 'pomodoro':
      currentView = new PomodoroView(viewContainer);
      await currentView.render();
      break;
    case 'stats':
      currentView = new StatsView(viewContainer);
      await currentView.render();
      break;
    case 'templates':
      currentView = new TemplateView(viewContainer);
      await currentView.render();
      break;
    case 'settings':
      currentView = new SettingsView(viewContainer);
      await currentView.render();
      break;
    default:
      window.location.hash = '#/list';
      return;
  }
}

/** 更新侧边栏活跃状态 */
function updateSidebarActive(viewName) {
  document.querySelectorAll('.sidebar-item, .mobile-nav-item').forEach((el) => {
    const route = el.getAttribute('data-route') || '';
    el.classList.toggle('active', route === `/${viewName}`);
  });
}

/** 密码锁 */
function checkAuth() {
  // 30天内免登录
  if (hasValidSession()) {
    document.getElementById('auth-overlay').classList.add('hidden');
    return Promise.resolve(true);
  }

  if (!hasPassword()) {
    return showSetupForm();
  }
  return showUnlockForm();
}

function showSetupForm() {
  const t = el('auth-title'), d = el('auth-desc'), f = el('auth-form'), b = el('auth-bottom'), e = el('auth-error');
  t.textContent = '🔐 首次使用';
  d.textContent = '设置密码和安全问题';
  f.innerHTML = `
    <input type="password" id="af-pwd" class="auth-input" placeholder="密码（至少4位）" maxlength="32" autocomplete="off">
    <input id="af-question" class="auth-input mt-2" placeholder="安全问题（如：我的宠物叫什么？）" maxlength="50" style="letter-spacing:0">
    <input id="af-answer" class="auth-input mt-2" placeholder="答案" maxlength="30" style="letter-spacing:0">
    <button id="af-submit" class="btn btn-primary btn-full mt-2">🔒 完成设置</button>`;
  b.innerHTML = '';
  e.style.display = 'none';

  return new Promise(resolve => {
    el('af-submit').onclick = async () => {
      const pwd = el('af-pwd').value.trim();
      const q = el('af-question').value.trim();
      const a = el('af-answer').value.trim();
      if (!pwd || pwd.length < 4) { showErr('密码至少4个字符'); return; }
      if (!q) { showErr('请设置一个安全问题'); return; }
      if (!a) { showErr('请填写安全问题的答案'); return; }
      await setPassword(pwd, q, a);
      document.getElementById('auth-overlay').classList.add('hidden');
      resolve(true);
    };
    el('af-pwd').onkeydown = e => { if (e.key === 'Enter') el('af-question').focus(); };
    el('af-question').onkeydown = e => { if (e.key === 'Enter') el('af-answer').focus(); };
    el('af-answer').onkeydown = e => { if (e.key === 'Enter') el('af-submit').click(); };
    el('af-pwd').focus();
  });
}

function showUnlockForm() {
  const t = el('auth-title'), d = el('auth-desc'), f = el('auth-form'), b = el('auth-bottom'), e = el('auth-error'), at = el('auth-attempts');
  t.textContent = '🌸 二次元计划表';
  d.textContent = '输入密码解锁';
  f.innerHTML = `
    <input type="password" id="af-pwd" class="auth-input" placeholder="输入密码..." maxlength="32" autocomplete="off">
    <button id="af-submit" class="btn btn-primary btn-full mt-2">🔓 进入</button>`;
  b.innerHTML = `<button id="af-reset" class="btn btn-text text-sm">忘记密码？</button>`;
  e.style.display = 'none';
  setAttText(isLocked() ? `已锁定 · ${Math.ceil(lockRemaining()/60)} 分钟后可重试` : '');

  const input = el('af-pwd');
  const btn = el('af-submit');
  if (isLocked()) { input.disabled = true; btn.disabled = true; e.style.display = 'block'; e.textContent = '密码错误次数过多，请等待 ' + Math.ceil(lockRemaining()/60) + ' 分钟'; }

  return new Promise(resolve => {
    btn.onclick = async () => {
      if (isLocked()) return;
      const ok = await verifyPassword(input.value.trim());
      if (ok) {
        clearAttempts(); createSession();
        document.getElementById('auth-overlay').classList.add('hidden');
        resolve(true); return;
      }
      recordAttempt(); input.value = ''; input.focus();
      if (isLocked()) { input.disabled = true; btn.disabled = true; e.style.display = 'block'; e.textContent = '已锁定，请 ' + Math.ceil(lockRemaining()/60) + ' 分钟后重试'; setTimeout(() => location.reload(), lockRemaining() * 1000); }
      else { e.style.display = 'block'; e.textContent = '密码错误，还剩 ' + remainingAttempts() + ' 次机会'; }
      setAttText(isLocked() ? `已锁定 · ${Math.ceil(lockRemaining()/60)} 分钟后可重试` : '还剩 ' + remainingAttempts() + ' 次机会');
    };
    input.onkeydown = e => { if (e.key === 'Enter') btn.click(); };

    el('af-reset').onclick = () => showResetForm(resolve);
    input.focus();
  });
}

function showResetForm(resolve) {
  const t = el('auth-title'), d = el('auth-desc'), f = el('auth-form'), b = el('auth-bottom'), e = el('auth-error'), at = el('auth-attempts');
  t.textContent = '🔄 重置密码';
  d.textContent = '回答安全问题：' + getQuestion();
  f.innerHTML = `
    <input id="af-answer" class="auth-input" placeholder="输入答案..." maxlength="30" style="letter-spacing:0">
    <div id="af-reset-step2" style="display:none">
      <input type="password" id="af-newpwd" class="auth-input mt-2" placeholder="输入新密码" maxlength="32">
    </div>
    <button id="af-submit" class="btn btn-primary btn-full mt-2">✅ 验证答案</button>`;
  b.innerHTML = `<button id="af-back" class="btn btn-text text-sm">← 返回登录</button>`;
  e.style.display = 'none';
  at.textContent = '';
  clearAttempts();

  let step = 1;
  el('af-submit').onclick = async () => {
    if (step === 1) {
      if (verifyAnswer(el('af-answer').value)) {
        step = 2;
        el('af-reset-step2').style.display = 'block';
        el('af-submit').textContent = '🔒 确认重置';
        d.textContent = '答案正确！请输入新密码';
        el('af-answer').disabled = true;
        el('af-newpwd').focus();
      } else {
        showErr('答案错误，请重试');
        el('af-answer').value = '';
      }
    } else {
      const pwd = el('af-newpwd').value.trim();
      if (!pwd || pwd.length < 4) { showErr('密码至少4个字符'); return; }
      await resetPassword(pwd);
      document.getElementById('auth-overlay').classList.add('hidden');
      resolve(true);
    }
  };
  el('af-back').onclick = () => showUnlockForm().then(resolve);
  el('af-answer').onkeydown = e => { if (e.key === 'Enter') el('af-submit').click(); };
  el('af-answer').focus();
}

function el(id) { return document.getElementById(id); }
function showErr(msg) { const e = el('auth-error'); e.textContent = msg; e.style.display = 'block'; }
function setAttText(t) { el('auth-attempts').textContent = t; }

/** 初始化应用 */
async function init() {
  // 0. 密码验证 (在最前面)
  const authed = await checkAuth();
  if (!authed) return;

  try {
    // 1. 打开数据库
    await db.open();

    // 2. 初始化种子数据
    await seedData();

    // 3. 应用主题
    const theme = store.getTheme();
    document.documentElement.setAttribute('data-theme', theme);

    // 4. 应用壁纸
    const wallpaper = store.getSettings().wallpaper;
    if (wallpaper?.url) {
      applyWallpaper(wallpaper);
    }

    // 5. 初始化特效
    const settings = store.getSettings();
    if (settings.effects?.sakura !== false) initSakuraEffect();
    if (settings.effects?.completionEffect !== false) initSparkleEffect();

    // 6. 初始化键盘快捷键
    initKeyboard();

    // 7. 初始化看板娘
    initMascot();

    // 8. 设置路由
    setupRoutes();

    // 9. 绑定全局事件
    bindGlobalEvents();

    // 10. 启动路由
    router.start();

    console.log('🌸 二次元计划表已就绪!');
  } catch (e) {
    console.error('[App] Initialization failed:', e);
    showToast('应用初始化失败，请刷新页面', 'error');
  }
}

/** 设置路由 */
function setupRoutes() {
  router.add('/list', () => switchView('list'));
  router.add('/day', () => switchView('day'));
  router.add('/day/:date', (route) => switchView('day', { date: route.params.date }));
  router.add('/week', () => switchView('week'));
  router.add('/week/:date', (route) => switchView('week', { date: route.params.date }));
  router.add('/month', () => switchView('month'));
  router.add('/timeline', () => switchView('timeline'));
  router.add('/habits', () => switchView('habits'));
  router.add('/pomodoro', () => switchView('pomodoro'));
  router.add('/stats', () => switchView('stats'));
  router.add('/templates', () => switchView('templates'));
  router.add('/settings', () => switchView('settings'));
}

/** 绑定全局事件 */
function bindGlobalEvents() {
  // 侧边栏切换 (移动端)
  const sidebarToggle = document.getElementById('sidebar-toggle');
  const sidebar = document.getElementById('sidebar');

  sidebarToggle?.addEventListener('click', () => {
    const isMobile = window.innerWidth < 768;
    if (isMobile) {
      sidebar?.classList.toggle('open');
      // 移动端显示遮罩
      let overlay = document.querySelector('.sidebar-overlay');
      if (!overlay) {
        overlay = document.createElement('div');
        overlay.className = 'sidebar-overlay';
        overlay.addEventListener('click', () => {
          sidebar?.classList.remove('open');
          overlay?.remove();
        });
        document.body.appendChild(overlay);
      }
      if (!sidebar?.classList.contains('open')) {
        overlay?.remove();
      }
    } else {
      sidebar?.classList.toggle('hidden');
    }
  });

  // 侧边栏导航点击
  document.querySelectorAll('.sidebar-item').forEach((item) => {
    item.addEventListener('click', (e) => {
      // 移动端关闭侧边栏
      const overlay = document.querySelector('.sidebar-overlay');
      if (overlay) overlay.remove();
      sidebar?.classList.remove('open');
    });
  });

  // 搜索栏
  const searchInput = document.getElementById('search-input');
  const searchClear = document.getElementById('search-clear');

  searchInput?.addEventListener('input', (e) => {
    const q = e.target.value;
    searchClear?.classList.toggle('hidden', !q);
    eventBus.emit('search:query', q);
  });

  searchClear?.addEventListener('click', () => {
    searchInput.value = '';
    searchClear.classList.add('hidden');
    eventBus.emit('search:query', '');
  });

  // 快捷键：Ctrl+K 聚焦搜索
  registerShortcut('ctrl+k', () => {
    searchInput?.focus();
  });

  // 快捷键：新建任务
  eventBus.on('shortcut:new-task', () => {
    new TaskForm(() => {
      eventBus.emit('task:created');
    }).show();
  });

  // 快捷键：Escape
  eventBus.on('shortcut:escape', () => {
    // 关闭弹窗
    const overlay = document.getElementById('modal-overlay');
    if (overlay && !overlay.classList.contains('hidden')) {
      overlay.classList.add('hidden');
    }
  });

  // 搜索事件
  let searchTimeout;
  eventBus.on('search:query', (q) => {
    clearTimeout(searchTimeout);
    searchTimeout = setTimeout(async () => {
      if (q && q.trim()) {
        const tasks = await TaskModel.search(q);
        eventBus.emit('search:results', tasks);
      }
    }, 300);
  });

  // 主题切换按钮
  document.getElementById('btn-theme')?.addEventListener('click', () => {
    const themes = ['light', 'dark', 'macaron'];
    const current = store.getTheme();
    const idx = themes.indexOf(current);
    const next = themes[(idx + 1) % themes.length];
    store.setTheme(next);
    document.documentElement.setAttribute('data-theme', next);
    showToast(`🎨 主题切换: ${next === 'light' ? '白桃' : next === 'dark' ? '暗夜星穹' : '软蓝日系'}`, 'success');
    eventBus.emit('theme:changed', { theme: next });
  });

  // 设置按钮
  document.getElementById('btn-settings')?.addEventListener('click', () => {
    window.location.hash = '#/settings';
  });

  // 悬浮小窗按钮
  document.getElementById('btn-mini-window')?.addEventListener('click', () => {
    window.open('./index.html?mode=mini', 'planner-mini', 'width=400,height=600,alwaysOnTop=1');
    showToast('悬浮小窗已打开', 'info');
  });

  // 快速新建
  document.getElementById('btn-quick-add')?.addEventListener('click', () => {
    new TaskForm(() => {
      eventBus.emit('task:created');
    }).show();
  });

  // 移动端新建
  document.getElementById('mobile-add-btn')?.addEventListener('click', () => {
    new TaskForm(() => {
      eventBus.emit('task:created');
    }).show();
  });

  // 欢迎页按钮
  document.getElementById('welcome-add-task')?.addEventListener('click', () => {
    new TaskForm(() => {
      eventBus.emit('task:created');
    }).show();
  });
  document.getElementById('welcome-template')?.addEventListener('click', () => {
    window.location.hash = '#/templates';
  });

  // 详情面板关闭
  document.getElementById('detail-close')?.addEventListener('click', () => {
    const panel = document.getElementById('detail-panel');
    if (panel) panel.classList.add('hidden');
  });

  // 任务详情打开
  eventBus.on('task:open-detail', (task) => {
    openTaskDetail(task);
  });

  // 窗口大小监听
  window.addEventListener('resize', () => {
    const isMobile = window.innerWidth < 768;
    if (!isMobile && sidebar?.classList.contains('hidden')) {
      sidebar?.classList.remove('hidden');
    }
  });
}

/** 打开任务详情面板 */
function openTaskDetail(task) {
  const panel = document.getElementById('detail-panel');
  const content = document.getElementById('detail-content');
  const title = document.getElementById('detail-title');
  if (!panel || !content) return;

  title.textContent = task.title;
  panel.classList.remove('hidden');

  const priorityLabels = ['普通', '重要', '紧急', '极致重要'];
  const statusLabels = { pending: '未开始', in_progress: '进行中', completed: '已完成', overdue: '已逾期', cancelled: '已取消' };

  content.innerHTML = `
    <div class="task-detail">
      <div class="mb-3">
        <span class="priority-badge priority-badge--${['low','normal','high','urgent'][task.priority] || 'low'}">
          ${['🟢','🔵','🟠','🔴'][task.priority]} ${priorityLabels[task.priority]}
        </span>
        <span style="margin-left:8px;color:var(--text-secondary);font-size:0.85rem">${statusLabels[task.status] || task.status}</span>
      </div>

      ${task.description ? `<div class="mb-3"><h4>📝 描述</h4><p class="text-sm text-secondary">${escapeHTML(task.description)}</p></div>` : ''}

      <div class="mb-3">
        <h4>📅 日期</h4>
        <p class="text-sm text-secondary">
          ${task.startDate || task.endDate ? (task.startDate ? task.startDate + (task.startTime ? ' ' + task.startTime : '') + ' → ' : '') + (task.endDate || '') + (task.endTime ? ' ' + task.endTime : '') : '未设置'}
          ${task.repeatRule && task.repeatRule.type !== 'none' ? '· 🔁 重复任务' : ''}
        </p>
      </div>

      ${task.subtasks && task.subtasks.length > 0 ? `
        <div class="mb-3">
          <h4>📋 子任务 (${task.subtasks.filter(s => s.completed).length}/${task.subtasks.length})</h4>
          ${task.subtasks.map((s) => `
            <div class="flex items-center gap-2 mb-1 text-sm text-secondary">
              <span>${s.completed ? '✅' : '⬜'}</span> ${escapeHTML(s.title)}
            </div>`).join('')}
        </div>` : ''}

      ${task.tags && task.tags.length > 0 ? `
        <div class="mb-3">
          <h4>🏷️ 标签</h4>
          <div class="flex gap-1 flex-wrap">${task.tags.map((t) => `<span class="task-tag">${escapeHTML(t)}</span>`).join('')}</div>
        </div>` : ''}

      <div class="mb-3">
        <h4>📅 创建时间</h4>
        <p class="text-sm text-secondary">${new Date(task.createdAt).toLocaleString('zh-CN')}</p>
      </div>

      ${task.completedAt ? `
        <div class="mb-3">
          <h4>✅ 完成时间</h4>
          <p class="text-sm text-secondary">${new Date(task.completedAt).toLocaleString('zh-CN')}</p>
        </div>` : ''}
    </div>`;

  function escapeHTML(str) {
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
  }
}

/** 应用壁纸 */
function applyWallpaper(wallpaper) {
  const layer = document.getElementById('wallpaper-layer');
  if (!layer) return;
  if (wallpaper.url) {
    layer.style.backgroundImage = `url(${wallpaper.url})`;
    layer.style.opacity = wallpaper.opacity || 0.2;
  }
}

// DOM 加载完成后启动
document.addEventListener('DOMContentLoaded', init);
