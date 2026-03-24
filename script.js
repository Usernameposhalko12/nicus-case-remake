// ============================================
// НІКУС КЕЙС РЕМЕЙК — ЯДРО ГРИ (Firebase)
// ============================================

import {
  auth, registerUser, loginUser, loginWithGoogle, saveUserData, logoutUser,
  listItemOnMarket, getMarketListings, removeMarketListing, buyMarketItem,
  sendTradeRequest, getMyTrades, updateTradeStatus, acceptTradeAndSwap,
  getUserProfile, getAllUsernames, onAuthStateChanged, db
} from "./firebase.js";

import {
  doc, onSnapshot, getDoc, updateDoc, collection, getDocs
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

// Колекції для крафту
const COLLECTIONS = {
  autumn: {
    name: "Осіння колекція",
    cases: ["autumn26", "autumn26box", "autumnGift"],
  },
  harvest: {
    name: "Harvest колекція",
    cases: ["harvest", "autumnLeaves", "autumnVibe", "leaffall", "autumnCollection"],
  },
};

// ── КЕЙСИ ──────────────────────────────────

const CASES = {
  autumn26: {
    id: "autumn26", name: "Осінь26",
    img: "img/cases/autumn26.png", price: 50, total: 2000, remaining: 2000,
    items: [
      { id: "item_a1", name: "Лут 1", img: "img/items/placeholder.png", rarity: "common"     },
      { id: "item_a2", name: "Лут 2", img: "img/items/placeholder.png", rarity: "exceptional" },
      { id: "item_a3", name: "Лут 3", img: "img/items/placeholder.png", rarity: "epic"        },
      { id: "item_a4", name: "Лут 4", img: "img/items/placeholder.png", rarity: "legendary"   },
      { id: "item_a5", name: "Лут 5", img: "img/items/placeholder.png", rarity: "secret"      },
      { id: "item_a6", name: "Лут 6", img: "img/items/placeholder.png", rarity: "special"     },
    ]
  },
  autumn26box: {
    id: "autumn26box", name: "Осінь26 Бокс",
    img: "img/cases/autumn26box.png", price: 25, total: 3000, remaining: 3000,
    items: [
      { id: "item_b1", name: "Лут 1", img: "img/items/placeholder.png", rarity: "common"     },
      { id: "item_b2", name: "Лут 2", img: "img/items/placeholder.png", rarity: "exceptional" },
      { id: "item_b3", name: "Лут 3", img: "img/items/placeholder.png", rarity: "epic"        },
    ]
  },
  autumnCollection: {
    id: "autumnCollection", name: "Осінній Колекційний Кейс 2026",
    img: "img/cases/autumncollection.png", price: 100, total: 500, remaining: 500,
    items: [
      { id: "item_c1", name: "Лут 1", img: "img/items/placeholder.png", rarity: "exceptional" },
      { id: "item_c2", name: "Лут 2", img: "img/items/placeholder.png", rarity: "epic"        },
      { id: "item_c3", name: "Лут 3", img: "img/items/placeholder.png", rarity: "legendary"   },
      { id: "item_c4", name: "Лут 4", img: "img/items/placeholder.png", rarity: "secret"      },
    ]
  },
  autumnGift: {
    id: "autumnGift", name: "Осінній Дар",
    img: "img/cases/autumngift.png", price: 150, total: 250, remaining: 250,
    items: [
      { id: "item_d1", name: "Лут 1", img: "img/items/placeholder.png", rarity: "epic"      },
      { id: "item_d2", name: "Лут 2", img: "img/items/placeholder.png", rarity: "legendary" },
      { id: "item_d3", name: "Лут 3", img: "img/items/placeholder.png", rarity: "secret"    },
      { id: "item_d4", name: "Лут 4", img: "img/items/placeholder.png", rarity: "special"   },
    ]
  },
  autumnLeaves: {
    id: "autumnLeaves", name: "AutumnLeaves Case",
    img: "img/cases/autumnleaves.png", price: 200, total: 100, remaining: 100,
    items: [
      { id: "item_e1", name: "Лут 1", img: "img/items/placeholder.png", rarity: "legendary" },
      { id: "item_e2", name: "Лут 2", img: "img/items/placeholder.png", rarity: "secret"    },
      { id: "item_e3", name: "Лут 3", img: "img/items/placeholder.png", rarity: "special"   },
    ]
  },
  autumnVibe: {
    id: "autumnVibe", name: "AutumnVibe Case",
    img: "img/cases/autumnvibe.png", price: 200, total: 100, remaining: 100,
    items: [
      { id: "item_f1", name: "Лут 1", img: "img/items/placeholder.png", rarity: "legendary" },
      { id: "item_f2", name: "Лут 2", img: "img/items/placeholder.png", rarity: "secret"    },
      { id: "item_f3", name: "Лут 3", img: "img/items/placeholder.png", rarity: "special"   },
    ]
  },
  leaffall: {
    id: "leaffall", name: "Leaffall Case",
    img: "img/cases/leaffall.png", price: 200, total: 100, remaining: 100,
    items: [
      { id: "item_g1", name: "Лут 1", img: "img/items/placeholder.png", rarity: "legendary" },
      { id: "item_g2", name: "Лут 2", img: "img/items/placeholder.png", rarity: "secret"    },
      { id: "item_g3", name: "Лут 3", img: "img/items/placeholder.png", rarity: "special"   },
    ]
  },
  harvest: {
    id: "harvest", name: "HarvestCase",
    img: "img/cases/harvest.png", price: 200, total: 100, remaining: 100,
    items: [
      { id: "item_h1", name: "Лут 1", img: "img/items/placeholder.png", rarity: "legendary" },
      { id: "item_h2", name: "Лут 2", img: "img/items/placeholder.png", rarity: "secret"    },
      { id: "item_h3", name: "Лут 3", img: "img/items/placeholder.png", rarity: "special"   },
    ]
  },
};

// Прив'язуємо предмети до колекцій
(function tagItemCollections() {
  Object.entries(COLLECTIONS).forEach(([colKey, col]) => {
    col.cases.forEach(caseId => {
      const c = CASES[caseId];
      if (!c) return;
      c.items.forEach(item => { item.collection = colKey; });
    });
  });
})();

// ── СТАН ───────────────────────────────────

let currentUser   = null;
let gameState     = {};
let _unsubProfile = null;
let _isSaving     = false;

// ── НАВІГАЦІЯ ──────────────────────────────

const AUTH_PAGES = ['login', 'register'];

async function navigate(page) {
  if (!currentUser && !AUTH_PAGES.includes(page)) {
    showAllPages(false);
    document.getElementById('page-login').style.display = 'block';
    return;
  }
  showAllPages(false);
  const tp = document.getElementById('page-' + page);
  if (tp) tp.style.display = 'block';
  document.querySelectorAll('.nav-item, .bottom-nav-item').forEach(b =>
    b.classList.toggle('active', b.getAttribute('data-page') === page)
  );
  if (!currentUser) return;
  try {
    if (page === 'main')      renderMain();
    else if (page === 'shop') renderShop();
    else if (page === 'inventory') renderInventory();
    else if (page === 'market') { injectRouletteStyles(); injectMarketControls(); await renderMarket(); }
    else if (page === 'trades')  await renderTrades();
    else if (page === 'friends') renderFriends();
    else if (page === 'clan')    renderClan();
    else if (page === 'profile') renderProfile();
    else if (page === 'craft')   renderCraft();
    else if (page === 'admin')   await renderAdmin();
  } catch (e) {
    console.error('navigate error [' + page + ']:', e);
    showToast("Помилка зв'язку з базою даних", "error");
  }
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
    loadCasesRemaining(); setNavVisible(true); navigate("main");
    showToast("Ласкаво просимо, " + userData.username + "! 🍂", "success");
  } catch (e) {
    showToast(e.message || "Помилка входу!", "error");
  } finally { btn.disabled = false; btn.textContent = "Увійти"; }
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
    showToast("Акаунт створено! Вітаємо! 🍂", "success");
  } catch (e) {
    showToast(e.message || "Помилка реєстрації!", "error");
  } finally { btn.disabled = false; btn.textContent = "Зареєструватись"; }
}

async function logout() {
  await saveData();
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
        '<h2 class="modal-title">&#128100; Обери нікнейм</h2>' +
        '<p style="color:var(--text-muted);font-size:13px;margin-bottom:12px;">Перший вхід через Google:</p>' +
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
    loadCasesRemaining(); setNavVisible(true); navigate("main");
    showToast("Ласкаво просимо, " + userData.username + "! 🍂", "success");
  } catch (e) { showToast(e.message || "Помилка Google входу!", "error"); }
}

// ── ЗБЕРЕЖЕННЯ ─────────────────────────────

async function saveData() {
  if (!currentUser?.uid) return;
  _isSaving = true;
  gameState.lastSeen = Date.now();
  try {
    await saveUserData(currentUser.uid, gameState);
  } catch (e) {
    console.error("saveData error:", e);
    showToast("Помилка збереження", "error");
  } finally { setTimeout(() => { _isSaving = false; }, 1500); }
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
  if (navEl) navEl.textContent = "\uD83D\uDCB0 " + bal + "  |  " + name;
}

// ── ГОЛОВНА ────────────────────────────────

function renderMain() {
  const cases = (gameState.inventory || []).filter(i => i.type === "case").length;
  const items = (gameState.inventory || []).filter(i => i.type === "item").length;
  const s = (id, v) => { const el = document.getElementById(id); if (el) el.textContent = v; };
  s("main-username",  gameState.username || "—");
  s("main-balance",   gameState.balance  ?? 0);
  s("main-level",     gameState.level    || 1);
  s("main-items",     items);
  s("main-cases",     cases);
  s("main-friends",   (gameState.friends || []).length);
  s("main-clan-stat", gameState.clan || "—");
  updateBalanceDisplay();
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
      '<div class="case-remaining">' + (isEmpty ? "🚫 Розпродано" : "📦 Залишилось: " + c.remaining) + '</div>' +
      '<div class="case-price">💰 ' + c.price + ' нікусів</div>' +
      '<button class="btn-buy" onclick="buyCase(\'' + c.id + '\')" ' + (isEmpty ? "disabled" : "") + '>' +
        (isEmpty ? "Розпродано" : "Купити") + '</button>' +
      '<button class="btn-preview" onclick="previewCase(\'' + c.id + '\')">👁 Вміст</button>';
    grid.appendChild(card);
  });
}

function buyCase(caseId) {
  const c = CASES[caseId];
  if (!c) return;
  if (c.remaining <= 0)                    { showToast("Кейс розпродано!", "error"); return; }
  if ((gameState.balance ?? 0) < c.price) { showToast("Недостатньо нікусів!", "error"); return; }
  gameState.balance = (gameState.balance ?? 0) - c.price;
  c.remaining--;
  if (!gameState.inventory) gameState.inventory = [];
  gameState.inventory.push({ id: generateId(), type: "case", caseId, name: c.name, img: c.img, boughtAt: Date.now() });
  saveCasesRemaining(); saveData(); renderShop(); updateBalanceDisplay();
  showToast("✅ Куплено: " + c.name + "!", "success");
}

function previewCase(caseId) {
  const c = CASES[caseId];
  if (!c) return;
  const html = c.items.map(item => {
    const r = RARITIES[item.rarity];
    return '<div class="preview-item" style="border-color:' + r.color + '">' +
      '<img src="' + item.img + '" onerror="this.src=\'img/placeholder.png\'" alt="' + item.name + '">' +
      '<div class="preview-item-name">' + item.name + '</div>' +
      '<div class="preview-item-rarity" style="color:' + r.color + '">' + r.name + '</div>' +
      '</div>';
  }).join("");
  openModal('<h2 class="modal-title">📦 ' + c.name + '</h2><p style="color:var(--text-muted);margin-bottom:16px;">Можливі предмети:</p><div class="preview-grid">' + html + '</div><button class="btn-primary" onclick="closeModal()">Закрити</button>');
}

// ── ВІДКРИТТЯ КЕЙСУ ────────────────────────

function openCase(invIndex) {
  const item = gameState.inventory[invIndex];
  if (!item || item.type !== "case") return;
  const c = CASES[item.caseId];
  if (!c) return;
  const dropped = rollDrop(c);
  const ITEM_W = 120, TOTAL_W = 130, COUNT = 60;
  const strip  = [];
  for (let i = 0; i < COUNT; i++) strip.push(c.items[Math.floor(Math.random() * c.items.length)]);
  const winPos = 46 + Math.floor(Math.random() * 4);
  strip[winPos] = dropped;
  const stripHtml = strip.map((it, i) => {
    const r = RARITIES[it.rarity];
    return '<div class="roulette-card" style="border-color:' + r.color + ';min-width:' + ITEM_W + 'px;" data-idx="' + i + '">' +
      '<img src="' + it.img + '" onerror="this.src=\'img/placeholder.png\'">' +
      '<div style="font-size:10px;color:' + r.color + ';margin-top:4px;">' + r.name + '</div></div>';
  }).join("");
  openModal(
    '<h2 class="modal-title" style="margin-bottom:16px;">🎁 Відкриття кейсу</h2>' +
    '<div class="roulette-wrap"><div class="roulette-arrow">▼</div>' +
    '<div class="roulette-viewport"><div class="roulette-strip" id="roulette-strip">' + stripHtml + '</div></div></div>' +
    '<div id="roulette-result" style="display:none;text-align:center;margin-top:20px;"></div>' +
    '<button id="roulette-close-btn" class="btn-primary" style="display:none;margin-top:16px;width:100%;" onclick="closeModal()">Забрати!</button>',
    false
  );
  requestAnimationFrame(() => {
    const stripEl = document.getElementById("roulette-strip");
    if (!stripEl) return;
    const vpWidth = stripEl.parentElement.offsetWidth;
    const targetX = winPos * TOTAL_W + ITEM_W / 2 - vpWidth / 2 + (Math.random() - 0.5) * ITEM_W * 0.6;
    stripEl.style.transition = "none";
    stripEl.style.transform  = "translateX(0)";
    requestAnimationFrame(() => requestAnimationFrame(() => {
      stripEl.style.transition = "transform 5s cubic-bezier(0.15, 0.8, 0.35, 1)";
      stripEl.style.transform  = "translateX(-" + targetX + "px)";
    }));
    stripEl.addEventListener("transitionend", () => {
      gameState.inventory.splice(invIndex, 1);
      const newItem = {
        id: generateId(), type: "item", itemId: dropped.id,
        name: dropped.name, img: dropped.img, rarity: dropped.rarity,
        collection: dropped.collection || null,
        quality: rollQuality(), premium: Math.random() < 0.05,
        fromCase: item.caseId, obtainedAt: Date.now(),
      };
      if (!gameState.inventory) gameState.inventory = [];
      gameState.inventory.push(newItem);
      addXP({ common:5, exceptional:10, epic:20, legendary:40, secret:80, special:200 }[dropped.rarity] || 5);
      saveData(); renderInventory();
      const r = RARITIES[dropped.rarity];
      const resultEl = document.getElementById("roulette-result");
      const closeBtn = document.getElementById("roulette-close-btn");
      if (resultEl) {
        resultEl.style.display = "block";
        resultEl.innerHTML =
          '<div style="border:2px solid ' + r.color + ';border-radius:12px;padding:20px;background:' + r.color + '22;display:inline-block;">' +
          '<div style="color:#aaa;font-size:13px;margin-bottom:8px;">🎉 Ви отримали!</div>' +
          '<img src="' + newItem.img + '" onerror="this.src=\'img/placeholder.png\'" style="width:80px;height:80px;object-fit:contain;">' +
          '<div style="font-weight:700;margin-top:8px;">' + newItem.name + '</div>' +
          '<div style="color:' + r.color + '">' + r.name + '</div>' +
          '<div style="color:#aaa;font-size:12px;">' + newItem.quality + '</div>' +
          (newItem.premium ? '<div style="color:#FFD700;">⭐ ПРЕМІУМ</div>' : '') + '</div>';
      }
      if (closeBtn) closeBtn.style.display = "block";
    }, { once: true });
  });
}

function rollDrop(c) {
  const r = Math.random(); let cum = 0;
  const byRarity = {};
  c.items.forEach(i => { if (!byRarity[i.rarity]) byRarity[i.rarity] = []; byRarity[i.rarity].push(i); });
  for (const rarity of ["special","secret","legendary","epic","exceptional","common"]) {
    if (!byRarity[rarity]) continue;
    cum += RARITIES[rarity].chance;
    if (r < cum) { const p = byRarity[rarity]; return p[Math.floor(Math.random() * p.length)]; }
  }
  const common = byRarity["common"] || c.items;
  return common[Math.floor(Math.random() * common.length)];
}

function rollQuality() {
  let r = Math.random(), cum = 0;
  for (const q of QUALITIES) { cum += q.chance; if (r < cum) return q.name; }
  return QUALITIES[QUALITIES.length - 1].name;
}

// ── ІНВЕНТАР ───────────────────────────────

let invSort = "rarity", invFilter = "all";

function renderInventory() {
  const grid = document.getElementById("inventory-grid");
  if (!grid) return;
  let items = [...(gameState.inventory || [])];
  if (invFilter !== "all") items = items.filter(i => i.type === invFilter);
  const ro = ["special","secret","legendary","epic","exceptional","common",""];
  if (invSort === "rarity") items.sort((a,b) => ro.indexOf(a.rarity) - ro.indexOf(b.rarity));
  else if (invSort === "name") items.sort((a,b) => a.name.localeCompare(b.name));
  else if (invSort === "date") items.sort((a,b) => (b.obtainedAt||0) - (a.obtainedAt||0));
  if (!items.length) {
    grid.innerHTML = '<div class="empty-state">🍂 Інвентар порожній<br><small>Купи кейси у магазині!</small></div>';
    return;
  }
  grid.innerHTML = items.map(item => {
    const r      = item.rarity ? RARITIES[item.rarity] : null;
    const color  = r ? r.color : "#888";
    const isCase = item.type === "case";
    const ri     = gameState.inventory.findIndex(x => x.id === item.id);
    return '<div class="inv-card" style="border-color:' + color + '">' +
      '<div class="inv-card-stripe" style="background:' + color + '"></div>' +
      '<img src="' + (item.img || 'img/placeholder.png') + '" onerror="this.src=\'img/placeholder.png\'" alt="' + item.name + '">' +
      '<div class="inv-card-name">' + item.name + '</div>' +
      (r ? '<div class="inv-card-rarity" style="color:' + color + '">' + r.name + '</div>' : '') +
      (item.quality ? '<div class="inv-card-quality">' + item.quality + '</div>' : '') +
      (item.premium ? '<div class="inv-card-premium">⭐ Преміум</div>' : '') +
      '<div class="inv-card-actions">' +
        (isCase
          ? '<button class="btn-sm btn-open" onclick="openCase(' + ri + ')">🎁 Відкрити</button>' +
            '<button class="btn-sm btn-sell" onclick="showSellModal(' + ri + ')">💰 Продати</button>'
          : '<button class="btn-sm btn-sell" onclick="showSellModal(' + ri + ')">💰 Продати</button>' +
            '<button class="btn-sm btn-trade" onclick="showTradeModal(' + ri + ')">🔄 Трейд</button>') +
      '</div></div>';
  }).join("");
}

function setInvSort(sort) {
  invSort = sort; renderInventory();
  document.querySelectorAll(".sort-btn").forEach(b => b.classList.toggle("active", b.dataset.sort === sort));
}
function setInvFilter(filter) {
  invFilter = filter; renderInventory();
  document.querySelectorAll(".filter-btn").forEach(b => b.classList.toggle("active", b.dataset.filter === filter));
}

// ── РИНОК ──────────────────────────────────

let marketListings = [], marketSort = "date", marketSearch = "";

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
  let listings = [...marketListings];
  if (marketSearch) {
    const q = marketSearch.toLowerCase();
    listings = listings.filter(l => l.item?.name?.toLowerCase().includes(q));
  }
  const ro = ["special","secret","legendary","epic","exceptional","common",""];
  if (marketSort === "date")       listings.sort((a,b) => (b.listedAt?.seconds||0) - (a.listedAt?.seconds||0));
  else if (marketSort === "price_asc")  listings.sort((a,b) => a.price - b.price);
  else if (marketSort === "price_desc") listings.sort((a,b) => b.price - a.price);
  else if (marketSort === "rarity")     listings.sort((a,b) => ro.indexOf(a.item?.rarity) - ro.indexOf(b.item?.rarity));
  if (!listings.length) { grid.innerHTML = '<div class="empty-state">🍂 Нічого не знайдено</div>'; return; }
  grid.innerHTML = listings.map(l => {
    if (!l.item) return "";
    const r = l.item.rarity ? RARITIES[l.item.rarity] : null;
    const color = r ? r.color : "#888";
    const mine  = l.sellerName === currentUser?.username;
    return '<div class="market-card" style="border-color:' + color + '">' +
      '<div class="market-card-stripe" style="background:' + color + '"></div>' +
      '<img src="' + (l.item.img || 'img/placeholder.png') + '" onerror="this.src=\'img/placeholder.png\'" alt="' + l.item.name + '">' +
      '<div class="market-item-name">' + l.item.name + '</div>' +
      (r ? '<div class="market-item-rarity" style="color:' + color + '">' + r.name + '</div>' : '') +
      (l.item.quality ? '<div class="market-item-quality">' + l.item.quality + '</div>' : '') +
      '<div class="market-seller">👤 ' + l.sellerName + '</div>' +
      '<div class="market-price">💰 ' + l.price + ' нікусів</div>' +
      (mine
        ? '<button class="btn-sm btn-cancel" onclick="cancelListing(\'' + l.docId + '\')">❌ Зняти</button>'
        : '<button class="btn-sm btn-buy" onclick="buyFromMarketItem(\'' + l.docId + '\')">Купити</button>') +
      '</div>';
  }).join("");
}

function setMarketSort(sort) {
  marketSort = sort; renderMarketGrid();
  document.querySelectorAll(".market-sort-btn").forEach(b => b.classList.toggle("active", b.dataset.sort === sort));
}
function setMarketSearch(val) { marketSearch = val; renderMarketGrid(); }

// ── ПРОДАЖ ─────────────────────────────────

let _sellInvIdx = null;

function showSellModal(invIdx) {
  _sellInvIdx = invIdx;
  const item = gameState.inventory[invIdx];
  if (!item) return;
  const r = item.rarity ? RARITIES[item.rarity] : null;
  openModal(
    '<h2 class="modal-title">💰 Виставити на ринок</h2>' +
    '<div style="text-align:center;margin-bottom:16px;">' +
    '<img src="' + (item.img || 'img/placeholder.png') + '" onerror="this.src=\'img/placeholder.png\'" style="width:80px;height:80px;object-fit:contain;">' +
    '<div style="font-weight:700;margin-top:8px;">' + item.name + '</div>' +
    (r ? '<div style="color:' + r.color + '">' + r.name + '</div>' : '') + '</div>' +
    '<label style="color:var(--text-muted);font-size:13px;">Ціна (нікусів):</label>' +
    '<input type="number" id="sell-price" min="1" value="100" style="width:100%;padding:10px;border-radius:8px;border:1px solid var(--border);background:var(--bg-card);color:var(--text);font-size:16px;margin:8px 0 16px;box-sizing:border-box;">' +
    '<div style="display:flex;gap:8px;">' +
    '<button class="btn-primary" style="flex:1;" id="sell-confirm-btn" onclick="confirmSell()">✅ Виставити</button>' +
    '<button class="btn-secondary" style="flex:1;" onclick="closeModal()">Скасувати</button></div>'
  );
}

async function confirmSell() {
  const price = parseInt(document.getElementById('sell-price')?.value);
  if (isNaN(price) || price <= 0) { showToast("Введіть коректну ціну!", "error"); return; }
  const item = gameState.inventory[_sellInvIdx];
  if (!item) { showToast("Предмет не знайдено!", "error"); return; }
  const btn = document.getElementById("sell-confirm-btn");
  if (btn) { btn.disabled = true; btn.textContent = "Виставляємо..."; }
  try {
    const copy = { ...item };
    gameState.inventory.splice(_sellInvIdx, 1);
    await listItemOnMarket(currentUser.uid, currentUser.username, copy, price);
    await saveData();
    closeModal();
    showToast("✅ Виставлено на ринок!", "success");
    renderInventory(); _sellInvIdx = null;
  } catch (e) {
    if (_sellInvIdx !== null) gameState.inventory.splice(_sellInvIdx, 0, item);
    console.error("confirmSell error:", e);
    showToast("Не вдалося виставити: " + e.message, "error");
    if (btn) { btn.disabled = false; btn.textContent = "✅ Виставити"; }
  }
}

// ФІКС: тепер транзакція оновлює і локальний стан
async function buyFromMarketItem(docId) {
  const l = marketListings.find(x => x.docId === docId);
  if (!l) return;
  if (l.sellerName === currentUser?.username) { showToast("Не можна купити свій предмет!", "error"); return; }
  if ((gameState.balance ?? 0) < l.price)    { showToast("Недостатньо нікусів!", "error"); return; }
  try {
    await buyMarketItem(currentUser.uid, gameState, l);
    // оновлюємо локальний стан після успішної транзакції
    gameState.balance = (gameState.balance ?? 0) - l.price;
    if (!gameState.inventory) gameState.inventory = [];
    const newItem = { ...l.item, id: l.item.id || generateId(), obtainedAt: Date.now() };
    gameState.inventory.push(newItem);
    updateBalanceDisplay();
    renderInventory();
    await renderMarket();
    showToast("✅ Куплено: " + l.item.name + "!", "success");
  } catch (e) { showToast("Помилка: " + e.message, "error"); }
}

async function cancelListing(docId) {
  const l = marketListings.find(x => x.docId === docId);
  if (!l || l.sellerName !== currentUser?.username) return;
  try {
    await removeMarketListing(docId);
    if (!gameState.inventory) gameState.inventory = [];
    gameState.inventory.push({ ...l.item, id: l.item.id || generateId() });
    await saveData();
    await renderMarket();
    showToast("Лот знято з ринку", "success");
  } catch (e) { showToast("Помилка: " + e.message, "error"); }
}

// ── ТРЕЙДИ ─────────────────────────────────

async function renderTrades() {
  const list = document.getElementById("trades-list");
  if (!list) return;
  list.innerHTML = '<div class="empty-state">⏳ Завантаження...</div>';
  try {
    const trades = await getMyTrades(currentUser.uid);
    if (!trades.length) { list.innerHTML = '<div class="empty-state">🍂 Немає активних трейдів</div>'; return; }
    trades.sort((a, b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0));
    const statusMap = { pending:"⏳ Очікує", confirmed:"✅ Підтверджено", cancelled:"❌ Скасовано" };
    const statusColor = { pending:"#f0c040", confirmed:"#5ddb5d", cancelled:"#e74c3c" };
    list.innerHTML = trades.map(trade => {
      const isSender = trade.fromUid === currentUser.uid;
      const offerHtml = (trade.offerItems||[]).map(i =>
        '<div class="trade-item"><img src="' + (i.img||'img/placeholder.png') + '" onerror="this.src=\'img/placeholder.png\'"><span>' + i.name + '</span></div>'
      ).join("");
      const wantHtml = (trade.wantItems||[]).map(i =>
        '<div class="trade-item"><img src="' + (i.img||'img/placeholder.png') + '" onerror="this.src=\'img/placeholder.png\'"><span>' + i.name + '</span></div>'
      ).join("");
      const sc = statusColor[trade.status] || "#888";
      return '<div class="trade-card">' +
        '<div class="trade-header"><span style="font-weight:700;">' +
          (isSender ? "📤 → " + trade.toUsername : "📥 від " + trade.fromUsername) +
        '</span><span class="trade-status" style="color:' + sc + '">' + (statusMap[trade.status] || trade.status) + '</span></div>' +
        '<div class="trade-items">' +
          '<div><div style="color:var(--text-muted);font-size:12px;margin-bottom:6px;">' + (isSender ? "Ти даєш:" : "Пропонує:") + '</div>' + offerHtml + '</div>' +
          '<div style="font-size:24px;align-self:center;">⇄</div>' +
          '<div><div style="color:var(--text-muted);font-size:12px;margin-bottom:6px;">' + (isSender ? "Ти просиш:" : "Ти даєш:") + '</div>' + wantHtml + '</div>' +
        '</div>' +
        (!isSender && trade.status === "pending"
          ? '<div style="display:flex;gap:8px;margin-top:12px;">' +
            '<button class="btn-primary" onclick="doAcceptTrade(\'' + trade.docId + '\')">✅ Прийняти і обміняти</button>' +
            '<button class="btn-secondary" onclick="declineTrade(\'' + trade.docId + '\')">❌ Відхилити</button></div>' : '') +
        (isSender && trade.status === "pending"
          ? '<button class="btn-secondary" onclick="cancelTrade(\'' + trade.docId + '\')" style="margin-top:12px;">Скасувати</button>' : '') +
        '</div>';
    }).join("");
  } catch (e) {
    console.error("renderTrades:", e);
    list.innerHTML = '<div class="empty-state">❌ Помилка: ' + e.message + '</div>';
  }
}

// ФІКС: показуємо реальний інвентар для вибору предметів для трейду
async function showTradeModal(invIdx) {
  const myItem = gameState.inventory[invIdx];
  if (!myItem) return;

  let others = [];
  try { others = (await getAllUsernames()).filter(u => u !== currentUser?.username); } catch (e) {}

  openModal(
    '<h2 class="modal-title">🔄 Надіслати трейд</h2>' +
    '<div style="margin-bottom:14px;">' +
      '<label style="color:var(--text-muted);font-size:13px;display:block;margin-bottom:6px;">Кому:</label>' +
      '<select id="trade-target" style="width:100%;padding:10px;border-radius:8px;border:1px solid var(--border);background:var(--bg-card);color:var(--text);font-size:14px;box-sizing:border-box;">' +
        (others.length ? others.map(u => '<option value="' + u + '">' + u + '</option>').join("") : '<option value="">Немає гравців</option>') +
      '</select>' +
    '</div>' +
    '<div style="font-weight:600;margin-bottom:8px;color:var(--accent);">Ти пропонуєш:</div>' +
    '<div class="trade-item" style="background:var(--bg-card2);padding:10px;border-radius:8px;margin-bottom:16px;">' +
      '<img src="' + (myItem.img||'img/placeholder.png') + '" onerror="this.src=\'img/placeholder.png\'" style="width:40px;height:40px;object-fit:contain;">' +
      '<span>' + myItem.name + '</span>' +
    '</div>' +
    '<div style="font-weight:600;margin-bottom:8px;color:var(--accent);">Що хочеш натомість (ім\'я предмета):</div>' +
    '<input type="text" id="trade-want-name" placeholder="Назва предмета..." style="width:100%;padding:10px;border-radius:8px;border:1px solid var(--border);background:var(--bg-card);color:var(--text);font-size:14px;margin-bottom:16px;box-sizing:border-box;">' +
    '<div style="display:flex;gap:8px;">' +
      '<button class="btn-primary" style="flex:1;" onclick="sendTrade(' + invIdx + ')">📤 Надіслати</button>' +
      '<button class="btn-secondary" style="flex:1;" onclick="closeModal()">Скасувати</button>' +
    '</div>',
    true
  );
}

async function sendTrade(invIdx) {
  const target   = document.getElementById("trade-target")?.value;
  const wantName = document.getElementById("trade-want-name")?.value.trim();
  const item     = gameState.inventory[invIdx];
  if (!target)   { showToast("Виберіть гравця!", "error"); return; }
  if (!wantName) { showToast("Вкажіть що хочете!", "error"); return; }
  if (!item)     { showToast("Предмет не знайдено!", "error"); return; }
  try {
    await sendTradeRequest(
      currentUser.uid, currentUser.username, target,
      [{ ...item }],
      [{ name: wantName, img: "img/items/placeholder.png" }]
    );
    closeModal();
    showToast("📤 Трейд надіслано!", "success");
  } catch (e) { showToast(e.message || "Помилка!", "error"); }
}

// ФІКС: реальний обмін при прийнятті
async function doAcceptTrade(docId) {
  try {
    await acceptTradeAndSwap(docId, currentUser.uid);
    // оновлюємо локальний gameState з Firebase
    const snap = await getDoc(doc(db, "users", currentUser.uid));
    if (snap.exists()) {
      const data = snap.data();
      gameState.inventory = data.inventory || [];
    }
    await renderTrades();
    renderInventory();
    showToast("✅ Трейд виконано! Предмети обміняно.", "success");
  } catch (e) { showToast("Помилка: " + e.message, "error"); }
}

async function declineTrade(docId) {
  try { await updateTradeStatus(docId, "cancelled"); await renderTrades(); showToast("❌ Трейд відхилено", "error"); }
  catch(e) { showToast("Помилка: " + e.message, "error"); }
}
async function cancelTrade(docId) {
  try { await updateTradeStatus(docId, "cancelled"); await renderTrades(); showToast("Трейд скасовано", "success"); }
  catch(e) { showToast("Помилка: " + e.message, "error"); }
}

// ── ПРОФІЛЬ ────────────────────────────────

function renderProfile() {
  const s = (id,v) => { const el=document.getElementById(id); if(el) el.textContent=v; };
  s("profile-username", gameState.username||"—");
  s("profile-level",    gameState.level||1);
  s("profile-balance",  gameState.balance??0);
  s("profile-items",    (gameState.inventory||[]).length);
  s("profile-clan",     gameState.clan||"Без клану");
  s("profile-lastseen", gameState.lastSeen ? new Date(gameState.lastSeen).toLocaleDateString("uk-UA") : "—");
}

// ── ДРУЗІ ──────────────────────────────────

function renderFriends() {
  const list = document.getElementById("friends-list");
  if (!list) return;
  const friends = gameState.friends || [];
  if (!friends.length) { list.innerHTML = '<div class="empty-state">🍂 Список друзів порожній</div>'; return; }
  list.innerHTML = friends.map(u =>
    '<div class="friend-card">' +
    '<div class="friend-avatar">👤</div>' +
    '<div class="friend-info"><div class="friend-name">' + u + '</div></div>' +
    '<div class="friend-actions">' +
      '<button class="btn-sm btn-trade" onclick="viewFriendProfile(\'' + u + '\')">👁 Профіль</button>' +
      '<button class="btn-sm btn-cancel" onclick="removeFriend(\'' + u + '\')">Видалити</button>' +
    '</div>' +
    '</div>'
  ).join("");
}

// НОВИНКА: переглянути профіль друга
async function viewFriendProfile(username) {
  try {
    const profile = await getUserProfile(username);
    const items = (profile.inventory || []).filter(i => i.type === "item").length;
    const cases = (profile.inventory || []).filter(i => i.type === "case").length;
    openModal(
      '<h2 class="modal-title">👤 ' + profile.username + '</h2>' +
      '<div style="text-align:center;margin-bottom:16px;">' +
        '<div style="font-size:48px;margin-bottom:8px;">🍂</div>' +
        '<div style="display:flex;gap:8px;justify-content:center;flex-wrap:wrap;margin-bottom:16px;">' +
          '<span class="badge">Рівень ' + (profile.level||1) + '</span>' +
          (profile.clan ? '<span class="badge">⚔️ Клан</span>' : '') +
        '</div>' +
      '</div>' +
      '<div style="display:grid;grid-template-columns:repeat(3,1fr);gap:10px;margin-bottom:16px;">' +
        '<div style="background:var(--bg-card2);border:1px solid var(--border);border-radius:10px;padding:12px;text-align:center;">' +
          '<div style="font-size:18px;font-weight:700;color:var(--gold-light);">' + (profile.balance||0) + '</div>' +
          '<div style="font-size:11px;color:var(--text-muted);">💰 Нікусів</div>' +
        '</div>' +
        '<div style="background:var(--bg-card2);border:1px solid var(--border);border-radius:10px;padding:12px;text-align:center;">' +
          '<div style="font-size:18px;font-weight:700;color:var(--accent);">' + items + '</div>' +
          '<div style="font-size:11px;color:var(--text-muted);">🎁 Предметів</div>' +
        '</div>' +
        '<div style="background:var(--bg-card2);border:1px solid var(--border);border-radius:10px;padding:12px;text-align:center;">' +
          '<div style="font-size:18px;font-weight:700;color:var(--accent);">' + cases + '</div>' +
          '<div style="font-size:11px;color:var(--text-muted);">📦 Кейсів</div>' +
        '</div>' +
      '</div>' +
      '<button class="btn-secondary btn-full" onclick="closeModal()">Закрити</button>'
    );
  } catch (e) { showToast("Помилка: " + e.message, "error"); }
}

async function addFriend() {
  const input    = document.getElementById("friend-input");
  const username = input?.value.trim();
  if (!username)                                  { showToast("Введіть нікнейм!", "error"); return; }
  if (username === currentUser?.username)         { showToast("Не можна додати себе!", "error"); return; }
  if ((gameState.friends||[]).includes(username)) { showToast("Вже в друзях!", "error"); return; }
  try {
    const snap = await getDoc(doc(db, "usernames", username));
    if (!snap.exists()) { showToast("Гравця \"" + username + "\" не знайдено!", "error"); return; }
  } catch (e) { showToast("Помилка перевірки гравця", "error"); return; }
  if (!gameState.friends) gameState.friends = [];
  gameState.friends.push(username);
  await saveData();
  if (input) input.value = "";
  renderFriends();
  showToast("✅ Додано до друзів!", "success");
}

async function removeFriend(username) {
  gameState.friends = (gameState.friends||[]).filter(f => f !== username);
  await saveData(); renderFriends();
  showToast("Видалено з друзів", "success");
}

// ── КЛАН ───────────────────────────────────

function renderClan() {
  const section = document.getElementById("clan-section");
  if (!section) return;
  if (!gameState.clan) {
    section.innerHTML =
      '<div class="empty-state">🍂 Ти не в клані</div>' +
      '<div style="display:flex;gap:10px;margin-top:20px;flex-wrap:wrap;">' +
        '<div style="flex:1;min-width:200px;">' +
          '<input type="text" id="clan-name-input" placeholder="Назва клану..." style="width:100%;padding:10px;border-radius:8px;border:1px solid var(--border);background:var(--bg-card);color:var(--text);font-size:14px;box-sizing:border-box;margin-bottom:8px;">' +
          '<button class="btn-primary" style="width:100%;" onclick="createClan()">⚔️ Створити клан</button>' +
        '</div>' +
        '<div style="flex:1;min-width:200px;">' +
          '<input type="text" id="clan-join-input" placeholder="ID клану..." style="width:100%;padding:10px;border-radius:8px;border:1px solid var(--border);background:var(--bg-card);color:var(--text);font-size:14px;box-sizing:border-box;margin-bottom:8px;">' +
          '<button class="btn-secondary" style="width:100%;" onclick="joinClan()">🚪 Вступити в клан</button>' +
        '</div>' +
      '</div>';
    return;
  }
  const clan     = JSON.parse(localStorage.getItem("clan_" + gameState.clan) || "{}");
  const isLeader = clan.leader === currentUser?.username;
  section.innerHTML =
    '<div class="clan-header">' +
      '<div class="clan-name">⚔️ ' + (clan.name || gameState.clan) + '</div>' +
      '<div class="clan-id">ID: ' + gameState.clan + '</div>' +
      '<div class="clan-members">👥 Учасників: ' + (clan.members||[]).length + '</div>' +
    '</div>' +
    '<div class="clan-members-list">' +
      (clan.members||[]).map(m =>
        '<div class="friend-card"><div class="friend-avatar">' + (m===clan.leader?"👑":"👤") + '</div>' +
        '<div class="friend-info"><div class="friend-name">' + m + '</div>' +
        '<div class="friend-level">' + (m===clan.leader?"Лідер":"Учасник") + '</div></div>' +
        (isLeader && m !== currentUser?.username ? '<button class="btn-sm btn-cancel" onclick="kickFromClan(\'' + m + '\')">Виключити</button>' : '') +
        '</div>'
      ).join("") +
    '</div>' +
    '<button class="btn-secondary" style="margin-top:16px;width:100%;" onclick="leaveClan()">🚪 Покинути клан</button>';
}

function createClan() {
  const name = document.getElementById("clan-name-input")?.value.trim();
  if (!name) { showToast("Введіть назву клану!", "error"); return; }
  const id = generateId();
  localStorage.setItem("clan_" + id, JSON.stringify({ id, name, leader: currentUser.username, members: [currentUser.username], createdAt: Date.now() }));
  gameState.clan = id; saveData(); renderClan(); showToast("⚔️ Клан створено!", "success");
}

function joinClan() {
  const id  = document.getElementById("clan-join-input")?.value.trim();
  const raw = localStorage.getItem("clan_" + id);
  if (!raw) { showToast("Клан не знайдено!", "error"); return; }
  const clan = JSON.parse(raw);
  if (clan.members.includes(currentUser.username)) { showToast("Ти вже в цьому клані!", "error"); return; }
  clan.members.push(currentUser.username);
  localStorage.setItem("clan_" + id, JSON.stringify(clan));
  gameState.clan = id; saveData(); renderClan(); showToast("✅ Ти вступив у клан!", "success");
}

function leaveClan() {
  const raw = localStorage.getItem("clan_" + gameState.clan);
  if (!raw) return;
  const clan = JSON.parse(raw);
  clan.members = clan.members.filter(m => m !== currentUser.username);
  localStorage.setItem("clan_" + gameState.clan, JSON.stringify(clan));
  gameState.clan = null; saveData(); renderClan(); showToast("Ти покинув клан", "success");
}

function kickFromClan(username) {
  const raw = localStorage.getItem("clan_" + gameState.clan);
  if (!raw) return;
  const clan = JSON.parse(raw);
  clan.members = clan.members.filter(m => m !== username);
  localStorage.setItem("clan_" + gameState.clan, JSON.stringify(clan));
  renderClan(); showToast("Гравця виключено", "success");
}

// ── КРАФТ (НОВИЙ — колекційний) ────────────

let craftSelected = [];

// Допоміжна: визначаємо колекцію предмета
function getItemCollection(item) {
  return item.collection || null;
}

// Визначаємо домінуючу колекцію у вибраних предметах
function getDominantCollection(items) {
  const counts = {};
  items.forEach(i => {
    const col = getItemCollection(i);
    if (col) counts[col] = (counts[col] || 0) + 1;
  });
  if (!Object.keys(counts).length) return null;
  return Object.entries(counts).sort((a,b) => b[1]-a[1])[0][0];
}

// Вираховуємо результат крафту
function calcCraftResult(items) {
  const ro = ["common","exceptional","epic","legendary","secret","special"];
  const maxR = items.reduce((max, it) => ro.indexOf(it.rarity) > ro.indexOf(max) ? it.rarity : max, "common");
  const newRarity = ro[Math.min(ro.indexOf(maxR) + 1, ro.length - 1)];

  const dominantCol = getDominantCollection(items);
  const colItems = dominantCol
    ? Object.values(CASES)
        .filter(c => COLLECTIONS[dominantCol]?.cases.includes(c.id))
        .flatMap(c => c.items.filter(i => i.rarity === newRarity))
    : [];

  // fallback — будь-який предмет потрібної рідкості
  const fallbackItems = Object.values(CASES).flatMap(c => c.items.filter(i => i.rarity === newRarity));
  const pool = colItems.length ? colItems : fallbackItems;

  const picked = pool.length ? pool[Math.floor(Math.random() * pool.length)] : null;
  return { rarity: newRarity, collection: dominantCol, picked };
}

function renderCraft() {
  const slots  = document.getElementById("craft-slots");
  const btn    = document.getElementById("craft-btn");
  const picker = document.getElementById("craft-picker");
  const preview = document.getElementById("craft-preview");
  if (!slots) return;

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

  if (btn) btn.disabled = craftSelected.length !== 5;

  // Показуємо прогноз результату
  if (preview) {
    if (craftSelected.length > 0) {
      const dom = getDominantCollection(craftSelected);
      const colName = dom ? COLLECTIONS[dom]?.name : "Змішана";
      const ro = ["common","exceptional","epic","legendary","secret","special"];
      const maxR = craftSelected.reduce((max, it) => ro.indexOf(it.rarity) > ro.indexOf(max) ? it.rarity : max, "common");
      const nextR = ro[Math.min(ro.indexOf(maxR) + 1, ro.length - 1)];
      const r = RARITIES[nextR];
      preview.style.display = "block";
      preview.innerHTML =
        '<div style="font-size:12px;color:var(--text-muted);">📊 Прогноз: ' +
        '<span style="color:' + r.color + ';font-weight:700;">' + r.name + '</span>' +
        (dom ? ' | Колекція: <span style="color:var(--accent);">' + colName + '</span>' : ' | Змішані предмети') +
        '</div>';
    } else {
      preview.style.display = "none";
    }
  }

  if (picker) {
    const available = (gameState.inventory||[]).filter(i => i.type==="item" && !craftSelected.find(s=>s.id===i.id));
    picker.innerHTML = available.length
      ? available.map(item => {
          const r = item.rarity ? RARITIES[item.rarity] : null;
          const col = getItemCollection(item);
          const colName = col ? COLLECTIONS[col]?.name : null;
          return '<div class="craft-pick-item" onclick="addCraftItem(\'' + item.id + '\')">' +
            '<img src="' + (item.img||'img/placeholder.png') + '" onerror="this.src=\'img/placeholder.png\'">' +
            '<span>' + item.name + '</span>' +
            (r ? '<span style="color:' + r.color + ';font-size:11px;">' + r.name + '</span>' : '') +
            (colName ? '<span style="color:var(--text-dim);font-size:10px;">' + colName + '</span>' : '') +
            '</div>';
        }).join("")
      : '<div class="empty-state">Немає предметів для крафту</div>';
  }
}

function addCraftItem(itemId) {
  if (craftSelected.length >= 5) return;
  const item = (gameState.inventory||[]).find(i => i.id === itemId);
  if (item) { craftSelected.push(item); renderCraft(); }
}

function removeCraftItem(index) { craftSelected.splice(index, 1); renderCraft(); }

async function doCraft() {
  if (craftSelected.length !== 5) return;

  const { rarity: newRarity, collection: dominantCol, picked } = calcCraftResult(craftSelected);

  // Видаляємо вибрані з інвентаря
  craftSelected.forEach(sel => {
    const i = gameState.inventory.findIndex(x => x.id === sel.id);
    if (i !== -1) gameState.inventory.splice(i, 1);
  });

  const newItem = {
    id: generateId(), type: "item",
    itemId: picked ? picked.id : "crafted_" + newRarity,
    name: picked ? picked.name : "Крафтовий предмет",
    img: picked ? picked.img : "img/items/placeholder.png",
    rarity: newRarity,
    collection: dominantCol,
    quality: rollQuality(),
    premium: Math.random() < 0.03,
    fromCase: "craft",
    obtainedAt: Date.now(),
  };

  gameState.inventory.push(newItem);
  craftSelected = [];
  await saveData(); renderCraft();

  const r = RARITIES[newRarity];
  const colName = dominantCol ? COLLECTIONS[dominantCol]?.name : null;
  openModal(
    '<div style="text-align:center;border:2px solid ' + r.color + ';border-radius:12px;padding:24px;background:' + r.color + '22;">' +
    '<div style="font-size:18px;margin-bottom:8px;">⚗️ Крафт успішний!</div>' +
    '<img src="' + newItem.img + '" style="width:80px;height:80px;object-fit:contain;margin:12px 0;">' +
    '<div style="font-weight:700;">' + newItem.name + '</div>' +
    '<div style="color:' + r.color + '">' + r.name + '</div>' +
    '<div style="color:#aaa;font-size:12px;">' + newItem.quality + '</div>' +
    (colName ? '<div style="color:var(--accent);font-size:12px;margin-top:4px;">📦 ' + colName + '</div>' : '') +
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
    showToast("🎉 Рівень " + gameState.level + "!", "success");
  }
}

// ── АДМІН ПАНЕЛЬ ───────────────────────────

let _adminAuthed = false;
let _adminUsers  = [];

function openAdmin() {
  if (_adminAuthed) { navigate('admin'); return; }
  openModal(
    '<h2 class="modal-title">🔐 Адмін панель</h2>' +
    '<p style="color:var(--text-muted);font-size:13px;margin-bottom:12px;">Введіть пароль:</p>' +
    '<input type="password" id="admin-pass-input" class="form-input" placeholder="••••••••" ' +
      'style="width:100%;box-sizing:border-box;margin-bottom:16px;" ' +
      'onkeydown="if(event.key===\'Enter\')checkAdminPass()">' +
    '<button class="btn-primary btn-full" onclick="checkAdminPass()">Увійти</button>'
  );
  setTimeout(() => document.getElementById('admin-pass-input')?.focus(), 100);
}

function checkAdminPass() {
  const val = document.getElementById('admin-pass-input')?.value;
  if (val === ADMIN_PASSWORD) {
    _adminAuthed = true; closeModal(); navigate('admin');
  } else {
    showToast("❌ Невірний пароль!", "error");
    const inp = document.getElementById('admin-pass-input');
    if (inp) { inp.value = ""; inp.focus(); }
  }
}

async function renderAdmin() {
  const page = document.getElementById('page-admin');
  if (!page) return;
  page.innerHTML = '<div class="page-header"><button class="btn-back" onclick="navigate(\'main\')">← Назад</button><h1 class="page-title">🔐 Адмін панель</h1></div><div class="empty-state">⏳ Завантаження...</div>';
  injectAdminStyles();
  try {
    const snap = await getDocs(collection(db, "users"));
    _adminUsers = snap.docs.map(d => ({ uid: d.id, ...d.data() }));
  } catch (e) {
    page.innerHTML += '<div class="empty-state">❌ Помилка: ' + e.message + '</div>'; return;
  }
  const usersHtml = _adminUsers.map(u =>
    '<div class="admin-user-row">' +
      '<div class="admin-user-info">' +
        '<span class="admin-username">' + (u.username || u.uid) + '</span>' +
        '<span class="admin-email">' + (u.email || '—') + '</span>' +
        '<span class="admin-stats">Рівень ' + (u.level||1) + ' | 💰 ' + (u.balance||0) + ' | Предметів: ' + (u.inventory||[]).length + (u.banned ? ' | 🚫 БАН' : '') + '</span>' +
      '</div>' +
      '<div class="admin-user-actions">' +
        '<button class="btn-sm btn-buy"    onclick="adminGiveBalance(\'' + u.uid + '\', false)">💰 +Баланс</button>' +
        '<button class="btn-sm btn-cancel" onclick="adminGiveBalance(\'' + u.uid + '\', true)">💸 -Баланс</button>' +
        '<button class="btn-sm btn-open"   onclick="adminGiveItem(\'' + u.uid + '\')">🎁 Предмет</button>' +
        '<button class="btn-sm btn-open"   onclick="adminGiveCase(\'' + u.uid + '\')">📦 Кейс</button>' +
        '<button class="btn-sm btn-cancel" onclick="adminRemoveItem(\'' + u.uid + '\')">🗑 Видалити</button>' +
        '<button class="btn-sm ' + (u.banned ? 'btn-buy' : 'btn-cancel') + '" onclick="adminToggleBan(\'' + u.uid + '\',' + !u.banned + ')">' + (u.banned ? '✅ Розбан' : '🚫 Бан') + '</button>' +
      '</div>' +
    '</div>'
  ).join("");
  page.innerHTML =
    '<div class="page-header"><button class="btn-back" onclick="navigate(\'main\')">← Назад</button><h1 class="page-title">🔐 Адмін панель</h1></div>' +
    '<div class="admin-stats-bar"><span>👥 Гравців: <b>' + _adminUsers.length + '</b></span><span>🚫 Заблокованих: <b>' + _adminUsers.filter(u=>u.banned).length + '</b></span></div>' +
    '<input type="text" class="market-search" placeholder="🔍 Пошук гравця..." oninput="adminFilterUsers(this.value)" style="width:100%;box-sizing:border-box;margin-bottom:16px;">' +
    '<div id="admin-users-list" class="admin-users-list">' + usersHtml + '</div>';
}

function adminFilterUsers(q) {
  document.querySelectorAll('.admin-user-row').forEach(row => {
    row.style.display = row.textContent.toLowerCase().includes(q.toLowerCase()) ? '' : 'none';
  });
}

// ФІКС: тепер підтримує і видачу і відняття балансу
async function adminGiveBalance(uid, subtract) {
  const u = _adminUsers.find(x => x.uid === uid);
  openModal(
    '<h2 class="modal-title">' + (subtract ? '💸 Відняти баланс' : '💰 Видати баланс') + '</h2>' +
    '<p style="color:var(--text-muted);">Гравець: <b>' + (u?.username||uid) + '</b><br>Поточний баланс: <b>' + (u?.balance||0) + '</b></p>' +
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
    closeModal();
    showToast((subtract ? "💸 Відраховано " : "✅ Видано ") + amount + " нікусів!", "success");
    await renderAdmin();
  } catch (e) { showToast("Помилка: " + e.message, "error"); }
}

async function adminGiveItem(uid) {
  const u = _adminUsers.find(x => x.uid === uid);
  const rarOpts = Object.keys(RARITIES).map(k => '<option value="' + k + '">' + RARITIES[k].name + '</option>').join("");
  openModal(
    '<h2 class="modal-title">🎁 Видати предмет</h2>' +
    '<p style="color:var(--text-muted);">Гравець: <b>' + (u?.username||uid) + '</b></p>' +
    '<input type="text" id="admin-item-name" class="form-input" value="Адмін предмет" placeholder="Назва" style="width:100%;box-sizing:border-box;margin:8px 0;">' +
    '<select id="admin-item-rarity" style="width:100%;padding:10px;border-radius:8px;border:1px solid var(--border);background:var(--bg-card);color:var(--text);font-size:14px;margin:8px 0;">' + rarOpts + '</select>' +
    '<div style="display:flex;gap:8px;margin-top:12px;">' +
    '<button class="btn-primary" style="flex:1;" onclick="adminConfirmItem(\'' + uid + '\')">Видати</button>' +
    '<button class="btn-secondary" style="flex:1;" onclick="closeModal()">Скасувати</button></div>'
  );
}

async function adminConfirmItem(uid) {
  const name   = document.getElementById('admin-item-name')?.value.trim() || "Адмін предмет";
  const rarity = document.getElementById('admin-item-rarity')?.value || "common";
  try {
    const snap = await getDoc(doc(db, "users", uid));
    const inv  = [...(snap.data()?.inventory || [])];
    const ni   = { id:generateId(), type:"item", itemId:"admin_item", name, img:"img/items/placeholder.png", rarity, quality:"Прямо з цеху", premium:false, fromCase:"admin", obtainedAt:Date.now() };
    inv.push(ni);
    await updateDoc(doc(db, "users", uid), { inventory: inv });
    if (uid === currentUser?.uid) { gameState.inventory = inv; renderInventory(); }
    closeModal(); showToast('✅ Предмет "' + name + '" видано!', "success");
    await renderAdmin();
  } catch (e) { showToast("Помилка: " + e.message, "error"); }
}

async function adminGiveCase(uid) {
  const u = _adminUsers.find(x => x.uid === uid);
  const caseOpts = Object.values(CASES).map(c => '<option value="' + c.id + '">' + c.name + '</option>').join("");
  openModal(
    '<h2 class="modal-title">📦 Видати кейс</h2>' +
    '<p style="color:var(--text-muted);">Гравець: <b>' + (u?.username||uid) + '</b></p>' +
    '<select id="admin-case-id" style="width:100%;padding:10px;border-radius:8px;border:1px solid var(--border);background:var(--bg-card);color:var(--text);font-size:14px;margin:12px 0;">' + caseOpts + '</select>' +
    '<div style="display:flex;gap:8px;">' +
    '<button class="btn-primary" style="flex:1;" onclick="adminConfirmCase(\'' + uid + '\')">Видати</button>' +
    '<button class="btn-secondary" style="flex:1;" onclick="closeModal()">Скасувати</button></div>'
  );
}

async function adminConfirmCase(uid) {
  const caseId = document.getElementById('admin-case-id')?.value;
  const c = CASES[caseId];
  if (!c) { showToast("Кейс не знайдено!", "error"); return; }
  try {
    const snap = await getDoc(doc(db, "users", uid));
    const inv  = [...(snap.data()?.inventory || [])];
    inv.push({ id:generateId(), type:"case", caseId:c.id, name:c.name, img:c.img, boughtAt:Date.now() });
    await updateDoc(doc(db, "users", uid), { inventory: inv });
    if (uid === currentUser?.uid) { gameState.inventory = inv; renderInventory(); }
    closeModal(); showToast('✅ Кейс "' + c.name + '" видано!', "success");
    await renderAdmin();
  } catch (e) { showToast("Помилка: " + e.message, "error"); }
}

// НОВИНКА: видалити предмет/кейс з інвентаря
async function adminRemoveItem(uid) {
  const u = _adminUsers.find(x => x.uid === uid);
  try {
    const snap = await getDoc(doc(db, "users", uid));
    const inv  = snap.data()?.inventory || [];
    if (!inv.length) { showToast("Інвентар порожній!", "error"); return; }
    const opts = inv.map((it, i) =>
      '<option value="' + i + '">' + (it.type === "case" ? "📦 " : "🎁 ") + it.name + (it.rarity ? " [" + RARITIES[it.rarity]?.name + "]" : "") + '</option>'
    ).join("");
    openModal(
      '<h2 class="modal-title">🗑 Видалити предмет</h2>' +
      '<p style="color:var(--text-muted);">Гравець: <b>' + (u?.username||uid) + '</b></p>' +
      '<select id="admin-remove-idx" style="width:100%;padding:10px;border-radius:8px;border:1px solid var(--border);background:var(--bg-card);color:var(--text);font-size:14px;margin:12px 0;">' + opts + '</select>' +
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
    closeModal(); showToast('🗑 Видалено: "' + removed.name + '"', "success");
    await renderAdmin();
  } catch (e) { showToast("Помилка: " + e.message, "error"); }
}

async function adminToggleBan(uid, ban) {
  if (uid === currentUser?.uid) { showToast("Не можна банити себе!", "error"); return; }
  try {
    await updateDoc(doc(db, "users", uid), { banned: ban });
    showToast((ban ? "🚫 Заблоковано: " : "✅ Розблоковано: ") + (_adminUsers.find(u=>u.uid===uid)?.username||uid), ban?"error":"success");
    await renderAdmin();
  } catch (e) { showToast("Помилка: " + e.message, "error"); }
}

function injectAdminStyles() {
  if (document.getElementById('admin-styles')) return;
  const s = document.createElement('style');
  s.id = 'admin-styles';
  s.textContent = `
    .admin-stats-bar { display:flex; gap:24px; padding:12px 16px; background:var(--bg-card,#1a1a1a); border-radius:10px; margin-bottom:16px; font-size:14px; color:var(--text-muted,#888); }
    .admin-stats-bar b { color:var(--text,#fff); }
    .admin-users-list { display:flex; flex-direction:column; gap:10px; }
    .admin-user-row { display:flex; align-items:center; justify-content:space-between; flex-wrap:wrap; gap:10px; padding:14px 16px; background:var(--bg-card,#1a1a1a); border-radius:10px; border:1px solid var(--border,#333); }
    .admin-user-info { display:flex; flex-direction:column; gap:3px; }
    .admin-username { font-weight:700; font-size:15px; color:var(--text,#fff); }
    .admin-email { font-size:12px; color:var(--text-muted,#888); }
    .admin-stats { font-size:12px; color:var(--text-muted,#888); }
    .admin-user-actions { display:flex; gap:6px; flex-wrap:wrap; }
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
  const s = document.createElement("style");
  s.id = "roulette-styles";
  s.textContent = `
    .roulette-wrap { position:relative; margin:0 auto; max-width:520px; }
    .roulette-arrow { text-align:center; font-size:22px; color:#FFD700; margin-bottom:4px; animation:arrowPulse 0.6s ease-in-out infinite alternate; }
    @keyframes arrowPulse { from{transform:translateY(0)} to{transform:translateY(6px)} }
    .roulette-viewport { width:100%; overflow:hidden; border:2px solid var(--border,#333); border-radius:10px; background:var(--bg-card,#111); position:relative; }
    .roulette-viewport::before,.roulette-viewport::after { content:""; position:absolute; top:0; bottom:0; width:60px; z-index:2; pointer-events:none; }
    .roulette-viewport::before { left:0; background:linear-gradient(to right,var(--bg-card,#111),transparent); }
    .roulette-viewport::after  { right:0; background:linear-gradient(to left,var(--bg-card,#111),transparent); }
    .roulette-strip { display:flex; gap:10px; padding:10px; will-change:transform; }
    .roulette-card { flex-shrink:0; border:2px solid #555; border-radius:8px; padding:8px; text-align:center; background:var(--bg,#1a1a1a); }
    .roulette-card img { width:80px; height:80px; object-fit:contain; display:block; margin:0 auto; }
    .market-controls { display:flex; flex-wrap:wrap; gap:8px; margin-bottom:16px; align-items:center; }
    .market-search { flex:1; min-width:160px; padding:8px 12px; border-radius:8px; border:1px solid var(--border,#333); background:var(--bg-card,#111); color:var(--text,#fff); font-size:14px; }
    .market-sort-btn { padding:6px 12px; border-radius:8px; border:1px solid var(--border,#333); background:var(--bg-card,#111); color:var(--text-muted,#888); font-size:13px; cursor:pointer; transition:all 0.15s; }
    .market-sort-btn.active,.market-sort-btn:hover { background:var(--accent,#ff8c00); color:#fff; border-color:var(--accent,#ff8c00); }
    .market-card { position:relative; overflow:hidden; }
    .market-card-stripe { position:absolute; top:0; left:0; right:0; height:3px; }
    #craft-preview { background:var(--bg-card2); border:1px solid var(--border); border-radius:8px; padding:10px 14px; margin-bottom:14px; }
  `;
  document.head.appendChild(s);
}

function injectMarketControls() {
  const page = document.getElementById("page-market");
  if (!page || page.dataset.controlsInjected) return;
  page.dataset.controlsInjected = "true";
  const grid = document.getElementById("market-grid");
  const ctrl = document.createElement("div");
  ctrl.className = "market-controls";
  ctrl.innerHTML =
    '<input type="text" class="market-search" placeholder="🔍 Пошук предмета..." oninput="setMarketSearch(this.value)">' +
    '<button class="market-sort-btn active" data-sort="date" onclick="setMarketSort(\'date\')">🕒 Нові</button>' +
    '<button class="market-sort-btn" data-sort="price_asc" onclick="setMarketSort(\'price_asc\')">💰 Дешевші</button>' +
    '<button class="market-sort-btn" data-sort="price_desc" onclick="setMarketSort(\'price_desc\')">💎 Дорожчі</button>' +
    '<button class="market-sort-btn" data-sort="rarity" onclick="setMarketSort(\'rarity\')">⭐ Рідкість</button>';
  page.insertBefore(ctrl, grid);
}

// ── ІНІЦІАЛІЗАЦІЯ ──────────────────────────

window.addEventListener('DOMContentLoaded', () => {
  injectRouletteStyles();

  onAuthStateChanged(auth, (firebaseUser) => {
    if (firebaseUser) {
      if (_unsubProfile) { _unsubProfile(); _unsubProfile = null; }
      _unsubProfile = onSnapshot(doc(db, "users", firebaseUser.uid), (snap) => {
        if (!snap.exists()) return;
        const data = snap.data();
        if (data.banned) { alert("Акаунт заблоковано!"); logout(); return; }
        if (_isSaving) return;
        currentUser = { uid: firebaseUser.uid, ...data };
        gameState   = { ...currentUser };
        setNavVisible(true);
        updateBalanceDisplay();
        const loginPage    = document.getElementById('page-login');
        const registerPage = document.getElementById('page-register');
        const onAuthPage   = (loginPage?.style.display  || 'block') !== 'none'
                          || (registerPage?.style.display || 'none') !== 'none';
        if (onAuthPage) { loadCasesRemaining(); navigate("main"); }
      });
    } else {
      if (_unsubProfile) { _unsubProfile(); _unsubProfile = null; }
      currentUser = null; gameState = {}; _adminAuthed = false;
      setNavVisible(false); showAllPages(false);
      document.getElementById('page-login').style.display = 'block';
    }
  });
});

// ── ГЛОБАЛЬНІ ФУНКЦІЇ ──────────────────────

window.login              = login;
window.loginGoogle        = loginGoogle;
window.register           = register;
window.logout             = logout;
window.navigate           = navigate;
window.openAdmin          = openAdmin;
window.checkAdminPass     = checkAdminPass;
window.adminFilterUsers   = adminFilterUsers;
window.adminGiveBalance   = adminGiveBalance;
window.adminConfirmBalance= adminConfirmBalance;
window.adminGiveItem      = adminGiveItem;
window.adminConfirmItem   = adminConfirmItem;
window.adminGiveCase      = adminGiveCase;
window.adminConfirmCase   = adminConfirmCase;
window.adminRemoveItem    = adminRemoveItem;
window.adminConfirmRemove = adminConfirmRemove;
window.adminToggleBan     = adminToggleBan;
window.buyCase            = buyCase;
window.previewCase        = previewCase;
window.openCase           = openCase;
window.setInvSort         = setInvSort;
window.setInvFilter       = setInvFilter;
window.showSellModal      = showSellModal;
window.confirmSell        = confirmSell;
window.buyFromMarketItem  = buyFromMarketItem;
window.cancelListing      = cancelListing;
window.setMarketSort      = setMarketSort;
window.setMarketSearch    = setMarketSearch;
window.showTradeModal     = showTradeModal;
window.sendTrade          = sendTrade;
window.doAcceptTrade      = doAcceptTrade;
window.declineTrade       = declineTrade;
window.cancelTrade        = cancelTrade;
window.addFriend          = addFriend;
window.removeFriend       = removeFriend;
window.viewFriendProfile  = viewFriendProfile;
window.createClan         = createClan;
window.joinClan           = joinClan;
window.leaveClan          = leaveClan;
window.kickFromClan       = kickFromClan;
window.addCraftItem       = addCraftItem;
window.removeCraftItem    = removeCraftItem;
window.doCraft            = doCraft;
window.closeModal         = closeModal;