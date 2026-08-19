// ============================================
// ЧОРНИЙ РИНОК
// Коди гравців, відмички, платний блок предметів, крадіжка
// ============================================
import {
  ensurePlayerCode, getItemLockPrice,
  blackMarketPayLookupFee, getPlayerCodeByUsername, getPlayerByCode,
  buyLockpick, lockInventoryItem, getRobberyTargetSnapshot,
  consumeLockpick, stealInventoryItem, addNotification,
  BM_LOOKUP_FEE, BM_LOCKPICK_PRICE,
} from "./firebase.js";

const SPRING_COUNT   = 6;
const MAX_MISTAKES   = 4;
const LOOT_WINDOW_MS = 30000;
const STEAL_ITEM_MS  = 5000;

let _bmDeps = null; // { showToast, openModal, closeModal, saveData, renderInventory }

function bmInit(deps) { _bmDeps = deps; }

// ── СТИЛІ ──────────────────────────────────
function injectBlackMarketStyles() {
  if (document.getElementById("bm-styles")) return;
  const s = document.createElement("style");
  s.id = "bm-styles";
  s.textContent = `
    .bm-container { max-width: 600px; margin: 0 auto; padding: 20px 16px 40px; }
    .bm-title { font-family:'Syne',sans-serif; font-size:22px; font-weight:800; color:var(--text); margin-bottom:4px; }
    .bm-sub { color: var(--text-muted); font-size: 13px; margin-bottom: 18px; }
    .bm-card {
      background: var(--glass); backdrop-filter: blur(16px);
      border: 1.5px solid var(--glass-border); border-radius: var(--radius-lg,14px);
      padding: 16px; margin-bottom: 14px; box-shadow: var(--shadow-sm);
    }
    .bm-card-title { font-weight: 800; font-size: 15px; color: var(--text); margin-bottom: 8px; display:flex; align-items:center; gap:8px; }
    .bm-card-desc { font-size: 12.5px; color: var(--text-muted); margin-bottom: 12px; line-height: 1.4; }
    .bm-row { display: flex; gap: 8px; }
    .bm-input {
      flex: 1; padding: 10px 12px; border-radius: 8px; border: 1px solid var(--border);
      background: var(--bg-input); color: var(--text); font-size: 14px; min-width: 0;
    }
    .bm-btn {
      padding: 10px 16px; border-radius: 8px; border: none; background: var(--accent);
      color: #fff; font-weight: 700; font-size: 13px; cursor: pointer; white-space: nowrap;
    }
    .bm-btn:disabled { opacity: .5; cursor: not-allowed; }
    .bm-btn.secondary { background: var(--glass); border: 1.5px solid var(--glass-border); color: var(--text); }
    .bm-result { margin-top: 10px; font-size: 13px; color: var(--text); background: rgba(94,203,62,0.08); border: 1px solid var(--teal); border-radius: 8px; padding: 8px 10px; }
    .bm-price { color: var(--gold-light); font-weight: 700; font-size: 12.5px; }
    .bm-code { font-family: monospace; font-size: 15px; letter-spacing: 1px; }
    .bm-my-code { text-align:center; padding: 10px; background: rgba(255,215,0,0.08); border:1px dashed var(--gold-light); border-radius: 10px; margin-bottom: 16px; font-size: 13px; color: var(--text); }

    /* ── Мінігра відмички (візуал "як в грі") ── */
    .bm-lock-wrap { text-align: center; }
    .bm-lockpick-progress-label { font-size: 13px; color: var(--text-muted); margin-bottom: 8px; }
    .bm-attempts { display: flex; gap: 6px; justify-content: center; margin: 0 0 14px; }
    .bm-attempt-dot { width: 14px; height: 14px; border-radius: 50%; background: #f05060; box-shadow: 0 0 6px rgba(240,80,96,.6); }
    .bm-attempt-dot.used { background: #333; box-shadow: none; opacity: .5; }

    .bm-housing {
      position: relative;
      display: flex;
      align-items: stretch;
      justify-content: flex-start;
      gap: 0;
      margin: 0 auto 16px;
      max-width: 420px;
      background: linear-gradient(180deg, #3a3d42, #202226 60%, #16171a);
      border: 3px solid #0c0d0f;
      border-radius: 10px;
      padding: 14px 12px 18px;
      box-shadow: inset 0 0 14px rgba(0,0,0,.6), 0 4px 10px rgba(0,0,0,.4);
    }
    .bm-shear-line {
      position: absolute;
      left: 10px; right: 10px; top: 46px;
      height: 2px;
      background: repeating-linear-gradient(90deg, #ffd54a 0 6px, transparent 6px 12px);
      opacity: .55;
      pointer-events: none;
    }
    .bm-pins {
      display: flex;
      gap: 5px;
      align-items: flex-end;
      height: 150px;
      z-index: 1;
    }
    .bm-pin {
      position: relative;
      width: 30px;
      height: 100%;
      background: none;
      border: none;
      padding: 0;
      cursor: pointer;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: flex-end;
    }
    .bm-pin:disabled { cursor: default; }
    .bm-pin-spring {
      width: 14px;
      flex: 1;
      background:
        repeating-linear-gradient(0deg, #9aa0a6 0 2px, #5b6066 2px 3px, transparent 3px 7px);
      border-left: 1px solid #6a6f75;
      border-right: 1px solid #6a6f75;
      border-radius: 2px 2px 0 0;
      transition: flex-basis .25s ease;
    }
    .bm-pin-cyl {
      width: 26px;
      height: 46px;
      border-radius: 4px 4px 3px 3px;
      background: linear-gradient(90deg, #4a4d52 0%, #d9dde2 30%, #9aa0a6 50%, #d9dde2 70%, #4a4d52 100%);
      border: 1px solid #1c1d1f;
      box-shadow: 0 2px 3px rgba(0,0,0,.5);
      transition: transform .18s ease, box-shadow .2s ease;
      flex-shrink: 0;
    }
    .bm-pin-num {
      margin-top: 5px;
      font-size: 10px;
      font-weight: 700;
      color: #9aa0a6;
    }
    .bm-pin:hover:not(:disabled) .bm-pin-cyl { transform: translateY(-4px); }

    .bm-pin-locked .bm-pin-cyl {
      transform: translateY(-36px);
      background: linear-gradient(90deg, #3c7a2e 0%, #a8e08a 30%, #6fbf4f 50%, #a8e08a 70%, #3c7a2e 100%);
      box-shadow: 0 0 8px rgba(94,203,62,.7);
    }
    .bm-pin-locked .bm-pin-num { color: var(--teal); }

    .bm-pin-wrong .bm-pin-cyl { animation: bmPinShake .35s ease; }
    @keyframes bmPinShake {
      0%,100% { transform: translateY(0) translateX(0); }
      20%  { transform: translateY(2px) translateX(-2px); }
      40%  { transform: translateY(2px) translateX(2px); }
      60%  { transform: translateY(0) translateX(-1px); }
      80%  { transform: translateY(0) translateX(1px); }
    }

    .bm-pin-active .bm-pin-cyl {
      box-shadow: 0 0 0 2px #ff9d3d, 0 2px 6px rgba(255,157,61,.6);
    }
    .bm-pin-active .bm-pin-num { color: #ff9d3d; }

    .bm-rail {
      position: absolute;
      left: 12px; right: 12px; bottom: 6px;
      height: 6px;
      background: #101113;
      border-radius: 3px;
      box-shadow: inset 0 0 3px rgba(0,0,0,.8);
    }
    .bm-rail-wire {
      position: absolute; left: 0; top: 0; bottom: 0;
      background: linear-gradient(90deg, #c8712f, #ff9d3d);
      border-radius: 3px;
      transition: width .18s ease;
    }
    .bm-rail-head {
      position: absolute; top: 50%; width: 12px; height: 12px;
      background: radial-gradient(circle at 35% 35%, #ffd8a8, #ff9d3d 60%, #b85f1f);
      border-radius: 50%;
      transform: translate(-50%, -50%);
      box-shadow: 0 0 5px rgba(255,157,61,.8);
      transition: left .18s ease;
    }

    .bm-pick-controls {
      display: flex; align-items: center; justify-content: center; gap: 10px;
      margin-top: 4px;
    }
    .bm-ctrl-btn {
      width: 44px; height: 44px; border-radius: 50%; border: 1.5px solid var(--glass-border);
      background: var(--glass); color: var(--text); font-size: 18px; font-weight: 800; cursor: pointer;
    }
    .bm-ctrl-btn:active { transform: scale(.92); }
    .bm-press-btn {
      padding: 12px 22px; border-radius: 10px; border: none;
      background: linear-gradient(180deg, #ff9d3d, #d9761b);
      color: #fff; font-weight: 800; font-size: 14px; cursor: pointer;
      box-shadow: 0 3px 0 #a85512, 0 4px 8px rgba(0,0,0,.35);
    }
    .bm-press-btn:active { transform: translateY(2px); box-shadow: 0 1px 0 #a85512; }

    /* Сама відмичка — тепер лежить ГОРИЗОНТАЛЬНО і "заїжджає" зліва направо
       вздовж пунктирної лінії (bm-shear-line), а на кінці опускає жало
       вниз до пружини, синхронно з рейкою внизу і зі стрілками/тапами. */
    .bm-tool-slider {
      position: absolute;
      left: 10px;
      top: 46px;
      height: 4px;
      display: flex;
      align-items: center;
      transform: translateY(-50%);
      z-index: 2;
      pointer-events: none;
    }
    .bm-tool-wire {
      height: 4px;
      flex-shrink: 0;
      background: linear-gradient(90deg, #7d8288, #d9dde2 55%, #ffb066);
      border-radius: 2px;
      box-shadow: 0 0 4px rgba(0,0,0,.5);
      transition: width .18s ease;
    }
    .bm-tool-head {
      position: relative;
      width: 18px;
      height: 18px;
      flex-shrink: 0;
      margin-left: -2px;
      background: linear-gradient(135deg, #ffd8a8, #ff9d3d 55%, #b85f1f);
      border-radius: 3px 9px 9px 3px;
      box-shadow: 0 0 6px rgba(255,157,61,.7);
      transition: transform .18s ease;
    }
    .bm-tool-tip {
      position: absolute;
      left: 50%;
      top: 100%;
      width: 3px;
      height: 36px;
      transform: translateX(-50%);
      background: linear-gradient(180deg, #d9dde2, #7d8288);
      border-radius: 2px;
      box-shadow: 0 0 3px rgba(0,0,0,.5);
    }

    /* ── Вікно грабежу ── */
    .bm-loot-timer { text-align:center; font-size: 28px; font-weight: 800; color: #f05060; margin-bottom: 10px; font-family: monospace; }
    .bm-loot-list { display:flex; flex-direction:column; gap:8px; max-height: 340px; overflow-y:auto; }
    .bm-loot-item { display:flex; align-items:center; gap:10px; background: var(--bg-input); border:1px solid var(--border); border-radius:10px; padding:8px 10px; }
    .bm-loot-item img { width: 36px; height: 36px; object-fit: contain; flex-shrink:0; }
    .bm-loot-item-name { flex:1; font-size:13px; font-weight:600; color:var(--text); }
    .bm-loot-btn { padding:6px 12px; border-radius:6px; border:none; background:var(--accent); color:#fff; font-size:12px; font-weight:700; cursor:pointer; min-width: 74px; }
    .bm-loot-btn:disabled { opacity:.5; cursor:not-allowed; }
    .bm-loot-empty { text-align:center; color: var(--text-muted); padding: 30px 10px; font-size: 13px; }
    .bm-loot-progress { width: 100%; height: 5px; background: var(--border); border-radius: 4px; overflow:hidden; margin-top:4px; }
    .bm-loot-progress-fill { height:100%; background: var(--teal); width:0%; transition: width .1s linear; }
  `;
  document.head.appendChild(s);
}

function fmtMs(ms) {
  const s = Math.max(0, Math.ceil(ms / 1000));
  const m = Math.floor(s / 60);
  const r = s % 60;
  return m > 0 ? `${m}:${String(r).padStart(2, "0")}` : `${r}с`;
}
function fmtDuration(ms) {
  const totalMin = Math.max(0, Math.round(ms / 60000));
  const d = Math.floor(totalMin / 1440);
  const h = Math.floor((totalMin % 1440) / 60);
  const m = totalMin % 60;
  const parts = [];
  if (d) parts.push(d + "д");
  if (h) parts.push(h + "г");
  if (!d && m) parts.push(m + "хв");
  return parts.join(" ") || "менше хвилини";
}

// ── ГОЛОВНА СТОРІНКА ───────────────────────
export async function renderBlackMarket(currentUser, gameState) {
  injectBlackMarketStyles();
  const page = document.getElementById("page-blackmarket");
  if (!page || !currentUser?.uid) return;

  page.innerHTML = `<div class="bm-container"><div class="bm-loot-empty">⏳ Завантаження...</div></div>`;

  let myCode = currentUser.playerCode || gameState.playerCode || null;
  try {
    if (!myCode) {
      myCode = await ensurePlayerCode(currentUser.uid);
      currentUser.playerCode = myCode;
      gameState.playerCode = myCode;
    }
  } catch (e) {
    console.error("ensurePlayerCode:", e);
  }

  const lockpicks = (gameState.inventory || []).filter(i => i.type === "lockpick");

  page.innerHTML = `
    <div class="bm-container">
      <div class="bm-title">🕵️ Чорний ринок</div>
      <div class="bm-sub">Тут купують інформацію, купують відмички та обчищають чужі кишені.</div>

      <div class="bm-my-code">Твій кодовий ID: <span class="bm-code">${myCode || "—"}</span><br>
        <span style="color:var(--text-muted);font-size:11px;">Нікому не давай його просто так — по ньому тебе можуть обікрасти.</span>
      </div>

      <div class="bm-card">
        <div class="bm-card-title">🪪 Нік ⇄ Кодовий ID <span class="bm-price">${BM_LOOKUP_FEE} нікусів</span></div>
        <div class="bm-card-desc">Дізнайся код гравця за ніком, або хто ховається за кодовим ID.</div>
        <div class="bm-row" style="margin-bottom:8px;">
          <input class="bm-input" id="bm-name-to-code-input" placeholder="Нікнейм гравця">
          <button class="bm-btn" id="bm-name-to-code-btn">Дізнатись код</button>
        </div>
        <div class="bm-row">
          <input class="bm-input" id="bm-code-to-name-input" placeholder="Кодовий ID (напр. 4857385)">
          <button class="bm-btn" id="bm-code-to-name-btn">Дізнатись нік</button>
        </div>
        <div id="bm-lookup-result"></div>
      </div>

      <div class="bm-card">
        <div class="bm-card-title">🗝️ Відмичка <span class="bm-price">${BM_LOCKPICK_PRICE} нікусів</span></div>
        <div class="bm-card-desc">Потрібна, щоб спробувати обікрасти іншого гравця. Ламається (витрачається) на кожну спробу — вдалу чи ні.</div>
        <div class="bm-row" style="align-items:center;justify-content:space-between;">
          <span style="font-size:13px;color:var(--text-muted);">У тебе: <b style="color:var(--text)">${lockpicks.length}</b> шт.</span>
          <button class="bm-btn" id="bm-buy-lockpick-btn">Купити</button>
        </div>
      </div>

      <div class="bm-card">
        <div class="bm-card-title">🎭 Пограбування</div>
        <div class="bm-card-desc">Введи кодовий ID жертви. Треба вгадати правильний порядок 6 пружин відмичкою — на це є ${MAX_MISTAKES} спроби. Якщо вийде — ${LOOT_WINDOW_MS / 1000} секунд, щоб забрати незаблоковані предмети (${STEAL_ITEM_MS / 1000}с на предмет).</div>
        <div class="bm-row">
          <input class="bm-input" id="bm-robbery-code-input" placeholder="Кодовий ID жертви">
          <button class="bm-btn" id="bm-start-robbery-btn" ${lockpicks.length ? "" : "disabled"}>Обчистити</button>
        </div>
        ${!lockpicks.length ? '<div style="color:var(--text-muted);font-size:11.5px;margin-top:6px;">Потрібна хоча б одна відмичка.</div>' : ""}
      </div>
    </div>
  `;

  document.getElementById("bm-buy-lockpick-btn").onclick = () => bmBuyLockpick(currentUser, gameState);
  document.getElementById("bm-name-to-code-btn").onclick = () => bmLookupNameToCode(currentUser, gameState);
  document.getElementById("bm-code-to-name-btn").onclick = () => bmLookupCodeToName(currentUser, gameState);
  document.getElementById("bm-start-robbery-btn").onclick = () => bmBeginRobbery(currentUser, gameState);
}

// ── ПОКУПКА ВІДМИЧКИ ───────────────────────
async function bmBuyLockpick(currentUser, gameState) {
  const btn = document.getElementById("bm-buy-lockpick-btn");
  if (btn) btn.disabled = true;
  try {
    if ((gameState.balance ?? 0) < BM_LOCKPICK_PRICE) throw new Error("Недостатньо нікусів!");
    const item = await buyLockpick(currentUser.uid);
    gameState.balance -= BM_LOCKPICK_PRICE;
    gameState.inventory = gameState.inventory || [];
    gameState.inventory.push(item);
    try { _bmDeps?.updateBalanceDisplay?.(); } catch (e2) { console.error(e2); }
    _bmDeps?.showToast?.("✅ Куплено відмичку!", "success");
    try { renderBlackMarket(currentUser, gameState); } catch (e2) { console.error(e2); }
  } catch (e) {
    _bmDeps?.showToast?.("❌ " + (e.message || "Помилка"), "error");
    if (btn) btn.disabled = false;
  }
}

// ── ПОШУК НІК ⇄ КОД ─────────────────────────
async function bmLookupNameToCode(currentUser, gameState) {
  const input = document.getElementById("bm-name-to-code-input");
  const out   = document.getElementById("bm-lookup-result");
  const username = (input?.value || "").trim();
  if (!username) { _bmDeps?.showToast?.("Введи нікнейм!", "error"); return; }
  if ((gameState.balance ?? 0) < BM_LOOKUP_FEE) { _bmDeps?.showToast?.("Недостатньо нікусів!", "error"); return; }
  const btn = document.getElementById("bm-name-to-code-btn");
  if (btn) btn.disabled = true;
  try {
    const code = await getPlayerCodeByUsername(username);
    await blackMarketPayLookupFee(currentUser.uid);
    // Гроші вже списані на сервері з цього моменту — результат ОБОВ'ЯЗКОВО
    // показуємо одразу, а всі "косметичні" оновлення (баланс) робимо окремо
    // й безпечно, щоб їхній збій ніколи не приховав вже оплачений результат.
    gameState.balance -= BM_LOOKUP_FEE;
    const resultEl = document.getElementById("bm-lookup-result") || out;
    if (resultEl) resultEl.innerHTML = `<div class="bm-result">Код гравця <b>${escapeHtml(username)}</b>: <span class="bm-code">${code}</span></div>`;
    try { _bmDeps?.updateBalanceDisplay?.(); } catch (e2) { console.error("updateBalanceDisplay:", e2); }
  } catch (e) {
    _bmDeps?.showToast?.("❌ " + (e.message || "Помилка"), "error");
  } finally {
    if (btn) btn.disabled = false;
  }
}

async function bmLookupCodeToName(currentUser, gameState) {
  const input = document.getElementById("bm-code-to-name-input");
  const out   = document.getElementById("bm-lookup-result");
  const code = (input?.value || "").trim();
  if (!code) { _bmDeps?.showToast?.("Введи кодовий ID!", "error"); return; }
  if ((gameState.balance ?? 0) < BM_LOOKUP_FEE) { _bmDeps?.showToast?.("Недостатньо нікусів!", "error"); return; }
  const btn = document.getElementById("bm-code-to-name-btn");
  if (btn) btn.disabled = true;
  try {
    const data = await getPlayerByCode(code);
    await blackMarketPayLookupFee(currentUser.uid);
    gameState.balance -= BM_LOOKUP_FEE;
    const resultEl = document.getElementById("bm-lookup-result") || out;
    if (resultEl) resultEl.innerHTML = `<div class="bm-result">Код <span class="bm-code">${escapeHtml(code)}</span> належить: <b>${escapeHtml(data.username || "?")}</b></div>`;
    try { _bmDeps?.updateBalanceDisplay?.(); } catch (e2) { console.error("updateBalanceDisplay:", e2); }
  } catch (e) {
    _bmDeps?.showToast?.("❌ " + (e.message || "Помилка"), "error");
  } finally {
    if (btn) btn.disabled = false;
  }
}

function escapeHtml(str) {
  return String(str || "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

// ── ЗАПУСК ПОГРАБУВАННЯ ────────────────────
async function bmBeginRobbery(currentUser, gameState) {
  const input = document.getElementById("bm-robbery-code-input");
  const code = (input?.value || "").trim();
  if (!code) { _bmDeps?.showToast?.("Введи кодовий ID жертви!", "error"); return; }

  const lockpick = (gameState.inventory || []).find(i => i.type === "lockpick");
  if (!lockpick) { _bmDeps?.showToast?.("Потрібна відмичка!", "error"); return; }

  let target;
  try {
    target = await getPlayerByCode(code);
  } catch (e) {
    _bmDeps?.showToast?.("❌ " + (e.message || "Гравця не знайдено"), "error"); return;
  }
  if (target.uid === currentUser.uid) { _bmDeps?.showToast?.("Не можна грабувати самого себе 🙃", "error"); return; }

  openLockpickMinigame(currentUser, gameState, target, lockpick);
}

// ── МІНІГРА ВІДМИЧКИ (водиш відмичку по пружинах, тоді натискаєш) ──
function openLockpickMinigame(currentUser, gameState, target, lockpick) {
  const secret = shuffle([...Array(SPRING_COUNT).keys()].map(i => i + 1)); // порядок натискання
  let solvedCount = 0;
  let mistakes = 0;
  const solvedFlags = new Array(SPRING_COUNT).fill(false);
  let cursor = 0; // яку пружину зараз "торкається" відмичка
  let finished = false;

  const railPct   = (idx) => SPRING_COUNT > 1 ? (idx / (SPRING_COUNT - 1)) * 100 : 0;
  const toolLeft  = (idx) => 27 + 35 * idx; // px: центр пружини idx у корпусі (padding 12 + половина ширини 15, крок 35)
  const toolWireW = (idx) => Math.max(0, toolLeft(idx) - 10 - 9); // довжина дроту від лівого краю корпусу до голівки над пружиною idx

  const paint = () => {
    const solved = solvedCount >= SPRING_COUNT;
    const html = `
      <h2 class="modal-title">🔓 Lock picking</h2>
      <div class="bm-lock-wrap">
        <div class="bm-lockpick-progress-label">
          ${solved ? "🔓 Розкрито! Заходимо в інвентар…" : `Підведи відмичку до пружини і натисни — вгадай ${solvedCount + 1}-шу з ${SPRING_COUNT}`}
        </div>
        <div class="bm-attempts">
          ${Array.from({ length: MAX_MISTAKES }).map((_, i) =>
            `<div class="bm-attempt-dot${i < mistakes ? " used" : ""}"></div>`).join("")}
        </div>
        <div class="bm-housing">
          <div class="bm-shear-line"></div>
          <div class="bm-tool-slider">
            <div class="bm-tool-wire" style="width:${toolWireW(cursor)}px;"></div>
            <div class="bm-tool-head">
              <div class="bm-tool-tip"></div>
            </div>
          </div>
          <div class="bm-pins">
            ${Array.from({ length: SPRING_COUNT }).map((_, i) => {
              const springNum = i + 1;
              const locked = solvedFlags[i];
              const active = i === cursor;
              return `<button class="bm-pin${locked ? " bm-pin-locked" : ""}${active ? " bm-pin-active" : ""}" data-idx="${i}" ${locked ? "disabled" : ""}>
                <span class="bm-pin-spring"></span>
                <span class="bm-pin-cyl"></span>
                <span class="bm-pin-num">${springNum}</span>
              </button>`;
            }).join("")}
          </div>
          <div class="bm-rail">
            <div class="bm-rail-wire" style="width:${railPct(cursor)}%"></div>
            <div class="bm-rail-head" style="left:${railPct(cursor)}%"></div>
          </div>
        </div>
        <div class="bm-pick-controls">
          <button class="bm-ctrl-btn" id="bm-move-left" ${solved ? "disabled" : ""}>◀</button>
          <button class="bm-press-btn" id="bm-press" ${solved ? "disabled" : ""}>${solved ? "⏳ Заходимо…" : "🔨 Натиснути"}</button>
          <button class="bm-ctrl-btn" id="bm-move-right" ${solved ? "disabled" : ""}>▶</button>
        </div>
        <button class="btn-secondary btn-full" id="bm-abort-lockpick" style="margin-top:10px;" ${solved ? "disabled" : ""}>Скасувати спробу</button>
      </div>
    `;
    _bmDeps.openModal(html, false);

    if (solved) return; // фінальний кадр — керування вимкнено, чекаємо на openLootWindow

    document.querySelectorAll(".bm-pin:not(:disabled)").forEach(btn => {
      btn.onclick = () => { cursor = parseInt(btn.getAttribute("data-idx"), 10); paint(); };
    });
    document.getElementById("bm-move-left").onclick  = () => moveCursor(-1);
    document.getElementById("bm-move-right").onclick = () => moveCursor(1);
    document.getElementById("bm-press").onclick      = () => handlePress();
    document.getElementById("bm-abort-lockpick").onclick = () => { cleanup(); _bmDeps.closeModal(); };
  };

  const moveCursor = (delta) => {
    if (finished) return;
    cursor = Math.max(0, Math.min(SPRING_COUNT - 1, cursor + delta));
    paint();
  };

  const keyHandler = (e) => {
    if (finished) return;
    if (e.key === "ArrowLeft")  { e.preventDefault(); moveCursor(-1); }
    else if (e.key === "ArrowRight") { e.preventDefault(); moveCursor(1); }
    else if (e.key === " " || e.key === "Enter") { e.preventDefault(); handlePress(); }
  };
  document.addEventListener("keydown", keyHandler);
  const cleanup = () => document.removeEventListener("keydown", keyHandler);

  const finish = async (success) => {
    if (finished) return; // захист від подвійного виклику (напр. подвійний тап)
    finished = true;
    cleanup();
    try {
      await consumeLockpick(currentUser.uid, lockpick.id);
      gameState.inventory = (gameState.inventory || []).filter(i => i.id !== lockpick.id);
    } catch (e) { console.error("consumeLockpick:", e); }

    // Відмичка витрачена — одразу оновлюємо її кількість на сторінці
    // чорного ринку (і в інвентарі), не чекаючи закриття модалки/переходу.
    try { renderBlackMarket(currentUser, gameState); } catch (e) { console.error(e); }
    try { _bmDeps?.renderInventory?.(); } catch (e) { console.error(e); }

    if (!success) {
      _bmDeps.closeModal();
      _bmDeps?.showToast?.("💔 Відмичка зламалась! Пограбування не вдалось.", "error");
      return;
    }
    _bmDeps?.showToast?.("🔓 Замок відкрито! У тебе 30 секунд.", "success");
    try {
      await openLootWindow(currentUser, gameState, target);
    } catch (e) {
      console.error("openLootWindow:", e);
      _bmDeps.closeModal();
      _bmDeps?.showToast?.("❌ Не вдалось відкрити грабунок: " + (e.message || "помилка"), "error");
    }
  };

  const handlePress = () => {
    if (finished || solvedFlags[cursor]) return;
    const springNum = cursor + 1;
    const pinEl = document.querySelector(`.bm-pin[data-idx="${cursor}"]`);

    if (springNum === secret[solvedCount]) {
      solvedFlags[cursor] = true;
      solvedCount++;
      if (solvedCount >= SPRING_COUNT) { paint(); finish(true); return; }
      const next = solvedFlags.findIndex(f => !f);
      cursor = next === -1 ? cursor : next;
      paint();
    } else {
      mistakes++;
      pinEl?.classList.add("bm-pin-wrong");
      if (mistakes >= MAX_MISTAKES) { setTimeout(() => finish(false), 300); return; }
      setTimeout(paint, 320);
    }
  };

  paint();
}

function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

// ── ВІКНО ГРАБЕЖУ (30с) ────────────────────
async function openLootWindow(currentUser, gameState, target) {
  let snapshot;
  try {
    snapshot = await getRobberyTargetSnapshot(target.uid);
  } catch (e) {
    _bmDeps?.showToast?.("❌ Не вдалось отримати доступ до інвентаря", "error");
    return;
  }

  let remaining = new Map(snapshot.stealable.map(i => [i.id, i]));
  let stolenNames = [];
  let stealing = false;
  const deadline = Date.now() + LOOT_WINDOW_MS;
  let timerHandle = null;

  const paintList = () => {
    const listEl = document.getElementById("bm-loot-list");
    if (!listEl) return;
    const items = [...remaining.values()];
    listEl.innerHTML = items.length ? items.map(it => `
      <div class="bm-loot-item" data-item="${it.id}">
        <img src="${it.img || "img/placeholder.png"}" onerror="this.src='img/placeholder.png'">
        <div class="bm-loot-item-name">
          ${escapeHtml(it.name)}
          <div class="bm-loot-progress" style="display:none;"><div class="bm-loot-progress-fill"></div></div>
        </div>
        <button class="bm-loot-btn" data-take="${it.id}">Забрати</button>
      </div>
    `).join("") : `<div class="bm-loot-empty">Тут порожньо — все або заблоковано, або вже забрано.</div>`;

    listEl.querySelectorAll("[data-take]").forEach(btn => {
      btn.onclick = () => takeItem(btn.getAttribute("data-take"));
    });
  };

  const paintShell = () => {
    _bmDeps.openModal(`
      <h2 class="modal-title">💰 Грабуй, поки можеш — ${escapeHtml(snapshot.username)}</h2>
      <div class="bm-loot-timer" id="bm-loot-timer">${fmtMs(deadline - Date.now())}</div>
      <div class="bm-loot-list" id="bm-loot-list"></div>
      <button class="btn-secondary btn-full" id="bm-loot-leave" style="margin-top:12px;">Піти</button>
    `, false);
    paintList();
    document.getElementById("bm-loot-leave").onclick = () => endLoot();
  };

  const endLoot = async () => {
    if (timerHandle) clearInterval(timerHandle);
    _bmDeps.closeModal();
    if (stolenNames.length) {
      _bmDeps?.showToast?.(`✅ Вкрадено: ${stolenNames.join(", ")}`, "success");
      addNotification(target.uid, {
        type: "robbed",
        icon: "🕵️",
        title: "Тебе обікрали!",
        message: `Хтось з кодовим ID ${currentUser.playerCode || "?"} проник у твій інвентар і забрав: ${stolenNames.join(", ")}. Заблоковані предмети чіпати не змогли. Пробий цей код у чорному ринку, щоб дізнатись хто це.`,
      }).catch(() => {});
    }
    _bmDeps?.saveData?.();
    _bmDeps?.renderInventory?.();
  };

  const takeItem = (itemId) => {
    if (stealing) return;
    const item = remaining.get(itemId);
    if (!item) return;
    stealing = true;

    const row = document.querySelector(`.bm-loot-item[data-item="${itemId}"]`);
    const progWrap = row?.querySelector(".bm-loot-progress");
    const progFill = row?.querySelector(".bm-loot-progress-fill");
    const takeBtn  = row?.querySelector("[data-take]");
    if (progWrap) progWrap.style.display = "block";
    if (takeBtn) takeBtn.disabled = true;

    const start = Date.now();
    const stealEnd = Math.min(start + STEAL_ITEM_MS, deadline);
    const stealTimer = setInterval(async () => {
      const now = Date.now();
      const pct = Math.min(100, ((now - start) / STEAL_ITEM_MS) * 100);
      if (progFill) progFill.style.width = pct + "%";

      if (now >= deadline) {
        clearInterval(stealTimer);
        stealing = false;
        endLoot();
        return;
      }
      if (now >= stealEnd) {
        clearInterval(stealTimer);
        try {
          const res = await stealInventoryItem(currentUser.uid, target.uid, itemId);
          gameState.inventory = gameState.inventory || [];
          gameState.inventory.push({ id: res.stolenItemName ? itemId : itemId, name: res.stolenItemName, img: item.img, type: item.type, rarity: item.rarity });
          stolenNames.push(res.stolenItemName || item.name);
          remaining.delete(itemId);
          paintList();
        } catch (e) {
          _bmDeps?.showToast?.("❌ " + (e.message || "Не вдалось забрати"), "error");
          remaining.delete(itemId);
          paintList();
        }
        stealing = false;
      }
    }, 100);
  };

  paintShell();
  timerHandle = setInterval(() => {
    const left = deadline - Date.now();
    const timerEl = document.getElementById("bm-loot-timer");
    if (timerEl) timerEl.textContent = fmtMs(left);
    if (left <= 0) endLoot();
  }, 250);
}

// ── ПЛАТНЕ БЛОКУВАННЯ ПРЕДМЕТА (виклик з інвентаря) ────────
export function openLockItemModal(currentUser, gameState, itemId, afterChange) {
  const item = (gameState.inventory || []).find(i => i.id === itemId);
  if (!item) return;

  if (item.blockedUntil && item.blockedUntil > Date.now()) {
    _bmDeps.openModal(`
      <h2 class="modal-title">🔒 ${escapeHtml(item.name)}</h2>
      <div class="bm-card-desc" style="margin-bottom:0;">
        Предмет заблокований ще ${fmtDuration(item.blockedUntil - Date.now())}.<br>
        Поки блок діє — його не можна продати, обміняти, подарувати, покласти в общак чи використати в крафті. Достроково зняти блок не можна.
      </div>
      <button class="btn-secondary btn-full" style="margin-top:14px;" id="bm-lock-close">Закрити</button>
    `);
    document.getElementById("bm-lock-close").onclick = () => _bmDeps.closeModal();
    return;
  }

  const days = [1, 2, 3, 5, 7, 10];
  _bmDeps.openModal(`
    <h2 class="modal-title">🔒 Заблокувати "${escapeHtml(item.name)}"</h2>
    <div class="bm-card-desc">Заблокований предмет захищений від крадіжки, але й сам стає "фантиком": його не можна продати, обміняти, подарувати, покласти в общак чи скрафтити, поки блок діє. Достроково зняти блок не можна.</div>
    <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:8px;margin:14px 0;">
      ${days.map(d => `
        <button class="bm-btn secondary" data-days="${d}" style="flex-direction:column;padding:10px 4px;">
          <div style="font-weight:800;">${d} ${d === 1 ? "доба" : "діб"}</div>
          <div class="bm-price">${getPriceLabel(d)}</div>
        </button>
      `).join("")}
    </div>
    <button class="btn-secondary btn-full" id="bm-lock-cancel">Скасувати</button>
  `);

  document.querySelectorAll("[data-days]").forEach(btn => {
    btn.onclick = async () => {
      const d = parseInt(btn.getAttribute("data-days"), 10);
      btn.disabled = true;
      try {
        const blockedUntil = await lockInventoryItem(currentUser.uid, itemId, d);
        const price = getPriceLabel(d, true);
        gameState.balance -= price;
        const idx = gameState.inventory.findIndex(i => i.id === itemId);
        if (idx !== -1) gameState.inventory[idx] = { ...gameState.inventory[idx], blockedUntil, blockedDays: d };
        _bmDeps.closeModal();
        try { _bmDeps?.updateBalanceDisplay?.(); } catch (e2) { console.error(e2); }
        _bmDeps?.showToast?.("🔒 Предмет заблоковано на " + d + " діб", "success");
        try { afterChange?.(); } catch (e2) { console.error(e2); }
      } catch (e) {
        _bmDeps?.showToast?.("❌ " + (e.message || "Помилка"), "error");
        btn.disabled = false;
      }
    };
  });
  document.getElementById("bm-lock-cancel").onclick = () => _bmDeps.closeModal();
}

function getPriceLabel(days, numeric) {
  const price = 15 * days;
  return numeric ? price : price + " нікусів";
}

export { bmInit };
