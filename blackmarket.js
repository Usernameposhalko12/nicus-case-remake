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

    /* ── Мінігра відмички ── */
    .bm-lock-wrap { text-align: center; }
    .bm-springs { display: flex; flex-direction: column-reverse; gap: 6px; margin: 16px auto; max-width: 260px; }
    .bm-spring {
      display: flex; align-items: center; justify-content: center; gap: 8px;
      height: 40px; border-radius: 8px; border: 2px solid var(--border);
      background: var(--bg-input); color: var(--text); font-weight: 700; cursor: pointer;
      transition: all .15s ease; font-size: 14px;
    }
    .bm-spring:hover:not(.bm-spring-locked):not(:disabled) { border-color: var(--accent); }
    .bm-spring-locked { background: rgba(94,203,62,0.15); border-color: var(--teal); cursor: default; color: var(--teal); }
    .bm-spring:disabled { opacity: .4; cursor: not-allowed; }
    .bm-attempts { display: flex; gap: 6px; justify-content: center; margin: 10px 0; }
    .bm-attempt-dot { width: 14px; height: 14px; border-radius: 50%; background: #f05060; }
    .bm-attempt-dot.used { background: var(--border); opacity: .4; }
    .bm-progress-label { font-size: 13px; color: var(--text-muted); margin-bottom: 4px; }

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
    _bmDeps?.updateBalanceDisplay?.();
    _bmDeps?.showToast?.("✅ Куплено відмичку!", "success");
    renderBlackMarket(currentUser, gameState);
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
  try {
    const code = await getPlayerCodeByUsername(username);
    await blackMarketPayLookupFee(currentUser.uid);
    gameState.balance -= BM_LOOKUP_FEE;
    _bmDeps?.updateBalanceDisplay?.();
    if (out) out.innerHTML = `<div class="bm-result">Код гравця <b>${escapeHtml(username)}</b>: <span class="bm-code">${code}</span></div>`;
  } catch (e) {
    _bmDeps?.showToast?.("❌ " + (e.message || "Помилка"), "error");
  }
}

async function bmLookupCodeToName(currentUser, gameState) {
  const input = document.getElementById("bm-code-to-name-input");
  const out   = document.getElementById("bm-lookup-result");
  const code = (input?.value || "").trim();
  if (!code) { _bmDeps?.showToast?.("Введи кодовий ID!", "error"); return; }
  if ((gameState.balance ?? 0) < BM_LOOKUP_FEE) { _bmDeps?.showToast?.("Недостатньо нікусів!", "error"); return; }
  try {
    const data = await getPlayerByCode(code);
    await blackMarketPayLookupFee(currentUser.uid);
    gameState.balance -= BM_LOOKUP_FEE;
    _bmDeps?.updateBalanceDisplay?.();
    if (out) out.innerHTML = `<div class="bm-result">Код <span class="bm-code">${escapeHtml(code)}</span> належить: <b>${escapeHtml(data.username || "?")}</b></div>`;
  } catch (e) {
    _bmDeps?.showToast?.("❌ " + (e.message || "Помилка"), "error");
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

// ── МІНІГРА ВІДМИЧКИ (пружини) ─────────────
function openLockpickMinigame(currentUser, gameState, target, lockpick) {
  const secret = shuffle([...Array(SPRING_COUNT).keys()].map(i => i + 1)); // порядок натискання
  let solvedCount = 0;
  let mistakes = 0;
  const solvedFlags = new Array(SPRING_COUNT).fill(false);

  const paint = () => {
    const html = `
      <h2 class="modal-title">🔓 Відмичка</h2>
      <div class="bm-lock-wrap">
        <div class="bm-progress-label">Вгадай, яку пружину натиснути ${solvedCount + 1}-ю з ${SPRING_COUNT}</div>
        <div class="bm-attempts">
          ${Array.from({ length: MAX_MISTAKES }).map((_, i) =>
            `<div class="bm-attempt-dot${i < mistakes ? " used" : ""}"></div>`).join("")}
        </div>
        <div class="bm-springs">
          ${Array.from({ length: SPRING_COUNT }).map((_, i) => {
            const springNum = i + 1;
            const locked = solvedFlags[i];
            return `<button class="bm-spring${locked ? " bm-spring-locked" : ""}" data-spring="${springNum}" ${locked ? "disabled" : ""}>
              ${locked ? "🔒" : "🔧"} Пружина ${springNum}
            </button>`;
          }).join("")}
        </div>
        <button class="btn-secondary btn-full" id="bm-abort-lockpick">Скасувати спробу</button>
      </div>
    `;
    _bmDeps.openModal(html, false);

    document.querySelectorAll(".bm-spring:not(:disabled)").forEach(btn => {
      btn.onclick = () => handleGuess(parseInt(btn.getAttribute("data-spring"), 10));
    });
    document.getElementById("bm-abort-lockpick").onclick = () => {
      _bmDeps.closeModal();
    };
  };

  const finish = async (success) => {
    try {
      await consumeLockpick(currentUser.uid, lockpick.id);
      gameState.inventory = (gameState.inventory || []).filter(i => i.id !== lockpick.id);
    } catch (e) { /* ignore */ }

    if (!success) {
      _bmDeps.closeModal();
      _bmDeps?.showToast?.("💔 Відмичка зламалась! Пограбування не вдалось.", "error");
      return;
    }
    _bmDeps?.showToast?.("🔓 Замок відкрито! У тебе 30 секунд.", "success");
    openLootWindow(currentUser, gameState, target);
  };

  const handleGuess = (springNum) => {
    if (springNum === secret[solvedCount]) {
      solvedFlags[springNum - 1] = true;
      solvedCount++;
      if (solvedCount >= SPRING_COUNT) { finish(true); return; }
      paint();
    } else {
      mistakes++;
      if (mistakes >= MAX_MISTAKES) { finish(false); return; }
      paint();
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
        _bmDeps?.updateBalanceDisplay?.();
        _bmDeps?.showToast?.("🔒 Предмет заблоковано на " + d + " діб", "success");
        afterChange?.();
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
