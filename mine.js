// ============================================
// MINE.JS — НІКУС КЕЙС РЕМЕЙК v2
// ФІКС: спільний seed світу + інтерполяція гравців
// ============================================

import { auth, db } from "./firebase.js";
import {
  doc, getDoc, setDoc, updateDoc, onSnapshot,
  collection, deleteDoc, serverTimestamp
} from "https://www.gstatic.com/firebasejs/10.7.0/firebase-firestore.js";

// ══════════════════════════════════════════
// SEEDED PRNG (mulberry32) — однаковий результат на всіх пристроях при однаковому seed
// ══════════════════════════════════════════
function mulberry32(seed) {
  return function() {
    seed |= 0; seed = seed + 0x6D2B79F5 | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = t + Math.imul(t ^ (t >>> 7), 61 | t) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// Глобальний RNG — встановлюється після отримання seed з Firestore
let _rng = Math.random; // fallback до завантаження seed

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

// ID тайлів
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
};

const DROP_RESOURCE = {
  [T_IRON]:"iron",[T_LEAD]:"lead",[T_GOLD]:"gold",
  [T_URAN]:"uranium",[T_DIAM]:"diamond",[T_NICUS]:"nicus_ore",
  [T_STONE]:"stone",[T_DIRT]:"dirt",[T_WOOD]:"wood",
  [T_GRASS]:"dirt",[T_SAND]:"sand",
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
};

const PLACEABLE = {
  stone: T_STONE, dirt: T_DIRT, wood: T_WOOD, sand: T_SAND,
};

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
};

// ══════════════════════════════════════════
// СТАН
// ══════════════════════════════════════════

let _world       = null;
let _worldMod    = {};
let _player      = null;

// ── ІНТЕРПОЛЯЦІЯ ІНШИХ ГРАВЦІВ ─────────────
// Замість прямого запису x/y, зберігаємо ПОТОЧНУ позицію (для рендеру)
// і ЦІЛЬОВУ позицію (з Firestore). Плавно рухаємося до цілі.
let _others      = {}; // uid → { x, y, tx, ty, name, dir, mining, ts }
// Швидкість інтерполяції: чим вище — тим швидше, але менш плавно
const INTERP_SPEED = 12; // px/frame при 60fps ≈ 720px/s

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
let _hotbar      = ["stone","dirt","wood",null,null,null,null,null];
let _hotbarSel   = 0;
let _buildMode   = false;

let _unsubOthers   = null;
let _unsubWorld    = null;
let _saveTimer     = null;
let _pushModTimer  = null;
let _posPushMs     = 0;

let _particles   = [];
let _drops       = [];
let _logLines    = [];

let _mouseWorld  = { x:0, y:0 };
let _isTouching  = false;
let _touchMineId = null;
const _touch = { left:false, right:false, jump:false };

// ══════════════════════════════════════════
// ІНІЦІАЛІЗАЦІЯ
// ══════════════════════════════════════════

export async function initMinePage() {
  const uid = auth.currentUser?.uid;
  if (!uid) return;

  injectMineStyles();
  buildMineHTML();

  _canvas = document.getElementById("mine-canvas");
  _ctx    = _canvas.getContext("2d");
  resizeCanvas();
  window.addEventListener("resize", resizeCanvas);

  // ── ЗАВАНТАЖЕННЯ СВІТУ З СПІЛЬНИМ SEED ──
  const worldRef  = doc(db, "mineWorld", "main");
  const worldSnap = await getDoc(worldRef);

  let worldSeed;
  if (worldSnap.exists()) {
    const data = worldSnap.data();
    worldSeed   = data.seed;
    _worldMod   = data.mods || {};
  } else {
    // Перший гравець створює seed — всі інші використовуватимуть його
    worldSeed = Date.now();
    await setDoc(worldRef, { mods: {}, seed: worldSeed });
  }

  // Встановлюємо seeded RNG ПЕРЕД генерацією світу
  _rng = mulberry32(worldSeed);
  generateWorld(); // тепер однакова для всіх при однаковому seed

  // Профіль гравця
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
    if (!isSpawnSafe(Math.floor(px/T), Math.floor(py/T))) {
      px = spawnTX * T;
      py = spawnTY * T;
    }
    _player    = makePlayer(uid, username, px, py, d.hp || 100);
    _inventory = d.inventory || {};
    _hotbar    = d.hotbar    || _hotbar;
  } else {
    _player = makePlayer(uid, username, spawnTX * T, spawnTY * T, 100);
  }

  _cam.x = _player.x - _canvas.width  / 2;
  _cam.y = _player.y - _canvas.height / 2;
  clampCam();

  subscribeOthers(uid);
  subscribeWorldMods();
  bindInput();

  _loop      = requestAnimationFrame(gameLoop);
  _saveTimer = setInterval(savePlayer, 8000);

  updateHotbarUI();
  updateModeBtn();
  addLog("⛏️ Тримай на тайл — копати | ПКМ/E — будувати | 1-8 хотбар");
}

export function destroyMinePage() {
  cancelAnimationFrame(_loop);     _loop        = null;
  clearInterval(_saveTimer);       _saveTimer   = null;
  clearTimeout(_pushModTimer);
  if (_unsubOthers) { _unsubOthers(); _unsubOthers = null; }
  if (_unsubWorld)  { _unsubWorld();  _unsubWorld  = null; }
  unbindInput();
  window.removeEventListener("resize", resizeCanvas);
  savePlayer();
  const uid = auth.currentUser?.uid;
  if (uid) deleteDoc(doc(db, "minePlayers", uid)).catch(()=>{});
}

function makePlayer(uid, name, x, y, hp) {
  return { uid, name, x, y, vx:0, vy:0, w:14, h:28, onGround:false, dir:1, mining:false, hp, maxHp:100 };
}

// ══════════════════════════════════════════
// БЕЗПЕЧНИЙ СПАВН
// ══════════════════════════════════════════

function findSafeSpawnY(tx) {
  for (let ty = 0; ty < H_TILES - 3; ty++) {
    if (isSolidTile(tx, ty) && !isSolidTile(tx, ty-1) && !isSolidTile(tx, ty-2)) {
      return ty - 2;
    }
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
      </div>
      <div id="mine-hud-tr"></div>
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
      </div>
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
  const hotbarWrap = document.getElementById("mine-hotbar-wrap");
  const touchCtrl  = document.getElementById("mine-touch-ctrl");
  if (hotbarWrap && touchCtrl) {
    const isTouch = touchCtrl.classList.contains("touch-visible");
    hotbarWrap.style.bottom = isTouch ? "104px" : "8px";
  }
}

// ══════════════════════════════════════════
// ГЕНЕРАЦІЯ СВІТУ (використовує _rng замість Math.random)
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

    if (_rng() < 0.06 && x > 5 && x < W_TILES - 5) {
      const surf2 = hmap[x];
      const h = 4 + Math.floor(_rng() * 4);
      for (let i = 1; i <= h; i++) {
        if (surf2 - i >= 0) setWorldTile(x, surf2 - i, T_WOOD);
      }
      for (let dx = -2; dx <= 2; dx++) {
        for (let dy = -3; dy <= 0; dy++) {
          const lx = x + dx, ly = surf2 - h + dy;
          if (lx>=0&&lx<W_TILES&&ly>=0&&ly<H_TILES && _world[ly*W_TILES+lx]===T_AIR)
            setWorldTile(lx, ly, T_LEAF);
        }
      }
    }
  }

  carveCaves();
}

function setWorldTile(tx, ty, id) {
  if (tx < 0 || tx >= W_TILES || ty < 0 || ty >= H_TILES) return;
  _world[ty * W_TILES + tx] = id;
}

function makeHeightmap() {
  const map = [];
  let h = SKY_H + 5;
  for (let x = 0; x < W_TILES; x++) {
    h += (_rng() - 0.5) * 2.5;
    h  = Math.max(SKY_H + 2, Math.min(SKY_H + 18, h));
    map[x] = Math.round(h);
  }
  for (let pass = 0; pass < 5; pass++) {
    for (let x = 1; x < W_TILES - 1; x++) {
      map[x] = Math.round((map[x-1] + map[x]*2 + map[x+1]) / 4);
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
  if (d > 55 && r < 0.007) return T_GOLD;
  return T_STONE;
}

function deepLayerTile(x, y) {
  const r = _rng();
  if (r < 0.009) return T_GOLD;
  if (r < 0.006) return T_URAN;
  if (r < 0.003) return T_DIAM;
  return T_STONE;
}

function coreLayerTile(x, y) {
  const r = _rng();
  if (r < 0.011) return T_DIAM;
  if (r < 0.007) return T_NICUS;
  if (r < 0.004) return T_URAN;
  return T_STONE;
}

function carveCaves() {
  const count = Math.floor(W_TILES * H_TILES / 3000);
  for (let w = 0; w < count; w++) {
    let cx  = Math.floor(_rng() * W_TILES);
    let cy  = (SKY_H + 10) + Math.floor(_rng() * (H_TILES - SKY_H - 15));
    let ang = _rng() * Math.PI * 2;
    const len = 20 + Math.floor(_rng() * 80);
    const rad = 1 + Math.floor(_rng() * 2);
    for (let i = 0; i < len; i++) {
      ang += (_rng() - 0.5) * 0.9;
      cx = Math.round(cx + Math.cos(ang) * 2);
      cy = Math.round(cy + Math.sin(ang) * 1.2);
      for (let dx = -rad; dx <= rad; dx++) {
        for (let dy = -rad; dy <= rad; dy++) {
          if (dx*dx+dy*dy <= rad*rad+0.5) {
            const nx = cx+dx, ny = cy+dy;
            if (nx>=0&&nx<W_TILES&&ny>=0&&ny<H_TILES-2)
              _world[ny*W_TILES+nx] = T_AIR;
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
  if (tx < 0 || tx >= W_TILES || ty < 0 || ty >= H_TILES) return T_BEDROCK;
  const key = tx + "," + ty;
  if (_worldMod[key] !== undefined) return _worldMod[key];
  return _world ? _world[ty * W_TILES + tx] : T_AIR;
}

function isSolidTile(tx, ty) {
  const t = getTile(tx, ty);
  return t !== T_AIR && t !== T_WATER && t !== T_LEAF;
}

function isSolidAt(px, py) {
  return isSolidTile(Math.floor(px / T), Math.floor(py / T));
}

// ══════════════════════════════════════════
// FIRESTORE
// ══════════════════════════════════════════

function subscribeWorldMods() {
  _unsubWorld = onSnapshot(doc(db, "mineWorld", "main"), snap => {
    if (!snap.exists()) return;
    const mods = snap.data().mods || {};
    
    // Знаходимо видалені моди (блоки що повернулись в повітря)
    // і додаємо нові — повна заміна замість merge
    const newKeys = new Set(Object.keys(mods));
    const oldKeys = Object.keys(_worldMod);
    
    // Видаляємо ключі яких більше немає
    oldKeys.forEach(k => {
      if (!newKeys.has(k)) delete _worldMod[k];
    });
    
    // Додаємо/оновлюємо нові
    Object.assign(_worldMod, mods);
  });
}

function pushTileMod(tx, ty, id) {
  const key = tx + "," + ty;
  _worldMod[key] = id;
  // Прибираємо debounce — пушимо одразу для синхронізації
  clearTimeout(_pushModTimer);
  _pushModTimer = setTimeout(async () => {
    try {
      await updateDoc(doc(db, "mineWorld", "main"), { ["mods." + key]: id });
    } catch(e) {
      try {
        await setDoc(doc(db, "mineWorld", "main"), { mods: _worldMod }, { merge: true });
      } catch(_) {}
    }
  }, 150); // 150мс замість 1200мс
}

async function savePlayer() {
  const uid = auth.currentUser?.uid;
  if (!uid || !_player) return;
  try {
    await setDoc(doc(db, "mineProfiles", uid), {
      x: Math.round(_player.x / T),
      y: Math.round(_player.y / T),
      hp: _player.hp,
      inventory: _inventory,
      hotbar: _hotbar,
    }, { merge: true });
  } catch(e) {}
}

async function pushPos() {
  const uid = auth.currentUser?.uid;
  if (!uid || !_player) return;
  try {
    await setDoc(doc(db, "minePlayers", uid), {
      x: Math.round(_player.x),
      y: Math.round(_player.y),
      name: _player.name,
      dir: _player.dir,
      mining: _player.mining,
      ts: Date.now(),
    }, { merge: true });
  } catch(e) {}
}

// ── ПІДПИСКА НА ІНШИХ ГРАВЦІВ З ІНТЕРПОЛЯЦІЄЮ ─
function subscribeOthers(myUid) {
  _unsubOthers = onSnapshot(collection(db, "minePlayers"), snap => {
    const now = Date.now();
    snap.docs.forEach(d => {
      if (d.id === myUid) return;
      const data = d.data();
      if (now - (data.ts || 0) > 15000) {
        delete _others[d.id]; return;
      }

      if (_others[d.id]) {
        // Гравець вже існує — оновлюємо тільки ЦІЛЬ, не поточну позицію
        // Це дозволяє інтерполяції плавно рухати спрайт до нової позиції
        _others[d.id].targetX = data.x;
        _others[d.id].targetY = data.y;
        _others[d.id].name    = data.name;
        _others[d.id].dir     = data.dir;
        _others[d.id].mining  = data.mining;
        _others[d.id].ts      = data.ts;
      } else {
        // Новий гравець — починаємо з його реальної позиції
        _others[d.id] = {
          x: data.x, y: data.y,         // поточна позиція для рендеру
          targetX: data.x, targetY: data.y, // ціль
          name: data.name, dir: data.dir || 1,
          mining: data.mining || false,
          ts: data.ts,
        };
      }
    });

    // Видаляємо гравців яких вже немає в знімку
    Object.keys(_others).forEach(id => {
      if (!snap.docs.find(d => d.id === id)) delete _others[id];
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

  update(dt);
  render();

// В gameLoop замінити:
_posPushMs += rawDt;
if (_posPushMs > 100) { _posPushMs = 0; pushPos(); } // 100мс замість 200мс
}

// ══════════════════════════════════════════
// ФІЗИКА + КОЛІЗІЯ
// ══════════════════════════════════════════

function update(dt) {
  if (!_player) return;
  const p = _player;

  const goLeft  = _keys["ArrowLeft"]  || _keys["a"] || _keys["A"] || _touch.left;
  const goRight = _keys["ArrowRight"] || _keys["d"] || _keys["D"] || _touch.right;
  const doJump  = _keys["ArrowUp"]    || _keys["w"] || _keys["W"] || _keys[" "] || _touch.jump;
  const doMine  = _keys["Mouse0"] || _mineActive;

  if (goLeft)       { p.vx = -MOVE_SPD; p.dir = -1; }
  else if (goRight) { p.vx =  MOVE_SPD; p.dir =  1; }
  else              { p.vx *= 0.75; if (Math.abs(p.vx) < 0.1) p.vx = 0; }

  if (doJump && p.onGround) { p.vy = JUMP_V; p.onGround = false; }

  p.vy += GRAVITY * dt;
  p.vy = Math.min(p.vy, 20);

  p.x += p.vx * dt;
  resolveAxisX(p);

  p.onGround = false;
  p.y += p.vy * dt;
  resolveAxisY(p);

  if (p.x < 0)                    { p.x = 0; p.vx = 0; }
  if (p.x > (W_TILES-2)*T)        { p.x = (W_TILES-2)*T; p.vx = 0; }
  if (p.y < 0)                    { p.y = 0; p.vy = 0; }
  if (p.y > (H_TILES-2)*T - p.h)  { p.y = (H_TILES-2)*T - p.h; p.vy = 0; p.onGround = true; }

  if (doMine) {
    if (_buildMode) doBuild();
    else            doMineAction(dt);
  } else {
    resetMine(p);
  }

// ── ІНТЕРПОЛЯЦІЯ ІНШИХ ГРАВЦІВ ──
Object.values(_others).forEach(o => {
  const dx = o.targetX - o.x;
  const dy = o.targetY - o.y;
  const dist = Math.sqrt(dx * dx + dy * dy);

  if (dist < 0.5) {
    o.x = o.targetX;
    o.y = o.targetY;
  } else if (dist > 600) {
    // Телепорт якщо дуже далеко (спавн/телепорт)
    o.x = o.targetX;
    o.y = o.targetY;
  } else {
    // Exponential smoothing — плавно і без ривків
    const alpha = Math.min(1, 1 - Math.pow(0.05, dt * 0.016));
    o.x += dx * alpha;
    o.y += dy * alpha;
  }
});

  updateDrops(dt);
  updateParticles(dt);
  pickupDrops();

  _camTarget.x = p.x + p.w / 2 - _canvas.width  / 2;
  _camTarget.y = p.y + p.h / 2 - _canvas.height / 2;
  clampCam();
  _cam.x += (_camTarget.x - _cam.x) * CAM_LERP * dt * 1.5;
  _cam.y += (_camTarget.y - _cam.y) * CAM_LERP * dt * 1.5;
}

function resolveAxisX(p) {
  if (p.vx === 0) return;
  const corners = [
    { cx: p.x,        cy: p.y },
    { cx: p.x,        cy: p.y + p.h - 1 },
    { cx: p.x + p.w - 1, cy: p.y },
    { cx: p.x + p.w - 1, cy: p.y + p.h - 1 },
  ];
  for (const c of corners) {
    const tx = Math.floor(c.cx / T);
    const ty = Math.floor(c.cy / T);
    if (!isSolidTile(tx, ty)) continue;
    if (p.vx > 0) { p.x = tx * T - p.w; }
    else          { p.x = (tx + 1) * T; }
    p.vx = 0;
    break;
  }
}

function resolveAxisY(p) {
  const corners = [
    { cx: p.x + 2,        cy: p.y },
    { cx: p.x + p.w - 3,  cy: p.y },
    { cx: p.x + 2,        cy: p.y + p.h - 1 },
    { cx: p.x + p.w - 3,  cy: p.y + p.h - 1 },
  ];
  for (let i = 0; i < 4; i++) {
    const c = corners[i];
    const tx = Math.floor(c.cx / T);
    const ty = Math.floor(c.cy / T);
    if (!isSolidTile(tx, ty)) continue;
    if (p.vy > 0) { p.y = ty * T - p.h; p.onGround = true; }
    else          { p.y = (ty + 1) * T; }
    p.vy = 0;
    break;
  }
}

function clampCam() {
  _camTarget.x = Math.max(0, Math.min(_camTarget.x, W_TILES * T - _canvas.width));
  _camTarget.y = Math.max(0, Math.min(_camTarget.y, H_TILES * T - _canvas.height));
}

// ══════════════════════════════════════════
// КОПАННЯ
// ══════════════════════════════════════════

function doMineAction(dt) {
  const p  = _player;
  p.mining = true;
  const tx = Math.floor(_mouseWorld.x / T);
  const ty = Math.floor(_mouseWorld.y / T);
  const px = Math.floor((p.x + p.w/2) / T);
  const py = Math.floor((p.y + p.h/2) / T);
  const dist = Math.max(Math.abs(tx - px), Math.abs(ty - py));
  if (dist > 5) { resetMine(p); return; }
  const tile = getTile(tx, ty);
  if (tile === T_AIR || tile === T_WATER || tile === T_BEDROCK) { resetMine(p); return; }
  if (!_mineTile || _mineTile.tx !== tx || _mineTile.ty !== ty) {
    _mineProgress = 0;
    _mineTile = { tx, ty };
  }
  _mineProgress += dt * 16.67;
  if (_tick % 4 === 0) {
    spawnParticle(tx*T + T/2, ty*T + T/2, TILE_COLOR[tile] || "#888", 4);
  }
  const hardness = TILE_HARDNESS[tile] || 600;
  if (_mineProgress >= hardness) {
    _worldMod[tx + "," + ty] = T_AIR;
    pushTileMod(tx, ty, T_AIR);
    const res = DROP_RESOURCE[tile];
    if (res) {
      spawnDrop(tx*T + T/2, ty*T + T/2, res, 1);
      addLog((RES_DATA[res]?.icon || "⛏") + " +" + (RES_DATA[res]?.name || res));
    }
    for (let i = 0; i < 12; i++) {
      spawnParticle(tx*T + T/2, ty*T + T/2, TILE_COLOR[tile] || "#888", 8);
    }
    _mineProgress = 0;
    _mineTile = null;
    p.mining = false;
  }
}

function resetMine(p) {
  _mineProgress = 0;
  _mineTile = null;
  if (p) p.mining = false;
}

// ══════════════════════════════════════════
// БУДІВНИЦТВО
// ══════════════════════════════════════════

function doBuild() {
  if (!_player) return;
  const p  = _player;
  const tx = Math.floor(_mouseWorld.x / T);
  const ty = Math.floor(_mouseWorld.y / T);
  const px = Math.floor((p.x + p.w/2) / T);
  const py = Math.floor((p.y + p.h/2) / T);
  if (Math.abs(tx-px) > 5 || Math.abs(ty-py) > 5) return;
  if (getTile(tx, ty) !== T_AIR) return;
  const playerTX1 = Math.floor(p.x / T);
  const playerTX2 = Math.floor((p.x + p.w - 1) / T);
  const playerTY1 = Math.floor(p.y / T);
  const playerTY2 = Math.floor((p.y + p.h - 1) / T);
  if (tx >= playerTX1 && tx <= playerTX2 && ty >= playerTY1 && ty <= playerTY2) return;
  const resName = _hotbar[_hotbarSel];
  if (!resName || !(_inventory[resName] > 0)) return;
  const tileId = PLACEABLE[resName];
  if (!tileId) return;
  _inventory[resName]--;
  if (_inventory[resName] <= 0) delete _inventory[resName];
  _worldMod[tx + "," + ty] = tileId;
  pushTileMod(tx, ty, tileId);
  for (let i = 0; i < 6; i++) {
    spawnParticle(tx*T + T/2, ty*T + T/2, TILE_COLOR[tileId] || "#888", 5);
  }
  updateHotbarUI();
  _mineActive = false;
  _keys["Mouse0"] = false;
}

// ══════════════════════════════════════════
// ДРОПИ
// ══════════════════════════════════════════

function spawnDrop(x, y, res, amt) {
  _drops.push({
    x, y,
    vx: (Math.random() - 0.5) * 3,
    vy: -3 - Math.random() * 3,
    res, amt, age: 0,
    bob: Math.random() * Math.PI * 2,
  });
}

function updateDrops(dt) {
  _drops = _drops.filter(d => {
    d.vy += GRAVITY * dt * 0.6;
    d.vx *= 0.98;
    d.x  += d.vx * dt;
    d.y  += d.vy * dt;
    d.bob += 0.04 * dt;
    d.age += dt * 16.67;
    const tx = Math.floor(d.x / T);
    const ty = Math.floor(d.y / T);
    if (isSolidTile(tx, ty)) { d.y = ty * T - 8; d.vy = 0; d.vx *= 0.5; }
    return d.age < 25000;
  });
}

function pickupDrops() {
  if (!_player) return;
  const p  = _player;
  const cx = p.x + p.w / 2;
  const cy = p.y + p.h / 2;
  _drops = _drops.filter(d => {
    const dist = Math.hypot(d.x - cx, d.y - cy);
    if (dist < 32) {
      _inventory[d.res] = (_inventory[d.res] || 0) + d.amt;
      for (let i = 0; i < 4; i++) spawnParticle(cx, p.y + p.h/2, "#f5b100", 5);
      updateHotbarUI();
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
    vx: (Math.random() - 0.5) * (speed || 4),
    vy: -(Math.random()) * (speed || 3),
    life: 1.0, color,
    sz: 1.5 + Math.random() * 2,
  });
  if (_particles.length > 500) _particles.length = 250;
}

function updateParticles(dt) {
  _particles = _particles.filter(p => {
    p.x   += p.vx * dt;
    p.y   += p.vy * dt;
    p.vy  += 0.18 * dt;
    p.life -= 0.04 * dt;
    return p.life > 0;
  });
}

// ══════════════════════════════════════════
// РЕНДЕР
// ══════════════════════════════════════════

function render() {
  if (!_ctx || !_canvas || !_world) return;
  const ctx = _ctx;
  const W = _canvas.width;
  const H = _canvas.height;

  const depthPx = _cam.y;
  const maxDepth = DEEP_TOP * T;
  const frac = Math.max(0, Math.min(1, depthPx / maxDepth));
  const g = ctx.createLinearGradient(0, 0, 0, H);
  g.addColorStop(0, lerpColor(135,206,235, 8,8,36, frac));
  g.addColorStop(1, lerpColor(80, 170,210, 4,4,22, frac));
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, W, H);

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

  updateHpHUD();
  updateResHUD();
}

function drawTiles(ctx, W, H) {
  const cx = Math.floor(_cam.x);
  const cy = Math.floor(_cam.y);
  const sx = Math.max(0, Math.floor(cx / T) - 1);
  const sy = Math.max(0, Math.floor(cy / T) - 1);
  const ex = Math.min(W_TILES - 1, sx + Math.ceil(W / T) + 2);
  const ey = Math.min(H_TILES - 1, sy + Math.ceil(H / T) + 2);

  for (let ty = sy; ty <= ey; ty++) {
    for (let tx = sx; tx <= ex; tx++) {
      const tile = getTile(tx, ty);
      if (tile === T_AIR) continue;
      const color = TILE_COLOR[tile];
      if (!color) continue;
      const px = tx * T;
      const py = ty * T;
      ctx.fillStyle = color;
      ctx.fillRect(px, py, T, T);
      if (tile !== T_WATER && tile !== T_LEAF) {
        ctx.fillStyle = "rgba(0,0,0,0.15)";
        ctx.fillRect(px, py + T - 2, T, 2);
        ctx.fillRect(px + T - 2, py, 2, T);
        ctx.fillStyle = "rgba(255,255,255,0.12)";
        ctx.fillRect(px, py, T, 2);
        ctx.fillRect(px, py, 2, T);
      }
      if (tile >= T_IRON && tile <= T_NICUS) {
        ctx.fillStyle = "rgba(255,255,255,0.28)";
        ctx.fillRect(px + 3, py + 3, 4, 4);
        ctx.fillRect(px + T - 7, py + T - 7, 3, 3);
      }
    }
  }
}

function drawSelf(ctx) {
  if (!_player) return;
  const p = _player;
  drawCharacter(ctx, p.x, p.y, p.w, p.h, p.name, p.hp / p.maxHp, p.dir, p.mining, "#e0f4ff", true);
}

// ── РЕНДЕР ІНШИХ ГРАВЦІВ — використовує інтерпольовані x/y ─
function drawOtherPlayers(ctx) {
  Object.values(_others).forEach(o => {
    // o.x і o.y вже інтерпольовані в update()
    drawCharacter(ctx, o.x, o.y, 14, 28, o.name || "?", 1, o.dir || 1, o.mining || false, "#ffcc44", false);
  });
}

function drawCharacter(ctx, x, y, w, h, name, hpFrac, dir, isMining, color, isSelf) {
  const cx = x + w / 2;
  ctx.save();

  ctx.fillStyle = "rgba(0,0,0,0.2)";
  ctx.beginPath();
  ctx.ellipse(cx, y + h + 2, w * 0.7, 3, 0, 0, Math.PI * 2);
  ctx.fill();

  const bw = 32, bh = 4;
  ctx.fillStyle = "rgba(0,0,0,0.55)";
  ctx.fillRect(cx - bw/2, y - 18, bw, bh);
  const hpColor = hpFrac > 0.6 ? "#5ecb3e" : hpFrac > 0.3 ? "#f5b100" : "#e0203a";
  ctx.fillStyle = hpColor;
  ctx.fillRect(cx - bw/2, y - 18, bw * Math.max(0, hpFrac), bh);

  ctx.font = `bold ${isSelf ? 9 : 8}px sans-serif`;
  ctx.textAlign = "center";
  ctx.fillStyle = isSelf ? "#fff" : color;
  ctx.fillText(name.slice(0, 14), cx, y - 21);

  ctx.strokeStyle = color;
  ctx.lineWidth   = 2.5;
  ctx.lineCap     = "round";
  ctx.lineJoin    = "round";

  const headR = 5;
  const headY = y + 7;
  ctx.beginPath();
  ctx.arc(cx, headY, headR, 0, Math.PI * 2);
  ctx.stroke();

  const bodyTop = headY + headR;
  const bodyBot = y + h - 8;
  ctx.beginPath();
  ctx.moveTo(cx, bodyTop);
  ctx.lineTo(cx, bodyBot);
  ctx.stroke();

  const legSwing = isSelf ? Math.sin(_tick * 0.25) * 7 : Math.sin(Date.now() * 0.005) * 5;
  ctx.beginPath();
  ctx.moveTo(cx, bodyBot);
  ctx.lineTo(cx - 4, bodyBot + 8 + legSwing);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(cx, bodyBot);
  ctx.lineTo(cx + 4, bodyBot + 8 - legSwing);
  ctx.stroke();

  const armY = bodyTop + 4;
  if (isMining) {
    const sw = Math.sin(_tick * 0.3) * 20 - 5;
    ctx.beginPath();
    ctx.moveTo(cx, armY);
    ctx.lineTo(cx + dir * 12, armY + sw);
    ctx.stroke();
    ctx.strokeStyle = "#f5b100";
    ctx.lineWidth = 3;
    const pickX = cx + dir * 12;
    const pickY = armY + sw;
    ctx.beginPath();
    ctx.moveTo(pickX, pickY);
    ctx.lineTo(pickX + dir * 8, pickY + 7);
    ctx.stroke();
    ctx.strokeStyle = color;
    ctx.lineWidth = 2.5;
  } else {
    ctx.beginPath();
    ctx.moveTo(cx, armY);
    ctx.lineTo(cx - 7, armY + 8);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(cx, armY);
    ctx.lineTo(cx + 7, armY + 8);
    ctx.stroke();
  }

  ctx.restore();
}

function drawMineProgress(ctx) {
  if (!_mineTile || _mineProgress <= 0) return;
  const { tx, ty } = _mineTile;
  const tile = getTile(tx, ty);
  if (tile === T_AIR) return;
  const hardness = TILE_HARDNESS[tile] || 600;
  const pct = Math.min(1, _mineProgress / hardness);
  const px = tx * T, py = ty * T;

  ctx.fillStyle = `rgba(0,0,0,${pct * 0.5})`;
  ctx.fillRect(px, py, T, T);

  ctx.strokeStyle = `rgba(255,255,255,${pct * 0.7})`;
  ctx.lineWidth = 1;
  const cx2 = px + T/2, cy2 = py + T/2;
  const cracks = Math.floor(pct * 6);
  for (let i = 0; i < cracks; i++) {
    const ang = (i / cracks) * Math.PI * 2;
    ctx.beginPath();
    ctx.moveTo(cx2, cy2);
    ctx.lineTo(cx2 + Math.cos(ang) * T * 0.4 * pct, cy2 + Math.sin(ang) * T * 0.4 * pct);
    ctx.stroke();
  }

  ctx.fillStyle = "rgba(0,0,0,0.6)";
  ctx.fillRect(px, py + T - 5, T, 5);
  ctx.fillStyle = pct < 0.5 ? "#f5b100" : "#f05060";
  ctx.fillRect(px, py + T - 5, T * pct, 5);
}

function drawCursorHighlight(ctx) {
  if (!_player) return;
  const tx = Math.floor(_mouseWorld.x / T);
  const ty = Math.floor(_mouseWorld.y / T);
  const px2 = Math.floor((_player.x + _player.w/2) / T);
  const py2 = Math.floor((_player.y + _player.h/2) / T);
  if (Math.abs(tx - px2) > 5 || Math.abs(ty - py2) > 5) return;
  ctx.save();
  ctx.strokeStyle = _buildMode ? "rgba(80,200,255,0.85)" : "rgba(255,220,80,0.85)";
  ctx.lineWidth = 2;
  ctx.setLineDash([4, 3]);
  ctx.strokeRect(tx*T + 1, ty*T + 1, T - 2, T - 2);
  ctx.setLineDash([]);
  ctx.restore();
}

function drawDrops(ctx) {
  ctx.font = "14px sans-serif";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  _drops.forEach(d => {
    const bob = Math.sin(d.bob) * 2;
    ctx.fillStyle = "rgba(0,0,0,0.25)";
    ctx.beginPath();
    ctx.ellipse(d.x, d.y + 10, 6, 2, 0, 0, Math.PI*2);
    ctx.fill();
    ctx.fillText(RES_DATA[d.res]?.icon || "•", d.x, d.y + bob);
  });
  ctx.textBaseline = "alphabetic";
}

function drawParticles(ctx) {
  _particles.forEach(p => {
    ctx.save();
    ctx.globalAlpha = Math.max(0, p.life);
    ctx.fillStyle = p.color;
    ctx.fillRect(p.x - p.sz/2, p.y - p.sz/2, p.sz, p.sz);
    ctx.restore();
  });
}

// ══════════════════════════════════════════
// HUD
// ══════════════════════════════════════════

function updateHpHUD() {
  const bar = document.getElementById("mine-hp-bar");
  const txt = document.getElementById("mine-hp-txt");
  if (!bar || !_player) return;
  const pct = (_player.hp / _player.maxHp) * 100;
  bar.style.width = Math.max(0, pct) + "%";
  if (pct > 60) bar.style.background = "linear-gradient(90deg,#5ecb3e,#8bff60)";
  else if (pct > 30) bar.style.background = "linear-gradient(90deg,#f5b100,#ffd040)";
  else bar.style.background = "linear-gradient(90deg,#e0203a,#f07060)";
  if (txt) txt.textContent = _player.hp + "/" + _player.maxHp;
}

function updateResHUD() {
  const el = document.getElementById("mine-res-row");
  if (!el) return;
  const entries = Object.entries(_inventory).filter(([,v]) => v > 0);
  if (!entries.length) { el.innerHTML = ""; return; }
  el.innerHTML = entries.slice(0, 6).map(([k, v]) =>
    `<span class="mres-pill">${RES_DATA[k]?.icon || k} <b>${v}</b></span>`
  ).join("");
}

function updateOnlineHUD() {
  const el = document.getElementById("mine-hud-tr");
  if (!el) return;
  const names = Object.values(_others).map(o => o.name || "?");
  el.innerHTML = names.length
    ? `<span class="mhud-online">👥 ${names.join(", ")}</span>`
    : `<span class="mhud-online">👁 Лише ти</span>`;
}

function updateHotbarUI() {
  const el = document.getElementById("mine-hotbar");
  if (!el) return;
  el.innerHTML = _hotbar.map((res, i) => {
    const cnt = res ? (_inventory[res] || 0) : 0;
    const sel = i === _hotbarSel;
    const icon = res ? (RES_DATA[res]?.icon || res) : "";
    return `<div class="mhb${sel ? " mhb-sel" : ""}" onclick="window.mineHotbarSel(${i})">
      <div class="mhb-ico">${icon}</div>
      ${cnt > 0 ? `<div class="mhb-cnt">${cnt}</div>` : ""}
      <div class="mhb-n">${i+1}</div>
    </div>`;
  }).join("");
}

function updateModeBtn() {
  const el = document.getElementById("mine-mode-btn");
  if (!el) return;
  el.textContent = _buildMode ? "🧱 Будувати" : "⛏️ Копати";
  el.style.background = _buildMode
    ? "linear-gradient(135deg,rgba(40,120,255,0.85),rgba(20,80,200,0.7))"
    : "linear-gradient(135deg,rgba(240,125,40,0.85),rgba(200,80,20,0.7))";
}

function addLog(msg) {
  const el = document.getElementById("mine-log");
  if (!el) return;
  const d = document.createElement("div");
  d.className = "mlog-row";
  d.textContent = msg;
  el.prepend(d);
  _logLines.push(d);
  if (_logLines.length > 5) {
    const old = _logLines.shift();
    old?.remove();
  }
  setTimeout(() => { d.style.opacity = "0"; setTimeout(() => d.remove(), 500); }, 3500);
}

// ══════════════════════════════════════════
// ВВІД
// ══════════════════════════════════════════

const _onKeyDown = (e) => {
  _keys[e.key] = true;
  if (e.key >= "1" && e.key <= "8") { _hotbarSel = +e.key - 1; updateHotbarUI(); }
  if (e.key === "e" || e.key === "E") { _buildMode = !_buildMode; updateModeBtn(); }
  if (e.key === " " || e.key === "ArrowUp" || e.key === "ArrowDown") e.preventDefault();
};
const _onKeyUp = (e) => { delete _keys[e.key]; };

const _onMouseMove = (e) => {
  if (!_canvas) return;
  const r = _canvas.getBoundingClientRect();
  const scaleX = _canvas.width  / r.width;
  const scaleY = _canvas.height / r.height;
  _mouseWorld.x = (e.clientX - r.left) * scaleX + _cam.x;
  _mouseWorld.y = (e.clientY - r.top)  * scaleY + _cam.y;
};
const _onMouseDown = (e) => {
  if (e.button === 0) { _keys["Mouse0"] = true; }
  if (e.button === 2) { _buildMode = !_buildMode; updateModeBtn(); e.preventDefault(); }
};
const _onMouseUp   = (e) => { if (e.button === 0) delete _keys["Mouse0"]; };
const _onCtxMenu   = (e) => e.preventDefault();
const _onWheel     = (e) => {
  _hotbarSel = ((_hotbarSel + (e.deltaY > 0 ? 1 : -1)) + 8) % 8;
  updateHotbarUI();
};

const _onTouchMove = (e) => {
  if (!_canvas || !_player) return;
  for (const t of e.changedTouches) {
    if (t.identifier === _touchMineId) continue;
    const el = document.elementFromPoint(t.clientX, t.clientY);
    if (el && (el.classList.contains("mtbtn") || el.id.startsWith("mine-"))) continue;
    const r = _canvas.getBoundingClientRect();
    const scaleX = _canvas.width  / r.width;
    const scaleY = _canvas.height / r.height;
    _mouseWorld.x = (t.clientX - r.left) * scaleX + _cam.x;
    _mouseWorld.y = (t.clientY - r.top)  * scaleY + _cam.y;
  }
};

const _onCanvasTouchStart = (e) => {
  for (const t of e.changedTouches) {
    const el = document.elementFromPoint(t.clientX, t.clientY);
    if (el && (el.classList.contains("mtbtn") || el.closest("#mine-touch-ctrl"))) continue;
    if (el && el.closest("#mine-hotbar-wrap")) continue;
    const r = _canvas.getBoundingClientRect();
    const scaleX = _canvas.width  / r.width;
    const scaleY = _canvas.height / r.height;
    _mouseWorld.x = (t.clientX - r.left) * scaleX + _cam.x;
    _mouseWorld.y = (t.clientY - r.top)  * scaleY + _cam.y;
    _mineActive = true;
    _touchMineId = t.identifier;
    break;
  }
};

const _onCanvasTouchEnd = (e) => {
  for (const t of e.changedTouches) {
    if (t.identifier === _touchMineId) {
      _mineActive = false;
      _touchMineId = null;
    }
  }
};

function bindInput() {
  window.addEventListener("keydown", _onKeyDown);
  window.addEventListener("keyup",   _onKeyUp);
  _canvas?.addEventListener("mousemove",   _onMouseMove);
  _canvas?.addEventListener("mousedown",   _onMouseDown);
  _canvas?.addEventListener("mouseup",     _onMouseUp);
  _canvas?.addEventListener("contextmenu", _onCtxMenu);
  _canvas?.addEventListener("wheel",       _onWheel, { passive: true });
  _canvas?.addEventListener("touchstart",  _onCanvasTouchStart, { passive: false });
  _canvas?.addEventListener("touchmove",   _onTouchMove, { passive: true });
  _canvas?.addEventListener("touchend",    _onCanvasTouchEnd, { passive: true });
  _canvas?.addEventListener("touchcancel", _onCanvasTouchEnd, { passive: true });
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

window.mineTouch = (btn, v) => { _touch[btn] = !!v; };

window.mineTouchMine = (v) => {
  _mineActive = !!v;
  if (!v) { _mineProgress = 0; _mineTile = null; }
  if (v && _player) {
    const p = _player;
    _mouseWorld.x = p.x + p.dir * (p.w + T * 1.5);
    _mouseWorld.y = p.y + p.h * 0.5;
  }
};

window.mineToggleMode = () => {
  _buildMode = !_buildMode;
  updateModeBtn();
  addLog(_buildMode ? "🧱 Режим будівництва" : "⛏️ Режим копання");
};

window.mineHotbarSel = (i) => { _hotbarSel = i; updateHotbarUI(); };

// ══════════════════════════════════════════
// УТИЛІТИ
// ══════════════════════════════════════════

function lerpColor(r1,g1,b1, r2,g2,b2, t) {
  return `rgb(${~~(r1+(r2-r1)*t)},${~~(g1+(g2-g1)*t)},${~~(b1+(b2-b1)*t)})`;
}

// ══════════════════════════════════════════
// CSS (без змін)
// ══════════════════════════════════════════

function injectMineStyles() {
  if (document.getElementById("mine-styles")) return;
  const s = document.createElement("style");
  s.id = "mine-styles";
  s.textContent = `
    #page-mine { padding: 0 !important; overflow: hidden; }
    #page-mine .page-header {
      padding: 6px 12px;
      margin-bottom: 0;
      border-bottom: none;
      position: relative;
      z-index: 5;
    }
    #mine-page-root { padding: 0 !important; }
    #mine-wrap {
      position: relative;
      width: 100%;
      height: calc(100svh - 170px);
      min-height: 320px;
      overflow: hidden;
      background: #06101a;
      touch-action: none;
      user-select: none;
      -webkit-user-select: none;
    }
    #mine-canvas {
      display: block;
      width: 100%;
      height: 100%;
      image-rendering: pixelated;
      cursor: crosshair;
    }
    #mine-hud-tl {
      position: absolute;
      top: 8px; left: 8px;
      z-index: 20;
      display: flex;
      flex-direction: column;
      gap: 5px;
      pointer-events: none;
      max-width: 220px;
    }
    #mine-hp-row {
      display: flex;
      align-items: center;
      gap: 6px;
      background: rgba(0,0,0,0.62);
      border-radius: 20px;
      padding: 5px 10px 5px 8px;
      border: 1px solid rgba(255,255,255,0.1);
    }
    .mine-hud-icon { font-size: 14px; flex-shrink: 0; }
    .mbar-track { width: 80px; height: 7px; background: rgba(255,255,255,0.1); border-radius: 4px; overflow: hidden; }
    .mbar-hp { height: 100%; border-radius: 4px; transition: width 0.3s, background 0.3s; background: linear-gradient(90deg, #5ecb3e, #8bff60); }
    #mine-hp-txt { font-size: 10px; font-weight: 700; color: #fff; white-space: nowrap; }
    #mine-res-row { display: flex; flex-wrap: wrap; gap: 4px; }
    .mres-pill { background: rgba(0,0,0,0.65); border: 1px solid rgba(255,255,255,0.1); border-radius: 12px; padding: 2px 8px; font-size: 11px; color: #ddeeff; }
    .mres-pill b { color: #f5b100; }
    #mine-hud-tr { position: absolute; top: 8px; right: 8px; z-index: 20; pointer-events: none; }
    .mhud-online { display: block; background: rgba(0,0,0,0.62); border: 1px solid rgba(255,255,255,0.1); border-radius: 12px; padding: 4px 10px; font-size: 11px; font-weight: 700; color: #aaeeff; }
    #mine-mode-btn { position: absolute; top: 8px; left: 50%; transform: translateX(-50%); z-index: 20; border: 1.5px solid rgba(255,255,255,0.22); border-radius: 20px; padding: 6px 16px; font-size: 12px; font-weight: 700; color: #fff; cursor: pointer; white-space: nowrap; transition: background 0.2s; }
    #mine-hotbar-wrap { position: absolute; bottom: 104px; left: 50%; transform: translateX(-50%); z-index: 25; }
    #mine-touch-ctrl.touch-hidden ~ #mine-hotbar-wrap, .touch-hidden ~ #mine-hotbar-wrap { bottom: 8px; }
    #mine-hotbar { display: flex; gap: 4px; }
    .mhb { width: 46px; height: 46px; background: rgba(0,0,0,0.7); border: 2px solid rgba(255,255,255,0.14); border-radius: 8px; display: flex; flex-direction: column; align-items: center; justify-content: center; cursor: pointer; position: relative; transition: border-color 0.12s, background 0.12s; -webkit-tap-highlight-color: transparent; touch-action: manipulation; }
    .mhb.mhb-sel { border-color: #f5b100; background: rgba(245,177,0,0.2); box-shadow: 0 0 10px rgba(245,177,0,0.45); }
    .mhb-ico { font-size: 20px; line-height: 1; }
    .mhb-cnt { position: absolute; bottom: 2px; right: 3px; font-size: 9px; font-weight: 800; color: #f5b100; }
    .mhb-n { position: absolute; top: 1px; left: 3px; font-size: 7px; color: rgba(255,255,255,0.3); }
    #mine-touch-ctrl { position: absolute; bottom: 0; left: 0; right: 0; height: 96px; display: flex; align-items: center; justify-content: space-between; padding: 0 12px 8px; z-index: 30; background: linear-gradient(to top, rgba(0,0,0,0.35), transparent); }
    #mine-touch-ctrl.touch-visible { display: flex !important; }
    #mine-touch-ctrl.touch-hidden  { display: none !important; }
    #mine-touch-left, #mine-touch-right { display: flex; gap: 10px; align-items: center; }
    .mtbtn { width: 64px; height: 64px; background: rgba(20,40,60,0.55); border: 2.5px solid rgba(255,255,255,0.22); border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 22px; font-weight: 700; color: rgba(255,255,255,0.9); cursor: pointer; -webkit-tap-highlight-color: transparent; touch-action: none; user-select: none; -webkit-user-select: none; transition: background 0.1s, border-color 0.1s, transform 0.08s; -webkit-touch-callout: none; }
    .mtbtn:active { background: rgba(10,180,204,0.3); border-color: rgba(10,180,204,0.7); transform: scale(0.93); }
    .mtbtn-jump { background: rgba(10,180,204,0.2); border-color: rgba(10,180,204,0.45); font-size: 20px; }
    .mtbtn-act { background: rgba(240,125,40,0.22); border-color: rgba(240,125,40,0.5); font-size: 24px; }
    .mtbtn-act:active { background: rgba(240,125,40,0.45); border-color: rgba(240,125,40,0.85); }
    #mine-log { position: absolute; top: 44px; left: 50%; transform: translateX(-50%); z-index: 20; pointer-events: none; display: flex; flex-direction: column; align-items: center; gap: 3px; min-width: 160px; }
    .mlog-row { background: rgba(0,0,0,0.65); border: 1px solid rgba(255,255,255,0.08); color: #e0f4ff; font-size: 11px; font-weight: 700; padding: 3px 12px; border-radius: 12px; white-space: nowrap; transition: opacity 0.5s; }
    @media (min-width: 900px) and (pointer: fine) {
      #mine-wrap { height: calc(100svh - 150px); }
      #mine-hotbar-wrap { bottom: 10px !important; }
    }
  `;
  document.head.appendChild(s);
}