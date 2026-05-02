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
    const nClaimed  = cNorm.includes(lvl)  || (isWheel && cWheel.includes(lvl));
    const pClaimed  = cPrime.includes(lvl);

    return `
      <div class="bp-row ${reached ? 'reached' : ''} ${isWheel ? 'bp-row-wheel' : ''}">
        <!-- Номер рівня -->
        <div class="bp-row-lvl ${reached ? 'reached' : ''}">${lvl}</div>

        <!-- Звичайна нагорода -->
        <div class="bp-reward-cell ${nClaimed ? 'claimed' : ''} ${reached && !nClaimed ? 'claimable' : ''}"
          onclick="${reached && !nClaimed ? `bpClaimLevel(${lvl},'normal')` : ''}">
          ${_rewardIcon(normR)}
          <div class="bp-reward-label">${normR?.label || '—'}</div>
          ${nClaimed ? '<div class="bp-claimed-badge">✅</div>' : ''}
          ${reached && !nClaimed ? '<div class="bp-claim-hint">Забрати</div>' : ''}
        </div>

        <!-- Прайм нагорода -->
        <div class="bp-reward-cell ${prime ? '' : 'bp-locked'} ${pClaimed ? 'claimed' : ''} ${reached && prime && !pClaimed ? 'claimable' : ''}"
          onclick="${reached && prime && !pClaimed ? `bpClaimLevel(${lvl},'prime')` : ''}">
          ${_rewardIcon(primeR)}
          <div class="bp-reward-label">${primeR?.label || '—'}</div>
          ${!prime ? '<div class="bp-lock-icon">🔒</div>' : ''}
          ${pClaimed ? '<div class="bp-claimed-badge">✅</div>' : ''}
          ${reached && prime && !pClaimed ? '<div class="bp-claim-hint">Забрати</div>' : ''}
        </div>
      </div>
    `;
  }).join("");

  return `
    <div class="bp-legend">
      <div class="bp-legend-item">
        <div class="bp-legend-dot" style="background:var(--accent)"></div> Звичайний трек
      </div>
      <div class="bp-legend-item">
        <div class="bp-legend-dot" style="background:var(--gold)"></div> 👑 Прайм трек
      </div>
    </div>
    <div class="bp-strip-header">
      <div></div><div>Звичайний</div><div style="color:var(--gold)">👑 Прайм</div>
    </div>
    <div class="bp-strip">${html}</div>
  `;
}

function _rewardIcon(reward) {
  if (!reward) return '<div class="bp-reward-img">—</div>';
  if (reward.type === "wheel")
    return '<div class="bp-reward-img bp-reward-wheel">🎡</div>';
  if (reward.type === "medal")
    return '<div class="bp-reward-img">🏅</div>';
  if (reward.type === "coins")
    return `<div class="bp-reward-img">💰<br><small>${reward.amount}</small></div>`;
  if (reward.type === "lbk")
    return `<div class="bp-reward-img">⚡<br><small>${reward.amount}</small></div>`;
  if (reward.type === "case")
    return `<img class="bp-reward-img" src="img/cases/${reward.caseId}.png" onerror="this.outerHTML='<div class=\\'bp-reward-img\\'>📦</div>'" style="width:44px;height:44px;object-fit:contain;">`;
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

  // Якщо це колесо — показуємо окремий екран
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
    // Синхронізуємо gameState
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
    const result = await claimBpTaskReward(_bpCurrentUser.uid, taskId, _bpGameState);
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
window.bpConfirmPrime = window.bpConfirmPrime;

// ── КОЛЕСО ФАРТУНИ ────────────────────────────────────────────────────

async function _openWheelModal(level, track) {
  const { openModal, closeModal, showToast } = _bpCallbacks;

  const total = BP_WHEEL_TABLE.reduce((s, e) => s + e.weight, 0);
  const segments = BP_WHEEL_TABLE.map((e, i) => ({
    ...e,
    color: _wheelColor(e.type, i),
    pct: ((e.weight / total) * 100).toFixed(1),
  }));

  openModal(`
    <h2 class="modal-title">🎡 Колесо Фортуни — Рівень ${level}</h2>
    <p style="color:var(--text-muted);font-size:13px;text-align:center;margin-bottom:14px;">
      Отримай випадкову нагороду за досягнення ${BP_WHEEL_EVERY}-го рівня!
    </p>
    <div class="bp-wheel-wrap">
      <div class="bp-wheel-arrow">▼</div>
      <canvas id="bp-wheel-canvas" width="260" height="260" style="width:260px;height:260px;border-radius:50%;"></canvas>
    </div>
    <div id="bp-wheel-result" style="display:none;text-align:center;margin-top:14px;"></div>
    <div style="display:flex;gap:8px;margin-top:14px;">
      <button id="bp-wheel-spin-btn" class="btn-primary" style="flex:1;" onclick="bpDoSpin(${level},'${track}')">🎡 Крутити!</button>
      <button class="btn-secondary" style="flex:1;" onclick="closeModal()">Скасувати</button>
    </div>
  `, false);

  // Малюємо колесо
  requestAnimationFrame(() => {
    const canvas = document.getElementById("bp-wheel-canvas");
    if (canvas) _drawBpWheel(canvas, segments, 0);
  });
}

function _wheelColor(type, idx) {
  const colors = ["#e4b84d","#5ddb8a","#5db8ff","#e4754d","#b45dff","#ff5d8a","#5dffe4","#ffe066","#ff8c00","#aaffaa"];
  if (type === "case") return "#c89820";
  return colors[idx % colors.length];
}

function _drawBpWheel(canvas, segments, rotation) {
  const ctx = canvas.getContext("2d");
  const dpr = window.devicePixelRatio || 1;
  canvas.width  = 260 * dpr;
  canvas.height = 260 * dpr;
  canvas.style.width  = "260px";
  canvas.style.height = "260px";
  ctx.scale(dpr, dpr);

  const cx = 130, cy = 130, R = 120;
  ctx.clearRect(0, 0, 260, 260);
  ctx.save();
  ctx.translate(cx, cy);
  ctx.rotate(rotation);
  ctx.translate(-cx, -cy);

  let start = -Math.PI / 2;
  const total = segments.reduce((s, e) => s + e.weight, 0);
  segments.forEach((seg, i) => {
    const angle = (seg.weight / total) * Math.PI * 2;
    ctx.beginPath();
    ctx.moveTo(cx, cy);
    ctx.arc(cx, cy, R, start, start + angle);
    ctx.closePath();
    ctx.fillStyle = seg.color;
    ctx.fill();
    ctx.strokeStyle = "rgba(255,255,255,0.2)";
    ctx.lineWidth = 1.5;
    ctx.stroke();

    // Текст
    const mid = start + angle / 2;
    ctx.save();
    ctx.translate(cx + Math.cos(mid) * R * 0.65, cy + Math.sin(mid) * R * 0.65);
    ctx.rotate(mid + Math.PI / 2);
    ctx.fillStyle = "#fff";
    ctx.font = `bold ${Math.max(9, Math.min(13, R * 0.11))}px Arial`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    const lbl = seg.label.length > 14 ? seg.label.slice(0, 12) + "…" : seg.label;
    ctx.fillText(lbl, 0, 0);
    ctx.restore();

    start += angle;
  });

  // Центр
  const grad = ctx.createRadialGradient(cx, cy, 0, cx, cy, 24);
  grad.addColorStop(0, "#fff");
  grad.addColorStop(1, "#ddd");
  ctx.beginPath(); ctx.arc(cx, cy, 24, 0, Math.PI * 2);
  ctx.fillStyle = grad; ctx.fill();
  ctx.strokeStyle = "rgba(255,215,0,0.8)"; ctx.lineWidth = 3; ctx.stroke();

  ctx.font = "bold 14px Arial";
  ctx.fillStyle = "#333"; ctx.textAlign = "center"; ctx.textBaseline = "middle";
  ctx.fillText("🎡", cx, cy + 1);
  ctx.restore();
}

window.bpDoSpin = async function(level, track) {
  const { showToast, closeModal, renderInventory, updateBalanceDisplay } = _bpCallbacks;
  const btn = document.getElementById("bp-wheel-spin-btn");
  if (btn) { btn.disabled = true; btn.textContent = "⏳ Крутиться..."; }

  const canvas = document.getElementById("bp-wheel-canvas");
  const total = BP_WHEEL_TABLE.reduce((s, e) => s + e.weight, 0);
  const segments = BP_WHEEL_TABLE.map((e, i) => ({ ...e, color: _wheelColor(e.type, i) }));

  // Анімація
  const rounds  = (4 + Math.random() * 3) * Math.PI * 2;
  const dur     = 3500;
  const start   = performance.now();

  const animate = (now) => {
    const t = Math.min((now - start) / dur, 1);
    const ease = 1 - Math.pow(1 - t, 4);
    if (canvas) _drawBpWheel(canvas, segments, ease * rounds);
    if (t < 1) { requestAnimationFrame(animate); return; }

    // Після анімації — робимо реальний спін
    spinBpWheel(_bpCurrentUser.uid, level).then(result => {
      // Показуємо результат
      const resultEl = document.getElementById("bp-wheel-result");
      if (resultEl) {
        resultEl.style.display = "block";
        resultEl.innerHTML = `
          <div style="background:var(--bg-card2);border:2px solid var(--gold);border-radius:12px;padding:16px;">
            <div style="font-size:13px;color:var(--text-muted);margin-bottom:6px;">🎉 Ви отримали!</div>
            <div style="font-weight:800;font-size:18px;color:var(--gold);">${result.prize.label}</div>
          </div>
        `;
      }
      if (btn) { btn.style.display = "none"; }

      // Додаємо кнопку "Забрати"
      const actDiv = document.querySelector(".bp-wheel-actions") || btn?.parentElement;
      if (actDiv) {
        const closeBtn = actDiv.querySelector(".btn-secondary");
        if (closeBtn) closeBtn.textContent = "🎉 Забрати!";
      }

      _syncAfterClaim().then(() => {
        if (renderInventory) renderInventory();
        if (updateBalanceDisplay) updateBalanceDisplay();
        showToast("🎡 Виграш: " + result.prize.label, "success");
      });
    }).catch(e => {
      showToast("Помилка: " + e.message, "error");
      if (btn) { btn.disabled = false; btn.textContent = "🎡 Крутити!"; }
    });
  };
  requestAnimationFrame(animate);
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

    /* ── Стрічка нагород ── */
    .bp-strip { display: flex; flex-direction: column; gap: 6px; }

    .bp-row {
      display: grid;
      grid-template-columns: 42px 1fr 1fr;
      gap: 8px;
      align-items: center;
    }
    .bp-row-wheel { background: rgba(255,200,0,0.05); border-radius: 10px; padding: 4px 0; }

    .bp-row-lvl {
      width: 42px; height: 42px;
      border-radius: 50%;
      background: var(--bg-card2);
      border: 2px solid var(--border);
      display: flex; align-items: center; justify-content: center;
      font-weight: 800; font-size: 13px;
      color: var(--text-muted);
      flex-shrink: 0;
      transition: all 0.2s;
    }
    .bp-row-lvl.reached {
      background: linear-gradient(135deg, var(--accent), var(--gold));
      color: #fff; border-color: transparent;
      box-shadow: 0 2px 8px rgba(240,125,40,0.35);
    }

    /* ── Клітинка нагороди ── */
    .bp-reward-cell {
      background: var(--bg-card);
      border: 1.5px solid var(--border);
      border-radius: 10px;
      padding: 8px;
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 3px;
      position: relative;
      min-height: 80px;
      justify-content: center;
      transition: all 0.2s;
    }
    .bp-reward-cell.claimable {
      border-color: var(--accent);
      background: rgba(240,125,40,0.08);
      cursor: pointer;
      box-shadow: 0 2px 10px rgba(240,125,40,0.2);
    }
    .bp-reward-cell.claimable:hover {
      transform: translateY(-2px);
      box-shadow: 0 5px 15px rgba(240,125,40,0.3);
    }
    .bp-reward-cell.claimed { opacity: 0.5; }
    .bp-reward-cell.bp-locked { opacity: 0.4; }

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

    /* ── Колесо ── */
    .bp-wheel-wrap { display: flex; flex-direction: column; align-items: center; gap: 4px; }
    .bp-wheel-arrow { font-size: 20px; color: var(--gold); animation: arrowPulse 0.6s ease-in-out infinite alternate; }
    @keyframes arrowPulse { from { transform: translateY(0); } to { transform: translateY(5px); } }

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