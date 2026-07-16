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
import { hasPassword, hasQuestion, getQuestion, verifyPassword, verifyAnswer, setPassword, setQuestion, tryMigrateHash, hasValidSession, createSession, clearSession, isLocked, lockSeconds, recordPwdAttempt, remainingPwd, resetPwdAttempts, isAnsLocked, ansLockSeconds, recordAnsAttempt, remainingAns, resetAnsAttempts } from './core/auth.js';
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

// ===================== 认证系统 =====================
/*
  状态机：SETUP → UNLOCK → (APP)
  UNLOCK → RESET_CHALLENGE → RESET_NEW → UNLOCK

  安全规则：
  - 密码尝试 5 次锁定 5 分钟（独立计数，不会因切换页面重置）
  - 安全问题尝试 3 次锁定 15 分钟（独立计数）
  - 会话 30 天有效（防篡改 token）
  - 所有用户输入经过过滤
  - 哈希使用恒定时间比较
*/

function checkAuth() {
  if (hasValidSession()) {
    document.getElementById('auth-overlay').classList.add('hidden');
    return Promise.resolve(true);
  }
  if (!hasPassword()) return renderSetup();
  return renderUnlock();
}

// ====== 步骤1：首次设置密码 + 安全问题 ======
function renderSetup() {
  clearForm();
  const r = use('setup');
  header('🔐 首次使用', '设置密码和安全问题（用于找回密码）');
  form(`
    <input type="password" id="af-p1" class="auth-input" placeholder="密码（至少6位）" maxlength="64" autocomplete="off">
    <input type="password" id="af-p2" class="auth-input mt-2" placeholder="再次输入密码" maxlength="64">
    <input id="af-question" class="auth-input mt-2" placeholder="安全问题，如：我第一只宠物叫什么？" maxlength="60" style="letter-spacing:0">
    <input id="af-answer" class="auth-input mt-2" placeholder="安全问题的答案" maxlength="40" style="letter-spacing:0">
    <button id="af-btn" class="btn btn-primary btn-full mt-2">🔒 完成设置</button>
  `);
  bottom('');
  hideErr();

  return new Promise(resolve => {
    btn().onclick = async () => {
      const p1 = val('af-p1'), p2 = val('af-p2');
      const q = val('af-question'), a = val('af-answer');
      if (!p1 || p1.length < 6) return err('密码至少6个字符');
      if (!/[a-zA-Z]/.test(p1) || !/[0-9]/.test(p1)) return err('密码需包含字母和数字');
      if (p1 !== p2) return err('两次密码不一致');
      if (!q || q.length < 2) return err('请设置安全问题');
      if (!a || a.length < 2) return err('请填写答案');
      await setPassword(p1);
      await setQuestion(q, a);
      createSession();
      document.getElementById('auth-overlay').classList.add('hidden');
      resolve(true);
    };
    keynav(['af-p1', 'af-p2', 'af-question', 'af-answer'], 'af-btn');
    focus('af-p1');
  });
}

// ====== 步骤2：密码解锁 ======
function renderUnlock() {
  clearForm();
  const r = use('unlock');
  header('🌸 二次元计划表', '输入密码解锁');
  form(`
    <input type="password" id="af-pwd" class="auth-input" placeholder="输入密码..." maxlength="64" autocomplete="off">
    <button id="af-btn" class="btn btn-primary btn-full mt-2">🔓 进入</button>
  `);
  bottom(`<button id="af-forgot" class="btn btn-text text-sm">忘记密码？</button>`);
  hideErr();

  if (isLocked()) {
    lockUI('密码错误过多，请 ' + Math.ceil(lockSeconds() / 60) + ' 分钟后重试');
    setTimeout(() => location.reload(), lockSeconds() * 1000 + 1000);
  }

  const hint = hintEl();
  if (remainingPwd() < 3) hint.textContent = '剩余 ' + remainingPwd() + ' 次尝试机会';

  return new Promise(resolve => {
    btn().onclick = async () => {
      if (isLocked()) return;
      let ok = await verifyPassword(val('af-pwd'));
      // 兼容旧版密码（自动升级哈希）
      if (!ok) ok = await tryMigrateHash(val('af-pwd'));
      if (ok) {
        resetPwdAttempts();
        createSession();
        // 有密码但没安全问题 → 提示补充设置
        if (!hasQuestion()) {
          renderAddQuestion().then(() => {
            document.getElementById('auth-overlay').classList.add('hidden');
            resolve(true);
          });
          return;
        }
        document.getElementById('auth-overlay').classList.add('hidden');
        resolve(true);
        return;
      }
      recordPwdAttempt();
      input().value = ''; input().focus();
      if (isLocked()) {
        lockUI('已锁定 ' + Math.ceil(lockSeconds() / 60) + ' 分钟');
        setTimeout(() => location.reload(), lockSeconds() * 1000 + 1000);
      } else {
        err('密码错误，剩余 ' + remainingPwd() + ' 次机会');
        hint.textContent = '剩余 ' + remainingPwd() + ' 次尝试机会';
      }
    };
    input().onkeydown = e => { if (e.key === 'Enter') btn().click(); };
    click('af-forgot', () => renderReset(resolve));
    input().focus();
  });
}

// ====== 步骤3：重置密码（先验证安全问题，再设新密码） ======
function renderReset(resolve) {
  if (!hasQuestion()) {
    // 没有安全问题：显示返回登录提示
    clearForm();
    use('reset-nq');
    header('🔄 无法重置', '');
    form(`<p class="text-sm text-secondary mb-3">你的账号没有设置安全问题，无法通过此方式重置密码。</p>
          <p class="text-sm text-secondary mb-3">请返回登录页，用密码进入后再设置安全问题。</p>`);
    bottom(`<button id="af-back" class="btn btn-primary btn-full">← 返回登录</button>`);
    hideErr();
    click('af-back', () => renderUnlock().then(resolve));
    return;
  }

  clearForm();
  const r = use('reset');
  header('🔄 重置密码', '请先回答安全问题');
  form(`
    <p class="text-sm mb-2" style="color:var(--color-primary);font-weight:600">❓ ${getQuestion()}</p>
    <input id="af-answer" class="auth-input" placeholder="输入答案..." maxlength="40" style="letter-spacing:0">
    <div id="af-step2" style="display:none">
      <input type="password" id="af-new1" class="auth-input mt-2" placeholder="新密码（至少6位，含字母数字）" maxlength="64">
      <input type="password" id="af-new2" class="auth-input mt-2" placeholder="再次输入新密码" maxlength="64">
    </div>
    <button id="af-btn" class="btn btn-primary btn-full mt-2">✅ 验证答案</button>
  `);
  bottom(`<button id="af-back" class="btn btn-text text-sm">← 返回登录</button>`);
  hideErr();

  if (isAnsLocked()) {
    lockUI('安全问题尝试过多，请 ' + Math.ceil(ansLockSeconds() / 60) + ' 分钟后重试');
    setTimeout(() => location.reload(), ansLockSeconds() * 1000 + 1000);
  }

  let step = 1;
  btn().onclick = async () => {
    if (step === 1) {
      if (isAnsLocked()) return;
      const correct = await verifyAnswer(val('af-answer'));
      if (correct) {
        resetAnsAttempts();
        step = 2;
        el('af-step2').style.display = 'block';
        btn().textContent = '🔒 确认重置';
        header('🔄 重置密码', '答案正确！请设置新密码');
        el('af-answer').disabled = true;
        focus('af-new1');
      } else {
        recordAnsAttempt();
        el('af-answer').value = '';
        if (isAnsLocked()) {
          lockUI('安全问题已锁定 ' + Math.ceil(ansLockSeconds() / 60) + ' 分钟');
          setTimeout(() => location.reload(), ansLockSeconds() * 1000 + 1000);
        } else {
          err('答案错误，剩余 ' + remainingAns() + ' 次机会');
        }
      }
    } else {
      const p1 = val('af-new1'), p2 = val('af-new2');
      if (!p1 || p1.length < 6) return err('密码至少6个字符');
      if (!/[a-zA-Z]/.test(p1) || !/[0-9]/.test(p1)) return err('密码需包含字母和数字');
      if (p1 !== p2) return err('两次密码不一致');
      await setPassword(p1);
      resetPwdAttempts();
      createSession();
      document.getElementById('auth-overlay').classList.add('hidden');
      resolve(true);
    }
  };
  keynav(['af-answer'], 'af-btn');
  click('af-back', () => renderUnlock().then(resolve));
  focus('af-answer');
}

// ====== 补设安全问题（登录后发现没有） ======
function renderAddQuestion() {
  clearForm();
  use('addq');
  header('🔐 补充安全设置', '为了能找回密码，请设置安全问题');
  form(`
    <input id="af-question" class="auth-input" placeholder="安全问题，如：我的小学叫什么？" maxlength="60" style="letter-spacing:0">
    <input id="af-answer" class="auth-input mt-2" placeholder="答案" maxlength="40" style="letter-spacing:0">
    <button id="af-btn" class="btn btn-primary btn-full mt-2">✅ 完成</button>
  `);
  bottom(`<button id="af-skip" class="btn btn-text text-sm">跳过，以后再说</button>`);
  hideErr();

  return new Promise(resolve => {
    btn().onclick = async () => {
      const q = val('af-question'), a = val('af-answer');
      if (!q) return err('请输入安全问题');
      if (!a) return err('请输入答案');
      await setQuestion(q, a);
      resolve(true);
    };
    el('af-skip').onclick = () => resolve(true);
    keynav(['af-question', 'af-answer'], 'af-btn');
    focus('af-question');
  });
}

// ====== UI 辅助函数 ======
let _use = '';
function use(s) { _use = s; return s; }
function header(title, desc) { el('auth-title').textContent = title; el('auth-desc').textContent = desc; }
function form(html) { el('auth-form').innerHTML = html; }
function bottom(html) { el('auth-bottom').innerHTML = html; }
function clearForm() { el('auth-form').innerHTML = ''; el('auth-bottom').innerHTML = ''; hintEl().textContent = ''; hideErr(); }
function btn() { return el('af-btn'); }
function input() { return el('af-pwd'); }
function hintEl() { return el('auth-attempts'); }
function focus(id) { setTimeout(() => { const e = el(id); if (e) e.focus(); }, 100); }
function val(id) { const e = el(id); return e ? e.value.trim() : ''; }
function err(msg) { const e = el('auth-error'); e.textContent = msg; e.style.display = 'block'; }
function hideErr() { el('auth-error').style.display = 'none'; }
function lockUI(msg) {
  const i = input() || el('af-answer'); if (i) { i.disabled = true; }
  const b = btn(); if (b) b.disabled = true;
  err(msg);
}
function click(id, fn) { const e = el(id); if (e) e.onclick = fn; }
function keynav(ids, lastId) {
  ids.forEach((id, i) => {
    const e = el(id); if (!e) return;
    const next = i < ids.length - 1 ? ids[i + 1] : lastId;
    e.onkeydown = ev => { if (ev.key === 'Enter') { const n = el(next); if (n) n.focus(); } };
  });
}
function el(id) { return document.getElementById(id); }

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
