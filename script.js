// ============================================
// НІКУС КЕЙС РЕМЕЙК — ЯДРО ГРИ
// ============================================

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
    id:       "autumn26",
    name:     "Осінь26",
    img:      "img/cases/autumn26.png",
    price:    50,
    total:    2000,
    remaining: 2000,
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
    id:       "autumn26box",
    name:     "Осінь26 Бокс",
    img:      "img/cases/autumn26box.png",
    price:    25,
    total:    3000,
    remaining: 3000,
    items: [
      { id: "item_b1", name: "Лут 1", img: "img/items/placeholder.png", rarity: "common"      },
      { id: "item_b2", name: "Лут 2", img: "img/items/placeholder.png", rarity: "exceptional"  },
      { id: "item_b3", name: "Лут 3", img: "img/items/placeholder.png", rarity: "epic"         },
    ]
  },
  autumnCollection: {
    id:       "autumnCollection",
    name:     "Осінній Колекційний Кейс 2026",
    img:      "img/cases/autumncollection.png",
    price:    100,
    total:    500,
    remaining: 500,
    items: [
      { id: "item_c1", name: "Лут 1", img: "img/items/placeholder.png", rarity: "exceptional"  },
      { id: "item_c2", name: "Лут 2", img: "img/items/placeholder.png", rarity: "epic"         },
      { id: "item_c3", name: "Лут 3", img: "img/items/placeholder.png", rarity: "legendary"    },
      { id: "item_c4", name: "Лут 4", img: "img/items/placeholder.png", rarity: "secret"       },
    ]
  },
  autumnGift: {
    id:       "autumnGift",
    name:     "Осінній Дар",
    img:      "img/cases/autumngift.png",
    price:    150,
    total:    250,
    remaining: 250,
    items: [
      { id: "item_d1", name: "Лут 1", img: "img/items/placeholder.png", rarity: "epic"      },
      { id: "item_d2", name: "Лут 2", img: "img/items/placeholder.png", rarity: "legendary" },
      { id: "item_d3", name: "Лут 3", img: "img/items/placeholder.png", rarity: "secret"    },
      { id: "item_d4", name: "Лут 4", img: "img/items/placeholder.png", rarity: "special"   },
    ]
  },
  autumnLeaves: {
    id:       "autumnLeaves",
    name:     "AutumnLeaves Case",
    img:      "img/cases/autumnleaves.png",
    price:    200,
    total:    100,
    remaining: 100,
    items: [
      { id: "item_e1", name: "Лут 1", img: "img/items/placeholder.png", rarity: "legendary" },
      { id: "item_e2", name: "Лут 2", img: "img/items/placeholder.png", rarity: "secret"    },
      { id: "item_e3", name: "Лут 3", img: "img/items/placeholder.png", rarity: "special"   },
    ]
  },
  autumnVibe: {
    id:       "autumnVibe",
    name:     "AutumnVibe Case",
    img:      "img/cases/autumnvibe.png",
    price:    200,
    total:    100,
    remaining: 100,
    items: [
      { id: "item_f1", name: "Лут 1", img: "img/items/placeholder.png", rarity: "legendary" },
      { id: "item_f2", name: "Лут 2", img: "img/items/placeholder.png", rarity: "secret"    },
      { id: "item_f3", name: "Лут 3", img: "img/items/placeholder.png", rarity: "special"   },
    ]
  },
  leaffall: {
    id:       "leaffall",
    name:     "Leaffall Case",
    img:      "img/cases/leaffall.png",
    price:    200,
    total:    100,
    remaining: 100,
    items: [
      { id: "item_g1", name: "Лут 1", img: "img/items/placeholder.png", rarity: "legendary" },
      { id: "item_g2", name: "Лут 2", img: "img/items/placeholder.png", rarity: "secret"    },
      { id: "item_g3", name: "Лут 3", img: "img/items/placeholder.png", rarity: "special"   },
    ]
  },
  harvest: {
    id:       "harvest",
    name:     "HarvestCase",
    img:      "img/cases/harvest.png",
    price:    200,
    total:    100,
    remaining: 100,
    items: [
      { id: "item_h1", name: "Лут 1", img: "img/items/placeholder.png", rarity: "legendary" },
      { id: "item_h2", name: "Лут 2", img: "img/items/placeholder.png", rarity: "secret"    },
      { id: "item_h3", name: "Лут 3", img: "img/items/placeholder.png", rarity: "special"   },
    ]
  },
};

// ── СТАН ГРАВЦЯ ────────────────────────────

let currentUser = null;

let gameState = {
  username:  "",
  email:     "",
  balance:   100,
  inventory: [],
  level:     1,
  xp:        0,
  friends:   [],
  clan:      null,
};

// ── ПОТОЧНА СТОРІНКА ───────────────────────

let currentPage = "login";

// ── НАВІГАЦІЯ ──────────────────────────────

function navigate(page) {
  currentPage = page;
  const pages = [
    "login", "register", "main",
    "shop", "inventory", "market",
    "profile", "craft", "trades",
    "friends", "clan"
  ];
  pages.forEach(p => {
    const el = document.getElementById("page-" + p);
    if (el) el.style.display = p === page ? "block" : "none";
  });

  // Оновлюємо активний пункт навбару
  document.querySelectorAll(".nav-item").forEach(item => {
    item.classList.toggle("active", item.dataset.page === page);
  });

  // Рендеримо потрібну сторінку
  if      (page === "shop")      renderShop();
  else if (page === "inventory") renderInventory();
  else if (page === "market")    renderMarket();
  else if (page === "profile")   renderProfile();
  else if (page === "craft")     renderCraft();
  else if (page === "trades")    renderTrades();
  else if (page === "friends")   renderFriends();
  else if (page === "clan")      renderClan();
  else if (page === "main")      renderMain();
}

// ── АВТОРИЗАЦІЯ ────────────────────────────

function login() {
  const username = document.getElementById("login-username").value.trim();
  const password = document.getElementById("login-password").value;

  if (!username || !password) {
    showToast("Введіть нікнейм та пароль!", "error");
    return;
  }

  // Тимчасово — локальне збереження (потім замінимо на Firebase)
  const savedUser = localStorage.getItem("user_" + username);
  if (!savedUser) {
    showToast("Користувача не знайдено!", "error");
    return;
  }

  const userData = JSON.parse(savedUser);
  // Простий хеш через btoa (потім замінимо на bcrypt через Firebase)
  if (userData.passwordHash !== btoa(password)) {
    showToast("Невірний пароль!", "error");
    return;
  }

  if (userData.banned) {
    showToast("Акаунт заблокований!", "error");
    return;
  }

  currentUser = username;
  gameState   = userData;
  loadCasesRemaining();
  navigate("main");
  showToast("Ласкаво просимо, " + username + "! 🍂", "success");
}

function register() {
  const username  = document.getElementById("reg-username").value.trim();
  const email     = document.getElementById("reg-email").value.trim();
  const password  = document.getElementById("reg-password").value;
  const password2 = document.getElementById("reg-password2").value;

  if (!username || !email || !password) {
    showToast("Заповніть всі поля!", "error");
    return;
  }
  if (password !== password2) {
    showToast("Паролі не співпадають!", "error");
    return;
  }
  if (password.length < 6) {
    showToast("Пароль мінімум 6 символів!", "error");
    return;
  }
  if (localStorage.getItem("user_" + username)) {
    showToast("Цей нікнейм вже зайнятий!", "error");
    return;
  }

  const newUser = {
    username:     username,
    email:        email,
    passwordHash: btoa(password),
    balance:      100,
    inventory:    [],
    level:        1,
    xp:           0,
    friends:      [],
    clan:         null,
    banned:       false,
    createdAt:    Date.now(),
    lastSeen:     Date.now(),
  };

  localStorage.setItem("user_" + username, JSON.stringify(newUser));
  // Додаємо до списку всіх юзерів
  const allUsers = JSON.parse(localStorage.getItem("allUsers") || "[]");
  allUsers.push(username);
  localStorage.setItem("allUsers", JSON.stringify(allUsers));

  currentUser = username;
  gameState   = newUser;
  navigate("main");
  showToast("Акаунт створено! Вітаємо! 🍂", "success");
}

function logout() {
  saveData();
  currentUser = null;
  gameState   = {};
  navigate("login");
}

// ── ЗБЕРЕЖЕННЯ ─────────────────────────────

function saveData() {
  if (!currentUser) return;
  gameState.lastSeen = Date.now();
  localStorage.setItem("user_" + currentUser, JSON.stringify(gameState));
}

function saveCasesRemaining() {
  const rem = {};
  Object.keys(CASES).forEach(k => {
    rem[k] = CASES[k].remaining;
  });
  localStorage.setItem("casesRemaining", JSON.stringify(rem));
}

function loadCasesRemaining() {
  const rem = JSON.parse(localStorage.getItem("casesRemaining") || "{}");
  Object.keys(rem).forEach(k => {
    if (CASES[k]) CASES[k].remaining = rem[k];
  });
}

// ── ГОЛОВНЕ МЕНЮ ───────────────────────────

function renderMain() {
  document.getElementById("main-username").textContent = gameState.username;
  document.getElementById("main-balance").textContent  = gameState.balance;
  document.getElementById("main-level").textContent    = gameState.level;
  document.getElementById("main-items").textContent    = gameState.inventory.length;
}

// ── МАГАЗИН ────────────────────────────────

function renderShop() {
  const grid = document.getElementById("shop-grid");
  grid.innerHTML = "";

  Object.values(CASES).forEach(c => {
    const isEmpty = c.remaining <= 0;
    const pct     = Math.round((c.remaining / c.total) * 100);

    const card = document.createElement("div");
    card.className = "case-card" + (isEmpty ? " empty" : "");
    card.innerHTML = `
      <div class="case-limited-bar">
        <div class="case-limited-fill" style="width:${pct}%"></div>
      </div>
      <img src="${c.img}" alt="${c.name}" onerror="this.src='img/placeholder.png'">
      <div class="case-name">${c.name}</div>
      <div class="case-remaining">
        ${isEmpty ? "🚫 Розпродано" : `📦 Залишилось: ${c.remaining}`}
      </div>
      <div class="case-price">💰 ${c.price} нікусів</div>
      <button
        class="btn-buy"
        onclick="buyCase('${c.id}')"
        ${isEmpty ? "disabled" : ""}
      >
        ${isEmpty ? "Розпродано" : "Купити"}
      </button>
      <button class="btn-preview" onclick="previewCase('${c.id}')">
        👁 Вміст
      </button>
    `;
    grid.appendChild(card);
  });
}

function buyCase(caseId) {
  const c = CASES[caseId];
  if (!c) return;

  if (c.remaining <= 0) {
    showToast("Кейс розпродано!", "error");
    return;
  }
  if (gameState.balance < c.price) {
    showToast("Недостатньо нікусів!", "error");
    return;
  }

  gameState.balance -= c.price;
  c.remaining--;

  // Додаємо кейс в інвентар
  gameState.inventory.push({
    id:       generateId(),
    type:     "case",
    caseId:   caseId,
    name:     c.name,
    img:      c.img,
    boughtAt: Date.now(),
  });

  saveCasesRemaining();
  saveData();
  renderShop();
  updateBalanceDisplay();
  showToast(`✅ Куплено: ${c.name}!`, "success");
}

function previewCase(caseId) {
  const c = CASES[caseId];
  if (!c) return;

  const modal = document.getElementById("modal");
  const body  = document.getElementById("modal-body");

  body.innerHTML = `
    <h2 class="modal-title">📦 ${c.name}</h2>
    <p style="color:var(--text-muted);margin-bottom:16px;">Можливі предмети:</p>
    <div class="preview-grid">
      ${c.items.map(item => {
        const r = RARITIES[item.rarity];
        return `
          <div class="preview-item" style="border-color:${r.color}">
            <img src="${item.img}" onerror="this.src='img/placeholder.png'" alt="${item.name}">
            <div class="preview-item-name">${item.name}</div>
            <div class="preview-item-rarity" style="color:${r.color}">${r.name}</div>
          </div>`;
      }).join("")}
    </div>
    <button class="btn-primary" onclick="closeModal()">Закрити</button>
  `;
  modal.style.display = "flex";
}

// ── ВІДКРИТТЯ КЕЙСУ ────────────────────────

function openCase(invIndex) {
  const item = gameState.inventory[invIndex];
  if (!item || item.type !== "case") return;

  const c = CASES[item.caseId];
  if (!c) return;

  // Дроп предмета
  const dropped = rollDrop(c);

  // Видаляємо кейс з інвентарю
  gameState.inventory.splice(invIndex, 1);

  // Додаємо предмет
  const newItem = {
    id:        generateId(),
    type:      "item",
    itemId:    dropped.id,
    name:      dropped.name,
    img:       dropped.img,
    rarity:    dropped.rarity,
    quality:   rollQuality(),
    premium:   Math.random() < 0.05,
    fromCase:  item.caseId,
    obtainedAt: Date.now(),
  };
  gameState.inventory.push(newItem);

  // XP
  const xpMap = {
    common: 5, exceptional: 10, epic: 20,
    legendary: 40, secret: 80, special: 200
  };
  addXP(xpMap[dropped.rarity] || 5);

  saveData();
  showOpenResult(newItem);
  renderInventory();
}

function rollDrop(c) {
  const r = Math.random();
  let cum = 0;

  // Збираємо предмети по рідкостях
  const byRarity = {};
  c.items.forEach(item => {
    if (!byRarity[item.rarity]) byRarity[item.rarity] = [];
    byRarity[item.rarity].push(item);
  });

  // Перевіряємо шанси від рідкісних до звичайних
  const order = ["special","secret","legendary","epic","exceptional","common"];
  for (const rarity of order) {
    if (!byRarity[rarity]) continue;
    cum += RARITIES[rarity].chance;
    if (r < cum) {
      const pool = byRarity[rarity];
      return pool[Math.floor(Math.random() * pool.length)];
    }
  }

  // Fallback — звичайний
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

function showOpenResult(item) {
  const r     = RARITIES[item.rarity];
  const modal = document.getElementById("modal");
  const body  = document.getElementById("modal-body");

  body.innerHTML = `
    <div class="open-result" style="border-color:${r.color}">
      <div class="open-result-glow" style="background:${r.color}22"></div>
      <div class="open-label">🎉 Ви отримали!</div>
      <img src="${item.img}" onerror="this.src='img/placeholder.png'" class="open-img">
      <div class="open-name">${item.name}</div>
      <div class="open-rarity" style="color:${r.color}">${r.name}</div>
      <div class="open-quality">${item.quality}</div>
      ${item.premium ? '<div class="open-premium">⭐ ПРЕМІУМ</div>' : ""}
      <button class="btn-primary" onclick="closeModal()" style="margin-top:20px;">
        Забрати!
      </button>
    </div>
  `;
  modal.style.display = "flex";
}

// ── ІНВЕНТАР ───────────────────────────────

let invSort    = "rarity";
let invFilter  = "all";

function renderInventory() {
  const grid = document.getElementById("inventory-grid");
  if (!grid) return;

  let items = [...gameState.inventory];

  // Фільтр
  if (invFilter !== "all") {
    items = items.filter(i => i.type === invFilter);
  }

  // Сортування
  const rarityOrder = ["special","secret","legendary","epic","exceptional","common",""];
  if (invSort === "rarity") {
    items.sort((a,b) => rarityOrder.indexOf(a.rarity) - rarityOrder.indexOf(b.rarity));
  } else if (invSort === "name") {
    items.sort((a,b) => a.name.localeCompare(b.name));
  } else if (invSort === "date") {
    items.sort((a,b) => (b.obtainedAt || 0) - (a.obtainedAt || 0));
  }

  if (!items.length) {
    grid.innerHTML = `<div class="empty-state">
      🍂 Інвентар порожній<br>
      <small>Купи кейси у магазині!</small>
    </div>`;
    return;
  }

  grid.innerHTML = items.map((item, i) => {
    const r      = item.rarity ? RARITIES[item.rarity] : null;
    const color  = r ? r.color : "#888";
    const isCase = item.type === "case";

    // Знаходимо реальний індекс у gameState.inventory
    const realIdx = gameState.inventory.findIndex(x => x.id === item.id);

    return `
      <div class="inv-card" style="border-color:${color}">
        <div class="inv-card-stripe" style="background:${color}"></div>
        <img src="${item.img}" onerror="this.src='img/placeholder.png'" alt="${item.name}">
        <div class="inv-card-name">${item.name}</div>
        ${r ? `<div class="inv-card-rarity" style="color:${color}">${r.name}</div>` : ""}
        ${item.quality ? `<div class="inv-card-quality">${item.quality}</div>` : ""}
        ${item.premium ? `<div class="inv-card-premium">⭐ Преміум</div>` : ""}
        <div class="inv-card-actions">
          ${isCase
            ? `<button class="btn-sm btn-open" onclick="openCase(${realIdx})">🎁 Відкрити</button>`
            : `
              <button class="btn-sm btn-sell" onclick="showSellModal(${realIdx})">💰 Продати</button>
              <button class="btn-sm btn-trade" onclick="showTradeModal(${realIdx})">🔄 Трейд</button>
            `}
        </div>
      </div>`;
  }).join("");
}

function setInvSort(sort) {
  invSort = sort;
  renderInventory();
  document.querySelectorAll(".sort-btn").forEach(b => {
    b.classList.toggle("active", b.dataset.sort === sort);
  });
}

function setInvFilter(filter) {
  invFilter = filter;
  renderInventory();
  document.querySelectorAll(".filter-btn").forEach(b => {
    b.classList.toggle("active", b.dataset.filter === filter);
  });
}

// ── РИНОК ──────────────────────────────────

let marketListings = [];

function renderMarket() {
  // Тимчасово — локальний ринок (потім Firebase)
  const stored = localStorage.getItem("marketListings");
  marketListings = stored ? JSON.parse(stored) : [];

  const grid = document.getElementById("market-grid");
  if (!grid) return;

  if (!marketListings.length) {
    grid.innerHTML = `<div class="empty-state">
      🍂 На ринку поки нічого немає<br>
      <small>Виставляй свої предмети!</small>
    </div>`;
    return;
  }

  grid.innerHTML = marketListings.map((listing, i) => {
    const r     = listing.item.rarity ? RARITIES[listing.item.rarity] : null;
    const color = r ? r.color : "#888";
    const isMine = listing.seller === currentUser;

    return `
      <div class="market-card" style="border-color:${color}">
        <div class="market-card-stripe" style="background:${color}"></div>
        <img src="${listing.item.img}" onerror="this.src='img/placeholder.png'" alt="${listing.item.name}">
        <div class="market-item-name">${listing.item.name}</div>
        ${r ? `<div class="market-item-rarity" style="color:${color}">${r.name}</div>` : ""}
        ${listing.item.quality ? `<div class="market-item-quality">${listing.item.quality}</div>` : ""}
        <div class="market-seller">👤 ${listing.seller}</div>
        <div class="market-price">💰 ${listing.price} нікусів</div>
        ${isMine
          ? `<button class="btn-sm btn-cancel" onclick="cancelListing(${i})">❌ Зняти</button>`
          : `<button class="btn-sm btn-buy" onclick="buyFromMarket(${i})">Купити</button>`
        }
      </div>`;
  }).join("");
}

function showSellModal(invIdx) {
  const item  = gameState.inventory[invIdx];
  const r     = item.rarity ? RARITIES[item.rarity] : null;
  const modal = document.getElementById("modal");
  const body  = document.getElementById("modal-body");

  body.innerHTML = `
    <h2 class="modal-title">💰 Виставити на ринок</h2>
    <div style="text-align:center;margin-bottom:16px;">
      <img src="${item.img}" onerror="this.src='img/placeholder.png'"
        style="width:80px;height:80px;object-fit:contain;">
      <div style="font-weight:700;margin-top:8px;">${item.name}</div>
      ${r ? `<div style="color:${r.color}">${r.name}</div>` : ""}
    </div>
    <label style="color:var(--text-muted);font-size:13px;">Ціна (нікусів):</label>
    <input type="number" id="sell-price" min="1" value="100"
      style="width:100%;padding:10px;border-radius:8px;border:1px solid var(--border);
      background:var(--bg-card);color:var(--text);font-size:16px;margin:8px 0 16px;box-sizing:border-box;">
    <div style="display:flex;gap:8px;">
      <button class="btn-primary" style="flex:1;" onclick="confirmSell(${invIdx})">
        ✅ Виставити
      </button>
      <button class="btn-secondary" style="flex:1;" onclick="closeModal()">
        Скасувати
      </button>
    </div>
  `;
  modal.style.display = "flex";
}

function confirmSell(invIdx) {
  const item  = gameState.inventory[invIdx];
  const price = parseInt(document.getElementById("sell-price").value);

  if (!price || price < 1) {
    showToast("Введіть коректну ціну!", "error");
    return;
  }

  const listing = {
    id:        generateId(),
    seller:    currentUser,
    item:      { ...item },
    price:     price,
    listedAt:  Date.now(),
  };

  gameState.inventory.splice(invIdx, 1);
  marketListings.push(listing);

  localStorage.setItem("marketListings", JSON.stringify(marketListings));
  saveData();
  closeModal();
  renderInventory();
  showToast("✅ Предмет виставлено на ринок!", "success");
}

function buyFromMarket(listingIdx) {
  const listing = marketListings[listingIdx];
  if (!listing) return;
  if (listing.seller === currentUser) {
    showToast("Не можна купити свій предмет!", "error");
    return;
  }
  if (gameState.balance < listing.price) {
    showToast("Недостатньо нікусів!", "error");
    return;
  }

  gameState.balance -= listing.price;

  // Зараховуємо продавцю (локально)
  const sellerData = localStorage.getItem("user_" + listing.seller);
  if (sellerData) {
    const seller = JSON.parse(sellerData);
    seller.balance += listing.price;
    localStorage.setItem("user_" + listing.seller, JSON.stringify(seller));
  }

  gameState.inventory.push({ ...listing.item, id: generateId() });
  marketListings.splice(listingIdx, 1);

  localStorage.setItem("marketListings", JSON.stringify(marketListings));
  saveData();
  updateBalanceDisplay();
  renderMarket();
  showToast(`✅ Куплено: ${listing.item.name}!`, "success");
}

function cancelListing(listingIdx) {
  const listing = marketListings[listingIdx];
  if (!listing || listing.seller !== currentUser) return;

  gameState.inventory.push({ ...listing.item });
  marketListings.splice(listingIdx, 1);

  localStorage.setItem("marketListings", JSON.stringify(marketListings));
  saveData();
  renderMarket();
  showToast("Лот знято з ринку", "success");
}

// ── КРАФТ ──────────────────────────────────

let craftSelected = [];

function renderCraft() {
  const slots = document.getElementById("craft-slots");
  const btn   = document.getElementById("craft-btn");
  if (!slots) return;

  slots.innerHTML = craftSelected.map((item, i) => `
    <div class="craft-slot filled" onclick="removeCraftItem(${i})">
      <img src="${item.img}" onerror="this.src='img/placeholder.png'">
      <div>${item.name}</div>
      <div style="font-size:10px;color:#aaa;">✕ прибрати</div>
    </div>
  `).join("") + (craftSelected.length < 5
    ? Array(5 - craftSelected.length).fill(0).map(() =>
        `<div class="craft-slot empty" onclick="showCraftPicker()">+</div>`
      ).join("")
    : "");

  if (btn) btn.disabled = craftSelected.length !== 5;

  // Список для вибору
  const picker = document.getElementById("craft-picker");
  if (picker) {
    const items = gameState.inventory.filter(i =>
      i.type === "item" && !craftSelected.find(s => s.id === i.id)
    );
    picker.innerHTML = items.map((item, i) => {
      const r = item.rarity ? RARITIES[item.rarity] : null;
      return `
        <div class="craft-pick-item" onclick="addCraftItem('${item.id}')">
          <img src="${item.img}" onerror="this.src='img/placeholder.png'">
          <span>${item.name}</span>
          ${r ? `<span style="color:${r.color};font-size:11px;">${r.name}</span>` : ""}
        </div>`;
    }).join("") || `<div class="empty-state">Немає предметів для крафту</div>`;
  }
}

function addCraftItem(itemId) {
  if (craftSelected.length >= 5) return;
  const item = gameState.inventory.find(i => i.id === itemId);
  if (!item) return;
  craftSelected.push(item);
  renderCraft();
}

function removeCraftItem(index) {
  craftSelected.splice(index, 1);
  renderCraft();
}

function doCraft() {
  if (craftSelected.length !== 5) return;

  // Визначаємо рідкість — беремо найвищу серед вибраних і підвищуємо
  const rarityOrder = ["common","exceptional","epic","legendary","secret","special"];
  const maxRarity   = craftSelected.reduce((max, item) => {
    const idx = rarityOrder.indexOf(item.rarity);
    return idx > rarityOrder.indexOf(max) ? item.rarity : max;
  }, "common");

  const maxIdx    = rarityOrder.indexOf(maxRarity);
  const newRarity = rarityOrder[Math.min(maxIdx + 1, rarityOrder.length - 1)];

  // Видаляємо 5 предметів з інвентарю
  craftSelected.forEach(selected => {
    const idx = gameState.inventory.findIndex(i => i.id === selected.id);
    if (idx !== -1) gameState.inventory.splice(idx, 1);
  });

  // Новий предмет
  const newItem = {
    id:         generateId(),
    type:       "item",
    itemId:     "crafted_" + newRarity,
    name:       "Крафтовий предмет",
    img:        "img/items/placeholder.png",
    rarity:     newRarity,
    quality:    rollQuality(),
    premium:    Math.random() < 0.03,
    fromCase:   "craft",
    obtainedAt: Date.now(),
  };

  gameState.inventory.push(newItem);
  craftSelected = [];

  saveData();
  renderCraft();
  showOpenResult(newItem);
  showToast("⚗️ Крафт успішний!", "success");
}

// ── ТРЕЙДИ ─────────────────────────────────

function renderTrades() {
  const list = document.getElementById("trades-list");
  if (!list) return;

  const trades = JSON.parse(localStorage.getItem("trades") || "[]")
    .filter(t => t.from === currentUser || t.to === currentUser);

  if (!trades.length) {
    list.innerHTML = `<div class="empty-state">🍂 Немає активних трейдів</div>`;
    return;
  }

  list.innerHTML = trades.map((trade, i) => {
    const isSender   = trade.from === currentUser;
    const statusText = {
      pending:   "⏳ Очікує підтвердження",
      confirmed: "✅ Підтверджено",
      cancelled: "❌ Скасовано",
    }[trade.status] || trade.status;

    return `
      <div class="trade-card">
        <div class="trade-header">
          <span>${isSender ? "📤 Надіслано → " + trade.to : "📥 Від " + trade.from}</span>
          <span class="trade-status">${statusText}</span>
        </div>
        <div class="trade-items">
          <div>
            <div style="color:var(--text-muted);font-size:12px;margin-bottom:6px;">Ти даєш:</div>
            ${trade.offerItems.map(item => `
              <div class="trade-item">
                <img src="${item.img}" onerror="this.src='img/placeholder.png'">
                <span>${item.name}</span>
              </div>`).join("")}
          </div>
          <div style="font-size:24px;align-self:center;">⇄</div>
          <div>
            <div style="color:var(--text-muted);font-size:12px;margin-bottom:6px;">Ти отримуєш:</div>
            ${trade.wantItems.map(item => `
              <div class="trade-item">
                <img src="${item.img}" onerror="this.src='img/placeholder.png'">
                <span>${item.name}</span>
              </div>`).join("")}
          </div>
        </div>
        ${!isSender && trade.status === "pending"
          ? `<div style="display:flex;gap:8px;margin-top:12px;">
               <button class="btn-primary" onclick="acceptTrade('${trade.id}')">✅ Прийняти</button>
               <button class="btn-secondary" onclick="declineTrade('${trade.id}')">❌ Відхилити</button>
             </div>`
          : ""}
        ${isSender && trade.status === "pending"
          ? `<button class="btn-secondary" onclick="cancelTrade('${trade.id}')" style="margin-top:12px;">
               Скасувати
             </button>`
          : ""}
      </div>`;
  }).join("");
}

function showTradeModal(invIdx) {
  const item  = gameState.inventory[invIdx];
  const modal = document.getElementById("modal");
  const body  = document.getElementById("modal-body");

  const allUsers = JSON.parse(localStorage.getItem("allUsers") || "[]")
    .filter(u => u !== currentUser);

  body.innerHTML = `
    <h2 class="modal-title">🔄 Надіслати трейд</h2>
    <label style="color:var(--text-muted);font-size:13px;">Кому:</label>
    <select id="trade-target" style="width:100%;padding:10px;border-radius:8px;
      border:1px solid var(--border);background:var(--bg-card);color:var(--text);
      font-size:14px;margin:8px 0 16px;box-sizing:border-box;">
      ${allUsers.map(u => `<option value="${u}">${u}</option>`).join("") || "<option>Немає гравців</option>"}
    </select>
    <div style="font-weight:600;margin-bottom:8px;">Ти пропонуєш:</div>
    <div class="trade-item" style="background:var(--bg-card);padding:10px;border-radius:8px;">
      <img src="${item.img}" onerror="this.src='img/placeholder.png'">
      <span>${item.name}</span>
    </div>
    <div style="font-weight:600;margin:16px 0 8px;">Що хочеш отримати:</div>
    <input type="text" id="trade-want" placeholder="Назва предмета..."
      style="width:100%;padding:10px;border-radius:8px;border:1px solid var(--border);
      background:var(--bg-card);color:var(--text);font-size:14px;margin-bottom:16px;box-sizing:border-box;">
    <div style="display:flex;gap:8px;">
      <button class="btn-primary" style="flex:1;" onclick="sendTrade(${invIdx})">
        📤 Надіслати
      </button>
      <button class="btn-secondary" style="flex:1;" onclick="closeModal()">
        Скасувати
      </button>
    </div>
  `;
  modal.style.display = "flex";
}

function sendTrade(invIdx) {
  const target = document.getElementById("trade-target")?.value;
  const want   = document.getElementById("trade-want")?.value.trim();
  const item   = gameState.inventory[invIdx];

  if (!target) { showToast("Виберіть гравця!", "error"); return; }
  if (!want)   { showToast("Вкажіть що хочете!", "error"); return; }

  const trade = {
    id:         generateId(),
    from:       currentUser,
    to:         target,
    offerItems: [{ ...item }],
    wantItems:  [{ name: want, img: "img/items/placeholder.png" }],
    status:     "pending",
    createdAt:  Date.now(),
  };

  const trades = JSON.parse(localStorage.getItem("trades") || "[]");
  trades.push(trade);
  localStorage.setItem("trades", JSON.stringify(trades));

  closeModal();
  showToast("📤 Трейд надіслано!", "success");
}

function acceptTrade(tradeId) {
  const trades = JSON.parse(localStorage.getItem("trades") || "[]");
  const trade  = trades.find(t => t.id === tradeId);
  if (!trade) return;

  trade.status = "confirmed";
  localStorage.setItem("trades", JSON.stringify(trades));
  renderTrades();
  showToast("✅ Трейд підтверджено!", "success");
}

function declineTrade(tradeId) {
  const trades = JSON.parse(localStorage.getItem("trades") || "[]");
  const idx    = trades.findIndex(t => t.id === tradeId);
  if (idx !== -1) trades[idx].status = "cancelled";
  localStorage.setItem("trades", JSON.stringify(trades));
  renderTrades();
  showToast("❌ Трейд відхилено", "error");
}

function cancelTrade(tradeId) {
  const trades = JSON.parse(localStorage.getItem("trades") || "[]");
  const idx    = trades.findIndex(t => t.id === tradeId);
  if (idx !== -1) trades[idx].status = "cancelled";
  localStorage.setItem("trades", JSON.stringify(trades));
  renderTrades();
  showToast("Трейд скасовано", "success");
}

// ── ПРОФІЛЬ ────────────────────────────────

function renderProfile(username) {
  const user = username
    ? JSON.parse(localStorage.getItem("user_" + username) || "{}")
    : gameState;

  document.getElementById("profile-username").textContent = user.username || "—";
  document.getElementById("profile-level").textContent    = user.level    || 1;
  document.getElementById("profile-balance").textContent  = user.balance  || 0;
  document.getElementById("profile-items").textContent    = (user.inventory || []).length;
  document.getElementById("profile-clan").textContent     = user.clan     || "Без клану";

  const lastSeen = user.lastSeen
    ? new Date(user.lastSeen).toLocaleDateString("uk-UA")
    : "—";
  document.getElementById("profile-lastseen").textContent = lastSeen;
}

// ── ДРУЗІ ──────────────────────────────────

function renderFriends() {
  const list = document.getElementById("friends-list");
  if (!list) return;

  if (!gameState.friends.length) {
    list.innerHTML = `<div class="empty-state">🍂 Список друзів порожній</div>`;
    return;
  }

  list.innerHTML = gameState.friends.map(username => {
    const userData = JSON.parse(localStorage.getItem("user_" + username) || "{}");
    return `
      <div class="friend-card">
        <div class="friend-avatar">👤</div>
        <div class="friend-info">
          <div class="friend-name">${username}</div>
          <div class="friend-level">Рівень ${userData.level || 1}</div>
        </div>
        <div class="friend-actions">
          <button class="btn-sm" onclick="renderProfile('${username}');navigate('profile')">
            Профіль
          </button>
          <button class="btn-sm btn-cancel" onclick="removeFriend('${username}')">
            Видалити
          </button>
        </div>
      </div>`;
  }).join("");
}

function addFriend() {
  const input    = document.getElementById("friend-input");
  const username = input?.value.trim();

  if (!username) { showToast("Введіть нікнейм!", "error"); return; }
  if (username === currentUser) { showToast("Не можна додати себе!", "error"); return; }
  if (gameState.friends.includes(username)) { showToast("Вже в друзях!", "error"); return; }
  if (!localStorage.getItem("user_" + username)) { showToast("Гравця не знайдено!", "error"); return; }

  gameState.friends.push(username);
  saveData();
  if (input) input.value = "";
  renderFriends();
  showToast("✅ Додано до друзів!", "success");
}

function removeFriend(username) {
  gameState.friends = gameState.friends.filter(f => f !== username);
  saveData();
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
            style="width:100%;padding:10px;border-radius:8px;border:1px solid var(--border);
            background:var(--bg-card);color:var(--text);font-size:14px;box-sizing:border-box;margin-bottom:8px;">
          <button class="btn-primary" style="width:100%;" onclick="createClan()">
            ⚔️ Створити клан
          </button>
        </div>
        <div style="flex:1;min-width:200px;">
          <input type="text" id="clan-join-input" placeholder="ID клану..."
            style="width:100%;padding:10px;border-radius:8px;border:1px solid var(--border);
            background:var(--bg-card);color:var(--text);font-size:14px;box-sizing:border-box;margin-bottom:8px;">
          <button class="btn-secondary" style="width:100%;" onclick="joinClan()">
            🚪 Вступити в клан
          </button>
        </div>
      </div>`;
    return;
  }

  const clanData = JSON.parse(localStorage.getItem("clan_" + gameState.clan) || "{}");
  const isLeader = clanData.leader === currentUser;

  section.innerHTML = `
    <div class="clan-header">
      <div class="clan-name">⚔️ ${clanData.name || gameState.clan}</div>
      <div class="clan-id">ID: ${gameState.clan}</div>
      <div class="clan-members">👥 Учасників: ${(clanData.members || []).length}</div>
    </div>
    <div class="clan-members-list">
      ${(clanData.members || []).map(m => `
        <div class="friend-card">
          <div class="friend-avatar">${m === clanData.leader ? "👑" : "👤"}</div>
          <div class="friend-info">
            <div class="friend-name">${m}</div>
            <div class="friend-level">${m === clanData.leader ? "Лідер" : "Учасник"}</div>
          </div>
          ${isLeader && m !== currentUser
            ? `<button class="btn-sm btn-cancel" onclick="kickFromClan('${m}')">Виключити</button>`
            : ""}
        </div>`).join("")}
    </div>
    <button class="btn-secondary" style="margin-top:16px;width:100%;" onclick="leaveClan()">
      🚪 Покинути клан
    </button>`;
}

function createClan() {
  const name = document.getElementById("clan-name-input")?.value.trim();
  if (!name) { showToast("Введіть назву клану!", "error"); return; }

  const clanId   = generateId();
  const clanData = {
    id:        clanId,
    name:      name,
    leader:    currentUser,
    members:   [currentUser],
    createdAt: Date.now(),
  };

  localStorage.setItem("clan_" + clanId, JSON.stringify(clanData));
  gameState.clan = clanId;
  saveData();
  renderClan();
  showToast("⚔️ Клан створено!", "success");
}

function joinClan() {
  const id       = document.getElementById("clan-join-input")?.value.trim();
  const clanData = localStorage.getItem("clan_" + id);

  if (!clanData) { showToast("Клан не знайдено!", "error"); return; }

  const clan = JSON.parse(clanData);
  if (clan.members.includes(currentUser)) {
    showToast("Ти вже в цьому клані!", "error");
    return;
  }

  clan.members.push(currentUser);
  localStorage.setItem("clan_" + id, JSON.stringify(clan));
  gameState.clan = id;
  saveData();
  renderClan();
  showToast("✅ Ти вступив у клан!", "success");
}

function leaveClan() {
  const id   = gameState.clan;
  const data = localStorage.getItem("clan_" + id);
  if (!data) return;

  const clan = JSON.parse(data);
  clan.members = clan.members.filter(m => m !== currentUser);
  localStorage.setItem("clan_" + id, JSON.stringify(clan));

  gameState.clan = null;
  saveData();
  renderClan();
  showToast("Ти покинув клан", "success");
}

function kickFromClan(username) {
  const id   = gameState.clan;
  const data = localStorage.getItem("clan_" + id);
  if (!data) return;

  const clan = JSON.parse(data);
  clan.members = clan.members.filter(m => m !== username);
  localStorage.setItem("clan_" + id, JSON.stringify(clan));

  renderClan();
  showToast("Гравця виключено з клану", "success");
}

// ── XP / РІВЕНЬ ────────────────────────────

function addXP(amount) {
  gameState.xp = (gameState.xp || 0) + amount;
  const xpNeeded = gameState.level * 100;
  if (gameState.xp >= xpNeeded) {
    gameState.xp    -= xpNeeded;
    gameState.level += 1;
    showToast(`🎉 Рівень ${gameState.level}!`, "success");
  }
}

// ── UI ХЕЛПЕРИ ─────────────────────────────

function showToast(message, type) {
  const toast     = document.getElementById("toast");
  toast.textContent = message;
  toast.className   = "toast show " + (type || "");
  clearTimeout(window._toastT);
  window._toastT = setTimeout(() => {
    toast.className = "toast";
  }, 3000);
}

function closeModal() {
  document.getElementById("modal").style.display = "none";
}

function updateBalanceDisplay() {
  const el = document.getElementById("main-balance");
  if (el) el.textContent = gameState.balance;
  const nav = document.getElementById("nav-balance");
  if (nav) nav.textContent = "💰 " + gameState.balance;
}

function generateId() {
  return Math.random().toString(36).slice(2) + Date.now().toString(36);
}

// ── ІНІЦІАЛІЗАЦІЯ ──────────────────────────

window.addEventListener("DOMContentLoaded", () => {
  loadCasesRemaining();
  navigate("login");
});
