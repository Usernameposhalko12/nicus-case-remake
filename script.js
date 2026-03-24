// ============================================
// НІКУС КЕЙС РЕМЕЙК — ЯДРО ГРИ (Firebase)
// ============================================

import {
  auth, registerUser, loginUser, loginWithGoogle, saveUserData, logoutUser,
  listItemOnMarket, getMarketListings, removeMarketListing, buyMarketItem,
  sendTradeRequest, getMyTrades, updateTradeStatus,
  getAllUsernames, onAuthStateChanged, db
} from "./firebase.js";

import {
  doc, onSnapshot
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

// ── КЕЙСИ ──────────────────────────────────

const CASES = {
  autumn26: {
    id: "autumn26", name: "Осінь26",
    img: "img/cases/autumn26.png", price: 50, total: 2000, remaining: 2000,
    items: [
      { id: "item_a1", name: "Лут 1", img: "img/items/placeholder.png", rarity: "common"      },
      { id: "item_a2", name: "Лут 2", img: "img/items/placeholder.png", rarity: "exceptional"  },
      { id: "item_a3", name: "Лут 3", img: "img/items/placeholder.png", rarity: "epic"         },
      { id: "item_a4", name: "Лут 4", img: "img/items/placeholder.png", rarity: "legendary"    },
      { id: "item_a5", name: "Лут 5", img: "img/items/placeholder.png", rarity: "secret"       },
      { id: "item_a6", name: "Лут 6", img: "img/items/placeholder.png", rarity: "special"      },
    ]
  },
  autumn26box: {
    id: "autumn26box", name: "Осінь26 Бокс",
    img: "img/cases/autumn26box.png", price: 25, total: 3000, remaining: 3000,
    items: [
      { id: "item_b1", name: "Лут 1", img: "img/items/placeholder.png", rarity: "common"      },
      { id: "item_b2", name: "Лут 2", img: "img/items/placeholder.png", rarity: "exceptional"  },
      { id: "item_b3", name: "Лут 3", img: "img/items/placeholder.png", rarity: "epic"         },
    ]
  },
  autumnCollection: {
    id: "autumnCollection", name: "Осінній Колекційний Кейс 2026",
    img: "img/cases/autumncollection.png", price: 100, total: 500, remaining: 500,
    items: [
      { id: "item_c1", name: "Лут 1", img: "img/items/placeholder.png", rarity: "exceptional"  },
      { id: "item_c2", name: "Лут 2", img: "img/items/placeholder.png", rarity: "epic"         },
      { id: "item_c3", name: "Лут 3", img: "img/items/placeholder.png", rarity: "legendary"    },
      { id: "item_c4", name: "Лут 4", img: "img/items/placeholder.png", rarity: "secret"       },
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

// ── СТАН ───────────────────────────────────

let currentUser = null;
let gameState   = {};
let _unsubProfile = null; // слухач Firebase

// ── НАВІГАЦІЯ ──────────────────────────────

const AUTH_PAGES = ['login', 'register'];

async function navigate(page) {
  // Захист: якщо не залогінений — тільки login/register
  if (!currentUser && !AUTH_PAGES.includes(page)) {
    showAllPages(false);
    document.getElementById('page-login').style.display = 'block';
    return;
  }

  showAllPages(false);
  const targetPage = document.getElementById(`page-${page}`);
  if (targetPage) targetPage.style.display = 'block';

  document.querySelectorAll('.nav-item, .bottom-nav-item').forEach(btn => {
    btn.classList.toggle('active', btn.getAttribute('data-page') === page);
  });

  if (!currentUser) return;

  try {
    switch (page) {
      case 'main':
        renderMain();
        break;
      case 'shop':
        renderShop();
        break;
      case 'inventory':
        renderInventory();
        break;
      case 'market':
        injectRouletteStyles();
        injectMarketControls();
        await renderMarket();
        break;
      case 'trades':
        await renderTrades();
        break;
      case 'friends':
        renderFriends();
        break;
      case 'clan':
        renderClan();
        break;
      case 'profile':
        renderProfile();
        break;
      case 'craft':
        renderCraft();
        break;
    }
  } catch (error) {
    console.error(`Помилка сторінки ${page}:`, error);
    showToast("Помилка зв'язку з базою даних", "error");
  }
}

function showAllPages(show) {
  document.querySelectorAll('.page').forEach(p => {
    p.style.display = show ? 'block' : 'none';
  });
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
    currentUser = userData;
    gameState   = { ...userData };
    loadCasesRemaining();
    setNavVisible(true);
    navigate("main");
    showToast("Ласкаво просимо, " + userData.username + "! 🍂", "success");
  } catch (e) {
    showToast(e.message || "Помилка входу!", "error");
  } finally {
    btn.disabled = false; btn.textContent = "Увійти";
  }
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
    currentUser = userData;
    gameState   = { ...userData };
    setNavVisible(true);
    navigate("main");
    showToast("Акаунт створено! Вітаємо! 🍂", "success");
  } catch (e) {
    showToast(e.message || "Помилка реєстрації!", "error");
  } finally {
    btn.disabled = false; btn.textContent = "Зареєструватись";
  }
}

async function logout() {
  await saveData();
  if (_unsubProfile) { _unsubProfile(); _unsubProfile = null; }
  await logoutUser();
  currentUser = null;
  gameState   = {};
  setNavVisible(false);
  navigate("login");
}

async function loginGoogle() {
  try {
    const userData = await loginWithGoogle(() => {
      return new Promise(resolve => {
        openModal(`
          <h2 class="modal-title">&#128100; Обери нікнейм</h2>
          <p style="color:var(--text-muted);font-size:13px;margin-bottom:12px;">Перший вхід через Google — придумай нікнейм:</p>
          <input type="text" id="google-username-input" class="form-input"
            placeholder="Твій нікнейм..." style="width:100%;box-sizing:border-box;margin-bottom:16px;">
          <button class="btn-primary btn-full" id="google-confirm-btn">Підтвердити</button>
        `, false);
        document.getElementById('google-confirm-btn').onclick = () => {
          const val = document.getElementById('google-username-input').value.trim();
          if (!val) return;
          closeModal();
          resolve(val);
        };
      });
    });
    currentUser = userData;
    gameState   = { ...userData };
    loadCasesRemaining();
    setNavVisible(true);
    navigate("main");
    showToast("Ласкаво просимо, " + userData.username + "! 🍂", "success");
  } catch (e) {
    showToast(e.message || "Помилка Google входу!", "error");
  }
}

// ── ЗБЕРЕЖЕННЯ ─────────────────────────────

async function saveData() {
  if (!currentUser?.uid) return;
  gameState.lastSeen = Date.now();
  try {
    await saveUserData(currentUser.uid, gameState);
  } catch (e) {
    console.error("saveData error:", e);
  }
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

function updateNavBar() {
  const el = document.getElementById("nav-balance");
  if (el) el.textContent = "💰 " + (gameState.balance ?? 0) + " | " + (gameState.username || "");
}

// ── ГОЛОВНА ────────────────────────────────

function renderMain() {
  const cases   = (gameState.inventory || []).filter(i => i.type === "case").length;
  const items   = (gameState.inventory || []).filter(i => i.type === "item").length;
  const usernameEl = document.getElementById("main-username");
  const balanceEl  = document.getElementById("main-balance");
  const levelEl    = document.getElementById("main-level");
  const itemsEl    = document.getElementById("main-items");
  const casesEl    = document.getElementById("main-cases");
  const friendsEl  = document.getElementById("main-friends");
  const clanEl     = document.getElementById("main-clan-stat");
  if (usernameEl) usernameEl.textContent = gameState.username || "—";
  if (balanceEl)  balanceEl.textContent  = gameState.balance  ?? 0;
  if (levelEl)    levelEl.textContent    = gameState.level    || 1;
  if (itemsEl)    itemsEl.textContent    = items;
  if (casesEl)    casesEl.textContent    = cases;
  if (friendsEl)  friendsEl.textContent  = (gameState.friends || []).length;
  if (clanEl)     clanEl.textContent     = gameState.clan || "—";
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
    card.innerHTML = `
      <div class="case-limited-bar"><div class="case-limited-fill" style="width:${pct}%"></div></div>
      <img src="${c.img}" alt="${c.name}" onerror="this.src='img/placeholder.png'">
      <div class="case-name">${c.name}</div>
      <div class="case-remaining">${isEmpty ? "🚫 Розпродано" : "📦 Залишилось: " + c.remaining}</div>
      <div class="case-price">💰 ${c.price} нікусів</div>
      <button class="btn-buy" onclick="buyCase('${c.id}')" ${isEmpty ? "disabled" : ""}>${isEmpty ? "Розпродано" : "Купити"}</button>
      <button class="btn-preview" onclick="previewCase('${c.id}')">👁 Вміст</button>
    `;
    grid.appendChild(card);
  });
}

function buyCase(caseId) {
  const c = CASES[caseId];
  if (!c) return;
  if (c.remaining <= 0)            { showToast("Кейс розпродано!", "error"); return; }
  if (gameState.balance < c.price) { showToast("Недостатньо нікусів!", "error"); return; }

  gameState.balance -= c.price;
  c.remaining--;
  if (!gameState.inventory) gameState.inventory = [];
  gameState.inventory.push({
    id: generateId(), type: "case", caseId,
    name: c.name, img: c.img, boughtAt: Date.now(),
  });
  saveCasesRemaining();
  saveData();
  renderShop();
  updateBalanceDisplay();
  showToast("✅ Куплено: " + c.name + "!", "success");
}

function previewCase(caseId) {
  const c = CASES[caseId];
  if (!c) return;
  openModal(`
    <h2 class="modal-title">📦 ${c.name}</h2>
    <p style="color:var(--text-muted);margin-bottom:16px;">Можливі предмети:</p>
    <div class="preview-grid">
      ${c.items.map(item => {
        const r = RARITIES[item.rarity];
        return `<div class="preview-item" style="border-color:${r.color}">
          <img src="${item.img}" onerror="this.src='img/placeholder.png'" alt="${item.name}">
          <div class="preview-item-name">${item.name}</div>
          <div class="preview-item-rarity" style="color:${r.color}">${r.name}</div>
        </div>`;
      }).join("")}
    </div>
    <button class="btn-primary" onclick="closeModal()">Закрити</button>
  `);
}

// ── АНІМАЦІЯ ВІДКРИТТЯ КЕЙСУ ───────────────

function openCase(invIndex) {
  const item = gameState.inventory[invIndex];
  if (!item || item.type !== "case") return;
  const c = CASES[item.caseId];
  if (!c) return;

  const dropped = rollDrop(c);

  const ITEM_W   = 120;
  const ITEM_GAP = 10;
  const TOTAL_W  = ITEM_W + ITEM_GAP;
  const COUNT    = 60;
  const allItems = c.items;
  const strip    = [];
  for (let i = 0; i < COUNT; i++) {
    strip.push(allItems[Math.floor(Math.random() * allItems.length)]);
  }
  const winPos = 46 + Math.floor(Math.random() * 4);
  strip[winPos] = dropped;

  openModal(`
    <h2 class="modal-title" style="margin-bottom:16px;">🎁 Відкриття кейсу</h2>
    <div class="roulette-wrap">
      <div class="roulette-arrow">▼</div>
      <div class="roulette-viewport">
        <div class="roulette-strip" id="roulette-strip">
          ${strip.map((it, i) => {
            const r = RARITIES[it.rarity];
            return `<div class="roulette-card" style="border-color:${r.color};min-width:${ITEM_W}px;" data-idx="${i}">
              <img src="${it.img}" onerror="this.src='img/placeholder.png'">
              <div style="font-size:10px;color:${r.color};margin-top:4px;">${r.name}</div>
            </div>`;
          }).join("")}
        </div>
      </div>
    </div>
    <div id="roulette-result" style="display:none;text-align:center;margin-top:20px;"></div>
    <button id="roulette-close-btn" class="btn-primary" style="display:none;margin-top:16px;width:100%;" onclick="closeModal()">Забрати!</button>
  `, false);

  requestAnimationFrame(() => {
    const stripEl = document.getElementById("roulette-strip");
    if (!stripEl) return;

    const viewport   = stripEl.parentElement;
    const vpWidth    = viewport.offsetWidth;
    const winCenter  = winPos * TOTAL_W + ITEM_W / 2;
    const randOffset = (Math.random() - 0.5) * ITEM_W * 0.6;
    const targetX    = winCenter - vpWidth / 2 + randOffset;

    stripEl.style.transition = "none";
    stripEl.style.transform  = "translateX(0)";

    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        stripEl.style.transition = "transform 5s cubic-bezier(0.15, 0.8, 0.35, 1)";
        stripEl.style.transform  = `translateX(-${targetX}px)`;
      });
    });

    stripEl.addEventListener("transitionend", () => {
      gameState.inventory.splice(invIndex, 1);
      const newItem = {
        id: generateId(), type: "item",
        itemId: dropped.id, name: dropped.name,
        img: dropped.img, rarity: dropped.rarity,
        quality: rollQuality(), premium: Math.random() < 0.05,
        fromCase: item.caseId, obtainedAt: Date.now(),
      };
      gameState.inventory.push(newItem);
      const xpMap = { common:5, exceptional:10, epic:20, legendary:40, secret:80, special:200 };
      addXP(xpMap[dropped.rarity] || 5);
      saveData();
      renderInventory();

      const r = RARITIES[dropped.rarity];
      const resultEl = document.getElementById("roulette-result");
      const closeBtn = document.getElementById("roulette-close-btn");
      if (resultEl) {
        resultEl.style.display = "block";
        resultEl.innerHTML = `
          <div style="border:2px solid ${r.color};border-radius:12px;padding:20px;background:${r.color}22;display:inline-block;">
            <div style="color:#aaa;font-size:13px;margin-bottom:8px;">🎉 Ви отримали!</div>
            <img src="${newItem.img}" onerror="this.src='img/placeholder.png'" style="width:80px;height:80px;object-fit:contain;">
            <div style="font-weight:700;margin-top:8px;">${newItem.name}</div>
            <div style="color:${r.color}">${r.name}</div>
            <div style="color:#aaa;font-size:12px;">${newItem.quality}</div>
            ${newItem.premium ? '<div style="color:#FFD700;">⭐ ПРЕМІУМ</div>' : ""}
          </div>`;
      }
      if (closeBtn) closeBtn.style.display = "block";
    }, { once: true });
  });
}

function rollDrop(c) {
  const r = Math.random();
  let cum = 0;
  const byRarity = {};
  c.items.forEach(item => {
    if (!byRarity[item.rarity]) byRarity[item.rarity] = [];
    byRarity[item.rarity].push(item);
  });
  const order = ["special","secret","legendary","epic","exceptional","common"];
  for (const rarity of order) {
    if (!byRarity[rarity]) continue;
    cum += RARITIES[rarity].chance;
    if (r < cum) {
      const pool = byRarity[rarity];
      return pool[Math.floor(Math.random() * pool.length)];
    }
  }
  const common = byRarity["common"] || c.items;
  return common[Math.floor(Math.random() * common.length)];
}

function rollQuality() {
  const r = Math.random();
  let cum = 0;
  for (const q of QUALITIES) {
    cum += q.chance;
    if (r < cum) return q.name;
  }
  return QUALITIES[QUALITIES.length - 1].name;
}

// ── ІНВЕНТАР ───────────────────────────────

let invSort   = "rarity";
let invFilter = "all";

function renderInventory() {
  const grid = document.getElementById("inventory-grid");
  if (!grid) return;
  let items = [...(gameState.inventory || [])];
  if (invFilter !== "all") items = items.filter(i => i.type === invFilter);
  const rarityOrder = ["special","secret","legendary","epic","exceptional","common",""];
  if      (invSort === "rarity") items.sort((a,b) => rarityOrder.indexOf(a.rarity) - rarityOrder.indexOf(b.rarity));
  else if (invSort === "name")   items.sort((a,b) => a.name.localeCompare(b.name));
  else if (invSort === "date")   items.sort((a,b) => (b.obtainedAt||0) - (a.obtainedAt||0));

  if (!items.length) {
    grid.innerHTML = `<div class="empty-state">🍂 Інвентар порожній<br><small>Купи кейси у магазині!</small></div>`;
    return;
  }
  grid.innerHTML = items.map(item => {
    const r      = item.rarity ? RARITIES[item.rarity] : null;
    const color  = r ? r.color : "#888";
    const isCase = item.type === "case";
    const realIdx = gameState.inventory.findIndex(x => x.id === item.id);
    return `
      <div class="inv-card" style="border-color:${color}">
        <div class="inv-card-stripe" style="background:${color}"></div>
        <img src="${item.img}" onerror="this.src='img/placeholder.png'" alt="${item.name}">
        <div class="inv-card-name">${item.name}</div>
        ${r ? `<div class="inv-card-rarity" style="color:${color}">${r.name}</div>` : ""}
        ${item.quality  ? `<div class="inv-card-quality">${item.quality}</div>` : ""}
        ${item.premium  ? `<div class="inv-card-premium">⭐ Преміум</div>` : ""}
        <div class="inv-card-actions">
          ${isCase
            ? `<button class="btn-sm btn-open" onclick="openCase(${realIdx})">🎁 Відкрити</button>`
            : `<button class="btn-sm btn-sell" onclick="showSellModal(${realIdx})">💰 Продати</button>
               <button class="btn-sm btn-trade" onclick="showTradeModal(${realIdx})">🔄 Трейд</button>`}
        </div>
      </div>`;
  }).join("");
}

function setInvSort(sort) {
  invSort = sort;
  renderInventory();
  document.querySelectorAll(".sort-btn").forEach(b => b.classList.toggle("active", b.dataset.sort === sort));
}
function setInvFilter(filter) {
  invFilter = filter;
  renderInventory();
  document.querySelectorAll(".filter-btn").forEach(b => b.classList.toggle("active", b.dataset.filter === filter));
}

// ── РИНОК ──────────────────────────────────

let marketListings = [];
let marketSort     = "date";
let marketSearch   = "";

async function renderMarket() {
  const grid = document.getElementById("market-grid");
  if (!grid) return;
  grid.innerHTML = `<div class="empty-state">⏳ Завантаження...</div>`;

  try {
    marketListings = await getMarketListings();
  } catch (e) {
    grid.innerHTML = `<div class="empty-state">❌ Помилка завантаження ринку</div>`;
    return;
  }

  renderMarketGrid();
}

function renderMarketGrid() {
  const grid = document.getElementById("market-grid");
  if (!grid) return;

  let listings = [...marketListings];

  if (marketSearch) {
    const q = marketSearch.toLowerCase();
    listings = listings.filter(l => l.item && l.item.name && l.item.name.toLowerCase().includes(q));
  }

  const rarityOrder = ["special","secret","legendary","epic","exceptional","common",""];
  if      (marketSort === "date")       listings.sort((a,b) => (b.listedAt?.seconds||0) - (a.listedAt?.seconds||0));
  else if (marketSort === "price_asc")  listings.sort((a,b) => a.price - b.price);
  else if (marketSort === "price_desc") listings.sort((a,b) => b.price - a.price);
  else if (marketSort === "rarity")     listings.sort((a,b) => rarityOrder.indexOf(a.item?.rarity) - rarityOrder.indexOf(b.item?.rarity));

  if (!listings.length) {
    grid.innerHTML = `<div class="empty-state">🍂 Нічого не знайдено</div>`;
    return;
  }

  grid.innerHTML = listings.map(listing => {
    if (!listing.item) return "";
    const r      = listing.item.rarity ? RARITIES[listing.item.rarity] : null;
    const color  = r ? r.color : "#888";
    const isMine = listing.sellerName === currentUser?.username;
    return `
      <div class="market-card" style="border-color:${color}">
        <div class="market-card-stripe" style="background:${color}"></div>
        <img src="${listing.item.img || 'img/placeholder.png'}" onerror="this.src='img/placeholder.png'" alt="${listing.item.name}">
        <div class="market-item-name">${listing.item.name}</div>
        ${r ? `<div class="market-item-rarity" style="color:${color}">${r.name}</div>` : ""}
        ${listing.item.quality ? `<div class="market-item-quality">${listing.item.quality}</div>` : ""}
        <div class="market-seller">👤 ${listing.sellerName}</div>
        <div class="market-price">💰 ${listing.price} нікусів</div>
        ${isMine
          ? `<button class="btn-sm btn-cancel" onclick="cancelListing('${listing.docId}')">❌ Зняти</button>`
          : `<button class="btn-sm btn-buy" onclick="buyFromMarketItem('${listing.docId}')">Купити</button>`}
      </div>`;
  }).join("");
}

function setMarketSort(sort) {
  marketSort = sort;
  renderMarketGrid();
  document.querySelectorAll(".market-sort-btn").forEach(b => b.classList.toggle("active", b.dataset.sort === sort));
}

function setMarketSearch(val) {
  marketSearch = val;
  renderMarketGrid();
}

// ── ПРОДАЖ НА РИНКУ ────────────────────────

let _sellInvIdx = null; // зберігаємо індекс глобально

function showSellModal(invIdx) {
  _sellInvIdx = invIdx;
  const item = gameState.inventory[invIdx];
  if (!item) return;
  const r = item.rarity ? RARITIES[item.rarity] : null;
  openModal(`
    <h2 class="modal-title">💰 Виставити на ринок</h2>
    <div style="text-align:center;margin-bottom:16px;">
      <img src="${item.img || 'img/placeholder.png'}" onerror="this.src='img/placeholder.png'" style="width:80px;height:80px;object-fit:contain;">
      <div style="font-weight:700;margin-top:8px;">${item.name}</div>
      ${r ? `<div style="color:${r.color}">${r.name}</div>` : ""}
    </div>
    <label style="color:var(--text-muted);font-size:13px;">Ціна (нікусів):</label>
    <input type="number" id="sell-price" min="1" value="100"
      style="width:100%;padding:10px;border-radius:8px;border:1px solid var(--border);
      background:var(--bg-card);color:var(--text);font-size:16px;margin:8px 0 16px;box-sizing:border-box;">
    <div style="display:flex;gap:8px;">
      <button class="btn-primary" style="flex:1;" onclick="confirmSell()">✅ Виставити</button>
      <button class="btn-secondary" style="flex:1;" onclick="closeModal()">Скасувати</button>
    </div>
  `);
}

async function confirmSell() {
  const priceInput = document.getElementById('sell-price');
  const price = parseInt(priceInput?.value);

  if (isNaN(price) || price <= 0) {
    showToast("Введіть коректну ціну!", "error");
    return;
  }

  const item = gameState.inventory[_sellInvIdx];
  if (!item) {
    showToast("Предмет не знайдено!", "error");
    return;
  }

  const btn = document.querySelector("#modal .btn-primary");
  if (btn) { btn.disabled = true; btn.textContent = "Виставляємо..."; }

  try {
    // Знімаємо з інвентарю
    gameState.inventory.splice(_sellInvIdx, 1);
    // Виставляємо на ринок
    await listItemOnMarket(currentUser.uid, currentUser.username, { ...item }, price);
    await saveData();
    closeModal();
    showToast("✅ Предмет виставлено на ринок!", "success");
    renderInventory();
    _sellInvIdx = null;
  } catch (error) {
    // Повертаємо предмет якщо помилка
    gameState.inventory.splice(_sellInvIdx, 0, item);
    console.error("Помилка при продажу:", error);
    showToast("Не вдалося виставити предмет", "error");
    if (btn) { btn.disabled = false; btn.textContent = "✅ Виставити"; }
  }
}

async function buyFromMarketItem(docId) {
  const listing = marketListings.find(l => l.docId === docId);
  if (!listing) return;
  if (listing.sellerName === currentUser?.username) { showToast("Не можна купити свій предмет!", "error"); return; }
  if (gameState.balance < listing.price)            { showToast("Недостатньо нікусів!", "error"); return; }

  try {
    await buyMarketItem(currentUser.uid, gameState, listing);
    gameState.balance -= listing.price;
    if (!gameState.inventory) gameState.inventory = [];
    gameState.inventory.push({ ...listing.item, id: generateId(), obtainedAt: Date.now() });
    await saveData();
    updateBalanceDisplay();
    await renderMarket();
    showToast("✅ Куплено: " + listing.item.name + "!", "success");
  } catch (e) {
    showToast("Помилка: " + e.message, "error");
  }
}

async function cancelListing(docId) {
  const listing = marketListings.find(l => l.docId === docId);
  if (!listing || listing.sellerName !== currentUser?.username) return;
  try {
    await removeMarketListing(docId);
    if (!gameState.inventory) gameState.inventory = [];
    gameState.inventory.push({ ...listing.item, id: listing.item.id || generateId() });
    await saveData();
    await renderMarket();
    showToast("Лот знято з ринку", "success");
  } catch (e) {
    showToast("Помилка: " + e.message, "error");
  }
}

// ── ТРЕЙДИ ─────────────────────────────────

async function renderTrades() {
  const list = document.getElementById("trades-list");
  if (!list) return;
  list.innerHTML = `<div class="empty-state">⏳ Завантаження...</div>`;

  try {
    const trades = await getMyTrades(currentUser.uid);
    if (!trades.length) {
      list.innerHTML = `<div class="empty-state">🍂 Немає активних трейдів</div>`;
      return;
    }
    list.innerHTML = trades.map(trade => {
      const isSender   = trade.fromUid === currentUser.uid;
      const statusText = {
        pending:   "⏳ Очікує підтвердження",
        confirmed: "✅ Підтверджено",
        cancelled: "❌ Скасовано"
      }[trade.status] || trade.status;
      return `
        <div class="trade-card">
          <div class="trade-header">
            <span>${isSender ? "📤 Надіслано → " + trade.toUsername : "📥 Від " + trade.fromUsername}</span>
            <span class="trade-status">${statusText}</span>
          </div>
          <div class="trade-items">
            <div>
              <div style="color:var(--text-muted);font-size:12px;margin-bottom:6px;">Ти даєш:</div>
              ${(trade.offerItems||[]).map(item => `<div class="trade-item"><img src="${item.img || 'img/placeholder.png'}" onerror="this.src='img/placeholder.png'"><span>${item.name}</span></div>`).join("")}
            </div>
            <div style="font-size:24px;align-self:center;">&#x21c4;</div>
            <div>
              <div style="color:var(--text-muted);font-size:12px;margin-bottom:6px;">Ти отримуєш:</div>
              ${(trade.wantItems||[]).map(item => `<div class="trade-item"><img src="${item.img || 'img/placeholder.png'}" onerror="this.src='img/placeholder.png'"><span>${item.name}</span></div>`).join("")}
            </div>
          </div>
          ${!isSender && trade.status === "pending"
            ? `<div style="display:flex;gap:8px;margin-top:12px;">
                 <button class="btn-primary" onclick="acceptTrade('${trade.docId}')">✅ Прийняти</button>
                 <button class="btn-secondary" onclick="declineTrade('${trade.docId}')">❌ Відхилити</button>
               </div>` : ""}
          ${isSender && trade.status === "pending"
            ? `<button class="btn-secondary" onclick="cancelTrade('${trade.docId}')" style="margin-top:12px;">Скасувати</button>` : ""}
        </div>`;
    }).join("");
  } catch (e) {
    list.innerHTML = `<div class="empty-state">❌ Помилка завантаження трейдів</div>`;
  }
}

async function showTradeModal(invIdx) {
  const item     = gameState.inventory[invIdx];
  if (!item) return;
  const allUsers = await getAllUsernames().catch(() => []);
  const others   = allUsers.filter(u => u !== currentUser?.username);
  openModal(`
    <h2 class="modal-title">🔄 Надіслати трейд</h2>
    <label style="color:var(--text-muted);font-size:13px;">Кому:</label>
    <select id="trade-target" style="width:100%;padding:10px;border-radius:8px;border:1px solid var(--border);background:var(--bg-card);color:var(--text);font-size:14px;margin:8px 0 16px;box-sizing:border-box;">
      ${others.length
        ? others.map(u => `<option value="${u}">${u}</option>`).join("")
        : "<option value=''>Немає гравців</option>"}
    </select>
    <div style="font-weight:600;margin-bottom:8px;">Ти пропонуєш:</div>
    <div class="trade-item" style="background:var(--bg-card);padding:10px;border-radius:8px;">
      <img src="${item.img || 'img/placeholder.png'}" onerror="this.src='img/placeholder.png'"><span>${item.name}</span>
    </div>
    <div style="font-weight:600;margin:16px 0 8px;">Що хочеш отримати:</div>
    <input type="text" id="trade-want" placeholder="Назва предмета..."
      style="width:100%;padding:10px;border-radius:8px;border:1px solid var(--border);background:var(--bg-card);color:var(--text);font-size:14px;margin-bottom:16px;box-sizing:border-box;">
    <div style="display:flex;gap:8px;">
      <button class="btn-primary" style="flex:1;" onclick="sendTrade(${invIdx})">📤 Надіслати</button>
      <button class="btn-secondary" style="flex:1;" onclick="closeModal()">Скасувати</button>
    </div>
  `);
}

async function sendTrade(invIdx) {
  const target = document.getElementById("trade-target")?.value;
  const want   = document.getElementById("trade-want")?.value.trim();
  const item   = gameState.inventory[invIdx];
  if (!target) { showToast("Виберіть гравця!", "error"); return; }
  if (!want)   { showToast("Вкажіть що хочете!", "error"); return; }
  try {
    await sendTradeRequest(
      currentUser.uid, currentUser.username, target,
      [{ ...item }],
      [{ name: want, img: "img/items/placeholder.png" }]
    );
    closeModal();
    showToast("📤 Трейд надіслано!", "success");
  } catch (e) {
    showToast(e.message || "Помилка!", "error");
  }
}

async function acceptTrade(docId) {
  await updateTradeStatus(docId, "confirmed");
  renderTrades();
  showToast("✅ Трейд підтверджено!", "success");
}
async function declineTrade(docId) {
  await updateTradeStatus(docId, "cancelled");
  renderTrades();
  showToast("❌ Трейд відхилено", "error");
}
async function cancelTrade(docId) {
  await updateTradeStatus(docId, "cancelled");
  renderTrades();
  showToast("Трейд скасовано", "success");
}

// ── ПРОФІЛЬ ────────────────────────────────

function renderProfile() {
  const user = gameState;
  const usernameEl = document.getElementById("profile-username");
  const levelEl    = document.getElementById("profile-level");
  const balanceEl  = document.getElementById("profile-balance");
  const itemsEl    = document.getElementById("profile-items");
  const clanEl     = document.getElementById("profile-clan");
  const lastEl     = document.getElementById("profile-lastseen");
  if (usernameEl) usernameEl.textContent = user.username || "—";
  if (levelEl)    levelEl.textContent    = user.level    || 1;
  if (balanceEl)  balanceEl.textContent  = user.balance  ?? 0;
  if (itemsEl)    itemsEl.textContent    = (user.inventory||[]).length;
  if (clanEl)     clanEl.textContent     = user.clan     || "Без клану";
  if (lastEl)     lastEl.textContent     = user.lastSeen ? new Date(user.lastSeen).toLocaleDateString("uk-UA") : "—";
}

// ── ДРУЗІ ──────────────────────────────────

function renderFriends() {
  const list = document.getElementById("friends-list");
  if (!list) return;
  if (!(gameState.friends||[]).length) {
    list.innerHTML = `<div class="empty-state">🍂 Список друзів порожній</div>`;
    return;
  }
  list.innerHTML = (gameState.friends || []).map(username => `
    <div class="friend-card">
      <div class="friend-avatar">👤</div>
      <div class="friend-info">
        <div class="friend-name">${username}</div>
      </div>
      <div class="friend-actions">
        <button class="btn-sm btn-cancel" onclick="removeFriend('${username}')">Видалити</button>
      </div>
    </div>`).join("");
}

async function addFriend() {
  const input    = document.getElementById("friend-input");
  const username = input?.value.trim();
  if (!username)                                    { showToast("Введіть нікнейм!", "error"); return; }
  if (username === currentUser?.username)           { showToast("Не можна додати себе!", "error"); return; }
  if ((gameState.friends||[]).includes(username))   { showToast("Вже в друзях!", "error"); return; }
  if (!gameState.friends) gameState.friends = [];
  gameState.friends.push(username);
  await saveData();
  if (input) input.value = "";
  renderFriends();
  showToast("✅ Додано до друзів!", "success");
}

async function removeFriend(username) {
  gameState.friends = (gameState.friends||[]).filter(f => f !== username);
  await saveData();
  renderFriends();
  showToast("Видалено з друзів", "success");
}

// ── КЛАН ───────────────────────────────────

function renderClan() {
  const section = document.getElementById("clan-section");
  if (!section) return;
  if (!gameState.clan) {
    section.innerHTML = `
      <div class="empty-state">🍂 Ти не в клані</div>
      <div style="display:flex;gap:10px;margin-top:20px;flex-wrap:wrap;">
        <div style="flex:1;min-width:200px;">
          <input type="text" id="clan-name-input" placeholder="Назва клану..."
            style="width:100%;padding:10px;border-radius:8px;border:1px solid var(--border);background:var(--bg-card);color:var(--text);font-size:14px;box-sizing:border-box;margin-bottom:8px;">
          <button class="btn-primary" style="width:100%;" onclick="createClan()">⚔️ Створити клан</button>
        </div>
        <div style="flex:1;min-width:200px;">
          <input type="text" id="clan-join-input" placeholder="ID клану..."
            style="width:100%;padding:10px;border-radius:8px;border:1px solid var(--border);background:var(--bg-card);color:var(--text);font-size:14px;box-sizing:border-box;margin-bottom:8px;">
          <button class="btn-secondary" style="width:100%;" onclick="joinClan()">🚪 Вступити в клан</button>
        </div>
      </div>`;
    return;
  }
  const clanData = JSON.parse(localStorage.getItem("clan_" + gameState.clan) || "{}");
  const isLeader = clanData.leader === currentUser?.username;
  section.innerHTML = `
    <div class="clan-header">
      <div class="clan-name">⚔️ ${clanData.name || gameState.clan}</div>
      <div class="clan-id">ID: ${gameState.clan}</div>
      <div class="clan-members">👥 Учасників: ${(clanData.members||[]).length}</div>
    </div>
    <div class="clan-members-list">
      ${(clanData.members||[]).map(m => `
        <div class="friend-card">
          <div class="friend-avatar">${m === clanData.leader ? "👑" : "👤"}</div>
          <div class="friend-info">
            <div class="friend-name">${m}</div>
            <div class="friend-level">${m === clanData.leader ? "Лідер" : "Учасник"}</div>
          </div>
          ${isLeader && m !== currentUser?.username
            ? `<button class="btn-sm btn-cancel" onclick="kickFromClan('${m}')">Виключити</button>` : ""}
        </div>`).join("")}
    </div>
    <button class="btn-secondary" style="margin-top:16px;width:100%;" onclick="leaveClan()">🚪 Покинути клан</button>`;
}

function createClan() {
  const name = document.getElementById("clan-name-input")?.value.trim();
  if (!name) { showToast("Введіть назву клану!", "error"); return; }
  const clanId = generateId();
  const clanData = { id:clanId, name, leader:currentUser.username, members:[currentUser.username], createdAt:Date.now() };
  localStorage.setItem("clan_" + clanId, JSON.stringify(clanData));
  gameState.clan = clanId;
  saveData();
  renderClan();
  showToast("⚔️ Клан створено!", "success");
}

function joinClan() {
  const id = document.getElementById("clan-join-input")?.value.trim();
  const clanData = localStorage.getItem("clan_" + id);
  if (!clanData) { showToast("Клан не знайдено!", "error"); return; }
  const clan = JSON.parse(clanData);
  if (clan.members.includes(currentUser.username)) { showToast("Ти вже в цьому клані!", "error"); return; }
  clan.members.push(currentUser.username);
  localStorage.setItem("clan_" + id, JSON.stringify(clan));
  gameState.clan = id;
  saveData();
  renderClan();
  showToast("✅ Ти вступив у клан!", "success");
}

function leaveClan() {
  const id = gameState.clan;
  const data = localStorage.getItem("clan_" + id);
  if (!data) return;
  const clan = JSON.parse(data);
  clan.members = clan.members.filter(m => m !== currentUser.username);
  localStorage.setItem("clan_" + id, JSON.stringify(clan));
  gameState.clan = null;
  saveData();
  renderClan();
  showToast("Ти покинув клан", "success");
}

function kickFromClan(username) {
  const id = gameState.clan;
  const data = localStorage.getItem("clan_" + id);
  if (!data) return;
  const clan = JSON.parse(data);
  clan.members = clan.members.filter(m => m !== username);
  localStorage.setItem("clan_" + id, JSON.stringify(clan));
  renderClan();
  showToast("Гравця виключено з клану", "success");
}

// ── КРАФТ ──────────────────────────────────

let craftSelected = [];

function renderCraft() {
  const slots = document.getElementById("craft-slots");
  const btn   = document.getElementById("craft-btn");
  if (!slots) return;
  slots.innerHTML = craftSelected.map((item, i) => `
    <div class="craft-slot filled" onclick="removeCraftItem(${i})">
      <img src="${item.img || 'img/placeholder.png'}" onerror="this.src='img/placeholder.png'">
      <div>${item.name}</div>
      <div style="font-size:10px;color:#aaa;">✕ прибрати</div>
    </div>`).join("") + (craftSelected.length < 5
      ? Array(5 - craftSelected.length).fill(0).map(() =>
          `<div class="craft-slot empty" onclick="showCraftPicker()">+</div>`).join("")
      : "");
  if (btn) btn.disabled = craftSelected.length !== 5;
  const picker = document.getElementById("craft-picker");
  if (picker) {
    const items = (gameState.inventory||[]).filter(i => i.type==="item" && !craftSelected.find(s=>s.id===i.id));
    picker.innerHTML = items.map(item => {
      const r = item.rarity ? RARITIES[item.rarity] : null;
      return `<div class="craft-pick-item" onclick="addCraftItem('${item.id}')">
        <img src="${item.img || 'img/placeholder.png'}" onerror="this.src='img/placeholder.png'">
        <span>${item.name}</span>
        ${r ? `<span style="color:${r.color};font-size:11px;">${r.name}</span>` : ""}
      </div>`;
    }).join("") || `<div class="empty-state">Немає предметів для крафту</div>`;
  }
}

function addCraftItem(itemId) {
  if (craftSelected.length >= 5) return;
  const item = (gameState.inventory||[]).find(i => i.id === itemId);
  if (!item) return;
  craftSelected.push(item);
  renderCraft();
}
function removeCraftItem(index) {
  craftSelected.splice(index, 1);
  renderCraft();
}
function showCraftPicker() {
  // picker вже показано нижче слотів, нічого додаткового не треба
}

async function doCraft() {
  if (craftSelected.length !== 5) return;
  const rarityOrder = ["common","exceptional","epic","legendary","secret","special"];
  const maxRarity   = craftSelected.reduce((max, item) => {
    const idx = rarityOrder.indexOf(item.rarity);
    return idx > rarityOrder.indexOf(max) ? item.rarity : max;
  }, "common");
  const maxIdx    = rarityOrder.indexOf(maxRarity);
  const newRarity = rarityOrder[Math.min(maxIdx + 1, rarityOrder.length - 1)];
  craftSelected.forEach(selected => {
    const idx = gameState.inventory.findIndex(i => i.id === selected.id);
    if (idx !== -1) gameState.inventory.splice(idx, 1);
  });
  const newItem = {
    id: generateId(), type:"item", itemId:"crafted_"+newRarity,
    name:"Крафтовий предмет", img:"img/items/placeholder.png",
    rarity:newRarity, quality:rollQuality(), premium:Math.random()<0.03,
    fromCase:"craft", obtainedAt:Date.now(),
  };
  gameState.inventory.push(newItem);
  craftSelected = [];
  await saveData();
  renderCraft();
  const r = RARITIES[newRarity];
  openModal(`
    <div style="text-align:center;border:2px solid ${r.color};border-radius:12px;padding:24px;background:${r.color}22;">
      <div style="font-size:18px;margin-bottom:8px;">⚗️ Крафт успішний!</div>
      <img src="${newItem.img}" onerror="this.src='img/placeholder.png'" style="width:80px;height:80px;object-fit:contain;margin:12px 0;">
      <div style="font-weight:700;">${newItem.name}</div>
      <div style="color:${r.color}">${r.name}</div>
      <div style="color:#aaa;font-size:12px;">${newItem.quality}</div>
      <button class="btn-primary" onclick="closeModal()" style="margin-top:16px;width:100%;">Забрати!</button>
    </div>
  `);
}

// ── XP ─────────────────────────────────────

function addXP(amount) {
  gameState.xp = (gameState.xp||0) + amount;
  const xpNeeded = (gameState.level||1) * 100;
  if (gameState.xp >= xpNeeded) {
    gameState.xp    -= xpNeeded;
    gameState.level  = (gameState.level||1) + 1;
    showToast("🎉 Рівень " + gameState.level + "!", "success");
  }
}

// ── UI ХЕЛПЕРИ ─────────────────────────────

function openModal(html, closable = true) {
  const modal   = document.getElementById("modal");
  const body    = document.getElementById("modal-body");
  body.innerHTML = html;
  modal.style.display = "flex";
  modal.onclick = closable
    ? (e => { if (e.target === modal) closeModal(); })
    : null;
}

function closeModal() {
  document.getElementById("modal").style.display = "none";
}

function showToast(message, type) {
  const toast = document.getElementById("toast");
  toast.textContent = message;
  toast.className   = "toast show " + (type || "");
  clearTimeout(window._toastT);
  window._toastT = setTimeout(() => { toast.className = "toast"; }, 3000);
}

function updateBalanceDisplay() {
  const el  = document.getElementById("main-balance");
  const nav = document.getElementById("nav-balance");
  if (el)  el.textContent  = gameState.balance ?? 0;
  if (nav) nav.textContent = "💰 " + (gameState.balance ?? 0) + "  |  " + (gameState.username || "");
}

function generateId() {
  return Math.random().toString(36).slice(2) + Date.now().toString(36);
}

// ── CSS ДЛЯ РУЛЕТКИ ────────────────────────

function injectRouletteStyles() {
  if (document.getElementById("roulette-styles")) return;
  const style = document.createElement("style");
  style.id = "roulette-styles";
  style.textContent = `
    .roulette-wrap {
      position: relative;
      margin: 0 auto;
      max-width: 520px;
    }
    .roulette-arrow {
      text-align: center;
      font-size: 22px;
      color: #FFD700;
      margin-bottom: 4px;
      animation: arrowPulse 0.6s ease-in-out infinite alternate;
    }
    @keyframes arrowPulse {
      from { transform: translateY(0); }
      to   { transform: translateY(6px); }
    }
    .roulette-viewport {
      width: 100%;
      overflow: hidden;
      border: 2px solid var(--border, #333);
      border-radius: 10px;
      background: var(--bg-card, #111);
      position: relative;
    }
    .roulette-viewport::before,
    .roulette-viewport::after {
      content: "";
      position: absolute;
      top: 0; bottom: 0;
      width: 60px;
      z-index: 2;
      pointer-events: none;
    }
    .roulette-viewport::before { left: 0;  background: linear-gradient(to right, var(--bg-card, #111), transparent); }
    .roulette-viewport::after  { right: 0; background: linear-gradient(to left,  var(--bg-card, #111), transparent); }
    .roulette-strip {
      display: flex;
      gap: 10px;
      padding: 10px;
      will-change: transform;
    }
    .roulette-card {
      flex-shrink: 0;
      border: 2px solid #555;
      border-radius: 8px;
      padding: 8px;
      text-align: center;
      background: var(--bg, #1a1a1a);
    }
    .roulette-card img {
      width: 80px;
      height: 80px;
      object-fit: contain;
      display: block;
      margin: 0 auto;
    }
    .market-controls {
      display: flex;
      flex-wrap: wrap;
      gap: 8px;
      margin-bottom: 16px;
      align-items: center;
    }
    .market-search {
      flex: 1;
      min-width: 160px;
      padding: 8px 12px;
      border-radius: 8px;
      border: 1px solid var(--border, #333);
      background: var(--bg-card, #111);
      color: var(--text, #fff);
      font-size: 14px;
    }
    .market-sort-btn {
      padding: 6px 12px;
      border-radius: 8px;
      border: 1px solid var(--border, #333);
      background: var(--bg-card, #111);
      color: var(--text-muted, #888);
      font-size: 13px;
      cursor: pointer;
      transition: all 0.15s;
    }
    .market-sort-btn.active,
    .market-sort-btn:hover {
      background: var(--accent, #ff8c00);
      color: #fff;
      border-color: var(--accent, #ff8c00);
    }
    .market-card {
      position: relative;
      overflow: hidden;
    }
    .market-card-stripe {
      position: absolute;
      top: 0; left: 0; right: 0;
      height: 3px;
    }
  `;
  document.head.appendChild(style);
}

// ── КОНТРОЛИ РИНКУ ─────────────────────────

function injectMarketControls() {
  const page = document.getElementById("page-market");
  if (!page || page.dataset.controlsInjected) return;
  page.dataset.controlsInjected = "true";

  const grid = document.getElementById("market-grid");
  const controls = document.createElement("div");
  controls.className = "market-controls";
  controls.innerHTML = `
    <input type="text" class="market-search" placeholder="🔍 Пошук предмета..." oninput="setMarketSearch(this.value)">
    <button class="market-sort-btn active" data-sort="date"       onclick="setMarketSort('date')">🕒 Нові</button>
    <button class="market-sort-btn"        data-sort="price_asc"  onclick="setMarketSort('price_asc')">💰 Дешевші</button>
    <button class="market-sort-btn"        data-sort="price_desc" onclick="setMarketSort('price_desc')">💎 Дорожчі</button>
    <button class="market-sort-btn"        data-sort="rarity"     onclick="setMarketSort('rarity')">⭐ Рідкість</button>
  `;
  page.insertBefore(controls, grid);
}

// ── ІНІЦІАЛІЗАЦІЯ ──────────────────────────

window.addEventListener('DOMContentLoaded', () => {
  injectRouletteStyles();

  onAuthStateChanged(auth, (user) => {
    if (user) {
      // Відписуємося від попереднього слухача якщо є
      if (_unsubProfile) { _unsubProfile(); _unsubProfile = null; }

      // Підписуємося на живі оновлення профілю
      _unsubProfile = onSnapshot(doc(db, "users", user.uid), (snapshot) => {
        if (!snapshot.exists()) return;
        const data = snapshot.data();

        if (data.banned) {
          alert("Акаунт заблоковано!");
          logout();
          return;
        }

        currentUser = { uid: user.uid, ...data };
        gameState   = { ...currentUser };

        setNavVisible(true);
        updateBalanceDisplay();

        // Якщо зараз на сторінці логіну або реєстрації — перекидаємо на головну
        const loginPage    = document.getElementById('page-login');
        const registerPage = document.getElementById('page-register');
        const isOnAuthPage = loginPage?.style.display !== 'none'
                          || registerPage?.style.display !== 'none';
        if (isOnAuthPage) {
          loadCasesRemaining();
          navigate("main");
        }
      });
    } else {
      // Не авторизований
      if (_unsubProfile) { _unsubProfile(); _unsubProfile = null; }
      currentUser = null;
      gameState   = {};
      setNavVisible(false);
      showAllPages(false);
      document.getElementById('page-login').style.display = 'block';
    }
  });
});

// ── ГЛОБАЛЬНІ ФУНКЦІЇ (onclick у HTML) ─────

window.login              = login;
window.loginGoogle        = loginGoogle;
window.register           = register;
window.logout             = logout;
window.navigate           = navigate;
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
window.acceptTrade        = acceptTrade;
window.declineTrade       = declineTrade;
window.cancelTrade        = cancelTrade;
window.addFriend          = addFriend;
window.removeFriend       = removeFriend;
window.createClan         = createClan;
window.joinClan           = joinClan;
window.leaveClan          = leaveClan;
window.kickFromClan       = kickFromClan;
window.addCraftItem       = addCraftItem;
window.removeCraftItem    = removeCraftItem;
window.showCraftPicker    = showCraftPicker;
window.doCraft            = doCraft;
window.closeModal         = closeModal;