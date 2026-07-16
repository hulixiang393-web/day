/**
 * 页面级隐私加密验证模块 (Privacy Guard)
 * ==========================================
 * 功能：页面加载时拦截，验证密码后才渲染核心内容
 * 嵌入步骤：
 *   1. 在 <head> 引入 privacy-guard.css
 *   2. 在 <body> 开头放置 <div id="pg-overlay"></div>
 *   3. 在入口 JS 最前面 await PrivacyGuard.check()
 *   4. 在设置页调用 PrivacyGuard 的 set/change/remove 方法
 *
 * 安全特性：
 *   - SHA-256 哈希存储，绝不明文
 *   - DOM 级阻断（验证失败不写入核心内容）
 *   - 5次锁定15分钟防暴力破解
 *   - 密保问题也经过哈希
 *   - 会话级验证（关标签页后重验）
 */

const PG = (() => {
  // ========== 存储键名 ==========
  const KEY_PWD   = 'pg_pwd';        // 密码哈希
  const KEY_QUES  = 'pg_ques';       // 密保问题（明文，用于显示）
  const KEY_ANS   = 'pg_ans';        // 密保答案哈希
  const KEY_AT    = 'pg_attempts';   // 失败次数
  const KEY_LOCK  = 'pg_locked';     // 锁定截止时间戳

  const MAX_ATTEMPTS = 5;            // 最多尝试次数
  const LOCK_MINUTES = 15;           // 锁定时长（分钟）

  // ========== 工具函数 ==========

  /** SHA-256 哈希（带固定盐值） */
  async function sha256(text) {
    const salt = 'privacy-guard-v1-salt';
    const data = new TextEncoder().encode(text + '::' + salt);
    const buf = await crypto.subtle.digest('SHA-256', data);
    return Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, '0')).join('');
  }

  /** HTML 转义（防 XSS） */
  function esc(s) {
    const d = document.createElement('div');
    d.textContent = s;
    return d.innerHTML;
  }

  /** 创建 DOM 元素 */
  function ce(tag, attrs = {}, ...children) {
    const el = document.createElement(tag);
    for (const [k, v] of Object.entries(attrs)) {
      if (k === 'className') el.className = v;
      else if (k.startsWith('on')) el.addEventListener(k.slice(2), v);
      else el.setAttribute(k, v);
    }
    for (const c of children) {
      el.appendChild(typeof c === 'string' ? document.createTextNode(c) : c);
    }
    return el;
  }

  // ========== 存储操作 ==========

  function storeGet(key) { return localStorage.getItem(key); }
  function storeSet(key, val) { localStorage.setItem(key, val); }
  function storeDel(key) { localStorage.removeItem(key); }

  // ========== 锁定逻辑 ==========

  function getAttempts() { return parseInt(storeGet(KEY_AT) || '0'); }
  function setAttempts(n) { storeSet(KEY_AT, String(n)); }
  function resetAttempts() { storeDel(KEY_AT); storeDel(KEY_LOCK); }

  function isLocked() {
    const until = parseInt(storeGet(KEY_LOCK) || '0');
    if (!until) return false;
    if (Date.now() > until) { resetAttempts(); return false; }
    return true;
  }

  function lockSecondsRemaining() {
    const until = parseInt(storeGet(KEY_LOCK) || '0');
    return Math.max(0, Math.ceil((until - Date.now()) / 1000));
  }

  function recordFailedAttempt() {
    const n = getAttempts() + 1;
    setAttempts(n);
    if (n >= MAX_ATTEMPTS) {
      storeSet(KEY_LOCK, String(Date.now() + LOCK_MINUTES * 60 * 1000));
    }
    return n;
  }

  function remainingAttempts() {
    return Math.max(0, MAX_ATTEMPTS - getAttempts());
  }

  // ========== 公开 API ==========

  const API = {
    // ---- 状态检测 ----

    /** 是否已设置密码 */
    hasPassword() {
      return !!storeGet(KEY_PWD);
    },

    /** 是否已设置密保问题 */
    hasQuestion() {
      return !!storeGet(KEY_QUES);
    },

    /** 获取密保问题文本 */
    getQuestion() {
      return storeGet(KEY_QUES) || '';
    },

    // ---- 密码设置（首次） ----

    /**
     * 设置新密码（首次设置，无前置验证）
     * @param {string} password - 新密码
     * @param {string} [question] - 密保问题（可选）
     * @param {string} [answer] - 密保答案（可选）
     * @returns {Promise<{ok: boolean, error?: string}>}
     */
    async setPassword(password, question, answer) {
      if (!password || password.length < 6) {
        return { ok: false, error: '密码至少6个字符' };
      }

      storeSet(KEY_PWD, await sha256(password));

      if (question && answer) {
        storeSet(KEY_QUES, question);
        storeSet(KEY_ANS, await sha256(answer.toLowerCase().trim()));
      }

      resetAttempts();
      return { ok: true };
    },

    // ---- 密码验证 ----

    /**
     * 验证密码
     * @param {string} password
     * @returns {Promise<boolean>}
     */
    async verify(password) {
      const stored = storeGet(KEY_PWD);
      if (!stored) return true; // 未设置密码，直接通过
      return (await sha256(password)) === stored;
    },

    // ---- 修改密码 ----

    /**
     * 修改密码（需验证原密码）
     * @param {string} oldPassword - 原密码
     * @param {string} newPassword - 新密码
     * @returns {Promise<{ok: boolean, error?: string}>}
     */
    async changePassword(oldPassword, newPassword) {
      const verified = await this.verify(oldPassword);
      if (!verified) {
        return { ok: false, error: '原密码错误' };
      }
      return this.setPassword(newPassword);
    },

    // ---- 密保验证 ----

    /**
     * 验证密保答案
     * @param {string} answer
     * @returns {Promise<boolean>}
     */
    async verifyAnswer(answer) {
      const stored = storeGet(KEY_ANS);
      if (!stored) return false;
      return (await sha256(answer.toLowerCase().trim())) === stored;
    },

    /**
     * 通过密保重置密码
     * @param {string} answer - 密保答案
     * @param {string} newPassword - 新密码
     * @returns {Promise<{ok: boolean, error?: string}>}
     */
    async resetWithAnswer(answer, newPassword) {
      const correct = await this.verifyAnswer(answer);
      if (!correct) {
        return { ok: false, error: '密保答案错误' };
      }
      return this.setPassword(newPassword);
    },

    // ---- 安全重置（清除所有数据） ----

    /**
     * 强制重置：清除密码 + 清空所有本地隐私数据
     * @returns {Promise<{ok: boolean}>}
     */
    async forceReset() {
      // 清除认证数据
      storeDel(KEY_PWD);
      storeDel(KEY_QUES);
      storeDel(KEY_ANS);
      resetAttempts();
      return { ok: true };
    },

    // ---- 锁定状态 ----

    isLocked,
    lockSecondsRemaining,
    recordFailedAttempt,
    remainingAttempts,
    resetAttempts,
  };

  // ========== UI 渲染（验证界面） ==========

  /**
   * 渲染密码验证界面（全屏遮罩）
   * 验证通过后调用 onSuccess，否则页面永远不渲染核心内容
   * @param {Function} onSuccess - 验证通过回调
   */
  API.renderGuard = function(onSuccess) {
    const overlay = document.getElementById('pg-overlay');
    if (!overlay) return;
    overlay.innerHTML = '';
    overlay.style.display = 'flex';

    const card = ce('div', { className: 'pg-card' });
    const icon = ce('div', { className: 'pg-icon' }, '🌸');
    const title = ce('h2', { className: 'pg-title' }, '二次元计划表');
    const desc = ce('p', { className: 'pg-desc' }, '输入密码以解锁应用');

    // 密码输入
    const pwdWrap = ce('div', { className: 'pg-input-wrap' });
    const pwdInput = ce('input', {
      type: 'password', className: 'pg-input',
      placeholder: '输入密码...', maxlength: '64', autocomplete: 'off',
      id: 'pg-password'
    });
    const toggleBtn = ce('button', {
      className: 'pg-toggle-btn', type: 'button',
      onclick() {
        const isPwd = pwdInput.type === 'password';
        pwdInput.type = isPwd ? 'text' : 'password';
        this.textContent = isPwd ? '🙈' : '👁️';
      }
    }, '👁️');
    pwdWrap.appendChild(pwdInput);
    pwdWrap.appendChild(toggleBtn);

    // 提交按钮
    const submitBtn = ce('button', {
      className: 'pg-submit-btn', type: 'button',
      onclick: handleUnlock
    }, '🔓 解锁');

    // 错误提示
    const errorEl = ce('div', { className: 'pg-error' });

    // 尝试次数提示
    const hintEl = ce('div', { className: 'pg-hint' });

    // 忘记密码
    const forgotWrap = ce('div', { className: 'pg-forgot-wrap' });
    const forgotBtn = ce('button', {
      className: 'pg-forgot-btn', type: 'button',
      onclick: () => renderForgotPassword()
    }, '忘记密码？');
    forgotWrap.appendChild(forgotBtn);

    card.appendChild(icon);
    card.appendChild(title);
    card.appendChild(desc);
    card.appendChild(pwdWrap);
    card.appendChild(submitBtn);
    card.appendChild(errorEl);
    card.appendChild(hintEl);
    card.appendChild(forgotWrap);
    overlay.appendChild(card);

    // 锁定状态检查
    if (isLocked()) {
      pwdInput.disabled = true;
      submitBtn.disabled = true;
      errorEl.textContent = '验证已锁定，请 ' + Math.ceil(lockSecondsRemaining() / 60) + ' 分钟后重试';
      errorEl.style.display = 'block';
      const interval = setInterval(() => {
        if (!isLocked()) {
          clearInterval(interval);
          pwdInput.disabled = false;
          submitBtn.disabled = false;
          errorEl.style.display = 'none';
          hintEl.textContent = '';
        } else {
          errorEl.textContent = '验证已锁定，请 ' + Math.ceil(lockSecondsRemaining() / 60) + ' 分钟后重试';
        }
      }, 1000);
    }

    if (getAttempts() > 0) {
      hintEl.textContent = '剩余 ' + remainingAttempts() + ' 次尝试机会';
    }

    pwdInput.focus();
    pwdInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') handleUnlock();
    });

    async function handleUnlock() {
      if (isLocked()) return;
      const pwd = pwdInput.value.trim();
      if (!pwd) return;

      const ok = await API.verify(pwd);
      if (ok) {
        resetAttempts();
        overlay.style.display = 'none';
        overlay.innerHTML = '';
        if (onSuccess) onSuccess();
      } else {
        recordFailedAttempt();
        pwdInput.value = '';
        pwdInput.focus();
        if (isLocked()) {
          pwdInput.disabled = true;
          submitBtn.disabled = true;
          errorEl.textContent = '已锁定，请 ' + Math.ceil(lockSecondsRemaining() / 60) + ' 分钟后重试';
          errorEl.style.display = 'block';
          const interval = setInterval(() => {
            if (!isLocked()) {
              clearInterval(interval);
              pwdInput.disabled = false;
              submitBtn.disabled = false;
              errorEl.style.display = 'none';
              hintEl.textContent = '';
            } else {
              errorEl.textContent = '已锁定，请 ' + Math.ceil(lockSecondsRemaining() / 60) + ' 分钟后重试';
            }
          }, 1000);
        } else {
          errorEl.textContent = '密码错误';
          errorEl.style.display = 'block';
          hintEl.textContent = '剩余 ' + remainingAttempts() + ' 次尝试机会';
        }
      }
    }

    // ====== 忘记密码流程 ======
    function renderForgotPassword() {
      card.innerHTML = '';

      const backBtn = ce('button', {
        className: 'pg-back-btn', type: 'button',
        onclick: () => { overlay.innerHTML = ''; API.renderGuard(onSuccess); }
      }, '← 返回');

      if (API.hasQuestion()) {
        // 方案1：密保重置
        const title2 = ce('h2', { className: 'pg-title' }, '🔄 找回密码');
        const desc2 = ce('p', { className: 'pg-desc' }, '请回答密保问题');
        const quesEl = ce('p', { className: 'pg-question-text' }, API.getQuestion());

        const ansInput = ce('input', {
          className: 'pg-input', placeholder: '输入答案...',
          maxlength: '40', id: 'pg-answer'
        });
        const ansBtn = ce('button', {
          className: 'pg-submit-btn', type: 'button',
          onclick: handleAnswerCheck
        }, '✅ 验证答案');

        const ansError = ce('div', { className: 'pg-error' });
        const ansHint = ce('div', { className: 'pg-hint' });

        // 步骤2（验证通过后出现）
        const step2 = ce('div', { id: 'pg-step2', style: 'display:none' });
        const new1 = ce('input', {
          type: 'password', className: 'pg-input',
          placeholder: '新密码（至少6位）', maxlength: '64'
        });
        const new2 = ce('input', {
          type: 'password', className: 'pg-input',
          placeholder: '再次输入新密码', maxlength: '64',
          style: 'margin-top:8px'
        });
        const confirmBtn = ce('button', {
          className: 'pg-submit-btn', type: 'button',
          onclick: handleNewPassword
        }, '🔒 确认重置');
        step2.appendChild(new1);
        step2.appendChild(new2);
        step2.appendChild(confirmBtn);

        card.appendChild(backBtn);
        card.appendChild(title2);
        card.appendChild(desc2);
        card.appendChild(quesEl);
        card.appendChild(ansInput);
        card.appendChild(ansBtn);
        card.appendChild(ansError);
        card.appendChild(ansHint);
        card.appendChild(step2);

        // 安全问题也有限制
        let ansAttempts = 0;
        async function handleAnswerCheck() {
          const correct = await API.verifyAnswer(ansInput.value.trim());
          if (correct) {
            step2.style.display = 'block';
            ansInput.disabled = true;
            ansBtn.style.display = 'none';
            desc2.textContent = '答案正确！请设置新密码';
            new1.focus();
          } else {
            ansAttempts++;
            ansInput.value = '';
            ansError.textContent = '答案错误';
            ansError.style.display = 'block';
            if (ansAttempts >= 3) {
              ansInput.disabled = true;
              ansBtn.disabled = true;
              ansError.textContent = '密保验证失败次数过多，请返回重试';
            }
          }
        }
        new1.addEventListener('keydown', (e) => { if (e.key === 'Enter') new2.focus(); });
        new2.addEventListener('keydown', (e) => { if (e.key === 'Enter') handleNewPassword(); });

        async function handleNewPassword() {
          const p1 = new1.value.trim(), p2 = new2.value.trim();
          if (!p1 || p1.length < 6) { ansError.textContent = '密码至少6个字符'; ansError.style.display = 'block'; return; }
          if (p1 !== p2) { ansError.textContent = '两次密码不一致'; ansError.style.display = 'block'; return; }
          await API.setPassword(p1);
          resetAttempts();
          overlay.style.display = 'none';
          overlay.innerHTML = '';
          if (onSuccess) onSuccess();
        }
      } else {
        // 方案2：无密保 → 安全重置（清除所有数据）
        const title2 = ce('h2', { className: 'pg-title' }, '⚠️ 安全重置');
        const desc2 = ce('p', { className: 'pg-desc' }, '未设置密保问题，只能通过清除数据来重置');
        const warn = ce('p', { className: 'pg-warn' },
          '⚠️ 此操作将永久清除所有本地数据（任务、习惯、设置等），且不可恢复！');
        const resetBtn = ce('button', {
          className: 'pg-submit-btn pg-danger-btn', type: 'button',
          onclick: handleForceReset
        }, '🗑️ 确认清除所有数据并重置');

        card.appendChild(backBtn);
        card.appendChild(title2);
        card.appendChild(desc2);
        card.appendChild(warn);
        card.appendChild(resetBtn);

        async function handleForceReset() {
          // 二次确认
          const confirmed = confirm('确定要清除所有数据吗？\n\n此操作不可恢复！\n\n将清除：所有任务、习惯、设置、分类\n\n确定要继续吗？');
          if (!confirmed) return;

          await API.forceReset();
          // 清除应用数据（IndexedDB 和 localStorage）
          // 保留 pg_ 开头的项由 forceReset 清除，这里清应用数据
          const keys = Object.keys(localStorage).filter(k => !k.startsWith('pg_'));
          keys.forEach(k => localStorage.removeItem(k));
          // 清空 IndexedDB
          if (window.indexedDB) {
            const dbs = await indexedDB.databases?.() || [];
            for (const db of dbs) {
              if (db.name) indexedDB.deleteDatabase(db.name);
            }
          }

          overlay.style.display = 'none';
          overlay.innerHTML = '';
          if (onSuccess) onSuccess();
        }
      }
    }
  };

  /** 页面入口：检测并阻断渲染 */
  API.check = function(onSuccess) {
    if (!API.hasPassword()) {
      // 未设置密码 → 直接放行
      if (onSuccess) onSuccess();
      return;
    }
    // 已设置密码 → 阻断，渲染验证界面
    API.renderGuard(onSuccess);
  };

  // ========== 返回公开 API ==========
  return API;
})();

// 导出
if (typeof module !== 'undefined' && module.exports) {
  module.exports = PG;
}
