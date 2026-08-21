// ============================================
// МІНІ-ГРА: 🥤 СТАКАНЧИК (shell game)
// ============================================
// Правила: береш зірку, вона накривається стаканчиком, з'являються ще
// стаканчики (кількість залежить від рівня), всі опускаються на один
// рівень і швидко міняються місцями. Треба вгадати, під яким стаканчик
// зі зіркою. Ставка фіксована — 50 нікусів, винагорода залежить від рівня
// складності (100/150/200/250), рівні різняться кількістю та швидкістю
// стаканчиків.
//
// Підключення (в navigate() у script.js, за зразком mine.js):
//   const { initCupsPage, destroyCupsPage } = await import('./cups.js');
//   window._destroyCupsPage = destroyCupsPage;
//   await initCupsPage(currentUser, gameState, { showToast, openModal, closeModal, updateBalanceDisplay });

import { CUPS_GAME_COST, CUPS_LEVEL_REWARDS, cupsPlaceBet, cupsSettleGame } from "./firebase.js";

// ── КОНФІГ РІВНІВ ──────────────────────────
// swapsMin/swapsMax — скільки обмінів місцями відбудеться за раунд,
// msMin/msMax — тривалість одного обміну (менше = швидше).
const LEVELS = [
  { id: 1, cups: 3, swaps: 7,  msMin: 520, msMax: 680, reward: CUPS_LEVEL_REWARDS[1] },
  { id: 2, cups: 4, swaps: 10, msMin: 400, msMax: 560, reward: CUPS_LEVEL_REWARDS[2] },
  { id: 3, cups: 5, swaps: 13, msMin: 300, msMax: 440, reward: CUPS_LEVEL_REWARDS[3] },
  { id: 4, cups: 6, swaps: 16, msMin: 220, msMax: 340, reward: CUPS_LEVEL_REWARDS[4] },
];

// ── МОДУЛЬНИЙ СТАН ──────────────────────────
let _user = null, _gs = null, _deps = null;
let _root = null;
let _canvas = null, _ctx = null;
let _dpr = 1;
let _active = false;      // сторінка відкрита — animation loop дозволений
let _busy = false;        // раунд у процесі (заблокувати повторний старт)
let _selectedLevel = null;

// ── ГЕОМЕТРІЯ ГРИ (перераховується під поточний рівень/ширину канви) ──
let W = 360, H = 220;
let cupW = 64, cupH = 78;
let slotX = [];
let groundY = 150;

// ── СТАН СТАКАНЧИКІВ ────────────────────────
// cupOrder[slotIndex] = cupId — хто зараз стоїть у цьому слоті.
// cupX/cupY/cupLift — поточні (анімовані) координати кожного cupId.
let N = 3;
let cupOrder = [];
let cupX = [], cupY = [], cupLift = [];
let starCupId = 0;
let homeSlot = 0;
let phase = "idle"; // idle | reveal | cover | spawn | shuffle | guess | result
let resultText = "";
let chosenSlot = -1;
let winFlag = false;

// ── СТИЛІ (ін'єкція один раз, за зразком injectRouletteStyles) ──
function injectCupsStyles() {
  if (document.getElementById("cups-styles")) return;
  const s = document.createElement("style");
  s.id = "cups-styles";
  s.textContent = `
  .cups-wrap { padding: 4px 2px 24px; }
  .cups-intro { color: var(--text-muted); font-size: 14px; margin-bottom: 14px; line-height: 1.5; }
  .cups-level-grid { display:grid; grid-template-columns:1fr 1fr; gap:10px; margin-bottom:16px; }
  .cups-level-card {
    border:1.5px solid var(--border); border-radius: var(--radius-md);
    background: var(--bg-card); padding:14px 12px; text-align:center; cursor:pointer;
    transition: transform .15s ease, border-color .15s ease;
  }
  .cups-level-card:active { transform: scale(0.97); }
  .cups-level-card.selected { border-color: var(--accent); box-shadow: 0 0 0 2px var(--accent-glow); }
  .cups-level-title { font-weight:800; font-family:'Syne',sans-serif; margin-bottom:4px; }
  .cups-level-sub { font-size:12px; color:var(--text-muted); margin-bottom:6px; }
  .cups-level-reward { font-weight:700; color: var(--gold); font-size:14px; }
  .cups-bet-row {
    display:flex; align-items:center; justify-content:space-between;
    background: var(--bg-card2); border-radius: var(--radius-md); padding:12px 16px; margin-bottom:14px;
  }
  .cups-bet-label { font-size:13px; color:var(--text-muted); }
  .cups-bet-val { font-weight:800; font-size:16px; }
  .cups-canvas-wrap {
    display:flex; justify-content:center; align-items:flex-end;
    background: linear-gradient(180deg, rgba(10,180,204,0.10), rgba(240,125,40,0.06));
    border-radius: var(--radius-lg); border:1px solid var(--border);
    padding: 10px 6px 0; margin-bottom:14px; overflow:hidden;
  }
  .cups-status {
    text-align:center; font-weight:700; min-height:22px; margin-bottom:12px; color:var(--text);
  }
  .cups-status.win  { color: #2fae5c; }
  .cups-status.lose { color: #e0505a; }
  .cups-btn-row { display:flex; gap:10px; }
  .cups-canvas { touch-action: none; display:block; }
  `;
  document.head.appendChild(s);
}

// ── ГОЛОВНИЙ РЕНДЕР СТОРІНКИ ────────────────
export async function initCupsPage(currentUser, gameState, deps) {
  if (_active) destroyCupsPage();
  _user = currentUser; _gs = gameState; _deps = deps || {};
  _active = true;
  injectCupsStyles();
  _root = document.getElementById("cups-page-root");
  if (!_root) return;
  renderLevelSelect();
}

export function destroyCupsPage() {
  _active = false;
  _busy = false;
  if (_canvas) _canvas.onclick = null;
  _canvas = null; _ctx = null;
  if (_root) _root.innerHTML = "";
}

function balance() { return _gs?.balance ?? 0; }

function renderLevelSelect() {
  if (!_root) return;
  const cards = LEVELS.map(lv => `
    <div class="cups-level-card${_selectedLevel === lv.id ? " selected" : ""}" data-level="${lv.id}">
      <div class="cups-level-title">Рівень ${lv.id}</div>
      <div class="cups-level-sub">${lv.cups} стаканчики</div>
      <div class="cups-level-reward">+${lv.reward} 🪙</div>
    </div>
  `).join("");

  _root.innerHTML = `
    <div class="cups-wrap">
      <div class="cups-intro">Зірка ховається під одним зі стаканчиків. Вони швидко міняються місцями — встеж за потрібним і вгадай, де зірка. Обери рівень складності: більше стаканчиків і вища швидкість — вища винагорода.</div>
      <div class="cups-level-grid">${cards}</div>
      <div class="cups-bet-row">
        <span class="cups-bet-label">Ставка за раунд</span>
        <span class="cups-bet-val">${CUPS_GAME_COST} 🪙</span>
      </div>
      <button id="cups-play-btn" class="btn-primary btn-full" ${_selectedLevel ? "" : "disabled"}>
        🥤 Грати (−${CUPS_GAME_COST})
      </button>
    </div>
  `;

  _root.querySelectorAll(".cups-level-card").forEach(card => {
    card.onclick = () => {
      _selectedLevel = Number(card.getAttribute("data-level"));
      renderLevelSelect();
    };
  });

  const playBtn = _root.querySelector("#cups-play-btn");
  if (playBtn) {
    playBtn.onclick = () => startRound(_selectedLevel);
  }
}

// ── СТАРТ РАУНДУ ─────────────────────────────
async function startRound(levelId) {
  if (_busy) return;
  const level = LEVELS.find(l => l.id === levelId);
  if (!level) return;

  if (balance() < CUPS_GAME_COST) {
    _deps.showToast?.("Недостатньо нікусів! Потрібно " + CUPS_GAME_COST + ".", "error");
    return;
  }

  _busy = true;
  try {
    const newBal = await cupsPlaceBet(_user.uid);
    _gs.balance = newBal;
    _deps.updateBalanceDisplay?.();
  } catch (e) {
    _busy = false;
    _deps.showToast?.(e.message || "Не вдалося зробити ставку", "error");
    return;
  }

  renderGameScreen(level);
  await runRound(level);
  _busy = false;
}

function renderGameScreen(level) {
  if (!_root) return;
  _root.innerHTML = `
    <div class="cups-wrap">
      <div class="cups-status" id="cups-status">Запам'ятай, де зірка...</div>
      <div class="cups-canvas-wrap">
        <canvas id="cups-canvas" class="cups-canvas"></canvas>
      </div>
      <div class="cups-btn-row">
        <button id="cups-cancel-btn" class="btn-secondary" style="flex:1;" disabled>← До вибору рівня</button>
      </div>
    </div>
  `;
  _canvas = _root.querySelector("#cups-canvas");
  setupCanvas(level.cups);
  const cancelBtn = _root.querySelector("#cups-cancel-btn");
  cancelBtn.onclick = () => { if (!_busy) { _selectedLevel = null; renderLevelSelect(); } };
}

function setStatus(text, cls) {
  const el = _root?.querySelector("#cups-status");
  if (!el) return;
  el.textContent = text;
  el.className = "cups-status" + (cls ? " " + cls : "");
}

// ── ГЕОМЕТРІЯ КАНВИ ──────────────────────────
function setupCanvas(cupsCount) {
  N = cupsCount;
  const wrapWidth = Math.min(420, (_canvas.parentElement?.clientWidth || 360) - 12);
  cupW = Math.max(40, Math.min(70, Math.floor((wrapWidth - 20) / N) - 10));
  cupH = Math.round(cupW * 1.2);
  const gap = Math.max(8, Math.round(cupW * 0.22));
  W = N * cupW + (N - 1) * gap + 24;
  H = cupH + 90;
  groundY = H - 44;

  _dpr = window.devicePixelRatio || 1;
  _canvas.width  = Math.round(W * _dpr);
  _canvas.height = Math.round(H * _dpr);
  _canvas.style.width  = W + "px";
  _canvas.style.height = H + "px";
  _ctx = _canvas.getContext("2d");
  _ctx.setTransform(_dpr, 0, 0, _dpr, 0, 0);

  slotX = [];
  const startX = (W - (N * cupW + (N - 1) * gap)) / 2 + cupW / 2;
  for (let i = 0; i < N; i++) slotX.push(startX + i * (cupW + gap));

  homeSlot = Math.floor(N / 2);
  cupOrder = Array.from({ length: N }, (_, i) => i);
  starCupId = homeSlot;
  cupX = slotX.slice();
  cupY = new Array(N).fill(0);
  cupLift = new Array(N).fill(0);
  chosenSlot = -1;
  winFlag = false;

  _canvas.onclick = onCanvasClick;
  requestAnimationFrame(loopRender);
}

function loopRender() {
  if (!_active || !_ctx) return;
  render();
  requestAnimationFrame(loopRender);
}

// ── МАЛЮВАННЯ ────────────────────────────────
function drawStar(x, y, r) {
  _ctx.save();
  _ctx.translate(x, y);
  _ctx.beginPath();
  for (let i = 0; i < 10; i++) {
    const ang = (Math.PI / 5) * i - Math.PI / 2;
    const rad = i % 2 === 0 ? r : r * 0.42;
    const px = Math.cos(ang) * rad, py = Math.sin(ang) * rad;
    if (i === 0) _ctx.moveTo(px, py); else _ctx.lineTo(px, py);
  }
  _ctx.closePath();
  _ctx.fillStyle = "#f5b100";
  _ctx.shadowColor = "rgba(245,177,0,0.7)";
  _ctx.shadowBlur = 14;
  _ctx.fill();
  _ctx.restore();
}

function drawCup(x, y, lift) {
  const top = y - cupH - lift;
  const bottom = y - lift;
  const topW = cupW * 0.62;
  const botW = cupW;

  // тінь на "підлозі"
  _ctx.save();
  _ctx.globalAlpha = 0.18;
  _ctx.beginPath();
  _ctx.ellipse(x, groundY + 6, botW * 0.46, 7, 0, 0, Math.PI * 2);
  _ctx.fillStyle = "#000";
  _ctx.fill();
  _ctx.restore();

  const grad = _ctx.createLinearGradient(x - botW / 2, 0, x + botW / 2, 0);
  grad.addColorStop(0, "#c05a10");
  grad.addColorStop(0.5, "#f99040");
  grad.addColorStop(1, "#c05a10");

  _ctx.beginPath();
  _ctx.moveTo(x - topW / 2, top);
  _ctx.lineTo(x + topW / 2, top);
  _ctx.lineTo(x + botW / 2, bottom);
  _ctx.lineTo(x - botW / 2, bottom);
  _ctx.closePath();
  _ctx.fillStyle = grad;
  _ctx.fill();
  _ctx.strokeStyle = "rgba(0,0,0,0.15)";
  _ctx.lineWidth = 1.5;
  _ctx.stroke();

  // денце (верхівка стаканчика)
  _ctx.beginPath();
  _ctx.ellipse(x, top, topW / 2, 5, 0, 0, Math.PI * 2);
  _ctx.fillStyle = "#ffc930";
  _ctx.fill();

  // отвір (низ)
  _ctx.beginPath();
  _ctx.ellipse(x, bottom, botW / 2, 7, 0, 0, Math.PI * 2);
  _ctx.fillStyle = "rgba(0,0,0,0.28)";
  _ctx.fill();
}

function render() {
  _ctx.clearRect(0, 0, W, H);

  if (phase === "reveal") {
    drawStar(slotX[homeSlot], groundY - 10, cupW * 0.24);
    return;
  }

  // порядок малювання: спочатку ті, що "позаду" (менший lift), потім "спереду"
  const order = [];
  for (let cid = 0; cid < N; cid++) order.push(cid);
  order.sort((a, b) => (cupLift[a] || 0) - (cupLift[b] || 0));

  // якщо фаза результату — під переможним стаканчиком показуємо зірку заздалегідь
  if (phase === "result") {
    const starSlot = cupOrder.indexOf(starCupId);
    drawStar(slotX[starSlot], groundY - 10, cupW * 0.22);
  }

  for (const cid of order) {
    const y = groundY - (cupY[cid] || 0);
    drawCup(cupX[cid], y, cupLift[cid] || 0);

    if (phase === "result") {
      const slot = cupOrder.indexOf(cid);
      if (slot === chosenSlot) {
        _ctx.save();
        _ctx.strokeStyle = winFlag ? "#2fae5c" : "#e0505a";
        _ctx.lineWidth = 3;
        _ctx.beginPath();
        _ctx.ellipse(cupX[cid], groundY + 6 - (cupY[cid] || 0), cupW * 0.5, 8, 0, 0, Math.PI * 2);
        _ctx.stroke();
        _ctx.restore();
      }
    }
  }
}

// ── АНІМАЦІЯ (tween через requestAnimationFrame) ──
function easeInOutQuad(t) { return t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2; }

function tween(duration, onUpdate) {
  return new Promise(resolve => {
    const start = performance.now();
    function step(now) {
      if (!_active) { resolve(); return; }
      const t = Math.min(1, (now - start) / duration);
      onUpdate(easeInOutQuad(t));
      if (t < 1) requestAnimationFrame(step);
      else resolve();
    }
    requestAnimationFrame(step);
  });
}

function wait(ms) { return new Promise(res => setTimeout(res, ms)); }

async function animateSwap(slotA, slotB, duration) {
  const cupA = cupOrder[slotA], cupB = cupOrder[slotB];
  const xA0 = slotX[slotA], xA1 = slotX[slotB];
  const xB0 = slotX[slotB], xB1 = slotX[slotA];
  await tween(duration, t => {
    cupX[cupA] = xA0 + (xA1 - xA0) * t;
    cupX[cupB] = xB0 + (xB1 - xB0) * t;
    const lift = Math.sin(t * Math.PI) * 16;
    cupLift[cupA] = lift;
    cupLift[cupB] = -lift * 0.35;
  });
  cupOrder[slotA] = cupB;
  cupOrder[slotB] = cupA;
  cupLift[cupA] = 0; cupLift[cupB] = 0;
}

// ── ОРКЕСТРАЦІЯ РАУНДУ ───────────────────────
async function runRound(level) {
  phase = "reveal";
  setStatus("Запам'ятай, де зірка...");
  render();
  await wait(750);
  if (!_active) return;

  // накриваємо зірку першим стаканчиком
  phase = "cover";
  cupY[starCupId] = 90;
  for (let cid = 0; cid < N; cid++) if (cid !== starCupId) cupY[cid] = -999; // приховані вище
  await tween(340, t => { cupY[starCupId] = 90 * (1 - t); });
  cupY[starCupId] = 0;
  if (!_active) return;
  await wait(150);

  // з'являються решта стаканчиків і опускаються на той самий рівень
  phase = "spawn";
  setStatus("Стаканчики опускаються...");
  for (let cid = 0; cid < N; cid++) if (cid !== starCupId) cupY[cid] = 130;
  await tween(420, t => {
    for (let cid = 0; cid < N; cid++) if (cid !== starCupId) cupY[cid] = 130 * (1 - t);
  });
  for (let cid = 0; cid < N; cid++) cupY[cid] = 0;
  if (!_active) return;
  await wait(200);

  // перемішування
  phase = "shuffle";
  setStatus("Перемішування...");
  for (let i = 0; i < level.swaps; i++) {
    if (!_active) return;
    let a = Math.floor(Math.random() * N);
    let b = Math.floor(Math.random() * N);
    while (b === a) b = Math.floor(Math.random() * N);
    const dur = level.msMin + Math.random() * (level.msMax - level.msMin);
    await animateSwap(a, b, dur);
  }
  if (!_active) return;

  // очікування вибору гравця
  phase = "guess";
  setStatus("Обери стаканчик!");
  await new Promise(resolve => { _guessResolve = resolve; });
}

let _guessResolve = null;

function onCanvasClick(e) {
  if (phase !== "guess" || !_active) return;
  const rect = _canvas.getBoundingClientRect();
  const clickX = (e.clientX - rect.left);
  let slot = -1, best = Infinity;
  for (let i = 0; i < N; i++) {
    const d = Math.abs(slotX[i] - clickX);
    if (d < best) { best = d; slot = i; }
  }
  chosenSlot = slot;
  phase = "lifting";
  finishRound();
}

async function finishRound() {
  const level = LEVELS.find(l => l.id === _selectedLevel);
  winFlag = cupOrder[chosenSlot] === starCupId;

  // піднімаємо всі стаканчики, показуючи де була зірка
  await tween(420, t => {
    for (let cid = 0; cid < N; cid++) cupLift[cid] = 55 * t;
  });
  phase = "result";
  setStatus(winFlag ? "🎉 Перемога!" : "😢 Не вгадав...", winFlag ? "win" : "lose");
  render();

  if (_guessResolve) { _guessResolve(); _guessResolve = null; }

  try {
    const res = await cupsSettleGame(_user.uid, winFlag, level.id);
    _gs.balance = res.balance; _gs.xp = res.xp; _gs.level = res.level;
    _deps.updateBalanceDisplay?.();
    if (winFlag) {
      _deps.showToast?.(`🎉 +${res.reward} нікусів!`, "success");
    } else {
      _deps.showToast?.("😢 Зірка була в іншому стаканчику", "error");
    }
    if (res.leveledUp) _deps.showToast?.("⭐ Новий рівень: " + res.level + "!", "success");
  } catch (e) {
    _deps.showToast?.(e.message || "Помилка нарахування", "error");
  }

  await wait(1700);
  if (!_active) return;
  _selectedLevel = level.id;
  renderLevelSelect();
}
