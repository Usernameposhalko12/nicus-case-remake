// ПРОМОКОДИ — promo.js
// Нікус Кейс Ремейк
// ============================================

import {
  db,
} from "./firebase.js";

import {
  doc, getDoc, setDoc, updateDoc, deleteDoc,
  collection, getDocs, query, where, orderBy, limit,
  serverTimestamp, runTransaction, increment,
  Timestamp,
} from "https://www.gstatic.com/firebasejs/10.7.0/firebase-firestore.js";

// ── СТИЛІ ──────────────────────────────────

function injectPromoStyles() {
  if (document.getElementById("promo-styles")) return;
  const s = document.createElement("style");
  s.id = "promo-styles";
  s.textContent = `
    /* ── Сторінка промокодів ── */
    #page-promo {
      padding: 16px;
      padding-bottom: 30px;
    }

    /* ── Героїчний заголовок ── */
    .promo-hero {
      position: relative;
      border-radius: 20px;
      overflow: hidden;
      margin-bottom: 20px;
      padding: 28px 22px;
      background: linear-gradient(135deg,
        rgba(255,215,0,0.18) 0%,
        rgba(240,125,40,0.14) 50%,
        rgba(10,180,204,0.12) 100%
      );
      border: 1.5px solid rgba(255,215,0,0.25);
      box-shadow: 0 8px 32px rgba(0,0,0,0.12), 0 0 40px rgba(255,200,0,0.08);
      backdrop-filter: blur(20px);
    }
    .promo-hero::before {
      content: '';
      position: absolute;
      inset: 0;
      background-image:
        linear-gradient(rgba(255,215,0,0.06) 1px, transparent 1px),
        linear-gradient(90deg, rgba(255,215,0,0.06) 1px, transparent 1px);
      background-size: 28px 28px;
      pointer-events: none;
    }
    .promo-hero-icon {
      font-size: 40px;
      margin-bottom: 8px;
      display: block;
      animation: promoBounce 2.5s ease-in-out infinite;
    }
    @keyframes promoBounce {
      0%,100% { transform: translateY(0) rotate(-3deg); }
      50%      { transform: translateY(-6px) rotate(3deg); }
    }
    .promo-hero-title {
      font-family: 'Syne', sans-serif;
      font-size: 22px;
      font-weight: 800;
      background: linear-gradient(135deg, #FFD700, #FF8C00);
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
      background-clip: text;
      margin-bottom: 4px;
    }
    .promo-hero-sub {
      font-size: 13px;
      color: var(--text-muted);
    }

    /* ── Форма введення ── */
    .promo-input-wrap {
      background: var(--bg-card);
      border: 1.5px solid var(--border);
      border-radius: 16px;
      padding: 20px;
      margin-bottom: 18px;
      box-shadow: 0 4px 16px rgba(0,0,0,0.06);
    }
    .promo-input-label {
      font-size: 12px;
      font-weight: 700;
      color: var(--text-muted);
      text-transform: uppercase;
      letter-spacing: 1px;
      margin-bottom: 10px;
      display: block;
    }

.promo-input-row {
  display: flex;
  gap: 10px;
  align-items: stretch;
  flex-wrap: wrap;
}
.promo-code-input {
  min-width: 0;
  flex: 1 1 160px;
}
.promo-submit-btn {
  flex: 0 0 auto;
  width: 100%;
}
@media (min-width: 380px) {
  .promo-submit-btn {
    width: auto;
  }
}

    .promo-code-input {
      flex: 1;
      padding: 13px 16px;
      border-radius: 12px;
      border: 2px solid var(--border);
      background: var(--bg-input);
      color: var(--text);
      font-size: 17px;
      font-weight: 700;
      font-family: 'Courier New', monospace;
      letter-spacing: 2px;
      text-transform: uppercase;
      transition: border-color 0.2s, box-shadow 0.2s;
    }
    .promo-code-input::placeholder {
      color: var(--text-dim);
      font-weight: 400;
      letter-spacing: 0px;
      font-size: 14px;
    }
    .promo-code-input:focus {
      outline: none;
      border-color: #FFD700;
      box-shadow: 0 0 0 3px rgba(255,215,0,0.15);
    }
    .promo-submit-btn {
      padding: 13px 22px;
      border-radius: 12px;
      background: linear-gradient(135deg, #FFD700, #FF8C00);
      color: #111;
      font-size: 15px;
      font-weight: 800;
      border: none;
      cursor: pointer;
      transition: all 0.2s;
      box-shadow: 0 4px 16px rgba(255,180,0,0.35);
      white-space: nowrap;
      flex-shrink: 0;
    }
    .promo-submit-btn:hover:not(:disabled) {
      filter: brightness(1.08);
      transform: translateY(-2px);
      box-shadow: 0 6px 24px rgba(255,180,0,0.4);
    }
    .promo-submit-btn:disabled {
      background: var(--bg-input);
      color: var(--text-dim);
      box-shadow: none;
      cursor: not-allowed;
      transform: none;
    }

    /* ── Останні використання ── */
    .promo-history {
      background: var(--bg-card);
      border: 1.5px solid var(--border);
      border-radius: 16px;
      padding: 16px;
      box-shadow: 0 4px 16px rgba(0,0,0,0.06);
    }
    .promo-history-title {
      font-size: 13px;
      font-weight: 700;
      color: var(--text-muted);
      text-transform: uppercase;
      letter-spacing: 0.8px;
      margin-bottom: 12px;
      display: flex;
      align-items: center;
      gap: 6px;
    }
    .promo-history-list {
      display: flex;
      flex-direction: column;
      gap: 8px;
    }
    .promo-history-item {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 10px 12px;
      background: var(--bg-card2);
      border-radius: 10px;
      border: 1px solid var(--border);
      gap: 10px;
    }
    .promo-history-code {
      font-family: 'Courier New', monospace;
      font-size: 13px;
      font-weight: 700;
      color: #FFD700;
      letter-spacing: 1px;
    }
    .promo-history-time {
      font-size: 11px;
      color: var(--text-dim);
    }
    .promo-history-empty {
      text-align: center;
      color: var(--text-dim);
      font-size: 13px;
      padding: 16px 0;
    }

    /* ── Модалка помилки промо ── */
    .promo-error-modal {
      text-align: center;
      padding: 8px 0;
    }
    .promo-error-icon {
      font-size: 52px;
      margin-bottom: 12px;
      display: block;
    }
    .promo-error-title {
      font-family: 'Syne', sans-serif;
      font-size: 20px;
      font-weight: 800;
      color: #e74c3c;
      margin-bottom: 8px;
    }
    .promo-error-desc {
      font-size: 14px;
      color: var(--text-muted);
      line-height: 1.6;
      margin-bottom: 20px;
    }

    /* ══════════════════════════════════
       АДМІН ПРОМОКОДИ
    ══════════════════════════════════ */
    .promo-admin-wrap {
      display: flex;
      flex-direction: column;
      gap: 14px;
    }
    .promo-admin-card {
      background: var(--bg-card2);
      border: 1.5px solid var(--border);
      border-radius: 14px;
      padding: 14px 16px;
      position: relative;
    }
    .promo-admin-code {
      font-family: 'Courier New', monospace;
      font-size: 18px;
      font-weight: 800;
      color: #FFD700;
      letter-spacing: 2px;
      margin-bottom: 6px;
      display: flex;
      align-items: center;
      gap: 8px;
      flex-wrap: wrap;
    }
    .promo-admin-status-badge {
      font-size: 10px;
      font-weight: 700;
      padding: 2px 8px;
      border-radius: 20px;
      letter-spacing: 0.5px;
      font-family: 'DM Sans', sans-serif;
    }
    .badge-active   { background: rgba(94,203,62,0.18); color: #3a9a20; border: 1px solid rgba(94,203,62,0.35); }
    .badge-expired  { background: rgba(240,80,96,0.12); color: #e74c3c; border: 1px solid rgba(240,80,96,0.25); }
    .badge-depleted { background: rgba(100,100,100,0.12); color: #888; border: 1px solid rgba(100,100,100,0.25); }

    .promo-admin-meta {
      display: flex;
      flex-wrap: wrap;
      gap: 6px;
      margin-bottom: 10px;
    }
    .promo-admin-tag {
      font-size: 11px;
      padding: 3px 9px;
      border-radius: 20px;
      border: 1px solid var(--border);
      color: var(--text-muted);
      background: var(--bg-card);
    }
    .promo-admin-reward {
      font-size: 13px;
      color: var(--text);
      margin-bottom: 10px;
      font-weight: 600;
    }

    /* ── Адаптивні кнопки адмін-карток ── */
    .promo-admin-actions {
      display: flex;
      flex-wrap: wrap;
      gap: 6px;
    }
    .promo-admin-actions .btn-sm {
      flex: 1 1 auto;
      min-width: 0;
      white-space: nowrap;
      font-size: 12px;
      padding: 7px 10px;
      text-align: center;
    }
    @media (max-width: 400px) {
      .promo-admin-actions .btn-sm {
        font-size: 11px;
        padding: 6px 8px;
      }
    }

    .promo-admin-progress {
      margin-bottom: 10px;
    }
    .promo-admin-progress-bar {
      height: 6px;
      background: var(--bg-input);
      border-radius: 3px;
      overflow: hidden;
      margin-top: 4px;
    }
    .promo-admin-progress-fill {
      height: 100%;
      background: linear-gradient(90deg, #FFD700, #FF8C00);
      border-radius: 3px;
      transition: width 0.4s;
    }
    .promo-admin-progress-text {
      font-size: 11px;
      color: var(--text-muted);
      display: flex;
      justify-content: space-between;
    }

    /* ── Форма створення промо ── */
    .promo-create-form {
      display: flex;
      flex-direction: column;
      gap: 12px;
    }
    .promo-field-label {
      font-size: 11px;
      font-weight: 700;
      color: var(--text-muted);
      text-transform: uppercase;
      letter-spacing: 0.8px;
      margin-bottom: 5px;
      display: block;
    }
    .promo-reward-tabs {
      display: flex;
      gap: 6px;
      flex-wrap: wrap;
    }
    .promo-reward-tab {
      padding: 7px 14px;
      border-radius: 20px;
      border: 1.5px solid var(--border);
      background: var(--bg-card2);
      color: var(--text-muted);
      font-size: 12px;
      font-weight: 700;
      cursor: pointer;
      transition: all 0.15s;
    }
    .promo-reward-tab.active {
      background: linear-gradient(135deg, rgba(255,215,0,0.18), rgba(255,140,0,0.1));
      border-color: #FFD700;
      color: #cc8800;
    }
    .promo-reward-section {
      background: var(--bg-card2);
      border: 1px solid var(--border);
      border-radius: 10px;
      padding: 12px;
    }

    /* ── Список хто використав ── */
    .promo-user-row {
      padding: 10px 12px;
      background: var(--bg-card2);
      border-radius: 8px;
      margin-bottom: 6px;
      font-size: 13px;
    }
    .promo-user-name {
      font-weight: 700;
      color: var(--text);
      margin-bottom: 2px;
    }
    .promo-user-uid {
      font-family: 'Courier New', monospace;
      font-size: 10px;
      color: var(--text-dim);
      word-break: break-all;
    }

    /* Анімація появи промокодів */
    @keyframes promoCardIn {
      from { opacity: 0; transform: translateY(12px) scale(0.97); }
      to   { opacity: 1; transform: translateY(0) scale(1); }
    }
    .promo-admin-card {
      animation: promoCardIn 0.25s ease-out;
    }
  `;
  document.head.appendChild(s);
}

// ── ГОЛОВНА СТОРІНКА ПРОМОКОДІВ ────────────

export async function renderPromoPage(gameState, currentUser, deps) {
  injectPromoStyles();
  const page = document.getElementById("page-promo");
  if (!page) return;

  const history = await loadPromoHistory(currentUser.uid);

  page.innerHTML = `
    <div class="promo-hero">
      <span class="promo-hero-icon">🎟️</span>
      <div class="promo-hero-title">Промокоди</div>
      <div class="promo-hero-sub">Введи код та отримай нагороду!</div>
    </div>

    <div class="promo-input-wrap">
      <label class="promo-input-label">🔑 Введи промокод</label>
      <div class="promo-input-row">
        <input
          type="text"
          id="promo-code-field"
          class="promo-code-input"
          placeholder="NIKUS2026..."
          maxlength="32"
          autocomplete="off"
          autocorrect="off"
          spellcheck="false"
          oninput="this.value=this.value.toUpperCase()"
          onkeydown="if(event.key==='Enter')window._submitPromoCode()"
        >
        <button class="promo-submit-btn" onclick="window._submitPromoCode()">
          🎁 Отримати
        </button>
      </div>
    </div>

    <div class="promo-history">
      <div class="promo-history-title">
        🕒 Останні використання
      </div>
      <div class="promo-history-list" id="promo-history-list">
        ${renderPromoHistoryList(history)}
      </div>
    </div>
  `;

  window._submitPromoCode = () => submitPromoCode(gameState, currentUser, deps);
}

function renderPromoHistoryList(history) {
  if (!history.length) {
    return `<div class="promo-history-empty">📭 Ще не використовував жодного промокоду</div>`;
  }
  return history.map(h => {
    const d = h.usedAt?.toDate ? h.usedAt.toDate() : new Date(h.usedAt);
    const timeStr = d.toLocaleString("uk-UA", {
      day: "2-digit", month: "2-digit", year: "numeric",
      hour: "2-digit", minute: "2-digit"
    });
    return `
      <div class="promo-history-item">
        <span class="promo-history-code">🎟️ ${h.code}</span>
        <span class="promo-history-time">${timeStr}</span>
      </div>`;
  }).join("");
}

// ── ЗАВАНТАЖИТИ ІСТОРІЮ ГРАВЦЯ ──────────────

async function loadPromoHistory(uid) {
  try {
    const ref = collection(db, "users", uid, "promoHistory");
    const q = query(ref, orderBy("usedAt", "desc"), limit(10));
    const snap = await getDocs(q);
    return snap.docs.map(d => ({ id: d.id, ...d.data() }));
  } catch (e) {
    return [];
  }
}

// ── АКТИВАЦІЯ ПРОМОКОДУ ────────────────────

async function submitPromoCode(gameState, currentUser, deps) {
  const input = document.getElementById("promo-code-field");
  if (!input) return;
  const code = (input.value || "").trim().toUpperCase();
  if (!code) {
    deps.showToast("Введіть промокод!", "error");
    return;
  }

  const btn = document.querySelector(".promo-submit-btn");
  if (btn) { btn.disabled = true; btn.textContent = "⏳ Перевірка..."; }

  try {
    const result = await activatePromoCode(code, currentUser, gameState, deps);
    input.value = "";
    const history = await loadPromoHistory(currentUser.uid);
    const listEl = document.getElementById("promo-history-list");
    if (listEl) listEl.innerHTML = renderPromoHistoryList(history);
    deps.showToast("🎟️ Промокод використано! Отримано: " + result.label, "success");
  } catch (e) {
    showPromoErrorModal(e.message, deps);
  } finally {
    if (btn) { btn.disabled = false; btn.textContent = "🎁 Отримати"; }
  }
}

// ── ЛОГІКА АКТИВАЦІЇ (транзакція) ──────────

async function activatePromoCode(code, currentUser, gameState, deps) {
  const promoRef = doc(db, "promoCodes", code);

  return await runTransaction(db, async (tx) => {
    const promoSnap = await tx.get(promoRef);
    if (!promoSnap.exists()) {
      throw new Error("❌ Промокод не існує або вже недійсний.");
    }

    const promo = promoSnap.data();

    if (!promo.active) {
      throw new Error("⛔ Цей промокод вже деактивовано адміном.");
    }

    if (promo.expiresAt) {
      const exp = promo.expiresAt.toDate ? promo.expiresAt.toDate() : new Date(promo.expiresAt);
      if (new Date() > exp) {
        throw new Error("⏰ Термін дії цього промокоду вже закінчився.");
      }
    }

    if (promo.maxUses !== null && promo.maxUses !== undefined) {
      if ((promo.usedCount || 0) >= promo.maxUses) {
        throw new Error("🚫 Цей промокод вже вичерпано (досягнуто ліміт використань).");
      }
    }

    const usedBy = promo.usedBy || [];
    if (usedBy.includes(currentUser.uid)) {
      throw new Error("🔄 Ти вже використовував цей промокод раніше.");
    }

    const userRef = doc(db, "users", currentUser.uid);
    const userSnap = await tx.get(userRef);
    if (!userSnap.exists()) throw new Error("Гравця не знайдено!");

    const userData = userSnap.data();
    const updates = {};
    const inv = [...(userData.inventory || [])];

    const reward = promo.reward;
    let label = "";

    if (reward.type === "balance") {
      updates.balance = (userData.balance || 0) + reward.amount;
      label = "+" + reward.amount + " нікусів 💰";
    } else if (reward.type === "mellcoins") {
      updates.mellCoins = (userData.mellCoins || 0) + reward.amount;
      label = "+" + reward.amount + " МеллКоінс 🪙";
    } else if (reward.type === "balance+mellcoins") {
      updates.balance = (userData.balance || 0) + (reward.balance || 0);
      updates.mellCoins = (userData.mellCoins || 0) + (reward.mellCoins || 0);
      label = "+" + reward.balance + " нікусів 💰 та +" + reward.mellCoins + " МеллКоінс 🪙";
    } else if (reward.type === "item") {
      const newItem = {
        id: generateId(),
        type: "item",
        itemId: reward.itemId || "promo_item",
        name: reward.name,
        img: reward.img || "img/placeholder.png",
        rarity: reward.rarity || "common",
        collection: reward.collection || null,
        quality: reward.quality || "Прямо з цеху",
        premium: reward.premium || false,
        fromCase: "promo",
        fromCaseName: "Промокод",
        source: "promo",
        promoCode: code,
        obtainedBy: currentUser.username || "?",
        obtainedAt: Date.now(),
      };
      inv.push(newItem);
      updates.inventory = inv;
      label = reward.name + " 🎁";
    } else if (reward.type === "case") {
      const newCase = {
        id: generateId(),
        type: "case",
        caseId: reward.caseId,
        name: reward.name,
        img: reward.img || "img/placeholder.png",
        fromCaseName: "Промокод",
        source: "promo",
        promoCode: code,
        obtainedBy: currentUser.username || "?",
        obtainedAt: Date.now(),
        boughtAt: Date.now(),
      };
      inv.push(newCase);
      updates.inventory = inv;
      label = "📦 " + reward.name;
    } else if (reward.type === "multi") {
      if (reward.balance) updates.balance = (userData.balance || 0) + reward.balance;
      if (reward.mellCoins) updates.mellCoins = (userData.mellCoins || 0) + reward.mellCoins;
      const labels = [];
      if (reward.balance) labels.push("+" + reward.balance + " 💰");
      if (reward.mellCoins) labels.push("+" + reward.mellCoins + " 🪙");
      if (reward.items && reward.items.length) {
        reward.items.forEach(item => {
          inv.push({
            id: generateId(),
            type: item.type || "item",
            itemId: item.itemId || item.caseId || "promo_item",
            caseId: item.caseId || undefined,
            name: item.name,
            img: item.img || "img/placeholder.png",
            rarity: item.rarity || "common",
            collection: item.collection || null,
            quality: item.quality || "Прямо з цеху",
            premium: item.premium || false,
            fromCase: "promo",
            fromCaseName: "Промокод",
            source: "promo",
            promoCode: code,
            obtainedBy: currentUser.username || "?",
            obtainedAt: Date.now(),
            boughtAt: Date.now(),
          });
          labels.push(item.name);
        });
        updates.inventory = inv;
      }
      label = labels.join(", ");
    }

    tx.update(userRef, updates);

    tx.update(promoRef, {
      usedCount: (promo.usedCount || 0) + 1,
      usedBy: [...usedBy, currentUser.uid],
      lastUsedAt: serverTimestamp(),
    });

    const histRef = doc(collection(db, "users", currentUser.uid, "promoHistory"));
    tx.set(histRef, {
      code,
      label,
      usedAt: serverTimestamp(),
    });

    if (updates.balance !== undefined) gameState.balance = updates.balance;
    if (updates.mellCoins !== undefined) gameState.mellCoins = updates.mellCoins;
    if (updates.inventory !== undefined) gameState.inventory = updates.inventory;

    return { label };
  });
}

// ── МОДАЛКА ПОМИЛКИ ────────────────────────

function showPromoErrorModal(message, deps) {
  if (deps.openModal) {
    deps.openModal(`
      <div class="promo-error-modal">
        <span class="promo-error-icon">🚫</span>
        <div class="promo-error-title">Промокод не діє</div>
        <div class="promo-error-desc">${message}</div>
        <button class="btn-primary btn-full" onclick="closeModal()">Зрозуміло</button>
      </div>
    `);
  }
}

// ── ГЕНЕРАТОР ID ──────────────────────────

function generateId() {
  return Math.random().toString(36).slice(2) + Date.now().toString(36);
}

// ── ЗАВАНТАЖИТИ НІКНЕЙМИ ПО UID ───────────

async function fetchUsernamesByUids(uids) {
  // Повертає { uid: username }
  const result = {};
  if (!uids || !uids.length) return result;

  // Завантажуємо паралельно, по кожному uid беремо users/{uid}.username
  await Promise.all(uids.map(async (uid) => {
    try {
      const snap = await getDoc(doc(db, "users", uid));
      if (snap.exists()) {
        result[uid] = snap.data().username || null;
      }
    } catch (e) {
      // ігноруємо помилки окремих uid
    }
  }));

  return result;
}

// ══════════════════════════════════════════════
// АДМІН ПАНЕЛЬ ПРОМОКОДІВ
// ══════════════════════════════════════════════

export async function renderAdminPromoPanel(deps) {
  injectPromoStyles();

  let promos = [];
  try {
    const snap = await getDocs(collection(db, "promoCodes"));
    promos = snap.docs.map(d => ({ id: d.id, ...d.data() }));
    promos.sort((a, b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0));
  } catch (e) {
    deps.showToast("Помилка завантаження: " + e.message, "error");
  }

  const now = new Date();
  const getStatus = (p) => {
    if (!p.active) return { label: "Деактивовано", cls: "badge-expired" };
    if (p.expiresAt) {
      const exp = p.expiresAt.toDate ? p.expiresAt.toDate() : new Date(p.expiresAt);
      if (now > exp) return { label: "Термін вийшов", cls: "badge-expired" };
    }
    if (p.maxUses !== null && p.maxUses !== undefined && (p.usedCount || 0) >= p.maxUses) {
      return { label: "Вичерпано", cls: "badge-depleted" };
    }
    return { label: "Активний", cls: "badge-active" };
  };

  const rewardLabel = (r) => {
    if (!r) return "—";
    if (r.type === "balance") return "💰 +" + r.amount + " нікусів";
    if (r.type === "mellcoins") return "🪙 +" + r.amount + " МеллКоінс";
    if (r.type === "balance+mellcoins") return "💰 +" + r.balance + " нікусів + 🪙 +" + r.mellCoins + " МеллКоінс";
    if (r.type === "item") return "🎁 " + r.name;
    if (r.type === "case") return "📦 " + r.name;
    if (r.type === "multi") {
      const parts = [];
      if (r.balance) parts.push("💰 +" + r.balance);
      if (r.mellCoins) parts.push("🪙 +" + r.mellCoins);
      if (r.items) r.items.forEach(i => parts.push(i.name));
      return parts.join(", ");
    }
    return "—";
  };

  const promoCards = promos.map(p => {
    const st = getStatus(p);
    const exp = p.expiresAt
      ? (p.expiresAt.toDate ? p.expiresAt.toDate() : new Date(p.expiresAt)).toLocaleString("uk-UA", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" })
      : "Без обмежень";
    const usedPct = p.maxUses ? Math.min(100, Math.round(((p.usedCount || 0) / p.maxUses) * 100)) : 0;
    return `
      <div class="promo-admin-card">
        <div class="promo-admin-code">
          ${p.id}
          <span class="promo-admin-status-badge ${st.cls}">${st.label}</span>
        </div>
        <div class="promo-admin-reward">${rewardLabel(p.reward)}</div>
        <div class="promo-admin-meta">
          <span class="promo-admin-tag">⏰ до ${exp}</span>
          <span class="promo-admin-tag">👥 ${p.usedCount || 0}${p.maxUses != null ? " / " + p.maxUses : " / ∞"} використань</span>
          ${p.comment ? `<span class="promo-admin-tag">💬 ${p.comment}</span>` : ""}
        </div>
        ${p.maxUses ? `
        <div class="promo-admin-progress">
          <div class="promo-admin-progress-text">
            <span>Використано</span><span>${p.usedCount || 0} / ${p.maxUses}</span>
          </div>
          <div class="promo-admin-progress-bar">
            <div class="promo-admin-progress-fill" style="width:${usedPct}%"></div>
          </div>
        </div>` : ""}
        <div class="promo-admin-actions">
          <button class="btn-sm btn-buy" onclick="window._adminViewPromoUsers('${p.id}')">👥 Хто використав</button>
          ${p.active
            ? `<button class="btn-sm btn-cancel" onclick="window._adminTogglePromo('${p.id}',false)">⏸ Деактивувати</button>`
            : `<button class="btn-sm btn-buy"    onclick="window._adminTogglePromo('${p.id}',true)">▶ Активувати</button>`
          }
          <button class="btn-sm btn-cancel" onclick="window._adminDeletePromo('${p.id}')">🗑 Видалити</button>
        </div>
      </div>`;
  }).join("");

  deps.openModal(`
    <h2 class="modal-title">🎟️ Промокоди</h2>
    <button class="btn-primary btn-full" onclick="window._adminCreatePromoModal()" style="margin-bottom:14px;">
      ➕ Створити промокод
    </button>
    <div class="promo-admin-wrap" style="max-height:60vh;overflow-y:auto;">
      ${promos.length ? promoCards : '<div style="text-align:center;color:var(--text-muted);padding:24px;">Промокодів ще немає</div>'}
    </div>
    <button class="btn-secondary btn-full" style="margin-top:10px;" onclick="closeModal()">Закрити</button>
  `, true);

  // ── Глобальні хелпери ──
  window._adminTogglePromo = async (code, active) => {
    try {
      await updateDoc(doc(db, "promoCodes", code), { active });
      deps.showToast(active ? "✅ Промокод активовано!" : "⏸ Деактивовано!", "success");
      await renderAdminPromoPanel(deps);
    } catch (e) { deps.showToast("Помилка: " + e.message, "error"); }
  };

  window._adminDeletePromo = async (code) => {
    if (!confirm(`Видалити промокод «${code}»?`)) return;
    try {
      await deleteDoc(doc(db, "promoCodes", code));
      deps.showToast("🗑 Промокод видалено!", "success");
      await renderAdminPromoPanel(deps);
    } catch (e) { deps.showToast("Помилка: " + e.message, "error"); }
  };

  // ── ВИПРАВЛЕНО: показуємо нікнейм + uid, кнопка "Назад" повертає до списку ──
  window._adminViewPromoUsers = async (code) => {
    const snap = await getDoc(doc(db, "promoCodes", code));
    const usedBy = snap.data()?.usedBy || [];

    // Завантажуємо нікнейми
    let usernameMap = {};
    try {
      usernameMap = await fetchUsernamesByUids(usedBy);
    } catch(e) {}

    const rowsHtml = usedBy.length
      ? usedBy.map(uid => {
          const name = usernameMap[uid];
          return `<div class="promo-user-row">
            ${name ? `<div class="promo-user-name">👤 ${name}</div>` : ""}
            <div class="promo-user-uid">${uid}</div>
          </div>`;
        }).join("")
      : '<div style="color:var(--text-muted);text-align:center;padding:20px;">Ніхто ще не використовував</div>';

    deps.openModal(`
      <h2 class="modal-title">👥 Хто використав «${code}»</h2>
      <div style="max-height:50vh;overflow-y:auto;margin-bottom:12px;">
        ${rowsHtml}
      </div>
      <button class="btn-secondary btn-full" onclick="window._adminPromoBackToList()">← До списку промо</button>
    `);
  };

  // ── ВИПРАВЛЕНО: окремий хелпер для повернення до списку ──
  window._adminPromoBackToList = () => renderAdminPromoPanel(deps);

  window._adminCreatePromoModal = () => adminCreatePromoModal(deps);
}

// ── ФОРМА СТВОРЕННЯ ПРОМОКОДУ ──────────────

function adminCreatePromoModal(deps) {
  injectPromoStyles();
  let rewardType = "balance";

  const CASES_LIST = window._CASES_LIST || [];
  const ITEMS_LIST = window._ITEMS_LIST || [];

  const caseOpts = CASES_LIST.map(c => `<option value="${c.id}">${c.name}</option>`).join("");
  const itemOpts = ITEMS_LIST.map(i => `<option value="${i.id}">[${i.rarity}] ${i.name}</option>`).join("");

  deps.openModal(`
    <h2 class="modal-title">➕ Новий промокод</h2>
    <div class="promo-create-form" style="max-height:70vh;overflow-y:auto;">

      <div>
        <label class="promo-field-label">Код промокоду</label>
        <div style="display:flex;gap:8px;">
          <input type="text" id="promo-new-code" class="form-input"
            placeholder="NIKUS2026"
            style="text-transform:uppercase;font-family:'Courier New',monospace;font-size:16px;letter-spacing:2px;"
            oninput="this.value=this.value.toUpperCase().replace(/[^A-Z0-9_]/g,'')">
          <button class="btn-secondary" onclick="
            document.getElementById('promo-new-code').value=
            'NK'+Math.random().toString(36).slice(2,8).toUpperCase()
          " style="flex-shrink:0;">🎲</button>
        </div>
      </div>

      <div>
        <label class="promo-field-label">Тип нагороди</label>
        <div class="promo-reward-tabs">
          <button class="promo-reward-tab active" onclick="switchPromoTab('balance',this)">💰 Нікуси</button>
          <button class="promo-reward-tab" onclick="switchPromoTab('mellcoins',this)">🪙 МеллКоінс</button>
          <button class="promo-reward-tab" onclick="switchPromoTab('b+m',this)">💰+🪙 Обидва</button>
          <button class="promo-reward-tab" onclick="switchPromoTab('case',this)">📦 Кейс</button>
          <button class="promo-reward-tab" onclick="switchPromoTab('item',this)">🎁 Предмет</button>
          <button class="promo-reward-tab" onclick="switchPromoTab('multi',this)">⚡ Комбо</button>
        </div>
      </div>

      <div class="promo-reward-section" id="promo-reward-section">
        ${rewardSectionHtml("balance", caseOpts, itemOpts)}
      </div>

      <div>
        <label class="promo-field-label">Макс. кількість використань</label>
        <input type="number" id="promo-max-uses" class="form-input" min="1" placeholder="Порожньо = необмежено" value="">
      </div>

      <div>
        <label class="promo-field-label">Діє до (дата/час)</label>
        <input type="datetime-local" id="promo-expires" class="form-input"
          value="${defaultExpiry()}">
      </div>

      <div>
        <label class="promo-field-label">Коментар (необов'язково)</label>
        <input type="text" id="promo-comment" class="form-input" placeholder="Для чого цей промо...">
      </div>

      <div style="display:flex;gap:8px;margin-top:4px;">
        <button class="btn-primary" style="flex:1;" onclick="window._adminSavePromo()">✅ Створити</button>
        <button class="btn-secondary" style="flex:1;" onclick="window._adminPromoBackToList()">← Назад</button>
      </div>
    </div>
  `, true);

  window.switchPromoTab = (type, el) => {
    document.querySelectorAll(".promo-reward-tab").forEach(b => b.classList.remove("active"));
    el.classList.add("active");
    const sec = document.getElementById("promo-reward-section");
    if (sec) sec.innerHTML = rewardSectionHtml(type, caseOpts, itemOpts);
  };

  // _adminPromoBackToList вже встановлено в renderAdminPromoPanel
  // але якщо відкрили форму напряму — встановлюємо тут теж
  if (!window._adminPromoBackToList) {
    window._adminPromoBackToList = () => renderAdminPromoPanel(deps);
  }

  window._adminSavePromo = async () => {
    const code = (document.getElementById("promo-new-code")?.value || "").trim().toUpperCase();
    if (!code || code.length < 3) {
      deps.showToast("Введіть код (мін. 3 символи)!", "error"); return;
    }

    const reward = buildRewardFromForm();
    if (!reward) return;

    const maxUsesVal = document.getElementById("promo-max-uses")?.value;
    const maxUses = maxUsesVal ? parseInt(maxUsesVal) : null;
    const expiresVal = document.getElementById("promo-expires")?.value;
    const expiresAt = expiresVal ? Timestamp.fromDate(new Date(expiresVal)) : null;
    const comment = document.getElementById("promo-comment")?.value.trim() || "";

    const existing = await getDoc(doc(db, "promoCodes", code));
    if (existing.exists()) {
      deps.showToast("Промокод з таким кодом вже існує!", "error"); return;
    }

    const btn = document.querySelector("#modal-body .btn-primary");
    if (btn) { btn.disabled = true; btn.textContent = "⏳ Збереження..."; }

    try {
      await setDoc(doc(db, "promoCodes", code), {
        active: true,
        reward,
        maxUses,
        expiresAt,
        comment,
        usedCount: 0,
        usedBy: [],
        createdAt: serverTimestamp(),
      });
      deps.showToast("✅ Промокод «" + code + "» створено!", "success");
      await renderAdminPromoPanel(deps);
    } catch (e) {
      deps.showToast("Помилка: " + e.message, "error");
      if (btn) { btn.disabled = false; btn.textContent = "✅ Створити"; }
    }
  };
}

// ── Читання форми нагороди ──────────────────

function buildRewardFromForm() {
  const activeTab = document.querySelector(".promo-reward-tab.active");
  if (!activeTab) return null;
  const text = activeTab.textContent.trim();

  if (text.includes("Нікуси")) {
    const amount = parseInt(document.getElementById("promo-bal-amount")?.value);
    if (!amount || amount <= 0) { window._showToastGlobal("Введіть суму!", "error"); return null; }
    return { type: "balance", amount };
  }
  if (text.includes("МеллКоінс")) {
    const amount = parseInt(document.getElementById("promo-mell-amount")?.value);
    if (!amount || amount <= 0) { window._showToastGlobal("Введіть суму!", "error"); return null; }
    return { type: "mellcoins", amount };
  }
  if (text.includes("Обидва")) {
    const balance = parseInt(document.getElementById("promo-bm-balance")?.value) || 0;
    const mellCoins = parseInt(document.getElementById("promo-bm-mell")?.value) || 0;
    if (!balance && !mellCoins) { window._showToastGlobal("Введіть хоча б одне значення!", "error"); return null; }
    return { type: "balance+mellcoins", balance, mellCoins };
  }
  if (text.includes("Кейс")) {
    const caseId = document.getElementById("promo-case-id")?.value;
    const caseEl = document.getElementById("promo-case-id");
    const caseName = caseEl?.options[caseEl.selectedIndex]?.text || caseId;
    const caseImg  = (window._CASES_LIST || []).find(c => c.id === caseId)?.img || "";
    if (!caseId) { window._showToastGlobal("Виберіть кейс!", "error"); return null; }
    return { type: "case", caseId, name: caseName, img: caseImg };
  }
  if (text.includes("Предмет")) {
    const itemId = document.getElementById("promo-item-id")?.value;
    const item = (window._ITEMS_LIST || []).find(i => i.id === itemId);
    if (!itemId || !item) { window._showToastGlobal("Виберіть предмет!", "error"); return null; }
    return { type: "item", itemId: item.id, name: item.name, img: item.img, rarity: item.rarity, collection: item.collection || null };
  }
  if (text.includes("Комбо")) {
    const balance = parseInt(document.getElementById("promo-multi-balance")?.value) || 0;
    const mellCoins = parseInt(document.getElementById("promo-multi-mell")?.value) || 0;
    const caseId = document.getElementById("promo-multi-case")?.value || "";
    const itemId = document.getElementById("promo-multi-item")?.value || "";
    const items = [];
    if (caseId) {
      const c = (window._CASES_LIST || []).find(x => x.id === caseId);
      if (c) items.push({ type: "case", caseId: c.id, name: c.name, img: c.img });
    }
    if (itemId) {
      const it = (window._ITEMS_LIST || []).find(x => x.id === itemId);
      if (it) items.push({ type: "item", itemId: it.id, name: it.name, img: it.img, rarity: it.rarity });
    }
    if (!balance && !mellCoins && !items.length) {
      window._showToastGlobal("Додайте хоча б одну нагороду!", "error"); return null;
    }
    return { type: "multi", balance, mellCoins, items };
  }
  return null;
}

// ── HTML форм нагород ──────────────────────

function rewardSectionHtml(type, caseOpts, itemOpts) {
  if (type === "balance") return `
    <label class="promo-field-label">Сума нікусів</label>
    <input type="number" id="promo-bal-amount" class="form-input" min="1" value="500" placeholder="500">`;

  if (type === "mellcoins") return `
    <label class="promo-field-label">Сума МеллКоінс</label>
    <input type="number" id="promo-mell-amount" class="form-input" min="1" value="50" placeholder="50">`;

  if (type === "b+m") return `
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;">
      <div>
        <label class="promo-field-label">💰 Нікуси</label>
        <input type="number" id="promo-bm-balance" class="form-input" min="0" value="100">
      </div>
      <div>
        <label class="promo-field-label">🪙 МеллКоінс</label>
        <input type="number" id="promo-bm-mell" class="form-input" min="0" value="30">
      </div>
    </div>`;

  if (type === "case") return `
    <label class="promo-field-label">Кейс</label>
    <select id="promo-case-id" class="form-input">
      ${caseOpts || '<option value="">— немає кейсів —</option>'}
    </select>`;

  if (type === "item") return `
    <label class="promo-field-label">Предмет</label>
    <select id="promo-item-id" class="form-input">
      ${itemOpts || '<option value="">— немає предметів —</option>'}
    </select>`;

  if (type === "multi") return `
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-bottom:10px;">
      <div>
        <label class="promo-field-label">💰 Нікуси (0 = без)</label>
        <input type="number" id="promo-multi-balance" class="form-input" min="0" value="0">
      </div>
      <div>
        <label class="promo-field-label">🪙 МеллКоінс (0 = без)</label>
        <input type="number" id="promo-multi-mell" class="form-input" min="0" value="0">
      </div>
    </div>
    <label class="promo-field-label">📦 Кейс (необов'язково)</label>
    <select id="promo-multi-case" class="form-input" style="margin-bottom:10px;">
      <option value="">— без кейсу —</option>
      ${caseOpts}
    </select>
    <label class="promo-field-label">🎁 Предмет (необов'язково)</label>
    <select id="promo-multi-item" class="form-input">
      <option value="">— без предмету —</option>
      ${itemOpts}
    </select>`;

  return "";
}

function defaultExpiry() {
  const d = new Date();
  d.setDate(d.getDate() + 30);
  return d.toISOString().slice(0, 16);
}