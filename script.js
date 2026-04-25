// ============================================
// НІКУС КЕЙС РЕМЕЙК — ЯДРО ГРИ
// ============================================
  
import {
  auth, registerUser, loginUser, loginWithGoogle, saveUserData, logoutUser,
  listItemOnMarket, getMarketListings, subscribeMarket, removeMarketListing, buyMarketItem,
  sendTradeRequest, getMyTrades, updateTradeStatus, acceptTradeAndSwap,
  sendFriendRequest, acceptFriendRequest, declineFriendRequest,
  createClanDB, getClan, sendClanJoinRequest, acceptClanJoinRequest,
  declineClanJoinRequest, leaveClanDB, kickFromClanDB,
  clanVaultDeposit, clanVaultWithdraw,
  getUserProfile, getAllUsernames, onAuthStateChanged, db,
  sendClanMessage, subscribeClanChat,
} from "./firebase.js";

import {
  doc, onSnapshot, getDoc, updateDoc, collection, getDocs, runTransaction, setDoc
} from "https://www.gstatic.com/firebasejs/10.7.0/firebase-firestore.js";

// ── КОНСТАНТИ ──────────────────────────────

const RARITIES = {
  special:     { name: "Спеціальна",  color: "#FFD700", chance: 0.01 },
  secret:      { name: "Секретна",    color: "#CC0033", chance: 0.04 },
  legendary:   { name: "Легендарна",  color: "#FF6600", chance: 0.08 },
  epic:        { name: "Епічна",      color: "#9933FF", chance: 0.15 },
  exceptional: { name: "Виняткова",   color: "#3399FF", chance: 0.27 },
  common:      { name: "Звичайна",    color: "#33CC33", chance: 0.45 },
};

const QUALITIES = [
  { name: "Прямо з цеху",      chance: 0.125 },
  { name: "Після консервації", chance: 0.25  },
  { name: "Після уроку",       chance: 0.40  },
  { name: "Зношена",           chance: 0.225 },
];

const ADMIN_PASSWORD = "nikusadmin2026";

const COLLECTIONS = {
 summer26: {
    name: "Літо26",
    cases: ["summer26", "summer26box", "summergift26"],
  },
 summerheat: {
    name: "ЛітняСпека",
    cases: ["summerheat"],
  },
 mellstroy: {
    name: "МеллстройКолекція",
    cases: ["mellstroy"],
  },
};

// ── КЕЙСИ ──────────────────────────────────

const CASES = {
  summer26: {
    id: "summer26", name: "Літо26",
    img: "img/cases/summer26.png", price: 40, total: 2000, remaining: 2000,
    // 40н — стандартний кейс, повний набір рідкостей
    chances: {
      common:      0.45,
      exceptional: 0.27,
      epic:        0.15,
      legendary:   0.08,
      secret:      0.04,
      special:     0.01,
    },
    items: [
      { id: "item_a_spider",   name: "СпідерМан",          img: "img/items/l1.png",  rarity: "common", collection: "summer26" },
      { id: "item_a_halal",    name: "Халяль",              img: "img/items/l2.png",  rarity: "common", collection: "summer26" },
      { id: "item_a_pohuy",    name: "МеніПофіг",           img: "img/items/l3.png",  rarity: "exceptional", collection: "summer26" },
      { id: "item_a_zalojnik", name: "ДітиПідвалу",         img: "img/items/l4.png",  rarity: "exceptional", collection: "summer26" },
      { id: "item_a_rabbit",   name: "Привіт, Софійко!",    img: "img/items/l5.png",  rarity: "epic", collection: "summer26" },
      { id: "item_a_what",     name: "ЩоЦеТаке?!",         img: "img/items/l6.png",  rarity: "epic", collection: "summer26" },
      { id: "item_a_1gaben",   name: "Габен",               img: "img/items/l7.png",  rarity: "legendary", collection: "summer26" },
      { id: "item_a_waterCat", name: "МокрийКіт",           img: "img/items/l8.png",  rarity: "legendary", collection: "summer26" },
      { id: "item_a_dex",      name: "ЩосьНеТак…",         img: "img/items/l9.png",  rarity: "secret", collection: "summer26" },
      { id: "item_a_diddy",    name: "Підіді",              img: "img/items/l10.png", rarity: "secret", collection: "summer26" },
      { id: "item_a_jeky",     name: "Джекі",               img: "img/items/l11.png", rarity: "special", collection: "summer26" },
      { id: "item_a_ducplin",  name: "Дисцепліньор",        img: "img/items/l12.png", rarity: "special", collection: "summer26" },
    ]
  },

  summer26box: {
    id: "summer26box", name: "Літо26 Бокс",
    img: "img/cases/summer26box.png", price: 15, total: 3000, remaining: 3000,
    // 25н — бюджетний, тільки common→legendary, без secret/special
    chances: {
      common:      0.55,
      exceptional: 0.28,
      epic:        0.12,
      legendary:   0.05,
      secret:      0,
      special:     0,
    },
    items: [
      { id: "item_a_spider",   name: "СпідерМан",          img: "img/items/l1.png",  rarity: "common", collection: "summer26" },
      { id: "item_a_halal",    name: "Халяль",              img: "img/items/l2.png",  rarity: "common", collection: "summer26" },
      { id: "item_a_pohuy",    name: "МеніПофіг",           img: "img/items/l3.png",  rarity: "exceptional", collection: "summer26" },
      { id: "item_a_zalojnik", name: "ДітиПідвалу",         img: "img/items/l4.png",  rarity: "exceptional", collection: "summer26" },
      { id: "item_a_rabbit",   name: "Привіт, Софійко!",    img: "img/items/l5.png",  rarity: "epic", collection: "summer26" },
      { id: "item_a_what",     name: "ЩоЦеТаке?!",         img: "img/items/l6.png",  rarity: "epic", collection: "summer26" },
      { id: "item_a_1gaben",   name: "Габен",               img: "img/items/l7.png",  rarity: "legendary", collection: "summer26" },
      { id: "item_a_waterCat", name: "МокрийКіт",           img: "img/items/l8.png",  rarity: "legendary", collection: "summer26" },
    ]
  },

  summergift26: {
    id: "summergift26", name: "Літній Дар",
    img: "img/cases/summergift26.png", price: 150, total: 250, remaining: 250,
    // 150н — подарунковий, тільки epic+
    chances: {
      common:      0,
      exceptional: 0,
      epic:        0.45,
      legendary:   0.30,
      secret:      0.20,
      special:     0.05,
    },
    items: [
      { id: "item_a_rabbit",   name: "Привіт, Софійко!",    img: "img/items/l5.png",  rarity: "epic", collection: "summer26" },
      { id: "item_a_what",     name: "ЩоЦеТаке?!",         img: "img/items/l6.png",  rarity: "epic", collection: "summer26" },
      { id: "item_a_1gaben",   name: "Габен",               img: "img/items/l7.png",  rarity: "legendary", collection: "summer26" },
      { id: "item_a_waterCat", name: "МокрийКіт",           img: "img/items/l8.png",  rarity: "legendary", collection: "summer26" },
      { id: "item_a_dex",      name: "ЩосьНеТак…",         img: "img/items/l9.png",  rarity: "secret", collection: "summer26" },
      { id: "item_a_diddy",    name: "Підіді",              img: "img/items/l10.png", rarity: "secret", collection: "summer26" },
      { id: "item_a_jeky",     name: "Джекі",               img: "img/items/l11.png", rarity: "special", collection: "summer26" },
      { id: "item_a_ducplin",  name: "Дисцепліньор",        img: "img/items/l12.png", rarity: "special", collection: "summer26" },
    ]
  },

 summerheat: {
    id: "summerheat", name: "ЛітняСпека",
    img: "img/cases/summerheat.png", price: 100, total: 100, remaining: 100,
    // 40н — стандартний кейс, повний набір рідкостей
    chances: {
      common:      0.45,
      exceptional: 0.27,
      epic:        0.15,
      legendary:   0.08,
      secret:      0.04,
      special:     0.01,
    },
    items: [
      { id: "item_a_ravlik",   name: "Равлик-Джокер",          img: "img/items/s1.png",  rarity: "common", collection: "summerheat" },
      { id: "item_a_bob",    name: "Боб",              img: "img/items/s2.png",  rarity: "common", collection: "summerheat" },
      { id: "item_a_jur",    name: "ЧистаВага",           img: "img/items/s3.png",  rarity: "exceptional", collection: "summerheat" },
      { id: "item_a_detektor", name: "Детектор",         img: "img/items/s4.png",  rarity: "exceptional", collection: "summerheat" },
      { id: "item_a_baldi",   name: "Балді",    img: "img/items/s5.png",  rarity: "epic", collection: "summerheat" },
      { id: "item_a_pizdjoh",     name: "Піздьож",         img: "img/items/s6.png",  rarity: "epic", collection: "summerheat" },
      { id: "item_a_nafta",   name: "Америка(нафта)",               img: "img/items/s7.png",  rarity: "legendary", collection: "summerheat" },
      { id: "item_a_s1mple", name: "s1mple",           img: "img/items/s8.png",  rarity: "legendary", collection: "summerheat" },
      { id: "item_a_vuhna",      name: "ВишняНаТорті",         img: "img/items/s9.png",  rarity: "secret", collection: "summerheat" },
      { id: "item_a_traktor",    name: "ЯТракторВиганяю…",              img: "img/items/s10.png", rarity: "secret", collection: "summerheat" },
      { id: "item_a_angrybirds",     name: "ЕнгріБердс",               img: "img/items/s11.png", rarity: "special", collection: "summerheat" },
      { id: "item_a_stive",  name: "Стів",        img: "img/items/s12.png", rarity: "special", collection: "summerheat" },
    ]
  },

mellstroy: {
    id: "mellstroy", name: "МеллстройКолекція",
    img: "img/cases/mellstroy.png", price: 100, total: 100, remaining: 100,
    // 40н — стандартний кейс, повний набір рідкостей
    chances: {
      common:      0.45,
      exceptional: 0.27,
      epic:        0.15,
      legendary:   0.08,
      secret:      0.04,
      special:     0.01,
    },
    items: [
      { id: "item_a_haha",   name: "Хахаха",          img: "img/items/m1.png",  rarity: "common", collection: "mellstroy" },
      { id: "item_a_fog",    name: "Фог",              img: "img/items/m2.png",  rarity: "common", collection: "mellstroy" },
      { id: "item_a_uu",    name: "Зомбі",           img: "img/items/m3.png",  rarity: "exceptional", collection: "mellstroy" },
      { id: "item_a_11what", name: "ЩоНафіг?!",         img: "img/items/m4.png",  rarity: "exceptional", collection: "mellstroy" },
      { id: "item_a_dorime",   name: "Доріме",    img: "img/items/m5.png",  rarity: "epic", collection: "mellstroy" },
      { id: "item_a_7class",     name: "ВиПопутали",         img: "img/items/m6.png",  rarity: "epic", collection: "mellstroy" },
      { id: "item_a_hlop",   name: "Аплодуємо",               img: "img/items/m7.png",  rarity: "legendary", collection: "mellstroy" },
      { id: "item_a_red", name: "ЯВжеЧервоний",           img: "img/items/m8.png",  rarity: "legendary", collection: "mellstroy" },
      { id: "item_a_relax",      name: "ЛовиРелакс",         img: "img/items/m9.png",  rarity: "secret", collection: "mellstroy" },
      { id: "item_a_fpv",    name: "ФПВДРУН",              img: "img/items/m10.png", rarity: "secret", collection: "mellstroy" },
      { id: "item_a_artur",     name: "ПривітАртур",               img: "img/items/m11.png", rarity: "special", collection: "mellstroy" },
      { id: "item_a_bem",  name: "Бем-Бем",        img: "img/items/m12.png", rarity: "special", collection: "mellstroy" },
    ]
  },

};

// ── НАГОРОДИ ЗА РІВНІ ──────────────────────

function getLevelReward(level) {
  // Вибираємо кейс-нагороду залежно від рівня
  // Рівні 1-5: summer26box (25н бокс)
  // Рівні 6-10: summer26 (40н)
  // Рівні 11+: summergift26 (150н подарунок)
  let caseId = "summer26box";
  if (level >= 11) caseId = "summergift26";
  else if (level >= 6) caseId = "summer26";

  const c = CASES[caseId];
  return {
    type:   "case",
    caseId: caseId,
    name:   c ? c.name : "Літній Бокс",
    img:    c ? c.img  : "img/cases/summer26box.png",
    label:  c ? c.name : "Літній Бокс",
  };
}

// ── СТАН ───────────────────────────────────

let currentUser    = null;
let gameState      = {};
let _unsubProfile  = null;
let _unsubMarket   = null;
let _unsubTrades   = null;
let _unsubClan     = null;
let _unsubMarketReq = null;
let _isSaving      = false;
let _lockedItems   = new Set();

// ── ГЛОБАЛЬНІ КЕЙСИ (Firestore) ─────────────

async function initGlobalCases() {
  try {
    const ref  = doc(db, "globalData", "cases");
    const snap = await getDoc(ref);

    if (!snap.exists()) {
      // Документ не існує — створюємо з усіма кейсами
      const rem = {};
      Object.keys(CASES).forEach(k => { rem[k] = CASES[k].total; });
      await setDoc(ref, rem);
      Object.keys(CASES).forEach(k => { CASES[k].remaining = CASES[k].total; });
    } else {
      const data = snap.data();
      const missing = {};

      Object.keys(CASES).forEach(k => {
        if (data[k] !== undefined) {
          // Кейс є в Firestore — беремо його значення
          CASES[k].remaining = data[k];
        } else {
          // Новий кейс якого ще немає в Firestore
          missing[k] = CASES[k].total;
          CASES[k].remaining = CASES[k].total;
        }
      });

      // Оновлюємо тільки якщо є нові кейси (merge щоб не затерти старі)
      if (Object.keys(missing).length > 0) {
        await updateDoc(ref, missing);
      }
    }
  } catch (e) {
    console.warn("initGlobalCases error:", e);
    loadCasesRemaining(); // fallback до localStorage
  }
}



async function decrementGlobalCase(caseId, count) {
  try {
    await runTransaction(db, async (tx) => {
      const ref  = doc(db, "globalData", "cases");
      const snap = await tx.get(ref);
      if (!snap.exists()) return;
      const data = snap.data();
      const cur  = data[caseId] ?? 0;
      if (cur < count) throw new Error("Недостатньо кейсів!");
      tx.update(ref, { [caseId]: cur - count });
    });
    CASES[caseId].remaining -= count;
  } catch (e) {
    throw e;
  }
}

function subscribeGlobalCases() {
  return onSnapshot(doc(db, "globalData", "cases"), (snap) => {
    if (!snap.exists()) return;
    const data = snap.data();
    Object.keys(data).forEach(k => {
      if (CASES[k]) CASES[k].remaining = data[k];
    });
    const shopPage = document.getElementById("page-shop");
    if (shopPage && shopPage.style.display !== "none") renderShop();
  });
}

// ── НАВІГАЦІЯ ──────────────────────────────

const AUTH_PAGES = ['login', 'register'];

async function navigate(page) {
  if (!currentUser && !AUTH_PAGES.includes(page)) {
    showAllPages(false);
    document.getElementById('page-login').style.display = 'block';
    return;
  }

  // Знищуємо mine якщо йдемо з неї
  if (page !== 'mine' && window._destroyMinePage) {
    window._destroyMinePage();
    window._destroyMinePage = null;
  }

  showAllPages(false);
  const tp = document.getElementById('page-' + page);
  if (tp) tp.style.display = 'block';
  document.querySelectorAll('.nav-item, .bottom-nav-item').forEach(b =>
    b.classList.toggle('active', b.getAttribute('data-page') === page)
  );
  if (!currentUser) return;

  if (page === 'market') {
    injectRouletteStyles();
    injectMarketControls();
    startMarketSubscription();
  } else {
    stopMarketSubscription();
  }

  if (page !== 'trades') stopTradesSubscription();
  if (page !== 'clan')   stopClanPageSubscription();

  const tryRender = async (attempt) => {
    try {
      if (page === 'main')           renderMain();
      else if (page === 'shop')      renderShop();
      else if (page === 'inventory') renderInventory();
      else if (page === 'trades')    await renderTrades();
      else if (page === 'friends')   await renderFriends();
      else if (page === 'clan') { _startClanPageSubscription(); await renderClan(); }
      else if (page === 'profile')   await renderProfile();
      else if (page === 'craft')     renderCraft();
      else if (page === 'admin')     await renderAdmin();
      else if (page === 'mine') {
        const { initMinePage, destroyMinePage } = await import('./mine.js');
        window._destroyMinePage = destroyMinePage;
        await initMinePage();
      }
    } catch (e) {
      console.error('navigate error [' + page + '] attempt ' + attempt + ':', e);
      if (attempt < 3) {
        showToast("⏳ Повторна спроба...", "");
        await new Promise(r => setTimeout(r, 1500 * attempt));
        const stillHere = document.getElementById('page-' + page);
        if (stillHere && stillHere.style.display !== 'none') {
          await tryRender(attempt + 1);
        }
      } else {
        showToast("❌ Помилка завантаження. Натисни ще раз.", "error");
        const containers = {
          clan: 'clan-section', trades: 'trades-list',
          friends: 'friends-list', admin: 'page-admin',
          mine: 'mine-page-root',
        };
        const containerId = containers[page];
        if (containerId) {
          const el = document.getElementById(containerId);
          if (el) {
            el.innerHTML =
              '<div class="empty-state" style="padding:32px 20px;">' +
              '<div style="font-size:36px;margin-bottom:12px;">🌊</div>' +
              '<div style="font-weight:700;margin-bottom:8px;">Не вдалося завантажити</div>' +
              '<button class="btn-primary" style="margin-top:8px;" onclick="navigate(\'' + page + '\')">' +
              '🔄 Спробувати знову</button></div>';
          }
        }
      }
    }
  };

  await tryRender(1);
}

function showAllPages(show) {
  document.querySelectorAll('.page').forEach(p => { p.style.display = show ? 'block' : 'none'; });
}

// ── АВТОРИЗАЦІЯ ────────────────────────────

async function login() {
  const email    = document.getElementById("login-username").value.trim();
  const password = document.getElementById("login-password").value;
  if (!email || !password) { showToast("Заповніть всі поля!", "error"); return; }
  const btn = document.querySelector("#page-login .btn-primary");
  btn.disabled = true; btn.textContent = "Вхід...";
  try {
    const userData = await loginUser(email, password);
    currentUser = userData; gameState = { ...userData };
    setNavVisible(true); navigate("main");
    showToast("Ласкаво просимо, " + userData.username + "! 🌊", "success");
  } catch (e) { showToast(e.message || "Помилка входу!", "error"); }
  finally { btn.disabled = false; btn.textContent = "Увійти"; }
}

async function register() {
  const username  = document.getElementById("reg-username").value.trim();
  const email     = document.getElementById("reg-email").value.trim();
  const password  = document.getElementById("reg-password").value;
  const password2 = document.getElementById("reg-password2").value;
  if (!username || !email || !password) { showToast("Заповніть всі поля!", "error"); return; }
  if (password !== password2)           { showToast("Паролі не співпадають!", "error"); return; }
  if (password.length < 6)              { showToast("Пароль мінімум 6 символів!", "error"); return; }
  const btn = document.querySelector("#page-register .btn-primary");
  btn.disabled = true; btn.textContent = "Реєстрація...";
  try {
    const userData = await registerUser(username, email, password);
    currentUser = userData; gameState = { ...userData };
    setNavVisible(true); navigate("main");
    showToast("Акаунт створено! Вітаємо! 🌊", "success");
  } catch (e) { showToast(e.message || "Помилка реєстрації!", "error"); }
  finally { btn.disabled = false; btn.textContent = "Зареєструватись"; }
}

async function logout() {
  await saveData();
   if (_clanChatUnsub) { _clanChatUnsub(); _clanChatUnsub = null; }
  stopMarketSubscription();
  stopTradesSubscription();
  stopClanPageSubscription();
  if (_unsubProfile) { _unsubProfile(); _unsubProfile = null; }
  await logoutUser();
  currentUser = null; gameState = {}; _adminAuthed = false;
  setNavVisible(false); showAllPages(false);
  document.getElementById('page-login').style.display = 'block';
}

async function loginGoogle() {
  try {
    const userData = await loginWithGoogle(() => new Promise(resolve => {
      openModal(
        '<h2 class="modal-title">👤 Обери нікнейм</h2>' +
        '<input type="text" id="google-username-input" class="form-input" placeholder="Твій нікнейм..." style="width:100%;box-sizing:border-box;margin-bottom:16px;">' +
        '<button class="btn-primary btn-full" id="google-confirm-btn">Підтвердити</button>',
        false
      );
      document.getElementById('google-confirm-btn').onclick = () => {
        const val = document.getElementById('google-username-input').value.trim();
        if (!val) return;
        closeModal(); resolve(val);
      };
    }));
    currentUser = userData; gameState = { ...userData };
    setNavVisible(true); navigate("main");
    showToast("Ласкаво просимо, " + userData.username + "! 🌊", "success");
  } catch (e) { showToast(e.message || "Помилка Google входу!", "error"); }
}

// ── ЗБЕРЕЖЕННЯ ─────────────────────────────

async function saveData() {
  if (!currentUser?.uid) return;
  _isSaving = true;
  gameState.lastSeen = Date.now();
  try { await saveUserData(currentUser.uid, gameState); }
  catch (e) { console.error("saveData error:", e); showToast("Помилка збереження", "error"); }
  finally { setTimeout(() => { _isSaving = false; }, 1500); }
}

function saveCasesRemaining() {
  const rem = {};
  Object.keys(CASES).forEach(k => { rem[k] = CASES[k].remaining; });
  localStorage.setItem("casesRemaining", JSON.stringify(rem));
}

function loadCasesRemaining() {
  const rem = JSON.parse(localStorage.getItem("casesRemaining") || "{}");
  Object.keys(rem).forEach(k => { if (CASES[k]) CASES[k].remaining = rem[k]; });
}

// ── НАВБАР ─────────────────────────────────

function setNavVisible(visible) {
  document.getElementById('navbar').style.display     = visible ? 'flex' : 'none';
  document.getElementById('bottom-nav').style.display = visible ? 'flex' : 'none';
}

function updateBalanceDisplay() {
  const bal  = gameState.balance ?? 0;
  const name = gameState.username || "";
  const balEl = document.getElementById("main-balance");
  const navEl = document.getElementById("nav-balance");
  if (balEl) balEl.textContent = bal;
  if (navEl) navEl.textContent = "💰 " + bal + "  |  " + name;

  // Оновлюємо тільки аватарку в окремому елементі, не чіпаємо весь nav-logo
  let avatarEl = document.getElementById("nav-logo-avatar");
  const navLogo = document.querySelector(".nav-logo");
  if (navLogo) {
    if (!avatarEl) {
      avatarEl = document.createElement("span");
      avatarEl.id = "nav-logo-avatar";
      avatarEl.style.cssText = "display:inline-flex;align-items:center;gap:6px;vertical-align:middle;";
      navLogo.appendChild(avatarEl);
    }
    avatarEl.innerHTML = gameState.avatarUrl
      ? '<img src="' + gameState.avatarUrl + '" style="width:28px;height:28px;border-radius:50%;object-fit:cover;vertical-align:middle;border:1.5px solid var(--accent);">'
      : '';
  }
}

// ── ГОЛОВНА ────────────────────────────────

function renderMain() {
  const cases = (gameState.inventory || []).filter(i => i.type === "case").length;
  const items = (gameState.inventory || []).filter(i => i.type === "item").length;
  const s = (id, v) => { const el = document.getElementById(id); if (el) el.textContent = v; };
  const xp = gameState.xp || 0;
  const level = gameState.level || 1;
  const xpNeeded = level * 100;
  const xpPct = Math.min(100, Math.round((xp / xpNeeded) * 100));
  s("main-xp-text", xp + " / " + xpNeeded + " XP");
  const fillEl = document.getElementById("main-xp-fill");
  if (fillEl) fillEl.style.width = xpPct + "%";
  const clanBadge = document.getElementById("main-clan-badge");
  if (clanBadge) clanBadge.textContent = gameState._clanName || gameState.clan || "Без клану";
  s("main-username",  gameState.username || "—");
  s("main-balance",   gameState.balance  ?? 0);
  s("main-level",     gameState.level    || 1);
  s("main-items",     items);
  s("main-cases",     cases);
  s("main-friends",   (gameState.friends || []).length);
  s("main-clan-stat", gameState._clanName || gameState.clan || "—");
  updateBalanceDisplay();
  const heroAvatar = document.querySelector(".hero-avatar");
  if (heroAvatar) {
    heroAvatar.innerHTML = gameState.avatarUrl
      ? '<img src="' + gameState.avatarUrl + '" style="width:100%;height:100%;object-fit:cover;border-radius:50%;">'
      : '🌊';
  }
  const reqCount = (gameState.friendRequests || []).length;
  const badge = document.getElementById("friend-req-badge");
  const badgeMain = document.getElementById("friend-req-badge-main");
  if (badge) { badge.textContent = reqCount > 0 ? reqCount : ""; badge.style.display = reqCount > 0 ? "inline" : "none"; }
  if (badgeMain) { badgeMain.textContent = reqCount > 0 ? reqCount : ""; badgeMain.style.display = reqCount > 0 ? "inline" : "none"; }
}

// ── МАГАЗИН ────────────────────────────────

function renderShop() {
  const grid = document.getElementById("shop-grid");
  if (!grid) return;
  grid.innerHTML = "";
  Object.values(CASES).forEach(c => {
    const isEmpty = c.remaining <= 0;
    const pct     = Math.round((c.remaining / c.total) * 100);
    const card    = document.createElement("div");
    card.className = "case-card" + (isEmpty ? " empty" : "");
    card.innerHTML =
      '<div class="case-limited-bar"><div class="case-limited-fill" style="width:' + pct + '%"></div></div>' +
      '<img src="' + c.img + '" alt="' + c.name + '" onerror="this.src=\'img/placeholder.png\'">' +
      '<div class="case-name">' + c.name + '</div>' +
      '<div class="case-remaining">' + (isEmpty ? "🚫 Розпродано" : "📦 " + c.remaining + " / " + c.total) + '</div>' +
      '<div class="case-price">💰 ' + c.price + ' нікусів</div>' +
      '<button class="btn-buy" onclick="openBuyCaseModal(\'' + c.id + '\')" ' + (isEmpty ? "disabled" : "") + '>' +
        (isEmpty ? "Розпродано" : "Купити") + '</button>' +
      '<button class="btn-preview" onclick="previewCase(\'' + c.id + '\')">👁 Вміст</button>';
    grid.appendChild(card);
  });
}

function openBuyCaseModal(caseId) {
  const c = CASES[caseId];
  if (!c || c.remaining <= 0) return;
  const maxBuy = Math.min(10, c.remaining, Math.floor((gameState.balance ?? 0) / c.price));
  openModal(
    '<h2 class="modal-title">🛒 ' + c.name + '</h2>' +
    '<div style="text-align:center;margin-bottom:16px;">' +
      '<img src="' + c.img + '" onerror="this.src=\'img/placeholder.png\'" style="width:80px;height:80px;object-fit:contain;margin-bottom:8px;">' +
      '<div style="color:var(--gold-light);font-size:18px;font-weight:700;">💰 ' + c.price + ' нікусів / шт.</div>' +
      '<div style="color:var(--text-muted);font-size:13px;margin-top:4px;">Залишилось: ' + c.remaining + ' з ' + c.total + '</div>' +
    '</div>' +
    '<div style="display:grid;grid-template-columns:repeat(5,1fr);gap:8px;margin-bottom:16px;">' +
      [1,2,3,5,10].map(n => {
        const cost = n * c.price;
        const disabled = n > maxBuy ? 'disabled style="opacity:0.4;"' : '';
        return '<button class="btn-secondary" ' + disabled + ' onclick="buyCase(\'' + caseId + '\',' + n + ')" style="flex-direction:column;display:flex;align-items:center;gap:4px;padding:10px 4px;">' +
          '<span style="font-size:18px;font-weight:800;">x' + n + '</span>' +
          '<span style="font-size:11px;color:var(--gold-light);">' + cost + '</span>' +
          '</button>';
      }).join("") +
    '</div>' +
    '<div style="margin-bottom:12px;">' +
      '<label style="color:var(--text-muted);font-size:13px;">Своя кількість:</label>' +
      '<div style="display:flex;gap:8px;margin-top:6px;">' +
        '<input type="number" id="custom-buy-count" min="1" max="' + maxBuy + '" value="1" style="flex:1;padding:10px;border-radius:8px;border:1px solid var(--border);background:var(--bg-input);color:var(--text);font-size:15px;">' +
        '<button class="btn-primary" onclick="buyCaseCustom(\'' + caseId + '\')">Купити</button>' +
      '</div>' +
    '</div>' +
    '<button class="btn-secondary btn-full" onclick="closeModal()">Скасувати</button>'
  );
}

function buyCaseCustom(caseId) {
  const count = parseInt(document.getElementById('custom-buy-count')?.value);
  if (isNaN(count) || count < 1) { showToast("Введіть кількість!", "error"); return; }
  buyCase(caseId, count);
  // НЕ закриваємо тут — buyCase сам закриє і перевідкриє
}


async function buyCase(caseId, count) {
  count = count || 1;
  const c = CASES[caseId];
  if (!c) return;
  if (c.remaining < count)                              { showToast("Недостатньо кейсів у магазині!", "error"); return; }
  if ((gameState.balance ?? 0) < c.price * count)      { showToast("Недостатньо нікусів!", "error"); return; }

  try {
    await decrementGlobalCase(caseId, count);
  } catch (e) {
    showToast(e.message || "Помилка купівлі!", "error"); return;
  }

  gameState.balance = (gameState.balance ?? 0) - c.price * count;
  if (!gameState.inventory) gameState.inventory = [];
  for (let i = 0; i < count; i++) {
   // Замінити на:
gameState.inventory.push({
  id: generateId(), type: "case", caseId, name: c.name, img: c.img,
  fromCaseName: c.name,
  obtainedBy: currentUser?.username || "?",
  obtainedAt: Date.now(),
  boughtAt: Date.now(),
});
  }
  saveData(); renderShop(); updateBalanceDisplay();
  showToast("✅ Куплено: " + count + "x " + c.name + "!", "success");
  
  // Оновлюємо modal якщо він ще відкритий
  const modalBody = document.getElementById("modal-body");
  if (modalBody && modalBody.innerHTML.includes("custom-buy-count")) {
    closeModal();
    if (c.remaining > 0) openBuyCaseModal(caseId);
  }
}

function previewCase(caseId) {
  const c = CASES[caseId];
  if (!c) return;

  const chanceSource = c.chances || Object.fromEntries(
    Object.entries(RARITIES).map(([k, v]) => [k, v.chance])
  );

  const html = c.items.map(item => {
    const r = RARITIES[item.rarity];
    const itemChance = chanceSource[item.rarity] || 0;
    // Скільки предметів цієї рідкості в кейсі
    const sameRarityCount = c.items.filter(i => i.rarity === item.rarity).length;
    // Шанс саме цього предмету = шанс рідкості / кількість предметів рідкості
    const exactChance = sameRarityCount > 0 ? (itemChance / sameRarityCount * 100) : 0;

    return '<div class="preview-item" style="border-color:' + r.color + '">' +
      '<img src="' + item.img + '" onerror="this.src=\'img/placeholder.png\'" alt="' + item.name + '">' +
      '<div class="preview-item-name">' + item.name + '</div>' +
      '<div class="preview-item-rarity" style="color:' + r.color + '">' + r.name + '</div>' +
      (exactChance > 0
        ? '<div style="font-size:10px;color:var(--text-muted);margin-top:2px;">' +
          (exactChance < 0.1 ? exactChance.toFixed(2) : exactChance.toFixed(1)) + '%</div>'
        : '') +
    '</div>';
  }).join("");

  // Зведена таблиця шансів рідкостей
  const rarityRows = Object.entries(RARITIES)
    .filter(([key]) => (chanceSource[key] || 0) > 0)
    .sort(([a], [b]) => chanceSource[b] - chanceSource[a]) // від найчастішого
    .map(([key, r]) => {
      const pct = ((chanceSource[key] || 0) * 100);
      return '<div style="display:flex;align-items:center;gap:8px;margin-bottom:5px;">' +
        '<div style="width:10px;height:10px;border-radius:50%;background:' + r.color + ';flex-shrink:0;"></div>' +
        '<span style="flex:1;font-size:12px;color:var(--text-muted);">' + r.name + '</span>' +
        '<div style="width:80px;height:6px;background:var(--bg-input);border-radius:3px;overflow:hidden;">' +
          '<div style="height:100%;width:' + Math.min(100, pct) + '%;background:' + r.color + ';border-radius:3px;"></div>' +
        '</div>' +
        '<span style="font-size:11px;font-weight:700;color:' + r.color + ';min-width:36px;text-align:right;">' +
          (pct < 0.1 ? pct.toFixed(2) : pct.toFixed(1)) + '%' +
        '</span>' +
      '</div>';
    }).join("");

  openModal(
    '<h2 class="modal-title">📦 ' + c.name + '</h2>' +
    // Зведена таблиця шансів
    '<div style="background:var(--bg-card2);border:1px solid var(--border);border-radius:10px;padding:12px;margin-bottom:14px;">' +
      '<div style="font-size:11px;font-weight:700;color:var(--text-muted);text-transform:uppercase;letter-spacing:0.8px;margin-bottom:8px;">Шанси по рідкості</div>' +
      rarityRows +
    '</div>' +
    '<div class="preview-grid">' + html + '</div>' +
    '<button class="btn-primary btn-full" onclick="closeModal()">Закрити</button>'
  );
}

// ── ВІДКРИТТЯ КЕЙСУ (з анімацією рулетки) ──

// ─── 1. Малюємо кристал SPECIAL через canvas ────────────────────

function drawSpecialMedalCanvas(size = 120) {
  const c = document.createElement("canvas");
  c.width = c.height = size;
  const ctx = c.getContext("2d");
  const cx = size / 2, cy = size / 2;

  // Жовте зовнішнє світіння
  const glow = ctx.createRadialGradient(cx, cy, size * 0.1, cx, cy, size * 0.6);
  glow.addColorStop(0, "rgba(255,220,0,0.6)");
  glow.addColorStop(0.5, "rgba(255,165,0,0.3)");
  glow.addColorStop(1, "rgba(255,140,0,0)");
  ctx.fillStyle = glow;
  ctx.fillRect(0, 0, size, size);

  // Промені
  ctx.save();
  ctx.translate(cx, cy);
  for (let i = 0; i < 8; i++) {
    ctx.rotate(Math.PI / 4);
    const rg = ctx.createLinearGradient(0, -size * 0.5, 0, size * 0.5);
    rg.addColorStop(0, "rgba(255,215,0,0)");
    rg.addColorStop(0.5, "rgba(255,215,0,0.22)");
    rg.addColorStop(1, "rgba(255,215,0,0)");
    ctx.fillStyle = rg;
    ctx.beginPath();
    ctx.moveTo(-size * 0.03, 0);
    ctx.lineTo(0, -size * 0.52);
    ctx.lineTo(size * 0.03, 0);
    ctx.lineTo(0, size * 0.52);
    ctx.fill();
  }
  ctx.restore();

  // Кристал — жовто-золотий
  const pts = 6;
  const outerR = size * 0.38;
  const innerR = size * 0.22;
  ctx.save();
  ctx.translate(cx, cy);
  ctx.rotate(Math.PI / 6);

  ctx.shadowColor = "rgba(255,180,0,0.6)";
  ctx.shadowBlur = size * 0.12;

  // Жовтий градієнт кристала
  const kg = ctx.createLinearGradient(-outerR, -outerR, outerR, outerR);
  kg.addColorStop(0,   "#fff176");
  kg.addColorStop(0.3, "#FFD700");
  kg.addColorStop(0.6, "#FFA500");
  kg.addColorStop(1,   "#ff8c00");

  ctx.beginPath();
  for (let i = 0; i < pts; i++) {
    const ang = (i / pts) * Math.PI * 2;
    const r = i % 2 === 0 ? outerR : innerR;
    const x = Math.cos(ang) * r;
    const y = Math.sin(ang) * r;
    i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
  }
  ctx.closePath();
  ctx.fillStyle = kg;
  ctx.fill();
  ctx.strokeStyle = "rgba(255,255,255,0.7)";
  ctx.lineWidth = size * 0.018;
  ctx.stroke();
  ctx.shadowBlur = 0;

  // Внутрішній блік
  ctx.beginPath();
  for (let i = 0; i < pts; i++) {
    const ang = (i / pts) * Math.PI * 2;
    const r = i % 2 === 0 ? outerR * 0.55 : innerR * 0.55;
    const x = Math.cos(ang) * r;
    const y = Math.sin(ang) * r;
    i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
  }
  ctx.closePath();
  ctx.fillStyle = "rgba(255,255,255,0.25)";
  ctx.fill();
  ctx.restore();

  // Зірочки — жовті
  const starPositions = [
    { x: cx - size*0.32, y: cy - size*0.35, s: size*0.055 },
    { x: cx + size*0.36, y: cy - size*0.28, s: size*0.04  },
    { x: cx + size*0.3,  y: cy + size*0.34, s: size*0.048 },
    { x: cx - size*0.28, y: cy + size*0.3,  s: size*0.036 },
  ];
  starPositions.forEach(({ x, y, s }) => {
    ctx.save();
    ctx.translate(x, y);
    ctx.fillStyle = "rgba(255,240,150,0.95)";
    ctx.beginPath();
    for (let i = 0; i < 4; i++) {
      ctx.rotate(Math.PI / 2);
      ctx.moveTo(0, 0);
      ctx.lineTo(s * 0.4, s * 0.4);
      ctx.lineTo(0, s);
      ctx.lineTo(-s * 0.4, s * 0.4);
    }
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  });

  // Центральна зірка
  ctx.save();
  ctx.translate(cx, cy);
  ctx.shadowColor = "rgba(255,255,255,0.9)";
  ctx.shadowBlur = size * 0.06;
  ctx.fillStyle = "#fff";
  ctx.beginPath();
  for (let i = 0; i < 4; i++) {
    ctx.rotate(Math.PI / 2);
    ctx.moveTo(0, 0);
    ctx.lineTo(size*0.05, size*0.05);
    ctx.lineTo(0, size*0.18);
    ctx.lineTo(-size*0.05, size*0.05);
  }
  ctx.closePath();
  ctx.fill();
  ctx.restore();

  // Знак питання по центру
  ctx.save();
  ctx.translate(cx, cy);
  ctx.fillStyle = "rgba(255,255,255,0.92)";
  ctx.font = `bold ${size * 0.3}px Arial`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.shadowColor = "rgba(180,100,0,0.5)";
  ctx.shadowBlur = size * 0.05;
  ctx.fillText("?", 0, 0);
  ctx.restore();

  return c.toDataURL("image/png");
}

// ─── 2. Будуємо стрічку рулетки ────────────────────────────────
function buildRouletteStrip(c, winPos, dropped) {
  const COUNT = 60;
  const strip = [];

  // Шанс спеціалки у цьому кейсі (з c.chances або глобального RARITIES)
  const specialChance = c.chances?.special ?? RARITIES.special.chance;

  // Чи буде декорація-спеціалка поруч з вінпосом?
  const hasSpecialDecor = Math.random() < specialChance;
  // 50/50: -1 (перед) або +1 (після)
  const decorOffset = Math.random() < 0.5 ? -1 : 1;
  const decorPos = winPos + decorOffset;

  // Отримуємо список спеціальних предметів цього кейсу
  const specialItems = c.items.filter(i => i.rarity === "special");

  for (let i = 0; i < COUNT; i++) {
    if (i === winPos) {
      strip.push({ ...dropped, _isWin: true });
      continue;
    }

    // Позиція декорації: спеціалка, але НЕ сам вінпос
    if (
      hasSpecialDecor &&
      i === decorPos &&
      i !== winPos &&
      decorPos >= 0 && decorPos < COUNT &&
      specialItems.length > 0
    ) {
      const sp = specialItems[Math.floor(Math.random() * specialItems.length)];
      strip.push({ ...sp, _isSpecialDecor: true });
      continue;
    }

    // Звичайний предмет — не спеціалка (щоб не плутати з декорацією)
    const nonSpecial = c.items.filter(i => i.rarity !== "special");
    const pool = nonSpecial.length > 0 ? nonSpecial : c.items;
    strip.push(pool[Math.floor(Math.random() * pool.length)]);
  }

  return strip;
}

// ─── 3. Генеруємо HTML картки рулетки ──────────────────────────
let _specialMedalUrl = null;

function getSpecialMedalUrl() {
  if (!_specialMedalUrl) _specialMedalUrl = drawSpecialMedalCanvas(120);
  return _specialMedalUrl;
}

function rouletteCardHtml(item, ITEM_W) {
  const r     = RARITIES[item.rarity];
  const color = r ? r.color : "#888";

  const isSpecial = item.rarity === "special";
  // У стрічці спеціалка = кристал (і вінпос і декорація)
  const imgSrc = isSpecial ? getSpecialMedalUrl() : (item.img || "img/placeholder.png");

  // Жовте світіння
  const glow = isSpecial
    ? `box-shadow:0 0 18px 4px rgba(255,215,0,0.6),0 0 6px 1px rgba(255,165,0,0.5);`
    : "";
  const decorBadge = item._isSpecialDecor
    ? `<div style="position:absolute;top:3px;right:4px;font-size:9px;font-weight:700;color:#ffe066;background:rgba(0,0,0,0.55);border-radius:6px;padding:1px 5px;letter-spacing:.5px;">SPECIAL</div>`
    : "";

  return `<div class="roulette-card" style="border-color:${color};min-width:${ITEM_W}px;position:relative;${glow}">
    ${decorBadge}
    <img src="${imgSrc}" onerror="this.src='img/placeholder.png'"
      style="${isSpecial ? "filter:drop-shadow(0 2px 10px rgba(255,200,0,0.7));" : ""}">
    <div style="font-size:10px;color:${color};margin-top:4px;font-weight:700;">${r ? r.name : ""}</div>
  </div>`;
}

// ─── 4. Оновлена openCase ───────────────────────────────────────
function openCase(invId) {
  const invIndex = gameState.inventory.findIndex(x => x.id === invId);
  if (invIndex === -1) return;
  const item = gameState.inventory[invIndex];
  if (!item || item.type !== "case") return;
  const c = CASES[item.caseId];
  if (!c) return;

  const dropped = rollDrop(c);
  const ITEM_W  = 120, TOTAL_W = 130, COUNT = 60;
  const winPos  = 46 + Math.floor(Math.random() * 4);

  const strip = buildRouletteStrip(c, winPos, dropped);
  const stripHtml = strip.map(it => rouletteCardHtml(it, ITEM_W)).join("");

  openModal(
    `<h2 class="modal-title" style="margin-bottom:16px;">🎁 Відкриття кейсу</h2>
    <div class="roulette-wrap">
      <div class="roulette-arrow">▼</div>
      <div class="roulette-viewport">
        <div class="roulette-strip" id="roulette-strip">${stripHtml}</div>
      </div>
    </div>
    <div id="roulette-result" style="display:none;text-align:center;margin-top:20px;"></div>
    <button id="roulette-fast-btn" class="btn-secondary" style="margin-top:12px;width:100%;" onclick="skipRoulette()">⚡ Пропустити</button>
    <button id="roulette-close-btn" class="btn-primary" style="display:none;margin-top:10px;width:100%;" onclick="closeModal()">Забрати!</button>`,
    false
  );

  window._pendingDrop = { dropped, item, invIndex };

  requestAnimationFrame(() => {
    const stripEl = document.getElementById("roulette-strip");
    if (!stripEl) return;
    const vpWidth = stripEl.parentElement.offsetWidth;
    const targetX = winPos * TOTAL_W + ITEM_W / 2 - vpWidth / 2 + (Math.random() - 0.5) * ITEM_W * 0.6;
    stripEl.style.transition = "none";
    stripEl.style.transform  = "translateX(0)";
    requestAnimationFrame(() => requestAnimationFrame(() => {
      stripEl.style.transition = "transform 5s cubic-bezier(0.15, 0.8, 0.35, 1)";
      stripEl.style.transform  = `translateX(-${targetX}px)`;
    }));
    stripEl.addEventListener("transitionend", () => finishCaseOpen(), { once: true });
  });
}

// ─── 5. skipRoulette (без змін у логіці) ───────────────────────
function skipRoulette() {
  const stripEl = document.getElementById("roulette-strip");
  if (stripEl) {
    stripEl.style.transition = "none";
    stripEl.dispatchEvent(new Event("transitionend"));
  }
}

// ─── 6. Оновлена finishCaseOpen ────────────────────────────────
function finishCaseOpen() {
  if (!window._pendingDrop) return;
  const { dropped, item, invIndex } = window._pendingDrop;
  window._pendingDrop = null;

  const fastBtn = document.getElementById("roulette-fast-btn");
  if (fastBtn) fastBtn.style.display = "none";

  const realIdx = gameState.inventory.findIndex((x, i) => i === invIndex && x.id === item.id);
  if (realIdx !== -1) gameState.inventory.splice(realIdx, 1);

   const newItem = {
    id: generateId(), type: "item", itemId: dropped.id,
    name: dropped.name, img: dropped.img, rarity: dropped.rarity,
    collection: dropped.collection || null,
    quality: rollQuality(), premium: Math.random() < 0.05,
    fromCase: item.caseId,
    fromCaseName: CASES[item.caseId]?.name || item.name || item.caseId,
    source: "case",
    obtainedBy: currentUser?.username || "?",
    obtainedAt: Date.now(),
  };

  gameState.inventory.push(newItem);
  addXP({ common:5, exceptional:10, epic:20, legendary:40, secret:80, special:200 }[dropped.rarity] || 5);
  saveData(); renderInventory();

  const r = RARITIES[dropped.rarity];

const isSpecialWin = dropped.rarity === "special";

// У дропі ЗАВЖДИ показуємо справжній PNG предмету
const resultImgSrc = newItem.img || "img/placeholder.png";


  const resultEl = document.getElementById("roulette-result");
  const closeBtn = document.getElementById("roulette-close-btn");

  if (resultEl) {
    resultEl.style.display = "block";
    resultEl.innerHTML = `
      <div style="
        border:2px solid ${r.color};
        border-radius:16px;
        padding:22px 20px;
        background:${r.color}18;
        display:inline-block;
        position:relative;
        overflow:hidden;
        ${isSpecialWin ? `box-shadow:0 0 32px 6px rgba(255,200,0,0.4),0 0 8px 2px rgba(255,165,0,0.3);` : ""}
      ">
        ${isSpecialWin ? `<div style="position:absolute;inset:0;background:radial-gradient(ellipse at 50% 30%,rgba(255,215,0,0.18) 0%,transparent 70%);pointer-events:none;"></div>` : ""}
        <div style="color:#888;font-size:13px;margin-bottom:8px;">🎉 Ви отримали!</div>
      <img src="${resultImgSrc}"
          onerror="this.src='img/placeholder.png'"
          style="width:80px;height:80px;object-fit:contain;display:block;margin:0 auto;filter:${isSpecialWin ? "drop-shadow(0 4px 16px rgba(255,200,0,0.7))" : "drop-shadow(0 3px 8px rgba(0,0,0,0.2))"};">
        <div style="font-weight:700;margin-top:8px;">${newItem.name}</div>
        <div style="color:${r.color};font-weight:700;">${r.name}</div>
        <div style="color:#888;font-size:12px;">${newItem.quality}</div>
        ${newItem.premium ? '<div style="color:#FFD700;font-weight:700;">⭐ ПРЕМІУМ</div>' : ''}
        ${isSpecialWin ? '<div style="color:#ffe066;font-size:12px;margin-top:6px;letter-spacing:1px;">✨СПЕЦІАЛЬНИЙ ПРЕДМЕТ ✨</div>' : ''}
      </div>`;
  }
  if (closeBtn) closeBtn.style.display = "block";
}

// ── ФАСТ-ВІДКРИТТЯ ──────────────────────────

function openFastMode(invId) {
  const invIndex = gameState.inventory.findIndex(x => x.id === invId);
  if (invIndex === -1) return null;
  const item = gameState.inventory[invIndex];
  if (!item || item.type !== "case") return null;
  const c = CASES[item.caseId];
  if (!c) return null;
  const dropped = rollDrop(c);
  gameState.inventory.splice(invIndex, 1);
   const newItem = {
    id: generateId(), type: "item", itemId: dropped.id,
    name: dropped.name, img: dropped.img, rarity: dropped.rarity,
    collection: dropped.collection || null,
    quality: rollQuality(), premium: Math.random() < 0.05,
    fromCase: item.caseId,
    fromCaseName: CASES[item.caseId]?.name || item.name || item.caseId,
    source: "case",
    obtainedBy: currentUser?.username || "?",
    obtainedAt: Date.now(),
  };

  gameState.inventory.push(newItem);
  addXP({ common:5, exceptional:10, epic:20, legendary:40, secret:80, special:200 }[dropped.rarity] || 5);
  return newItem;
}

function showFastOpenModal() {
  injectFastOpenStyles();
  const cases = (gameState.inventory || []).filter(i => i.type === "case");
  if (!cases.length) { showToast("Немає кейсів для відкриття!", "error"); return; }

  const grouped = {};
  cases.forEach(c => {
    if (!grouped[c.caseId]) grouped[c.caseId] = { caseId: c.caseId, name: c.name, img: c.img, items: [] };
    grouped[c.caseId].items.push(c);
  });

  const groupsHtml = Object.values(grouped).map(g => {
    return '<div class="fo-group">' +
      '<div class="fo-group-header">' +
        '<label class="fo-check-label">' +
          '<input type="checkbox" class="fo-group-cb" data-caseid="' + g.caseId + '" onchange="foToggleGroup(\'' + g.caseId + '\',this.checked)">' +
          '<img src="' + g.img + '" onerror="this.src=\'img/placeholder.png\'" style="width:36px;height:36px;object-fit:contain;">' +
          '<span class="fo-name">' + g.name + '</span>' +
          '<span class="fo-count">x' + g.items.length + '</span>' +
        '</label>' +
        '<div class="fo-qty-row">' +
          '<label style="font-size:12px;color:var(--text-muted);">Кількість:</label>' +
          '<input type="number" class="fo-qty-input" data-caseid="' + g.caseId + '" min="1" max="' + g.items.length + '" value="' + g.items.length + '" style="width:60px;padding:4px 6px;border-radius:6px;border:1px solid var(--border);background:var(--bg-input);color:var(--text);font-size:13px;">' +
        '</div>' +
      '</div>' +
    '</div>';
  }).join("");

  openModal(
    '<h2 class="modal-title">⚡ Фаст-відкриття</h2>' +
    '<p style="color:var(--text-muted);font-size:13px;margin-bottom:12px;">Вибери кейси — анімація пропускається, лут одразу в інвентар</p>' +
    '<div style="margin-bottom:12px;display:flex;gap:8px;">' +
      '<button class="btn-secondary" style="font-size:12px;padding:6px 10px;" onclick="foSelectAll(true)">✅ Всі</button>' +
      '<button class="btn-secondary" style="font-size:12px;padding:6px 10px;" onclick="foSelectAll(false)">❌ Жодного</button>' +
    '</div>' +
    '<div id="fo-groups" style="max-height:320px;overflow-y:auto;display:flex;flex-direction:column;gap:8px;">' + groupsHtml + '</div>' +
    '<div id="fo-summary" style="margin-top:12px;padding:10px;background:var(--bg-card2);border-radius:8px;font-size:13px;color:var(--text-muted);">Вибрано: 0 кейсів</div>' +
    '<div style="display:flex;gap:8px;margin-top:14px;">' +
      '<button class="btn-primary" style="flex:1;" onclick="doFastOpen()">⚡ Відкрити!</button>' +
      '<button class="btn-secondary" style="flex:1;" onclick="closeModal()">Скасувати</button>' +
    '</div>',
    true
  );
}

function foToggleGroup(caseId, checked) { foUpdateSummary(); }

function foSelectAll(checked) {
  document.querySelectorAll('.fo-group-cb').forEach(cb => { cb.checked = checked; });
  foUpdateSummary();
}

function foUpdateSummary() {
  let total = 0;
  document.querySelectorAll('.fo-group-cb:checked').forEach(cb => {
    const caseId = cb.dataset.caseid;
    const qtyInput = document.querySelector('.fo-qty-input[data-caseid="' + caseId + '"]');
    const qty = parseInt(qtyInput?.value) || 0;
    const available = (gameState.inventory || []).filter(i => i.type === "case" && i.caseId === caseId).length;
    total += Math.min(qty, available);
  });
  const summary = document.getElementById("fo-summary");
  if (summary) summary.textContent = "Вибрано: " + total + " кейсів";
}

async function doFastOpen() {
  const selected = [];
  document.querySelectorAll('.fo-group-cb:checked').forEach(cb => {
    const caseId = cb.dataset.caseid;
    const qtyInput = document.querySelector('.fo-qty-input[data-caseid="' + caseId + '"]');
    const qty = parseInt(qtyInput?.value) || 0;
    if (qty > 0) selected.push({ caseId, qty });
  });

  if (!selected.length) { showToast("Нічого не вибрано!", "error"); return; }

  const results = [];
  for (const sel of selected) {
    const available = (gameState.inventory || []).filter(i => i.type === "case" && i.caseId === sel.caseId);
    const toOpen = Math.min(sel.qty, available.length);
    for (let i = 0; i < toOpen; i++) {
      const caseInv = gameState.inventory.find(x => x.type === "case" && x.caseId === sel.caseId);
      if (!caseInv) break;
      const result = openFastMode(caseInv.id);
      if (result) results.push(result);
    }
  }

  if (!results.length) { showToast("Не вдалося відкрити!", "error"); return; }

  await saveData();
  renderInventory();

  const ro = ["special","secret","legendary","epic","exceptional","common"];
  results.sort((a,b) => ro.indexOf(a.rarity) - ro.indexOf(b.rarity));
  const resultsHtml = results.map(item => {
    const r = item.rarity ? RARITIES[item.rarity] : null;
    const color = r ? r.color : "#888";
    return '<div style="background:var(--bg-card2);border:2px solid ' + color + ';border-radius:10px;padding:10px 8px;text-align:center;">' +
      '<img src="' + (item.img||'img/placeholder.png') + '" onerror="this.src=\'img/placeholder.png\'" style="width:56px;height:56px;object-fit:contain;margin:0 auto;">' +
      '<div style="font-size:11px;font-weight:700;color:var(--text);margin-top:4px;line-height:1.2;">' + item.name + '</div>' +
      (r ? '<div style="font-size:10px;color:' + color + ';font-weight:700;">' + r.name + '</div>' : '') +
      (item.premium ? '<div style="font-size:10px;color:#FFD700;">⭐</div>' : '') +
    '</div>';
  }).join("");

  openModal(
    '<h2 class="modal-title">⚡ Результати (' + results.length + ' кейсів)</h2>' +
    '<div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(90px,1fr));gap:8px;max-height:400px;overflow-y:auto;margin-bottom:16px;">' + resultsHtml + '</div>' +
    '<button class="btn-primary btn-full" onclick="closeModal()">Забрати все!</button>',
    true
  );
}

function injectFastOpenStyles() {
  if (document.getElementById('fo-styles')) return;
  const s = document.createElement('style'); s.id = 'fo-styles';
  s.textContent = `
    .fo-group { background:var(--bg-card2);border:1px solid var(--border);border-radius:10px;padding:10px 12px; }
    .fo-group-header { display:flex;align-items:center;justify-content:space-between;gap:8px;flex-wrap:wrap; }
    .fo-check-label { display:flex;align-items:center;gap:8px;cursor:pointer;flex:1; }
    .fo-check-label input[type=checkbox] { width:18px;height:18px;cursor:pointer;accent-color:var(--accent); }
    .fo-name { font-weight:700;font-size:14px;color:var(--text);flex:1; }
    .fo-count { font-size:13px;color:var(--accent);font-weight:700; }
    .fo-qty-row { display:flex;align-items:center;gap:6px; }
  `;
  document.head.appendChild(s);
}

function rollDrop(c) {
  const r = Math.random();
  let cum = 0;

  // Будуємо пул по рідкості
  const byRarity = {};
  c.items.forEach(i => {
    if (!byRarity[i.rarity]) byRarity[i.rarity] = [];
    byRarity[i.rarity].push(i);
  });

  // Використовуємо шанси кейсу або глобальні як fallback
  const chanceSource = c.chances || Object.fromEntries(
    Object.entries(RARITIES).map(([k, v]) => [k, v.chance])
  );

  // Перебираємо від найрідкіснішого до найзвичайнішого
  for (const rarity of ["special", "secret", "legendary", "epic", "exceptional", "common"]) {
    const chance = chanceSource[rarity] || 0;
    if (chance <= 0 || !byRarity[rarity]) continue; // пропускаємо нульові шанси
    cum += chance;
    if (r < cum) {
      const pool = byRarity[rarity];
      return pool[Math.floor(Math.random() * pool.length)];
    }
  }

  // Fallback: будь-який предмет з кейсу
  const allItems = c.items;
  return allItems[Math.floor(Math.random() * allItems.length)];
}

function rollQuality() {
  let r = Math.random(), cum = 0;
  for (const q of QUALITIES) { cum += q.chance; if (r < cum) return q.name; }
  return QUALITIES[QUALITIES.length - 1].name;
}

// ── ІНВЕНТАР ───────────────────────────────

// ══════════════════════════════════════════════════════════
// ІНВЕНТАР — НОВИЙ СТИЛЬ (вставити замість renderInventory і пов'язаних функцій)
// ══════════════════════════════════════════════════════════

// ── ПАПКИ ──────────────────────────────────────────────────
const FOLDER_COLORS = ["#e4b84d","#5ddb8a","#5db8ff","#e4754d","#b45dff","#ff5d8a","#5dffe4"];
let invFolders = JSON.parse(localStorage.getItem("nkr_inv_folders") || "[]");

function saveFolders() { localStorage.setItem("nkr_inv_folders", JSON.stringify(invFolders)); }
function genFolderId() { return "f" + Math.random().toString(36).slice(2) + Date.now().toString(36); }
function getFolderOf(itemId) { return invFolders.find(f => f.itemIds.includes(itemId)) || null; }

// ── СТАН ІНВЕНТАРЮ ─────────────────────────────────────────
let invSort      = "rarity";
let invFilter    = "all";
let invColFilter = "all";
let _invFolder   = null;   // null = показати всі / id = фільтр за папкою

// ── СТИЛІ ──────────────────────────────────────────────────
function injectInvStyles() {
  if (document.getElementById("nkr-inv-styles")) return;
  const s = document.createElement("style");
  s.id = "nkr-inv-styles";
  s.textContent = `
    /* ── Загальний контейнер сторінки ── */
    #page-inventory {
      padding: 0;
      display: flex;
      flex-direction: column;
      height: 100%;
      box-sizing: border-box;
    }

    /* ── Топбар інвентарю ── */
    .inv2-topbar {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 14px 16px 10px;
      gap: 8px;
      flex-wrap: wrap;
      border-bottom: 1px solid var(--border);
      background: var(--bg-card);
      position: sticky;
      top: 0;
      z-index: 20;
    }
    .inv2-topbar-title {
      font-size: 17px;
      font-weight: 800;
      color: var(--text);
      letter-spacing: -.3px;
    }
    .inv2-topbar-count {
      font-size: 12px;
      color: var(--text-muted);
      background: var(--bg-input);
      padding: 3px 9px;
      border-radius: 20px;
      border: 1px solid var(--border);
    }

    /* ── Панель фільтрів / сортування ── */
    .inv2-controls {
      padding: 10px 12px 8px;
      display: flex;
      flex-direction: column;
      gap: 8px;
      background: var(--bg);
      border-bottom: 1px solid var(--border);
    }
    .inv2-row {
      display: flex;
      gap: 6px;
      flex-wrap: wrap;
      align-items: center;
    }
    .inv2-chip {
      padding: 5px 11px;
      border-radius: 20px;
      border: 1px solid var(--border);
      background: var(--bg-card);
      color: var(--text-muted);
      font-size: 12px;
      font-weight: 600;
      cursor: pointer;
      transition: all .15s;
      white-space: nowrap;
      flex-shrink: 0;
    }
    .inv2-chip.active, .inv2-chip:hover {
      background: var(--accent);
      color: #fff;
      border-color: var(--accent);
    }
    .inv2-search {
      flex: 1;
      min-width: 120px;
      padding: 7px 12px;
      border-radius: 20px;
      border: 1px solid var(--border);
      background: var(--bg-input);
      color: var(--text);
      font-size: 13px;
    }
    .inv2-search:focus { outline: none; border-color: var(--accent); }

    /* ── Кнопка фаст-відкриття ── */
    .inv2-fast-btn {
      width: 100%;
      padding: 10px;
      border-radius: 10px;
      background: linear-gradient(90deg, var(--accent), var(--gold));
      color: #fff;
      font-size: 14px;
      font-weight: 700;
      border: none;
      cursor: pointer;
      letter-spacing: .3px;
      transition: opacity .15s;
      margin: 8px 12px 0;
      width: calc(100% - 24px);
    }
    .inv2-fast-btn:hover { opacity: .88; }

    /* ── Папки ── */
    .inv2-folders-bar {
      display: flex;
      gap: 8px;
      padding: 8px 12px 0;
      overflow-x: auto;
      scrollbar-width: none;
      flex-shrink: 0;
    }
    .inv2-folders-bar::-webkit-scrollbar { display: none; }
    .inv2-folder-chip {
      display: flex;
      align-items: center;
      gap: 5px;
      padding: 5px 11px 5px 8px;
      border-radius: 20px;
      border: 1.5px solid var(--border);
      background: var(--bg-card);
      color: var(--text-muted);
      font-size: 12px;
      font-weight: 700;
      cursor: pointer;
      white-space: nowrap;
      flex-shrink: 0;
      transition: all .15s;
    }
    .inv2-folder-chip.active { border-color: currentColor; color: var(--text); }
    .inv2-folder-chip .folder-dot {
      width: 8px; height: 8px; border-radius: 50%;
      flex-shrink: 0;
    }
    .inv2-folder-new {
      padding: 5px 11px;
      border-radius: 20px;
      border: 1.5px dashed var(--border);
      background: transparent;
      color: var(--text-muted);
      font-size: 12px;
      font-weight: 700;
      cursor: pointer;
      white-space: nowrap;
      flex-shrink: 0;
    }

    /* ── СІТКА ── */
    .inv2-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(105px, 1fr));
      gap: 10px;
      padding: 12px;
      flex: 1;
      overflow-y: auto;
    }
    @media (max-width: 360px) {
      .inv2-grid { grid-template-columns: repeat(3, 1fr); gap: 7px; padding: 8px; }
    }
    @media (min-width: 600px) {
      .inv2-grid { grid-template-columns: repeat(auto-fill, minmax(120px, 1fr)); gap: 12px; }
    }

    /* ── Картка предмета ── */
    .inv2-card {
      position: relative;
      background: var(--bg-card);
      border: 2px solid var(--border);
      border-radius: 14px;
      display: flex;
      flex-direction: column;
      align-items: center;
      padding: 10px 6px 8px;
      gap: 4px;
      cursor: pointer;
      transition: transform .15s, box-shadow .15s, border-color .15s;
      -webkit-tap-highlight-color: transparent;
      overflow: hidden;
      min-height: 120px;
    }
    .inv2-card:active { transform: scale(.96); }
    .inv2-card.inv2-locked { opacity: .55; }
    .inv2-card-stripe {
      position: absolute;
      top: 0; left: 0; right: 0;
      height: 3px;
      border-radius: 14px 14px 0 0;
    }
    .inv2-card img {
      width: 58px; height: 58px;
      object-fit: contain;
      display: block;
    }
    @media (max-width: 360px) {
      .inv2-card img { width: 48px; height: 48px; }
      .inv2-card { min-height: 105px; padding: 8px 4px 6px; }
    }
    .inv2-card-name {
      font-size: 11px;
      font-weight: 700;
      color: var(--text);
      text-align: center;
      line-height: 1.25;
      max-width: 100%;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
      width: 100%;
      padding: 0 2px;
    }
    .inv2-card-rar {
      font-size: 9px;
      font-weight: 700;
      text-align: center;
    }
    .inv2-card-badge {
      position: absolute;
      top: 5px; right: 5px;
      font-size: 11px;
      line-height: 1;
    }
    .inv2-card-folder-dot {
      position: absolute;
      bottom: 5px; right: 5px;
      width: 7px; height: 7px;
      border-radius: 50%;
    }
    .inv2-menu-btn {
      position: absolute;
      bottom: 4px; left: 4px;
      width: 22px; height: 22px;
      border-radius: 50%;
      background: rgba(0,0,0,.28);
      border: none;
      color: #fff;
      font-size: 13px;
      display: flex; align-items: center; justify-content: center;
      cursor: pointer;
      z-index: 2;
      line-height: 1;
      transition: background .15s;
      flex-shrink: 0;
    }
    .inv2-menu-btn:active { background: rgba(0,0,0,.5); }

    /* ── Попап меню ── */
    .inv2-popup-overlay {
      position: fixed;
      inset: 0;
      z-index: 8886;
      background: transparent;
    }
    #inv-item-popup {
      position: fixed;
      z-index: 8888;
      background: var(--bg-card);
      border: 1.5px solid var(--border);
      border-radius: 14px;
      box-shadow: 0 8px 32px rgba(0,0,0,.38);
      padding: 14px;
      display: flex;
      flex-direction: column;
      gap: 8px;
      min-width: 0;
      animation: popupIn .16s cubic-bezier(.22,1,.36,1);
    }
    @keyframes popupIn {
      from { opacity:0; transform: scale(.88); }
      to   { opacity:1; transform: scale(1); }
    }
    .inv2-popup-header {
      display: flex;
      align-items: center;
      gap: 8px;
      margin-bottom: 4px;
    }
    .inv2-popup-header img {
      width: 38px; height: 38px;
      object-fit: contain;
      flex-shrink: 0;
    }
    .inv2-popup-meta { flex: 1; min-width: 0; }
    .inv2-popup-name {
      font-size: 13px;
      font-weight: 800;
      color: var(--text);
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }
    .inv2-popup-rar { font-size: 10px; font-weight: 700; }
    .inv2-popup-qual { font-size: 10px; color: var(--text-muted); }
    .inv2-popup-divider { height: 1px; background: var(--border); margin: 2px 0; }
    .inv2-popup-btn {
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 9px 10px;
      border-radius: 10px;
      border: 1px solid var(--border);
      background: var(--bg-card2);
      color: var(--text);
      font-size: 13px;
      font-weight: 600;
      cursor: pointer;
      transition: background .13s;
      text-align: left;
      width: 100%;
    }
    .inv2-popup-btn:hover, .inv2-popup-btn:active { background: var(--bg-input); }
    .inv2-popup-btn.danger { color: #e74c3c; }
    .inv2-popup-btn.accent { color: var(--accent); }

    /* ── SVG connector ── */
    #inv-popup-connector {
      position: fixed; pointer-events: none; z-index: 8887;
      left:0; top:0; width:100vw; height:100vh; overflow:visible;
    }

    /* ── Модалки інвентарю ── */
    .inv2-modal-overlay {
      position: fixed; inset: 0; z-index: 9100;
      background: rgba(0,0,0,.55);
      display: flex; align-items: flex-end; justify-content: center;
    }
    @media (min-width: 500px) {
      .inv2-modal-overlay { align-items: center; }
    }
    .inv2-modal {
      background: var(--bg-card);
      border-radius: 18px 18px 0 0;
      padding: 20px 16px 28px;
      width: 100%;
      max-width: 420px;
      max-height: 85vh;
      overflow-y: auto;
      display: flex;
      flex-direction: column;
      gap: 12px;
      box-shadow: 0 -8px 40px rgba(0,0,0,.35);
      animation: sheetIn .22s cubic-bezier(.22,1,.36,1);
    }
    @media (min-width: 500px) {
      .inv2-modal { border-radius: 18px; }
    }
    @keyframes sheetIn {
      from { transform: translateY(60px); opacity: 0; }
      to   { transform: translateY(0); opacity: 1; }
    }
    .inv2-modal h3 { margin: 0; font-size: 17px; font-weight: 800; color: var(--text); }
    .inv2-modal input[type=text] {
      width: 100%; padding: 10px 12px;
      border-radius: 10px; border: 1.5px solid var(--border);
      background: var(--bg-input); color: var(--text); font-size: 14px;
      box-sizing: border-box;
    }
    .inv2-modal input[type=text]:focus { outline: none; border-color: var(--accent); }
    .inv2-color-row {
      display: flex; gap: 8px; flex-wrap: wrap;
    }
    .inv2-color-swatch {
      width: 28px; height: 28px; border-radius: 50%;
      cursor: pointer; border: 3px solid transparent;
      transition: border-color .15s, transform .12s;
    }
    .inv2-color-swatch.selected { border-color: var(--text); transform: scale(1.18); }
    .inv2-modal-btns {
      display: flex; gap: 8px; margin-top: 4px;
    }
    .inv2-btn {
      flex: 1; padding: 10px;
      border-radius: 10px; border: 1px solid var(--border);
      background: var(--bg-card2); color: var(--text);
      font-size: 14px; font-weight: 700;
      cursor: pointer; transition: background .13s;
    }
    .inv2-btn.primary { background: var(--accent); color: #fff; border-color: var(--accent); }
    .inv2-btn.danger  { background: #e74c3c22; color: #e74c3c; border-color: #e74c3c55; }
    .inv2-btn:disabled { opacity: .4; cursor: not-allowed; }
    .inv2-folder-list { display: flex; flex-direction: column; gap: 6px; }
    .inv2-folder-list-item {
      display: flex; align-items: center; gap: 8px;
      padding: 10px 12px; border-radius: 10px;
      background: var(--bg-card2); border: 1.5px solid var(--border);
      cursor: pointer; font-size: 13px; font-weight: 600; color: var(--text);
      transition: background .13s;
    }
    .inv2-folder-list-item.current { border-color: var(--accent); }
    .inv2-folder-list-item:hover { background: var(--bg-input); }
    .inv2-folder-dot2 { width: 10px; height: 10px; border-radius: 50%; flex-shrink: 0; }

    /* ── Empty state ── */
    .inv2-empty {
      grid-column: 1 / -1;
      text-align: center;
      padding: 40px 20px;
      color: var(--text-muted);
      font-size: 14px;
    }
  `;
  document.head.appendChild(s);
}

// ── РЕНДЕР ІНВЕНТАРЮ ───────────────────────────────────────
let _inv2Search = "";

function renderInventory() {
  injectInvStyles();
  const page = document.getElementById("page-inventory");
  if (!page) return;

  // Зберігаємо стан скролу
  const prevScroll = page.scrollTop;

  const allItems = gameState.inventory || [];
  let items = [...allItems];

  // Фільтр по типу
  if (invFilter !== "all") items = items.filter(i => i.type === invFilter);

  // Фільтр по колекції
  if (invColFilter !== "all") {
    if (invColFilter === "none") items = items.filter(i => !i.collection);
    else items = items.filter(i => i.collection === invColFilter);
  }

  // Фільтр по папці
  if (_invFolder) {
    const folder = invFolders.find(f => f.id === _invFolder);
    if (folder) items = items.filter(i => folder.itemIds.includes(i.id));
  }

  // Пошук
  if (_inv2Search) {
    const q = _inv2Search.toLowerCase();
    items = items.filter(i => (i.name||"").toLowerCase().includes(q));
  }

  // Сортування
  const ro = ["special","secret","legendary","epic","exceptional","common",""];
  if (invSort === "rarity")      items.sort((a,b) => ro.indexOf(a.rarity) - ro.indexOf(b.rarity));
  else if (invSort === "name")   items.sort((a,b) => (a.name||"").localeCompare(b.name||""));
  else if (invSort === "date")   items.sort((a,b) => (b.obtainedAt||0) - (a.obtainedAt||0));

  const hasCases = items.some(i => i.type === "case");
  const totalAll = allItems.length;

  // --- РЕНДЕР ---
  page.innerHTML = `
    <!-- Топбар -->
    <div class="inv2-topbar">
      <div style="display:flex;align-items:center;gap:8px;">
        <span class="inv2-topbar-title">🎒 Інвентар</span>
        <span class="inv2-topbar-count">${totalAll}</span>
      </div>
      <div style="display:flex;gap:6px;align-items:center;">
        <input type="text" class="inv2-search" placeholder="🔍 Пошук..." value="${_inv2Search}"
          oninput="inv2SetSearch(this.value)" style="max-width:140px;">
      </div>
    </div>

    <!-- Фільтри -->
    <div class="inv2-controls">
      <!-- Тип -->
      <div class="inv2-row">
        <span style="font-size:11px;color:var(--text-muted);font-weight:700;flex-shrink:0;">Тип:</span>
        ${["all","item","case"].map(f => {
          const labels = {all:"Всі",item:"🎁 Предмети",case:"📦 Кейси"};
          return `<button class="inv2-chip${invFilter===f?" active":""}" onclick="setInvFilter('${f}')">${labels[f]}</button>`;
        }).join("")}
      </div>
      <!-- Сортування -->
      <div class="inv2-row">
        <span style="font-size:11px;color:var(--text-muted);font-weight:700;flex-shrink:0;">Сорт:</span>
        ${[["rarity","⭐ Рідкість"],["name","🔤 Назва"],["date","🕒 Дата"]].map(([k,l]) =>
          `<button class="inv2-chip${invSort===k?" active":""}" onclick="setInvSort('${k}')">${l}</button>`
        ).join("")}
      </div>
      <!-- Колекція -->
      <div class="inv2-row" style="overflow-x:auto;flex-wrap:nowrap;padding-bottom:2px;scrollbar-width:none;">
        <span style="font-size:11px;color:var(--text-muted);font-weight:700;flex-shrink:0;">Кол:</span>
        <button class="inv2-chip${invColFilter==="all"?" active":""}" onclick="setInvColFilter('all')">Всі</button>
        ${Object.entries(COLLECTIONS).map(([k,v]) =>
          `<button class="inv2-chip${invColFilter===k?" active":""}" onclick="setInvColFilter('${k}')">${v.name}</button>`
        ).join("")}
        <button class="inv2-chip${invColFilter==="none"?" active":""}" onclick="setInvColFilter('none')">Без</button>
      </div>
    </div>

    <!-- Папки -->
    <div class="inv2-folders-bar">
      <button class="inv2-folder-chip${!_invFolder?" active":""}" onclick="inv2SetFolder(null)"
        style="${!_invFolder?"color:var(--accent);border-color:var(--accent)":""}">
        📁 Всі
      </button>
      ${invFolders.map(f => `
        <button class="inv2-folder-chip${_invFolder===f.id?" active":""}"
          onclick="inv2SetFolder('${f.id}')"
          style="${_invFolder===f.id?`color:${f.color};border-color:${f.color}`:""}">
          <span class="folder-dot" style="background:${f.color}"></span>${f.name}
        </button>
      `).join("")}
      <button class="inv2-folder-new" onclick="inv2OpenCreateFolder()">+ Папка</button>
    </div>

    <!-- Фаст-відкриття -->
    ${hasCases && invFilter !== "item" ? `
      <button class="inv2-fast-btn" onclick="showFastOpenModal()">⚡ Фаст-відкриття кейсів</button>
    ` : ""}

    <!-- Сітка -->
    <div class="inv2-grid">
      ${items.length ? items.map(item => {
        const r       = item.rarity ? RARITIES[item.rarity] : null;
        const color   = r ? r.color : "#888";
        const locked  = _lockedItems.has(item.id);
        const folder  = getFolderOf(item.id);
        const isCase  = item.type === "case";
        // Шукаємо realIdx у gameState.inventory для попапу
        const realIdx = (gameState.inventory||[]).findIndex(x => x.id === item.id);
        return `
          <div class="inv2-card${locked?" inv2-locked":""}" style="border-color:${color}"
            onclick="inv2OpenPopup(event,'${item.id}',${realIdx})">
            <div class="inv2-card-stripe" style="background:${color}"></div>
            <img src="${item.img||"img/placeholder.png"}" onerror="this.src='img/placeholder.png'" alt="${item.name}">
            <div class="inv2-card-name">${item.name}</div>
            ${r ? `<div class="inv2-card-rar" style="color:${color}">${r.name}</div>` : ""}
            ${locked ? `<div class="inv2-card-badge">🔒</div>` : ""}
            ${item.premium ? `<div class="inv2-card-badge" style="${locked?"right:20px":""}">⭐</div>` : ""}
            ${folder ? `<div class="inv2-card-folder-dot" style="background:${folder.color}"></div>` : ""}
            <button class="inv2-menu-btn" onclick="event.stopPropagation();inv2OpenPopup(event,'${item.id}',${realIdx})">⋯</button>
          </div>`;
      }).join("") : `<div class="inv2-empty">🌊 Нічого не знайдено</div>`}
    </div>
  `;

  // Відновлюємо скрол
  page.scrollTop = prevScroll;
}

// ── БЛОКУВАННЯ ПРЕДМЕТІВ ───────────────────
function toggleLock(itemId) {
  if (_lockedItems.has(itemId)) {
    _lockedItems.delete(itemId);
    showToast("🔓 Предмет розблоковано", "success");
  } else {
    _lockedItems.add(itemId);
    showToast("🔒 Предмет заблоковано", "success");
  }
  renderInventory();
}

// ── СЕТТЕРИ ────────────────────────────────────────────────
function setInvSort(sort)      { invSort = sort;      renderInventory(); }
function setInvFilter(filter)  { invFilter = filter;  renderInventory(); }
function setInvColFilter(col)  { invColFilter = col;  renderInventory(); }
function inv2SetFolder(id)     { _invFolder = id;     renderInventory(); }

function inv2SetSearch(val) {
  _inv2Search = val;
  renderInventory();
  const input = document.querySelector('.inv2-search');
  if (input) {
    input.focus();
    const len = input.value.length;
    input.setSelectionRange(len, len);
  }
}

// ── ПОПАП З МЕНЮ ───────────────────────────────────────────
const POP_W = 220;
const POP_H = 290; // приблизна, підлаштовується
const GAP   = 12;
const EDGE  = 8;

function inv2OpenPopup(e, itemId, realIdx) {
  e.stopPropagation();
  closeItemPopup();

  const item = (gameState.inventory||[]).find(x => x.id === itemId);
  if (!item) return;

  const r      = item.rarity ? RARITIES[item.rarity] : null;
  const color  = r ? r.color : "#888";
  const locked = _lockedItems.has(itemId);
  const folder = getFolderOf(itemId);
  const isCase = item.type === "case";

  // Overlay
  const ov = document.createElement("div");
  ov.className = "inv2-popup-overlay";
  ov.id = "inv-item-popup-overlay";
  ov.addEventListener("click", closeItemPopup);
  document.body.appendChild(ov);

  // Попап
  const pop = document.createElement("div");
  pop.id = "inv-item-popup";
  pop.innerHTML = `
    <div class="inv2-popup-header">
      <img src="${item.img||"img/placeholder.png"}" onerror="this.src='img/placeholder.png'">
      <div class="inv2-popup-meta">
        <div class="inv2-popup-name">${item.name}</div>
        ${r ? `<div class="inv2-popup-rar" style="color:${color}">${r.name}</div>` : ""}
        ${item.quality ? `<div class="inv2-popup-qual">${item.quality}</div>` : ""}
      </div>
    </div>
    <div class="inv2-popup-divider"></div>
    ${isCase ? `
      <button class="inv2-popup-btn accent" onclick="closeItemPopup();openCase('${itemId}')">🎁 Відкрити</button>
    ` : ""}
    ${!locked ? `
      <button class="inv2-popup-btn accent" onclick="closeItemPopup();showSellModal('${itemId}')">💰 Продати на ринку</button>
      ${!isCase ? `<button class="inv2-popup-btn" onclick="closeItemPopup();showTradeModal('${itemId}')">🔄 Трейд</button>` : ""}
    ` : ""}
    <button class="inv2-popup-btn" onclick="closeItemPopup();inv2OpenFolderModal('${itemId}')">
      📁 ${folder ? `Папка: <span style="color:${folder.color}">${folder.name}</span>` : "Додати в папку"}
    </button>
    <button class="inv2-popup-btn" onclick="closeItemPopup();toggleLock('${itemId}')">
      ${locked ? "🔓 Розблокувати" : "🔒 Заблокувати"}
    </button>
    <button class="inv2-popup-btn" onclick="closeItemPopup();inv2ViewDetail('${itemId}')">📋 Деталі</button>
  `;
  document.body.appendChild(pop);

  // Позиціонування
  // Шукаємо батьківську картку — або тригер
  const trigger = e.currentTarget || e.target;
  const card = trigger.closest(".inv2-card") || trigger;
  const cardR = card.getBoundingClientRect();

  const vw = window.innerWidth;
  const vh = window.innerHeight;
  const popH = pop.offsetHeight || 240;
  const cardCX = cardR.left + cardR.width / 2;
  const cardCY = cardR.top  + cardR.height / 2;

  const spaceRight  = vw - cardR.right;
  const spaceLeft   = cardR.left;
  const spaceBottom = vh - cardR.bottom;
  const spaceTop    = cardR.top;

  let left, top, side;

  if (spaceRight >= POP_W + GAP) {
    side = "right"; left = cardR.right + GAP; top = cardCY - popH / 2;
  } else if (spaceLeft >= POP_W + GAP) {
    side = "left";  left = cardR.left - GAP - POP_W; top = cardCY - popH / 2;
  } else if (spaceBottom >= popH + GAP) {
    side = "bottom"; left = cardCX - POP_W / 2; top = cardR.bottom + GAP;
  } else {
    side = "top";   left = cardCX - POP_W / 2; top = cardR.top - GAP - popH;
  }

  left = Math.max(EDGE, Math.min(left, vw - POP_W - EDGE));
  top  = Math.max(EDGE, Math.min(top,  vh - popH - EDGE));

  pop.style.cssText += `left:${left}px;top:${top}px;width:${POP_W}px;max-width:${POP_W}px;position:fixed;`;

  // SVG лінія
  const x1 = cardCX, y1 = cardCY;
  let x2, y2;
  if (side === "right")       { x2 = left;          y2 = Math.max(top+16, Math.min(top+popH-16, y1)); }
  else if (side === "left")   { x2 = left + POP_W;  y2 = Math.max(top+16, Math.min(top+popH-16, y1)); }
  else if (side === "bottom") { x2 = Math.max(left+16, Math.min(left+POP_W-16, x1)); y2 = top; }
  else                        { x2 = Math.max(left+16, Math.min(left+POP_W-16, x1)); y2 = top+popH; }

  const cx1 = x1 + (x2-x1)*.5, cy1 = y1, cx2 = x1 + (x2-x1)*.5, cy2 = y2;

  const svg = document.createElementNS("http://www.w3.org/2000/svg","svg");
  svg.id = "inv-popup-connector";
  svg.style.cssText = "position:fixed;pointer-events:none;z-index:8887;left:0;top:0;width:100vw;height:100vh;overflow:visible;";
  svg.innerHTML = `
    <defs>
      <marker id="conn-dot" markerWidth="8" markerHeight="8" refX="4" refY="4" markerUnits="userSpaceOnUse">
        <circle cx="4" cy="4" r="4" fill="${color}" opacity=".9"/>
      </marker>
      <marker id="conn-tip" markerWidth="10" markerHeight="10" refX="8" refY="4" markerUnits="userSpaceOnUse">
        <path d="M0,0 L8,4 L0,8 Z" fill="${color}" opacity=".9"/>
      </marker>
    </defs>
    <path d="M${x1},${y1} C${cx1},${cy1} ${cx2},${cy2} ${x2},${y2}"
      fill="none" stroke="rgba(0,0,0,.35)" stroke-width="4" stroke-linecap="round"/>
    <path d="M${x1},${y1} C${cx1},${cy1} ${cx2},${cy2} ${x2},${y2}"
      fill="none" stroke="${color}" stroke-width="2.5" stroke-dasharray="6,4"
      stroke-linecap="round" opacity=".88"
      marker-start="url(#conn-dot)" marker-end="url(#conn-tip)"/>
  `;
  document.body.appendChild(svg);
}

function closeItemPopup() {
  document.getElementById("inv-item-popup-overlay")?.remove();
  document.getElementById("inv-item-popup")?.remove();
  document.getElementById("inv-popup-connector")?.remove();
}

// ── ДЕТАЛІ ПРЕДМЕТА ────────────────────────────────────────
function inv2ViewDetail(itemId) {
  const item = (gameState.inventory||[]).find(x => x.id === itemId);
  if (!item) return;
  const r = item.rarity ? RARITIES[item.rarity] : null;
  const color = r ? r.color : "#888";
  const folder = getFolderOf(item.id);
  const date = item.obtainedAt ? new Date(item.obtainedAt).toLocaleString("uk-UA",{hour12:false}) : "Невідомо";

  inv2OpenModal(`
    <h3>📋 Деталі</h3>
    <div style="display:flex;align-items:center;gap:12px;background:var(--bg-card2);border:2px solid ${color};border-radius:12px;padding:12px;">
      <img src="${item.img||"img/placeholder.png"}" onerror="this.src='img/placeholder.png'"
        style="width:56px;height:56px;object-fit:contain;flex-shrink:0;">
      <div style="flex:1;min-width:0;">
        <div style="font-weight:800;font-size:15px;color:var(--text);">${item.name}</div>
        ${r ? `<div style="font-size:12px;font-weight:700;color:${color};">${r.name}</div>` : ""}
        ${item.quality ? `<div style="font-size:11px;color:var(--text-muted);">${item.quality}</div>` : ""}
        ${item.premium ? `<div style="font-size:11px;color:#FFD700;">⭐ Преміум</div>` : ""}
      </div>
    </div>
    <div style="display:flex;flex-direction:column;gap:6px;font-size:13px;color:var(--text-muted);">
      <div>🎁 Отримано з: <b style="color:var(--text)">${item.fromCaseName || (item.fromCase ? (CASES[item.fromCase]?.name||item.fromCase) : "Невідомо")}</b></div>
      ${item.source === "admin" ? `<div>👤 Видав: <b style="color:var(--text)">${item.givenBy||"admin"}</b></div>` : `<div>🎯 Вибив: <b style="color:var(--text)">${item.obtainedBy||"?"}</b></div>`}
      <div>🕒 Дата: <b style="color:var(--text)">${date}</b></div>
      ${folder ? `<div>📁 Папка: <b style="color:${folder.color}">${folder.name}</b></div>` : ""}
      <div style="font-size:10px;color:var(--text-muted);margin-top:2px;">ID: ${item.id}</div>
    </div>
    <div class="inv2-modal-btns">
      <button class="inv2-btn" onclick="inv2CloseModal();toggleLock('${item.id}')">
        ${_lockedItems.has(item.id)?"🔓 Розблок.":"🔒 Заблок."}
      </button>
      <button class="inv2-btn" onclick="inv2CloseModal();inv2OpenFolderModal('${item.id}')">📁 Папка</button>
      <button class="inv2-btn" onclick="inv2CloseModal()">Закрити</button>
    </div>
  `);
}

// ── ПАПКИ — МОДАЛКИ ────────────────────────────────────────
function inv2OpenModal(html) {
  document.getElementById("inv2-modal-ov")?.remove();
  const ov = document.createElement("div");
  ov.className = "inv2-modal-overlay"; ov.id = "inv2-modal-ov";
  ov.innerHTML = `<div class="inv2-modal">${html}</div>`;
  ov.addEventListener("click", e => { if (e.target === ov) inv2CloseModal(); });
  document.body.appendChild(ov);
}
function inv2CloseModal() { document.getElementById("inv2-modal-ov")?.remove(); }

function inv2OpenCreateFolder() {
  const swatches = FOLDER_COLORS.map((c,i) =>
    `<div class="inv2-color-swatch${i===0?" selected":""}" style="background:${c}" data-color="${c}"
      onclick="inv2SelectColor(this)"></div>`
  ).join("");
  inv2OpenModal(`
    <h3>📁 Нова папка</h3>
    <input type="text" id="inv2-folder-name" placeholder="Назва папки..." maxlength="24">
    <div class="inv2-color-row">${swatches}</div>
    <div class="inv2-modal-btns">
      <button class="inv2-btn" onclick="inv2CloseModal()">Скасувати</button>
      <button class="inv2-btn primary" onclick="inv2CreateFolder()">Створити</button>
    </div>
  `);
  setTimeout(() => document.getElementById("inv2-folder-name")?.focus(), 80);
}

function inv2SelectColor(el) {
  document.querySelectorAll(".inv2-color-swatch").forEach(s => s.classList.remove("selected"));
  el.classList.add("selected");
}

function inv2CreateFolder() {
  const input = document.getElementById("inv2-folder-name");
  const name  = (input?.value||"").trim();
  if (!name) { if(input) input.style.borderColor="#e74c3c"; return; }
  const sel   = document.querySelector(".inv2-color-swatch.selected");
  const color = sel?.dataset.color || FOLDER_COLORS[0];
  invFolders.push({ id: genFolderId(), name, color, itemIds: [] });
  saveFolders(); inv2CloseModal(); renderInventory();
}

function inv2OpenFolderModal(itemId) {
  const item = (gameState.inventory||[]).find(x => x.id === itemId);
  if (!item) return;
  const cur = getFolderOf(itemId);
  const rows = [
    `<div class="inv2-folder-list-item${!cur?" current":""}" onclick="inv2AssignFolder('${itemId}',null)">
      <div class="inv2-folder-dot2" style="background:var(--text-muted)"></div>
      <span>Без папки</span>
      ${!cur?`<span style="margin-left:auto;font-size:11px;color:var(--accent);">✓ поточна</span>`:""}
    </div>`,
    ...invFolders.map(f => {
      const isCur = cur?.id === f.id;
      return `<div class="inv2-folder-list-item${isCur?" current":""}" onclick="inv2AssignFolder('${itemId}','${f.id}')">
        <div class="inv2-folder-dot2" style="background:${f.color}"></div>
        <span>${f.name}</span>
        ${isCur?`<span style="margin-left:auto;font-size:11px;color:var(--accent);">✓ поточна</span>`:""}
        <button style="margin-left:4px;background:none;border:none;color:#e74c3c;cursor:pointer;font-size:12px;padding:0 4px;"
          onclick="event.stopPropagation();inv2DeleteFolder('${f.id}')">🗑</button>
      </div>`;
    })
  ].join("");

  inv2OpenModal(`
    <h3>📁 Вибір папки</h3>
    ${invFolders.length || !cur ? `<div class="inv2-folder-list">${rows}</div>` :
      `<div style="color:var(--text-muted);font-size:13px;text-align:center;padding:12px 0;">Папок ще немає</div>`}
    <div class="inv2-modal-btns" style="margin-top:8px;">
      <button class="inv2-btn" onclick="inv2CloseModal()">Закрити</button>
      <button class="inv2-btn primary" onclick="inv2CloseModal();inv2OpenCreateFolder()">+ Нова папка</button>
    </div>
  `);
}

function inv2AssignFolder(itemId, folderId) {
  invFolders.forEach(f => { f.itemIds = f.itemIds.filter(id => id !== itemId); });
  if (folderId) {
    const f = invFolders.find(f => f.id === folderId);
    if (f) f.itemIds.push(itemId);
  }
  saveFolders(); inv2CloseModal(); renderInventory();
}

function inv2DeleteFolder(folderId) {
  invFolders = invFolders.filter(f => f.id !== folderId);
  if (_invFolder === folderId) _invFolder = null;
  saveFolders(); inv2CloseModal(); renderInventory();
}

// ── РИНОК (realtime) ────────────────────────

let marketListings = [], marketSort = "date", marketSearch = "", marketColFilter = "all";
let _marketView = "listings"; // "listings" | "requests"
let _myRequests = []; // { docId, item, price, buyerId, buyerName, createdAt }

function startMarketSubscription() {
  stopMarketSubscription();
  _unsubMarket = subscribeMarket(listings => {
    marketListings = listings;
    renderMarketGrid();
  });
}

function stopMarketSubscription() {
  if (_unsubMarket)    { _unsubMarket();    _unsubMarket = null; }
  if (_unsubMarketReq) { _unsubMarketReq(); _unsubMarketReq = null; }
}

function stopTradesSubscription() {
  if (_unsubTrades) { _unsubTrades(); _unsubTrades = null; }
}

function stopClanPageSubscription() {
  if (_unsubClan)  { _unsubClan();  _unsubClan  = null; }
  if (_unsubVault) { _unsubVault(); _unsubVault = null; }
}

async function renderMarket() {
  const grid = document.getElementById("market-grid");
  if (!grid) return;
  grid.innerHTML = '<div class="empty-state">⏳ Завантаження...</div>';
  try { marketListings = await getMarketListings(); }
  catch (e) { grid.innerHTML = '<div class="empty-state">❌ Помилка ринку</div>'; return; }
  renderMarketGrid();
}

function renderMarketGrid() {
  const grid = document.getElementById("market-grid");
  if (!grid) return;

  // Оновлюємо колекційні чіпи
  const colRow = document.getElementById("market-col-filter");
  if (colRow) {
    colRow.innerHTML =
      '<button class="mkt-col-chip' + (marketColFilter === "all" ? " active" : "") + '" onclick="setMarketColFilter(\'all\')">🗂 Всі колекції</button>' +
      Object.entries(COLLECTIONS).map(([k, v]) =>
        '<button class="mkt-col-chip' + (marketColFilter === k ? " active" : "") + '" onclick="setMarketColFilter(\'' + k + '\')">' + v.name + '</button>'
      ).join("") +
      '<button class="mkt-col-chip' + (marketColFilter === "none" ? " active" : "") + '" onclick="setMarketColFilter(\'none\')">Без колекції</button>';
  }

  // Оновлюємо лічильники
  const total = marketListings.length;
  const mine  = marketListings.filter(l => l.sellerId === currentUser?.uid).length;
  const cntEl = document.getElementById("mkt-count");
  const mineEl = document.getElementById("mkt-mine-count");
  if (cntEl)  cntEl.textContent  = total;
  if (mineEl) mineEl.textContent = mine;

 if (_marketView === "requests") {
    renderMarketRequests();
    return;
}

// Скидаємо інлайн-стиль, що лишився після вкладки запитів
grid.style.gridTemplateColumns = "";


  // Фільтрація
  let listings = [...marketListings];
  if (marketSearch) {
    const q = marketSearch.toLowerCase();
    listings = listings.filter(l => l.item?.name?.toLowerCase().includes(q));
  }
  if (marketColFilter === "none") {
    listings = listings.filter(l => !l.item?.collection);
  } else if (marketColFilter !== "all") {
    listings = listings.filter(l => l.item?.collection === marketColFilter);
  }

  const ro = ["special","secret","legendary","epic","exceptional","common",""];
  if (marketSort === "date")            listings.sort((a,b) => (b.listedAt?.seconds||0) - (a.listedAt?.seconds||0));
  else if (marketSort === "price_asc")  listings.sort((a,b) => a.price - b.price);
  else if (marketSort === "price_desc") listings.sort((a,b) => b.price - a.price);
  else if (marketSort === "rarity")     listings.sort((a,b) => ro.indexOf(a.item?.rarity) - ro.indexOf(b.item?.rarity));

  if (!listings.length) {
    grid.innerHTML = `
      <div class="mkt-empty">
        <div class="mkt-empty-icon">🌊</div>
        <div class="mkt-empty-text">Нічого не знайдено</div>
        <div class="mkt-empty-sub">Спробуй змінити фільтри</div>
      </div>`;
    return;
  }

  grid.innerHTML = listings.map(l => {
    if (!l.item) return "";
    const r     = l.item.rarity ? RARITIES[l.item.rarity] : null;
    const color = r ? r.color : "#888";
    const mine  = l.sellerId === currentUser?.uid;

    return `
      <div class="mkt-card" style="border-color:${color}22">
        <div class="mkt-card-top-bar" style="background:linear-gradient(90deg,${color},${color}88)"></div>
        ${mine ? '<div class="mkt-mine-badge">Мій лот</div>' : ''}
        <div class="mkt-card-body">
          <div class="mkt-card-img-wrap" style="background:${color}11">
            <img src="${l.item.img||'img/placeholder.png'}" onerror="this.src='img/placeholder.png'" alt="${l.item.name}">
          </div>
          <div class="mkt-card-name">${l.item.name}</div>
          ${r ? `<div class="mkt-card-rar" style="color:${color}">${r.name}</div>` : ''}
             ${l.item.quality ? `<div class="mkt-card-quality">${l.item.quality}</div>` : ''}
          ${l.item.premium ? `<div class="mkt-card-quality" style="color:var(--gold);font-weight:700;">⭐ Преміум</div>` : ''}
          <div class="mkt-card-seller">👤 ${l.sellerName}</div>
          <div class="mkt-card-price">💰 ${l.price}</div>
        </div>
        <div class="mkt-card-footer">
          ${mine
            ? `<button class="mkt-btn-cancel" onclick="cancelListing('${l.docId}')">❌ Зняти лот</button>`
            : `
              <button class="mkt-btn-buy" onclick="buyFromMarketItem('${l.docId}')" ${(gameState.balance??0)<l.price?'disabled':''}>
                ${(gameState.balance??0)<l.price?'❌ Мало нікусів':'🛒 Купити'}
              </button>
              <button class="mkt-btn-request" onclick="sendBuyRequest('${l.docId}')">📨 Запит</button>
            `
          }
        </div>
      </div>`;
  }).join("");
}

function switchMarketTab(tab) {
  _marketView = tab;
  document.getElementById("mkt-tab-listings")?.classList.toggle("active", tab === "listings");
  document.getElementById("mkt-tab-requests")?.classList.toggle("active", tab === "requests");
  if (tab === "requests") {
    _startMarketReqSubscription();
  } else {
    if (_unsubMarketReq) { _unsubMarketReq(); _unsubMarketReq = null; }
    renderMarketGrid();
  }
}

function _startMarketReqSubscription() {
  if (_unsubMarketReq) { _unsubMarketReq(); _unsubMarketReq = null; }
  import("https://www.gstatic.com/firebasejs/10.7.0/firebase-firestore.js").then(({ collection: col, query: q, where, onSnapshot: ons }) => {
    let sentReqs = [], recvReqs = [];
    const renderAll = () => {
      const grid = document.getElementById("market-grid");
      if (!grid || _marketView !== "requests") return;
      const merged = [...sentReqs];
      recvReqs.forEach(r => { if (!merged.find(x => x.id === r.id)) merged.push(r); });
      merged.sort((a, b) => (b.createdAt?.seconds||0) - (a.createdAt?.seconds||0));
      _renderMarketReqList(merged);
    };
    const unsubSent = ons(q(col(db, "marketRequests"), where("buyerId",  "==", currentUser.uid)), snap => {
      sentReqs = snap.docs.map(d => ({ id: d.id, ...d.data(), _role: "buyer" }));
      renderAll();
    });
    const unsubRecv = ons(q(col(db, "marketRequests"), where("sellerId", "==", currentUser.uid)), snap => {
      recvReqs = snap.docs.map(d => ({ id: d.id, ...d.data(), _role: "seller" }));
      renderAll();
    });
    _unsubMarketReq = () => { unsubSent(); unsubRecv(); };
  });
}

async function sendBuyRequest(docId) {
  const l = marketListings.find(x => x.docId === docId);
  if (!l) { showToast("Лот не знайдено!", "error"); return; }
  if (l.sellerId === currentUser?.uid) { showToast("Це твій лот!", "error"); return; }

  openModal(
    '<h2 class="modal-title">📨 Запит на покупку</h2>' +
    '<div style="text-align:center;margin-bottom:16px;">' +
      '<img src="' + (l.item?.img||'img/placeholder.png') + '" onerror="this.src=\'img/placeholder.png\'" style="width:70px;height:70px;object-fit:contain;">' +
      '<div style="font-weight:700;margin-top:8px;">' + (l.item?.name||'') + '</div>' +
      '<div style="color:var(--text-muted);font-size:13px;">Продавець: ' + l.sellerName + '</div>' +
      '<div style="color:var(--gold);font-weight:700;font-size:16px;margin-top:4px;">💰 ' + l.price + '</div>' +
    '</div>' +
    '<label style="color:var(--text-muted);font-size:13px;display:block;margin-bottom:6px;">Твоя ціна пропозиції:</label>' +
    '<input type="number" id="req-price" min="1" value="' + l.price + '" class="form-input" style="width:100%;box-sizing:border-box;margin-bottom:16px;">' +
    '<div style="display:flex;gap:8px;">' +
      '<button class="btn-primary" style="flex:1;" onclick="confirmBuyRequest(\'' + docId + '\')">📨 Надіслати</button>' +
      '<button class="btn-secondary" style="flex:1;" onclick="closeModal()">Скасувати</button>' +
    '</div>'
  );
}

async function confirmBuyRequest(docId) {
  const l = marketListings.find(x => x.docId === docId);
  if (!l) { closeModal(); return; }
  const price = parseInt(document.getElementById("req-price")?.value);
  if (isNaN(price) || price <= 0) { showToast("Введіть коректну суму!", "error"); return; }

  try {
    const { addDoc, collection: col, serverTimestamp: sts } = await import("https://www.gstatic.com/firebasejs/10.7.0/firebase-firestore.js");
    await addDoc(col(db, "marketRequests"), {
      listingDocId: docId,
      sellerId:     l.sellerId,
      sellerName:   l.sellerName,
      buyerId:      currentUser.uid,
      buyerName:    currentUser.username,
      item:         l.item,
      originalPrice: l.price,
      offeredPrice:  price,
      status:       "pending",
      createdAt:    sts(),
    });
    closeModal();
    showToast("📨 Запит надіслано " + l.sellerName + "!", "success");
  } catch (e) {
    showToast("Помилка: " + e.message, "error");
  }
}

async function renderMarketRequests() {
  // Тепер використовується підписка через _startMarketReqSubscription
  // Залишаємо для зворотної сумісності якщо викликається напряму
  _startMarketReqSubscription();
}

function _renderMarketReqList(all) {
  const grid = document.getElementById("market-grid");
  if (!grid) return;
  grid.style.gridTemplateColumns = "1fr";

    // Бейдж
    const pending = all.filter(r => r.status === "pending" && r._role === "seller").length;
    const badge = document.getElementById("mkt-req-badge");
    if (badge) { badge.textContent = pending || ""; badge.style.display = pending ? "inline" : "none"; }

    if (!all.length) {
      grid.innerHTML = `
        <div class="mkt-empty" style="grid-column:1/-1;">
          <div class="mkt-empty-icon">📨</div>
          <div class="mkt-empty-text">Немає запитів</div>
          <div class="mkt-empty-sub">Натисни "📨 Запит" на будь-якому лоті</div>
        </div>`;
      return;
    }

    const statusMap   = { pending:"⏳ Очікує", accepted:"✅ Прийнято", declined:"❌ Відхилено" };
    const statusColor = { pending:"var(--gold)", accepted:"var(--lime)", declined:"var(--coral)" };

    grid.innerHTML = all.map(req => {
      const r     = req.item?.rarity ? RARITIES[req.item.rarity] : null;
      const color = r ? r.color : "#888";
      const sc    = statusColor[req.status] || "#888";
      const isSeller = req._role === "seller";

      return `
        <div class="mkt-req-card" style="border-left:3px solid ${color}">
          <img class="mkt-req-img" src="${req.item?.img||'img/placeholder.png'}" onerror="this.src='img/placeholder.png'">
          <div class="mkt-req-info">
            <div class="mkt-req-name">${req.item?.name||'Предмет'}</div>
            <div class="mkt-req-meta">
              ${isSeller ? '📨 від ' + req.buyerName : '📤 до ' + req.sellerName}
              ${r ? ' · <span style="color:' + color + ';font-weight:700;">' + r.name + '</span>' : ''}
            </div>
            <div class="mkt-req-price">
              💰 ${req.offeredPrice}
              ${req.offeredPrice !== req.originalPrice
                ? '<span style="color:var(--text-muted);font-size:11px;"> (лот: ' + req.originalPrice + ')</span>'
                : ''}
            </div>
            <div style="font-size:12px;color:${sc};font-weight:700;margin-top:4px;">${statusMap[req.status]||req.status}</div>
          </div>
          ${isSeller && req.status === "pending"
            ? `<div class="mkt-req-actions">
                <button class="btn-sm btn-buy"    onclick="acceptBuyRequest('${req.id}','${req.listingDocId}','${req.buyerId}',${req.offeredPrice})">✅ Прийняти</button>
                <button class="btn-sm btn-cancel" onclick="declineBuyRequest('${req.id}')">❌</button>
              </div>`
            : ''
          }
        </div>`;
    }).join("");
}

async function acceptBuyRequest(reqId, listingDocId, buyerId, offeredPrice) {
  try {
    const { doc: d, updateDoc: upd, getDoc: gd, runTransaction: rt, deleteDoc: dd, collection: col, where, getDocs, query: q } = await import("https://www.gstatic.com/firebasejs/10.7.0/firebase-firestore.js");

    const listing = marketListings.find(x => x.docId === listingDocId);
    if (!listing) { showToast("Лот вже не існує!", "error"); return; }

    // Використовуємо buyMarketItem але з offeredPrice через транзакцію вручну
    await runTransaction(db, async (tx) => {
      const listRef  = d(db, "market", listingDocId);
      const listSnap = await tx.get(listRef);
      if (!listSnap.exists()) throw new Error("Лот вже не існує!");

      const liveData = listSnap.data();
      const item     = liveData.item;
      const price    = offeredPrice; // Ціна запиту

      const buyerRef  = d(db, "users", buyerId);
      const buyerSnap = await tx.get(buyerRef);
      if (!buyerSnap.exists()) throw new Error("Покупець не знайдений!");
      const buyerBal = buyerSnap.data().balance ?? 0;
      if (buyerBal < price) throw new Error("У покупця недостатньо нікусів!");

      const sellerRef  = d(db, "users", currentUser.uid);
      const sellerSnap = await tx.get(sellerRef);
      const sellerBal  = sellerSnap.exists() ? (sellerSnap.data().balance||0) : 0;

      const buyerInv = [...(buyerSnap.data().inventory||[])];
      buyerInv.push({ ...item, id: item?.id||('req_'+Date.now().toString(36)), obtainedAt: Date.now() });

      tx.update(sellerRef, { balance: sellerBal + price });
      tx.update(buyerRef,  { balance: buyerBal  - price, inventory: buyerInv });
      tx.delete(listRef);
    });

    // Закрити всі pending запити на цей лот
    const { collection: col2, query: q2, where: w2, getDocs: gds2, deleteDoc: dd2 } = await import("https://www.gstatic.com/firebasejs/10.7.0/firebase-firestore.js");
    const reqsSnap = await gds2(q2(col2(db, "marketRequests"), w2("listingDocId","==",listingDocId)));
    for (const rd of reqsSnap.docs) {
      await upd(rd.ref, { status: rd.id === reqId ? "accepted" : "declined" });
    }

    const snap = await gd(d(db, "users", currentUser.uid));
    if (snap.exists()) { gameState.balance = snap.data().balance; updateBalanceDisplay(); }

    showToast("✅ Запит прийнято, предмет продано!", "success");
    renderMarketRequests();
  } catch (e) {
    showToast("Помилка: " + e.message, "error");
  }
}

async function declineBuyRequest(reqId) {
  try {
    const { doc: d, updateDoc: upd } = await import("https://www.gstatic.com/firebasejs/10.7.0/firebase-firestore.js");
    await upd(d(db, "marketRequests", reqId), { status: "declined" });
    showToast("Запит відхилено", "success");
    renderMarketRequests();
  } catch (e) {
    showToast("Помилка: " + e.message, "error");
  }
}

function setMarketSort(sort) {
  marketSort = sort; renderMarketGrid();
  document.querySelectorAll(".market-sort-btn[data-sort]").forEach(b => b.classList.toggle("active", b.dataset.sort === sort));
}
function setMarketSearch(val) { marketSearch = val; renderMarketGrid(); }
function setMarketColFilter(col) { marketColFilter = col; renderMarketGrid(); }

// ── ПРОДАЖ ─────────────────────────────────

function showSellModal(itemId) {
  const item = gameState.inventory.find(x => x.id === itemId);
  if (!item) return;
  if (_lockedItems.has(item.id)) { showToast("Предмет заблоковано! Розблокуй спочатку.", "error"); return; }
  const r = item.rarity ? RARITIES[item.rarity] : null;
  openModal(
    '<h2 class="modal-title">💰 Виставити на ринок</h2>' +
    '<div style="text-align:center;margin-bottom:16px;">' +
    '<img src="' + (item.img || 'img/placeholder.png') + '" onerror="this.src=\'img/placeholder.png\'" style="width:80px;height:80px;object-fit:contain;">' +
    '<div style="font-weight:700;margin-top:8px;">' + item.name + '</div>' +
    (r ? '<div style="color:' + r.color + '">' + r.name + '</div>' : '') + '</div>' +
    '<label style="color:var(--text-muted);font-size:13px;">Ціна (нікусів):</label>' +
    '<input type="number" id="sell-price" min="1" value="100" style="width:100%;padding:10px;border-radius:8px;border:1px solid var(--border);background:var(--bg-input);color:var(--text);font-size:16px;margin:8px 0 16px;box-sizing:border-box;">' +
    '<div style="display:flex;gap:8px;">' +
    '<button class="btn-primary" style="flex:1;" id="sell-confirm-btn" onclick="confirmSell(\'' + itemId + '\')">✅ Виставити</button>' +
    '<button class="btn-secondary" style="flex:1;" onclick="closeModal()">Скасувати</button></div>'
  );
}

async function confirmSell(itemId) {
  const price = parseInt(document.getElementById('sell-price')?.value);
  if (isNaN(price) || price <= 0) { showToast("Введіть коректну ціну!", "error"); return; }
  const invIdx = gameState.inventory.findIndex(x => x.id === itemId);
  if (invIdx === -1) { showToast("Предмет не знайдено!", "error"); return; }
  const item = gameState.inventory[invIdx];
  if (_lockedItems.has(item.id)) { showToast("Предмет заблоковано!", "error"); return; }
  const btn = document.getElementById("sell-confirm-btn");
  if (btn) { btn.disabled = true; btn.textContent = "Виставляємо..."; }
  try {
    const copy = { ...item };
    gameState.inventory.splice(invIdx, 1);
    await listItemOnMarket(currentUser.uid, currentUser.username, copy, price);
    await saveData();
    closeModal(); showToast("✅ Виставлено на ринок!", "success");
    renderInventory();
  } catch (e) {
    gameState.inventory.splice(invIdx, 0, item);
    showToast("Не вдалося виставити: " + e.message, "error");
    if (btn) { btn.disabled = false; btn.textContent = "✅ Виставити"; }
  }
}

// ── ЗАХИСТ ВІД ДЮП: buyFromMarketItem ──────────────────────────────────────
// Тепер через транзакцію в firebase.js — атомарно перевіряємо існування лоту
async function buyFromMarketItem(docId) {
  const l = marketListings.find(x => x.docId === docId);
  if (!l) { showToast("Лот не знайдено!", "error"); return; }
  if (l.sellerId === currentUser?.uid) { showToast("Не можна купити свій предмет!", "error"); return; }
  if ((gameState.balance ?? 0) < l.price) { showToast("Недостатньо нікусів!", "error"); return; }

  const btn = document.querySelector(`[onclick="buyFromMarketItem('${docId}')"]`);
  if (btn) { btn.disabled = true; btn.textContent = "⏳"; }

  try {
    // buyMarketItem тепер повністю транзакційна — якщо лот зник (зняли/купили) — викине помилку
    const boughtItem = await buyMarketItem(currentUser.uid, gameState, l);

    // Оновлюємо локальний стан тільки після успішної транзакції
    const snap = await getDoc(doc(db, "users", currentUser.uid));
    if (snap.exists()) {
      const data = snap.data();
      gameState.balance   = data.balance;
      gameState.inventory = data.inventory || [];
    }

    updateBalanceDisplay();
    renderInventory();
    showToast("✅ Куплено: " + l.item.name + "!", "success");
  } catch (e) {
    showToast("Помилка: " + e.message, "error");
    if (btn) { btn.disabled = false; btn.textContent = "Купити"; }
  }
}

// ── ЗАХИСТ ВІД ДЮП: cancelListing ──────────────────────────────────────────
// Тепер через транзакцію в firebase.js — атомарно перевіряємо та повертаємо предмет
async function cancelListing(docId) {
  const l = marketListings.find(x => x.docId === docId);
  if (!l || l.sellerId !== currentUser?.uid) {
    showToast("Цей лот не твій!", "error"); return;
  }

  const btn = document.querySelector(`[onclick="cancelListing('${docId}')"]`);
  if (btn) { btn.disabled = true; btn.textContent = "⏳"; }

  try {
    // removeMarketListing тепер транзакційна — атомарно видаляє лот і повертає предмет у профіль
    await removeMarketListing(docId, currentUser.uid);

    // Оновлюємо локальний стан після транзакції
    const snap = await getDoc(doc(db, "users", currentUser.uid));
    if (snap.exists()) {
      gameState.inventory = snap.data().inventory || [];
    }

    renderInventory();
    showToast("Лот знято з ринку, предмет повернуто", "success");
  } catch (e) {
    showToast("Помилка: " + e.message, "error");
    if (btn) { btn.disabled = false; btn.textContent = "❌ Зняти"; }
  }
}

// ── ТРЕЙДИ / ГІФТИ ─────────────────────────

function renderTrades() {
  const list = document.getElementById("trades-list");
  if (!list) return;
  list.innerHTML = '<div class="empty-state">⏳ Завантаження...</div>';

  stopTradesSubscription();


  // Використовуємо вже імпортований onSnapshot з firebase-firestore
  import("https://www.gstatic.com/firebasejs/10.7.0/firebase-firestore.js").then(({ collection: col, query: q, where, onSnapshot: ons, orderBy }) => {
    const uid = currentUser.uid;
    // Слухаємо трейди де я відправник
    let sentData = [], recvData = [];

    const renderAll = () => {
      const merged = [...sentData];
      recvData.forEach(t => { if (!merged.find(x => x.docId === t.docId)) merged.push(t); });
      merged.sort((a, b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0));
      _renderTradesList(merged);
    };

    const unsubSent = ons(q(col(db, "trades"), where("fromUid", "==", uid)), snap => {
      sentData = snap.docs.map(d => ({ docId: d.id, ...d.data() }));
      renderAll();
    });
    const unsubRecv = ons(q(col(db, "trades"), where("toUid", "==", uid)), snap => {
      recvData = snap.docs.map(d => ({ docId: d.id, ...d.data() }));
      renderAll();
    });

    _unsubTrades = () => { unsubSent(); unsubRecv(); };
  }).catch(e => {
    const list = document.getElementById("trades-list");
    if (list) list.innerHTML = '<div class="empty-state">❌ ' + e.message + '</div>';
  });
}

function _renderTradesList(trades) {
  const list = document.getElementById("trades-list");
  if (!list) return;
  if (!trades.length) { list.innerHTML = '<div class="empty-state">🌊 Немає активних трейдів</div>'; return; }
  const statusMap   = { pending:"⏳ Очікує", confirmed:"✅ Підтверджено", cancelled:"❌ Скасовано" };
  const statusColor = { pending:"#f0c040", confirmed:"#5ddb5d", cancelled:"#e74c3c" };
  list.innerHTML = trades.map(trade => {
    const isSender  = trade.fromUid === currentUser.uid;
    const isGift    = trade.type === "gift";
    const offerHtml = (trade.offerItems||[]).map(i => {
      if (i._type === "balance") return '<div class="trade-item">💰<span>' + i._amount + ' нікусів</span></div>';
      return '<div class="trade-item"><img src="' + (i.img||'img/placeholder.png') + '" onerror="this.src=\'img/placeholder.png\'"><span>' + i.name + '</span></div>';
    }).join("");
    const wantHtml = (trade.wantItems||[]).map(i =>
      '<div class="trade-item"><img src="' + (i.img||'img/placeholder.png') + '" onerror="this.src=\'img/placeholder.png\'"><span>' + i.name + '</span></div>'
    ).join("");
    const sc = statusColor[trade.status] || "#888";
    return '<div class="trade-card">' +
      '<div class="trade-header">' +
        '<span>' + (isGift ? "🎁 " : "🔄 ") + (isSender ? "→ " + trade.toUsername : "← " + trade.fromUsername) + '</span>' +
        '<span style="color:' + sc + '">' + (statusMap[trade.status]||trade.status) + '</span>' +
      '</div>' +
      '<div class="trade-items">' +
        '<div><div style="color:var(--text-muted);font-size:12px;margin-bottom:6px;">' + (isSender?"Ти даєш:":"Пропонує:") + '</div>' + offerHtml + '</div>' +
        (!isGift ? '<div style="font-size:24px;align-self:center;">⇄</div>' +
        '<div><div style="color:var(--text-muted);font-size:12px;margin-bottom:6px;">' + (isSender?"Хочеш:":"Ти даєш:") + '</div>' + wantHtml + '</div>' : '') +
      '</div>' +
      (!isSender && trade.status === "pending"
        ? '<div style="display:flex;gap:8px;margin-top:12px;">' +
          '<button class="btn-primary" onclick="doAcceptTrade(\'' + trade.docId + '\')">✅ ' + (isGift?"Прийняти гіфт":"Прийняти") + '</button>' +
          '<button class="btn-secondary" onclick="declineTrade(\'' + trade.docId + '\')">❌ Відхилити</button></div>' : '') +
      (isSender && trade.status === "pending"
        ? '<button class="btn-secondary" style="margin-top:12px;" onclick="cancelTrade(\'' + trade.docId + '\')">Скасувати</button>' : '') +
      '</div>';
  }).join("");
}



let _tradeMySelected   = [];
let _tradeTheirSelected = [];

async function showTradeModal(itemId) {
  _tradeMySelected    = [];
  _tradeTheirSelected = [];

  const startItem = itemId ? (gameState.inventory.find(x => x.id === itemId)) : null;
  if (startItem && !_lockedItems.has(startItem.id)) _tradeMySelected.push(startItem);

  let others = [];
  try { others = (await getAllUsernames()).filter(u => u !== currentUser?.username); } catch (e) {}

  injectTradeModalStyles();
  openModal(
    '<h2 class="modal-title">🔄 Надіслати трейд</h2>' +
    '<label style="color:var(--text-muted);font-size:13px;display:block;margin-bottom:6px;">Кому:</label>' +
    '<select id="trade-target" onchange="tradeLoadTheirInv()" style="width:100%;padding:10px;border-radius:8px;border:1px solid var(--border);background:var(--bg-input);color:var(--text);font-size:14px;box-sizing:border-box;margin-bottom:14px;">' +
      (others.length ? others.map(u => '<option value="' + u + '">' + u + '</option>').join("") : '<option value="">Немає гравців</option>') +
    '</select>' +
    '<div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:16px;">' +
      '<div>' +
        '<div style="font-weight:700;font-size:13px;color:var(--accent);margin-bottom:8px;">📤 Ти даєш:</div>' +
        '<div id="trade-my-basket" class="trade-basket"></div>' +
        '<div style="font-size:12px;color:var(--text-muted);margin:6px 0 4px;">Твій інвентар:</div>' +
        '<div id="trade-my-picker" class="trade-picker-mini"></div>' +
      '</div>' +
      '<div>' +
        '<div style="font-weight:700;font-size:13px;color:var(--accent);margin-bottom:8px;">📥 Ти хочеш:</div>' +
        '<div id="trade-their-basket" class="trade-basket"></div>' +
        '<div style="font-size:12px;color:var(--text-muted);margin:6px 0 4px;">Їхній інвентар:</div>' +
        '<div id="trade-their-picker" class="trade-picker-mini"><div style="color:var(--text-dim);font-size:12px;text-align:center;padding:10px;">Виберіть гравця...</div></div>' +
      '</div>' +
    '</div>' +
    '<div style="display:flex;gap:8px;">' +
      '<button class="btn-primary" style="flex:1;" onclick="sendTradeNew()">📤 Надіслати</button>' +
      '<button class="btn-secondary" style="flex:1;" onclick="closeModal()">Скасувати</button>' +
    '</div>',
    true
  );

  tradeRenderMyPicker();
  tradeRenderMyBasket();
  if (others.length) tradeLoadTheirInv();
}

function tradeRenderMyBasket() {
  const el = document.getElementById("trade-my-basket");
  if (!el) return;
  if (!_tradeMySelected.length) {
    el.innerHTML = '<div class="trade-basket-empty">+ Додай предмети</div>'; return;
  }
  el.innerHTML = _tradeMySelected.map((item, i) => {
    const r = item.rarity ? RARITIES[item.rarity] : null;
    const color = r ? r.color : "#888";
    return '<div class="trade-basket-item" style="border-color:' + color + '" onclick="tradeRemoveMy(' + i + ')">' +
      '<img src="' + (item.img||'img/placeholder.png') + '" onerror="this.src=\'img/placeholder.png\'">' +
      '<div class="trade-basket-name">' + item.name + '</div>' +
      '<div class="trade-basket-remove">✕</div>' +
    '</div>';
  }).join("");
}

function tradeRenderTheirBasket() {
  const el = document.getElementById("trade-their-basket");
  if (!el) return;
  if (!_tradeTheirSelected.length) {
    el.innerHTML = '<div class="trade-basket-empty">+ Додай предмети</div>'; return;
  }
  el.innerHTML = _tradeTheirSelected.map((item, i) => {
    const r = item.rarity ? RARITIES[item.rarity] : null;
    const color = r ? r.color : "#888";
    return '<div class="trade-basket-item" style="border-color:' + color + '" onclick="tradeRemoveTheir(' + i + ')">' +
      '<img src="' + (item.img||'img/placeholder.png') + '" onerror="this.src=\'img/placeholder.png\'">' +
      '<div class="trade-basket-name">' + item.name + '</div>' +
      '<div class="trade-basket-remove">✕</div>' +
    '</div>';
  }).join("");
}

function tradeRenderMyPicker() {
  const el = document.getElementById("trade-my-picker");
  if (!el) return;
  const available = (gameState.inventory || []).filter(i =>
    !_lockedItems.has(i.id) && !_tradeMySelected.find(s => s.id === i.id)
  );
  if (!available.length) { el.innerHTML = '<div style="color:var(--text-dim);font-size:12px;text-align:center;padding:10px;">Немає предметів</div>'; return; }
  el.innerHTML = available.map(item => {
    const r = item.rarity ? RARITIES[item.rarity] : null;
    const color = r ? r.color : "#888";
    return '<div class="trade-pick-row" onclick="tradeAddMy(\'' + item.id + '\')" style="border-left:3px solid ' + color + '">' +
      '<img src="' + (item.img||'img/placeholder.png') + '" onerror="this.src=\'img/placeholder.png\'">' +
      '<div style="flex:1;min-width:0;">' +
        '<div class="trade-pick-name">' + (item.type==="case"?"📦 ":"") + item.name + '</div>' +
        (r ? '<div style="font-size:10px;color:' + color + ';">' + r.name + '</div>' : '') +
      '</div>' +
      '<span style="color:var(--accent);font-size:16px;flex-shrink:0;">+</span>' +
    '</div>';
  }).join("");
}

function tradeRenderTheirPicker(theirInv) {
  const el = document.getElementById("trade-their-picker");
  if (!el) return;
  const available = (theirInv || []).filter(i => !_tradeTheirSelected.find(s => s.id === i.id));
  if (!available.length) { el.innerHTML = '<div style="color:var(--text-dim);font-size:12px;text-align:center;padding:10px;">Інвентар порожній</div>'; return; }
  el.innerHTML = available.map(item => {
    const r = item.rarity ? RARITIES[item.rarity] : null;
    const color = r ? r.color : "#888";
    return '<div class="trade-pick-row" onclick="tradeAddTheir(\'' + item.id + '\')" style="border-left:3px solid ' + color + '">' +
      '<img src="' + (item.img||'img/placeholder.png') + '" onerror="this.src=\'img/placeholder.png\'">' +
      '<div style="flex:1;min-width:0;">' +
        '<div class="trade-pick-name">' + (item.type==="case"?"📦 ":"") + item.name + '</div>' +
        (r ? '<div style="font-size:10px;color:' + color + ';">' + r.name + '</div>' : '') +
      '</div>' +
      '<span style="color:var(--accent);font-size:16px;flex-shrink:0;">+</span>' +
    '</div>';
  }).join("");
}

let _theirInventoryCache = {};

async function tradeLoadTheirInv() {
  const username = document.getElementById("trade-target")?.value;
  if (!username) return;
  const picker = document.getElementById("trade-their-picker");
  if (picker) picker.innerHTML = '<div style="color:var(--text-dim);font-size:12px;text-align:center;padding:10px;">⏳ Завантаження...</div>';
  _tradeTheirSelected = [];
  tradeRenderTheirBasket();
  try {
    if (!_theirInventoryCache[username]) {
      const profile = await getUserProfile(username);
      _theirInventoryCache[username] = profile.inventory || [];
    }
    tradeRenderTheirPicker(_theirInventoryCache[username]);
  } catch(e) {
    if (picker) picker.innerHTML = '<div style="color:#e74c3c;font-size:12px;text-align:center;padding:10px;">Помилка завантаження</div>';
  }
}

function tradeAddMy(itemId) {
  const item = (gameState.inventory || []).find(i => i.id === itemId);
  if (!item || _tradeMySelected.find(s => s.id === itemId)) return;
  _tradeMySelected.push(item);
  tradeRenderMyBasket();
  tradeRenderMyPicker();
}

function tradeRemoveMy(index) {
  _tradeMySelected.splice(index, 1);
  tradeRenderMyBasket();
  tradeRenderMyPicker();
}

function tradeAddTheir(itemId) {
  const username = document.getElementById("trade-target")?.value;
  const inv = _theirInventoryCache[username] || [];
  const item = inv.find(i => i.id === itemId);
  if (!item || _tradeTheirSelected.find(s => s.id === itemId)) return;
  _tradeTheirSelected.push(item);
  tradeRenderTheirBasket();
  tradeRenderTheirPicker(_theirInventoryCache[username]);
}

function tradeRemoveTheir(index) {
  const username = document.getElementById("trade-target")?.value;
  _tradeTheirSelected.splice(index, 1);
  tradeRenderTheirBasket();
  tradeRenderTheirPicker(_theirInventoryCache[username] || []);
}

async function sendTradeNew() {
  const target = document.getElementById("trade-target")?.value;
  if (!target)                    { showToast("Виберіть гравця!", "error"); return; }
  if (!_tradeMySelected.length)   { showToast("Додай що ти даєш!", "error"); return; }
  if (!_tradeTheirSelected.length){ showToast("Додай що ти хочеш!", "error"); return; }
  try {
    await sendTradeRequest(
      currentUser.uid, currentUser.username, target,
      _tradeMySelected.map(i => ({ ...i })),
      _tradeTheirSelected.map(i => ({ ...i })),
      "trade"
    );
    _theirInventoryCache = {};
    closeModal();
    showToast("📤 Трейд надіслано!", "success");
  } catch (e) { showToast(e.message || "Помилка!", "error"); }
}

function injectTradeModalStyles() {
  if (document.getElementById('trade-modal-styles')) return;
  const s = document.createElement('style'); s.id = 'trade-modal-styles';
  s.textContent = `
    .trade-basket {
      min-height: 60px; background: var(--bg-card2); border: 1px dashed var(--border);
      border-radius: 8px; padding: 6px; display: flex; flex-direction: column; gap: 4px; margin-bottom: 4px;
    }
    .trade-basket-empty {
      color: var(--text-dim); font-size: 12px; text-align: center; padding: 12px 4px;
    }
    .trade-basket-item {
      display: flex; align-items: center; gap: 6px; background: var(--bg-card);
      border: 1.5px solid; border-radius: 7px; padding: 5px 7px; cursor: pointer;
      transition: background 0.15s; position: relative;
    }
    .trade-basket-item:hover { background: rgba(192,57,43,0.07); }
    .trade-basket-item img { width: 30px; height: 30px; object-fit: contain; flex-shrink: 0; }
    .trade-basket-name { font-size: 11px; font-weight: 700; color: var(--text); flex: 1; min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
    .trade-basket-remove { font-size: 13px; color: #c0392b; flex-shrink: 0; }
    .trade-picker-mini {
      max-height: 200px; overflow-y: auto; display: flex; flex-direction: column; gap: 4px;
      border: 1px solid var(--border); border-radius: 8px; padding: 4px; background: var(--bg-card2);
    }
    .trade-pick-row {
      display: flex; align-items: center; gap: 7px; padding: 6px 8px;
      background: var(--bg-card); border-radius: 6px; cursor: pointer;
      transition: background 0.15s; border-left: 3px solid transparent;
    }
    .trade-pick-row:hover { background: rgba(212,98,26,0.07); }
    .trade-pick-row img { width: 28px; height: 28px; object-fit: contain; flex-shrink: 0; }
    .trade-pick-name { font-size: 11px; font-weight: 600; color: var(--text); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  `;
  document.head.appendChild(s);
}

async function showGiftModal() {
  let others = [];
  try { others = (await getAllUsernames()).filter(u => u !== currentUser?.username); } catch (e) {}
  const myItems = (gameState.inventory || []).filter(i => !_lockedItems.has(i.id));
  const itemOpts = myItems.map(i => {
    const r = i.rarity ? RARITIES[i.rarity] : null;
    return '<option value="' + i.id + '">' + (i.type==="case"?"📦 ":"🎁 ") + i.name + (r ? " [" + r.name + "]" : "") + '</option>';
  }).join("");
  openModal(
    '<h2 class="modal-title">🎁 Надіслати гіфт</h2>' +
    '<label style="color:var(--text-muted);font-size:13px;display:block;margin-bottom:6px;">Кому:</label>' +
    '<select id="gift-target" style="width:100%;padding:10px;border-radius:8px;border:1px solid var(--border);background:var(--bg-input);color:var(--text);font-size:14px;box-sizing:border-box;margin-bottom:14px;">' +
      (others.length ? others.map(u => '<option value="' + u + '">' + u + '</option>').join("") : '<option value="">Немає гравців</option>') +
    '</select>' +
    '<div style="font-weight:600;margin-bottom:8px;color:var(--accent);">Що відправляєш:</div>' +
    '<div style="display:flex;gap:8px;margin-bottom:12px;">' +
      '<button class="btn-secondary" id="gift-tab-item" onclick="switchGiftTab(\'item\')" style="flex:1;">🎁 Предмет/Кейс</button>' +
      '<button class="btn-secondary" id="gift-tab-balance" onclick="switchGiftTab(\'balance\')" style="flex:1;">💰 Баланс</button>' +
    '</div>' +
    '<div id="gift-item-section">' +
      '<select id="gift-item-id" style="width:100%;padding:10px;border-radius:8px;border:1px solid var(--border);background:var(--bg-input);color:var(--text);font-size:14px;box-sizing:border-box;">' +
        (itemOpts || '<option value="">Немає предметів</option>') +
      '</select>' +
    '</div>' +
    '<div id="gift-balance-section" style="display:none;">' +
      '<input type="number" id="gift-balance-amount" min="1" value="100" placeholder="Кількість нікусів" style="width:100%;padding:10px;border-radius:8px;border:1px solid var(--border);background:var(--bg-input);color:var(--text);font-size:14px;box-sizing:border-box;">' +
      '<div style="color:var(--text-muted);font-size:12px;margin-top:4px;">Твій баланс: ' + (gameState.balance||0) + ' нікусів</div>' +
    '</div>' +
    '<div style="display:flex;gap:8px;margin-top:16px;">' +
      '<button class="btn-primary" style="flex:1;" onclick="sendGift()">🎁 Надіслати</button>' +
      '<button class="btn-secondary" style="flex:1;" onclick="closeModal()">Скасувати</button>' +
    '</div>'
  );
}

function switchGiftTab(tab) {
  document.getElementById("gift-item-section").style.display    = tab === "item"    ? "" : "none";
  document.getElementById("gift-balance-section").style.display = tab === "balance" ? "" : "none";
  document.getElementById("gift-tab-item").classList.toggle("btn-primary", tab === "item");
  document.getElementById("gift-tab-balance").classList.toggle("btn-primary", tab === "balance");
}

async function sendGift() {
  const target = document.getElementById("gift-target")?.value;
  if (!target) { showToast("Виберіть гравця!", "error"); return; }
  const balanceSection = document.getElementById("gift-balance-section");
  const isBalance = balanceSection.style.display !== "none";
  let offerItems = [];
  if (isBalance) {
    const amount = parseInt(document.getElementById("gift-balance-amount")?.value);
    if (isNaN(amount) || amount <= 0) { showToast("Введіть суму!", "error"); return; }
    if (amount > (gameState.balance || 0)) { showToast("Недостатньо нікусів!", "error"); return; }
    offerItems = [{ _type: "balance", _amount: amount, name: amount + " нікусів", img: "" }];
  } else {
    const itemId = document.getElementById("gift-item-id")?.value;
    const item   = gameState.inventory.find(x => x.id === itemId);
    if (!item) { showToast("Предмет не знайдено!", "error"); return; }
    if (_lockedItems.has(item.id)) { showToast("Предмет заблоковано!", "error"); return; }
    offerItems = [{ ...item }];
  }
  try {
    await sendTradeRequest(currentUser.uid, currentUser.username, target, offerItems, [], "gift");
    closeModal(); showToast("🎁 Гіфт надіслано!", "success");
  } catch (e) { showToast(e.message || "Помилка!", "error"); }
}

async function doAcceptTrade(docId) {
  try {
    await acceptTradeAndSwap(docId);
    const snap = await getDoc(doc(db, "users", currentUser.uid));
    if (snap.exists()) {
      const data = snap.data();
      gameState.inventory = data.inventory || [];
      gameState.balance   = data.balance   ?? gameState.balance;
      updateBalanceDisplay();
    }
    await renderTrades(); renderInventory();
    showToast("✅ Виконано!", "success");
  } catch (e) { showToast("Помилка: " + e.message, "error"); }
}

async function declineTrade(docId) {
  try { await updateTradeStatus(docId, "cancelled"); await renderTrades(); showToast("❌ Відхилено", "error"); }
  catch(e) { showToast("Помилка: " + e.message, "error"); }
}
async function cancelTrade(docId) {
  try { await updateTradeStatus(docId, "cancelled"); await renderTrades(); showToast("Скасовано", "success"); }
  catch(e) { showToast("Помилка: " + e.message, "error"); }
}

// ── ПРОФІЛЬ (ПОВНИЙ) ───────────────────────

let profileTab = "inventory";

async function renderProfile(targetUsername) {
  injectProfileStyles();
  const page = document.getElementById("page-profile");
  if (!page) return;

  let profileData = gameState;
  let isOwnProfile = true;
  if (targetUsername && targetUsername !== currentUser?.username) {
    isOwnProfile = false;
    try {
      profileData = await getUserProfile(targetUsername);
    } catch(e) {
      showToast("Помилка завантаження профілю", "error"); return;
    }
  }

  const inv   = profileData.inventory || [];
  const items = inv.filter(i => i.type === "item");
  const cases = inv.filter(i => i.type === "case");
  const level = profileData.level || 1;
  const xp    = profileData.xp || 0;
  const xpNeeded = level * 100;
  const xpPct = Math.min(100, Math.round((xp / xpNeeded) * 100));

  let clanName = "Без клану";
  if (profileData.clan) {
    try { const c = await getClan(profileData.clan); clanName = c ? c.name : "Клан"; } catch(e) {}
  }

  const rarStats = Object.entries(RARITIES).map(([key, r]) => {
    const count = items.filter(i => i.rarity === key).length;
    return { key, r, count };
  });

  const maxRewardLevel = Math.max(level + 5, 10);
  const rewardsHtml = isOwnProfile ? Array.from({ length: maxRewardLevel }, (_, i) => i + 1).map(lvl => {
    const reward = getLevelReward(lvl);
    const claimed = lvl <= level;
    const isCurrent = lvl === level + 1;
    return '<div class="lvl-reward-item' + (claimed ? " lvl-reward-claimed" : "") + (isCurrent ? " lvl-reward-current" : "") + '">' +
      '<div class="lvl-reward-num">' + lvl + '</div>' +
      '<img src="' + reward.img + '" onerror="this.src=\'img/placeholder.png\'" style="width:32px;height:32px;object-fit:contain;">' +
      '<div class="lvl-reward-label">' + (claimed ? "✅" : reward.label) + '</div>' +
    '</div>';
  }).join("") : "";

  page.innerHTML =
    '<div class="page-header">' +
      '<button class="btn-back" onclick="navigate(\'main\')">← Назад</button>' +
      '<h1 class="page-title">' + (isOwnProfile ? "👤 Профіль" : "👤 " + (profileData.username || "Гравець")) + '</h1>' +
    '</div>' +

    '<div class="profile-card" style="margin-bottom:16px;">' +

'<div class="profile-avatar" style="position:relative;display:inline-block;">' +
  '<div id="profile-avatar-img" style="width:72px;height:72px;border-radius:50%;overflow:hidden;background:var(--bg-card2);border:2px solid var(--border);display:flex;align-items:center;justify-content:center;font-size:32px;">' +
    (profileData.avatarUrl
      ? '<img src="' + profileData.avatarUrl + '" style="width:100%;height:100%;object-fit:cover;">'
      : '🌊') +
  '</div>' +
  (isOwnProfile
    ? '<label id="avatar-upload-label" style="position:absolute;bottom:-2px;right:-2px;width:26px;height:26px;border-radius:50%;background:var(--accent);color:#fff;font-size:14px;display:flex;align-items:center;justify-content:center;cursor:pointer;border:2px solid var(--bg-card);z-index:2;" title="Змінити аватарку (100 нікусів)">' +
        '📷<input type="file" accept="image/*" style="display:none;" onchange="handleAvatarUpload(this)">' +
      '</label>'
    : '') +
'</div>' +
'<div class="profile-username">' + (profileData.username || "—") + '</div>' +
      '<div class="profile-badges">' +
        '<span class="badge">Рівень ' + level + '</span>' +
        '<span class="badge">' + clanName + '</span>' +
      '</div>' +
      '<div style="margin-top:14px;">' +
        '<div style="display:flex;justify-content:space-between;font-size:12px;color:var(--text-muted);margin-bottom:4px;">' +
          '<span>⚡ XP: ' + xp + ' / ' + xpNeeded + '</span>' +
          '<span>' + xpPct + '%</span>' +
        '</div>' +
        '<div style="height:8px;background:var(--bg-input);border-radius:4px;overflow:hidden;">' +
          '<div style="height:100%;width:' + xpPct + '%;background:linear-gradient(90deg,var(--accent),var(--gold));border-radius:4px;transition:width 0.5s;"></div>' +
        '</div>' +
      '</div>' +
    '</div>' +

    '<div style="display:grid;grid-template-columns:repeat(3,1fr);gap:10px;margin-bottom:16px;">' +
      statBox(profileData.balance ?? 0, "💰 Нікусів", "var(--gold-light)") +
      statBox(items.length, "🎁 Предметів", "var(--accent)") +
      statBox(cases.length, "📦 Кейсів", "var(--accent)") +
    '</div>' +

    (isOwnProfile && rewardsHtml ? '<div style="background:var(--bg-card);border:1px solid var(--border);border-radius:12px;padding:14px;margin-bottom:16px;">' +
      '<div style="font-weight:700;color:var(--accent);margin-bottom:10px;font-size:14px;">🎁 Нагороди за рівні</div>' +
      '<div style="overflow-x:auto;"><div class="lvl-rewards-strip">' + rewardsHtml + '</div></div>' +
    '</div>' : '') +

    '<div style="display:flex;gap:8px;margin-bottom:14px;flex-wrap:wrap;">' +
      '<button class="filter-btn' + (profileTab==="inventory"?" active":"") + '" onclick="switchProfileTab(\'inventory\')">🎒 Інвентар (' + inv.length + ')</button>' +
      '<button class="filter-btn' + (profileTab==="stats"?" active":"") + '" onclick="switchProfileTab(\'stats\')">📊 Статистика</button>' +
      '<button class="filter-btn' + (profileTab==="medals"?" active":"") + '" onclick="switchProfileTab(\'medals\')">🏅 Медалі</button>' +
    '</div>' +

    '<div id="profile-tab-inventory" style="' + (profileTab==="inventory"?"":"display:none;") + '">' +
      renderProfileInventory(inv) +
    '</div>' +

    '<div id="profile-tab-stats" style="' + (profileTab==="stats"?"":"display:none;") + '">' +
      renderProfileStats(rarStats, items, cases) +
    '</div>' +

    '<div id="profile-tab-medals" style="' + (profileTab==="medals"?"":"display:none;") + '">' +
      renderProfileMedals(inv) +
    '</div>';
}

function renderProfileInventory(inv) {
  if (!inv.length) return '<div class="empty-state">🌊 Інвентар порожній</div>';
  const ro = ["special","secret","legendary","epic","exceptional","common",""];
  const sorted = [...inv].sort((a,b) => ro.indexOf(a.rarity) - ro.indexOf(b.rarity));
  return '<div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(100px,1fr));gap:8px;">' +
    sorted.map(item => {
      const r = item.rarity ? RARITIES[item.rarity] : null;
      const color = r ? r.color : "#888";
      return '<div style="background:var(--bg-card2);border:2px solid ' + color + ';border-radius:10px;padding:8px;text-align:center;">' +
        '<img src="' + (item.img||'img/placeholder.png') + '" onerror="this.src=\'img/placeholder.png\'" style="width:52px;height:52px;object-fit:contain;margin:0 auto;">' +
        '<div style="font-size:11px;font-weight:700;color:var(--text);margin-top:4px;line-height:1.2;">' + item.name + '</div>' +
        (r ? '<div style="font-size:9px;color:' + color + ';font-weight:700;">' + r.name + '</div>' : '') +
        (item.type==="case" ? '<div style="font-size:9px;color:var(--text-muted);">📦 Кейс</div>' : '') +
        (item.premium ? '<div style="font-size:9px;color:#FFD700;">⭐</div>' : '') +
      '</div>';
    }).join("") +
  '</div>';
}

function renderProfileStats(rarStats, items, cases) {
  const totalItems = items.length;
  const totalCases = cases.length;
  const premiumCount = items.filter(i => i.premium).length;
  const collectionsOwned = new Set(items.filter(i=>i.collection).map(i=>i.collection)).size;

  return '<div style="display:flex;flex-direction:column;gap:10px;">' +
    '<div style="background:var(--bg-card);border:1px solid var(--border);border-radius:10px;padding:14px;">' +
      '<div style="font-weight:700;color:var(--accent);margin-bottom:10px;">📦 Загальне</div>' +
      '<div style="display:grid;grid-template-columns:repeat(2,1fr);gap:8px;">' +
        statBox(totalItems, "🎁 Предметів", "var(--accent)") +
        statBox(totalCases, "📦 Кейсів", "var(--accent)") +
        statBox(premiumCount, "⭐ Преміум", "var(--gold-light)") +
        statBox(collectionsOwned, "🗂 Колекцій", "var(--accent)") +
      '</div>' +
    '</div>' +
    '<div style="background:var(--bg-card);border:1px solid var(--border);border-radius:10px;padding:14px;">' +
      '<div style="font-weight:700;color:var(--accent);margin-bottom:10px;">💎 По рідкості</div>' +
      rarStats.map(({ key, r, count }) => {
        const pct = totalItems > 0 ? Math.round((count / totalItems) * 100) : 0;
        return '<div style="margin-bottom:8px;">' +
          '<div style="display:flex;justify-content:space-between;font-size:13px;margin-bottom:3px;">' +
            '<span style="color:' + r.color + ';font-weight:700;">' + r.name + '</span>' +
            '<span style="color:var(--text-muted);">' + count + ' (' + pct + '%)</span>' +
          '</div>' +
          '<div style="height:6px;background:var(--bg-input);border-radius:3px;overflow:hidden;">' +
            '<div style="height:100%;width:' + pct + '%;background:' + r.color + ';border-radius:3px;"></div>' +
          '</div>' +
        '</div>';
      }).join("") +
    '</div>' +
  '</div>';
}

function renderProfileMedals(inv) {
  const medals = inv.filter(i => i.type === "item" && (i.itemId || "").startsWith("medal"));
  if (!medals.length) return '<div class="empty-state">🏅 Медалей поки немає</div>';
  return '<div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(100px,1fr));gap:8px;">' +
    medals.map(m => {
      const r = m.rarity ? RARITIES[m.rarity] : null;
      const color = r ? r.color : "#888";
      return '<div style="background:var(--bg-card2);border:2px solid ' + color + ';border-radius:10px;padding:10px;text-align:center;">' +
        '<img src="' + (m.img||'img/placeholder.png') + '" onerror="this.src=\'img/placeholder.png\'" style="width:52px;height:52px;object-fit:contain;margin:0 auto;">' +
        '<div style="font-size:11px;font-weight:700;color:var(--text);margin-top:4px;">' + m.name + '</div>' +
        (r ? '<div style="font-size:9px;color:' + color + ';">' + r.name + '</div>' : '') +
      '</div>';
    }).join("") +
  '</div>';
}

function switchProfileTab(tab) {
  profileTab = tab;
  ["inventory","stats","medals"].forEach(t => {
    const el = document.getElementById("profile-tab-" + t);
    const btn = document.querySelector('.filter-btn[onclick*="switchProfileTab(\'' + t + '\')"]');
    if (el) el.style.display = t === tab ? "" : "none";
    if (btn) btn.classList.toggle("active", t === tab);
  });
}

function injectProfileStyles() {
  if (document.getElementById('profile-styles')) return;
  const s = document.createElement('style'); s.id = 'profile-styles';
  s.textContent = `
    .lvl-rewards-strip { display:flex;gap:8px;padding:4px 2px;width:max-content; }
    .lvl-reward-item { display:flex;flex-direction:column;align-items:center;gap:3px;padding:8px 6px;border-radius:10px;border:2px solid var(--border);background:var(--bg-card2);min-width:60px;text-align:center;transition:all 0.2s; }
    .lvl-reward-item.lvl-reward-claimed { opacity:0.5;border-color:var(--border); }
    .lvl-reward-item.lvl-reward-current { border-color:var(--accent);box-shadow:0 0 12px var(--accent-glow);background:rgba(224,120,32,0.1); }
    .lvl-reward-num { font-size:11px;font-weight:700;color:var(--text-muted); }
    .lvl-reward-label { font-size:9px;color:var(--text-muted);line-height:1.2; }
  `;
  document.head.appendChild(s);
}

// ── ДРУЗІ ──────────────────────────────────

async function renderFriends() {
  const list    = document.getElementById("friends-list");
  const reqList = document.getElementById("friend-requests-list");
  if (!list) return;

  const requests = gameState.friendRequests || [];
  if (reqList) {
    reqList.innerHTML = requests.length
      ? '<div style="font-weight:700;color:var(--accent);margin-bottom:8px;">📨 Запити (' + requests.length + '):</div>' +
        requests.map(u =>
          '<div class="friend-card">' +
          '<div class="friend-avatar">👤</div>' +
          '<div class="friend-info"><div class="friend-name">' + u + '</div><div class="friend-level">Хоче додати тебе в друзі</div></div>' +
          '<div class="friend-actions">' +
            '<button class="btn-sm btn-buy"    onclick="acceptFriendReq(\'' + u + '\')">✅ Прийняти</button>' +
            '<button class="btn-sm btn-cancel" onclick="declineFriendReq(\'' + u + '\')">❌</button>' +
          '</div></div>'
        ).join("")
      : "";
  }

  const friends = gameState.friends || [];
  if (!friends.length) { list.innerHTML = '<div class="empty-state">🌊 Список друзів порожній</div>'; return; }

  // Показуємо одразу з заглушками
  const renderWithAvatars = (avatarMap) => {
    list.innerHTML = friends.map(u => {
      const avatarUrl = avatarMap[u];
      return '<div class="friend-card">' +
        '<div style="width:38px;height:38px;border-radius:50%;overflow:hidden;background:var(--bg-card2);border:1.5px solid var(--border);display:flex;align-items:center;justify-content:center;font-size:20px;flex-shrink:0;">' +
          (avatarUrl
            ? '<img src="' + avatarUrl + '" style="width:100%;height:100%;object-fit:cover;" onerror="this.parentElement.innerHTML=\'👤\'">'
            : '👤') +
        '</div>' +
        '<div class="friend-info"><div class="friend-name">' + u + '</div></div>' +
        '<div class="friend-actions">' +
          '<button class="btn-sm btn-trade" onclick="viewFriendProfile(\'' + u + '\')">👁 Профіль</button>' +
          '<button class="btn-sm btn-cancel" onclick="removeFriend(\'' + u + '\')">Видалити</button>' +
        '</div></div>';
    }).join("");
  };

  // Одразу рендеримо без аватарок
  renderWithAvatars({});

  // Підвантажуємо аватарки в фоні
  const avatarMap = {};
  await Promise.all(friends.map(async u => {
    try {
      const profile = await getUserProfile(u);
      if (profile?.avatarUrl) avatarMap[u] = profile.avatarUrl;
    } catch(e) {}
  }));
  renderWithAvatars(avatarMap);
}

async function addFriend() {
  const input    = document.getElementById("friend-input");
  const username = input?.value.trim();
  if (!username)                                  { showToast("Введіть нікнейм!", "error"); return; }
  if (username === currentUser?.username)         { showToast("Не можна додати себе!", "error"); return; }
  if ((gameState.friends||[]).includes(username)) { showToast("Вже в друзях!", "error"); return; }
  try {
    await sendFriendRequest(currentUser.uid, currentUser.username, username);
    if (input) input.value = "";
    showToast("📨 Запит надіслано " + username + "!", "success");
  } catch (e) { showToast(e.message || "Помилка!", "error"); }
}

async function acceptFriendReq(fromUsername) {
  try {
    await acceptFriendRequest(currentUser.uid, currentUser.username, fromUsername);
    const snap = await getDoc(doc(db, "users", currentUser.uid));
    if (snap.exists()) { const d = snap.data(); gameState.friends = d.friends||[]; gameState.friendRequests = d.friendRequests||[]; }
    await renderFriends(); renderMain();
    showToast("✅ " + fromUsername + " тепер у друзях!", "success");
  } catch (e) { showToast(e.message, "error"); }
}

async function declineFriendReq(fromUsername) {
  try {
    await declineFriendRequest(currentUser.uid, fromUsername);
    gameState.friendRequests = (gameState.friendRequests||[]).filter(r => r !== fromUsername);
    await renderFriends(); renderMain();
    showToast("Запит відхилено", "success");
  } catch (e) { showToast(e.message, "error"); }
}

async function removeFriend(username) {
  gameState.friends = (gameState.friends||[]).filter(f => f !== username);
  await saveData(); await renderFriends();
  showToast("Видалено з друзів", "success");
}

async function viewFriendProfile(username) {
  showAllPages(false);
  const page = document.getElementById("page-profile");
  if (page) page.style.display = "block";
  profileTab = "inventory";
  await renderProfile(username);
}

function statBox(val, label, color) {
  return '<div style="background:var(--bg-card2);border:1px solid var(--border);border-radius:10px;padding:12px;text-align:center;">' +
    '<div style="font-size:18px;font-weight:700;color:' + color + ';">' + val + '</div>' +
    '<div style="font-size:11px;color:var(--text-muted);">' + label + '</div></div>';
}

// ── КЛАН (Firebase) ────────────────────────

let _clanChatUnsub = null;

let _unsubVault = null;

let _activeClanTab = "members"; // ← додай поруч з іншими let змінними вгорі

function _startClanPageSubscription() {
  stopClanPageSubscription();
  if (!gameState.clan) return;
  import("https://www.gstatic.com/firebasejs/10.7.0/firebase-firestore.js").then(({ doc: d, onSnapshot: ons }) => {
    let _firstSnapshot = true; // ← пропускаємо перший виклик
    _unsubClan = ons(d(db, "clans", gameState.clan), (snap) => {
      if (_firstSnapshot) { _firstSnapshot = false; return; } // ← не рендеримо при підписці
      const clanPage = document.getElementById("page-clan");
      if (!clanPage || clanPage.style.display === "none") {
        stopClanPageSubscription(); return;
      }
      renderClan();
    });
  });
}

async function renderClan() {
  const section = document.getElementById("clan-section");
  if (!section) return;
  section.innerHTML = '<div class="empty-state">⏳ Завантаження...</div>';
  injectClanStyles();
  if (!gameState.clan) {
    section.innerHTML =
      '<div class="empty-state">🌊 Ти не в клані</div>' +
      '<div style="display:flex;gap:10px;margin-top:20px;flex-wrap:wrap;">' +
        '<div style="flex:1;min-width:200px;">' +
          '<input type="text" id="clan-name-input" placeholder="Назва клану..." style="width:100%;padding:10px;border-radius:8px;border:1px solid var(--border);background:var(--bg-input);color:var(--text);font-size:14px;box-sizing:border-box;margin-bottom:8px;">' +
          '<button class="btn-primary" style="width:100%;" onclick="createClan()">⚔️ Створити клан</button>' +
        '</div>' +
        '<div style="flex:1;min-width:200px;">' +
          '<input type="text" id="clan-join-input" placeholder="ID клану..." style="width:100%;padding:10px;border-radius:8px;border:1px solid var(--border);background:var(--bg-input);color:var(--text);font-size:14px;box-sizing:border-box;margin-bottom:8px;">' +
          '<button class="btn-secondary" style="width:100%;" onclick="joinClanRequest()">📨 Надіслати запит</button>' +
        '</div>' +
      '</div>';
    return;
  }

  try {
    const clan = await getClan(gameState.clan);
    if (!clan) {
      section.innerHTML = '<div class="empty-state">❌ Клан не знайдено в БД<br><small>' + gameState.clan + '</small></div><button class="btn-primary" style="margin-top:12px;width:100%;" onclick="navigate(\'clan\')">🔄 Retry</button>';
      return;
    }

if (_activeClanTab !== "members") {
  setTimeout(() => switchClanTab(_activeClanTab), 0);
}

    const isLeader = clan.leader === currentUser?.username;
    const vault    = clan.vault || { balance: 0, inventory: [] };

    section.innerHTML =
      '<div class="clan-header">' +
        '<div class="clan-name">⚔️ ' + clan.name + '</div>' +
        '<div class="clan-id">ID: ' + clan.id + '</div>' +
        '<div class="clan-members">👥 Учасників: ' + (clan.members||[]).length + '</div>' +
      '</div>' +
      '<div style="display:flex;gap:8px;margin-bottom:14px;flex-wrap:wrap;">' +
'<button class="filter-btn active" id="clan-tab-members"  onclick="switchClanTab(\'members\')">👥 Учасники</button>' +
'<button class="filter-btn"        id="clan-tab-vault"    onclick="switchClanTab(\'vault\')">🏦 Общак</button>' +
'<button class="filter-btn"        id="clan-tab-chat"     onclick="switchClanTab(\'chat\')">💬 Чат</button>' +
'<button class="filter-btn"        id="clan-tab-logs"     onclick="switchClanTab(\'logs\')">📋 Дії</button>' +
(isLeader && (clan.joinRequests||[]).length
  ? '<button class="filter-btn" id="clan-tab-requests" onclick="switchClanTab(\'requests\')">📨 Запити (' + clan.joinRequests.length + ')</button>'
  : '') +

      '</div>' +

      '<div id="clan-members-section">' +
        (clan.members||[]).map(m =>
          '<div class="friend-card"><div class="friend-avatar">' + (m===clan.leader?"👑":"👤") + '</div>' +
          '<div class="friend-info"><div class="friend-name">' + m + '</div><div class="friend-level">' + (m===clan.leader?"Лідер":"Учасник") + '</div></div>' +
          (isLeader && m !== currentUser?.username
            ? '<button class="btn-sm btn-cancel" onclick="kickMember(\'' + m + '\')">Виключити</button>' : '') +
          '</div>'
        ).join("") +
        '<button class="btn-secondary" style="margin-top:12px;width:100%;" onclick="leaveClan()">🚪 Покинути клан</button>' +
      '</div>' +

      '<div id="clan-vault-section" style="display:none;">' +
        '<div style="display:flex;justify-content:space-between;align-items:center;padding:14px;background:var(--bg-card2);border:1px solid var(--border);border-radius:10px;margin-bottom:12px;">' +
          '<span>💰 Баланс общаку:</span>' +
          '<span style="font-weight:700;color:var(--gold-light);font-size:18px;">' + (vault.balance||0) + ' нікусів</span>' +
        '</div>' +
        '<div style="display:flex;gap:8px;margin-bottom:14px;">' +
          '<button class="btn-primary" style="flex:1;" onclick="vaultDepositBalance()">+ Поповнити</button>' +
          '<button class="btn-secondary" style="flex:1;" onclick="vaultWithdrawBalance()">- Забрати</button>' +
        '</div>' +
        '<div style="font-weight:600;margin-bottom:8px;">🎒 Предмети в общаку (' + (vault.inventory||[]).length + '):</div>' +
        (vault.inventory && vault.inventory.length
          ? '<div class="inv-grid" style="grid-template-columns:repeat(auto-fill,minmax(130px,1fr));">' +
            vault.inventory.map(item => {
              const r = item.rarity ? RARITIES[item.rarity] : null;
              const color = r ? r.color : "#888";
              return '<div class="inv-card" style="border-color:' + color + '">' +
                '<div class="inv-card-stripe" style="background:' + color + '"></div>' +
                '<img src="' + (item.img||'img/placeholder.png') + '" onerror="this.src=\'img/placeholder.png\'">' +
                '<div class="inv-card-name">' + item.name + '</div>' +
                      (r ? '<div class="inv-card-rarity" style="color:' + color + '">' + r.name + '</div>' : '') +
              (item.premium ? '<div style="font-size:10px;color:var(--gold);font-weight:700;">⭐ Преміум</div>' : '') +
                '<div style="font-size:10px;color:var(--text-dim);">від ' + (item.donatedBy||"—") + '</div>' +
                '<button class="btn-sm btn-buy" onclick="vaultTakeItem(\'' + item.id + '\')">Забрати</button>' +
              '</div>';
            }).join("") +
            '</div>'
          : '<div class="empty-state" style="padding:20px;">Общак порожній</div>') +
        '<div style="margin-top:12px;"><button class="btn-secondary btn-full" onclick="vaultDepositItem()">🎁 Покласти предмет</button></div>' +
      '</div>' +

      '<div id="clan-chat-section" style="display:none;">' +
        renderClanChatHTML() +
      '</div>' +

      (isLeader
        ? '<div id="clan-requests-section" style="display:none;">' +
          ((clan.joinRequests||[]).length
            ? (clan.joinRequests||[]).map(req =>
                '<div class="friend-card">' +
                '<div class="friend-avatar">👤</div>' +
                '<div class="friend-info"><div class="friend-name">' + req.username + '</div><div class="friend-level">Хоче вступити</div></div>' +
                '<div class="friend-actions">' +
                  '<button class="btn-sm btn-buy" onclick="acceptJoinReq(\'' + req.uid + '\',\'' + req.username + '\')">✅</button>' +
                  '<button class="btn-sm btn-cancel" onclick="declineJoinReq(\'' + req.uid + '\')">❌</button>' +
                '</div></div>'
              ).join("")
            : '<div class="empty-state">Немає запитів</div>') +
          '</div>'
        : '') +

      '<div id="clan-logs-section" style="display:none;">' +
        ((clan.logs||[]).length
          ? [...(clan.logs||[])].reverse().map(log => {
              const icons = {
                deposit_balance: "💰+", withdraw_balance: "💰-",
                deposit_item: "🎁+", withdraw_item: "🎁-"
              };
              const date = new Date(log.date).toLocaleString("uk-UA",{hour12:false,day:"2-digit",month:"2-digit",hour:"2-digit",minute:"2-digit"});
              const desc = log.action === "deposit_balance" ? "поклав " + log.amount + " нікусів"
                : log.action === "withdraw_balance" ? "забрав " + log.amount + " нікусів"
                : log.action === "deposit_item" ? "поклав: " + log.itemName
                : "забрав: " + log.itemName;
              return '<div style="display:flex;align-items:center;gap:8px;padding:8px 10px;background:var(--bg-card2);border-radius:8px;margin-bottom:6px;font-size:12px;">' +
                '<span style="font-size:16px;">' + (icons[log.action]||"📋") + '</span>' +
                '<div style="flex:1;">' +
                  '<span style="font-weight:700;color:var(--text);">' + log.username + '</span>' +
                  ' <span style="color:var(--text-muted);">' + desc + '</span>' +
                '</div>' +
                '<span style="color:var(--text-dim);font-size:11px;white-space:nowrap;">' + date + '</span>' +
              '</div>';
            }).join("")
          : '<div style="color:var(--text-muted);font-size:13px;text-align:center;padding:20px;">Дій ще немає</div>') +
      '</div>';

  } catch (e) {

    // ← ПОКАЗУЄМО ПОВНУ ПОМИЛКУ НА ЕКРАНІ
    section.innerHTML =
      '<div style="background:#fee;border:1px solid #f55;border-radius:10px;padding:16px;margin-bottom:12px;">' +
        '<div style="font-weight:700;color:#c00;margin-bottom:8px;">❌ Помилка:</div>' +
        '<div style="font-size:13px;color:#800;margin-bottom:8px;">' + e.message + '</div>' +
        '<div style="font-size:10px;color:#aaa;word-break:break-all;">' + (e.stack||"").slice(0,300) + '</div>' +
      '</div>' +
      '<button class="btn-primary" style="width:100%;" onclick="navigate(\'clan\')">🔄 Спробувати знову</button>';
  }
}

function renderClanChatHTML() {
  return `
    <div class="clan-chat-wrap">
      <div class="clan-chat-messages" id="clan-chat-messages">
        <div style="text-align:center;color:var(--text-muted);font-size:13px;padding:20px;">⏳ Завантаження чату...</div>
      </div>
      <div class="clan-chat-input-row">
        <input type="text" id="clan-chat-input" class="clan-chat-input" placeholder="Повідомлення..." maxlength="200"
          onkeydown="if(event.key==='Enter')sendClanMsg()">
        <button class="clan-chat-send" onclick="sendClanMsg()">➤</button>
      </div>
    </div>
  `;
}

function initClanChat(clanId) {
  if (_clanChatUnsub) { _clanChatUnsub(); _clanChatUnsub = null; }
  _clanChatUnsub = subscribeClanChat(clanId, (messages) => {
    const container = document.getElementById("clan-chat-messages");
    if (!container) { if (_clanChatUnsub) { _clanChatUnsub(); _clanChatUnsub = null; } return; }
    const wasAtBottom = container.scrollHeight - container.scrollTop - container.clientHeight < 60;
    if (!messages.length) {
      container.innerHTML = '<div style="text-align:center;color:var(--text-muted);font-size:13px;padding:20px;">💬 Поки тут тихо...</div>';
      return;
    }
    container.innerHTML = messages.map(msg => {
      const isMe = msg.uid === currentUser?.uid;
      const time = msg.createdAt?.toDate ? msg.createdAt.toDate().toLocaleTimeString("uk-UA",{hour:"2-digit",minute:"2-digit"}) : "";
      return `
        <div class="chat-msg${isMe?" chat-msg-me":""}">
          ${!isMe ? `<div class="chat-msg-author">${msg.username}</div>` : ''}
          <div class="chat-msg-bubble">${escapeHtml(msg.text)}</div>
          ${time ? `<div class="chat-msg-time">${time}</div>` : ''}
        </div>`;
    }).join("");
    if (wasAtBottom) container.scrollTop = container.scrollHeight;
  });
}

function escapeHtml(str) {
  return String(str).replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;");
}

async function sendClanMsg() {
  const input = document.getElementById("clan-chat-input");
  const text  = (input?.value||"").trim();
  if (!text || !gameState.clan) return;
  input.value = "";
  try {
    await sendClanMessage(gameState.clan, currentUser.uid, currentUser.username, text);
  } catch (e) {
    showToast("Помилка надсилання: " + e.message, "error");
  }
}

function switchClanTab(tab) {
  _activeClanTab = tab;
  const tabs = ["members","vault","chat","logs","requests"];
  tabs.forEach(t => {
    const s = document.getElementById("clan-" + t + "-section");
    const b = document.getElementById("clan-tab-" + t);
    if (s) s.style.display = t === tab ? "" : "none";
    if (b) b.classList.toggle("active", t === tab);
  });

  if (tab === "chat") {
    if (gameState.clan) initClanChat(gameState.clan);
  } else {
    if (_clanChatUnsub) { _clanChatUnsub(); _clanChatUnsub = null; }
  }

  if (tab === "vault") {
    _startVaultSubscription();
  } else {
    if (_unsubVault) { _unsubVault(); _unsubVault = null; }
  }
}

function injectClanStyles() {
  if (document.getElementById("clan-chat-styles")) return;
  const s = document.createElement("style");
  s.id = "clan-chat-styles";
  s.textContent = `
    .clan-chat-wrap {
      display: flex;
      flex-direction: column;
      height: 420px;
      background: var(--bg-card);
      border: 1.5px solid var(--border);
      border-radius: var(--radius-lg);
      overflow: hidden;
    }
    .clan-chat-messages {
      flex: 1;
      overflow-y: auto;
      padding: 12px;
      display: flex;
      flex-direction: column;
      gap: 8px;
      scrollbar-width: thin;
      scrollbar-color: rgba(10,180,204,0.25) transparent;
    }
    .clan-chat-input-row {
      display: flex;
      gap: 8px;
      padding: 10px 12px;
      border-top: 1px solid var(--border);
      background: var(--bg-card2);
    }
    .clan-chat-input {
      flex: 1;
      padding: 9px 14px;
      border-radius: var(--radius-md);
      border: 1.5px solid var(--border);
      background: var(--bg-input);
      color: var(--text);
      font-size: 14px;
      transition: border-color 0.2s;
    }
    .clan-chat-input:focus {
      outline: none;
      border-color: var(--teal);
    }
    .clan-chat-send {
      padding: 9px 16px;
      border-radius: var(--radius-md);
      background: linear-gradient(135deg, var(--teal), var(--accent));
      color: #fff;
      font-size: 16px;
      border: none;
      cursor: pointer;
      transition: all 0.2s;
      flex-shrink: 0;
    }
    .clan-chat-send:hover { filter: brightness(1.1); transform: translateY(-1px); }
    .chat-msg {
      display: flex;
      flex-direction: column;
      max-width: 78%;
      align-self: flex-start;
    }
    .chat-msg-me {
      align-self: flex-end;
      align-items: flex-end;
    }
    .chat-msg-author {
      font-size: 11px;
      font-weight: 700;
      color: var(--teal);
      margin-bottom: 3px;
      padding-left: 4px;
    }
    .chat-msg-bubble {
      background: var(--bg-card2);
      border: 1px solid var(--border);
      border-radius: 14px 14px 14px 4px;
      padding: 9px 13px;
      font-size: 14px;
      color: var(--text);
      line-height: 1.4;
      word-break: break-word;
    }
    .chat-msg-me .chat-msg-bubble {
      background: linear-gradient(135deg, rgba(10,180,204,0.18), rgba(240,125,40,0.12));
      border-color: rgba(10,180,204,0.25);
      border-radius: 14px 14px 4px 14px;
    }
    .chat-msg-time {
      font-size: 10px;
      color: var(--text-dim);
      margin-top: 3px;
      padding: 0 4px;
    }
  `;
  document.head.appendChild(s);
}

async function vaultDepositItem() {
  const myItems = (gameState.inventory||[]).filter(i => !_lockedItems.has(i.id));
  if (!myItems.length) { showToast("Немає предметів!", "error"); return; }

  injectVaultDepositStyles();

  const itemsHtml = myItems.map(item => {
    const r = item.rarity ? RARITIES[item.rarity] : null;
    const color = r ? r.color : "#888";
    return '<label class="vd-item-label">' +
      '<input type="checkbox" class="vd-item-cb" value="' + item.id + '" style="accent-color:var(--accent);">' +
      '<div class="vd-item-card" style="border-color:' + color + '">' +
        '<img src="' + (item.img||'img/placeholder.png') + '" onerror="this.src=\'img/placeholder.png\'">' +
        '<div class="vd-item-name">' + (item.type==="case"?"📦 ":"") + item.name + '</div>' +
        (r ? '<div style="font-size:10px;color:' + color + ';font-weight:700;">' + r.name + '</div>' : '') +
      '</div>' +
    '</label>';
  }).join("");

  openModal(
    '<h2 class="modal-title">🎁 Покласти в общак</h2>' +
    '<p style="color:var(--text-muted);font-size:13px;margin-bottom:8px;">Вибери предмети галочками:</p>' +
    '<div style="display:flex;gap:6px;margin-bottom:10px;">' +
      '<button class="btn-secondary" style="font-size:12px;padding:5px 10px;" onclick="vdSelectAll(true)">✅ Всі</button>' +
      '<button class="btn-secondary" style="font-size:12px;padding:5px 10px;" onclick="vdSelectAll(false)">❌ Жодного</button>' +
    '</div>' +
    '<div class="vd-grid" style="max-height:360px;overflow-y:auto;margin-bottom:14px;">' + itemsHtml + '</div>' +
    '<div id="vd-summary" style="color:var(--text-muted);font-size:13px;margin-bottom:12px;">Вибрано: 0</div>' +
    '<div style="display:flex;gap:8px;">' +
      '<button class="btn-primary" style="flex:1;" onclick="doVaultDepositItem()">Покласти</button>' +
      '<button class="btn-secondary" style="flex:1;" onclick="closeModal()">Скасувати</button>' +
    '</div>',
    true
  );

  // Оновлення лічильника
  document.querySelectorAll('.vd-item-cb').forEach(cb => {
    cb.addEventListener('change', () => {
      const count = document.querySelectorAll('.vd-item-cb:checked').length;
      const summary = document.getElementById('vd-summary');
      if (summary) summary.textContent = 'Вибрано: ' + count;
    });
  });
}

function vdSelectAll(checked) {
  document.querySelectorAll('.vd-item-cb').forEach(cb => { cb.checked = checked; });
  const count = checked ? document.querySelectorAll('.vd-item-cb').length : 0;
  const summary = document.getElementById('vd-summary');
  if (summary) summary.textContent = 'Вибрано: ' + count;
}

function injectVaultDepositStyles() {
  if (document.getElementById('vd-styles')) return;
  const s = document.createElement('style'); s.id = 'vd-styles';
  s.textContent = `
    .vd-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(90px, 1fr)); gap: 8px; }
    .vd-item-label { cursor: pointer; display: block; }
    .vd-item-label input { display: none; }
    .vd-item-card {
      border: 2px solid var(--border); border-radius: 10px; padding: 8px 4px;
      text-align: center; background: var(--bg-card2); transition: all 0.15s;
      position: relative;
    }
    .vd-item-label input:checked + .vd-item-card {
      background: rgba(10,180,204,0.12); border-color: var(--teal) !important;
      box-shadow: 0 0 0 2px rgba(10,180,204,0.35);
    }
    .vd-item-label input:checked + .vd-item-card::after {
      content: "✓"; position: absolute; top: 4px; right: 6px;
      color: var(--teal); font-weight: 900; font-size: 13px;
    }
    .vd-item-card img { width: 44px; height: 44px; object-fit: contain; display: block; margin: 0 auto 4px; }
    .vd-item-name { font-size: 10px; font-weight: 700; color: var(--text); line-height: 1.2; }
  `;
  document.head.appendChild(s);
}

async function doVaultDepositItem() {
  const selected = [...document.querySelectorAll('.vd-item-cb:checked')].map(cb => cb.value);
  if (!selected.length) { showToast("Нічого не вибрано!", "error"); return; }

  const btn = document.querySelector('#modal-body .btn-primary');
  if (btn) { btn.disabled = true; btn.textContent = "⏳ Кладемо..."; }

  let successCount = 0;
  for (const itemId of selected) {
    const item = gameState.inventory.find(x => x.id === itemId);
    if (!item) continue;
    try {
      await clanVaultDeposit(gameState.clan, currentUser.uid, currentUser.username, "item", 0, item);
      successCount++;
    } catch (e) {
      showToast("Помилка: " + e.message, "error");
    }
  }

  if (successCount > 0) {
    const snap = await getDoc(doc(db, "users", currentUser.uid));
    if (snap.exists()) { gameState.inventory = snap.data().inventory||[]; renderInventory(); }
    closeModal();
    showToast("✅ Покладено предметів: " + successCount, "success");
  } else {
    if (btn) { btn.disabled = false; btn.textContent = "Покласти"; }
  }
}

function _startVaultSubscription() {
  if (_unsubVault) { _unsubVault(); _unsubVault = null; }
  if (!gameState.clan) return;
  import("https://www.gstatic.com/firebasejs/10.7.0/firebase-firestore.js").then(({ doc: d, onSnapshot: ons }) => {
    _unsubVault = ons(d(db, "clans", gameState.clan), (snap) => {
      if (!snap.exists()) return;
      const clan = snap.data();
      const vaultSection = document.getElementById("clan-vault-section");
      if (!vaultSection || vaultSection.style.display === "none") return;
      _renderVaultSection(clan.vault || { balance: 0, inventory: [] });
    });
  });
}

function _renderVaultSection(vault) {
  const vaultSection = document.getElementById("clan-vault-section");
  if (!vaultSection) return;
  const page = document.getElementById("page-clan");
  const prevScroll = page ? page.scrollTop : 0;
  vaultSection.innerHTML =
    '<div style="display:flex;justify-content:space-between;align-items:center;padding:14px;background:var(--bg-card2);border:1px solid var(--border);border-radius:10px;margin-bottom:12px;">' +
      '<span>💰 Баланс общаку:</span>' +
      '<span style="font-weight:700;color:var(--gold-light);font-size:18px;">' + (vault.balance||0) + ' нікусів</span>' +
    '</div>' +
    '<div style="display:flex;gap:8px;margin-bottom:14px;">' +
      '<button class="btn-primary" style="flex:1;" onclick="vaultDepositBalance()">+ Поповнити</button>' +
      '<button class="btn-secondary" style="flex:1;" onclick="vaultWithdrawBalance()">- Забрати</button>' +
    '</div>' +
    '<div style="display:flex;gap:8px;margin-bottom:10px;">' +
      '<button class="btn-secondary" style="flex:1;" onclick="vaultDepositItem()">🎁 Покласти предмети</button>' +
    '</div>' +
    '<div style="font-weight:600;margin-bottom:8px;">🎒 Предмети в общаку (' + (vault.inventory||[]).length + '):</div>' +
    (vault.inventory && vault.inventory.length
      ? '<div id="vault-items-checklist" class="inv-grid" style="grid-template-columns:repeat(auto-fill,minmax(130px,1fr));margin-bottom:10px;">' +
        vault.inventory.map(item => {
          const r = item.rarity ? RARITIES[item.rarity] : null;
          const color = r ? r.color : "#888";
          return '<label class="vault-item-label" style="cursor:pointer;display:block;">' +
            '<div class="inv-card" style="border-color:' + color + ';position:relative;">' +
              '<input type="checkbox" class="vault-item-cb" value="' + item.id + '" ' +
                'style="position:absolute;top:6px;left:6px;width:16px;height:16px;accent-color:var(--accent);z-index:2;">' +
              '<div class="inv-card-stripe" style="background:' + color + '"></div>' +
              '<img src="' + (item.img||'img/placeholder.png') + '" onerror="this.src=\'img/placeholder.png\'">' +
              '<div class="inv-card-name">' + item.name + '</div>' +
              (r ? '<div class="inv-card-rarity" style="color:' + color + '">' + r.name + '</div>' : '') +
              '<div style="font-size:10px;color:var(--text-dim);">від ' + (item.donatedBy||"—") + '</div>' +
            '</div>' +
          '</label>';
        }).join("") +
        '</div>' +
        '<button class="btn-secondary btn-full" onclick="vaultTakeSelectedItems()" style="margin-bottom:12px;">📤 Забрати вибрані</button>'
      : '<div class="empty-state" style="padding:20px;">Общак порожній</div>');
}

async function refreshVaultSection() {
  // Тепер через realtime — нічого не треба робити вручну
  // Але якщо треба примусово — перезапускаємо підписку
  if (!_unsubVault) _startVaultSubscription();
}

async function createClan() {
  const name = document.getElementById("clan-name-input")?.value.trim();
  if (!name) { showToast("Введіть назву клану!", "error"); return; }
  try {
    const id = await createClanDB(currentUser.uid, currentUser.username, name);
    gameState.clan = id; await renderClan();
    showToast("⚔️ Клан створено!", "success");
  } catch (e) { showToast(e.message, "error"); }
}

async function joinClanRequest() {
  const id = document.getElementById("clan-join-input")?.value.trim();
  if (!id) { showToast("Введіть ID клану!", "error"); return; }
  try {
    await sendClanJoinRequest(currentUser.uid, currentUser.username, id);
    showToast("📨 Запит надіслано лідеру клану!", "success");
  } catch (e) { showToast(e.message, "error"); }
}

async function acceptJoinReq(uid, username) {
  try {
    await acceptClanJoinRequest(gameState.clan, uid, username);
    await renderClan(); showToast("✅ " + username + " прийнято!", "success");
  } catch (e) { showToast(e.message, "error"); }
}

async function declineJoinReq(uid) {
  try {
    await declineClanJoinRequest(gameState.clan, uid);
    await renderClan(); showToast("Запит відхилено", "success");
  } catch (e) { showToast(e.message, "error"); }
}

async function leaveClan() {
  try {
    if (_clanChatUnsub) { _clanChatUnsub(); _clanChatUnsub = null; }
    if (_unsubVault) { _unsubVault(); _unsubVault = null; }
    await leaveClanDB(currentUser.uid, currentUser.username, gameState.clan);
    gameState.clan = null;
    _activeClanTab = "members"; // ← скидаємо вкладку
    await saveData();           // ← зберігаємо що clan = null
    await renderClan();
    showToast("Ти покинув клан", "success");
  } catch (e) { showToast(e.message, "error"); }
}

async function kickMember(username) {
  try {
    const clan = await getClan(gameState.clan);
    if (!clan) return;
    const mUids  = clan.memberUids || [];
    const mNames = clan.members || [];
    const idx    = mNames.indexOf(username);
    const targetUid = mUids[idx];
    if (!targetUid) { showToast("UID не знайдено", "error"); return; }
    await kickFromClanDB(gameState.clan, targetUid, username);
    await renderClan(); showToast("Виключено: " + username, "success");
  } catch (e) { showToast(e.message, "error"); }
}

async function vaultDepositBalance() {
  openModal(
    '<h2 class="modal-title">💰 Поповнити общак</h2>' +
    '<p style="color:var(--text-muted);">Твій баланс: <b>' + (gameState.balance||0) + '</b> нікусів</p>' +
    '<input type="number" id="vault-dep-amt" min="1" value="100" class="form-input" style="width:100%;box-sizing:border-box;margin:12px 0;">' +
    '<div style="display:flex;gap:8px;">' +
      '<button class="btn-primary" style="flex:1;" onclick="doVaultDepositBalance()">Покласти</button>' +
      '<button class="btn-secondary" style="flex:1;" onclick="closeModal()">Скасувати</button>' +
    '</div>'
  );
}

async function doVaultDepositBalance() {
  const amount = parseInt(document.getElementById("vault-dep-amt")?.value);
  if (isNaN(amount) || amount <= 0) { showToast("Введіть суму!", "error"); return; }
  try {
    await clanVaultDeposit(gameState.clan, currentUser.uid, currentUser.username, "balance", amount, null);
    const snap = await getDoc(doc(db, "users", currentUser.uid));
    if (snap.exists()) { gameState.balance = snap.data().balance; updateBalanceDisplay(); }
    closeModal();
    showToast("✅ Поповнено на " + amount + " нікусів!", "success");
    await refreshVaultSection();
  } catch (e) { showToast(e.message, "error"); }
}

async function doVaultWithdrawBalance() {
  const amount = parseInt(document.getElementById("vault-wd-amt")?.value);
  if (isNaN(amount) || amount <= 0) { showToast("Введіть суму!", "error"); return; }
  try {
    await clanVaultWithdraw(gameState.clan, currentUser.uid, "balance", amount, null);
    const snap = await getDoc(doc(db, "users", currentUser.uid));
    if (snap.exists()) { gameState.balance = snap.data().balance; updateBalanceDisplay(); }
    closeModal();
    showToast("✅ Отримано " + amount + " нікусів!", "success");
    await refreshVaultSection();
  } catch (e) { showToast(e.message, "error"); }
}

async function vaultTakeSelectedItems() {
  const selected = [...document.querySelectorAll('.vault-item-cb:checked')].map(cb => cb.value);
  if (!selected.length) { showToast("Вибери предмети галочками!", "error"); return; }

  let successCount = 0;
  for (const itemId of selected) {
    try {
      await clanVaultWithdraw(gameState.clan, currentUser.uid, "item", 0, itemId);
      successCount++;
    } catch (e) {
      showToast("Помилка: " + e.message, "error");
    }
  }

  if (successCount > 0) {
    const snap = await getDoc(doc(db, "users", currentUser.uid));
    if (snap.exists()) { gameState.inventory = snap.data().inventory||[]; renderInventory(); }
    showToast("✅ Отримано предметів: " + successCount, "success");
  }
}

async function vaultTakeItem(itemId) {
  try {
    await clanVaultWithdraw(gameState.clan, currentUser.uid, "item", 0, itemId);
    const snap = await getDoc(doc(db, "users", currentUser.uid));
    if (snap.exists()) { gameState.inventory = snap.data().inventory||[]; renderInventory(); }
    showToast("✅ Предмет отримано!", "success");
  } catch (e) { showToast(e.message, "error"); }
}

async function vaultWithdrawBalance() {
  openModal(
    '<h2 class="modal-title">💸 Забрати з общаку</h2>' +
    '<input type="number" id="vault-wd-amt" min="1" value="100" class="form-input" style="width:100%;box-sizing:border-box;margin:12px 0;">' +
    '<div style="display:flex;gap:8px;">' +
      '<button class="btn-primary" style="flex:1;" onclick="doVaultWithdrawBalance()">Забрати</button>' +
      '<button class="btn-secondary" style="flex:1;" onclick="closeModal()">Скасувати</button>' +
    '</div>'
  );
}


// ── КРАФТ ─────────────────────────────────

let craftSelected = [];

function weightedRandom(arr) {
  if (!arr.length) return null;
  const idx = Math.floor(Math.random() * arr.length);
  return arr[idx];
}

function calcCraftAttributes(items) {
  const qualities   = items.map(i => i.quality).filter(Boolean);
  const collections = items.map(i => i.collection).filter(Boolean);
  const premiums    = items.map(i => !!i.premium);
  const quality = qualities.length ? weightedRandom(qualities) : rollQuality();
  const collection = collections.length ? weightedRandom(collections) : null;
  const premiumCount = premiums.filter(Boolean).length;
  const premium = Math.random() < (premiumCount / items.length);
  return { quality, collection, premium };
}

function renderCraft() {
  const slots  = document.getElementById("craft-slots");
  const btn    = document.getElementById("craft-btn");
  const picker = document.getElementById("craft-picker");
  const info   = document.getElementById("craft-rarity-info");
  if (!slots) return;

  const rarities = [...new Set(craftSelected.map(i => i.rarity).filter(Boolean))];
  const sameRarity = rarities.length === 1;
  const currentRarity = sameRarity ? rarities[0] : null;

  const ro = ["common","exceptional","epic","legendary","secret","special"];
  const nextRarity = currentRarity ? ro[Math.min(ro.indexOf(currentRarity) + 1, ro.length - 1)] : null;
  const nextR = nextRarity ? RARITIES[nextRarity] : null;

  slots.innerHTML =
    craftSelected.map((item, i) => {
      const r = item.rarity ? RARITIES[item.rarity] : null;
      const color = r ? r.color : "#888";
      return '<div class="craft-slot filled" style="border-color:' + color + '" onclick="removeCraftItem(' + i + ')">' +
        '<img src="' + (item.img||'img/placeholder.png') + '" onerror="this.src=\'img/placeholder.png\'">' +
        '<div style="font-size:9px;color:' + color + ';">' + (r?.name||'') + '</div>' +
        '<div style="font-size:9px;color:#aaa;">✕</div></div>';
    }).join("") +
    Array(Math.max(0, 5 - craftSelected.length)).fill('<div class="craft-slot empty">+</div>').join("");

  const canCraft = craftSelected.length === 5 && sameRarity;
  if (btn) btn.disabled = !canCraft;

  if (info) {
    if (craftSelected.length === 0) {
      info.innerHTML = '<div style="color:var(--text-muted);font-size:13px;text-align:center;padding:10px 0;">Вибери 5 предметів <b>однієї рідкості</b> для крафту</div>';
    } else if (craftSelected.length < 5) {
      if (!sameRarity && craftSelected.length > 1) {
        info.innerHTML = '<div style="color:#e74c3c;font-size:13px;text-align:center;padding:8px 0;">⚠️ Всі предмети мають бути <b>однієї рідкості!</b></div>';
      } else {
        info.innerHTML = '<div style="color:var(--text-muted);font-size:13px;text-align:center;padding:8px 0;">Вибрано ' + craftSelected.length + ' / 5</div>';
      }
    } else if (!sameRarity) {
      info.innerHTML = '<div style="color:#e74c3c;font-size:13px;text-align:center;padding:8px 0;">⚠️ Всі 5 предметів мають бути <b>однієї рідкості!</b></div>';
    } else {
      info.innerHTML =
        '<div style="background:var(--bg-card2);border:1px solid var(--border);border-radius:10px;padding:12px;text-align:center;">' +
        '<div style="font-size:12px;color:var(--text-muted);margin-bottom:6px;">Результат (50% шанс):</div>' +
        '<div style="font-size:15px;font-weight:700;color:' + (nextR?.color||'#888') + ';">' + (nextR?.name || nextRarity || '—') + '</div>' +
        '<div style="font-size:11px;color:#e74c3c;margin-top:4px;">⚠️ При невдачі — всі предмети зникають!</div>' +
        '</div>';
    }
  }

  if (picker) {
    const available = (gameState.inventory||[]).filter(i =>
      i.type==="item" && !_lockedItems.has(i.id) && !craftSelected.find(s=>s.id===i.id)
    );
    const filtered = currentRarity && craftSelected.length > 0
      ? available.filter(i => i.rarity === currentRarity)
      : available;

    picker.innerHTML = filtered.length
      ? filtered.map(item => {
          const r   = item.rarity ? RARITIES[item.rarity] : null;
          const col = item.collection ? COLLECTIONS[item.collection]?.name : null;
          const dim = currentRarity && item.rarity !== currentRarity;
          return '<div class="craft-pick-item' + (dim ? ' craft-dim' : '') + '" onclick="' + (dim ? '' : 'addCraftItem(\'' + item.id + '\')') + '">' +
            '<img src="' + (item.img||'img/placeholder.png') + '" onerror="this.src=\'img/placeholder.png\'">' +
            '<span>' + item.name + '</span>' +
            (r ? '<span style="color:' + r.color + ';font-size:11px;">' + r.name + '</span>' : '') +
            (col ? '<span style="color:var(--text-dim);font-size:10px;">' + col + '</span>' : '') +
            '</div>';
        }).join("")
      : '<div class="empty-state">Немає предметів' + (currentRarity ? ' рідкості "' + RARITIES[currentRarity]?.name + '"' : '') + '</div>';
  }
}

function addCraftItem(itemId) {
  if (craftSelected.length >= 5) return;
  const item = (gameState.inventory||[]).find(i => i.id === itemId);
  if (!item) return;
  if (craftSelected.length > 0 && craftSelected[0].rarity !== item.rarity) {
    showToast("Тільки однакова рідкість!", "error"); return;
  }
  craftSelected.push(item); renderCraft();
}
function removeCraftItem(index) { craftSelected.splice(index, 1); renderCraft(); }

async function doCraft() {
  if (craftSelected.length !== 5) return;

  const rarities = [...new Set(craftSelected.map(i => i.rarity).filter(Boolean))];
  if (rarities.length !== 1) { showToast("Всі предмети мають бути однієї рідкості!", "error"); return; }

  const currentRarity = rarities[0];
  const ro = ["common","exceptional","epic","legendary","secret","special"];
  const nextRarity = ro[Math.min(ro.indexOf(currentRarity) + 1, ro.length - 1)];

  const success = Math.random() < 0.5;

  craftSelected.forEach(sel => {
    const i = gameState.inventory.findIndex(x => x.id === sel.id);
    if (i !== -1) gameState.inventory.splice(i, 1);
  });

  if (!success) {
    craftSelected = [];
    await saveData(); renderCraft();
    openModal(
      '<div style="text-align:center;border:2px solid #e74c3c;border-radius:12px;padding:24px;background:rgba(231,76,60,0.1);">' +
      '<div style="font-size:48px;margin-bottom:12px;">💥</div>' +
      '<div style="font-size:20px;font-weight:700;color:#e74c3c;margin-bottom:8px;">Крафт провалився!</div>' +
      '<div style="color:var(--text-muted);font-size:14px;margin-bottom:16px;">Всі 5 предметів зникли...</div>' +
      '<button class="btn-primary" onclick="closeModal()" style="width:100%;">Зрозуміло</button></div>'
    );
    return;
  }

  const { quality, collection, premium } = calcCraftAttributes(craftSelected);

  const colItems = collection
    ? Object.values(CASES).filter(c => COLLECTIONS[collection]?.cases.includes(c.id)).flatMap(c => c.items.filter(i => i.rarity === nextRarity))
    : [];
  const fallback = Object.values(CASES).flatMap(c => c.items.filter(i => i.rarity === nextRarity));
  const pool = colItems.length ? colItems : fallback;
  const picked = pool.length ? pool[Math.floor(Math.random() * pool.length)] : null;

 const newItem = {
  id: generateId(), type: "item",
  itemId: picked ? picked.id : "crafted_" + nextRarity,
  name: picked ? picked.name : "Крафтовий предмет",
  img: picked ? picked.img : "img/items/placeholder.png",
  rarity: nextRarity, collection,
  quality, premium,
  fromCase: "craft",
  fromCaseName: "Крафт",
  source: "craft",
  obtainedBy: currentUser?.username || "?",
  obtainedAt: Date.now(),
};
  gameState.inventory.push(newItem);
  craftSelected = [];
  await saveData(); renderCraft();

  const r = RARITIES[nextRarity];
  openModal(
    '<div style="text-align:center;border:2px solid ' + r.color + ';border-radius:12px;padding:24px;background:' + r.color + '22;">' +
    '<div style="font-size:18px;margin-bottom:8px;">⚗️ Крафт успішний!</div>' +
    '<img src="' + newItem.img + '" style="width:80px;height:80px;object-fit:contain;display:block;margin:12px auto;">' +
    '<div style="font-weight:700;">' + newItem.name + '</div>' +
    '<div style="color:' + r.color + '">' + r.name + '</div>' +
    '<div style="color:#888;font-size:12px;">' + newItem.quality + '</div>' +
    (newItem.premium ? '<div style="color:#FFD700;margin-top:4px;">⭐ ПРЕМІУМ</div>' : '') +
    '<button class="btn-primary" onclick="closeModal()" style="margin-top:16px;width:100%;">Забрати!</button></div>'
  );
}
// ── XP ─────────────────────────────────────

function addXP(amount) {
  gameState.xp = (gameState.xp || 0) + amount;
  const needed = (gameState.level || 1) * 100;
  if (gameState.xp >= needed) {
    gameState.xp   -= needed;
    gameState.level = (gameState.level || 1) + 1;
    const reward = getLevelReward(gameState.level);
    if (!gameState.inventory) gameState.inventory = [];
    gameState.inventory.push({
      id: generateId(), type: reward.type, caseId: reward.caseId,
      name: reward.name, img: reward.img, boughtAt: Date.now()
    });
    showToast("🎉 Рівень " + gameState.level + "! Отримано: " + reward.label, "success");
  }
}

// ── АДМІН ──────────────────────────────────

let _adminAuthed = false, _adminUsers = [];

function openAdmin() {
  if (_adminAuthed) { navigate('admin'); return; }
  openModal(
    '<h2 class="modal-title">🔐 Адмін панель</h2>' +
    '<input type="password" id="admin-pass-input" class="form-input" placeholder="Пароль" style="width:100%;box-sizing:border-box;margin-bottom:16px;" onkeydown="if(event.key===\'Enter\')checkAdminPass()">' +
    '<button class="btn-primary btn-full" onclick="checkAdminPass()">Увійти</button>'
  );
  setTimeout(() => document.getElementById('admin-pass-input')?.focus(), 100);
}

function checkAdminPass() {
  const val = document.getElementById('admin-pass-input')?.value;
  if (val === ADMIN_PASSWORD) { _adminAuthed = true; closeModal(); navigate('admin'); }
  else {
    showToast("❌ Невірний пароль!", "error");
    const inp = document.getElementById('admin-pass-input');
    if (inp) { inp.value = ""; inp.focus(); }
  }
}

async function renderAdmin() {
  const page = document.getElementById('page-admin');
  if (!page) return;
  page.innerHTML = '<div class="page-header"><button class="btn-back" onclick="navigate(\'main\')">← Назад</button><h1 class="page-title">🔐 Адмін</h1></div><div class="empty-state">⏳ Завантаження...</div>';
  injectAdminStyles();
  try {
    const snap = await getDocs(collection(db, "users"));
    _adminUsers = snap.docs.map(d => ({ uid: d.id, ...d.data() }));
  } catch (e) { page.innerHTML += '<div class="empty-state">❌ ' + e.message + '</div>'; return; }
  const usersHtml = _adminUsers.map(u =>
    '<div class="admin-user-row">' +
      '<div class="admin-user-info">' +
        '<span class="admin-username">' + (u.username||u.uid) + '</span>' +
        '<span class="admin-email">' + (u.email||'—') + '</span>' +
        '<span class="admin-stats">Рів.' + (u.level||1) + ' | 💰' + (u.balance||0) + ' | ' + (u.inventory||[]).length + ' пр.' + (u.banned?' | 🚫':'') + '</span>' +
      '</div>' +
      '<div class="admin-user-actions">' +
        '<button class="btn-sm btn-buy"    onclick="adminGiveBalance(\'' + u.uid + '\',false)">💰+</button>' +
        '<button class="btn-sm btn-cancel" onclick="adminGiveBalance(\'' + u.uid + '\',true)">💸-</button>' +
        '<button class="btn-sm btn-open"   onclick="adminGiveItem(\'' + u.uid + '\')">🎁</button>' +
        '<button class="btn-sm btn-open"   onclick="adminGiveCase(\'' + u.uid + '\')">📦</button>' +
        '<button class="btn-sm btn-cancel" onclick="adminRemoveItem(\'' + u.uid + '\')">🗑</button>' +
        '<button class="btn-sm ' + (u.banned?'btn-buy':'btn-cancel') + '" onclick="adminToggleBan(\'' + u.uid + '\',' + !u.banned + ')">' + (u.banned?'✅':'🚫') + '</button>' +
      '</div>' +
    '</div>'
  ).join("");
  page.innerHTML =
    '<div class="page-header"><button class="btn-back" onclick="navigate(\'main\')">← Назад</button><h1 class="page-title">🔐 Адмін панель</h1></div>' +

'<div class="admin-stats-bar"><span>👥 <b>' + _adminUsers.length + '</b></span><span>🚫 <b>' + _adminUsers.filter(u=>u.banned).length + '</b></span>' +
'<button class="btn-secondary" style="font-size:12px;padding:6px 14px;" onclick="adminResetCases()">🔄 Ресет кейсів</button></div>' +
    '<input type="text" class="market-search" placeholder="🔍 Пошук..." oninput="adminFilterUsers(this.value)" style="width:100%;box-sizing:border-box;margin-bottom:16px;">' +
    '<div id="admin-users-list" class="admin-users-list">' + usersHtml + '</div>';
}

function adminFilterUsers(q) {
  document.querySelectorAll('.admin-user-row').forEach(row => {
    row.style.display = row.textContent.toLowerCase().includes(q.toLowerCase()) ? '' : 'none';
  });
}

async function adminGiveBalance(uid, subtract) {
  const u = _adminUsers.find(x => x.uid === uid);
  openModal(
    '<h2 class="modal-title">' + (subtract?'💸 Відняти':'💰 Видати') + ' баланс</h2>' +
    '<p style="color:var(--text-muted);">Гравець: <b>' + (u?.username||uid) + '</b> | Баланс: <b>' + (u?.balance||0) + '</b></p>' +
    '<input type="number" id="admin-bal-amt" class="form-input" value="1000" min="1" style="width:100%;box-sizing:border-box;margin:12px 0;">' +
    '<div style="display:flex;gap:8px;">' +
    '<button class="btn-primary" style="flex:1;" onclick="adminConfirmBalance(\'' + uid + '\',' + subtract + ')">OK</button>' +
    '<button class="btn-secondary" style="flex:1;" onclick="closeModal()">Скасувати</button></div>'
  );
}

async function adminConfirmBalance(uid, subtract) {
  const amount = parseInt(document.getElementById('admin-bal-amt')?.value);
  if (isNaN(amount) || amount <= 0) { showToast("Введіть суму!", "error"); return; }
  try {
    const snap = await getDoc(doc(db, "users", uid));
    const cur  = snap.data()?.balance || 0;
    const newBal = subtract ? Math.max(0, cur - amount) : cur + amount;
    await updateDoc(doc(db, "users", uid), { balance: newBal });
    if (uid === currentUser?.uid) { gameState.balance = newBal; updateBalanceDisplay(); }
    closeModal(); showToast((subtract?"💸 Відраховано ":"✅ Видано ") + amount + " нікусів!", "success");
    await renderAdmin();
  } catch (e) { showToast("Помилка: " + e.message, "error"); }
}

async function adminGiveItem(uid) {
  const u = _adminUsers.find(x => x.uid === uid);

  const allItems = [];
  const seen = new Set();
  Object.values(CASES).forEach(c => {
    c.items.forEach(item => {
      if (!seen.has(item.id)) {
        seen.add(item.id);
        allItems.push({ ...item, _fromCaseId: c.id });
      }
    });
  });
  const ro = ["special","secret","legendary","epic","exceptional","common"];
  allItems.sort((a,b) => ro.indexOf(a.rarity) - ro.indexOf(b.rarity));

  const rarOpts = Object.keys(RARITIES).map(k =>
    '<option value="' + k + '">' + RARITIES[k].name + '</option>'
  ).join("");

  const itemOpts = allItems.map(item => {
    const r = RARITIES[item.rarity];
    return '<option value="' + item.id + '">[' + (r ? r.name : item.rarity) + '] ' + item.name + '</option>';
  }).join("");

  openModal(
    '<h2 class="modal-title">🎁 Видати предмет</h2>' +
    '<p style="color:var(--text-muted);margin-bottom:12px;">Гравець: <b>' + (u?.username||uid) + '</b></p>' +

    '<label style="font-size:12px;font-weight:700;color:var(--text-muted);text-transform:uppercase;letter-spacing:.8px;display:block;margin-bottom:6px;">Предмет з кейсу:</label>' +
    '<select id="admin-item-select" onchange="adminPreviewItem(this)" style="width:100%;padding:10px;border-radius:8px;border:1px solid var(--border);background:var(--bg-input);color:var(--text);font-size:13px;box-sizing:border-box;margin-bottom:12px;">' +
      '<option value="">— Оберіть предмет —</option>' + itemOpts +
    '</select>' +

    '<div id="admin-item-preview" style="display:none;background:var(--bg-card2);border:1.5px solid var(--border);border-radius:10px;padding:12px;margin-bottom:12px;">' +
      '<div style="display:flex;align-items:center;gap:12px;">' +
        '<img id="admin-item-prev-img" src="" onerror="this.src=\'img/items/placeholder.png\'" style="width:52px;height:52px;object-fit:contain;flex-shrink:0;">' +
        '<div><div id="admin-item-prev-name" style="font-weight:700;color:var(--text);"></div>' +
        '<div id="admin-item-prev-rar" style="font-size:12px;font-weight:700;"></div></div>' +
      '</div>' +
    '</div>' +

    '<details style="margin-bottom:14px;">' +
      '<summary style="font-size:12px;font-weight:700;color:var(--text-muted);cursor:pointer;">➕ Або видати кастомний предмет</summary>' +
      '<div style="margin-top:8px;display:flex;flex-direction:column;gap:8px;">' +
        '<input type="text" id="admin-item-custom-name" class="form-input" placeholder="Назва..." style="width:100%;box-sizing:border-box;">' +
        '<select id="admin-item-custom-rarity" style="width:100%;padding:10px;border-radius:8px;border:1px solid var(--border);background:var(--bg-input);color:var(--text);font-size:14px;">' + rarOpts + '</select>' +
      '</div>' +
    '</details>' +

    '<div style="margin-bottom:14px;padding:12px;background:var(--bg-card2);border:1px solid var(--border);border-radius:10px;">' +
      '<div style="font-size:12px;font-weight:700;color:var(--text-muted);margin-bottom:8px;text-transform:uppercase;letter-spacing:.8px;">Характеристики предмету:</div>' +
      '<div style="display:flex;flex-direction:column;gap:8px;">' +
        '<select id="admin-item-quality" style="width:100%;padding:9px;border-radius:8px;border:1px solid var(--border);background:var(--bg-input);color:var(--text);font-size:13px;">' +
          '<option value="">— Якість (авто) —</option>' +
          '<option value="Прямо з цеху">Прямо з цеху</option>' +
          '<option value="Після консервації">Після консервації</option>' +
          '<option value="Після уроку">Після уроку</option>' +
          '<option value="Зношена">Зношена</option>' +
        '</select>' +
        '<label style="display:flex;align-items:center;gap:8px;font-size:13px;font-weight:600;cursor:pointer;">' +
          '<input type="checkbox" id="admin-item-premium" style="width:16px;height:16px;accent-color:var(--gold);">' +
          '<span>⭐ Преміум предмет</span>' +
        '</label>' +
      '</div>' +
    '</div>' +

    '<div style="display:flex;gap:8px;">' +
      '<button class="btn-primary" style="flex:1;" onclick="adminConfirmItem(\'' + uid + '\')">✅ Видати</button>' +
      '<button class="btn-secondary" style="flex:1;" onclick="closeModal()">Скасувати</button>' +
    '</div>'
  );
}

function adminPreviewItem(select) {
  const preview = document.getElementById("admin-item-preview");
  if (!select.value) { if(preview) preview.style.display="none"; return; }
  let found = null;
  Object.values(CASES).forEach(c => { const f = c.items.find(i => i.id === select.value); if(f) found = f; });
  if (!found || !preview) return;
  const r = RARITIES[found.rarity];
  preview.style.display = "block";
  document.getElementById("admin-item-prev-img").src = found.img || "img/items/placeholder.png";
  document.getElementById("admin-item-prev-name").textContent = found.name;
  const rarEl = document.getElementById("admin-item-prev-rar");
  rarEl.textContent = r ? r.name : found.rarity;
  rarEl.style.color = r ? r.color : "#888";
}

async function adminConfirmItem(uid) {
  const selectedId = document.getElementById('admin-item-select')?.value;
  const customName = document.getElementById('admin-item-custom-name')?.value.trim();
    const selectedQuality = document.getElementById('admin-item-quality')?.value || "";
  const selectedPremium = document.getElementById('admin-item-premium')?.checked || false;

  const customRarity = document.getElementById('admin-item-custom-rarity')?.value || "common";

  const u = _adminUsers.find(x => x.uid === uid); // ← ДОДАТИ ЦЕЙ РЯДОК
  let itemToGive;

  if (selectedId) {
    let found = null, fromCaseId = null;
    Object.entries(CASES).forEach(([caseId, c]) => {
      const f = c.items.find(i => i.id === selectedId);
      if (f) { found = f; fromCaseId = caseId; }
    });
    if (!found) { showToast("Предмет не знайдено!", "error"); return; }
    itemToGive = {
      id: generateId(), type: "item", itemId: found.id,
      name: found.name, img: found.img || "img/items/placeholder.png",
      rarity: found.rarity, collection: found.collection || null,
      quality: selectedQuality || rollQuality(),
      premium: selectedPremium,
      fromCase: "admin", fromCaseName: "Адмін видача",
      source: "admin",
      givenBy: currentUser?.username || "admin",
      obtainedBy: u?.username || uid,
      obtainedAt: Date.now(),
    };
  } else {
    const name = customName || "Адмін предмет";
    itemToGive = {
      id: generateId(), type: "item", itemId: "admin_item",
      name, img: "img/items/placeholder.png",
      rarity: customRarity, collection: null,
      quality: selectedQuality || rollQuality(),
      premium: selectedPremium,
      fromCase: "admin", fromCaseName: "Адмін видача",
      source: "admin",
      givenBy: currentUser?.username || "admin",
      obtainedBy: u?.username || uid,
      obtainedAt: Date.now(),
    };
  }

  try {
    const snap = await getDoc(doc(db, "users", uid));
    const inv  = [...(snap.data()?.inventory || [])];
    inv.push(itemToGive);
    await updateDoc(doc(db, "users", uid), { inventory: inv });
    if (uid === currentUser?.uid) { gameState.inventory = inv; renderInventory(); }
    closeModal();
    showToast('✅ "' + itemToGive.name + '" видано!', "success");
    await renderAdmin();
  } catch (e) { showToast("Помилка: " + e.message, "error"); }
}

async function adminGiveCase(uid) {
  const u = _adminUsers.find(x => x.uid === uid);
  const caseOpts = Object.values(CASES).map(c => '<option value="' + c.id + '">' + c.name + '</option>').join("");
  openModal(
    '<h2 class="modal-title">📦 Видати кейс</h2>' +
    '<p style="color:var(--text-muted);">Гравець: <b>' + (u?.username||uid) + '</b></p>' +
    '<select id="admin-case-id" style="width:100%;padding:10px;border-radius:8px;border:1px solid var(--border);background:var(--bg-input);color:var(--text);font-size:14px;margin:12px 0;">' + caseOpts + '</select>' +
    '<div style="display:flex;gap:8px;">' +
    '<button class="btn-primary" style="flex:1;" onclick="adminConfirmCase(\'' + uid + '\')">Видати</button>' +
    '<button class="btn-secondary" style="flex:1;" onclick="closeModal()">Скасувати</button></div>'
  );
}

async function adminConfirmCase(uid) {
  const caseId = document.getElementById('admin-case-id')?.value;
  const c = CASES[caseId];
  if (!c) { showToast("Кейс не знайдено!", "error"); return; }
  const u = _adminUsers.find(x => x.uid === uid);
  try {
    const snap = await getDoc(doc(db, "users", uid));
    const inv  = [...(snap.data()?.inventory || [])];
    inv.push({
      id: generateId(), type: "case", caseId: c.id, name: c.name, img: c.img,
      fromCaseName: c.name, source: "admin",
      givenBy: currentUser?.username || "admin",
      obtainedBy: u?.username || uid,
      obtainedAt: Date.now(), boughtAt: Date.now(),
    });
    await updateDoc(doc(db, "users", uid), { inventory: inv });
    if (uid === currentUser?.uid) { gameState.inventory = inv; renderInventory(); }
    closeModal(); showToast('✅ "' + c.name + '" видано!', "success");
    await renderAdmin();
  } catch (e) { showToast("Помилка: " + e.message, "error"); }
}

   
async function adminResetCases() {
  const caseOpts = Object.values(CASES).map(c =>
    '<div style="display:flex;align-items:center;justify-content:space-between;padding:10px 12px;background:var(--bg-card2);border:1px solid var(--border);border-radius:8px;margin-bottom:6px;">' +
      '<div style="display:flex;align-items:center;gap:10px;">' +
        '<input type="checkbox" class="admin-reset-cb" value="' + c.id + '" checked style="width:16px;height:16px;accent-color:var(--accent);">' +
        '<img src="' + c.img + '" onerror="this.src=\'img/placeholder.png\'" style="width:28px;height:28px;object-fit:contain;">' +
        '<div>' +
          '<div style="font-weight:700;color:var(--text);font-size:13px;">' + c.name + '</div>' +
          '<div style="font-size:11px;color:var(--text-muted);">зараз: ' + c.remaining + ' / ' + c.total + '</div>' +
        '</div>' +
      '</div>' +
      '<input type="number" class="admin-reset-qty" data-caseid="' + c.id + '" value="' + c.total + '" min="0" ' +
        'style="width:75px;padding:5px 8px;border-radius:6px;border:1px solid var(--border);background:var(--bg-input);color:var(--text);font-size:13px;">' +
    '</div>'
  ).join("");

  openModal(
    '<h2 class="modal-title">🔄 Ресет кейсів</h2>' +
    '<p style="color:var(--text-muted);font-size:13px;margin-bottom:12px;">Встанови нову кількість кейсів у магазині для всіх гравців.</p>' +
    '<div style="display:flex;gap:8px;margin-bottom:10px;">' +
      '<button class="btn-secondary" style="font-size:12px;padding:6px 10px;" onclick="document.querySelectorAll(\'.admin-reset-cb\').forEach(c=>c.checked=true)">✅ Всі</button>' +
      '<button class="btn-secondary" style="font-size:12px;padding:6px 10px;" onclick="document.querySelectorAll(\'.admin-reset-cb\').forEach(c=>c.checked=false)">❌ Жодного</button>' +
      '<button class="btn-secondary" style="font-size:12px;padding:6px 10px;" onclick="document.querySelectorAll(\'.admin-reset-qty\').forEach(i=>{if(CASES[i.dataset.caseid])i.value=CASES[i.dataset.caseid].total})">↺ Defaults</button>' +
    '</div>' +
    '<div style="max-height:350px;overflow-y:auto;padding-right:2px;">' + caseOpts + '</div>' +
    '<div style="display:flex;gap:8px;margin-top:14px;">' +
      '<button class="btn-primary" style="flex:1;" onclick="adminConfirmResetCases()">✅ Застосувати</button>' +
      '<button class="btn-secondary" style="flex:1;" onclick="closeModal()">Скасувати</button>' +
    '</div>',
    true
  );
}

async function adminConfirmResetCases() {
  const updates = {};
  let count = 0;
  document.querySelectorAll('.admin-reset-cb:checked').forEach(cb => {
    const caseId = cb.value;
    const qtyInput = document.querySelector('.admin-reset-qty[data-caseid="' + caseId + '"]');
    const qty = parseInt(qtyInput?.value);
    if (!isNaN(qty) && qty >= 0) { updates[caseId] = qty; count++; }
  });
  if (!count) { showToast("Нічого не вибрано!", "error"); return; }
  try {
    await setDoc(doc(db, "globalData", "cases"), updates, { merge: true });
    Object.entries(updates).forEach(([id, qty]) => { if (CASES[id]) CASES[id].remaining = qty; });
    closeModal();
    showToast("✅ Скинуто " + count + " кейс(ів)!", "success");
    renderShop();
  } catch (e) {
    showToast("Помилка: " + e.message, "error");
    console.error("adminConfirmResetCases error:", e);
  }
}

async function adminRemoveItem(uid) {
  try {
    const snap = await getDoc(doc(db, "users", uid));
    const inv  = snap.data()?.inventory || [];
    if (!inv.length) { showToast("Інвентар порожній!", "error"); return; }
    const u    = _adminUsers.find(x => x.uid === uid);
    const opts = inv.map((it, i) =>
      '<option value="' + i + '">' + (it.type==="case"?"📦 ":"🎁 ") + it.name + (it.rarity ? " [" + RARITIES[it.rarity]?.name + "]" : "") + '</option>'
    ).join("");
    openModal(
      '<h2 class="modal-title">🗑 Видалити предмет</h2>' +
      '<p style="color:var(--text-muted);">Гравець: <b>' + (u?.username||uid) + '</b></p>' +
      '<select id="admin-remove-idx" style="width:100%;padding:10px;border-radius:8px;border:1px solid var(--border);background:var(--bg-input);color:var(--text);font-size:14px;margin:12px 0;">' + opts + '</select>' +
      '<div style="display:flex;gap:8px;">' +
      '<button class="btn-cancel" style="flex:1;" onclick="adminConfirmRemove(\'' + uid + '\')">🗑 Видалити</button>' +
      '<button class="btn-secondary" style="flex:1;" onclick="closeModal()">Скасувати</button></div>'
    );
  } catch (e) { showToast("Помилка: " + e.message, "error"); }
}

async function adminConfirmRemove(uid) {
  const idx = parseInt(document.getElementById('admin-remove-idx')?.value);
  try {
    const snap = await getDoc(doc(db, "users", uid));
    const inv  = [...(snap.data()?.inventory || [])];
    if (isNaN(idx) || idx < 0 || idx >= inv.length) { showToast("Невірний індекс!", "error"); return; }
    const removed = inv.splice(idx, 1)[0];
    await updateDoc(doc(db, "users", uid), { inventory: inv });
    if (uid === currentUser?.uid) { gameState.inventory = inv; renderInventory(); }
    closeModal(); showToast('🗑 "' + removed.name + '" видалено!', "success");
    await renderAdmin();
  } catch (e) { showToast("Помилка: " + e.message, "error"); }
}

async function adminToggleBan(uid, ban) {
  if (uid === currentUser?.uid) { showToast("Не можна банити себе!", "error"); return; }
  try {
    await updateDoc(doc(db, "users", uid), { banned: ban });
    showToast((ban?"🚫 ":"✅ ") + (_adminUsers.find(u=>u.uid===uid)?.username||uid), ban?"error":"success");
    await renderAdmin();
  } catch (e) { showToast("Помилка: " + e.message, "error"); }
}

function injectAdminStyles() {
  if (document.getElementById('admin-styles')) return;
  const s = document.createElement('style'); s.id = 'admin-styles';
  s.textContent = `
    .admin-stats-bar{display:flex;gap:24px;padding:12px 16px;background:var(--bg-card);border-radius:10px;margin-bottom:16px;font-size:14px;color:var(--text-muted);}
    .admin-stats-bar b{color:var(--text);}
    .admin-users-list{display:flex;flex-direction:column;gap:10px;}
    .admin-user-row{display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:10px;padding:14px 16px;background:var(--bg-card);border-radius:10px;border:1px solid var(--border);}
    .admin-user-info{display:flex;flex-direction:column;gap:3px;}
    .admin-username{font-weight:700;font-size:15px;color:var(--text);}
    .admin-email{font-size:12px;color:var(--text-muted);}
    .admin-stats{font-size:12px;color:var(--text-muted);}
    .admin-user-actions{display:flex;gap:6px;flex-wrap:wrap;}
  `;
  document.head.appendChild(s);
}

// ── UI ХЕЛПЕРИ ─────────────────────────────

function openModal(html, closable = true) {
  const modal = document.getElementById("modal");
  document.getElementById("modal-body").innerHTML = html;
  modal.style.display = "flex";
  modal.onclick = closable ? (e => { if (e.target === modal) closeModal(); }) : null;
}
function closeModal() { document.getElementById("modal").style.display = "none"; }

function showToast(message, type) {
  const toast = document.getElementById("toast");
  toast.textContent = message;
  toast.className   = "toast show " + (type || "");
  clearTimeout(window._toastT);
  window._toastT = setTimeout(() => { toast.className = "toast"; }, 3500);
}

function generateId() { return Math.random().toString(36).slice(2) + Date.now().toString(36); }

// ── СТИЛІ ─────────────────────────────────

function injectRouletteStyles() {
  if (document.getElementById("roulette-styles")) return;
  const s = document.createElement("style"); s.id = "roulette-styles";
  s.textContent = `
    .roulette-wrap{position:relative;margin:0 auto;max-width:520px;}
    .roulette-arrow{text-align:center;font-size:22px;color:#FFD700;margin-bottom:4px;animation:arrowPulse 0.6s ease-in-out infinite alternate;}
    @keyframes arrowPulse{from{transform:translateY(0)}to{transform:translateY(6px)}}
    .roulette-viewport{width:100%;overflow:hidden;border:2px solid var(--border);border-radius:10px;background:var(--bg-card);position:relative;}
    .roulette-viewport::before,.roulette-viewport::after{content:"";position:absolute;top:0;bottom:0;width:60px;z-index:2;pointer-events:none;}
    .roulette-viewport::before{left:0;background:linear-gradient(to right,var(--bg-card),transparent);}
    .roulette-viewport::after{right:0;background:linear-gradient(to left,var(--bg-card),transparent);}
    .roulette-strip{display:flex;gap:10px;padding:10px;will-change:transform;}
    .roulette-card{flex-shrink:0;border:2px solid #555;border-radius:8px;padding:8px;text-align:center;background:var(--bg-card2);}
    .roulette-card img{width:80px;height:80px;object-fit:contain;display:block;margin:0 auto;}
    .market-controls{display:flex;flex-wrap:wrap;gap:8px;margin-bottom:10px;align-items:center;}
    .market-search{flex:1;min-width:160px;padding:8px 12px;border-radius:8px;border:1px solid var(--border);background:var(--bg-input);color:var(--text);font-size:14px;}
    .market-sort-btn{padding:6px 12px;border-radius:8px;border:1px solid var(--border);background:var(--bg-card);color:var(--text-muted);font-size:13px;cursor:pointer;transition:all 0.15s;}
    .market-sort-btn.active,.market-sort-btn:hover{background:var(--accent);color:#fff;border-color:var(--accent);}
    .market-card{position:relative;overflow:hidden;}
    .market-card-stripe{position:absolute;top:0;left:0;right:0;height:3px;}
    .inv-locked{opacity:0.6;}
    .lock-badge{position:absolute;top:6px;right:6px;font-size:14px;z-index:1;}
    .inv-card{position:relative;}
    .craft-dim{opacity:0.35;pointer-events:none;}
  `;
  document.head.appendChild(s);
}

function injectMarketControls() {
  const page = document.getElementById("page-market");
  if (!page || page.dataset.controlsInjected) return;
  page.dataset.controlsInjected = "true";
  const grid = document.getElementById("market-grid");

  // Hero-смуга ринку
  const hero = document.createElement("div");
  hero.id = "market-hero";
  hero.innerHTML = `
    <div class="mkt-hero-inner">
      <div class="mkt-hero-left">
        <div class="mkt-hero-title">📈 Ринок</div>
        <div class="mkt-hero-sub">Купуй та продавай предмети з гравцями</div>
      </div>
      <div class="mkt-stats-row">
        <div class="mkt-stat-pill" id="mkt-stat-total">
          <span class="mkt-stat-icon">📦</span>
          <div>
            <div class="mkt-stat-val" id="mkt-count">0</div>
            <div class="mkt-stat-label">Лотів</div>
          </div>
        </div>
        <div class="mkt-stat-pill" id="mkt-stat-mine">
          <span class="mkt-stat-icon">👤</span>
          <div>
            <div class="mkt-stat-val" id="mkt-mine-count">0</div>
            <div class="mkt-stat-label">Моїх</div>
          </div>
        </div>
      </div>
    </div>
  `;

  // Таби: Всі лоти / Запити на покупку
  const tabs = document.createElement("div");
  tabs.id = "market-tabs";
  tabs.innerHTML = `
    <div class="mkt-tabs">
      <button class="mkt-tab active" id="mkt-tab-listings" onclick="switchMarketTab('listings')">🛒 Всі лоти</button>
      <button class="mkt-tab" id="mkt-tab-requests" onclick="switchMarketTab('requests')">📨 Запити <span id="mkt-req-badge" style="display:none;background:#f05060;color:#fff;border-radius:50%;padding:0 5px;font-size:11px;margin-left:4px;"></span></button>
    </div>
  `;

  // Фільтри
  const colRow = document.createElement("div");
  colRow.id = "market-col-filter";
  colRow.className = "mkt-filters-row";

  const ctrl = document.createElement("div");
  ctrl.className = "mkt-controls";
  ctrl.innerHTML = `
    <div class="mkt-search-wrap">
      <span class="mkt-search-icon">🔍</span>
      <input type="text" class="mkt-search" placeholder="Пошук предмета..." oninput="setMarketSearch(this.value)">
    </div>
    <div class="mkt-sort-row">
      <button class="mkt-sort-btn active" data-sort="date"       onclick="setMarketSort('date')">🕒 Нові</button>
      <button class="mkt-sort-btn" data-sort="price_asc"  onclick="setMarketSort('price_asc')">💰 Дешевші</button>
      <button class="mkt-sort-btn" data-sort="price_desc" onclick="setMarketSort('price_desc')">💎 Дорожчі</button>
      <button class="mkt-sort-btn" data-sort="rarity"     onclick="setMarketSort('rarity')">⭐ Рідкість</button>
    </div>
  `;

  page.insertBefore(hero, grid);
  page.insertBefore(tabs, grid);
  page.insertBefore(colRow, grid);
  page.insertBefore(ctrl, grid);

  injectMarketStyles();
}

function injectMarketStyles() {
  if (document.getElementById("mkt-styles")) return;
  const s = document.createElement("style");
  s.id = "mkt-styles";
  s.textContent = `
    /* ── Хедер сторінки ринку ── */
    #page-market .page-header { display: none; }
    #page-market .page-desc   { display: none; }

    /* ── Hero ── */
    .mkt-hero-inner {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 12px;
      flex-wrap: wrap;
      padding: 22px 18px 18px;
      background: linear-gradient(135deg,
        rgba(10,180,204,0.14) 0%,
        rgba(240,125,40,0.1) 50%,
        rgba(245,177,0,0.08) 100%
      );
      border: 1.5px solid rgba(255,255,255,0.45);
      border-radius: var(--radius-xl);
      margin-bottom: 14px;
      position: relative;
      overflow: hidden;
    }
    .mkt-hero-inner::before {
      content: '';
      position: absolute;
      inset: 0;
      background-image:
        linear-gradient(rgba(10,180,204,0.06) 1px, transparent 1px),
        linear-gradient(90deg, rgba(10,180,204,0.06) 1px, transparent 1px);
      background-size: 28px 28px;
      pointer-events: none;
    }
    .mkt-hero-title {
      font-family: 'Syne', sans-serif;
      font-size: 24px;
      font-weight: 800;
      color: var(--text);
      letter-spacing: 0.3px;
    }
    .mkt-hero-sub {
      font-size: 13px;
      color: var(--text-muted);
      margin-top: 2px;
    }
    .mkt-stats-row {
      display: flex;
      gap: 10px;
    }
    .mkt-stat-pill {
      display: flex;
      align-items: center;
      gap: 8px;
      background: rgba(255,255,255,0.6);
      border: 1.5px solid var(--glass-border);
      border-radius: var(--radius-md);
      padding: 10px 14px;
      backdrop-filter: blur(8px);
      box-shadow: var(--shadow-sm);
    }
    body.theme-dark .mkt-stat-pill { background: rgba(255,255,255,0.06); }
    .mkt-stat-icon { font-size: 22px; }
    .mkt-stat-val {
      font-family: 'Syne', sans-serif;
      font-size: 18px;
      font-weight: 800;
      background: linear-gradient(135deg, var(--teal), var(--accent));
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
      background-clip: text;
      line-height: 1;
    }
    .mkt-stat-label { font-size: 10px; color: var(--text-muted); font-weight: 600; text-transform: uppercase; }

    /* ── Таби ── */
    .mkt-tabs {
      display: flex;
      gap: 8px;
      margin-bottom: 12px;
    }
    .mkt-tab {
      flex: 1;
      padding: 11px 16px;
      border-radius: var(--radius-md);
      border: 1.5px solid var(--border);
      background: var(--glass);
      backdrop-filter: blur(8px);
      color: var(--text-muted);
      font-size: 14px;
      font-weight: 700;
      cursor: pointer;
      transition: all 0.2s;
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 4px;
    }
    .mkt-tab.active {
      background: linear-gradient(135deg, rgba(10,180,204,0.15), rgba(240,125,40,0.1));
      border-color: var(--teal);
      color: var(--text);
      box-shadow: 0 2px 12px rgba(10,180,204,0.15);
    }
    .mkt-tab:hover:not(.active) {
      border-color: var(--border-hover);
      color: var(--text);
    }

    /* ── Фільтри ── */
    .mkt-filters-row {
      display: flex;
      gap: 6px;
      flex-wrap: nowrap;
      overflow-x: auto;
      scrollbar-width: none;
      padding-bottom: 4px;
      margin-bottom: 8px;
    }
    .mkt-filters-row::-webkit-scrollbar { display: none; }
    .mkt-controls {
      display: flex;
      flex-direction: column;
      gap: 8px;
      margin-bottom: 14px;
    }
    .mkt-search-wrap {
      position: relative;
    }
    .mkt-search-icon {
      position: absolute;
      left: 12px;
      top: 50%;
      transform: translateY(-50%);
      font-size: 15px;
      pointer-events: none;
    }
    .mkt-search {
      width: 100%;
      padding: 10px 14px 10px 38px;
      border-radius: var(--radius-md);
      border: 1.5px solid var(--border);
      background: var(--bg-input);
      color: var(--text);
      font-size: 14px;
      box-sizing: border-box;
      transition: border-color 0.2s, box-shadow 0.2s;
    }
    .mkt-search:focus {
      outline: none;
      border-color: var(--teal);
      box-shadow: 0 0 0 3px var(--teal-glow);
    }
    .mkt-sort-row {
      display: flex;
      gap: 6px;
      flex-wrap: wrap;
    }
    .mkt-sort-btn {
      padding: 6px 13px;
      border-radius: 20px;
      border: 1.5px solid var(--border);
      background: var(--glass);
      backdrop-filter: blur(6px);
      color: var(--text-muted);
      font-size: 12px;
      font-weight: 600;
      cursor: pointer;
      transition: all 0.15s;
      white-space: nowrap;
    }
    .mkt-sort-btn.active, .mkt-sort-btn:hover {
      background: linear-gradient(135deg, var(--teal), var(--accent));
      color: #fff;
      border-color: var(--teal);
      box-shadow: 0 2px 8px rgba(10,180,204,0.25);
    }

    /* ── Колекції ── */
    .mkt-col-chip {
      padding: 5px 13px;
      border-radius: 20px;
      border: 1.5px solid var(--border);
      background: var(--glass);
      color: var(--text-muted);
      font-size: 12px;
      font-weight: 600;
      cursor: pointer;
      transition: all 0.15s;
      white-space: nowrap;
      flex-shrink: 0;
    }
    .mkt-col-chip.active, .mkt-col-chip:hover {
      background: rgba(10,180,204,0.12);
      border-color: var(--teal);
      color: var(--teal-dark);
    }

    /* ── Картка лоту ── */
    .mkt-card {
      background: var(--glass);
      backdrop-filter: blur(14px) saturate(1.3);
      -webkit-backdrop-filter: blur(14px) saturate(1.3);
      border: 2px solid var(--border);
      border-radius: var(--radius-lg);
      padding: 0;
      position: relative;
      overflow: hidden;
      transition: all 0.25s cubic-bezier(0.22, 1, 0.36, 1);
      box-shadow: var(--shadow-sm);
      display: flex;
      flex-direction: column;
    }
    .mkt-card:hover {
      transform: translateY(-5px) scale(1.01);
      box-shadow: var(--shadow-lg);
    }
    .mkt-card-top-bar {
      height: 4px;
      width: 100%;
    }
    .mkt-card-body {
      padding: 12px 10px 10px;
      display: flex;
      flex-direction: column;
      align-items: center;
      flex: 1;
    }
    .mkt-card-img-wrap {
      width: 84px;
      height: 84px;
      display: flex;
      align-items: center;
      justify-content: center;
      border-radius: var(--radius-md);
      margin-bottom: 8px;
      position: relative;
    }
    .mkt-card img {
      width: 72px;
      height: 72px;
      object-fit: contain;
      transition: transform 0.3s cubic-bezier(0.22, 1, 0.36, 1);
      display: block;
    }
    .mkt-card:hover img { transform: scale(1.1) translateY(-3px); }
    .mkt-card-name {
      font-size: 12px;
      font-weight: 700;
      color: var(--text);
      text-align: center;
      margin-bottom: 3px;
      line-height: 1.2;
    }
    .mkt-card-rar {
      font-size: 10px;
      font-weight: 700;
      text-align: center;
      margin-bottom: 2px;
      text-transform: uppercase;
      letter-spacing: 0.4px;
    }
    .mkt-card-quality {
      font-size: 10px;
      color: var(--text-muted);
      text-align: center;
      margin-bottom: 4px;
    }
    .mkt-card-seller {
      font-size: 11px;
      color: var(--text-muted);
      margin-bottom: 6px;
      text-align: center;
    }
    .mkt-card-price {
      font-family: 'Syne', sans-serif;
      font-size: 16px;
      font-weight: 800;
      color: var(--gold);
      margin-bottom: 10px;
      text-align: center;
      filter: drop-shadow(0 1px 4px rgba(245,177,0,0.3));
    }
    .mkt-card-footer {
      padding: 0 10px 12px;
      display: flex;
      flex-direction: column;
      gap: 5px;
    }
    .mkt-btn-buy {
      width: 100%;
      padding: 9px;
      border-radius: var(--radius-sm);
      border: none;
      background: linear-gradient(135deg, var(--teal), var(--accent));
      color: #fff;
      font-size: 13px;
      font-weight: 700;
      cursor: pointer;
      transition: all 0.2s;
      box-shadow: 0 3px 10px rgba(10,180,204,0.3);
    }
    .mkt-btn-buy:hover { filter: brightness(1.08); transform: translateY(-1px); }
    .mkt-btn-buy:disabled { background: linear-gradient(135deg, #c8dce4, #d8e8f0); color: var(--text-dim); cursor: not-allowed; transform: none; box-shadow: none; }
    .mkt-btn-request {
      width: 100%;
      padding: 7px;
      border-radius: var(--radius-sm);
      border: 1.5px solid rgba(10,180,204,0.3);
      background: rgba(10,180,204,0.06);
      color: var(--teal-dark);
      font-size: 12px;
      font-weight: 700;
      cursor: pointer;
      transition: all 0.15s;
    }
    .mkt-btn-request:hover { background: rgba(10,180,204,0.14); border-color: var(--teal); }
    .mkt-btn-cancel {
      width: 100%;
      padding: 9px;
      border-radius: var(--radius-sm);
      border: 1.5px solid rgba(240,80,96,0.3);
      background: rgba(240,80,96,0.07);
      color: var(--coral);
      font-size: 13px;
      font-weight: 700;
      cursor: pointer;
      transition: all 0.15s;
    }
    .mkt-btn-cancel:hover { background: rgba(240,80,96,0.15); }

    /* ── Mine badge ── */
    .mkt-mine-badge {
      position: absolute;
      top: 8px;
      right: 8px;
      background: rgba(10,180,204,0.18);
      border: 1px solid var(--teal);
      color: var(--teal-dark);
      font-size: 9px;
      font-weight: 700;
      padding: 2px 7px;
      border-radius: 20px;
    }

    /* ── Запити вкладка ── */
    .mkt-req-card {
      background: var(--glass);
      backdrop-filter: blur(12px);
      border: 1.5px solid var(--glass-border);
      border-radius: var(--radius-md);
      padding: 16px;
      margin-bottom: 10px;
      display: flex;
      align-items: center;
      gap: 14px;
      transition: all 0.2s;
      box-shadow: var(--shadow-sm);
    }
    .mkt-req-card:hover {
      border-color: rgba(10,180,204,0.3);
      box-shadow: var(--shadow-md);
      transform: translateX(3px);
    }
    .mkt-req-img {
      width: 52px;
      height: 52px;
      object-fit: contain;
      flex-shrink: 0;
    }
    .mkt-req-info { flex: 1; min-width: 0; }
    .mkt-req-name { font-size: 14px; font-weight: 700; color: var(--text); }
    .mkt-req-meta { font-size: 12px; color: var(--text-muted); margin-top: 2px; }
    .mkt-req-price { font-family: 'Syne', sans-serif; font-size: 15px; font-weight: 800; color: var(--gold); margin-top: 4px; }
    .mkt-req-actions { display: flex; flex-direction: column; gap: 6px; flex-shrink: 0; }

    /* ── Сітка ── */
    #market-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(152px, 1fr));
      gap: 12px;
    }
    @media (max-width: 400px) {
      #market-grid { grid-template-columns: repeat(2, 1fr); gap: 8px; }
    }

    /* ── Empty state ── */
    .mkt-empty {
      grid-column: 1 / -1;
      text-align: center;
      padding: 52px 20px;
      color: var(--text-muted);
    }
    .mkt-empty-icon { font-size: 48px; margin-bottom: 12px; opacity: 0.7; }
    .mkt-empty-text { font-size: 15px; font-weight: 600; }
    .mkt-empty-sub  { font-size: 13px; color: var(--text-dim); margin-top: 4px; }
  `;
  document.head.appendChild(s);
}

async function uploadToCloudinary(file) {
  const formData = new FormData();
  formData.append("file", file);
  formData.append("upload_preset", "nikus_photos"); // той самий preset що в НікусДія
  formData.append("public_id", `nkr_${currentUser?.uid || "guest"}_${Date.now()}`);

  const res = await fetch("https://api.cloudinary.com/v1_1/dvzpkxoxv/image/upload", {
    method: "POST",
    body: formData,
  });
  const data = await res.json();
  if (!data.secure_url) throw new Error("Помилка завантаження фото");
  return data.secure_url;
}

async function handleAvatarUpload(input) {
  const file = input.files[0];
  if (!file) return;
  
  const AVATAR_COST = 100;
  if ((gameState.balance ?? 0) < AVATAR_COST) {
    showToast("❌ Потрібно 100 нікусів для зміни аватарки!", "error");
    return;
  }
  
  // Перевірка розміру (макс 5MB)
  if (file.size > 5 * 1024 * 1024) {
    showToast("❌ Файл занадто великий (макс 5MB)!", "error");
    return;
  }

  openModal(
    '<h2 class="modal-title">📷 Змінити аватарку</h2>' +
    '<p style="color:var(--text-muted);text-align:center;margin-bottom:16px;">Завантаження аватарки коштує <b style="color:var(--gold);">100 нікусів</b>.<br>Твій баланс: <b>' + (gameState.balance ?? 0) + '</b></p>' +
    '<div id="avatar-preview-wrap" style="text-align:center;margin-bottom:16px;">' +
      '<div style="width:100px;height:100px;border-radius:50%;overflow:hidden;margin:0 auto;border:3px solid var(--accent);">' +
        '<img id="avatar-local-preview" style="width:100%;height:100%;object-fit:cover;" src="">' +
      '</div>' +
    '</div>' +
    '<div style="display:flex;gap:8px;">' +
      '<button class="btn-primary" style="flex:1;" id="avatar-confirm-btn" onclick="confirmAvatarUpload()">✅ Підтвердити (-100 💰)</button>' +
      '<button class="btn-secondary" style="flex:1;" onclick="closeModal()">Скасувати</button>' +
    '</div>'
  );
  
  // Показуємо превʼю
  const reader = new FileReader();
  reader.onload = e => {
    const img = document.getElementById("avatar-local-preview");
    if (img) img.src = e.target.result;
  };
  reader.readAsDataURL(file);
  
  // Зберігаємо файл тимчасово
  window._pendingAvatarFile = file;
}

async function confirmAvatarUpload() {
  const file = window._pendingAvatarFile;
  if (!file) { closeModal(); return; }
  
  const AVATAR_COST = 100;
  if ((gameState.balance ?? 0) < AVATAR_COST) {
    showToast("❌ Недостатньо нікусів!", "error"); return;
  }

  const btn = document.getElementById("avatar-confirm-btn");
  if (btn) { btn.disabled = true; btn.textContent = "⏳ Завантаження..."; }

  try {
    const url = await uploadToCloudinary(file);
    
    gameState.balance -= AVATAR_COST;
    gameState.avatarUrl = url;
    
    await updateDoc(doc(db, "users", currentUser.uid), {
      balance: gameState.balance,
      avatarUrl: url,
    });
    
    currentUser.avatarUrl = url;
    window._pendingAvatarFile = null;
    
    updateBalanceDisplay();
    renderMain();
    closeModal();
    showToast("✅ Аватарку оновлено!", "success");
    await renderProfile();
  } catch (e) {
    showToast("❌ Помилка: " + e.message, "error");
    if (btn) { btn.disabled = false; btn.textContent = "✅ Підтвердити (-100 💰)"; }
  }
}

// ── ТЕМА ───────────────────────────────────

function initTheme() {
  const saved = localStorage.getItem("nkr_theme") || "light";
  applyTheme(saved);
  injectThemeButton();
}

function applyTheme(theme) {
  document.body.classList.toggle("theme-dark", theme === "dark");
  document.body.classList.toggle("theme-summer", theme === "summer");
  localStorage.setItem("nkr_theme", theme);
const icons = { light: "☀️", dark: "🌙", summer: "🌅" };
  const icon = icons[theme] || "🌙";
  const btn  = document.getElementById("theme-toggle-btn");
  const btnM = document.getElementById("theme-toggle-btn-mobile");
  if (btn)  btn.textContent  = icon;
  if (btnM) btnM.textContent = icon;
}

function toggleTheme() {
  const themes = ["light", "dark", "summer"];
  const current = localStorage.getItem("nkr_theme") || "light";
  const next = themes[(themes.indexOf(current) + 1) % themes.length];
  applyTheme(next);
}

function injectThemeButton() {
  const navLinks = document.querySelector(".nav-links");
  if (!navLinks || document.getElementById("theme-toggle-btn")) return;
  const btn = document.createElement("button");
  btn.className = "nav-item";
  btn.id = "theme-toggle-btn";
  btn.title = "Змінити тему (Осінь / Темна / Літо)";
  btn.textContent = document.body.classList.contains("theme-dark") ? "☀️" : document.body.classList.contains("theme-summer") ? "🌊" : "🌙";
  btn.onclick = toggleTheme;
  navLinks.appendChild(btn);
}

let _unsubGlobalCases = null;

window.addEventListener('DOMContentLoaded', () => {
  injectRouletteStyles();
  initTheme();
 onAuthStateChanged(auth, async (firebaseUser) => {
  if (firebaseUser) {
    await initGlobalCases();
    if (_unsubGlobalCases) _unsubGlobalCases();
    _unsubGlobalCases = subscribeGlobalCases();

    _unsubProfile = onSnapshot(doc(db, "users", firebaseUser.uid), (snap) => {
      if (!snap.exists()) return;
      const data = snap.data();
      if (data.banned) { alert("Акаунт заблоковано!"); logout(); return; }
      if (_isSaving) return;
      currentUser = { uid: firebaseUser.uid, ...data };
      gameState   = { ...currentUser };
      setNavVisible(true);
      updateBalanceDisplay();

      // Завантажуємо назву клану
      if (gameState.clan) {
        getClan(gameState.clan).then(c => {
          if (c) { gameState._clanName = c.name; renderMain(); }
        }).catch(() => {});
      }

      renderMain();
      const friendsPage = document.getElementById('page-friends');
      if (friendsPage && friendsPage.style.display !== 'none') renderFriends();
      const loginPage    = document.getElementById('page-login');
      const registerPage = document.getElementById('page-register');
      const onAuthPage   = (loginPage?.style.display || 'block') !== 'none'
                        || (registerPage?.style.display || 'none') !== 'none';
      if (onAuthPage) { navigate("main"); }
    });
  } else {
    if (_unsubProfile) { _unsubProfile(); _unsubProfile = null; }
    if (_unsubGlobalCases) { _unsubGlobalCases(); _unsubGlobalCases = null; }
    stopMarketSubscription();
    currentUser = null; gameState = {}; _adminAuthed = false;
    setNavVisible(false); showAllPages(false);
    document.getElementById('page-login').style.display = 'block';
  }
});
});

// ── ГЛОБАЛЬНІ ФУНКЦІЇ ──────────────────────

window.login                 = login;
window.loginGoogle           = loginGoogle;
window.register              = register;
window.logout                = logout;
window.navigate              = navigate;
window.openAdmin             = openAdmin;
window.checkAdminPass        = checkAdminPass;
window.adminFilterUsers      = adminFilterUsers;
window.adminGiveBalance      = adminGiveBalance;
window.adminConfirmBalance   = adminConfirmBalance;
window.adminGiveItem         = adminGiveItem;
window.adminConfirmItem      = adminConfirmItem;
window.adminGiveCase         = adminGiveCase;
window.adminConfirmCase      = adminConfirmCase;
window.adminRemoveItem       = adminRemoveItem;
window.adminConfirmRemove    = adminConfirmRemove;
window.adminToggleBan        = adminToggleBan;
window.openBuyCaseModal      = openBuyCaseModal;
window.buyCaseCustom         = buyCaseCustom;
window.buyCase               = buyCase;
window.previewCase           = previewCase;
window.openCase              = openCase;
window.skipRoulette          = skipRoulette;
window.showFastOpenModal     = showFastOpenModal;
window.foToggleGroup         = foToggleGroup;
window.foSelectAll           = foSelectAll;
window.foUpdateSummary       = foUpdateSummary;
window.doFastOpen            = doFastOpen;
window.setInvSort            = setInvSort;
window.setInvFilter          = setInvFilter;
window.inv2OpenPopup        = inv2OpenPopup;
window.closeItemPopup       = closeItemPopup;
window.inv2SetSearch        = inv2SetSearch;
window.inv2SetFolder        = inv2SetFolder;
window.inv2OpenCreateFolder = inv2OpenCreateFolder;
window.inv2SelectColor      = inv2SelectColor;
window.inv2CreateFolder     = inv2CreateFolder;
window.inv2CloseModal       = inv2CloseModal;
window.inv2OpenFolderModal  = inv2OpenFolderModal;
window.inv2AssignFolder     = inv2AssignFolder;
window.inv2DeleteFolder     = inv2DeleteFolder;
window.inv2ViewDetail       = inv2ViewDetail;
window.setInvColFilter       = setInvColFilter;
window.toggleLock            = toggleLock;
window.showSellModal         = showSellModal;
window.switchMarketTab    = switchMarketTab;
window.sendBuyRequest     = sendBuyRequest;
window.confirmBuyRequest  = confirmBuyRequest;
window.acceptBuyRequest   = acceptBuyRequest;
window.declineBuyRequest  = declineBuyRequest;
window.sendClanMsg        = sendClanMsg;
window.refreshVaultSection = refreshVaultSection;
window.confirmSell           = confirmSell;
window.buyFromMarketItem     = buyFromMarketItem;
window.cancelListing         = cancelListing;
window.toggleLock = toggleLock;
window.setMarketSort         = setMarketSort;
window.setMarketSearch       = setMarketSearch;

window.vaultTakeSelectedItems = vaultTakeSelectedItems;
window.vdSelectAll            = vdSelectAll;

window.uploadToCloudinary = uploadToCloudinary;

window.handleAvatarUpload   = handleAvatarUpload;
window.confirmAvatarUpload  = confirmAvatarUpload;

window.adminPreviewItem      = adminPreviewItem;
window.adminResetCases       = adminResetCases;
window.adminConfirmResetCases = adminConfirmResetCases;

window.setMarketColFilter    = setMarketColFilter;
window.showTradeModal        = showTradeModal;
window.sendTradeNew          = sendTradeNew;
window.tradeLoadTheirInv     = tradeLoadTheirInv;
window.tradeAddMy            = tradeAddMy;
window.tradeRemoveMy         = tradeRemoveMy;
window.tradeAddTheir         = tradeAddTheir;
window.tradeRemoveTheir      = tradeRemoveTheir;
window.showGiftModal         = showGiftModal;
window.switchGiftTab         = switchGiftTab;
window.sendGift              = sendGift;
window.doAcceptTrade         = doAcceptTrade;
window.declineTrade          = declineTrade;
window.cancelTrade           = cancelTrade;
window.addFriend             = addFriend;
window.acceptFriendReq       = acceptFriendReq;
window.declineFriendReq      = declineFriendReq;
window.removeFriend          = removeFriend;
window.viewFriendProfile     = viewFriendProfile;
window.createClan            = createClan;
window.joinClanRequest       = joinClanRequest;
window.acceptJoinReq         = acceptJoinReq;
window.declineJoinReq        = declineJoinReq;
window.leaveClan             = leaveClan;
window.kickMember            = kickMember;
window.switchClanTab         = switchClanTab;
window.vaultDepositBalance   = vaultDepositBalance;
window.doVaultDepositBalance = doVaultDepositBalance;
window.vaultWithdrawBalance  = vaultWithdrawBalance;
window.doVaultWithdrawBalance = doVaultWithdrawBalance;
window.vaultDepositItem      = vaultDepositItem;
window.doVaultDepositItem    = doVaultDepositItem;
window.vaultTakeItem         = vaultTakeItem;
window.addCraftItem          = addCraftItem;
window.removeCraftItem       = removeCraftItem;
window.doCraft               = doCraft;
window.closeModal            = closeModal;
window.switchProfileTab      = switchProfileTab;
window.toggleTheme           = toggleTheme;