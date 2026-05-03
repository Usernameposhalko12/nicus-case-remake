// ============================================
// БАТЛПАС UI — battlepass-ui.js
// NKR · SummerHeat 2026
// ============================================

import {
  getBpProgress, syncBpTasks, addLbk, progressBpTask,
  claimBpTaskReward, claimBpLevelReward, spinBpWheel, buyBpPrime,
  subscribeBpProgress,
  adminResetBp, adminSetPrime, adminResetTasks, adminAddLbk, adminGetAllBpProgress,
  BP_NORMAL_REWARDS, BP_PRIME_REWARDS, BP_DAILY_TASKS, BP_WEEKLY_TASKS,
  BP_PRIME_TASKS, BP_WHEEL_TABLE, BP_MAX_LEVEL, BP_LBK_PER_LEVEL,
  BP_PRIME_COST, BP_SEASON_ID, BP_WHEEL_EVERY,
} from "./battlepass.js";

// ── СТАН ─────────────────────────────────────────────────────────────

let _bpData       = null;   // поточний прогрес гравця
let _bpUnsub      = null;   // realtime підписка
let _bpTab        = "pass"; // "pass" | "tasks" | "prime"
let _bpWheelOpen  = false;
let _bpCurrentUser = null;
let _bpGameState   = null;
let _bpCallbacks   = null;  // { showToast, openModal, closeModal, saveData, renderInventory, updateBalanceDisplay }

// ── ІНІЦІАЛІЗАЦІЯ ─────────────────────────────────────────────────────

export async function initBattlePass(currentUser, gameState, callbacks) {
  _bpCurrentUser = currentUser;
  _bpGameState   = gameState;
  _bpCallbacks   = callbacks;

  // Завантажуємо/ініціалізуємо прогрес
  _bpData = await syncBpTasks(currentUser.uid);

  // Realtime підписка
  if (_bpUnsub) _bpUnsub();
  _bpUnsub = subscribeBpProgress(currentUser.uid, data => {
    if (!data) return;
    _bpData = data;
    const page = document.getElementById("page-battlepass");
    if (page && page.style.display !== "none") _renderBpPage();
  });

  injectBpStyles();
  _renderBpPage();
}

export function destroyBattlePass() {
  if (_bpUnsub) { _bpUnsub(); _bpUnsub = null; }
  _bpData = null;
}

// ── ХУКИ ДЛЯ ЗАВДАНЬ ─────────────────────────────────────────────────
// Виклич ці функції з script.js у відповідних місцях

export async function bpHookOpenCase(count = 1) {
  await _runBpHook("openCases", count);
}
export async function bpHookCraft(count = 1) {
  await _runBpHook("craftItems", count);
}
export async function bpHookSpend(amount) {
  await _runBpHook("spendCoins", amount);
}
export async function bpHookEarn(amount) {
  await _runBpHook("earnCoins", amount);
}
export async function bpHookMarketSell(count = 1) {
  await _runBpHook("marketSell", count);
}
export async function bpHookMarketBuy(count = 1) {
  await _runBpHook("marketBuy", count);
}
export async function bpHookTrade(count = 1) {
  await _runBpHook("tradeComplete", count);
}
export async function bpHookGift(count = 1) {
  await _runBpHook("sendGift", count);
}
export async function bpHookLogin() {
  await _runBpHook("loginDays", 1);
}
export async function bpHookMellCoins(amount) {
  await _runBpHook("mellCoins", amount);
}

async function _runBpHook(type, amount) {
  if (!_bpCurrentUser) return;
  try {
    const completed = await progressBpTask(_bpCurrentUser.uid, type, amount);
    if (completed && completed.length > 0) {
      completed.forEach(t => {
        if (_bpCallbacks?.showToast)
          _bpCallbacks.showToast("✅ БП завдання: " + t.title, "success");
      });
    }
  } catch (e) {
    console.warn("bpHook error:", e);
  }
}

// ── РЕНДЕР СТОРІНКИ ───────────────────────────────────────────────────

function _renderBpPage() {
  const page = document.getElementById("page-battlepass");
  if (!page) return;
  if (!_bpData) {
    page.innerHTML = '<div class="empty-state">⏳ Завантаження батлпасу...</div>';
    return;
  }

  const level   = _bpData.level   || 0;
  const lbk     = _bpData.lbk     || 0;
  const prime   = !!_bpData.prime;
  const lbkNext = (level + 1) * BP_LBK_PER_LEVEL;
  const lbkCur  = lbk - level * BP_LBK_PER_LEVEL;
  const pct     = Math.min(100, Math.round((lbkCur / BP_LBK_PER_LEVEL) * 100));

  page.innerHTML = `
    <div class="bp-page">

      <!-- Хедер -->
      <div class="bp-hero">
        <div class="bp-hero-season">☀️ SummerHeat 2026</div>
        <div class="bp-hero-title">BATTLE PASS</div>
        <div class="bp-hero-sub">Сезон обмежений — не пропусти нагороди!</div>

        <div class="bp-level-row">
          <div class="bp-level-badge">${level}</div>
          <div class="bp-level-bar-wrap">
            <div class="bp-level-bar-label">
              <span>Рівень ${level}</span>
              <span>${lbkCur} / ${BP_LBK_PER_LEVEL} ЛБК</span>
            </div>
            <div class="bp-level-bar">
              <div class="bp-level-fill" style="width:${pct}%"></div>
            </div>
          </div>
          <div class="bp-level-badge">${Math.min(BP_MAX_LEVEL, level + 1)}</div>
        </div>

        ${!prime ? `
          <button class="bp-prime-buy-btn" onclick="bpBuyPrime()">
            👑 Активувати ПРАЙМ — ${BP_PRIME_COST} 💰
          </button>
        ` : `
          <div class="bp-prime-active">👑 ПРАЙМ АКТИВОВАНО</div>
        `}
      </div>

      <!-- Таби -->
      <div class="bp-tabs">
        <button class="bp-tab ${_bpTab === 'pass' ? 'active' : ''}" onclick="bpSetTab('pass')">🎁 Нагороди</button>
        <button class="bp-tab ${_bpTab === 'tasks' ? 'active' : ''}" onclick="bpSetTab('tasks')">📋 Завдання</button>
        ${prime ? `<button class="bp-tab ${_bpTab === 'prime' ? 'active' : ''}" onclick="bpSetTab('prime')">👑 Прайм</button>` : ''}
      </div>

      <!-- Вміст таба -->
      <div id="bp-tab-content">
        ${_renderBpTabContent()}
      </div>
    </div>
  `;
}

function _renderBpTabContent() {
  if (_bpTab === "pass")  return _renderBpPassTab();
  if (_bpTab === "tasks") return _renderBpTasksTab();
  if (_bpTab === "prime") return _renderBpPrimeTab();
  return "";
}

// ── СТРІЧКА НАГОРОД ──────────────────────────────────────────────────

function _renderBpPassTab() {
  const level  = _bpData.level  || 0;
  const prime  = !!_bpData.prime;
  const cNorm  = _bpData.claimedNormal  || [];
  const cPrime = _bpData.claimedPrime   || [];
  const cWheel = _bpData.claimedWheels  || [];

  const html = Array.from({ length: BP_MAX_LEVEL }, (_, i) => i + 1).map(lvl => {
    const normR  = BP_NORMAL_REWARDS.find(r => r.level === lvl);
    const primeR = BP_PRIME_REWARDS.find(r => r.level === lvl);
    const reached   = lvl <= level;
    const isWheel   = normR?.type === "wheel";
    const nClaimed  = cNorm.includes(lvl) || (isWheel && cWheel.includes(lvl));
    const pClaimed  = cPrime.includes(lvl);
    const isCurrent = lvl === level + 1;

    return `
      <div class="bp-lvl-block ${reached ? 'bp-reached' : ''} ${isWheel ? 'bp-wheel-block' : ''} ${isCurrent ? 'bp-current-block' : ''}">
        <!-- Лінія зліва -->
        <div class="bp-line ${reached ? 'bp-line-done' : ''}"></div>

        <!-- Номер -->
        <div class="bp-lvl-num ${reached ? 'bp-lvl-num-done' : ''} ${isCurrent ? 'bp-lvl-num-current' : ''}">
          ${reached ? '✓' : lvl}
        </div>

        <!-- Нагороди -->
        <div class="bp-rewards-pair">
          <!-- Звичайна -->
          <div class="bp-reward-box ${nClaimed ? 'bp-box-claimed' : ''} ${reached && !nClaimed ? 'bp-box-ready' : ''} ${!reached ? 'bp-box-locked' : ''}"
        onclick="${reached && !nClaimed ? 'bpClaimLevel(' + lvl + ',\'normal\')' : ''}">
            <div class="bp-reward-box-icon">${_rewardIcon(normR)}</div>
            <div class="bp-reward-box-label">${normR?.label || '—'}</div>
            ${nClaimed ? '<div class="bp-box-check">✅</div>' : ''}
            ${reached && !nClaimed ? '<div class="bp-box-claim-hint">Забрати!</div>' : ''}
          </div>

          <!-- Прайм -->
          <div class="bp-reward-box bp-reward-box-prime ${!prime ? 'bp-box-prime-locked' : ''} ${pClaimed ? 'bp-box-claimed' : ''} ${reached && prime && !pClaimed ? 'bp-box-ready bp-box-ready-prime' : ''}"
       onclick="${reached && prime && !pClaimed ? 'bpClaimLevel(' + lvl + ',\'prime\')' : ''}">
            <div class="bp-reward-box-icon">${_rewardIcon(primeR)}</div>
            <div class="bp-reward-box-label">${primeR?.label || '—'}</div>
            ${!prime ? '<div class="bp-prime-lock">🔒</div>' : ''}
            ${pClaimed ? '<div class="bp-box-check">✅</div>' : ''}
            ${reached && prime && !pClaimed ? '<div class="bp-box-claim-hint" style="color:#ffe066;">Забрати!</div>' : ''}
          </div>
        </div>
      </div>
    `;
  }).join("");

  return `
    <div class="bp-tracks-legend">
      <div class="bp-track-label">
        <div class="bp-track-dot" style="background:var(--accent)"></div>
        Звичайний
      </div>
      <div class="bp-track-label">
        <div class="bp-track-dot" style="background:var(--gold)"></div>
        👑 Прайм
      </div>
      <div class="bp-track-label" style="color:var(--text-muted);font-size:11px;">
        Рівень ${level} / ${BP_MAX_LEVEL}
      </div>
    </div>
    <div class="bp-pass-strip">${html}</div>
  `;
}

function _rewardIcon(reward) {
  if (!reward) return '<div class="bp-reward-img">—</div>';
  if (reward.type === "wheel")
    return '<div class="bp-reward-img bp-reward-wheel">🎡</div>';
if (reward.type === "medal")
  return `<img class="bp-reward-img" src="${reward.img}" onerror="this.src='img/placeholder.png'" style="width:44px;height:44px;object-fit:contain;">`;
  if (reward.type === "coins")
    return `<div class="bp-reward-img">💰<br><small>${reward.amount}</small></div>`;
  if (reward.type === "lbk")
    return `<div class="bp-reward-img">⚡<br><small>${reward.amount}</small></div>`;
if (reward.type === "case")
  return `<img class="bp-reward-img" src="img/cases/${reward.caseId}.png" onerror="this.src='img/placeholder.png'" style="width:44px;height:44px;object-fit:contain;">`;
  return '<div class="bp-reward-img">🎁</div>';
}

// ── ЗАВДАННЯ ─────────────────────────────────────────────────────────

function _renderBpTasksTab() {
  const dailyT  = _bpData.dailyTasks  || [];
  const weeklyT = _bpData.weeklyTasks || [];
  const allDefs = [...BP_DAILY_TASKS, ...BP_WEEKLY_TASKS];

  const renderTaskList = (tasks, defs, title, emoji) => {
    if (!tasks.length) return `<div style="color:var(--text-muted);font-size:13px;padding:10px 0;">Немає завдань</div>`;
    return tasks.map(t => {
      const def = defs.find(d => d.id === t.id);
      if (!def) return "";
      const pct = Math.min(100, Math.round(((t.progress || 0) / def.goal) * 100));
      const done = !!t.done;
      const claimed = !!t.claimed;
      return `
        <div class="bp-task ${done ? 'done' : ''} ${claimed ? 'claimed' : ''}">
          <div class="bp-task-header">
            <div class="bp-task-title">${def.title}</div>
            <div class="bp-task-reward">
              <span style="color:var(--accent);">+${def.lbk} ЛБК</span>
              ${def.bonus ? ' · ' + _bonusLabel(def.bonus) : ''}
            </div>
          </div>
          <div class="bp-task-bar-wrap">
            <div class="bp-task-bar">
              <div class="bp-task-fill" style="width:${pct}%"></div>
            </div>
            <span class="bp-task-prog">${t.progress || 0} / ${def.goal}</span>
          </div>
          ${done && !claimed
            ? `<button class="bp-task-claim-btn" onclick="bpClaimTask('${t.id}')">🎁 Забрати</button>`
            : claimed
            ? `<div class="bp-task-claimed-lbl">✅ Отримано</div>`
            : ''}
        </div>
      `;
    }).join("");
  };

  return `
    <div class="bp-tasks-wrap">
      <div class="bp-tasks-section">
        <div class="bp-tasks-title">📅 Щоденні завдання</div>
        ${renderTaskList(dailyT, BP_DAILY_TASKS, "Щоденні", "📅")}
      </div>
      <div class="bp-tasks-section">
        <div class="bp-tasks-title">📆 Щотижневі завдання</div>
        ${renderTaskList(weeklyT, BP_WEEKLY_TASKS, "Щотижневі", "📆")}
      </div>
    </div>
  `;
}

function _renderBpPrimeTab() {
  const primeT = _bpData.primeTasks || [];
  if (!primeT.length) {
    return `<div style="color:var(--text-muted);font-size:14px;padding:20px;text-align:center;">Праймові завдання завантажуються...</div>`;
  }
  return `
    <div class="bp-tasks-wrap">
      <div class="bp-tasks-section">
        <div class="bp-tasks-title">👑 Праймові завдання</div>
        ${primeT.map(t => {
          const def = BP_PRIME_TASKS.find(d => d.id === t.id);
          if (!def) return "";
          const pct = Math.min(100, Math.round(((t.progress || 0) / def.goal) * 100));
          return `
            <div class="bp-task prime ${t.done ? 'done' : ''} ${t.claimed ? 'claimed' : ''}">
              <div class="bp-task-header">
                <div class="bp-task-title">${def.title}</div>
                <div class="bp-task-reward">
                  <span style="color:#ffe066;">+${def.lbk} ЛБК</span>
                  ${def.bonus ? ' · ' + _bonusLabel(def.bonus) : ''}
                </div>
              </div>
              <div class="bp-task-bar-wrap">
                <div class="bp-task-bar" style="background:rgba(255,215,0,0.15);">
                  <div class="bp-task-fill" style="width:${pct}%;background:linear-gradient(90deg,#ffe066,#ffaa00)"></div>
                </div>
                <span class="bp-task-prog">${t.progress || 0} / ${def.goal}</span>
              </div>
              ${t.done && !t.claimed
                ? `<button class="bp-task-claim-btn prime" onclick="bpClaimTask('${t.id}')">👑 Забрати</button>`
                : t.claimed
                ? `<div class="bp-task-claimed-lbl">✅ Отримано</div>`
                : ''}
            </div>
          `;
        }).join("")}
      </div>
    </div>
  `;
}

function _bonusLabel(bonus) {
  if (!bonus) return "";
  if (bonus.type === "coins") return `+${bonus.amount} 💰`;
  if (bonus.type === "case")  return `📦 ${bonus.caseId}`;
  return "";
}

// ── ДІЇ ──────────────────────────────────────────────────────────────

window.bpSetTab = function(tab) {
  _bpTab = tab;
  const content = document.getElementById("bp-tab-content");
  if (content) content.innerHTML = _renderBpTabContent();
  document.querySelectorAll(".bp-tab").forEach(b =>
    b.classList.toggle("active", b.textContent.trim().includes(
      tab === "pass" ? "Нагород" : tab === "tasks" ? "Завдання" : "Прайм"
    ))
  );
};

window.bpClaimLevel = async function(level, track) {
  if (!_bpCurrentUser || !_bpCallbacks) return;
  const { showToast, openModal, closeModal, renderInventory, updateBalanceDisplay } = _bpCallbacks;

  const reward = track === "prime"
    ? (BP_PRIME_REWARDS.find(r => r.level === level))
    : (BP_NORMAL_REWARDS.find(r => r.level === level));

  if (reward?.type === "wheel") {
    await _openWheelModal(level, track);
    return;
  }

  try {
    const result = await claimBpLevelReward(
      _bpCurrentUser.uid, level, track, _bpGameState,
      window._CASES_LIST ? Object.fromEntries(window._CASES_LIST.map(c => [c.id, c])) : {}
    );
    if (result.type === "wheel") {
      await _openWheelModal(level, track);
      return;
    }
    await _syncAfterClaim();
    if (renderInventory) renderInventory();
    if (updateBalanceDisplay) updateBalanceDisplay();
    _showRewardModal(result.awarded);
  } catch (e) {
    if (showToast) showToast("Помилка: " + e.message, "error");
  }
};

window.bpClaimTask = async function(taskId) {
  if (!_bpCurrentUser || !_bpCallbacks) return;
  const { showToast, renderInventory, updateBalanceDisplay } = _bpCallbacks;
  try {
    const casesMap = window._CASES_LIST
      ? Object.fromEntries(window._CASES_LIST.map(c => [c.id, c]))
      : {};
    const result = await claimBpTaskReward(_bpCurrentUser.uid, taskId, _bpGameState, casesMap);
    await _syncAfterClaim();
    if (renderInventory) renderInventory();
    if (updateBalanceDisplay) updateBalanceDisplay();
    showToast("🎉 +" + result.lbkGained + " ЛБК!", "success");
  } catch (e) {
    if (showToast) showToast("Помилка: " + e.message, "error");
  }
};

window.bpBuyPrime = async function() {
  if (!_bpCurrentUser || !_bpCallbacks) return;
  const { showToast, openModal, closeModal, updateBalanceDisplay } = _bpCallbacks;
  const bal = _bpGameState?.balance ?? 0;
  if (bal < BP_PRIME_COST) {
    showToast("Потрібно " + BP_PRIME_COST + " нікусів!", "error"); return;
  }
  openModal(
    `<h2 class="modal-title">👑 Активувати Прайм</h2>
    <div style="text-align:center;margin-bottom:16px;">
      <div style="font-size:48px;margin-bottom:8px;">👑</div>
      <div style="font-weight:700;font-size:18px;color:var(--gold);">BattlePass PRIME</div>
      <div style="color:var(--text-muted);font-size:13px;margin-top:8px;">Додаткова стрічка нагород + 5 ексклюзивних завдань</div>
      <div style="color:var(--gold);font-weight:800;font-size:22px;margin-top:12px;">${BP_PRIME_COST} 💰</div>
    </div>
    <div style="display:flex;gap:8px;">
      <button class="btn-primary" style="flex:1;" onclick="bpConfirmPrime()">👑 Активувати</button>
      <button class="btn-secondary" style="flex:1;" onclick="closeModal()">Скасувати</button>
    </div>`
  );
};

window.bpConfirmPrime = async function() {
  const { showToast, closeModal, updateBalanceDisplay } = _bpCallbacks;
  try {
    await buyBpPrime(_bpCurrentUser.uid, _bpGameState);
    await _syncAfterClaim();
    if (updateBalanceDisplay) updateBalanceDisplay();
    closeModal();
    showToast("👑 Прайм активовано!", "success");
    _bpTab = "prime";
    _renderBpPage();
  } catch (e) {
    showToast("Помилка: " + e.message, "error");
  }
};

// ── МОДАЛКА НАГОРОДИ ─────────────────────────────────────────────────

function _showRewardModal(awarded) {
  const { openModal } = _bpCallbacks;
  if (!awarded || !awarded.length || !openModal) return;
  const html = awarded.map(a => {
    if (a.type === "coins") return `<div class="bp-awarded-item"><span style="font-size:32px;">💰</span><div style="font-weight:700;">+${a.amount} нікусів</div></div>`;
    if (a.type === "lbk")   return `<div class="bp-awarded-item"><span style="font-size:32px;">⚡</span><div style="font-weight:700;">+${a.amount} ЛБК</div></div>`;
    if (a.type === "case")  return `<div class="bp-awarded-item"><img src="img/cases/${a.caseId}.png" onerror="this.src='img/placeholder.png'" style="width:56px;height:56px;object-fit:contain;"><div style="font-weight:700;">${a.name || a.caseId}</div></div>`;
    if (a.type === "medal") return `<div class="bp-awarded-item"><span style="font-size:32px;">🏅</span><div style="font-weight:700;">${a.name}</div></div>`;
    return "";
  }).join("");
  openModal(`
    <h2 class="modal-title">🎉 Нагорода отримана!</h2>
    <div class="bp-awarded-grid">${html}</div>
    <button class="btn-primary btn-full" onclick="closeModal()" style="margin-top:16px;">Чудово!</button>
  `);
}

// ── СИНХРОНІЗАЦІЯ gameState ───────────────────────────────────────────

async function _syncAfterClaim() {
  if (!_bpCurrentUser || !_bpGameState) return;
  try {
    const { getDoc, doc } = await import("https://www.gstatic.com/firebasejs/10.7.0/firebase-firestore.js");
    const { db } = await import("./firebase.js");
    const snap = await getDoc(doc(db, "users", _bpCurrentUser.uid));
    if (snap.exists()) {
      const data = snap.data();
      _bpGameState.balance   = data.balance   ?? _bpGameState.balance;
      _bpGameState.inventory = data.inventory ?? _bpGameState.inventory;
    }
    _bpData = await getBpProgress(_bpCurrentUser.uid);
  } catch (e) {
    console.warn("_syncAfterClaim error:", e);
  }
}

// ── АДМІН ПАНЕЛЬ БП ───────────────────────────────────────────────────

export async function renderAdminBpPanel(callbacks) {
  const { openModal, showToast } = callbacks;
  let allProgress = [];
  try { allProgress = await adminGetAllBpProgress(); } catch (e) {}

  const rows = allProgress.map(bp => `
    <div class="admin-bp-row">
      <div class="admin-bp-info">
        <span class="admin-bp-uid">${bp.uid.slice(0, 8)}…</span>
        <span>Рів. <b>${bp.level || 0}</b></span>
        <span>⚡ <b>${bp.lbk || 0}</b> ЛБК</span>
        ${bp.prime ? '<span style="color:var(--gold);">👑 Прайм</span>' : '<span style="color:var(--text-muted);">Без прайму</span>'}
      </div>
      <div class="admin-bp-actions">
        <button class="btn-sm btn-buy"    onclick="adminBpAddLbk('${bp.uid}')">⚡+</button>
        <button class="btn-sm btn-buy"    onclick="adminBpSetPrime('${bp.uid}',true)" style="background:rgba(255,215,0,0.15);border-color:#FFD700;color:#FFD700;">👑+</button>
        <button class="btn-sm btn-cancel" onclick="adminBpSetPrime('${bp.uid}',false)">👑-</button>
        <button class="btn-sm btn-open"   onclick="adminBpResetTasks('${bp.uid}','all')">🔄 Зав.</button>
        <button class="btn-sm btn-cancel" onclick="adminBpReset('${bp.uid}')">🗑 Скинути</button>
      </div>
    </div>
  `).join("");

  openModal(`
    <h2 class="modal-title">🏆 Адмін — BattlePass</h2>
    <div style="max-height:420px;overflow-y:auto;display:flex;flex-direction:column;gap:8px;margin-bottom:14px;">
      ${rows.length ? rows : '<div style="color:var(--text-muted);text-align:center;padding:20px;">Немає прогресу</div>'}
    </div>
    <button class="btn-secondary btn-full" onclick="closeModal()">Закрити</button>
  `, true);

  // Реєструємо глобальні функції для адмін кнопок
  window.adminBpAddLbk = (uid) => _adminBpAddLbk(uid, callbacks);
  window.adminBpSetPrime = (uid, val) => _adminBpSetPrime(uid, val, callbacks);
  window.adminBpResetTasks = (uid, type) => _adminBpResetTasks(uid, type, callbacks);
  window.adminBpReset = (uid) => _adminBpReset(uid, callbacks);
}

async function _adminBpAddLbk(uid, callbacks) {
  const { openModal, showToast, closeModal } = callbacks;
  openModal(`
    <h2 class="modal-title">⚡ Додати ЛБК</h2>
    <input type="number" id="admin-bp-lbk-amt" class="form-input" value="500" min="1"
      style="width:100%;box-sizing:border-box;margin:12px 0;">
    <div style="display:flex;gap:8px;">
      <button class="btn-primary" style="flex:1;" onclick="adminBpConfirmLbk('${uid}')">Додати</button>
      <button class="btn-secondary" style="flex:1;" onclick="closeModal()">Скасувати</button>
    </div>
  `);
  window.adminBpConfirmLbk = async (targetUid) => {
    const amt = parseInt(document.getElementById("admin-bp-lbk-amt")?.value);
    if (isNaN(amt) || amt <= 0) return;
    try {
      await adminAddLbk(targetUid, amt);
      closeModal();
      showToast("✅ Додано " + amt + " ЛБК!", "success");
    } catch (e) { showToast("Помилка: " + e.message, "error"); }
  };
}

async function _adminBpSetPrime(uid, val, callbacks) {
  const { showToast } = callbacks;
  try {
    await adminSetPrime(uid, val);
    showToast(val ? "👑 Прайм надано!" : "👑 Прайм забрано!", "success");
    renderAdminBpPanel(callbacks); // оновлюємо панель
  } catch (e) { showToast("Помилка: " + e.message, "error"); }
}

async function _adminBpResetTasks(uid, type, callbacks) {
  const { showToast } = callbacks;
  try {
    await adminResetTasks(uid, type);
    showToast("🔄 Завдання скинуто!", "success");
  } catch (e) { showToast("Помилка: " + e.message, "error"); }
}

async function _adminBpReset(uid, callbacks) {
  const { showToast, openModal, closeModal } = callbacks;
  openModal(`
    <h2 class="modal-title">🗑 Скинути БП гравця?</h2>
    <p style="color:var(--text-muted);">Весь прогрес, нагороди та завдання будуть видалені!</p>
    <div style="display:flex;gap:8px;margin-top:12px;">
      <button class="btn-cancel" style="flex:1;" onclick="adminBpConfirmReset('${uid}')">🗑 Скинути</button>
      <button class="btn-secondary" style="flex:1;" onclick="closeModal()">Скасувати</button>
    </div>
  `);
  window.adminBpConfirmReset = async (targetUid) => {
    try {
      await adminResetBp(targetUid);
      closeModal();
      showToast("🗑 БП скинуто!", "success");
      renderAdminBpPanel(callbacks);
    } catch (e) { showToast("Помилка: " + e.message, "error"); }
  };
}

// ── КОЛЕСО ФАРТУНИ (МеллКрафт-стиль) ────────────────────────────────

// Кеш зображень
const _bpImgCache = {};
function _bpLoadImg(src) {
  return new Promise(resolve => {
    if (_bpImgCache[src]) { resolve(_bpImgCache[src]); return; }
    const img = new Image();
    img.onload  = () => { _bpImgCache[src] = img; resolve(img); };
    img.onerror = () => resolve(null);
    img.src = src;
  });
}

// Offscreen canvas для статичного колеса
let _bpOffscreen = null;
let _bpOffscreenSegs = null;

// Будуємо сегменти з BP_WHEEL_TABLE
function _bpBuildSegments() {
  const total = BP_WHEEL_TABLE.reduce((s, e) => s + e.weight, 0);
  const COLORS = ["#e4b84d","#5ddb8a","#5db8ff","#e4754d","#b45dff","#ff5d8a","#5dffe4","#ffe066","#ff8c00","#aaffaa"];
  return BP_WHEEL_TABLE.map((e, i) => ({
    ...e,
    angle: (e.weight / total) * Math.PI * 2,
    color: i % 2 === 0 ? (COLORS[i % COLORS.length] + "ee") : (COLORS[i % COLORS.length] + "99"),
    img: e.caseId ? `img/cases/${e.caseId}.png` : null,
  }));
}

async function _bpPreloadImgs(segs) {
  await Promise.all(segs.map(s => s.img ? _bpLoadImg(s.img) : Promise.resolve()));
}

function _bpBuildOffscreen(segs) {
  const dpr  = window.devicePixelRatio || 1;
  const size = 260;
  const off  = document.createElement("canvas");
  off.width  = size * dpr;
  off.height = size * dpr;
  const ctx  = off.getContext("2d");
  ctx.scale(dpr, dpr);
  const cx = size / 2, cy = size / 2, R = cx - 8;

  // Фон
  ctx.beginPath();
  ctx.arc(cx, cy, R, 0, Math.PI * 2);
  ctx.fillStyle = "#0d0d1a";
  ctx.fill();

  // Сегменти
  let startAngle = 0;
  segs.forEach(seg => {
    const endAngle = startAngle + seg.angle;
    const midAngle = startAngle + seg.angle / 2;

    ctx.beginPath();
    ctx.moveTo(cx, cy);
    ctx.arc(cx, cy, R, startAngle, endAngle);
    ctx.closePath();
    ctx.fillStyle = seg.color;
    ctx.fill();
    ctx.strokeStyle = "rgba(255,255,255,0.12)";
    ctx.lineWidth = 1.5;
    ctx.stroke();

    // Картинка кейсу або емодзі
    const imgX = cx + Math.cos(midAngle) * R * 0.62;
    const imgY = cy + Math.sin(midAngle) * R * 0.62;
    const cached = seg.img ? _bpImgCache[seg.img] : null;
    ctx.save();
    ctx.translate(imgX, imgY);
    ctx.rotate(midAngle + Math.PI / 2);
    if (cached) {
      const sz = Math.min(R * 0.38, 52);
      ctx.drawImage(cached, -sz/2, -sz/2, sz, sz);
    } else {
      ctx.font = `${Math.max(10, Math.min(R * 0.18, 20))}px Arial`;
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillStyle = "#fff";
      ctx.fillText("📦", 0, 0);
    }
    ctx.restore();

    startAngle = endAngle;
  });

  // Крапки по краю
  for (let i = 0; i < 24; i++) {
    const a = (i / 24) * Math.PI * 2;
    ctx.beginPath();
    ctx.arc(cx + (R-6)*Math.cos(a), cy + (R-6)*Math.sin(a), 3, 0, Math.PI*2);
    ctx.fillStyle = i % 2 === 0 ? "#FFD700" : "rgba(255,255,255,0.6)";
    ctx.fill();
  }

  // Обідок
  ctx.beginPath();
  ctx.arc(cx, cy, R, 0, Math.PI*2);
  ctx.strokeStyle = "rgba(255,215,0,0.55)";
  ctx.lineWidth = 3;
  ctx.stroke();

  // Центр
  const grad = ctx.createRadialGradient(cx, cy, 0, cx, cy, 28);
  grad.addColorStop(0, "#fff");
  grad.addColorStop(0.6, "#e0e0e0");
  grad.addColorStop(1, "#999");
  ctx.beginPath();
  ctx.arc(cx, cy, 28, 0, Math.PI*2);
  ctx.fillStyle = grad;
  ctx.fill();
  ctx.strokeStyle = "rgba(255,215,0,0.9)";
  ctx.lineWidth = 2.5;
  ctx.stroke();
  ctx.font = "bold 15px Arial";
  ctx.fillStyle = "#222";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText("🎡", cx, cy+1);

  _bpOffscreen = off;
  _bpOffscreenSegs = segs;
}

function _bpDrawWheel(canvas, segs, rotation) {
  const dpr = window.devicePixelRatio || 1;
  const logW = 260, logH = 260;
  if (canvas.width !== logW*dpr || canvas.height !== logH*dpr) {
    canvas.width  = logW * dpr;
    canvas.height = logH * dpr;
    canvas.style.width  = "260px";
    canvas.style.height = "260px";
  }
  const ctx = canvas.getContext("2d");
  const cx = logW/2, cy = logH/2;
  if (!_bpOffscreen || _bpOffscreenSegs !== segs) _bpBuildOffscreen(segs);
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.save();
  ctx.scale(dpr, dpr);
  ctx.translate(cx, cy);
  ctx.rotate(rotation);
  ctx.drawImage(_bpOffscreen, -cx, -cy, logW, logH);
  ctx.restore();
}

function _bpDrawArrow(canvas) {
  const ctx = canvas.getContext("2d");
  const w = canvas.width, h = canvas.height;
  ctx.clearRect(0, 0, w, h);
  const ax = w/2;
  ctx.beginPath();
  ctx.moveTo(ax, h);
  ctx.lineTo(ax-11, 0);
  ctx.lineTo(ax+11, 0);
  ctx.closePath();
  const g = ctx.createLinearGradient(0, 0, 0, h);
  g.addColorStop(0, "#FFD700");
  g.addColorStop(1, "#FF6600");
  ctx.fillStyle = g;
  ctx.fill();
  ctx.strokeStyle = "rgba(255,255,255,0.85)";
  ctx.lineWidth = 1.5;
  ctx.stroke();
}

// Spring-стан колеса БП
let _bpSpring = {
  active: false, startY: 0, power: 0, spinning: false, rotation: 0, animId: null,
};

function _bpSpringPull(e) {
  if (_bpSpring.spinning || !_bpSpring.active) return;
  const clientY = e.touches ? e.touches[0].clientY : e.clientY;
  const dy = clientY - _bpSpring.startY;
  _bpSpring.power = Math.max(0, Math.min(1, dy / 120));
  _bpUpdateSpringUI();
}

function _bpSpringRelease(level, track) {
  if (!_bpSpring.active || _bpSpring.spinning) return;
  _bpSpring.active = false;
  document.removeEventListener("mousemove",  _bpSpring._pull);
  document.removeEventListener("mouseup",    _bpSpring._release);
  document.removeEventListener("touchmove",  _bpSpring._pull);
  document.removeEventListener("touchend",   _bpSpring._release);
  const power = _bpSpring.power;
  _bpSpring.power = 0;
  _bpUpdateSpringUI();
  if (power > 0.05) _bpDoSpinAnimation(level, track, power);
}

function _bpUpdateSpringUI() {
  const fill = document.getElementById("bp-wheel-spring-fill");
  const hint = document.getElementById("bp-wheel-spring-hint");
  const canvas = document.getElementById("bp-wheel-canvas");
  if (fill) fill.style.width = (_bpSpring.power * 100) + "%";
  if (canvas) canvas.classList.toggle("bp-wheel-charged", _bpSpring.power > 0.3);
  if (hint) {
    const p = _bpSpring.power;
    if (p < 0.05) hint.textContent = "Затисни і тягни вниз для кручення";
    else if (p < 0.4) hint.textContent = "🟡 Слабке кручення";
    else if (p < 0.75) hint.textContent = "🟠 Середнє кручення";
    else hint.textContent = "🔥 Максимальна сила!";
  }
}

function _bpAttachSpring(canvas, level, track) {
  canvas.addEventListener("mousedown", e => {
    if (_bpSpring.spinning) return;
    _bpSpring.active = true;
    _bpSpring.startY = e.clientY;
    _bpSpring.power  = 0;
    _bpUpdateSpringUI();
    _bpSpring._pull    = _bpSpringPull;
    _bpSpring._release = () => _bpSpringRelease(level, track);
    document.addEventListener("mousemove", _bpSpring._pull);
    document.addEventListener("mouseup",   _bpSpring._release);
  });
  canvas.addEventListener("touchstart", e => {
    if (_bpSpring.spinning) return;
    _bpSpring.active = true;
    _bpSpring.startY = e.touches[0].clientY;
    _bpSpring.power  = 0;
    _bpUpdateSpringUI();
    _bpSpring._pull    = _bpSpringPull;
    _bpSpring._release = () => _bpSpringRelease(level, track);
    document.addEventListener("touchmove",  _bpSpring._pull, { passive: true });
    document.addEventListener("touchend",   _bpSpring._release);
  }, { passive: true });
}

async function _openWheelModal(level, track) {
  const { openModal } = _bpCallbacks;

  const segs = _bpBuildSegments();
  await _bpPreloadImgs(segs);
  _bpOffscreen = null;
  _bpBuildOffscreen(segs);

  _bpSpring = { active: false, startY: 0, power: 0, spinning: false, rotation: _bpSpring.rotation || 0, animId: null };

  openModal(`
    <h2 class="modal-title">🎡 Колесо Фортуни — Рівень ${level}</h2>
    <p style="color:var(--text-muted);font-size:13px;text-align:center;margin-bottom:10px;">
      Тягни колесо вниз щоб розкрутити!
    </p>
    <div class="bp-wheel-modal-wrap">
      <canvas id="bp-wheel-arrow" width="40" height="22"></canvas>
      <canvas id="bp-wheel-canvas" width="260" height="260" style="width:260px;height:260px;border-radius:50%;"></canvas>
    </div>
    <div class="bp-wheel-spring-bar-wrap">
      <div class="bp-wheel-spring-track">
        <div class="bp-wheel-spring-fill" id="bp-wheel-spring-fill" style="width:0%"></div>
      </div>
      <div class="bp-wheel-spring-hint" id="bp-wheel-spring-hint">Затисни і тягни вниз для кручення</div>
    </div>
    <div id="bp-wheel-result" style="display:none;text-align:center;margin-top:14px;"></div>
    <div style="display:flex;gap:8px;margin-top:14px;">
      <button id="bp-wheel-spin-btn" class="btn-primary" style="flex:1;"
        onclick="_bpManualSpin(${level},'${track}')">🎡 Крутити!</button>
      <button class="btn-secondary" style="flex:1;" onclick="closeModal()">Скасувати</button>
    </div>
  `, false);

  // Малюємо
  requestAnimationFrame(() => {
    const c = document.getElementById("bp-wheel-canvas");
    const a = document.getElementById("bp-wheel-arrow");
    if (c) { _bpDrawWheel(c, segs, _bpSpring.rotation); _bpAttachSpring(c, level, track); }
    if (a) _bpDrawArrow(a);
  });
}

window._bpManualSpin = function(level, track) {
  _bpDoSpinAnimation(level, track, 0.7);
};

async function _bpDoSpinAnimation(level, track, power) {
  const segs = _bpBuildSegments();
  const { showToast, renderInventory, updateBalanceDisplay } = _bpCallbacks;
  const btn = document.getElementById("bp-wheel-spin-btn");
  if (btn) { btn.disabled = true; btn.textContent = "⏳ Крутиться..."; }

  _bpSpring.spinning = true;
  const canvas = document.getElementById("bp-wheel-canvas");
  if (canvas) canvas.style.cursor = "not-allowed";

  // Спочатку отримуємо результат від сервера
  let result;
  try {
    result = await spinBpWheel(_bpCurrentUser.uid, level);
  } catch (e) {
    showToast("Помилка: " + e.message, "error");
    _bpSpring.spinning = false;
    if (btn) { btn.disabled = false; btn.textContent = "🎡 Крутити!"; }
    return;
  }

  // Знаходимо індекс сегмента з призом
  const prize = result.prize;
  let prizeIdx = 0;
  for (let i = 0; i < BP_WHEEL_TABLE.length; i++) {
    const e = BP_WHEEL_TABLE[i];
    if (
      (e.type === "case"  && prize.caseId  === e.caseId) ||
      (e.type === "coins" && prize.amount  === e.amount)  ||
      (e.type === "lbk"   && prize.amount  === e.amount)
    ) { prizeIdx = i; break; }
  }

  // Кут центру цільового сегмента
  let segStart = 0;
  for (let i = 0; i < prizeIdx; i++) segStart += segs[i].angle;
  const segMid = segStart + segs[prizeIdx].angle / 2;
  const halfSeg = segs[prizeIdx].angle / 2;
  const randomOffset = (Math.random() - 0.5) * halfSeg * 0.6;
  const targetAngle = -Math.PI / 2 - segMid + randomOffset;

  const startRot = _bpSpring.rotation;
  const extraRounds = (5 + Math.floor(power * 4)) * Math.PI * 2;
  const curNorm = ((startRot % (Math.PI*2)) + Math.PI*2) % (Math.PI*2);
  const tgtNorm = ((targetAngle % (Math.PI*2)) + Math.PI*2) % (Math.PI*2);
  let diff = tgtNorm - curNorm;
  if (diff < 0) diff += Math.PI * 2;
  const totalRotation = extraRounds + diff;
  const totalDuration = 3000 + power * 2000;
  const startTime = performance.now();

  await new Promise(resolve => {
    function animate(now) {
      const c = document.getElementById("bp-wheel-canvas");
      if (!c) { resolve(); return; }
      const t = Math.min((now - startTime) / totalDuration, 1);
      const ease = 1 - Math.pow(1 - t, 4);
      _bpSpring.rotation = startRot + ease * totalRotation;
      _bpDrawWheel(c, segs, _bpSpring.rotation);
      if (t >= 1) resolve();
      else _bpSpring.animId = requestAnimationFrame(animate);
    }
    _bpSpring.animId = requestAnimationFrame(animate);
  });

  // Показуємо результат
  const resultEl = document.getElementById("bp-wheel-result");
  if (resultEl) {
    resultEl.style.display = "block";
    resultEl.innerHTML = `
      <div style="background:var(--bg-card2);border:2px solid var(--gold);border-radius:12px;padding:16px;">
        <div style="font-size:13px;color:var(--text-muted);margin-bottom:6px;">🎉 Ви отримали!</div>
        <div style="font-weight:800;font-size:18px;color:var(--gold);">${prize.label}</div>
      </div>`;
  }
  if (btn) btn.style.display = "none";

  await _syncAfterClaim();
  if (renderInventory) renderInventory();
  if (updateBalanceDisplay) updateBalanceDisplay();
  showToast("🎡 Виграш: " + prize.label, "success");
  _bpSpring.spinning = false;
}

// ── СТИЛІ ─────────────────────────────────────────────────────────────

function injectBpStyles() {
  if (document.getElementById("bp-styles")) return;
  const s = document.createElement("style");
  s.id = "bp-styles";
  s.textContent = `
    /* ── Загальна обгортка ── */
    .bp-page { padding-bottom: 40px; }

    /* ── Hero ── */
    .bp-hero {
      background: linear-gradient(135deg,
        rgba(255,180,0,0.18) 0%,
        rgba(255,100,0,0.12) 50%,
        rgba(10,180,204,0.1) 100%
      );
      border: 1.5px solid rgba(255,200,0,0.25);
      border-radius: 16px;
      padding: 20px 16px;
      margin-bottom: 14px;
      text-align: center;
      position: relative;
      overflow: hidden;
    }
    .bp-hero::before {
      content: '';
      position: absolute;
      inset: 0;
      background-image:
        linear-gradient(rgba(255,200,0,0.05) 1px, transparent 1px),
        linear-gradient(90deg, rgba(255,200,0,0.05) 1px, transparent 1px);
      background-size: 24px 24px;
      pointer-events: none;
    }
    .bp-hero-season { font-size:12px;font-weight:700;text-transform:uppercase;letter-spacing:2px;color:var(--gold);margin-bottom:4px; }
    .bp-hero-title  { font-family:'Syne',sans-serif;font-size:28px;font-weight:800;color:var(--text);letter-spacing:2px; }
    .bp-hero-sub    { font-size:13px;color:var(--text-muted);margin-top:4px;margin-bottom:16px; }

    .bp-level-row {
      display: flex;
      align-items: center;
      gap: 10px;
      margin-bottom: 14px;
    }
    .bp-level-badge {
      width: 40px; height: 40px;
      border-radius: 50%;
      background: linear-gradient(135deg, var(--accent), var(--gold));
      display: flex; align-items: center; justify-content: center;
      font-weight: 800; font-size: 16px; color: #fff;
      flex-shrink: 0;
      box-shadow: 0 3px 10px rgba(240,125,40,0.4);
    }
    .bp-level-bar-wrap { flex: 1; }
    .bp-level-bar-label {
      display: flex; justify-content: space-between;
      font-size: 11px; color: var(--text-muted); font-weight: 700; margin-bottom: 5px;
    }
    .bp-level-bar {
      height: 10px; background: rgba(255,255,255,0.1);
      border-radius: 5px; overflow: hidden;
    }
    .bp-level-fill {
      height: 100%;
      background: linear-gradient(90deg, #ffe066, #ff8c00);
      border-radius: 5px;
      transition: width 0.5s ease;
      box-shadow: 0 0 8px rgba(255,180,0,0.5);
    }
    .bp-prime-buy-btn {
      width: 100%; padding: 10px;
      background: linear-gradient(135deg, #ffe066, #ffaa00);
      color: #111; font-weight: 800; font-size: 14px;
      border: none; border-radius: 10px; cursor: pointer;
      transition: all 0.2s;
      box-shadow: 0 3px 12px rgba(255,180,0,0.35);
    }
    .bp-prime-buy-btn:hover { filter: brightness(1.08); transform: translateY(-1px); }
    .bp-prime-active {
      padding: 8px 20px;
      background: rgba(255,215,0,0.15);
      border: 1.5px solid var(--gold);
      border-radius: 20px;
      color: var(--gold);
      font-weight: 800;
      font-size: 14px;
      display: inline-block;
    }

    /* ── Таби ── */
    .bp-tabs {
      display: flex; gap: 8px; margin-bottom: 12px;
    }
    .bp-tab {
      flex: 1; padding: 10px;
      border-radius: 10px;
      border: 1.5px solid var(--border);
      background: var(--bg-card);
      color: var(--text-muted);
      font-size: 13px; font-weight: 700;
      cursor: pointer; transition: all 0.2s;
    }
    .bp-tab.active {
      background: linear-gradient(135deg, rgba(255,200,0,0.15), rgba(240,125,40,0.1));
      border-color: var(--gold);
      color: var(--text);
    }

    /* ── Легенда ── */
    .bp-legend {
      display: flex; gap: 16px; margin-bottom: 10px; font-size: 12px; color: var(--text-muted);
    }
    .bp-legend-item { display: flex; align-items: center; gap: 6px; }
    .bp-legend-dot { width: 10px; height: 10px; border-radius: 50%; }

    /* ── Хедер стрічки ── */
    .bp-strip-header {
      display: grid; grid-template-columns: 42px 1fr 1fr;
      gap: 8px; padding: 0 4px; margin-bottom: 6px;
      font-size: 12px; font-weight: 700; color: var(--text-muted);
      text-transform: uppercase; letter-spacing: 0.5px;
      text-align: center;
    }

    /* ── Легенда треків ── */
    .bp-tracks-legend {
      display: flex;
      align-items: center;
      gap: 16px;
      margin-bottom: 12px;
      padding: 8px 12px;
      background: var(--bg-card);
      border-radius: 10px;
      border: 1px solid var(--border);
    }
    .bp-track-label {
      display: flex;
      align-items: center;
      gap: 6px;
      font-size: 12px;
      font-weight: 700;
      color: var(--text-muted);
    }
    .bp-track-dot {
      width: 10px; height: 10px;
      border-radius: 50%;
      flex-shrink: 0;
    }

    /* ── Стрічка рівнів ── */
    .bp-pass-strip {
      display: flex;
      flex-direction: column;
      gap: 0;
      position: relative;
    }

    /* ── Один блок рівня ── */
    .bp-lvl-block {
      display: flex;
      align-items: center;
      gap: 10px;
      padding: 5px 0;
      position: relative;
    }
    .bp-wheel-block {
      background: rgba(255,200,0,0.05);
      border-radius: 12px;
      margin: 4px 0;
      padding: 8px 4px;
    }
    .bp-current-block {
      background: rgba(240,125,40,0.07);
      border-radius: 12px;
      margin: 2px 0;
      padding: 5px 4px;
    }

    /* ── Вертикальна лінія прогресу ── */
    .bp-line {
      position: absolute;
      left: 20px;
      top: 0; bottom: 0;
      width: 2px;
      background: var(--border);
      z-index: 0;
    }
    .bp-line-done { background: linear-gradient(to bottom, var(--accent), var(--gold)); }

    /* ── Номер рівня ── */
    .bp-lvl-num {
      width: 40px; height: 40px;
      border-radius: 50%;
      background: var(--bg-card2);
      border: 2px solid var(--border);
      display: flex; align-items: center; justify-content: center;
      font-weight: 800; font-size: 12px;
      color: var(--text-muted);
      flex-shrink: 0;
      z-index: 1;
      position: relative;
      transition: all 0.2s;
    }
    .bp-lvl-num-done {
      background: linear-gradient(135deg, var(--accent), var(--gold));
      color: #fff;
      border-color: transparent;
      font-size: 16px;
      box-shadow: 0 2px 8px rgba(240,125,40,0.4);
    }
    .bp-lvl-num-current {
      background: var(--bg-card);
      border-color: var(--accent);
      color: var(--accent);
      box-shadow: 0 0 12px rgba(240,125,40,0.3);
    }

    /* ── Пара нагород ── */
    .bp-rewards-pair {
      display: flex;
      gap: 8px;
      flex: 1;
      align-items: stretch;
    }

    /* ── Коробка нагороди ── */
    .bp-reward-box {
      flex: 1;
      background: var(--bg-card);
      border: 1.5px solid var(--border);
      border-radius: 12px;
      padding: 8px 6px;
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 3px;
      position: relative;
      min-height: 72px;
      justify-content: center;
      transition: all 0.18s;
      overflow: hidden;
    }
    .bp-reward-box-prime {
      border-color: rgba(255,215,0,0.25);
      background: rgba(255,215,0,0.04);
    }
    .bp-box-ready {
      border-color: var(--accent);
      background: rgba(240,125,40,0.09);
      cursor: pointer;
      box-shadow: 0 2px 12px rgba(240,125,40,0.18);
    }
    .bp-box-ready:hover { transform: translateY(-2px); box-shadow: 0 5px 16px rgba(240,125,40,0.28); }
    .bp-box-ready-prime {
      border-color: var(--gold);
      background: rgba(255,215,0,0.1);
      box-shadow: 0 2px 12px rgba(255,200,0,0.2);
    }
    .bp-box-claimed { opacity: 0.45; }
    .bp-box-locked  { opacity: 0.35; }
    .bp-box-prime-locked { opacity: 0.3; }

    .bp-reward-box-icon {
      font-size: 22px;
      display: flex; align-items: center; justify-content: center;
      line-height: 1;
    }
    .bp-reward-box-icon img {
      width: 36px; height: 36px; object-fit: contain;
    }
    .bp-reward-box-icon small {
      font-size: 9px; color: var(--text-muted); display: block; text-align: center;
    }
    .bp-reward-box-label {
      font-size: 9px;
      font-weight: 700;
      color: var(--text-muted);
      text-align: center;
      line-height: 1.2;
      max-width: 100%;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
      padding: 0 2px;
    }
    .bp-box-check {
      position: absolute; top: 3px; right: 4px;
      font-size: 10px;
    }
    .bp-prime-lock {
      position: absolute; top: 3px; right: 4px;
      font-size: 10px; opacity: 0.6;
    }
    .bp-box-claim-hint {
      font-size: 8px;
      font-weight: 800;
      color: var(--accent);
      text-transform: uppercase;
      letter-spacing: 0.4px;
    }

    .bp-reward-img {
      font-size: 24px;
      display: flex; flex-direction: column;
      align-items: center; justify-content: center;
      line-height: 1.2;
    }
    .bp-reward-img small { font-size: 9px; color: var(--text-muted); font-weight: 700; }
    .bp-reward-wheel { font-size: 28px; }
    .bp-reward-label {
      font-size: 9px; font-weight: 700; color: var(--text-muted);
      text-align: center; line-height: 1.2; max-width: 100%;
      overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
    }
    .bp-claimed-badge {
      position: absolute; top: 3px; right: 4px; font-size: 11px;
    }
    .bp-lock-icon {
      position: absolute; top: 3px; right: 4px; font-size: 11px; opacity: 0.7;
    }
    .bp-claim-hint {
      font-size: 9px; font-weight: 800; color: var(--accent);
      text-transform: uppercase; letter-spacing: 0.5px;
    }

/* ── Колесо (новий стиль) ── */
.bp-wheel-modal-wrap {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0;
}
#bp-wheel-canvas {
  display: block;
  border-radius: 50%;
  box-shadow: 0 0 30px rgba(255,215,0,0.25), 0 4px 20px rgba(0,0,0,0.4);
  cursor: grab;
  touch-action: none;
  user-select: none;
  transition: box-shadow 0.2s;
}
#bp-wheel-canvas.bp-wheel-charged {
  box-shadow: 0 0 40px rgba(255,165,0,0.6), 0 0 80px rgba(255,100,0,0.3), 0 4px 20px rgba(0,0,0,0.4);
}
.bp-wheel-spring-bar-wrap {
  width: 100%;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
  margin-top: 12px;
}
.bp-wheel-spring-track {
  width: 100%;
  height: 12px;
  background: var(--bg-input);
  border-radius: 6px;
  overflow: hidden;
  border: 1px solid var(--border);
}
.bp-wheel-spring-fill {
  height: 100%;
  border-radius: 6px;
  background: linear-gradient(90deg, #5ddb8a, #ffe066, #ff6030);
  transition: width 0.05s linear;
}
.bp-wheel-spring-hint {
  font-size: 11px;
  color: var(--text-dim);
  text-align: center;
}

    /* ── Завдання ── */
    .bp-tasks-wrap { display: flex; flex-direction: column; gap: 16px; }
    .bp-tasks-section {
      background: var(--bg-card);
      border: 1px solid var(--border);
      border-radius: 12px;
      padding: 14px;
    }
    .bp-tasks-title {
      font-weight: 800; font-size: 15px; color: var(--text);
      margin-bottom: 10px; border-bottom: 1px solid var(--border); padding-bottom: 8px;
    }
    .bp-task {
      background: var(--bg-card2);
      border: 1.5px solid var(--border);
      border-radius: 10px;
      padding: 12px;
      margin-bottom: 8px;
      transition: all 0.2s;
    }
    .bp-task.prime { border-color: rgba(255,215,0,0.3); background: rgba(255,215,0,0.04); }
    .bp-task.done  { border-color: rgba(93,219,138,0.4); background: rgba(93,219,138,0.05); }
    .bp-task.claimed { opacity: 0.55; }
    .bp-task-header { display: flex; justify-content: space-between; gap: 8px; flex-wrap: wrap; margin-bottom: 8px; }
    .bp-task-title  { font-size: 13px; font-weight: 700; color: var(--text); flex: 1; }
    .bp-task-reward { font-size: 12px; font-weight: 700; color: var(--text-muted); white-space: nowrap; }
    .bp-task-bar-wrap { display: flex; align-items: center; gap: 8px; margin-bottom: 8px; }
    .bp-task-bar {
      flex: 1; height: 8px;
      background: var(--bg-input);
      border-radius: 4px; overflow: hidden;
    }
    .bp-task-fill {
      height: 100%;
      background: linear-gradient(90deg, var(--accent), var(--gold));
      border-radius: 4px;
      transition: width 0.4s;
    }
    .bp-task-prog { font-size: 11px; font-weight: 700; color: var(--text-muted); flex-shrink: 0; min-width: 40px; text-align: right; }
    .bp-task-claim-btn {
      width: 100%; padding: 8px;
      background: linear-gradient(135deg, var(--accent), var(--gold));
      color: #fff; font-weight: 700; font-size: 13px;
      border: none; border-radius: 8px; cursor: pointer;
      transition: all 0.2s; box-shadow: 0 2px 8px rgba(240,125,40,0.3);
    }
    .bp-task-claim-btn.prime { background: linear-gradient(135deg, #ffe066, #ffaa00); color: #111; }
    .bp-task-claim-btn:hover { filter: brightness(1.08); transform: translateY(-1px); }
    .bp-task-claimed-lbl { font-size: 12px; color: #5ddb8a; font-weight: 700; text-align: center; }

       /* ── Модалка нагороди ── */
    .bp-awarded-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(120px, 1fr)); gap: 10px; }
    .bp-awarded-item {
      background: var(--bg-card2);
      border: 1.5px solid var(--border);
      border-radius: 10px;
      padding: 14px 8px;
      text-align: center;
      display: flex; flex-direction: column; align-items: center; gap: 6px;
      font-size: 13px; font-weight: 700; color: var(--text);
    }

    /* ── Адмін БП ── */
    .admin-bp-row {
      background: var(--bg-card2);
      border: 1px solid var(--border);
      border-radius: 10px;
      padding: 12px;
      display: flex;
      align-items: center;
      justify-content: space-between;
      flex-wrap: wrap;
      gap: 8px;
    }
    .admin-bp-info { display: flex; gap: 10px; flex-wrap: wrap; font-size: 13px; color: var(--text-muted); align-items: center; }
    .admin-bp-uid  { font-size: 11px; font-family: monospace; color: var(--text-dim); }
    .admin-bp-actions { display: flex; gap: 6px; flex-wrap: wrap; }
  `;
  document.head.appendChild(s);
}

// ── ГЛОБАЛЬНИЙ ЕКСПОРТ ─────────────────────────────────────────────────
window.renderAdminBpPanel = renderAdminBpPanel;