// ============================================
// MINE.JS — НІКУС КЕЙС РЕМЕЙК
// Окрема механіка: майнінг, артефакти, PvP
// ============================================

import { auth, db } from "./firebase.js";
import {
  doc, getDoc, setDoc, updateDoc, collection,
  getDocs, addDoc, onSnapshot, serverTimestamp, runTransaction
} from "https://www.gstatic.com/firebasejs/10.7.0/firebase-firestore.js";

// ══════════════════════════════════════════
// КОНСТАНТИ
// ══════════════════════════════════════════

const MINE_ZONES = {
  safe:  { name: "Безпечна зона", color: "#5ecb3e", depth: 0,  resources: ["iron"],            monsterChance: 0.05, bg: "#1a3a1a" },
  mid:   { name: "Середній пояс", color: "#f5b100", depth: 1,  resources: ["iron","lead","gold"], monsterChance: 0.15, bg: "#2a2a0a" },
  deep:  { name: "Глибина",       color: "#f07d28", depth: 2,  resources: ["lead","gold","uranium"], monsterChance: 0.3, bg: "#1a0a00" },
  core:  { name: "Ядро",          color: "#e0203a", depth: 3,  resources: ["uranium","diamond","nicus_ore"], monsterChance: 0.5, bg: "#1a0000" },
};

const RESOURCES = {
  iron:      { name: "Залізо",    icon: "⚙️",  color: "#aaa" },
  lead:      { name: "Свинець",   icon: "🔩",  color: "#888" },
  gold:      { name: "Золото",    icon: "🌕",  color: "#f5b100" },
  uranium:   { name: "Уран",      icon: "☢️",  color: "#5ecb3e" },
  diamond:   { name: "Діамант",   icon: "💎",  color: "#0af" },
  nicus_ore: { name: "Нікус-руда",icon: "🌀",  color: "#b45dff" },
};

const ARTIFACT_RARITIES = {
  common:    { name: "Звичайний",  color: "#5ecb3e", hpMult: 1.0, dmgMult: 1.0 },
  rare:      { name: "Рідкісний",  color: "#3ecde0", hpMult: 1.2, dmgMult: 1.2 },
  epic:      { name: "Епічний",    color: "#9933FF", hpMult: 1.5, dmgMult: 1.5 },
  legendary: { name: "Легендарний",color: "#FF6600", hpMult: 2.0, dmgMult: 2.0 },
};

const TOOL_STATS = {
  // МЕЧІ
  sword_iron:    { type:"sword", material:"iron",    damage:10, durability:100, vsPlayer:1.0, vsMonster:1.0 },
  sword_gold:    { type:"sword", material:"gold",    damage:8,  durability:60,  vsPlayer:0.8, vsMonster:1.3, effect:"slow_20_2s" },
  sword_diamond: { type:"sword", material:"diamond", damage:20, durability:200, vsPlayer:1.25, vsMonster:1.0 },
  // БРОНЯ
  armor_iron:    { type:"armor", material:"iron",    reduce:0.2, durability:100 },
  armor_gold:    { type:"armor", material:"gold",    reduce:0.14,durability:60, effect:"attacker_slow_20" },
  armor_diamond: { type:"armor", material:"diamond", reduce:0.27,durability:200, setBonusX:1.5 },
  // КИРКИ
  pick_iron:     { type:"pickaxe", material:"iron",    speed:1.0, dropBonus:0,    rareChance:0,    durability:100 },
  pick_gold:     { type:"pickaxe", material:"gold",    speed:1.0, dropBonus:0.05, rareChance:0,    durability:60  },
  pick_diamond:  { type:"pickaxe", material:"diamond", speed:1.5, dropBonus:0,    rareChance:0.05, durability:200 },
};

const CRAFT_COSTS = {
  sword_iron:    { iron: 5 },
  sword_gold:    { gold: 5 },
  sword_diamond: { diamond: 5 },
  armor_iron:    { iron: 8 },
  armor_gold:    { gold: 8 },
  armor_diamond: { diamond: 8 },
  pick_iron:     { iron: 4 },
  pick_gold:     { gold: 4 },
  pick_diamond:  { diamond: 4 },
};

const UPGRADE_COEF = 0.1; // ресурс * цей коеф = бонус
const MAX_REDUCE   = 0.80;
const ENERGY_MAX   = 100;
const ENERGY_REGEN = 1; // за тік (1с)
const ENERGY_MINE  = 5; // вартість одного удару кирки
const ENERGY_PVP   = 20;

// ══════════════════════════════════════════
// СТАН МОДУЛЯ
// ══════════════════════════════════════════

let _minePlayer   = null; // { uid, nickname, ...stats }
let _mineArtifact = null;
let _mineResources = { iron:0, lead:0, gold:0, uranium:0, diamond:0, nicus_ore:0 };
let _mineTools    = {}; // { sword, armor_head, armor_body, armor_legs, pickaxe }
let _mineZone     = "safe";
let _mineEnergy   = ENERGY_MAX;
let _mineCanvas   = null;
let _mineCtx      = null;
let _mineLoop     = null;
let _mineEntities = []; // монстри, ефекти
let _mineTick     = 0;
let _mineLog      = [];

// ══════════════════════════════════════════
// FIRESTORE — ЗАВАНТАЖЕННЯ / ЗБЕРЕЖЕННЯ
// ══════════════════════════════════════════

async function loadMineData(uid) {
  const snap = await getDoc(doc(db, "mineProfiles", uid));
  if (!snap.exists()) {
    const fresh = {
      uid,
      nickname: (await getDoc(doc(db, "users", uid))).data()?.username || "Гравець",
      resources: { iron:0, lead:0, gold:0, uranium:0, diamond:0, nicus_ore:0 },
      tools: {},
      artifact: null,
      energy: ENERGY_MAX,
      zone: "safe",
      pvpPower: 0,
    };
    await setDoc(doc(db, "mineProfiles", uid), fresh);
    return fresh;
  }
  return { uid, ...snap.data() };
}

async function saveMineData() {
  const uid = auth.currentUser?.uid;
  if (!uid) return;
  await updateDoc(doc(db, "mineProfiles", uid), {
    resources: _mineResources,
    tools:     _mineTools,
    artifact:  _mineArtifact,
    energy:    _mineEnergy,
    zone:      _mineZone,
    pvpPower:  calcPvpPower(),
  });
}

// ══════════════════════════════════════════
// ІНІЦІАЛІЗАЦІЯ СТОРІНКИ
// ══════════════════════════════════════════

export async function initMinePage() {
  const uid = auth.currentUser?.uid;
  if (!uid) return;

  injectMineStyles();
  renderMinePage();

  const data = await loadMineData(uid);
  _minePlayer    = data;
  _mineResources = data.resources || { iron:0,lead:0,gold:0,uranium:0,diamond:0,nicus_ore:0 };
  _mineTools     = data.tools || {};
  _mineArtifact  = data.artifact || null;
  _mineEnergy    = data.energy ?? ENERGY_MAX;
  _mineZone      = data.zone || "safe";

  startCanvas();
  startEnergyRegen();
  updateMineUI();
}

export function destroyMinePage() {
  stopCanvas();
  stopEnergyRegen();
}

// ══════════════════════════════════════════
// HTML РЕНДЕР СТОРІНКИ
// ══════════════════════════════════════════

function renderMinePage() {
  const container = document.getElementById("mine-page-root");
  if (!container) return;

  container.innerHTML = `
    <!-- ЗАГОЛОВОК -->
    <div class="mine-header">
      <div class="mine-title">⛏️ Шахта</div>
      <div class="mine-zone-badge" id="mine-zone-badge">Безпечна зона</div>
    </div>

    <!-- CANVAS ІГРОВОГО ПОЛЯ -->
    <div class="mine-canvas-wrap">
      <canvas id="mine-canvas" width="360" height="240"></canvas>
      <div class="mine-canvas-overlay" id="mine-canvas-overlay"></div>
    </div>

    <!-- СТАТУС ГРАВЦЯ -->
    <div class="mine-status-bar">
      <div class="mine-stat-row">
        <span class="mine-stat-lbl">❤️ HP</span>
        <div class="mine-bar-track">
          <div class="mine-bar-fill mine-bar-hp" id="mine-hp-bar" style="width:100%"></div>
        </div>
        <span class="mine-stat-val" id="mine-hp-val">100/100</span>
      </div>
      <div class="mine-stat-row">
        <span class="mine-stat-lbl">⚡ Енергія</span>
        <div class="mine-bar-track">
          <div class="mine-bar-fill mine-bar-en" id="mine-en-bar" style="width:100%"></div>
        </div>
        <span class="mine-stat-val" id="mine-en-val">${ENERGY_MAX}/${ENERGY_MAX}</span>
      </div>
    </div>

    <!-- ПАНЕЛЬ ДІЙ -->
    <div class="mine-actions">
      <!-- МАЙНІНГ -->
      <div class="mine-section-title">⛏️ Майнінг</div>
      <div class="mine-zone-tabs" id="mine-zone-tabs">
        ${Object.entries(MINE_ZONES).map(([k,z]) =>
          `<button class="mine-zone-btn${k==="safe"?" active":""}" data-zone="${k}"
            onclick="mineGoZone('${k}')">${z.name}</button>`
        ).join("")}
      </div>
      <button class="mine-action-btn mine-btn-primary" onclick="mineStrike()">
        ⛏️ Копати (-${ENERGY_MINE} ⚡)
      </button>

      <!-- РЕСУРСИ -->
      <div class="mine-section-title" style="margin-top:14px;">📦 Ресурси</div>
      <div class="mine-resources-grid" id="mine-resources-grid"></div>

      <!-- АРТЕФАКТ -->
      <div class="mine-section-title" style="margin-top:14px;">💎 Артефакт</div>
      <div id="mine-artifact-panel"></div>

      <!-- КРАФТ ІНСТРУМЕНТІВ -->
      <div class="mine-section-title" style="margin-top:14px;">🔨 Крафт</div>
      <div class="mine-craft-grid" id="mine-craft-grid"></div>

      <!-- ЕКІПІРОВКА -->
      <div class="mine-section-title" style="margin-top:14px;">🧤 Екіпіровка</div>
      <div id="mine-equipment-panel"></div>

      <!-- АПГРЕЙД АРТЕФАКТУ -->
      <div class="mine-section-title" style="margin-top:14px;">🔧 Покращення артефакту</div>
      <div id="mine-upgrade-panel"></div>

      <!-- PvP -->
      <div class="mine-section-title" style="margin-top:14px;">⚔️ PvP Аренa</div>
      <div id="mine-pvp-panel"></div>

      <!-- ЛОГ -->
      <div class="mine-section-title" style="margin-top:14px;">📋 Журнал</div>
      <div class="mine-log" id="mine-log"></div>
    </div>
  `;
}

// ══════════════════════════════════════════
// CANVAS — СТІКМЕН + ЕФЕКТИ
// ══════════════════════════════════════════

function startCanvas() {
  _mineCanvas = document.getElementById("mine-canvas");
  if (!_mineCanvas) return;
  _mineCtx = _mineCanvas.getContext("2d");
  _mineEntities = [];
  drawFrame();
  _mineLoop = setInterval(() => {
    _mineTick++;
    updateEntities();
    drawFrame();
  }, 50); // 20fps
}

function stopCanvas() {
  if (_mineLoop) { clearInterval(_mineLoop); _mineLoop = null; }
}

function drawFrame() {
  const ctx = _mineCtx;
  const W = _mineCanvas.width, H = _mineCanvas.height;
  const zone = MINE_ZONES[_mineZone];

  // Фон зони
  ctx.fillStyle = zone.bg;
  ctx.fillRect(0, 0, W, H);

  // Декоративна шахта — стіни + блоки
  drawMineBackground(ctx, W, H, zone);

  // Стікмен гравця
  const hp    = _mineArtifact?.hp || 100;
  const maxHp = getMaxHp();
  drawStickman(ctx, W/2 - 40, H - 80, {
    nickname: _minePlayer?.nickname || "Гравець",
    hpFrac: hp / maxHp,
    weapon: _mineTools.sword   ? TOOL_STATS[_mineTools.sword] : null,
    armor:  _mineTools.armor_body ? TOOL_STATS[_mineTools.armor_body] : null,
    color: "#e8f4f8",
  });

  // Монстри / ефекти
  _mineEntities.forEach(e => drawEntity(ctx, e));

  // Overlay темряви на глибоких зонах
  const depthAlpha = zone.depth * 0.12;
  if (depthAlpha > 0) {
    ctx.fillStyle = `rgba(0,0,0,${depthAlpha})`;
    ctx.fillRect(0, 0, W, H);
  }
}

function drawMineBackground(ctx, W, H, zone) {
  // Підлога
  ctx.fillStyle = "#2a1a00";
  ctx.fillRect(0, H - 30, W, 30);

  // Блоки ресурсів (декор)
  const resCols = { iron:"#aaa", lead:"#778", gold:"#f5b100", uranium:"#5ecb3e", diamond:"#0af", nicus_ore:"#b45dff" };
  zone.resources.forEach((res, i) => {
    const bx = 20 + i * 55;
    const by = H - 60;
    ctx.fillStyle = "#1a1a1a";
    ctx.fillRect(bx, by, 40, 25);
    ctx.strokeStyle = resCols[res] || "#888";
    ctx.lineWidth = 2;
    ctx.strokeRect(bx, by, 40, 25);
    ctx.fillStyle = resCols[res] || "#888";
    ctx.font = "14px sans-serif";
    ctx.textAlign = "center";
    ctx.fillText(RESOURCES[res]?.icon || "?", bx + 20, by + 18);
  });

  // Стелю і стіни
  ctx.fillStyle = "#111";
  ctx.fillRect(0, 0, W, 8);
  ctx.fillRect(0, 0, 8, H);
  ctx.fillRect(W - 8, 0, 8, H);
}

function drawStickman(ctx, x, y, opts) {
  const { nickname, hpFrac, weapon, armor, color } = opts;
  ctx.save();

  const bodyColor  = color || "#fff";
  const armorColor = armor ? (armor.material === "diamond" ? "#0af" : armor.material === "gold" ? "#f5b100" : "#aaa") : null;

  // HP бар над головою
  ctx.fillStyle = "#333";
  ctx.fillRect(x - 14, y - 36, 48, 6);
  ctx.fillStyle = hpFrac > 0.5 ? "#5ecb3e" : hpFrac > 0.25 ? "#f5b100" : "#e0203a";
  ctx.fillRect(x - 14, y - 36, 48 * Math.max(0, hpFrac), 6);

  // Нікнейм
  ctx.fillStyle = "#d8f0f8";
  ctx.font = "bold 9px DM Sans, sans-serif";
  ctx.textAlign = "center";
  ctx.fillText(nickname.slice(0, 10), x + 10, y - 40);

  // Голова
  ctx.strokeStyle = bodyColor;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(x + 10, y - 20, 8, 0, Math.PI * 2);
  ctx.stroke();

  // Шолом (броня голова — якщо diamond)
  if (armor?.material === "diamond" && _mineTools.armor_head) {
    ctx.strokeStyle = "#0af";
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.arc(x + 10, y - 20, 10, Math.PI, 0);
    ctx.stroke();
  }

  // Тіло
  ctx.strokeStyle = armorColor || bodyColor;
  ctx.lineWidth   = armorColor ? 3 : 2;
  ctx.beginPath();
  ctx.moveTo(x + 10, y - 12);
  ctx.lineTo(x + 10, y + 10);
  ctx.stroke();

  // Ноги
  ctx.strokeStyle = bodyColor;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(x + 10, y + 10);
  ctx.lineTo(x + 2,  y + 28);
  ctx.moveTo(x + 10, y + 10);
  ctx.lineTo(x + 18, y + 28);
  ctx.stroke();

  // Руки
  ctx.beginPath();
  ctx.moveTo(x + 10, y - 6);
  if (weapon) {
    // Рука з мечем
    ctx.lineTo(x + 26, y + 2);
    // Меч
    const wCol = weapon.material === "diamond" ? "#0af" : weapon.material === "gold" ? "#f5b100" : "#aaa";
    ctx.strokeStyle = wCol;
    ctx.lineWidth = 3;
    ctx.moveTo(x + 24, y + 4);
    ctx.lineTo(x + 36, y - 8);
    ctx.stroke();
    // Руків'я
    ctx.strokeStyle = "#8b4513";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(x + 22, y + 6);
    ctx.lineTo(x + 26, y + 2);
    ctx.stroke();
  } else {
    ctx.lineTo(x - 4, y + 2);
  }
  ctx.strokeStyle = bodyColor;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(x + 10, y - 6);
  ctx.lineTo(x - 4, y + 4);
  ctx.stroke();

  ctx.restore();
}

function drawEntity(ctx, e) {
  if (e.type === "monster") {
    const alive = e.hp > 0;
    ctx.save();
    // Монстр — червоний стікмен
    ctx.globalAlpha = alive ? 1 : 0.3;
    drawStickman(ctx, e.x, e.y, {
      nickname: e.name,
      hpFrac: e.hp / e.maxHp,
      weapon: null,
      armor: null,
      color: "#e05050",
    });
    ctx.restore();
  } else if (e.type === "floatText") {
    ctx.save();
    ctx.globalAlpha = e.alpha;
    ctx.fillStyle   = e.color || "#fff";
    ctx.font        = "bold 13px DM Sans, sans-serif";
    ctx.textAlign   = "center";
    ctx.fillText(e.text, e.x, e.y);
    ctx.restore();
  } else if (e.type === "ore") {
    // Руда що падає
    ctx.save();
    ctx.globalAlpha = e.alpha;
    ctx.font = "18px sans-serif";
    ctx.textAlign = "center";
    ctx.fillText(RESOURCES[e.resource]?.icon || "?", e.x, e.y);
    ctx.restore();
  }
}

function updateEntities() {
  _mineEntities = _mineEntities.filter(e => {
    if (e.type === "floatText") {
      e.y    -= 1.2;
      e.alpha -= 0.025;
      return e.alpha > 0;
    }
    if (e.type === "ore") {
      e.y    += 2;
      e.alpha -= 0.03;
      return e.alpha > 0;
    }
    if (e.type === "monster") {
      if (e.hp <= 0) {
        e.alpha = (e.alpha || 1) - 0.04;
        return e.alpha > 0;
      }
      // Монстр рухається до гравця
      const dx = (_mineCanvas.width / 2 - 30) - e.x;
      if (Math.abs(dx) > 3) e.x += Math.sign(dx) * 1.2;
      return true;
    }
    return true;
  });
}

function spawnFloatText(x, y, text, color) {
  _mineEntities.push({ type:"floatText", x, y, text, color, alpha:1.0 });
}

function spawnOre(resource) {
  const x = 60 + Math.random() * (_mineCanvas?.width - 120 || 200);
  _mineEntities.push({ type:"ore", resource, x, y: 40, alpha: 1.0 });
}

function spawnMonster(zone) {
  const zoneData = MINE_ZONES[zone];
  const hp = 20 + zoneData.depth * 20;
  _mineEntities.push({
    type:"monster", name:"👹 Монстр",
    x: _mineCanvas.width - 60, y: _mineCanvas.height - 80,
    hp, maxHp: hp, alpha: 1.0,
    damage: 5 + zoneData.depth * 5,
  });
}

// ══════════════════════════════════════════
// МАЙНІНГ
// ══════════════════════════════════════════

window.mineGoZone = function(zone) {
  _mineZone = zone;
  document.querySelectorAll(".mine-zone-btn").forEach(b =>
    b.classList.toggle("active", b.dataset.zone === zone)
  );
  const badge = document.getElementById("mine-zone-badge");
  if (badge) { badge.textContent = MINE_ZONES[zone].name; badge.style.color = MINE_ZONES[zone].color; }
  mineLog("📍 Перейшов у: " + MINE_ZONES[zone].name);
  // Очистити монстрів при переході
  _mineEntities = _mineEntities.filter(e => e.type !== "monster");
};

window.mineStrike = function() {
  if (_mineEnergy < ENERGY_MINE) {
    mineLog("⚡ Недостатньо енергії! Почекай...");
    spawnFloatText(180, 140, "⚡ Мало енергії!", "#f07d28");
    return;
  }

  _mineEnergy = Math.max(0, _mineEnergy - ENERGY_MINE);

  const zone    = MINE_ZONES[_mineZone];
  const pick    = _mineTools.pickaxe ? TOOL_STATS[_mineTools.pickaxe] : TOOL_STATS.pick_iron;
  const bonus   = pick.dropBonus || 0;
  const rare    = pick.rareChance || 0;

  // Визначаємо ресурс
  const pool = zone.resources;
  let resKey = pool[Math.floor(Math.random() * pool.length)];
  // Рідкісний дроп
  if (Math.random() < rare) {
    const rarePool = ["diamond", "nicus_ore"];
    resKey = rarePool[Math.floor(Math.random() * rarePool.length)];
    mineLog("✨ Рідкісний дроп: " + RESOURCES[resKey].name + "!");
  }

  const base   = 1 + Math.floor(Math.random() * 3);
  const amount = Math.ceil(base * (1 + bonus));

  _mineResources[resKey] = (_mineResources[resKey] || 0) + amount;

  // Зношення кирки
  if (_mineTools.pickaxe) { wearTool("pickaxe"); }

  spawnFloatText(200, 80, "+" + amount + " " + RESOURCES[resKey].name, RESOURCES[resKey].color);
  spawnOre(resKey);
  mineLog("⛏️ Здобуто: " + amount + "x " + RESOURCES[resKey].name);

  // Шанс монстра
  if (Math.random() < zone.monsterChance) {
    const hasMonster = _mineEntities.some(e => e.type === "monster");
    if (!hasMonster) {
      spawnMonster(_mineZone);
      mineLog("👹 З'явився монстр! Атакуй!");
    }
  }

  updateMineUI();
  saveMineData();
};

// ══════════════════════════════════════════
// БОЙ З МОНСТРОМ
// ══════════════════════════════════════════

window.mineAttackMonster = function() {
  const monster = _mineEntities.find(e => e.type === "monster" && e.hp > 0);
  if (!monster) { mineLog("Немає монстрів поряд"); return; }

  const dmg = calcPlayerDamage("monster");
  const crit = Math.random() < 0.075;
  const finalDmg = crit ? Math.round(dmg * 1.5) : dmg;

  monster.hp -= finalDmg;
  spawnFloatText(monster.x, monster.y - 30, (crit?"💥 КРИТ! ":"") + "-" + finalDmg, "#f07d28");
  mineLog((crit?"💥 Крит! ":"") + "Атака монстра: -" + finalDmg + " HP");

  if (monster.hp <= 0) {
    mineLog("✅ Монстр переможений! Ресурси:");
    const zone  = MINE_ZONES[_mineZone];
    const drops = zone.resources;
    drops.forEach(r => {
      const amt = 1 + Math.floor(Math.random() * 3);
      _mineResources[r] = (_mineResources[r]||0) + amt;
      spawnFloatText(monster.x, monster.y - 50, "+"+amt+" "+RESOURCES[r].name, RESOURCES[r].color);
      mineLog("  +" + amt + "x " + RESOURCES[r].name);
    });
    updateMineUI();
    saveMineData();
    return;
  }

  // Монстр б'є у відповідь
  if (monster.hp > 0) {
    const monDmg = calcMonsterDamage(monster.damage);
    if (_mineArtifact) {
      _mineArtifact.hp = Math.max(0, (_mineArtifact.hp || 100) - monDmg);
      // Ефект броні gold — сповільнення атаки
      if (_mineTools.armor_body && TOOL_STATS[_mineTools.armor_body]?.effect === "attacker_slow_20") {
        mineLog("🛡️ Ефект золотої броні: монстр сповільнений!");
      }
      spawnFloatText(160, 120, "-" + monDmg + " HP", "#e0203a");
      mineLog("👹 Монстр атакує: -" + monDmg + " HP");
      if (_mineArtifact.hp <= 0) {
        mineLog("💀 Артефакт знищений! HP = 0");
      }
    }
    // Зносити меч
    if (_mineTools.sword) wearTool("sword");
    updateMineUI();
    saveMineData();
  }
};

// ══════════════════════════════════════════
// ОБЧИСЛЕННЯ БОЙОВИХ ПОКАЗНИКІВ
// ══════════════════════════════════════════

function calcPlayerDamage(targetType) {
  const artifact = _mineArtifact;
  const sword    = _mineTools.sword ? TOOL_STATS[_mineTools.sword] : null;

  let base = artifact ? artifact.damage : 10;
  let mult = 1.0;
  if (sword) {
    mult = targetType === "player"  ? (sword.vsPlayer  || 1.0)
         : targetType === "monster" ? (sword.vsMonster || 1.0) : 1.0;
    base += sword.damage;
  }
  return Math.round(base * mult);
}

function calcMonsterDamage(raw) {
  const pieces = ["armor_head","armor_body","armor_legs"].filter(k => _mineTools[k]);
  let totalReduce = 0;
  pieces.forEach(k => {
    const s = TOOL_STATS[_mineTools[k]];
    if (!s) return;
    let r = s.reduce || 0;
    // Diamond full set bonus
    if (s.material === "diamond" && pieces.length === 3) r = (2 * r) / 3 * 1.5;
    totalReduce += r;
  });
  totalReduce = Math.min(totalReduce, MAX_REDUCE);
  return Math.max(1, Math.round(raw * (1 - totalReduce)));
}

function getMaxHp() {
  const base = 100;
  const art  = _mineArtifact;
  if (!art) return base;
  const rar  = ARTIFACT_RARITIES[art.rarity] || ARTIFACT_RARITIES.common;
  return Math.round(base * rar.hpMult + (art.level - 1) * 5);
}

function calcPvpPower() {
  const hp  = _mineArtifact?.hp  || 0;
  const dmg = _mineArtifact?.damage || 0;
  const lvl = _mineArtifact?.level || 1;
  return hp + dmg + lvl * 10;
}

// ══════════════════════════════════════════
// ЗНОШЕННЯ ІНСТРУМЕНТІВ
// ══════════════════════════════════════════

function wearTool(slot) {
  const toolId = _mineTools[slot];
  if (!toolId) return;
  const key = "dur_" + toolId + "_" + slot;
  if (!_mineTools.__dur) _mineTools.__dur = {};
  const stats = TOOL_STATS[toolId];
  if (!_mineTools.__dur[key]) _mineTools.__dur[key] = stats.durability;
  _mineTools.__dur[key]--;
  if (_mineTools.__dur[key] <= 0) {
    delete _mineTools[slot];
    delete _mineTools.__dur[key];
    mineLog("💔 " + (slot === "sword" ? "Меч" : slot === "pickaxe" ? "Кирка" : "Броня") + " зламався!");
    updateMineUI();
  }
}

function getToolDur(slot) {
  const toolId = _mineTools[slot];
  if (!toolId) return 0;
  const key    = "dur_" + toolId + "_" + slot;
  if (!_mineTools.__dur) return TOOL_STATS[toolId]?.durability || 100;
  return _mineTools.__dur[key] ?? TOOL_STATS[toolId]?.durability ?? 100;
}

// ══════════════════════════════════════════
// КРАФТ ІНСТРУМЕНТІВ
// ══════════════════════════════════════════

window.mineCraftTool = function(toolId) {
  const cost = CRAFT_COSTS[toolId];
  if (!cost) return;
  for (const [res, amt] of Object.entries(cost)) {
    if ((_mineResources[res] || 0) < amt) {
      mineLog("❌ Недостатньо: " + RESOURCES[res].name + " (потрібно " + amt + ")");
      return;
    }
  }
  for (const [res, amt] of Object.entries(cost)) {
    _mineResources[res] -= amt;
  }
  const s    = TOOL_STATS[toolId];
  const slot = s.type === "pickaxe" ? "pickaxe" : s.type === "armor" ? "armor_body" : "sword";
  _mineTools[slot] = toolId;
  if (!_mineTools.__dur) _mineTools.__dur = {};
  _mineTools.__dur["dur_" + toolId + "_" + slot] = s.durability;
  mineLog("🔨 Скрафтовано: " + toolId);
  updateMineUI();
  saveMineData();
};

// ══════════════════════════════════════════
// КРАФТ АРТЕФАКТУ (5 спеціальних карток)
// ══════════════════════════════════════════

window.mineCraftArtifact = async function() {
  // Перевіряємо що в gameState є 5+ спеціальних предметів
  const uid = auth.currentUser?.uid;
  if (!uid) return;
  const snap = await getDoc(doc(db, "users", uid));
  if (!snap.exists()) return;
  const inv     = snap.data().inventory || [];
  const specials = inv.filter(i => i.rarity === "special" && i.type === "item");
  if (specials.length < 5) {
    mineLog("❌ Потрібно 5 спеціальних предметів для крафту артефакту! (зараз: " + specials.length + ")");
    return;
  }
  // Беремо перші 5
  const used    = specials.slice(0, 5);
  const usedIds = used.map(i => i.id);
  const newInv  = inv.filter(i => !usedIds.includes(i.id));

  // Визначаємо рідкість артефакту
  const roll = Math.random();
  let rar = "common";
  if (roll < 0.05)       rar = "legendary";
  else if (roll < 0.2)   rar = "epic";
  else if (roll < 0.45)  rar = "rare";

  // +/- бонус до характеристик
  const bonusRoll = Math.random();
  let bonusMult = 1.0;
  let bonusDesc = "Нормальний";
  if (bonusRoll < 0.05)      { bonusMult = 0.8 + Math.random()*0.1; bonusDesc = "⬇️ -" + Math.round((1-bonusMult)*100) + "%"; }
  else if (bonusRoll < 0.2)  { bonusMult = 1.1 + Math.random()*0.1; bonusDesc = "⬆️ +" + Math.round((bonusMult-1)*100) + "%"; }

  const rarData  = ARTIFACT_RARITIES[rar];
  const artifact = {
    id:      "art_" + Math.random().toString(36).slice(2),
    level:   1,
    exp:     0,
    rarity:  rar,
    hp:      Math.round(100 * rarData.hpMult  * bonusMult),
    damage:  Math.round(10  * rarData.dmgMult * bonusMult),
    energy:  ENERGY_MAX,
    abilityId: rar === "legendary" ? "shield_burst" : rar === "epic" ? "aoe_strike" : null,
    ownerId: uid,
  };

  _mineArtifact = artifact;
  await runTransaction(db, async (tx) => {
    tx.update(doc(db, "users", uid), { inventory: newInv });
  });
  await saveMineData();

  mineLog("💎 Артефакт скрафтовано! Рідкість: " + rarData.name + " | " + bonusDesc);
  updateMineUI();
};

// ══════════════════════════════════════════
// АПГРЕЙД АРТЕФАКТУ
// ══════════════════════════════════════════

window.mineUpgradeArtifact = function(stat) {
  if (!_mineArtifact) { mineLog("❌ Немає артефакту"); return; }
  if (_mineArtifact.level >= 10) { mineLog("⚠️ Максимальний рівень!"); return; }

  const costMap = { damage: "lead", hp: "gold", energy: "uranium", level: "nicus_ore" };
  const res     = costMap[stat];
  const cost    = 5 + _mineArtifact.level * 2;
  if ((_mineResources[res] || 0) < cost) {
    mineLog("❌ Потрібно: " + cost + "x " + RESOURCES[res].name);
    return;
  }

  _mineResources[res] -= cost;
  const bonus = Math.round(cost * UPGRADE_COEF * 10);

  if (stat === "level") {
    // Підвищення рівня: 50% шанс провалу → -1 рівень
    if (Math.random() < 0.5) {
      _mineArtifact.level = Math.max(1, _mineArtifact.level - 1);
      mineLog("💥 Апгрейд рівня провалився! Рівень: " + _mineArtifact.level);
    } else {
      _mineArtifact.level++;
      mineLog("⬆️ Рівень артефакту: " + _mineArtifact.level);
    }
  } else {
    _mineArtifact[stat] = (_mineArtifact[stat] || 0) + bonus;
    mineLog("✅ " + stat + " +" + bonus + " (витрачено " + cost + "x " + RESOURCES[res].name + ")");
  }

  spawnFloatText(180, 80, stat === "level" ? "LEVEL UP!" : "+" + bonus + " " + stat, "#f5b100");
  updateMineUI();
  saveMineData();
};

// ══════════════════════════════════════════
// PvP
// ══════════════════════════════════════════

window.mineStartPvp = async function() {
  if (_mineEnergy < ENERGY_PVP) { mineLog("⚡ Потрібно " + ENERGY_PVP + " енергії для PvP"); return; }
  if (!_mineArtifact) { mineLog("❌ Потрібен артефакт для PvP"); return; }

  _mineEnergy -= ENERGY_PVP;
  mineLog("⚔️ Шукаємо суперника...");

  try {
    const snap    = await getDocs(collection(db, "mineProfiles"));
    const myUid   = auth.currentUser?.uid;
    const myPow   = calcPvpPower();
    const others  = snap.docs
      .map(d => ({ uid: d.id, ...d.data() }))
      .filter(p => p.uid !== myUid && p.pvpPower > 0 && p.artifact)
      .sort((a, b) => Math.abs(a.pvpPower - myPow) - Math.abs(b.pvpPower - myPow));

    if (!others.length) { mineLog("❌ Суперників не знайдено"); _mineEnergy += ENERGY_PVP; updateMineUI(); return; }

    const opponent = others[0];
    const oppPow   = opponent.pvpPower;
    const myWin    = myPow >= oppPow
      ? 0.5 + 0.3 * Math.min(1, (myPow - oppPow) / oppPow)
      : 0.5 - 0.3 * Math.min(1, (oppPow - myPow) / oppPow);

    const won = Math.random() < myWin;
    if (won) {
      // Виграш: 5–20% ресурсів суперника
      const oppRes = opponent.resources || {};
      const pct    = 0.05 + Math.random() * 0.15;
      const gained = {};
      Object.entries(oppRes).forEach(([k,v]) => {
        const amt = Math.floor(v * pct);
        if (amt > 0) { _mineResources[k] = (_mineResources[k]||0) + amt; gained[k] = amt; }
      });
      const desc = Object.entries(gained).map(([k,v]) => v + "x " + RESOURCES[k]?.name).join(", ");
      mineLog("🏆 Перемога над " + (opponent.nickname||"суперник") + "! Здобуто: " + (desc||"нічого"));
      spawnFloatText(180, 80, "🏆 ПЕРЕМОГА!", "#f5b100");
    } else {
      const pct  = 0.05 + Math.random() * 0.15;
      const lost = {};
      Object.entries(_mineResources).forEach(([k,v]) => {
        const amt = Math.floor(v * pct);
        if (amt > 0) { _mineResources[k] = Math.max(0, v - amt); lost[k] = amt; }
      });
      const desc = Object.entries(lost).map(([k,v]) => v + "x " + RESOURCES[k]?.name).join(", ");
      mineLog("💀 Поразка від " + (opponent.nickname||"суперник") + ". Втрачено: " + (desc||"нічого"));
      spawnFloatText(180, 80, "💀 ПОРАЗКА", "#e0203a");
    }
    updateMineUI();
    saveMineData();
  } catch (e) {
    mineLog("❌ Помилка PvP: " + e.message);
    _mineEnergy += ENERGY_PVP;
    updateMineUI();
  }
};

// ══════════════════════════════════════════
// ЕНЕРГІЯ — РЕГЕНЕРАЦІЯ
// ══════════════════════════════════════════

let _energyRegenInt = null;

function startEnergyRegen() {
  stopEnergyRegen();
  _energyRegenInt = setInterval(() => {
    if (_mineEnergy < ENERGY_MAX) {
      _mineEnergy = Math.min(ENERGY_MAX, _mineEnergy + ENERGY_REGEN);
      updateEnergyBar();
    }
  }, 1000);
}

function stopEnergyRegen() {
  if (_energyRegenInt) { clearInterval(_energyRegenInt); _energyRegenInt = null; }
}

// ══════════════════════════════════════════
// UI ОНОВЛЕННЯ
// ══════════════════════════════════════════

function updateMineUI() {
  updateResourcesGrid();
  updateArtifactPanel();
  updateCraftGrid();
  updateEquipmentPanel();
  updateUpgradePanel();
  updatePvpPanel();
  updateEnergyBar();
  updateHpBar();
  updateLog();
}

function updateEnergyBar() {
  const bar = document.getElementById("mine-en-bar");
  const val = document.getElementById("mine-en-val");
  const pct = (_mineEnergy / ENERGY_MAX) * 100;
  if (bar) bar.style.width = pct + "%";
  if (val) val.textContent = Math.round(_mineEnergy) + "/" + ENERGY_MAX;
}

function updateHpBar() {
  const bar = document.getElementById("mine-hp-bar");
  const val = document.getElementById("mine-hp-val");
  const hp  = _mineArtifact?.hp || 100;
  const max = getMaxHp();
  const pct = Math.min(100, (hp / max) * 100);
  if (bar) bar.style.width = pct + "%";
  if (val) val.textContent = hp + "/" + max;
}

function updateResourcesGrid() {
  const grid = document.getElementById("mine-resources-grid");
  if (!grid) return;
  grid.innerHTML = Object.entries(RESOURCES).map(([k, r]) =>
    `<div class="mine-res-pill">
      <span class="mine-res-icon">${r.icon}</span>
      <div>
        <div class="mine-res-name" style="color:${r.color}">${r.name}</div>
        <div class="mine-res-val">${_mineResources[k] || 0}</div>
      </div>
    </div>`
  ).join("");
}

function updateArtifactPanel() {
  const panel = document.getElementById("mine-artifact-panel");
  if (!panel) return;
  if (!_mineArtifact) {
    panel.innerHTML = `
      <div class="mine-no-artifact">
        <div style="font-size:13px;color:var(--text-muted);margin-bottom:10px;">
          Немає артефакту. Скрафтуй з 5 спеціальних предметів (🌀 Магазин).
        </div>
        <button class="mine-action-btn mine-btn-accent" onclick="mineCraftArtifact()">
          💎 Скрафтувати артефакт
        </button>
      </div>`;
    return;
  }
  const a   = _mineArtifact;
  const rar = ARTIFACT_RARITIES[a.rarity] || ARTIFACT_RARITIES.common;
  panel.innerHTML = `
    <div class="mine-artifact-card" style="border-color:${rar.color}22">
      <div class="mine-artifact-top-bar" style="background:${rar.color}"></div>
      <div class="mine-artifact-body">
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px;">
          <span class="mine-artifact-rar" style="color:${rar.color}">${rar.name}</span>
          <span class="mine-artifact-lvl">Рівень ${a.level}</span>
        </div>
        <div class="mine-artifact-stats">
          <div>❤️ HP: <b>${a.hp}</b></div>
          <div>⚔️ Атака: <b>${a.damage}</b></div>
          <div>⚡ Енергія: <b>${a.energy || ENERGY_MAX}</b></div>
          ${a.abilityId ? `<div>✨ Здібність: <b>${a.abilityId}</b></div>` : ""}
        </div>
        ${_mineEntities.some(e => e.type === "monster" && e.hp > 0) ? `
          <button class="mine-action-btn mine-btn-danger" style="margin-top:8px;" onclick="mineAttackMonster()">
            ⚔️ Атакувати монстра!
          </button>` : ""}
      </div>
    </div>`;
}

function updateCraftGrid() {
  const grid = document.getElementById("mine-craft-grid");
  if (!grid) return;
  grid.innerHTML = Object.entries(CRAFT_COSTS).map(([id, cost]) => {
    const s   = TOOL_STATS[id];
    const lbl = { sword:"Меч", armor:"Броня", pickaxe:"Кирка" }[s.type] || s.type;
    const matName = { iron:"Залізний", gold:"Золотий", diamond:"Діамантовий" }[s.material] || s.material;
    const canAfford = Object.entries(cost).every(([r,a]) => (_mineResources[r]||0) >= a);
    const costStr = Object.entries(cost).map(([r,a]) =>
      `<span style="color:${RESOURCES[r]?.color||"#888"}">${a}x${RESOURCES[r]?.icon||""}</span>`
    ).join(" ");
    return `
      <div class="mine-craft-item ${canAfford?"mine-craft-ok":"mine-craft-no"}">
        <div class="mine-craft-name">${matName} ${lbl}</div>
        <div class="mine-craft-cost">${costStr}</div>
        ${s.type === "sword" ? `<div class="mine-craft-stat">⚔️ ${s.damage} | ⏳ ${s.durability}</div>` : ""}
        ${s.type === "armor" ? `<div class="mine-craft-stat">🛡️ -${Math.round(s.reduce*100)}% | ⏳ ${s.durability}</div>` : ""}
        ${s.type === "pickaxe" ? `<div class="mine-craft-stat">⚡ ${s.speed}x | 🎁 +${Math.round((s.dropBonus||0)*100)}%</div>` : ""}
        <button class="mine-craft-btn ${canAfford?"":"disabled"}" ${canAfford?"":"disabled"}
          onclick="mineCraftTool('${id}')">🔨 Крафт</button>
      </div>`;
  }).join("");
}

function updateEquipmentPanel() {
  const panel = document.getElementById("mine-equipment-panel");
  if (!panel) return;
  const slots = [
    ["sword",      "⚔️ Меч"],
    ["armor_body", "🧤 Броня"],
    ["pickaxe",    "⛏️ Кирка"],
  ];
  panel.innerHTML = `<div class="mine-equip-list">` +
    slots.map(([slot, label]) => {
      const id  = _mineTools[slot];
      const s   = id ? TOOL_STATS[id] : null;
      const dur = id ? getToolDur(slot) : 0;
      const maxDur = s ? s.durability : 100;
      const durPct = id ? Math.round((dur / maxDur) * 100) : 0;
      return `<div class="mine-equip-row">
        <span class="mine-equip-lbl">${label}</span>
        ${id
          ? `<div class="mine-equip-info">
              <span>${s.material || id}</span>
              <div class="mine-dur-track"><div class="mine-dur-fill" style="width:${durPct}%;background:${durPct>50?"#5ecb3e":durPct>20?"#f5b100":"#e0203a"}"></div></div>
              <span style="font-size:11px;color:var(--text-muted)">${dur}/${maxDur}</span>
             </div>`
          : `<span style="color:var(--text-dim);font-size:12px;">— порожньо —</span>`
        }
      </div>`;
    }).join("") +
  `</div>`;
}

function updateUpgradePanel() {
  const panel = document.getElementById("mine-upgrade-panel");
  if (!panel) return;
  if (!_mineArtifact) {
    panel.innerHTML = `<div style="color:var(--text-dim);font-size:13px;">Спочатку скрафтуй артефакт</div>`;
    return;
  }
  const lvl  = _mineArtifact.level;
  const cost = n => 5 + lvl * 2;
  panel.innerHTML = `
    <div class="mine-upgrade-grid">
      <div class="mine-upgrade-item">
        <div class="mine-upg-label">⚔️ Атака</div>
        <div class="mine-upg-cost">${cost()} 🔩 Свинець</div>
        <button class="mine-action-btn mine-btn-sm" onclick="mineUpgradeArtifact('damage')">+ Покращити</button>
      </div>
      <div class="mine-upgrade-item">
        <div class="mine-upg-label">❤️ HP</div>
        <div class="mine-upg-cost">${cost()} 🌕 Золото</div>
        <button class="mine-action-btn mine-btn-sm" onclick="mineUpgradeArtifact('hp')">+ Покращити</button>
      </div>
      <div class="mine-upgrade-item">
        <div class="mine-upg-label">⚡ Енергія</div>
        <div class="mine-upg-cost">${cost()} ☢️ Уран</div>
        <button class="mine-action-btn mine-btn-sm" onclick="mineUpgradeArtifact('energy')">+ Покращити</button>
      </div>
      <div class="mine-upgrade-item">
        <div class="mine-upg-label">⬆️ Рівень (50/50)</div>
        <div class="mine-upg-cost">${cost()} 🌀 Нікус-руда</div>
        <button class="mine-action-btn mine-btn-sm mine-btn-danger" onclick="mineUpgradeArtifact('level')">⬆️ Рівень</button>
      </div>
    </div>`;
}

function updatePvpPanel() {
  const panel = document.getElementById("mine-pvp-panel");
  if (!panel) return;
  const pow = calcPvpPower();
  panel.innerHTML = `
    <div style="display:flex;align-items:center;justify-content:space-between;gap:10px;flex-wrap:wrap;">
      <div>
        <div style="font-size:13px;color:var(--text-muted);">Твоя бойова міць:</div>
        <div style="font-family:'Syne',sans-serif;font-size:22px;font-weight:800;color:var(--accent);">${pow}</div>
      </div>
      <button class="mine-action-btn mine-btn-primary" onclick="mineStartPvp()" style="flex:0 0 auto;">
        ⚔️ Битва (-${ENERGY_PVP} ⚡)
      </button>
    </div>`;
}

// ══════════════════════════════════════════
// ЛОГ
// ══════════════════════════════════════════

function mineLog(msg) {
  const time = new Date().toLocaleTimeString("uk-UA", { hour:"2-digit", minute:"2-digit", second:"2-digit" });
  _mineLog.unshift({ time, msg });
  if (_mineLog.length > 30) _mineLog.length = 30;
}

function updateLog() {
  const el = document.getElementById("mine-log");
  if (!el) return;
  el.innerHTML = _mineLog.slice(0, 12).map(l =>
    `<div class="mine-log-row"><span class="mine-log-time">${l.time}</span><span>${l.msg}</span></div>`
  ).join("");
}

// ══════════════════════════════════════════
// СТИЛІ
// ══════════════════════════════════════════

function injectMineStyles() {
  if (document.getElementById("mine-styles")) return;
  const s = document.createElement("style");
  s.id = "mine-styles";
  s.textContent = `
    /* ── Загальна обгортка ── */
    #mine-page-root {
      max-width: 520px;
      margin: 0 auto;
      padding: 0 0 20px;
      box-sizing: border-box;
    }

    /* ── Заголовок ── */
    .mine-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 14px 16px 10px;
      border-bottom: 1px solid var(--border);
    }
    .mine-title {
      font-family: 'Syne', sans-serif;
      font-size: 20px;
      font-weight: 800;
      color: var(--text);
    }
    .mine-zone-badge {
      font-size: 12px;
      font-weight: 700;
      padding: 4px 12px;
      border-radius: 20px;
      border: 1.5px solid var(--border);
      background: var(--glass);
      color: var(--teal);
    }

    /* ── Canvas ── */
    .mine-canvas-wrap {
      position: relative;
      margin: 0 12px 10px;
      border-radius: var(--radius-md);
      overflow: hidden;
      border: 2px solid var(--border);
      box-shadow: var(--shadow-md);
    }
    #mine-canvas {
      display: block;
      width: 100%;
      height: auto;
      background: #111;
    }

    /* ── Статус бар ── */
    .mine-status-bar {
      margin: 0 12px 14px;
      display: flex;
      flex-direction: column;
      gap: 6px;
    }
    .mine-stat-row {
      display: flex;
      align-items: center;
      gap: 8px;
    }
    .mine-stat-lbl {
      font-size: 12px;
      font-weight: 700;
      color: var(--text-muted);
      min-width: 70px;
    }
    .mine-bar-track {
      flex: 1;
      height: 8px;
      background: rgba(255,255,255,0.08);
      border-radius: 6px;
      overflow: hidden;
      border: 1px solid var(--border);
    }
    .mine-bar-fill {
      height: 100%;
      border-radius: 6px;
      transition: width 0.3s;
    }
    .mine-bar-hp { background: linear-gradient(90deg, #e0203a, #f07d28); }
    .mine-bar-en { background: linear-gradient(90deg, #0ab4cc, #f5b100); }
    .mine-stat-val {
      font-size: 11px;
      font-weight: 700;
      color: var(--text-muted);
      min-width: 55px;
      text-align: right;
    }

    /* ── Дії (загальна обгортка) ── */
    .mine-actions { padding: 0 12px; }
    .mine-section-title {
      font-family: 'Syne', sans-serif;
      font-size: 13px;
      font-weight: 800;
      color: var(--text-muted);
      text-transform: uppercase;
      letter-spacing: 1px;
      margin-bottom: 8px;
    }

    /* ── Зони ── */
    .mine-zone-tabs {
      display: flex;
      gap: 6px;
      flex-wrap: wrap;
      margin-bottom: 10px;
    }
    .mine-zone-btn {
      padding: 6px 11px;
      border-radius: 20px;
      border: 1.5px solid var(--border);
      background: var(--glass);
      color: var(--text-muted);
      font-size: 12px;
      font-weight: 600;
      cursor: pointer;
      transition: all .15s;
    }
    .mine-zone-btn.active, .mine-zone-btn:hover {
      background: linear-gradient(135deg, var(--teal), var(--accent));
      color: #fff;
      border-color: var(--teal);
    }

    /* ── Кнопки ── */
    .mine-action-btn {
      padding: 11px 16px;
      border-radius: var(--radius-md);
      border: none;
      font-size: 14px;
      font-weight: 700;
      cursor: pointer;
      transition: all .2s;
      width: 100%;
    }
    .mine-btn-primary {
      background: linear-gradient(135deg, var(--teal), var(--accent));
      color: #fff;
      box-shadow: 0 3px 12px rgba(10,180,204,0.3);
    }
    .mine-btn-primary:hover { filter: brightness(1.08); transform: translateY(-1px); }
    .mine-btn-accent {
      background: linear-gradient(135deg, #b45dff, #f07d28);
      color: #fff;
    }
    .mine-btn-danger {
      background: rgba(224,32,58,0.15);
      border: 1.5px solid rgba(224,32,58,0.4) !important;
      color: #e0203a;
    }
    .mine-btn-danger:hover { background: rgba(224,32,58,0.25); }
    .mine-btn-sm {
      font-size: 12px;
      padding: 7px 10px;
    }

    /* ── Ресурси ── */
    .mine-resources-grid {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 8px;
      margin-bottom: 4px;
    }
    .mine-res-pill {
      display: flex;
      align-items: center;
      gap: 6px;
      background: var(--glass);
      border: 1.5px solid var(--glass-border);
      border-radius: var(--radius-sm);
      padding: 8px 10px;
      backdrop-filter: blur(8px);
    }
    .mine-res-icon { font-size: 18px; flex-shrink: 0; }
    .mine-res-name { font-size: 10px; font-weight: 700; }
    .mine-res-val  { font-size: 15px; font-weight: 800; color: var(--text); }

    /* ── Артефакт ── */
    .mine-artifact-card {
      background: var(--glass);
      border: 2px solid var(--border);
      border-radius: var(--radius-md);
      overflow: hidden;
      backdrop-filter: blur(12px);
    }
    .mine-artifact-top-bar { height: 3px; }
    .mine-artifact-body { padding: 12px; }
    .mine-artifact-rar { font-size: 12px; font-weight: 800; text-transform: uppercase; }
    .mine-artifact-lvl {
      font-family: 'Syne', sans-serif;
      font-size: 13px;
      font-weight: 800;
      color: var(--gold);
    }
    .mine-artifact-stats {
      display: grid;
      grid-template-columns: repeat(2, 1fr);
      gap: 4px 12px;
      font-size: 13px;
      color: var(--text-muted);
      margin-top: 6px;
    }
    .mine-artifact-stats b { color: var(--text); }
    .mine-no-artifact {
      background: var(--glass);
      border: 1.5px dashed var(--border);
      border-radius: var(--radius-md);
      padding: 16px;
      text-align: center;
    }

    /* ── Крафт ── */
    .mine-craft-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(140px, 1fr));
      gap: 8px;
    }
    .mine-craft-item {
      background: var(--glass);
      border: 1.5px solid var(--border);
      border-radius: var(--radius-sm);
      padding: 10px;
      display: flex;
      flex-direction: column;
      gap: 4px;
    }
    .mine-craft-ok  { border-color: rgba(10,180,204,0.3); }
    .mine-craft-no  { opacity: 0.6; }
    .mine-craft-name { font-size: 12px; font-weight: 700; color: var(--text); }
    .mine-craft-cost { font-size: 11px; }
    .mine-craft-stat { font-size: 10px; color: var(--text-muted); }
    .mine-craft-btn {
      margin-top: 4px;
      padding: 6px;
      border-radius: 6px;
      border: 1.5px solid var(--teal);
      background: rgba(10,180,204,0.1);
      color: var(--teal-dark);
      font-size: 12px;
      font-weight: 700;
      cursor: pointer;
    }
    .mine-craft-btn.disabled { opacity: .4; cursor: not-allowed; }

    /* ── Екіпіровка ── */
    .mine-equip-list { display: flex; flex-direction: column; gap: 8px; }
    .mine-equip-row {
      display: flex;
      align-items: center;
      gap: 10px;
      background: var(--glass);
      border: 1.5px solid var(--glass-border);
      border-radius: var(--radius-sm);
      padding: 10px 12px;
    }
    .mine-equip-lbl {
      font-size: 12px;
      font-weight: 700;
      color: var(--text-muted);
      min-width: 72px;
    }
    .mine-equip-info {
      display: flex;
      align-items: center;
      gap: 8px;
      flex: 1;
      font-size: 12px;
      font-weight: 700;
      color: var(--text);
    }
    .mine-dur-track {
      flex: 1;
      height: 5px;
      background: rgba(255,255,255,0.1);
      border-radius: 4px;
      overflow: hidden;
    }
    .mine-dur-fill {
      height: 100%;
      border-radius: 4px;
      transition: width .3s;
    }

    /* ── Апгрейд ── */
    .mine-upgrade-grid {
      display: grid;
      grid-template-columns: repeat(2, 1fr);
      gap: 8px;
    }
    .mine-upgrade-item {
      background: var(--glass);
      border: 1.5px solid var(--glass-border);
      border-radius: var(--radius-sm);
      padding: 10px;
      display: flex;
      flex-direction: column;
      gap: 4px;
    }
    .mine-upg-label { font-size: 13px; font-weight: 700; color: var(--text); }
    .mine-upg-cost  { font-size: 11px; color: var(--text-muted); }

    /* ── Лог ── */
    .mine-log {
      background: rgba(0,0,0,0.18);
      border: 1px solid var(--border);
      border-radius: var(--radius-sm);
      padding: 8px 10px;
      max-height: 180px;
      overflow-y: auto;
      display: flex;
      flex-direction: column;
      gap: 3px;
      scrollbar-width: thin;
    }
    .mine-log-row {
      display: flex;
      gap: 8px;
      font-size: 12px;
      color: var(--text-muted);
      line-height: 1.4;
    }
    .mine-log-time {
      flex-shrink: 0;
      color: var(--text-dim);
      font-size: 10px;
      margin-top: 1px;
    }

    /* ── Темна тема ── */
    body.theme-dark .mine-artifact-card,
    body.theme-dark .mine-equip-row,
    body.theme-dark .mine-craft-item,
    body.theme-dark .mine-upgrade-item,
    body.theme-dark .mine-res-pill {
      background: var(--glass);
    }

    /* ── Адаптив ── */
    @media (max-width: 380px) {
      .mine-resources-grid { grid-template-columns: repeat(2, 1fr); }
      .mine-upgrade-grid   { grid-template-columns: 1fr; }
      .mine-craft-grid     { grid-template-columns: repeat(2, 1fr); }
    }
  `;
  document.head.appendChild(s);
}