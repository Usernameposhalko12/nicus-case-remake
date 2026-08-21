// ============================================
// МІНІ-ГРА: 💣 СЛІПИЙ САПЕР (blind minesweeper)
// ============================================
// Той самий сапер, тільки БЕЗ підказок — відкрита клітинка не показує число
// сусідніх мін, лише факт що вона безпечна. Одна спроба — 10 нікусів.
// Кожна відкрита безпечна клітинка = 2 нікуси, нараховуються одноразово
// після завершення раунду (підрив на міні або повна зачистка поля).
//
// Підключення (в navigate() у script.js, за зразком cups.js):
//   const { initBlindMinePage, destroyBlindMinePage } = await import('./blindmine.js');
//   window._destroyBlindMinePage = destroyBlindMinePage;
//   await initBlindMinePage(currentUser, gameState, { showToast, updateBalanceDisplay });

import { BLIND_MINE_COST, BLIND_MINE_REWARD_PER_CELL, blindMinePlaceBet, blindMineSettle } from "./firebase.js";

const COLS = 8, ROWS = 8, MINES = 10;
const TOTAL_CELLS = COLS * ROWS;
const SAFE_CELLS  = TOTAL_CELLS - MINES;

let _user = null, _gs = null, _deps = null;
let _root = null;
let _active = false;
let _busy = false;

// стан поточного раунду
let board = [];        // Array(TOTAL_CELLS) — true якщо міна
let opened = [];        // Array(TOTAL_CELLS) — true якщо відкрита
let openedCount = 0;
let roundActive = false;
let roundOver = false;

function injectBlindMineStyles() {
  if (document.getElementById("blindmine-styles")) return;
  const s = document.createElement("style");
  s.id = "blindmine-styles";
  s.textContent = `
  .bm-wrap { padding: 4px 2px 24px; }
  .bm-intro { color: var(--text-muted); font-size: 14px; margin-bottom: 14px; line-height: 1.5; }
  .bm-bet-row {
    display:flex; align-items:center; justify-content:space-between;
    background: var(--bg-card2); border-radius: var(--radius-md); padding:12px 16px; margin-bottom:14px;
  }
  .bm-bet-label { font-size:13px; color:var(--text-muted); }
  .bm-bet-val { font-weight:800; font-size:16px; }
  .bm-stat-row {
    display:flex; gap:10px; margin-bottom:12px;
  }
  .bm-stat-pill {
    flex:1; text-align:center; background: var(--bg-card2); border-radius: var(--radius-md);
    padding:10px 6px; border:1px solid var(--border);
  }
  .bm-stat-val { font-weight:800; font-size:18px; font-family:'Syne',sans-serif; }
  .bm-stat-label { font-size:11px; color:var(--text-muted); margin-top:2px; }
  .bm-grid {
    display:grid; grid-template-columns: repeat(${COLS}, 1fr); gap:5px;
    margin-bottom:16px; user-select:none;
  }
  .bm-cell {
    aspect-ratio: 1/1; border-radius: 7px; border:1.5px solid var(--border);
    background: linear-gradient(160deg, var(--bg-card), var(--bg-card2));
    display:flex; align-items:center; justify-content:center;
    font-size:15px; cursor:pointer; transition: transform .08s ease, background .15s ease;
  }
  .bm-cell:active { transform: scale(0.92); }
  .bm-cell.bm-open {
    background: rgba(47,174,92,0.16); border-color: rgba(47,174,92,0.4); cursor:default;
  }
  .bm-cell.bm-mine {
    background: rgba(224,80,90,0.25); border-color: #e0505a; cursor:default;
  }
  .bm-cell.bm-disabled { pointer-events:none; opacity:0.85; }
  .bm-status { text-align:center; font-weight:700; min-height:22px; margin-bottom:12px; }
  .bm-status.win  { color:#2fae5c; }
  .bm-status.lose { color:#e0505a; }
  #bm-claim-btn:disabled { opacity:0.5; cursor:not-allowed; }
  `;
  document.head.appendChild(s);
}

export async function initBlindMinePage(currentUser, gameState, deps) {
  if (_active) destroyBlindMinePage();
  _user = currentUser; _gs = gameState; _deps = deps || {};
  _active = true;
  injectBlindMineStyles();
  _root = document.getElementById("blindmine-page-root");
  if (!_root) return;
  renderIntro();
}

export function destroyBlindMinePage() {
  _active = false;
  _busy = false;
  roundActive = false;
  if (_root) _root.innerHTML = "";
}

function balance() { return _gs?.balance ?? 0; }

function renderIntro() {
  if (!_root) return;
  _root.innerHTML = `
    <div class="bm-wrap">
      <div class="bm-intro">Той самий сапер, але без підказок — жодних цифр про сусідні міни. Клікай клітинки — кожна безпечна дає ${BLIND_MINE_REWARD_PER_CELL} нікуси. У будь-який момент можна натиснути «Забрати нагороду» й зафіксувати вигране. Але якщо підірвешся раніше — все згорить, жадність фраєра згубила.</div>
      <div class="bm-bet-row">
        <span class="bm-bet-label">Ціна спроби</span>
        <span class="bm-bet-val">${BLIND_MINE_COST} 🪙</span>
      </div>
      <button id="bm-start-btn" class="btn-primary btn-full">💣 Почати спробу (−${BLIND_MINE_COST})</button>
    </div>
  `;
  const btn = _root.querySelector("#bm-start-btn");
  if (btn) btn.onclick = startAttempt;
}

async function startAttempt() {
  if (_busy) return;
  if (balance() < BLIND_MINE_COST) {
    _deps.showToast?.("Недостатньо нікусів! Потрібно " + BLIND_MINE_COST + ".", "error");
    return;
  }
  _busy = true;
  try {
    const newBal = await blindMinePlaceBet(_user.uid);
    _gs.balance = newBal;
    _deps.updateBalanceDisplay?.();
  } catch (e) {
    _busy = false;
    _deps.showToast?.(e.message || "Не вдалося зробити ставку", "error");
    return;
  }
  generateBoard();
  renderBoard();
  _busy = false;
}

function generateBoard() {
  board = new Array(TOTAL_CELLS).fill(false);
  opened = new Array(TOTAL_CELLS).fill(false);
  openedCount = 0;
  roundActive = true;
  roundOver = false;

  let placed = 0;
  while (placed < MINES) {
    const idx = Math.floor(Math.random() * TOTAL_CELLS);
    if (!board[idx]) { board[idx] = true; placed++; }
  }
}

function renderBoard() {
  if (!_root) return;
  _root.innerHTML = `
    <div class="bm-wrap">
      <div class="bm-status" id="bm-status">Обери клітинку...</div>
      <div class="bm-stat-row">
        <div class="bm-stat-pill">
          <div class="bm-stat-val" id="bm-opened-val">0</div>
          <div class="bm-stat-label">Відкрито</div>
        </div>
        <div class="bm-stat-pill">
          <div class="bm-stat-val" id="bm-reward-val">0</div>
          <div class="bm-stat-label">Нікусів на кону</div>
        </div>
      </div>
      <div class="bm-grid" id="bm-grid"></div>
      <button id="bm-claim-btn" class="btn-primary btn-full">💰 Забрати нагороду</button>
    </div>
  `;
  const grid = _root.querySelector("#bm-grid");
  for (let i = 0; i < TOTAL_CELLS; i++) {
    const cell = document.createElement("div");
    cell.className = "bm-cell";
    cell.dataset.idx = i;
    cell.onclick = () => onCellClick(i, cell);
    grid.appendChild(cell);
  }
  const claimBtn = _root.querySelector("#bm-claim-btn");
  if (claimBtn) {
    claimBtn.disabled = true; // доки не відкрито жодної клітинки — нема чого забирати
    claimBtn.onclick = () => claimReward();
  }
}

function setStatus(text, cls) {
  const el = _root?.querySelector("#bm-status");
  if (!el) return;
  el.textContent = text;
  el.className = "bm-status" + (cls ? " " + cls : "");
}

function updateStats() {
  const ov = _root?.querySelector("#bm-opened-val");
  const rv = _root?.querySelector("#bm-reward-val");
  const claimBtn = _root?.querySelector("#bm-claim-btn");
  if (ov) ov.textContent = String(openedCount);
  if (rv) rv.textContent = String(openedCount * BLIND_MINE_REWARD_PER_CELL);
  if (claimBtn) claimBtn.disabled = openedCount === 0;
}

function onCellClick(idx, cellEl) {
  if (!roundActive || roundOver || opened[idx]) return;

  if (board[idx]) {
    // підрив — раунд закінчено, нагорода згорає повністю
    opened[idx] = true;
    cellEl.classList.add("bm-mine");
    cellEl.textContent = "💣";
    endRound("boom");
    return;
  }

  opened[idx] = true;
  openedCount++;
  cellEl.classList.add("bm-open");
  cellEl.textContent = "✅";
  updateStats();

  if (openedCount === SAFE_CELLS) {
    endRound("cleared");
  }
}

function claimReward() {
  if (!roundActive || roundOver || openedCount === 0) return;
  endRound("claimed");
}

async function endRound(reason) {
  // reason: "boom" (підрив, нагорода згорає) | "claimed" (забрав достроково) | "cleared" (зачистив усе поле)
  roundOver = true;
  roundActive = false;

  // блокуємо всі клітинки, показуємо всі міни
  const grid = _root.querySelector("#bm-grid");
  if (grid) {
    grid.classList.add("bm-disabled");
    for (let i = 0; i < TOTAL_CELLS; i++) {
      const cellEl = grid.children[i];
      if (board[i] && !opened[i]) {
        cellEl.classList.add("bm-mine");
        cellEl.textContent = "💣";
      }
    }
  }
  const claimBtn = _root.querySelector("#bm-claim-btn");
  if (claimBtn) claimBtn.disabled = true;

  if (reason === "boom") {
    setStatus("💥 Підрив! Жадність фраєра згубила...", "lose");
    _deps.showToast?.("💥 Жадність фраєра згубила — нагорода згоріла!", "error");
    await new Promise(r => setTimeout(r, 1600));
    if (!_active) return;
    renderIntro();
    return;
  }

  setStatus(
    reason === "cleared" ? "🎉 Поле зачищено!" : "💰 Нагороду забрано!",
    "win"
  );

  try {
    const res = await blindMineSettle(_user.uid, openedCount);
    _gs.balance = res.balance; _gs.xp = res.xp; _gs.level = res.level;
    _deps.updateBalanceDisplay?.();
    _deps.showToast?.(`+${res.reward} нікусів за ${openedCount} відкритих клітинок`, "success");
    if (res.leveledUp) _deps.showToast?.("⭐ Новий рівень: " + res.level + "!", "success");
  } catch (e) {
    _deps.showToast?.(e.message || "Помилка нарахування", "error");
  }

  await new Promise(r => setTimeout(r, 1600));
  if (!_active) return;
  renderIntro();
}
