// ============================================
// MINE.JS — НІКУС КЕЙС РЕМЕЙК v5
// Fixes: slate block, mini-craft, armor display,
//        improved stickman, workbench system
// ============================================

import { auth, db } from "./firebase.js";
import {
  doc, getDoc, setDoc, updateDoc, onSnapshot,
  collection, deleteDoc, serverTimestamp, getDocs, query, where
} from "https://www.gstatic.com/firebasejs/10.7.0/firebase-firestore.js";

// ══════════════════════════════════════════
// SEEDED PRNG (mulberry32)
// ══════════════════════════════════════════
function mulberry32(seed) {
  return function() {
    seed |= 0; seed = seed + 0x6D2B79F5 | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = t + Math.imul(t ^ (t >>> 7), 61 | t) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

let _rng = Math.random;

// ══════════════════════════════════════════
// КОНФІГ
// ══════════════════════════════════════════

const T        = 20;
const W_TILES  = 800;
const H_TILES  = 250;
const GRAVITY  = 0.45;
const JUMP_V   = -11;
const MOVE_SPD = 3.5;
const CAM_LERP = 0.1;

const SKY_H    = 40;
const DEEP_TOP = 160;
const CORE_TOP = 220;

const MAX_PLAYERS    = 4;
const DAILY_LIMIT_MS = 60 * 60 * 1000;

const HEARTBEAT_INTERVAL_MS = 8000;
const PLAYER_ACTIVE_MS = 20000;

// ── ТИПИ ТАЙЛІВ ──────────────────────────
const T_AIR    = 0;
const T_GRASS  = 1;
const T_DIRT   = 2;
const T_STONE  = 3;
const T_IRON   = 4;
const T_LEAD   = 5;
const T_GOLD   = 6;
const T_URAN   = 7;
const T_DIAM   = 8;
const T_NICUS  = 9;
const T_BEDROCK= 10;
const T_WOOD   = 11;
const T_LEAF   = 12;
const T_SAND   = 13;
const T_WATER  = 14;
const T_SLATE  = 15;
const T_CRAFT  = 16;

// ── КОЛЬОРИ ТАЙЛІВ ───────────────────────
const TILE_COLOR = {
  [T_GRASS]:  "#4a8a2a",
  [T_DIRT]:   "#8b5e3c",
  [T_STONE]:  "#7a7a8a",
  [T_IRON]:   "#b0b0c0",
  [T_LEAD]:   "#6a6a80",
  [T_GOLD]:   "#f5b100",
  [T_URAN]:   "#5ecb3e",
  [T_DIAM]:   "#00ccff",
  [T_NICUS]:  "#b45dff",
  [T_BEDROCK]:"#333340",
  [T_WOOD]:   "#a0622a",
  [T_LEAF]:   "#2d7a1a",
  [T_SAND]:   "#e8d87a",
  [T_WATER]:  "rgba(40,120,255,0.45)",
  // SLATE: темно-сірий з синюватим відтінком, відмінний від звичайного каміння
  [T_SLATE]:  "#38384a",
  [T_CRAFT]:  "#c87a30",
};

// ── ДРОПИ ────────────────────────────────
const DROP_RESOURCE = {
  [T_IRON]:"iron",[T_LEAD]:"lead",[T_GOLD]:"gold",
  [T_URAN]:"uranium",[T_DIAM]:"diamond",[T_NICUS]:"nicus_ore",
  [T_STONE]:"stone",[T_DIRT]:"dirt",[T_WOOD]:"wood",
  [T_GRASS]:"dirt",[T_SAND]:"sand",
  // Сланець дає окремий ресурс "slate"
  [T_SLATE]:"slate",
  [T_CRAFT]:"wood",
};

const RES_DATA = {
  iron:      { icon:"⚙️",  name:"Залізо" },
  lead:      { icon:"🔩",  name:"Свинець" },
  gold:      { icon:"🌕",  name:"Золото" },
  uranium:   { icon:"☢️",  name:"Уран" },
  diamond:   { icon:"💎",  name:"Алмаз" },
  nicus_ore: { icon:"🌀",  name:"Нікус-руда" },
  stone:     { icon:"🪨",  name:"Камінь" },
  dirt:      { icon:"🟫",  name:"Земля" },
  wood:      { icon:"🪵",  name:"Дерево" },
  sand:      { icon:"🟡",  name:"Пісок" },
  slate:     { icon:"🔷",  name:"Сланець" },
  // Крафтовані залізні (міні-крафт)
  iron_sword:    { icon:"⚔️",  name:"Залізний меч" },
  iron_armor:    { icon:"🛡️",  name:"Залізна броня" },
  iron_pickaxe:  { icon:"⛏️",  name:"Залізна кирка" },
  // Крафтовані золоті (великий верстак)
  gold_sword:    { icon:"⚔️",  name:"Золотий меч" },
  gold_armor:    { icon:"🛡️",  name:"Золота броня" },
  gold_pickaxe:  { icon:"⛏️",  name:"Золота кирка" },
  // Алмазні (великий верстак)
  diamond_sword: { icon:"⚔️",  name:"Алмазний меч" },
  diamond_armor: { icon:"🛡️",  name:"Алмазна броня" },
  diamond_pickaxe:{ icon:"⛏️", name:"Алмазна кирка" },
  // Нікус (великий верстак)
  nicus_sword:   { icon:"⚔️",  name:"Нікус меч" },
  nicus_armor:   { icon:"🛡️",  name:"Нікус броня" },
  nicus_pickaxe: { icon:"⛏️",  name:"Нікус кирка" },
};

// Що можна будувати (ресурс → тайл)
const PLACEABLE = {
  stone: T_STONE, dirt: T_DIRT, wood: T_WOOD, sand: T_SAND, slate: T_SLATE,
};

// ── ТВЕРДІСТЬ ТАЙЛІВ ─────────────────────
const TILE_HARDNESS = {
  [T_GRASS]:  300,
  [T_DIRT]:   300,
  [T_SAND]:   200,
  [T_STONE]:  700,
  [T_WOOD]:   400,
  [T_LEAF]:   100,
  [T_IRON]:   900,
  [T_LEAD]:  1000,
  [T_GOLD]:  1100,
  [T_URAN]:  1400,
  [T_DIAM]:  1800,
  [T_NICUS]: 2200,
  // Сланець — міцніший за каміння, слабший за залізо
  [T_SLATE]: 1200,
  [T_CRAFT]:  500,
};

// ══════════════════════════════════════════
// ПРЕДМЕТИ
// ══════════════════════════════════════════

const ITEM_DEFS = {
  iron_sword:    { type:"sword",   mat:"iron",    damage:1.0,  durability:100, desc:"Урон ×1.0, міцність 100" },
  iron_armor:    { type:"armor",   mat:"iron",    reduce:1.0,  durability:100, desc:"Захист ×1.0, міцність 100" },
  iron_pickaxe:  { type:"pickaxe", mat:"iron",    speed:1.0,   durability:100, desc:"Швидкість ×1.0" },
  gold_sword:    { type:"sword",   mat:"gold",    damage:0.9,  durability:60,  desc:"Уповільнює ворогів" },
  gold_armor:    { type:"armor",   mat:"gold",    reduce:0.7,  durability:60,  desc:"Атакуючий уповільнюється" },
  gold_pickaxe:  { type:"pickaxe", mat:"gold",    speed:1.0,   dropBonus:0.05, durability:60, desc:"+5% дроп" },
  diamond_sword: { type:"sword",   mat:"diamond", damage:2.0,  durability:200, desc:"Урон ×2.0" },
  diamond_armor: { type:"armor",   mat:"diamond", reduce:0.67, durability:200, desc:"Потужний захист" },
  diamond_pickaxe:{ type:"pickaxe",mat:"diamond", speed:1.5,   durability:200, desc:"Швидкість ×1.5" },
  nicus_sword:   { type:"sword",   mat:"nicus",   damage:3.0,  durability:400, desc:"Найсильніший" },
  nicus_armor:   { type:"armor",   mat:"nicus",   reduce:0.5,  durability:400, desc:"Найкращий захист" },
  nicus_pickaxe: { type:"pickaxe", mat:"nicus",   speed:2.0,   durability:400, desc:"Швидкість ×2.0" },
};

// Кольори матеріалів для броні на персонажі
const ARMOR_COLORS = {
  iron:    { fill:"rgba(176,176,192,0.75)", stroke:"#8888a0" },
  gold:    { fill:"rgba(245,177,0,0.72)",   stroke:"#c89000" },
  diamond: { fill:"rgba(0,204,255,0.68)",   stroke:"#00aacc" },
  nicus:   { fill:"rgba(180,93,255,0.70)",  stroke:"#8833cc" },
};

// ── РЕЦЕПТИ МІНІ-КРАФТУ (тільки верстак + залізо) ──
const MINI_CRAFT_RECIPES = [
  { result:"iron_sword",   count:1, needs:{ iron:3, stone:1 },  label:"Залізний меч" },
  { result:"iron_armor",   count:1, needs:{ iron:5 },            label:"Залізна броня" },
  { result:"iron_pickaxe", count:1, needs:{ iron:3, wood:2 },   label:"Залізна кирка" },
];

// ── РЕЦЕПТИ ВЕЛИКОГО ВЕРСТАКУ ──
const WORKBENCH_RECIPES = [
  { result:"gold_sword",      count:1, needs:{ gold:3, stone:1 },       label:"Золотий меч" },
  { result:"gold_armor",      count:1, needs:{ gold:5 },                 label:"Золота броня" },
  { result:"gold_pickaxe",    count:1, needs:{ gold:3, wood:2 },        label:"Золота кирка" },
  { result:"diamond_sword",   count:1, needs:{ diamond:3, stone:1 },    label:"Алмазний меч" },
  { result:"diamond_armor",   count:1, needs:{ diamond:5 },              label:"Алмазна броня" },
  { result:"diamond_pickaxe", count:1, needs:{ diamond:3, wood:2 },     label:"Алмазна кирка" },
  { result:"nicus_sword",     count:1, needs:{ nicus_ore:3, diamond:1 },label:"Нікус меч" },
  { result:"nicus_armor",     count:1, needs:{ nicus_ore:5, diamond:1 },label:"Нікус броня" },
  { result:"nicus_pickaxe",   count:1, needs:{ nicus_ore:3, diamond:2 },label:"Нікус кирка" },
];

const WORKBENCH_RECIPE_BUILD = { wood: 4 };

// ══════════════════════════════════════════
// СТАН
// ══════════════════════════════════════════

let _world       = null;
let _worldMod    = {};
let _player      = null;
let _others      = {};

let _canvas      = null;
let _ctx         = null;
let _cam         = { x:0, y:0 };
let _camTarget   = { x:0, y:0 };
let _keys        = {};
let _loop        = null;
let _tick        = 0;
let _lastTs      = 0;

let _mineProgress = 0;
let _mineTile     = null;
let _mineActive   = false;

let _inventory   = {};
let _hotbar      = ["stone","dirt","wood","slate",null,null,null,null];
let _hotbarSel   = 0;
let _buildMode   = false;

let _unsubOthers   = null;
let _unsubWorld    = null;
let _saveTimer     = null;
let _pushModTimer  = null;
let _posPushMs     = 0;
let _heartbeatTimer = null;

let _particles   = [];
let _drops       = [];
let _logLines    = [];

let _mouseWorld  = { x:0, y:0 };
let _touchMineId = null;
const _touch = { left:false, right:false, jump:false };

let _playerDirty    = false;
let _inventoryDirty = false;
let _pendingMods = {};

let _coyoteTimer = 0;
let _lastPushedPos = { x: -9999, y: -9999, dir: 1, mining: false };
const POS_PUSH_THRESHOLD = 8;

let _hudHpDirty     = true;
let _hudResDirty    = true;
let _hudHotbarDirty = true;

let _playedTodayMs  = 0;
let _sessionStartTs = 0;
let _timeLimitHit   = false;

let _inLobby = true;
let _lobbyUnsub = null;

// Крафт панелі
let _miniCraftOpen = false;
let _workbenchOpen = false;

// Екіпіровані предмети
let _equippedPickaxe = null; // ключ або null
let _equippedArmor   = null; // ключ або null
let _equippedSword   = null; // ключ або null

let _nearWorkbench = false;

// ══════════════════════════════════════════
// ІНІЦІАЛІЗАЦІЯ
// ══════════════════════════════════════════

export async function initMinePage() {
  const uid = auth.currentUser?.uid;
  if (!uid) return;
  injectMineStyles();
  _inLobby = true;
  await showLobby(uid);
}

async function showLobby(uid) {
  const root = document.getElementById("mine-page-root");
  if (!root) return;

  const profSnap = await getDoc(doc(db, "mineProfiles", uid));
  const profData = profSnap.exists() ? profSnap.data() : {};
  const todayKey = new Date().toISOString().slice(0, 10);
  _playedTodayMs = (profData.playedToday || {})[todayKey] || 0;
  const remainMs  = Math.max(0, DAILY_LIMIT_MS - _playedTodayMs);
  const remainMin = Math.floor(remainMs / 60000);
  const remainSec = Math.floor((remainMs % 60000) / 1000);

  const playersSnap = await getDocs(collection(db, "minePlayers"));
  const now = Date.now();
  const activePlayers = playersSnap.docs.filter(d =>
    d.id !== "lobby" && (now - (d.data().ts || 0)) < PLAYER_ACTIVE_MS
  );
  const activeCount = activePlayers.length;
  const activeNames = activePlayers.map(d => d.data().name || "?");
  const canPlay = remainMs > 0 && activeCount < MAX_PLAYERS;

  root.innerHTML = `
    <div id="mine-lobby">
      <div class="mlobby-card">
        <div class="mlobby-title">⛏️ Шахта</div>
        <div class="mlobby-subtitle">Нікус Кейс Ремейк</div>
        <div class="mlobby-stats">
          <div class="mlobby-stat">
            <div class="mlobby-stat-icon">👥</div>
            <div class="mlobby-stat-val">${activeCount} / ${MAX_PLAYERS}</div>
            <div class="mlobby-stat-label">Гравців онлайн</div>
          </div>
          <div class="mlobby-stat">
            <div class="mlobby-stat-icon">⏱️</div>
            <div class="mlobby-stat-val">${remainMin}:${String(remainSec).padStart(2,'0')}</div>
            <div class="mlobby-stat-label">Залишилось сьогодні</div>
          </div>
        </div>
        ${activeNames.length ? `
          <div class="mlobby-players">
            <div class="mlobby-players-title">Зараз грають:</div>
            ${activeNames.map(n => `<span class="mlobby-player-chip">👤 ${n}</span>`).join('')}
          </div>` : `<div class="mlobby-empty-players">Ніхто не грає</div>`}
        <div class="mlobby-rules">
          <div>📋 Правила:</div>
          <div>• Максимум ${MAX_PLAYERS} гравці одночасно</div>
          <div>• Не більше 1 години на день</div>
          <div>• Ресурси зберігаються між сесіями</div>
          <div>• Сланець — темний міцний камінь, між золотом та алмазами</div>
        </div>
        ${!canPlay && remainMs <= 0 ? `
          <div class="mlobby-limit-msg">⏰ Ліміт вичерпано. Повертайся завтра!</div>
          <button class="mlobby-btn mlobby-btn-disabled" disabled>Недоступно</button>
        ` : !canPlay ? `
          <div class="mlobby-limit-msg">🚫 Шахта заповнена.</div>
          <button class="mlobby-btn mlobby-btn-disabled" disabled>Заповнено</button>
        ` : `
          <button class="mlobby-btn" id="mlobby-enter-btn" onclick="window.mineEnterGame()">
            ⛏️ Увійти в шахту
          </button>
        `}
        <button class="mlobby-back" onclick="navigate('main')">← Назад</button>
      </div>
    </div>
  `;
}

window.mineEnterGame = async function() {
  const uid = auth.currentUser?.uid;
  if (!uid) return;
  const btn = document.getElementById("mlobby-enter-btn");
  if (btn) { btn.disabled = true; btn.textContent = "⏳ Завантаження..."; }
  _inLobby = false;
  _sessionStartTs = Date.now();
  await startMineGame(uid);
};

async function startMineGame(uid) {
  buildMineHTML();

  _canvas = document.getElementById("mine-canvas");
  _ctx    = _canvas.getContext("2d");
  resizeCanvas();
  window.addEventListener("resize", resizeCanvas);

  const worldRef  = doc(db, "mineWorld", "main");
  const worldSnap = await getDoc(worldRef);

  let worldSeed;
  if (worldSnap.exists()) {
    const data = worldSnap.data();
    worldSeed = data.seed || Date.now();
    _worldMod = data.mods || {};
    if (!data.seed) await updateDoc(worldRef, { seed: worldSeed });
  } else {
    worldSeed = Date.now();
    await setDoc(worldRef, { mods: {}, seed: worldSeed });
  }

  _rng = mulberry32(worldSeed);
  await new Promise(resolve => setTimeout(() => { generateWorld(); resolve(); }, 0));

  const [profSnap, userSnap] = await Promise.all([
    getDoc(doc(db, "mineProfiles", uid)),
    getDoc(doc(db, "users", uid)),
  ]);
  const username = userSnap.data()?.username || "Гравець";

  const spawnTX = Math.floor(W_TILES / 2);
  const spawnTY = findSafeSpawnY(spawnTX);

  if (profSnap.exists()) {
    const d = profSnap.data();
    let px = (d.x || spawnTX) * T;
    let py = (d.y || spawnTY) * T;
    if (!isSpawnSafe(Math.floor(px/T), Math.floor(py/T))) { px = spawnTX*T; py = spawnTY*T; }
    _player    = makePlayer(uid, username, px, py, d.hp || 100);
    _inventory = d.inventory || {};
    _hotbar    = d.hotbar    || _hotbar;
    _equippedPickaxe = d.equippedPickaxe || null;
    _equippedArmor   = d.equippedArmor   || null;
    _equippedSword   = d.equippedSword   || null;
    const todayKey   = new Date().toISOString().slice(0, 10);
    _playedTodayMs   = (d.playedToday || {})[todayKey] || 0;
  } else {
    _player = makePlayer(uid, username, spawnTX*T, spawnTY*T, 100);
  }

  _cam.x = _player.x - _canvas.width  / 2;
  _cam.y = _player.y - _canvas.height / 2;
  clampCam();

  subscribeOthers(uid);
  subscribeWorldMods();
  bindInput();

  _loop = requestAnimationFrame(gameLoop);
  _saveTimer = setInterval(savePlayer, 30000);
  _heartbeatTimer = setInterval(() => pushHeartbeat(uid), HEARTBEAT_INTERVAL_MS);

  updateHotbarUI();
  updateModeBtn();
  updateEquipHUD();
  addLog("⛏️ ЛКМ/тап — копати | E — будувати | Q — міні-крафт | F — верстак");
}

export function destroyMinePage() {
  cancelAnimationFrame(_loop);    _loop        = null;
  clearInterval(_saveTimer);      _saveTimer   = null;
  clearInterval(_heartbeatTimer); _heartbeatTimer = null;
  clearTimeout(_pushModTimer);
  if (_unsubOthers) { _unsubOthers(); _unsubOthers = null; }
  if (_unsubWorld)  { _unsubWorld();  _unsubWorld  = null; }
  if (_lobbyUnsub)  { _lobbyUnsub();  _lobbyUnsub  = null; }
  unbindInput();
  window.removeEventListener("resize", resizeCanvas);

  if (!_inLobby) {
    _playerDirty    = true;
    _inventoryDirty = true;
    savePlayer();
    const uid = auth.currentUser?.uid;
    if (uid) deleteDoc(doc(db, "minePlayers", uid)).catch(()=>{});
  }
}

function makePlayer(uid, name, x, y, hp) {
  return { uid, name, x, y, vx:0, vy:0, w:14, h:28, onGround:false, dir:1, mining:false, hp, maxHp:100 };
}

async function pushHeartbeat(uid) {
  if (!uid || !_player || _inLobby) return;
  const p = _player;
  try {
    await setDoc(doc(db, "minePlayers", uid), {
      x: Math.round(p.x), y: Math.round(p.y),
      name: p.name, dir: p.dir, mining: p.mining,
      armorMat: _equippedArmor ? (ITEM_DEFS[_equippedArmor]?.mat || null) : null,
      ts: Date.now(),
    }, { merge: true });
    _lastPushedPos.x = p.x; _lastPushedPos.y = p.y;
    _lastPushedPos.dir = p.dir; _lastPushedPos.mining = p.mining;
  } catch(e) {}
}

// ══════════════════════════════════════════
// БЕЗПЕЧНИЙ СПАВН
// ══════════════════════════════════════════

function findSafeSpawnY(tx) {
  for (let ty = 0; ty < H_TILES - 3; ty++) {
    if (isSolidTile(tx, ty) && !isSolidTile(tx, ty-1) && !isSolidTile(tx, ty-2))
      return ty - 2;
  }
  return SKY_H - 2;
}

function isSpawnSafe(tx, ty) {
  for (let dy = 0; dy < 2; dy++) {
    if (isSolidTile(tx, ty + dy)) return false;
  }
  return true;
}

// ══════════════════════════════════════════
// HTML
// ══════════════════════════════════════════

function buildMineHTML() {
  const root = document.getElementById("mine-page-root");
  if (!root) return;
  const isTouch = ('ontouchstart' in window) || navigator.maxTouchPoints > 0;
  root.innerHTML = `
    <div id="mine-wrap">
      <canvas id="mine-canvas"></canvas>
      <div id="mine-hud-tl">
        <div id="mine-hp-row">
          <span class="mine-hud-icon">❤️</span>
          <div class="mbar-track"><div id="mine-hp-bar" class="mbar-hp"></div></div>
          <span id="mine-hp-txt">100/100</span>
        </div>
        <div id="mine-res-row"></div>
        <div id="mine-equip-row"></div>
      </div>
      <div id="mine-hud-tr"></div>
      <div id="mine-timer-hud"></div>
      <button id="mine-mode-btn" onclick="window.mineToggleMode()"></button>
      <div id="mine-touch-ctrl" class="${isTouch ? 'touch-visible' : 'touch-hidden'}">
        <div id="mine-touch-left">
          <button class="mtbtn"
            ontouchstart="event.preventDefault();window.mineTouch('left',1)"
            ontouchend="event.preventDefault();window.mineTouch('left',0)"
            ontouchcancel="event.preventDefault();window.mineTouch('left',0)"
            onmousedown="window.mineTouch('left',1)"
            onmouseup="window.mineTouch('left',0)">◀</button>
          <button class="mtbtn"
            ontouchstart="event.preventDefault();window.mineTouch('right',1)"
            ontouchend="event.preventDefault();window.mineTouch('right',0)"
            ontouchcancel="event.preventDefault();window.mineTouch('right',0)"
            onmousedown="window.mineTouch('right',1)"
            onmouseup="window.mineTouch('right',0)">▶</button>
        </div>
        <div id="mine-touch-right">
          <button class="mtbtn mtbtn-jump"
            ontouchstart="event.preventDefault();window.mineTouch('jump',1)"
            ontouchend="event.preventDefault();window.mineTouch('jump',0)"
            ontouchcancel="event.preventDefault();window.mineTouch('jump',0)"
            onmousedown="window.mineTouch('jump',1)"
            onmouseup="window.mineTouch('jump',0)">▲</button>
          <button class="mtbtn mtbtn-act"
            ontouchstart="event.preventDefault();window.mineTouchMine(1)"
            ontouchend="event.preventDefault();window.mineTouchMine(0)"
            ontouchcancel="event.preventDefault();window.mineTouchMine(0)"
            onmousedown="window.mineTouchMine(1)"
            onmouseup="window.mineTouchMine(0)">⛏</button>
        </div>
      </div>
      <div id="mine-hotbar-wrap">
        <div id="mine-hotbar"></div>
        <div id="mine-craft-btns">
          <button id="mine-mini-craft-btn" onclick="window.mineToggleMiniCraft()" title="Міні-крафт (Q): верстак + залізо">🔨</button>
          <button id="mine-workbench-btn"  onclick="window.mineToggleWorkbench()"  title="Верстак (F): золото, алмаз, нікус">🪵</button>
        </div>
      </div>
      <div id="mine-mini-craft-panel" style="display:none;"></div>
      <div id="mine-workbench-panel"  style="display:none;"></div>
      <div id="mine-log"></div>
    </div>
  `;
}

function resizeCanvas() {
  if (!_canvas) return;
  const wrap = document.getElementById("mine-wrap");
  if (!wrap) return;
  _canvas.width  = wrap.clientWidth  || window.innerWidth;
  _canvas.height = wrap.clientHeight || 320;
}

// ══════════════════════════════════════════
// ГЕНЕРАЦІЯ СВІТУ
// ══════════════════════════════════════════

function generateWorld() {
  _world = new Uint8Array(W_TILES * H_TILES);
  const hmap = makeHeightmap();

  for (let x = 0; x < W_TILES; x++) {
    const surf = hmap[x];
    for (let y = 0; y < H_TILES; y++) {
      let tile = T_AIR;
      if (y >= H_TILES - 2) {
        tile = T_BEDROCK;
      } else if (y === surf) {
        tile = T_GRASS;
      } else if (y > surf && y < surf + 5) {
        tile = T_DIRT;
      } else if (y >= surf + 5 && y < DEEP_TOP) {
        tile = stoneLayerTile(x, y, surf);
      } else if (y >= DEEP_TOP && y < CORE_TOP) {
        tile = deepLayerTile(x, y);
      } else if (y >= CORE_TOP) {
        tile = coreLayerTile(x, y);
      }
      _world[y * W_TILES + x] = tile;
    }

    // Дерева
    if (_rng() < 0.06 && x > 5 && x < W_TILES - 5) {
      const surf2 = hmap[x];
      const h = 4 + Math.floor(_rng() * 4);
      for (let i = 1; i <= h; i++) {
        if (surf2 - i >= 0) setWorldTile(x, surf2 - i, T_WOOD);
      }
      for (let dx = -2; dx <= 2; dx++) {
        for (let dy = -3; dy <= 0; dy++) {
          const lx = x+dx, ly = surf2-h+dy;
          if (lx>=0&&lx<W_TILES&&ly>=0&&ly<H_TILES&&_world[ly*W_TILES+lx]===T_AIR)
            setWorldTile(lx, ly, T_LEAF);
        }
      }
    }
  }
  carveCaves();
}

function setWorldTile(tx, ty, id) {
  if (tx<0||tx>=W_TILES||ty<0||ty>=H_TILES) return;
  _world[ty*W_TILES+tx] = id;
}

function makeHeightmap() {
  const map = [];
  let h = SKY_H + 5;
  for (let x = 0; x < W_TILES; x++) {
    h += (_rng()-0.5)*2.5;
    h  = Math.max(SKY_H+2, Math.min(SKY_H+18, h));
    map[x] = Math.round(h);
  }
  for (let pass = 0; pass < 5; pass++) {
    for (let x = 1; x < W_TILES-1; x++) {
      map[x] = Math.round((map[x-1]+map[x]*2+map[x+1])/4);
    }
  }
  return map;
}

function stoneLayerTile(x, y, surf) {
  const d = y - surf;
  if (d < 5) return T_DIRT;
  const r = _rng();
  if (d > 20 && r < 0.018) return T_IRON;
  if (d > 35 && r < 0.010) return T_LEAD;
  if (d > 55 && r < 0.010) return T_GOLD;
  if (d > 55 && r < 0.007) return T_SLATE; // Сланець на рівні між золотом та алмазами
  return T_STONE;
}

function deepLayerTile(x, y) {
  const r = _rng();
  // Сланець часто зустрічається в глибоких шарах
  if (r < 0.060) return T_SLATE;
  if (r < 0.075) return T_GOLD;
  if (r < 0.081) return T_URAN;
  if (r < 0.085) return T_DIAM;
  return T_STONE;
}

function coreLayerTile(x, y) {
  const r = _rng();
  if (r < 0.015) return T_DIAM;
  if (r < 0.018) return T_NICUS;
  if (r < 0.006) return T_URAN;
  // Сланець і тут є
  if (r < 0.040) return T_SLATE;
  return T_STONE;
}

function carveCaves() {
  const count = Math.floor(W_TILES*H_TILES/3000);
  for (let w = 0; w < count; w++) {
    let cx = Math.floor(_rng()*W_TILES);
    let cy = (SKY_H+10) + Math.floor(_rng()*(H_TILES-SKY_H-15));
    let ang = _rng()*Math.PI*2;
    const len = 20+Math.floor(_rng()*80);
    const rad = 1+Math.floor(_rng()*2);
    for (let i = 0; i < len; i++) {
      ang += (_rng()-0.5)*0.9;
      cx = Math.round(cx+Math.cos(ang)*2);
      cy = Math.round(cy+Math.sin(ang)*1.2);
      for (let dx = -rad; dx <= rad; dx++) {
        for (let dy = -rad; dy <= rad; dy++) {
          if (dx*dx+dy*dy<=rad*rad+0.5) {
            const nx=cx+dx,ny=cy+dy;
            if (nx>=0&&nx<W_TILES&&ny>=0&&ny<H_TILES-2)
              _world[ny*W_TILES+nx]=T_AIR;
          }
        }
      }
    }
  }
}

// ══════════════════════════════════════════
// ТАЙЛИ
// ══════════════════════════════════════════

function getTile(tx, ty) {
  if (tx<0||tx>=W_TILES||ty<0||ty>=H_TILES) return T_BEDROCK;
  const key = tx+","+ty;
  if (_worldMod[key] !== undefined) return _worldMod[key];
  return _world ? _world[ty*W_TILES+tx] : T_AIR;
}

function isSolidTile(tx, ty) {
  const t = getTile(tx, ty);
  return t!==T_AIR && t!==T_WATER && t!==T_LEAF;
}

function isPlayerPlaced(tx, ty) {
  const key = tx+","+ty;
  return _worldMod[key] !== undefined && _worldMod[key] !== T_AIR;
}

// ══════════════════════════════════════════
// FOG OF WAR
// ══════════════════════════════════════════

function getTileVisibility(tx, ty) {
  if (!_player) return 1;
  const px = Math.floor((_player.x+_player.w/2)/T);
  const py = Math.floor((_player.y+_player.h/2)/T);
  if (ty < SKY_H+20) return 1;
  const dx = Math.abs(tx-px);
  const dy = Math.abs(ty-py);
  const dist = Math.max(dx,dy);
  if (dist <= 5) return 1;
  const steps = Math.max(Math.abs(tx-px), Math.abs(ty-py));
  for (let s = 1; s < steps; s++) {
    const ix = Math.round(px+(tx-px)*s/steps);
    const iy = Math.round(py+(ty-py)*s/steps);
    if (isPlayerPlaced(ix, iy)) return 0;
  }
  const fade = Math.max(0, 1-(dist-5)/6);
  return fade;
}

// ══════════════════════════════════════════
// FIRESTORE
// ══════════════════════════════════════════

function subscribeWorldMods() {
  _unsubWorld = onSnapshot(doc(db, "mineWorld", "main"), snap => {
    if (!snap.exists()) return;
    const mods = snap.data().mods || {};
    const newKeys = new Set(Object.keys(mods));
    Object.keys(_worldMod).forEach(k => { if (!newKeys.has(k)) delete _worldMod[k]; });
    Object.assign(_worldMod, mods);
  });
}

function pushTileMod(tileX, tileY, id) {
  const key = tileX+","+tileY;
  _worldMod[key] = id;
  _pendingMods[key] = id;
  clearTimeout(_pushModTimer);
  _pushModTimer = setTimeout(async () => {
    if (!Object.keys(_pendingMods).length) return;
    const batch = {..._pendingMods};
    _pendingMods = {};
    const update = {};
    for (const [k,v] of Object.entries(batch)) update["mods."+k] = v;
    try {
      await updateDoc(doc(db, "mineWorld", "main"), update);
    } catch(e) {
      try { await setDoc(doc(db, "mineWorld", "main"), { mods: _worldMod }, { merge: true }); } catch(_) {}
    }
  }, 400);
}

async function savePlayer() {
  const uid = auth.currentUser?.uid;
  if (!uid || !_player || _inLobby) return;
  if (!_playerDirty && !_inventoryDirty) return;
  const elapsed  = Date.now() - _sessionStartTs;
  const todayKey = new Date().toISOString().slice(0,10);
  const total    = _playedTodayMs + elapsed;
  try {
    await setDoc(doc(db, "mineProfiles", uid), {
      x: Math.round(_player.x/T), y: Math.round(_player.y/T),
      hp: _player.hp,
      inventory: _inventory,
      hotbar: _hotbar,
      equippedPickaxe: _equippedPickaxe || null,
      equippedArmor:   _equippedArmor   || null,
      equippedSword:   _equippedSword   || null,
      playedToday: { [todayKey]: total },
    }, { merge: true });
    _playerDirty = false; _inventoryDirty = false;
  } catch(e) {}
}

async function pushPos() {
  const uid = auth.currentUser?.uid;
  if (!uid||!_player||_inLobby) return;
  const p = _player, lp = _lastPushedPos;
  const moved = Math.abs(p.x-lp.x)>POS_PUSH_THRESHOLD||Math.abs(p.y-lp.y)>POS_PUSH_THRESHOLD;
  const stateChanged = p.dir!==lp.dir||p.mining!==lp.mining;
  if (!moved&&!stateChanged) return;
  lp.x=p.x; lp.y=p.y; lp.dir=p.dir; lp.mining=p.mining;
  try {
    await setDoc(doc(db, "minePlayers", uid), {
      x: Math.round(p.x), y: Math.round(p.y),
      name: p.name, dir: p.dir, mining: p.mining,
      armorMat: _equippedArmor ? (ITEM_DEFS[_equippedArmor]?.mat || null) : null,
      ts: Date.now(),
    }, { merge: true });
  } catch(e) {}
}

function subscribeOthers(myUid) {
  _unsubOthers = onSnapshot(collection(db, "minePlayers"), snap => {
    const now = Date.now();
    snap.docs.forEach(d => {
      if (d.id === myUid) return;
      const data = d.data();
      if (now-(data.ts||0) > PLAYER_ACTIVE_MS) { delete _others[d.id]; return; }
      if (_others[d.id]) {
        Object.assign(_others[d.id], {
          targetX: data.x, targetY: data.y,
          name: data.name, dir: data.dir,
          mining: data.mining, ts: data.ts,
          armorMat: data.armorMat || null,
        });
      } else {
        _others[d.id] = {
          x:data.x, y:data.y, targetX:data.x, targetY:data.y,
          name:data.name||"?", dir:data.dir||1,
          mining:data.mining||false, ts:data.ts,
          armorMat: data.armorMat || null,
        };
      }
    });
    Object.keys(_others).forEach(id => {
      if (!snap.docs.find(d=>d.id===id)) delete _others[id];
    });
    updateOnlineHUD();
  });
}

// ══════════════════════════════════════════
// ІГРОВИЙ ЦИКЛ
// ══════════════════════════════════════════

function gameLoop(ts) {
  _loop = requestAnimationFrame(gameLoop);
  const rawDt = ts - _lastTs;
  _lastTs = ts;
  const dt = Math.min(rawDt, 50) / 16.67;
  _tick++;

  if (!_timeLimitHit) {
    const elapsed = Date.now() - _sessionStartTs;
    const total   = _playedTodayMs + elapsed;
    if (total >= DAILY_LIMIT_MS) { _timeLimitHit = true; showTimeLimitOverlay(); }
    updateTimerHUD(Math.max(0, DAILY_LIMIT_MS - total));
  }

  update(dt);
  render();

  _posPushMs += rawDt;
  if (_posPushMs > 500) { _posPushMs = 0; pushPos(); }
}

function showTimeLimitOverlay() {
  const wrap = document.getElementById("mine-wrap");
  if (!wrap) return;
  const ov = document.createElement("div");
  ov.innerHTML = `
    <div class="mtime-box">
      <div style="font-size:48px;margin-bottom:12px;">⏰</div>
      <div style="font-family:'Syne',sans-serif;font-size:20px;font-weight:800;margin-bottom:8px;">Час вийшов!</div>
      <div style="color:var(--text-muted);font-size:14px;margin-bottom:20px;">Ти грав 1 годину сьогодні.</div>
      <button onclick="navigate('main')" style="padding:12px 28px;border-radius:12px;background:linear-gradient(135deg,var(--teal),var(--accent));color:#fff;font-weight:700;font-size:15px;border:none;cursor:pointer;">← На головну</button>
    </div>`;
  ov.style.cssText = "position:absolute;inset:0;background:rgba(0,0,0,0.75);display:flex;align-items:center;justify-content:center;z-index:999;backdrop-filter:blur(8px);";
  wrap.appendChild(ov);
  cancelAnimationFrame(_loop); _loop = null;
  _playerDirty = _inventoryDirty = true;
  savePlayer();
}

function updateTimerHUD(remainMs) {
  const el = document.getElementById("mine-timer-hud");
  if (!el) return;
  const min = Math.floor(remainMs/60000);
  const sec = Math.floor((remainMs%60000)/1000);
  const color = remainMs < 300000 ? "#f05060" : remainMs < 600000 ? "#f5b100" : "#5ecb3e";
  el.innerHTML = `<span style="color:${color};font-weight:700;font-size:11px;">⏱ ${min}:${String(sec).padStart(2,'0')}</span>`;
}

// ══════════════════════════════════════════
// ФІЗИКА
// ══════════════════════════════════════════

function update(dt) {
  if (!_player || _timeLimitHit) return;
  const p = _player;
  const prevX = p.x, prevY = p.y, prevHp = p.hp;

  const goLeft  = _keys["ArrowLeft"]  || _keys["a"] || _keys["A"] || _touch.left;
  const goRight = _keys["ArrowRight"] || _keys["d"] || _keys["D"] || _touch.right;
  const doJump  = _keys["ArrowUp"]    || _keys["w"] || _keys["W"] || _keys[" "] || _touch.jump;
  const doMine  = _keys["Mouse0"] || _mineActive;

  if (goLeft)       { p.vx = -MOVE_SPD; p.dir = -1; }
  else if (goRight) { p.vx =  MOVE_SPD; p.dir =  1; }
  else              { p.vx *= 0.75; if (Math.abs(p.vx) < 0.1) p.vx = 0; }

  p.isMoving = goLeft || goRight || Math.abs(p.vx) > 0.5;

  if (p.onGround) _coyoteTimer = 6;
  else if (_coyoteTimer > 0) _coyoteTimer--;

  if (doJump && _coyoteTimer > 0) {
    p.vy = JUMP_V;
    p.onGround = false;
    _coyoteTimer = 0;
  }

  p.vy += GRAVITY * dt;
  p.vy = Math.min(p.vy, 20);

  const STEPS = 3;
  for (let s = 0; s < STEPS; s++) {
    p.x += p.vx * dt / STEPS;
    resolveAxisX(p);
    p.onGround = false;
    p.y += p.vy * dt / STEPS;
    resolveAxisY(p);
  }

  if (p.x < 0)                    { p.x = 0; p.vx = 0; }
  if (p.x > (W_TILES-2)*T)        { p.x = (W_TILES-2)*T; p.vx = 0; }
  if (p.y < 0)                    { p.y = 0; p.vy = 0; }
  if (p.y > (H_TILES-2)*T - p.h)  { p.y = (H_TILES-2)*T-p.h; p.vy = 0; p.onGround = true; }

  if (doMine) {
    if (_buildMode) doBuild();
    else            doMineAction(dt);
  } else {
    resetMine(p);
  }

  checkNearWorkbench();

  if (Math.abs(p.x-prevX)>1||Math.abs(p.y-prevY)>1||p.hp!==prevHp) {
    _playerDirty = true;
    _hudHpDirty  = true;
  }

  Object.values(_others).forEach(o => {
    const dx = o.targetX-o.x, dy = o.targetY-o.y;
    const dist = Math.sqrt(dx*dx+dy*dy);
    if (dist < 0.5) { o.x=o.targetX; o.y=o.targetY; }
    else if (dist > 600) { o.x=o.targetX; o.y=o.targetY; }
    else {
      const alpha = Math.min(1, 1-Math.pow(0.05, dt*0.016));
      o.x += dx*alpha; o.y += dy*alpha;
    }
    o.isMoving = dist > 1;
  });

  updateDrops(dt);
  updateParticles(dt);
  pickupDrops();

  _camTarget.x = p.x+p.w/2 - _canvas.width/2;
  _camTarget.y = p.y+p.h/2 - _canvas.height/2;
  clampCam();
  _cam.x += (_camTarget.x-_cam.x) * CAM_LERP * dt * 1.5;
  _cam.y += (_camTarget.y-_cam.y) * CAM_LERP * dt * 1.5;
}

function resolveAxisX(p) {
  if (Math.abs(p.vx) < 0.001) return;
  const ys = [p.y+2, p.y+p.h*0.5, p.y+p.h-2];
  for (const cy of ys) {
    const tx1 = Math.floor(p.x/T);
    const tx2 = Math.floor((p.x+p.w-1)/T);
    if (p.vx > 0) {
      if (isSolidTile(tx2, Math.floor(cy/T))) { p.x=tx2*T-p.w; p.vx=0; return; }
    } else {
      if (isSolidTile(tx1, Math.floor(cy/T))) { p.x=(tx1+1)*T; p.vx=0; return; }
    }
  }
}

function resolveAxisY(p) {
  const xs = [p.x+2, p.x+p.w*0.5, p.x+p.w-3];
  for (const cx of xs) {
    const ty1 = Math.floor(p.y/T);
    const ty2 = Math.floor((p.y+p.h-1)/T);
    if (p.vy > 0) {
      if (isSolidTile(Math.floor(cx/T), ty2)) { p.y=ty2*T-p.h; p.vy=0; p.onGround=true; return; }
    } else {
      if (isSolidTile(Math.floor(cx/T), ty1)) { p.y=(ty1+1)*T; p.vy=0; return; }
    }
  }
}

function clampCam() {
  _camTarget.x = Math.max(0, Math.min(_camTarget.x, W_TILES*T-_canvas.width));
  _camTarget.y = Math.max(0, Math.min(_camTarget.y, H_TILES*T-_canvas.height));
}

// ══════════════════════════════════════════
// КОПАННЯ
// ══════════════════════════════════════════

function doMineAction(dt) {
  const p = _player;
  p.mining = true;
  const tileX = Math.floor(_mouseWorld.x/T);
  const tileY = Math.floor(_mouseWorld.y/T);
  const px = Math.floor((p.x+p.w/2)/T);
  const py = Math.floor((p.y+p.h/2)/T);
  const dist = Math.max(Math.abs(tileX-px), Math.abs(tileY-py));
  if (dist > 5) { resetMine(p); return; }
  const tile = getTile(tileX, tileY);
  if (tile===T_AIR||tile===T_WATER||tile===T_BEDROCK) { resetMine(p); return; }

  if (tile===T_CRAFT) { resetMine(p); openWorkbenchUI(); return; }

  if (!_mineTile||_mineTile.tx!==tileX||_mineTile.ty!==tileY) {
    _mineProgress = 0;
    _mineTile = { tx:tileX, ty:tileY };
  }

  let speedMult = 1.0;
  if (_equippedPickaxe) {
    const def = ITEM_DEFS[_equippedPickaxe];
    if (def && def.type==="pickaxe") speedMult = def.speed || 1.0;
  }

  _mineProgress += dt * 16.67 * speedMult;
  if (_tick%4===0) spawnParticle(tileX*T+T/2, tileY*T+T/2, TILE_COLOR[tile]||"#888", 4);

  const hardness = TILE_HARDNESS[tile] || 600;
  if (_mineProgress >= hardness) {
    _worldMod[tileX+","+tileY] = T_AIR;
    pushTileMod(tileX, tileY, T_AIR);
    const res = DROP_RESOURCE[tile];
    if (res) {
      spawnDropSafe(tileX, tileY, res, 1);
      addLog((RES_DATA[res]?.icon||"⛏")+" +"+(RES_DATA[res]?.name||res));
    }
    for (let i=0;i<12;i++) spawnParticle(tileX*T+T/2, tileY*T+T/2, TILE_COLOR[tile]||"#888", 8);
    _mineProgress = 0; _mineTile = null; p.mining = false;
  }
}

function resetMine(p) {
  _mineProgress = 0; _mineTile = null;
  if (p) p.mining = false;
}

// ══════════════════════════════════════════
// БУДІВНИЦТВО
// ══════════════════════════════════════════

function doBuild() {
  if (!_player) return;
  const p = _player;
  const tileX = Math.floor(_mouseWorld.x/T);
  const tileY = Math.floor(_mouseWorld.y/T);
  const px = Math.floor((p.x+p.w/2)/T);
  const py = Math.floor((p.y+p.h/2)/T);
  if (Math.abs(tileX-px)>5||Math.abs(tileY-py)>5) return;
  if (getTile(tileX,tileY)!==T_AIR) return;
  const playerTX1=Math.floor(p.x/T), playerTX2=Math.floor((p.x+p.w-1)/T);
  const playerTY1=Math.floor(p.y/T), playerTY2=Math.floor((p.y+p.h-1)/T);
  if (tileX>=playerTX1&&tileX<=playerTX2&&tileY>=playerTY1&&tileY<=playerTY2) return;

  const resName = _hotbar[_hotbarSel];

  if (resName==="workbench") {
    if ((_inventory["wood"]||0)<4) { addLog("❌ Потрібно 4 дерева для верстаку!"); return; }
    _inventory["wood"] -= 4;
    if (_inventory["wood"]<=0) delete _inventory["wood"];
    _worldMod[tileX+","+tileY] = T_CRAFT;
    pushTileMod(tileX, tileY, T_CRAFT);
    for (let i=0;i<6;i++) spawnParticle(tileX*T+T/2, tileY*T+T/2, "#c87a30", 5);
    _inventoryDirty=true; updateHotbarUI();
    _mineActive=false; _keys["Mouse0"]=false;
    addLog("🪵 Верстак побудовано!");
    return;
  }

  if (!resName||!(_inventory[resName]>0)) return;
  const tileId = PLACEABLE[resName];
  if (!tileId) return;
  _inventory[resName]--;
  if (_inventory[resName]<=0) delete _inventory[resName];
  _worldMod[tileX+","+tileY] = tileId;
  pushTileMod(tileX, tileY, tileId);
  for (let i=0;i<6;i++) spawnParticle(tileX*T+T/2, tileY*T+T/2, TILE_COLOR[tileId]||"#888", 5);
  _inventoryDirty=true; updateHotbarUI();
  _mineActive=false; _keys["Mouse0"]=false;
}

// ══════════════════════════════════════════
// ВЕРСТАК — ПЕРЕВІРКА ПОРЯД
// ══════════════════════════════════════════

function checkNearWorkbench() {
  if (!_player) return;
  const px = Math.floor((_player.x+_player.w/2)/T);
  const py = Math.floor((_player.y+_player.h/2)/T);
  let near = false;
  for (let dx=-2;dx<=2&&!near;dx++) {
    for (let dy=-2;dy<=2&&!near;dy++) {
      if (getTile(px+dx,py+dy)===T_CRAFT) near=true;
    }
  }
  if (near !== _nearWorkbench) {
    _nearWorkbench = near;
    const btn = document.getElementById("mine-workbench-btn");
    if (btn) {
      btn.style.background = near
        ? "linear-gradient(135deg,#c87a30,#f5b100)"
        : "rgba(0,0,0,0.55)";
      btn.title = near
        ? "Верстак (F): золото, алмаз, нікус — ДОСТУПНО"
        : "Верстак (F): потрібно поставити верстак поруч";
    }
  }
}

function openWorkbenchUI() {
  if (_workbenchOpen) { closeWorkbench(); return; }
  _workbenchOpen = true;
  renderWorkbenchPanel();
}

// ══════════════════════════════════════════
// МІНІ-КРАФТ (три точки → 🔨)
// Тільки: верстак + залізні речі
// ══════════════════════════════════════════

window.mineToggleMiniCraft = function() {
  if (_miniCraftOpen) { closeMiniCraft(); return; }
  _miniCraftOpen = true;
  renderMiniCraftPanel();
};

function closeMiniCraft() {
  _miniCraftOpen = false;
  const el = document.getElementById("mine-mini-craft-panel");
  if (el) el.style.display = "none";
}

function renderMiniCraftPanel() {
  const el = document.getElementById("mine-mini-craft-panel");
  if (!el) return;
  el.style.display = "block";

  const wood = _inventory["wood"] || 0;
  const canBuildWB = wood >= 4;

  let html = `
    <div class="mcraf-header">
      <span>🔨 Міні-крафт</span>
      <button onclick="window.mineCloseMiniCraft()" class="mcraf-close-btn">✕</button>
    </div>
    <div class="mcraf-section-title">🪵 Побудувати верстак (4 дерева)</div>
    <div class="mcraf-place-row">
      <span class="mcraf-need ${wood>=4?'ok':'bad'}">🪵 ${wood}/4</span>
      <button class="mcraf-btn ${canBuildWB?'':'disabled'}" onclick="window.minePlaceWorkbench()" ${canBuildWB?'':'disabled'}>
        📦 Поставити
      </button>
    </div>
    <div class="mcraf-divider"></div>
    <div class="mcraf-section-title">⚙️ Залізні речі</div>
    <div class="mcraf-list">
  `;

  MINI_CRAFT_RECIPES.forEach((rec, i) => {
    const def = ITEM_DEFS[rec.result];
    if (!def) return;
    const canCraft = Object.entries(rec.needs).every(([k,v]) => (_inventory[k]||0) >= v);
    const needsHtml = Object.entries(rec.needs).map(([k,v]) =>
      `<span class="mcraf-need ${(_inventory[k]||0)>=v?'ok':'bad'}">${RES_DATA[k]?.icon||k} ${_inventory[k]||0}/${v}</span>`
    ).join(" ");

    html += `
      <div class="mcraf-item">
        <div class="mcraf-item-icon">${RES_DATA[rec.result]?.icon||"?"}</div>
        <div class="mcraf-item-info">
          <div class="mcraf-item-name">${rec.label}</div>
          <div class="mcraf-item-desc">${def.desc||""}</div>
          <div class="mcraf-item-needs">${needsHtml}</div>
        </div>
        <button class="mcraf-btn ${canCraft?'':'disabled'}" onclick="window.mineDoMiniCraft(${i})" ${canCraft?'':'disabled'}>Крафт</button>
      </div>`;
  });

  html += `</div>`;
  el.innerHTML = html;
}

window.mineCloseMiniCraft = closeMiniCraft;

window.mineDoMiniCraft = function(idx) {
  const rec = MINI_CRAFT_RECIPES[idx];
  if (!rec) return;
  for (const [k,v] of Object.entries(rec.needs)) {
    if ((_inventory[k]||0) < v) { addLog("❌ Не вистачає: "+(RES_DATA[k]?.name||k)); return; }
  }
  for (const [k,v] of Object.entries(rec.needs)) {
    _inventory[k] -= v;
    if (_inventory[k] <= 0) delete _inventory[k];
  }
  _inventory[rec.result] = (_inventory[rec.result]||0) + rec.count;
  _inventoryDirty = true;
  _hudResDirty = true;
  addLog("⚗️ Скрафтовано: "+(RES_DATA[rec.result]?.name||rec.result));
  renderMiniCraftPanel();
  updateEquipHUD();
};

window.minePlaceWorkbench = function() {
  if (!_player) return;
  if ((_inventory["wood"]||0) < 4) { addLog("❌ Потрібно 4 дерева!"); return; }
  const px = Math.floor((_player.x+_player.w/2)/T);
  const py = Math.floor((_player.y+_player.h/2)/T);
  const candidates = [[px+1,py],[px-1,py],[px,py+1],[px,py-1],[px+2,py],[px-2,py]];
  for (const [tx,ty] of candidates) {
    if (tx>=0&&tx<W_TILES&&ty>=0&&ty<H_TILES&&getTile(tx,ty)===T_AIR) {
      _inventory["wood"] -= 4;
      if (_inventory["wood"]<=0) delete _inventory["wood"];
      _worldMod[tx+","+ty] = T_CRAFT;
      pushTileMod(tx, ty, T_CRAFT);
      _inventoryDirty = true;
      _nearWorkbench = true;
      addLog("🪵 Верстак поставлено!");
      renderMiniCraftPanel();
      return;
    }
  }
  addLog("❌ Немає місця для верстаку!");
};

// ══════════════════════════════════════════
// ВЕЛИКИЙ ВЕРСТАК (F або клік на блок)
// Золото, алмаз, нікус
// ══════════════════════════════════════════

window.mineToggleWorkbench = function() {
  if (_workbenchOpen) { closeWorkbench(); return; }
  _workbenchOpen = true;
  renderWorkbenchPanel();
};

function closeWorkbench() {
  _workbenchOpen = false;
  const el = document.getElementById("mine-workbench-panel");
  if (el) el.style.display = "none";
}

function renderWorkbenchPanel() {
  const el = document.getElementById("mine-workbench-panel");
  if (!el) return;
  el.style.display = "block";

  let html = `
    <div class="mcraf-header">
      <span>🪵 Верстак</span>
      <button onclick="window.mineCloseWorkbench()" class="mcraf-close-btn">✕</button>
    </div>
    ${!_nearWorkbench ? `<div class="mcraf-warn">⚠️ Підійди до верстаку або постав (🔨 → Поставити)</div>` : ""}
    <div class="mcraf-list">
  `;

  WORKBENCH_RECIPES.forEach((rec, i) => {
    const def = ITEM_DEFS[rec.result];
    if (!def) return;
    const canCraft = _nearWorkbench && Object.entries(rec.needs).every(([k,v]) => (_inventory[k]||0) >= v);
    const needsHtml = Object.entries(rec.needs).map(([k,v]) =>
      `<span class="mcraf-need ${(_inventory[k]||0)>=v?'ok':'bad'}">${RES_DATA[k]?.icon||k} ${_inventory[k]||0}/${v}</span>`
    ).join(" ");

    html += `
      <div class="mcraf-item">
        <div class="mcraf-item-icon">${RES_DATA[rec.result]?.icon||"?"}</div>
        <div class="mcraf-item-info">
          <div class="mcraf-item-name">${rec.label}</div>
          <div class="mcraf-item-desc">${def.desc||""}</div>
          <div class="mcraf-item-needs">${needsHtml}</div>
        </div>
        <button class="mcraf-btn ${canCraft?'':'disabled'}" onclick="window.mineDoWorkbenchCraft(${i})" ${canCraft?'':'disabled'}>Крафт</button>
      </div>`;
  });

  html += `</div>`;
  el.innerHTML = html;
}

window.mineCloseWorkbench = closeWorkbench;

window.mineDoWorkbenchCraft = function(idx) {
  const rec = WORKBENCH_RECIPES[idx];
  if (!rec) return;
  if (!_nearWorkbench) { addLog("❌ Підійди до верстаку!"); return; }
  for (const [k,v] of Object.entries(rec.needs)) {
    if ((_inventory[k]||0) < v) { addLog("❌ Не вистачає: "+(RES_DATA[k]?.name||k)); return; }
  }
  for (const [k,v] of Object.entries(rec.needs)) {
    _inventory[k] -= v;
    if (_inventory[k] <= 0) delete _inventory[k];
  }
  _inventory[rec.result] = (_inventory[rec.result]||0) + rec.count;
  _inventoryDirty = true;
  _hudResDirty = true;
  addLog("⚗️ Скрафтовано: "+(RES_DATA[rec.result]?.name||rec.result));
  renderWorkbenchPanel();
  updateEquipHUD();
};

// ══════════════════════════════════════════
// ЕКІПІРУВАННЯ
// ══════════════════════════════════════════

window.mineEquipItem = function(itemKey) {
  const def = ITEM_DEFS[itemKey];
  if (!def) return;
  if (def.type === "pickaxe") {
    _equippedPickaxe = _equippedPickaxe===itemKey ? null : itemKey;
    addLog(_equippedPickaxe ? "⛏️ Екіпіровано кирку: "+(RES_DATA[itemKey]?.name||itemKey) : "⛏️ Кирку знято");
  } else if (def.type === "armor") {
    _equippedArmor = _equippedArmor===itemKey ? null : itemKey;
    addLog(_equippedArmor ? "🛡️ Екіпіровано броню: "+(RES_DATA[itemKey]?.name||itemKey) : "🛡️ Броню знято");
  } else if (def.type === "sword") {
    _equippedSword = _equippedSword===itemKey ? null : itemKey;
    addLog(_equippedSword ? "⚔️ Екіпіровано меч: "+(RES_DATA[itemKey]?.name||itemKey) : "⚔️ Меч знято");
  }
  _playerDirty = true;
  updateEquipHUD();
  // Одразу пушимо броню у Firestore для інших гравців
  pushPos();
};

function updateEquipHUD() {
  const el = document.getElementById("mine-equip-row");
  if (!el) return;
  const craftedItems = Object.keys(_inventory).filter(k => ITEM_DEFS[k] && _inventory[k] > 0);
  if (!craftedItems.length) { el.innerHTML = ""; return; }

  el.innerHTML = craftedItems.map(k => {
    const def = ITEM_DEFS[k];
    const isEq = (k===_equippedPickaxe||k===_equippedArmor||k===_equippedSword);
    const icon = RES_DATA[k]?.icon || "?";
    const typeIcon = def.type==="armor" ? "🛡" : def.type==="pickaxe" ? "⛏" : "⚔";
    return `<div class="mequip-item${isEq?' mequip-active':''}" onclick="window.mineEquipItem('${k}')"
      title="${RES_DATA[k]?.name||k}: ${def.desc||''}">
      <span class="mequip-icon">${icon}</span>
      <span class="mequip-type">${typeIcon}</span>
      <span class="mequip-cnt">${_inventory[k]}</span>
    </div>`;
  }).join("");
}

// ══════════════════════════════════════════
// ДРОПИ
// ══════════════════════════════════════════

function spawnDropSafe(tileX, tileY, res, amt) {
  let spawnTY = tileY;
  for (let dy = 0; dy >= -3; dy--) {
    const checkY = tileY+dy;
    if (checkY>=0 && getTile(tileX,checkY)===T_AIR) { spawnTY=checkY; break; }
  }
  _drops.push({
    x: tileX*T+T/2, y: spawnTY*T+T/2,
    vx: (Math.random()-0.5)*1.5, vy: 0,
    res, amt, age: 0, bob: Math.random()*Math.PI*2
  });
}

function updateDrops(dt) {
  _drops = _drops.filter(d => {
    d.vy += GRAVITY*dt*0.6;
    d.vx *= 0.92;
    d.bob += 0.04*dt;
    d.age += dt*16.67;
    const STEPS = 3;
    for (let s=0;s<STEPS;s++) {
      d.x += d.vx*dt/STEPS;
      const txL=Math.floor((d.x-4)/T), txR=Math.floor((d.x+4)/T), ty=Math.floor(d.y/T);
      if (isSolidTile(txR,ty)&&d.vx>0) { d.x=txR*T-4; d.vx*=-0.3; }
      if (isSolidTile(txL,ty)&&d.vx<0) { d.x=(txL+1)*T+4; d.vx*=-0.3; }
      d.y += d.vy*dt/STEPS;
      const tx=Math.floor(d.x/T), tyB=Math.floor((d.y+4)/T), tyT=Math.floor((d.y-4)/T);
      if (isSolidTile(tx,tyB)&&d.vy>0) { d.y=tyB*T-4; d.vy=0; d.vx*=0.5; }
      if (isSolidTile(tx,tyT)&&d.vy<0) { d.y=(tyT+1)*T+4; d.vy=0; }
    }
    return d.age < 25000;
  });
}

function pickupDrops() {
  if (!_player) return;
  const p = _player;
  const cx=p.x+p.w/2, cy=p.y+p.h/2;
  _drops = _drops.filter(d => {
    if (Math.hypot(d.x-cx, d.y-cy) < 32) {
      _inventory[d.res] = (_inventory[d.res]||0)+d.amt;
      for (let i=0;i<4;i++) spawnParticle(cx, p.y+p.h/2, "#f5b100", 5);
      _inventoryDirty=true; _hudResDirty=true; _hudHotbarDirty=true;
      updateHotbarUI(); updateEquipHUD();
      return false;
    }
    return true;
  });
}

// ══════════════════════════════════════════
// ЧАСТИНКИ
// ══════════════════════════════════════════

function spawnParticle(x, y, color, speed) {
  _particles.push({
    x, y,
    vx: (Math.random()-0.5)*(speed||4),
    vy: -(Math.random())*(speed||3),
    life: 1.0, color,
    sz: 1.5+Math.random()*2,
  });
  if (_particles.length > 500) _particles.length = 250;
}

function updateParticles(dt) {
  _particles = _particles.filter(p => {
    p.x+=p.vx*dt; p.y+=p.vy*dt;
    p.vy+=0.18*dt; p.life-=0.04*dt;
    return p.life>0;
  });
}

// ══════════════════════════════════════════
// РЕНДЕР
// ══════════════════════════════════════════

function render() {
  if (!_ctx||!_canvas||!_world) return;
  const ctx=_ctx, W=_canvas.width, H=_canvas.height;

  const frac = Math.max(0, Math.min(1, _cam.y/(DEEP_TOP*T)));
  const g = ctx.createLinearGradient(0,0,0,H);
  g.addColorStop(0, lerpColor(135,206,235, 8,8,36, frac));
  g.addColorStop(1, lerpColor(80,170,210, 4,4,22, frac));
  ctx.fillStyle = g;
  ctx.fillRect(0,0,W,H);

  ctx.save();
  ctx.translate(-Math.floor(_cam.x), -Math.floor(_cam.y));

  drawTiles(ctx, W, H);
  drawDrops(ctx);
  drawParticles(ctx);
  drawOtherPlayers(ctx);
  drawSelf(ctx);
  drawMineProgress(ctx);
  drawCursorHighlight(ctx);

  ctx.restore();

  if (_hudHpDirty)     { updateHpHUD();    _hudHpDirty=false; }
  if (_hudResDirty)    { updateResHUD();   _hudResDirty=false; }
  if (_hudHotbarDirty) { updateHotbarUI(); _hudHotbarDirty=false; }
}

function drawTiles(ctx, W, H) {
  const cx=Math.floor(_cam.x), cy=Math.floor(_cam.y);
  const sx=Math.max(0, Math.floor(cx/T)-1);
  const sy=Math.max(0, Math.floor(cy/T)-1);
  const ex=Math.min(W_TILES-1, sx+Math.ceil(W/T)+2);
  const ey=Math.min(H_TILES-1, sy+Math.ceil(H/T)+2);

  for (let ty2=sy;ty2<=ey;ty2++) {
    for (let tx2=sx;tx2<=ex;tx2++) {
      const tile = getTile(tx2,ty2);
      const vis  = getTileVisibility(tx2,ty2);
      const px=tx2*T, py=ty2*T;

      if (tile===T_AIR) {
        if (vis<1&&ty2>=SKY_H+20) {
          ctx.fillStyle=`rgba(0,0,0,${(1-vis)*0.9})`;
          ctx.fillRect(px,py,T,T);
        }
        continue;
      }

      const color = TILE_COLOR[tile];
      if (!color) continue;

      if (vis<=0) {
        ctx.fillStyle="#0a0a0a";
        ctx.fillRect(px,py,T,T);
        continue;
      }

      ctx.globalAlpha = vis;

      // ── ВЕРСТАК ─────────────────────────
      if (tile===T_CRAFT) {
        ctx.fillStyle="#a0622a";
        ctx.fillRect(px,py,T,T);
        ctx.fillStyle="#c87a30";
        ctx.fillRect(px+2,py+2,T-4,T-4);
        ctx.fillStyle="#8b5e3c";
        ctx.fillRect(px+T/2-1,py+2,2,T-4);
        ctx.fillRect(px+2,py+T/2-1,T-4,2);
        ctx.fillStyle="rgba(255,200,100,0.5)";
        ctx.fillRect(px+2,py+2,5,5);
        ctx.globalAlpha=1;
        if (vis<1) { ctx.fillStyle=`rgba(0,0,0,${1-vis})`; ctx.fillRect(px,py,T,T); }
        continue;
      }

      // ── СЛАНЕЦЬ — особливий рендер ──────
      if (tile===T_SLATE) {
        // Темно-синьо-сірий базовий колір
        ctx.fillStyle="#2e2e3d";
        ctx.fillRect(px,py,T,T);
        // Текстура — горизонтальні шари (сланець шаруватий)
        ctx.fillStyle="rgba(50,50,70,0.8)";
        for (let ly=0;ly<T;ly+=4) ctx.fillRect(px,py+ly,T,1);
        // Темніший відтінок по краях
        ctx.fillStyle="rgba(0,0,0,0.3)";
        ctx.fillRect(px,py+T-2,T,2);
        ctx.fillRect(px+T-2,py,2,T);
        // Блиск — синюватий відлив
        ctx.fillStyle="rgba(80,100,180,0.2)";
        ctx.fillRect(px,py,T,2);
        ctx.fillRect(px,py,2,T);
        // Мерехтливі кристалики
        ctx.fillStyle="rgba(150,160,220,0.45)";
        ctx.fillRect(px+3,py+3,3,3);
        ctx.fillRect(px+T-7,py+T-7,2,2);
        ctx.fillRect(px+T-5,py+4,2,2);
        ctx.globalAlpha=1;
        if (vis<1) { ctx.fillStyle=`rgba(0,0,0,${1-vis})`; ctx.fillRect(px,py,T,T); }
        continue;
      }

      // ── СТАНДАРТНИЙ ТАЙЛ ─────────────────
      ctx.fillStyle = color;
      ctx.fillRect(px,py,T,T);

      if (tile!==T_WATER&&tile!==T_LEAF) {
        ctx.fillStyle="rgba(0,0,0,0.15)";
        ctx.fillRect(px,py+T-2,T,2);
        ctx.fillRect(px+T-2,py,2,T);
        ctx.fillStyle="rgba(255,255,255,0.12)";
        ctx.fillRect(px,py,T,2);
        ctx.fillRect(px,py,2,T);
      }

      // Блиск руди
      if ([T_IRON,T_LEAD,T_GOLD,T_URAN,T_DIAM,T_NICUS].includes(tile)) {
        ctx.fillStyle="rgba(255,255,255,0.28)";
        ctx.fillRect(px+3,py+3,4,4);
        ctx.fillRect(px+T-7,py+T-7,3,3);
        if (tile===T_NICUS) {
          ctx.fillStyle="rgba(200,100,255,0.4)";
          ctx.fillRect(px+2,py+2,6,6);
          ctx.fillRect(px+T-8,py+T-8,5,5);
        }
      }

      ctx.globalAlpha=1;
      if (vis<1) {
        ctx.fillStyle=`rgba(0,0,0,${1-vis})`;
        ctx.fillRect(px,py,T,T);
      }
    }
  }
}

// ══════════════════════════════════════════
// РЕНДЕР ПЕРСОНАЖІВ
// ══════════════════════════════════════════

function drawSelf(ctx) {
  if (!_player) return;
  const p = _player;
  const armorMat = _equippedArmor ? (ITEM_DEFS[_equippedArmor]?.mat || null) : null;
  drawCharacter(ctx, p.x, p.y, p.w, p.h, p.name, p.hp/p.maxHp, p.dir, p.mining, "#e0f4ff", true, p.isMoving, armorMat);
}

function drawOtherPlayers(ctx) {
  Object.values(_others).forEach(o => {
    drawCharacter(ctx, o.x, o.y, 14, 28, o.name||"?", 1, o.dir||1, o.mining||false, "#ffcc44", false, o.isMoving, o.armorMat||null);
  });
}

/**
 * Покращений стікмен:
 * - Кругліша, більша голова
 * - Виражені плечі
 * - Пропорційніші кінцівки (трохи товщі лінії)
 * - Броня — заповнений силует поверх тіла
 */
function drawCharacter(ctx, x, y, w, h, name, hpFrac, dir, isMining, color, isSelf, isMoving, armorMat) {
  const cx = x + w/2;
  ctx.save();
  ctx.lineCap = "round";
  ctx.lineJoin = "round";

  // Тінь
  ctx.fillStyle = "rgba(0,0,0,0.22)";
  ctx.beginPath();
  ctx.ellipse(cx, y+h+3, w*0.65, 3, 0, 0, Math.PI*2);
  ctx.fill();

  // HP бар
  const bw=34, bh=4;
  ctx.fillStyle="rgba(0,0,0,0.6)";
  ctx.beginPath();
  ctx.roundRect(cx-bw/2, y-20, bw, bh, 2);
  ctx.fill();
  const hpColor = hpFrac>0.6?"#5ecb3e":hpFrac>0.3?"#f5b100":"#e0203a";
  ctx.fillStyle = hpColor;
  ctx.beginPath();
  ctx.roundRect(cx-bw/2, y-20, bw*Math.max(0,hpFrac), bh, 2);
  ctx.fill();

  // Нікнейм
  ctx.font = `bold ${isSelf?9.5:8.5}px sans-serif`;
  ctx.textAlign = "center";
  ctx.fillStyle = isSelf ? "#ffffff" : color;
  ctx.shadowColor = "rgba(0,0,0,0.8)";
  ctx.shadowBlur = 3;
  ctx.fillText(name.slice(0,14), cx, y-23);
  ctx.shadowBlur = 0;

  // ─── Параметри тіла ────────────────────
  const headR    = 6.5;              // більша кругла голова
  const headCY   = y + 10;
  const neckY    = headCY + headR;
  const shoulderY= neckY + 3;       // виражені плечі
  const shoulderW= 10;
  const bodyBot  = y + h - 8;
  const bodyMid  = shoulderY + (bodyBot - shoulderY) * 0.5;
  const walkPhase = isSelf ? _tick*0.25 : Date.now()*0.005;
  const legSwing  = (isMoving || isMining) ? Math.sin(walkPhase)*8 : 0;
  const armSwing  = (isMoving && !isMining) ? Math.sin(walkPhase)*6 : 0;

  const strokeW = isSelf ? 2.8 : 2.2;

  // ─── СИЛУЕТ БРОНІ (малюємо ДО тіла) ───
  if (armorMat && ARMOR_COLORS[armorMat]) {
    const ac = ARMOR_COLORS[armorMat];
    ctx.globalAlpha = 1;
    ctx.strokeStyle = ac.stroke;
    ctx.fillStyle   = ac.fill;
    ctx.lineWidth   = 1;

    // Нагрудник
    ctx.beginPath();
    ctx.moveTo(cx - shoulderW - 2, shoulderY);
    ctx.lineTo(cx - shoulderW - 2, bodyBot);
    ctx.lineTo(cx + shoulderW + 2, bodyBot);
    ctx.lineTo(cx + shoulderW + 2, shoulderY);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // Шолом (маленький, поверх голови)
    ctx.beginPath();
    ctx.arc(cx, headCY-1, headR+2, Math.PI*1.15, Math.PI*1.85, false);
    ctx.lineWidth = 3;
    ctx.strokeStyle = ac.stroke;
    ctx.stroke();
    ctx.lineWidth = 1;

    // Наплічники
    ctx.fillStyle = ac.fill;
    ctx.beginPath();
    ctx.ellipse(cx-shoulderW-1, shoulderY+2, 4, 3, -0.3, 0, Math.PI*2);
    ctx.fill(); ctx.stroke();
    ctx.beginPath();
    ctx.ellipse(cx+shoulderW+1, shoulderY+2, 4, 3, 0.3, 0, Math.PI*2);
    ctx.fill(); ctx.stroke();
  }

  // ─── ТІЛО ──────────────────────────────
  ctx.strokeStyle = color;
  ctx.lineWidth   = strokeW;

  // Голова — кругла
  ctx.beginPath();
  ctx.arc(cx, headCY, headR, 0, Math.PI*2);
  ctx.stroke();

  // Обличчя — очі (маленькі точки)
  ctx.fillStyle = color;
  const eyeOff = dir>0 ? 2 : -2;
  ctx.beginPath();
  ctx.arc(cx+eyeOff, headCY-1, 1.2, 0, Math.PI*2);
  ctx.fill();

  // Шия
  ctx.beginPath();
  ctx.moveTo(cx, neckY);
  ctx.lineTo(cx, shoulderY);
  ctx.stroke();

  // Плечі (горизонтальна лінія)
  ctx.beginPath();
  ctx.moveTo(cx-shoulderW, shoulderY);
  ctx.lineTo(cx+shoulderW, shoulderY);
  ctx.stroke();

  // Тулуб
  ctx.beginPath();
  ctx.moveTo(cx, shoulderY);
  ctx.lineTo(cx, bodyBot);
  ctx.stroke();

  // Ноги
  ctx.lineWidth = strokeW * 0.9;
  ctx.beginPath();
  ctx.moveTo(cx, bodyBot);
  ctx.lineTo(cx-5, bodyBot+9+legSwing);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(cx, bodyBot);
  ctx.lineTo(cx+5, bodyBot+9-legSwing);
  ctx.stroke();

  // Руки
  ctx.lineWidth = strokeW * 0.85;
  if (isMining) {
    const sw = Math.sin(walkPhase*1.3)*22 - 8;
    ctx.beginPath();
    ctx.moveTo(cx+dir*shoulderW, shoulderY);
    ctx.lineTo(cx+dir*14, shoulderY+sw);
    ctx.stroke();
    // Кирка в руці
    ctx.strokeStyle = "#f5c030";
    ctx.lineWidth = 2.5;
    const pickX = cx+dir*14, pickY = shoulderY+sw;
    ctx.beginPath();
    ctx.moveTo(pickX, pickY);
    ctx.lineTo(pickX+dir*9, pickY+8);
    ctx.stroke();
    ctx.strokeStyle = color;
    ctx.lineWidth = strokeW * 0.85;
    // Ліва рука вниз
    ctx.beginPath();
    ctx.moveTo(cx-dir*shoulderW, shoulderY);
    ctx.lineTo(cx-dir*8, shoulderY+9-armSwing);
    ctx.stroke();
  } else {
    // Права рука
    ctx.beginPath();
    ctx.moveTo(cx+shoulderW, shoulderY);
    ctx.lineTo(cx+8, shoulderY+9+armSwing);
    ctx.stroke();
    // Ліва рука
    ctx.beginPath();
    ctx.moveTo(cx-shoulderW, shoulderY);
    ctx.lineTo(cx-8, shoulderY+9-armSwing);
    ctx.stroke();

    // Якщо є меч — показуємо
    if (isSelf && _equippedSword || !isSelf) {
      // не малюємо меч для спрощення
    }
  }

  // Броня: наколінники на ногах
  if (armorMat && ARMOR_COLORS[armorMat]) {
    const ac = ARMOR_COLORS[armorMat];
    ctx.fillStyle = ac.fill;
    ctx.strokeStyle = ac.stroke;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.ellipse(cx-5, bodyBot+5+legSwing*0.5, 3, 2.5, 0.3, 0, Math.PI*2);
    ctx.fill(); ctx.stroke();
    ctx.beginPath();
    ctx.ellipse(cx+5, bodyBot+5-legSwing*0.5, 3, 2.5, -0.3, 0, Math.PI*2);
    ctx.fill(); ctx.stroke();
  }

  ctx.restore();
}

function drawMineProgress(ctx) {
  if (!_mineTile||_mineProgress<=0) return;
  const {tx,ty} = _mineTile;
  const tile = getTile(tx,ty);
  if (tile===T_AIR) return;
  const hardness = TILE_HARDNESS[tile]||600;
  const pct = Math.min(1, _mineProgress/hardness);
  const px=tx*T, py=ty*T;
  ctx.fillStyle=`rgba(0,0,0,${pct*0.5})`;
  ctx.fillRect(px,py,T,T);
  const cx2=px+T/2, cy2=py+T/2;
  ctx.strokeStyle=`rgba(255,255,255,${pct*0.7})`;
  ctx.lineWidth=1;
  const cracks=Math.floor(pct*6);
  for (let i=0;i<cracks;i++) {
    const ang=(i/cracks)*Math.PI*2;
    ctx.beginPath();
    ctx.moveTo(cx2,cy2);
    ctx.lineTo(cx2+Math.cos(ang)*T*0.4*pct, cy2+Math.sin(ang)*T*0.4*pct);
    ctx.stroke();
  }
  ctx.fillStyle="rgba(0,0,0,0.6)";
  ctx.fillRect(px,py+T-5,T,5);
  ctx.fillStyle=pct<0.5?"#f5b100":"#f05060";
  ctx.fillRect(px,py+T-5,T*pct,5);
}

function drawCursorHighlight(ctx) {
  if (!_player) return;
  const tileX=Math.floor(_mouseWorld.x/T);
  const tileY=Math.floor(_mouseWorld.y/T);
  const px2=Math.floor((_player.x+_player.w/2)/T);
  const py2=Math.floor((_player.y+_player.h/2)/T);
  if (Math.abs(tileX-px2)>5||Math.abs(tileY-py2)>5) return;
  ctx.save();
  ctx.strokeStyle=_buildMode?"rgba(80,200,255,0.85)":"rgba(255,220,80,0.85)";
  ctx.lineWidth=2;
  ctx.setLineDash([4,3]);
  ctx.strokeRect(tileX*T+1,tileY*T+1,T-2,T-2);
  ctx.setLineDash([]);
  ctx.restore();
}

function drawDrops(ctx) {
  ctx.font="14px sans-serif";
  ctx.textAlign="center";
  ctx.textBaseline="middle";
  _drops.forEach(d => {
    const bob=Math.sin(d.bob)*2;
    ctx.fillStyle="rgba(0,0,0,0.25)";
    ctx.beginPath();
    ctx.ellipse(d.x,d.y+10,6,2,0,0,Math.PI*2);
    ctx.fill();
    ctx.fillText(RES_DATA[d.res]?.icon||"•", d.x, d.y+bob);
  });
  ctx.textBaseline="alphabetic";
}

function drawParticles(ctx) {
  _particles.forEach(p => {
    ctx.save();
    ctx.globalAlpha=Math.max(0,p.life);
    ctx.fillStyle=p.color;
    ctx.fillRect(p.x-p.sz/2, p.y-p.sz/2, p.sz, p.sz);
    ctx.restore();
  });
}

// ══════════════════════════════════════════
// HUD
// ══════════════════════════════════════════

function updateHpHUD() {
  const bar=document.getElementById("mine-hp-bar");
  const txt=document.getElementById("mine-hp-txt");
  if (!bar||!_player) return;
  const pct=(_player.hp/_player.maxHp)*100;
  bar.style.width=Math.max(0,pct)+"%";
  bar.style.background=pct>60
    ?"linear-gradient(90deg,#5ecb3e,#8bff60)"
    :pct>30?"linear-gradient(90deg,#f5b100,#ffd040)"
    :"linear-gradient(90deg,#e0203a,#f07060)";
  if (txt) txt.textContent=_player.hp+"/"+_player.maxHp;
}

function updateResHUD() {
  const el=document.getElementById("mine-res-row");
  if (!el) return;
  const entries=Object.entries(_inventory).filter(([k,v])=>v>0&&!ITEM_DEFS[k]).slice(0,6);
  if (!entries.length) { el.innerHTML=""; return; }
  el.innerHTML=entries.map(([k,v])=>
    `<span class="mres-pill">${RES_DATA[k]?.icon||k} <b>${v}</b></span>`
  ).join("");
}

function updateOnlineHUD() {
  const el=document.getElementById("mine-hud-tr");
  if (!el) return;
  const names=Object.values(_others).map(o=>o.name||"?");
  el.innerHTML=names.length
    ?`<span class="mhud-online">👥 ${names.join(", ")}</span>`
    :`<span class="mhud-online">👁 Лише ти</span>`;
}

function updateHotbarUI() {
  const el=document.getElementById("mine-hotbar");
  if (!el) return;
  el.innerHTML=_hotbar.map((res,i) => {
    const cnt=res?(_inventory[res]||0):0;
    const sel=i===_hotbarSel;
    const icon=res?(RES_DATA[res]?.icon||res):"";
    return `<div class="mhb${sel?" mhb-sel":""}" onclick="window.mineHotbarSel(${i})">
      <div class="mhb-ico">${icon}</div>
      ${cnt>0?`<div class="mhb-cnt">${cnt}</div>`:""}
      <div class="mhb-n">${i+1}</div>
    </div>`;
  }).join("");
  _hudHotbarDirty=false;
}

function updateModeBtn() {
  const el=document.getElementById("mine-mode-btn");
  if (!el) return;
  el.textContent=_buildMode?"🧱 Будувати":"⛏️ Копати";
  el.style.background=_buildMode
    ?"linear-gradient(135deg,rgba(40,120,255,0.85),rgba(20,80,200,0.7))"
    :"linear-gradient(135deg,rgba(240,125,40,0.85),rgba(200,80,20,0.7))";
}

function addLog(msg) {
  const el=document.getElementById("mine-log");
  if (!el) return;
  const d=document.createElement("div");
  d.className="mlog-row"; d.textContent=msg;
  el.prepend(d);
  _logLines.push(d);
  if (_logLines.length>5) { const old=_logLines.shift(); old?.remove(); }
  setTimeout(()=>{ d.style.opacity="0"; setTimeout(()=>d.remove(),500); },3500);
}

// ══════════════════════════════════════════
// ВВІД
// ══════════════════════════════════════════

const _onKeyDown = (e) => {
  _keys[e.key] = true;
  if (e.key>="1"&&e.key<="8") { _hotbarSel=+e.key-1; _hudHotbarDirty=true; }
  if (e.key==="e"||e.key==="E") { _buildMode=!_buildMode; updateModeBtn(); }
  if (e.key==="q"||e.key==="Q") { window.mineToggleMiniCraft(); }
  if (e.key==="f"||e.key==="F") { window.mineToggleWorkbench(); }
  if (e.key===" "||e.key==="ArrowUp"||e.key==="ArrowDown") e.preventDefault();
};
const _onKeyUp   = (e) => { delete _keys[e.key]; };

const _onMouseMove = (e) => {
  if (!_canvas) return;
  const r=_canvas.getBoundingClientRect();
  _mouseWorld.x=(e.clientX-r.left)*(_canvas.width/r.width)+_cam.x;
  _mouseWorld.y=(e.clientY-r.top)*(_canvas.height/r.height)+_cam.y;
};
const _onMouseDown = (e) => {
  if (e.button===0) _keys["Mouse0"]=true;
  if (e.button===2) { _buildMode=!_buildMode; updateModeBtn(); e.preventDefault(); }
};
const _onMouseUp   = (e) => { if (e.button===0) delete _keys["Mouse0"]; };
const _onCtxMenu   = (e) => e.preventDefault();
const _onWheel     = (e) => {
  _hotbarSel=((_hotbarSel+(e.deltaY>0?1:-1))+8)%8;
  _hudHotbarDirty=true;
};

const _onTouchMove = (e) => {
  if (!_canvas||!_player) return;
  for (const t of e.changedTouches) {
    if (t.identifier===_touchMineId) continue;
    const el=document.elementFromPoint(t.clientX,t.clientY);
    if (el&&(el.classList.contains("mtbtn")||el.id.startsWith("mine-"))) continue;
    const r=_canvas.getBoundingClientRect();
    _mouseWorld.x=(t.clientX-r.left)*(_canvas.width/r.width)+_cam.x;
    _mouseWorld.y=(t.clientY-r.top)*(_canvas.height/r.height)+_cam.y;
  }
};

const _onCanvasTouchStart = (e) => {
  for (const t of e.changedTouches) {
    const el=document.elementFromPoint(t.clientX,t.clientY);
    if (el&&(el.classList.contains("mtbtn")||el.closest("#mine-touch-ctrl"))) continue;
    if (el&&el.closest("#mine-hotbar-wrap")) continue;
    if (el&&el.closest("#mine-mini-craft-panel")) continue;
    if (el&&el.closest("#mine-workbench-panel")) continue;
    const r=_canvas.getBoundingClientRect();
    _mouseWorld.x=(t.clientX-r.left)*(_canvas.width/r.width)+_cam.x;
    _mouseWorld.y=(t.clientY-r.top)*(_canvas.height/r.height)+_cam.y;
    _mineActive=true; _touchMineId=t.identifier;
    break;
  }
};

const _onCanvasTouchEnd = (e) => {
  for (const t of e.changedTouches) {
    if (t.identifier===_touchMineId) { _mineActive=false; _touchMineId=null; }
  }
};

function bindInput() {
  window.addEventListener("keydown", _onKeyDown);
  window.addEventListener("keyup",   _onKeyUp);
  _canvas?.addEventListener("mousemove",   _onMouseMove);
  _canvas?.addEventListener("mousedown",   _onMouseDown);
  _canvas?.addEventListener("mouseup",     _onMouseUp);
  _canvas?.addEventListener("contextmenu", _onCtxMenu);
  _canvas?.addEventListener("wheel",       _onWheel, {passive:true});
  _canvas?.addEventListener("touchstart",  _onCanvasTouchStart, {passive:false});
  _canvas?.addEventListener("touchmove",   _onTouchMove, {passive:true});
  _canvas?.addEventListener("touchend",    _onCanvasTouchEnd, {passive:true});
  _canvas?.addEventListener("touchcancel", _onCanvasTouchEnd, {passive:true});
}

function unbindInput() {
  window.removeEventListener("keydown", _onKeyDown);
  window.removeEventListener("keyup",   _onKeyUp);
  _canvas?.removeEventListener("mousemove",   _onMouseMove);
  _canvas?.removeEventListener("mousedown",   _onMouseDown);
  _canvas?.removeEventListener("mouseup",     _onMouseUp);
  _canvas?.removeEventListener("contextmenu", _onCtxMenu);
  _canvas?.removeEventListener("wheel",       _onWheel);
  _canvas?.removeEventListener("touchstart",  _onCanvasTouchStart);
  _canvas?.removeEventListener("touchmove",   _onTouchMove);
  _canvas?.removeEventListener("touchend",    _onCanvasTouchEnd);
  _canvas?.removeEventListener("touchcancel", _onCanvasTouchEnd);
}

// ══════════════════════════════════════════
// ГЛОБАЛЬНІ ФУНКЦІЇ
// ══════════════════════════════════════════

window.mineTouch = (btn, v) => { _touch[btn]=!!v; };

window.mineTouchMine = (v) => {
  _mineActive=!!v;
  if (!v) { _mineProgress=0; _mineTile=null; }
  if (v&&_player) {
    const p=_player;
    _mouseWorld.x=p.x+p.dir*(p.w+T*1.5);
    _mouseWorld.y=p.y+p.h*0.5;
  }
};

window.mineToggleMode = () => {
  _buildMode=!_buildMode;
  updateModeBtn();
  addLog(_buildMode?"🧱 Режим будівництва":"⛏️ Режим копання");
};

window.mineHotbarSel = (i) => { _hotbarSel=i; _hudHotbarDirty=true; };

// ══════════════════════════════════════════
// УТИЛІТИ
// ══════════════════════════════════════════

function lerpColor(r1,g1,b1,r2,g2,b2,t) {
  return `rgb(${~~(r1+(r2-r1)*t)},${~~(g1+(g2-g1)*t)},${~~(b1+(b2-b1)*t)})`;
}

// ══════════════════════════════════════════
// CSS
// ══════════════════════════════════════════

function injectMineStyles() {
  if (document.getElementById("mine-styles")) return;
  const s=document.createElement("style");
  s.id="mine-styles";
  s.textContent=`
    /* ── Лобі ── */
    #mine-lobby{display:flex;align-items:center;justify-content:center;min-height:400px;padding:20px;}
    .mlobby-card{background:var(--glass);backdrop-filter:blur(24px) saturate(1.4);-webkit-backdrop-filter:blur(24px) saturate(1.4);border:1.5px solid var(--glass-border);border-radius:24px;padding:32px 28px;width:100%;max-width:420px;box-shadow:var(--shadow-lg),var(--shadow-teal);display:flex;flex-direction:column;gap:18px;}
    .mlobby-title{font-family:'Syne',sans-serif;font-size:28px;font-weight:800;background:linear-gradient(135deg,var(--teal),var(--accent));-webkit-background-clip:text;-webkit-text-fill-color:transparent;background-clip:text;text-align:center;}
    .mlobby-subtitle{text-align:center;color:var(--text-muted);font-size:13px;margin-top:-12px;}
    .mlobby-stats{display:grid;grid-template-columns:1fr 1fr;gap:12px;}
    .mlobby-stat{background:var(--bg-card2);border:1.5px solid var(--border);border-radius:14px;padding:16px 10px;text-align:center;}
    .mlobby-stat-icon{font-size:24px;margin-bottom:6px;}
    .mlobby-stat-val{font-family:'Syne',sans-serif;font-size:22px;font-weight:800;color:var(--teal);line-height:1;margin-bottom:3px;}
    .mlobby-stat-label{font-size:11px;color:var(--text-muted);font-weight:600;}
    .mlobby-players{background:var(--bg-card2);border:1px solid var(--border);border-radius:12px;padding:12px 14px;display:flex;flex-wrap:wrap;gap:7px;align-items:center;}
    .mlobby-players-title{font-size:12px;color:var(--text-muted);font-weight:700;width:100%;margin-bottom:2px;}
    .mlobby-player-chip{background:rgba(10,180,204,0.12);border:1px solid rgba(10,180,204,0.3);color:var(--teal-dark);font-size:12px;font-weight:700;padding:3px 10px;border-radius:20px;}
    .mlobby-empty-players{color:var(--text-muted);font-size:13px;text-align:center;}
    .mlobby-rules{background:var(--bg-card2);border:1px solid var(--border);border-radius:12px;padding:12px 14px;font-size:12px;color:var(--text-muted);display:flex;flex-direction:column;gap:4px;line-height:1.5;}
    .mlobby-rules div:first-child{font-weight:700;color:var(--text);margin-bottom:4px;}
    .mlobby-limit-msg{background:rgba(240,80,96,0.08);border:1px solid rgba(240,80,96,0.25);border-radius:10px;padding:10px 14px;font-size:13px;font-weight:600;color:var(--coral);text-align:center;}
    .mlobby-btn{padding:14px;border-radius:14px;background:linear-gradient(135deg,var(--teal),var(--accent));color:#fff;font-size:16px;font-weight:800;border:none;cursor:pointer;box-shadow:0 4px 16px rgba(10,180,204,0.35);transition:all 0.2s;letter-spacing:.3px;}
    .mlobby-btn:hover{transform:translateY(-2px);filter:brightness(1.06);}
    .mlobby-btn-disabled{background:linear-gradient(135deg,#c8dce4,#d8e8f0)!important;color:var(--text-dim)!important;cursor:not-allowed!important;box-shadow:none!important;transform:none!important;}
    .mlobby-back{background:none;border:none;color:var(--text-muted);font-size:13px;font-weight:600;cursor:pointer;text-align:center;padding:4px;transition:color 0.2s;}
    .mlobby-back:hover{color:var(--teal);}

    /* ── Таймер ── */
    #mine-timer-hud{position:absolute;top:8px;left:50%;transform:translateX(-50%);z-index:20;background:rgba(0,0,0,0.55);border:1px solid rgba(255,255,255,0.1);border-radius:12px;padding:3px 12px;pointer-events:none;}

    /* ── Гра ── */
    #page-mine{padding:0!important;overflow:hidden;}
    #page-mine .page-header{padding:6px 12px;margin-bottom:0;border-bottom:none;position:relative;z-index:5;}
    #mine-page-root{padding:0!important;}
    #mine-wrap{position:relative;width:100%;height:calc(100vh - 170px);min-height:320px;overflow:hidden;background:#06101a;touch-action:none;user-select:none;-webkit-user-select:none;}
    #mine-canvas{display:block;width:100%;height:100%;image-rendering:pixelated;cursor:crosshair;}

    /* ── HUD ── */
    #mine-hud-tl{position:absolute;top:8px;left:8px;z-index:20;display:flex;flex-direction:column;gap:5px;pointer-events:none;max-width:240px;}
    #mine-hp-row{display:flex;align-items:center;gap:6px;background:rgba(0,0,0,0.62);border-radius:20px;padding:5px 10px 5px 8px;border:1px solid rgba(255,255,255,0.1);}
    .mine-hud-icon{font-size:14px;flex-shrink:0;}
    .mbar-track{width:80px;height:7px;background:rgba(255,255,255,0.1);border-radius:4px;overflow:hidden;}
    .mbar-hp{height:100%;border-radius:4px;transition:width 0.3s,background 0.3s;background:linear-gradient(90deg,#5ecb3e,#8bff60);}
    #mine-hp-txt{font-size:10px;font-weight:700;color:#fff;white-space:nowrap;}
    #mine-res-row{display:flex;flex-wrap:wrap;gap:4px;}
    .mres-pill{background:rgba(0,0,0,0.65);border:1px solid rgba(255,255,255,0.1);border-radius:12px;padding:2px 8px;font-size:11px;color:#ddeeff;}
    .mres-pill b{color:#f5b100;}
    #mine-equip-row{display:flex;gap:4px;flex-wrap:wrap;pointer-events:auto;}
    .mequip-item{display:flex;align-items:center;gap:2px;background:rgba(0,0,0,0.65);border:1.5px solid rgba(255,255,255,0.15);border-radius:8px;padding:3px 7px;cursor:pointer;transition:all 0.15s;}
    .mequip-item.mequip-active{border-color:#f5b100;background:rgba(245,177,0,0.2);box-shadow:0 0 8px rgba(245,177,0,0.4);}
    .mequip-icon{font-size:14px;}
    .mequip-type{font-size:9px;color:#aaa;}
    .mequip-cnt{font-size:10px;color:#f5b100;font-weight:700;}
    #mine-hud-tr{position:absolute;top:8px;right:8px;z-index:20;pointer-events:none;}
    .mhud-online{display:block;background:rgba(0,0,0,0.62);border:1px solid rgba(255,255,255,0.1);border-radius:12px;padding:4px 10px;font-size:11px;font-weight:700;color:#aaeeff;}
    #mine-mode-btn{position:absolute;top:8px;left:50%;transform:translateX(-50%);margin-top:28px;z-index:20;border:1.5px solid rgba(255,255,255,0.22);border-radius:20px;padding:6px 16px;font-size:12px;font-weight:700;color:#fff;cursor:pointer;white-space:nowrap;transition:background 0.2s;}

    /* ── Хотбар + кнопки крафту ── */
    #mine-hotbar-wrap{position:absolute;bottom:104px;left:50%;transform:translateX(-50%);z-index:25;display:flex;align-items:center;gap:6px;}
    #mine-hotbar{display:flex;gap:4px;}
    #mine-craft-btns{display:flex;flex-direction:column;gap:4px;}
    #mine-mini-craft-btn,#mine-workbench-btn{
      width:38px;height:22px;background:rgba(0,0,0,0.55);
      border:2px solid rgba(255,180,80,0.4);border-radius:7px;
      color:#f5b100;font-size:12px;cursor:pointer;
      display:flex;align-items:center;justify-content:center;
      transition:all 0.2s;-webkit-tap-highlight-color:transparent;touch-action:manipulation;
    }
    #mine-mini-craft-btn{border-color:rgba(180,255,120,0.4);color:#8bff60;}
    #mine-mini-craft-btn:active,#mine-workbench-btn:active{transform:scale(0.9);}
    .mhb{width:46px;height:46px;background:rgba(0,0,0,0.7);border:2px solid rgba(255,255,255,0.14);border-radius:8px;display:flex;flex-direction:column;align-items:center;justify-content:center;cursor:pointer;position:relative;transition:border-color 0.12s,background 0.12s;-webkit-tap-highlight-color:transparent;touch-action:manipulation;}
    .mhb.mhb-sel{border-color:#f5b100;background:rgba(245,177,0,0.2);box-shadow:0 0 10px rgba(245,177,0,0.45);}
    .mhb-ico{font-size:20px;line-height:1;}
    .mhb-cnt{position:absolute;bottom:2px;right:3px;font-size:9px;font-weight:800;color:#f5b100;}
    .mhb-n{position:absolute;top:1px;left:3px;font-size:7px;color:rgba(255,255,255,0.3);}

    /* ── Крафт панелі (обидві) ── */
    #mine-mini-craft-panel,#mine-workbench-panel{
      position:absolute;bottom:160px;left:50%;transform:translateX(-50%);
      z-index:30;background:rgba(12,20,30,0.97);
      border:1.5px solid rgba(200,120,48,0.5);border-radius:14px;
      width:min(320px,95vw);max-height:60vh;overflow-y:auto;
      box-shadow:0 8px 32px rgba(0,0,0,0.7);
      scrollbar-width:thin;scrollbar-color:rgba(200,120,48,0.3) transparent;
    }
    #mine-mini-craft-panel{border-color:rgba(120,220,80,0.5);}
    .mcraf-header{display:flex;justify-content:space-between;align-items:center;padding:12px 14px 8px;border-bottom:1px solid rgba(200,120,48,0.3);font-weight:800;color:#f5c060;font-size:15px;position:sticky;top:0;background:rgba(12,20,30,0.98);z-index:2;}
    #mine-mini-craft-panel .mcraf-header{color:#8bff60;border-color:rgba(120,220,80,0.3);}
    .mcraf-close-btn{background:none;border:none;color:rgba(255,255,255,0.5);font-size:18px;cursor:pointer;padding:0 4px;transition:color 0.15s;}
    .mcraf-close-btn:hover{color:#fff;}
    .mcraf-section-title{font-size:11px;font-weight:700;color:rgba(255,255,255,0.35);text-transform:uppercase;letter-spacing:1px;padding:8px 14px 4px;}
    .mcraf-warn{background:rgba(240,200,0,0.1);border:1px solid rgba(240,200,0,0.3);color:#f5c060;font-size:11px;padding:7px 12px;margin:6px 10px;border-radius:8px;}
    .mcraf-place-row{display:flex;flex-wrap:wrap;align-items:center;gap:6px;padding:4px 12px 8px;border-bottom:1px solid rgba(200,120,48,0.15);}
    .mcraf-divider{height:1px;background:rgba(200,120,48,0.2);margin:0;}
    .mcraf-list{display:flex;flex-direction:column;gap:2px;padding:6px;}
    .mcraf-item{display:flex;align-items:center;gap:10px;padding:9px 10px;background:rgba(255,255,255,0.04);border-radius:9px;transition:background 0.12s;}
    .mcraf-item:hover{background:rgba(255,255,255,0.07);}
    .mcraf-item-icon{font-size:22px;flex-shrink:0;width:28px;text-align:center;}
    .mcraf-item-info{flex:1;min-width:0;}
    .mcraf-item-name{font-size:13px;font-weight:700;color:#e0d0c0;}
    .mcraf-item-desc{font-size:10px;color:#888;margin-top:2px;}
    .mcraf-item-needs{display:flex;gap:5px;flex-wrap:wrap;margin-top:4px;}
    .mcraf-need{font-size:10px;padding:2px 6px;border-radius:6px;background:rgba(255,255,255,0.06);color:#aaa;}
    .mcraf-need.ok{color:#5ecb3e;background:rgba(94,203,62,0.1);}
    .mcraf-need.bad{color:#f05060;background:rgba(240,80,96,0.1);}
    .mcraf-btn{padding:7px 12px;border-radius:8px;background:linear-gradient(135deg,rgba(200,120,48,0.8),rgba(245,177,0,0.7));color:#fff;font-size:12px;font-weight:700;border:none;cursor:pointer;transition:all 0.15s;white-space:nowrap;flex-shrink:0;}
    .mcraf-btn:hover:not([disabled]){filter:brightness(1.1);}
    .mcraf-btn.disabled,.mcraf-btn:disabled{background:rgba(80,80,80,0.4);color:#666;cursor:not-allowed;}
    #mine-mini-craft-panel .mcraf-btn:not([disabled]){background:linear-gradient(135deg,rgba(80,200,60,0.8),rgba(120,220,80,0.7));}

    /* ── Тач ── */
    #mine-touch-ctrl{position:absolute;bottom:0;left:0;right:0;height:96px;display:flex;align-items:center;justify-content:space-between;padding:0 12px 8px;z-index:30;background:linear-gradient(to top,rgba(0,0,0,0.35),transparent);}
    #mine-touch-ctrl.touch-visible{display:flex!important;}
    #mine-touch-ctrl.touch-hidden{display:none!important;}
    #mine-touch-left,#mine-touch-right{display:flex;gap:10px;align-items:center;}
    .mtbtn{width:64px;height:64px;background:rgba(20,40,60,0.55);border:2.5px solid rgba(255,255,255,0.22);border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:22px;font-weight:700;color:rgba(255,255,255,0.9);cursor:pointer;-webkit-tap-highlight-color:transparent;touch-action:none;user-select:none;-webkit-user-select:none;transition:background 0.1s,border-color 0.1s,transform 0.08s;-webkit-touch-callout:none;}
    .mtbtn:active{background:rgba(10,180,204,0.3);border-color:rgba(10,180,204,0.7);transform:scale(0.93);}
    .mtbtn-jump{background:rgba(10,180,204,0.2);border-color:rgba(10,180,204,0.45);font-size:20px;}
    .mtbtn-act{background:rgba(240,125,40,0.22);border-color:rgba(240,125,40,0.5);font-size:24px;}
    .mtbtn-act:active{background:rgba(240,125,40,0.45);border-color:rgba(240,125,40,0.85);}

    /* ── Лог ── */
    #mine-log{position:absolute;top:56px;left:50%;transform:translateX(-50%);z-index:20;pointer-events:none;display:flex;flex-direction:column;align-items:center;gap:3px;min-width:160px;}
    .mlog-row{background:rgba(0,0,0,0.65);border:1px solid rgba(255,255,255,0.08);color:#e0f4ff;font-size:11px;font-weight:700;padding:3px 12px;border-radius:12px;white-space:nowrap;transition:opacity 0.5s;}
    .mtime-box{background:var(--bg-card);border-radius:20px;padding:36px 32px;text-align:center;max-width:340px;}

    @media (min-width:900px) and (pointer:fine){
      #mine-wrap{height:calc(100vh - 150px);}
      #mine-hotbar-wrap{bottom:10px!important;}
    }
  `;
  document.head.appendChild(s);
}