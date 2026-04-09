// ============================================
// MINE.JS — НІКУС КЕЙС РЕМЕЙК
// Terraria-like 2D платформер
// Світ: 1600×400 тайлів | Онлайн: Firestore
// ============================================

import { auth, db } from "./firebase.js";
import {
  doc, getDoc, setDoc, updateDoc, onSnapshot,
  collection, deleteDoc, serverTimestamp
} from "https://www.gstatic.com/firebasejs/10.7.0/firebase-firestore.js";

// ══════════════════════════════════════════
// КОНФІГ
// ══════════════════════════════════════════

const T        = 16;
const W_TILES  = 1600;
const H_TILES  = 400;
const GRAVITY  = 0.5;
const JUMP_V   = -10;
const MOVE_SPD = 3;
const CAM_LERP = 0.12;

const SKY_H    = 60;
const DEEP_TOP = 280;
const CORE_TOP = 360;

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
  [T_WATER]:  "rgba(40,120,255,0.55)",
};

const DROP_RESOURCE = {
  [T_IRON]:"iron",[T_LEAD]:"lead",[T_GOLD]:"gold",
  [T_URAN]:"uranium",[T_DIAM]:"diamond",[T_NICUS]:"nicus_ore",
  [T_STONE]:"stone",[T_DIRT]:"dirt",[T_WOOD]:"wood",
};

const RES_ICON = {
  iron:"⚙️",lead:"🔩",gold:"🌕",uranium:"☢️",
  diamond:"💎",nicus_ore:"🌀",stone:"🪨",dirt:"🟫",wood:"🪵",
};

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
let _mineTimer   = 0;
let _mineTile    = null;
let _inventory   = {};
let _hotbar      = ["stone","dirt","wood",null,null,null,null,null];
let _hotbarSel   = 0;
let _unsubOthers = null;
let _unsubWorld  = null;
let _saveTimer   = null;
let _particles   = [];
let _drops       = [];
let _logLines    = [];
let _touch       = { left:false, right:false, jump:false, mine:false };
let _mouseWorld  = { x:0, y:0 };
let _buildMode   = false;
let _pushModTimer= null;
let _posPushMs   = 0;
let _lastTs      = 0;

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

  // Завантаження / генерація світу
  const worldSnap = await getDoc(doc(db, "mineWorld", "main"));
  if (worldSnap.exists() && worldSnap.data().mods) {
    generateWorld();
    _worldMod = worldSnap.data().mods || {};
  } else {
    generateWorld();
    await setDoc(doc(db, "mineWorld", "main"), { mods:{}, seed: Date.now() }, { merge:true });
  }

  // Профіль гравця
  const [profSnap, userSnap] = await Promise.all([
    getDoc(doc(db, "mineProfiles", uid)),
    getDoc(doc(db, "users", uid)),
  ]);
  const username = userSnap.data()?.username || "Гравець";
  const spawnX   = Math.floor(W_TILES / 2);
  const spawnY   = getSurfaceY(spawnX) - 3;

  if (profSnap.exists()) {
    const d = profSnap.data();
    _player    = makePlayer(uid, username, (d.x||spawnX)*T, (d.y||spawnY)*T, d.hp||100);
    _inventory = d.inventory || {};
    _hotbar    = d.hotbar    || _hotbar;
  } else {
    _player = makePlayer(uid, username, spawnX*T, spawnY*T, 100);
  }

  _cam.x = _player.x - _canvas.width  / 2;
  _cam.y = _player.y - _canvas.height / 2;

  subscribeOthers(uid);
  subscribeWorldMods();
  bindInput();

  _loop       = requestAnimationFrame(gameLoop);
  _saveTimer  = setInterval(savePlayer, 10000);

  updateHotbarUI();
  addLog("⛏️ Натисни ЛКМ — копати | ПКМ або E — будувати | 1-8 хотбар");
}

export function destroyMinePage() {
  cancelAnimationFrame(_loop);     _loop        = null;
  clearInterval(_saveTimer);       _saveTimer   = null;
  clearTimeout(_pushModTimer);     _pushModTimer= null;
  if (_unsubOthers) { _unsubOthers(); _unsubOthers = null; }
  if (_unsubWorld)  { _unsubWorld();  _unsubWorld  = null; }
  unbindInput();
  window.removeEventListener("resize", resizeCanvas);
  savePlayer();
  const uid = auth.currentUser?.uid;
  if (uid) deleteDoc(doc(db, "minePlayers", uid)).catch(()=>{});
}

function makePlayer(uid, name, x, y, hp) {
  return { uid, name, x, y, vx:0, vy:0, w:12, h:24, onGround:false, dir:1, mining:false, hp, maxHp:100 };
}

// ══════════════════════════════════════════
// HTML
// ══════════════════════════════════════════

function buildMineHTML() {
  const root = document.getElementById("mine-page-root");
  if (!root) return;
  root.innerHTML = `
    <div id="mine-wrap">
      <canvas id="mine-canvas"></canvas>

      <div id="mine-hud-tl">
        <div id="mine-hp-row">
          <span>❤️</span>
          <div class="mbar-track"><div id="mine-hp-bar" class="mbar-hp"></div></div>
          <span id="mine-hp-txt">100/100</span>
        </div>
        <div id="mine-res-row"></div>
      </div>

      <div id="mine-hud-tr" id="mine-online"></div>

      <div id="mine-hotbar"></div>

      <div id="mine-mode-btn" onclick="mineToggleMode()">⛏️ Копати</div>

      <div id="mine-touch-ctrl">
        <div class="mtbtn" ontouchstart="mineTouch('left',1)"  ontouchend="mineTouch('left',0)">◀</div>
        <div class="mtbtn" ontouchstart="mineTouch('jump',1)"  ontouchend="mineTouch('jump',0)">▲</div>
        <div class="mtbtn" ontouchstart="mineTouch('right',1)" ontouchend="mineTouch('right',0)">▶</div>
        <div class="mtbtn mtbtn-act" ontouchstart="mineTouch('mine',1)" ontouchend="mineTouch('mine',0)">⛏</div>
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
  _canvas.height = wrap.clientHeight || (window.innerHeight - 130);
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
    if (Math.random() < 0.055 && x > 5 && x < W_TILES - 5) {
      const h = 4 + Math.floor(Math.random() * 4);
      for (let i = 1; i <= h; i++) {
        if (surf - i >= 0) _world[(surf - i) * W_TILES + x] = T_WOOD;
      }
      for (let dx = -2; dx <= 2; dx++) {
        for (let dy = -3; dy <= 0; dy++) {
          const lx = x+dx, ly = surf-h+dy;
          if (lx>=0&&lx<W_TILES&&ly>=0&&ly<H_TILES && _world[ly*W_TILES+lx]===T_AIR)
            _world[ly*W_TILES+lx] = T_LEAF;
        }
      }
    }
  }

  carveCaves();
}

function makeHeightmap() {
  const map = [];
  let h = SKY_H + 8;
  for (let x = 0; x < W_TILES; x++) {
    h += (Math.random() - 0.5) * 2.5;
    h  = Math.max(SKY_H, Math.min(SKY_H + 22, h));
    map[x] = Math.round(h);
  }
  for (let pass = 0; pass < 4; pass++) {
    for (let x = 1; x < W_TILES - 1; x++) {
      map[x] = Math.round((map[x-1] + map[x]*2 + map[x+1]) / 4);
    }
  }
  return map;
}

function stoneLayerTile(x, y, surf) {
  const d = y - surf;
  if (d < 5) return T_DIRT;
  const r = Math.random();
  if (d > 20 && r < 0.018) return T_IRON;
  if (d > 35 && r < 0.010) return T_LEAD;
  if (d > 55 && r < 0.007) return T_GOLD;
  return T_STONE;
}

function deepLayerTile(x, y) {
  const r = Math.random();
  if (r < 0.009) return T_GOLD;
  if (r < 0.006) return T_URAN;
  if (r < 0.003) return T_DIAM;
  return T_STONE;
}

function coreLayerTile(x, y) {
  const r = Math.random();
  if (r < 0.011) return T_DIAM;
  if (r < 0.007) return T_NICUS;
  if (r < 0.004) return T_URAN;
  return T_STONE;
}

function carveCaves() {
  for (let w = 0; w < 250; w++) {
    let cx  = Math.floor(Math.random() * W_TILES);
    let cy  = (SKY_H + 12) + Math.floor(Math.random() * (H_TILES - SKY_H - 20));
    let ang = Math.random() * Math.PI * 2;
    const len = 25 + Math.floor(Math.random() * 90);
    const rad = 1 + Math.floor(Math.random() * 2);
    for (let i = 0; i < len; i++) {
      ang += (Math.random() - 0.5) * 0.85;
      cx = Math.round(cx + Math.cos(ang) * 2);
      cy = Math.round(cy + Math.sin(ang) * 1.3);
      for (let dx = -rad; dx <= rad; dx++) {
        for (let dy = -rad; dy <= rad; dy++) {
          if (dx*dx+dy*dy <= rad*rad) {
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

function isSolid(tx, ty) {
  const t = getTile(tx, ty);
  return t !== T_AIR && t !== T_WATER && t !== T_LEAF;
}

function getSurfaceY(tx) {
  if (!_world) return SKY_H;
  for (let y = 0; y < H_TILES; y++) {
    if (_world[y * W_TILES + tx] !== T_AIR) return y;
  }
  return SKY_H;
}

// ══════════════════════════════════════════
// FIRESTORE
// ══════════════════════════════════════════

function subscribeWorldMods() {
  _unsubWorld = onSnapshot(doc(db, "mineWorld", "main"), snap => {
    if (!snap.exists()) return;
    const mods = snap.data().mods || {};
    Object.assign(_worldMod, mods);
  });
}

function pushTileMod(tx, ty, id) {
  const key = tx + "," + ty;
  _worldMod[key] = id;
  clearTimeout(_pushModTimer);
  _pushModTimer = setTimeout(async () => {
    try {
      await updateDoc(doc(db, "mineWorld", "main"), { ["mods." + key]: id });
    } catch(e) {
      setDoc(doc(db, "mineWorld", "main"), { mods: _worldMod }, { merge: true });
    }
  }, 1500);
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

function subscribeOthers(myUid) {
  _unsubOthers = onSnapshot(collection(db, "minePlayers"), snap => {
    const now = Date.now();
    const ids  = [];
    snap.docs.forEach(d => {
      if (d.id === myUid) return;
      const data = d.data();
      if (now - (data.ts || 0) > 15000) { delete _others[d.id]; return; }
      _others[d.id] = data;
      ids.push(d.id);
    });
    Object.keys(_others).forEach(id => { if (!ids.includes(id)) delete _others[id]; });
    updateOnlineHUD();
  });
}

// ══════════════════════════════════════════
// ІГРОВИЙ ЦИКЛ
// ══════════════════════════════════════════

function gameLoop(ts) {
  _loop = requestAnimationFrame(gameLoop);
  const dt = Math.min((ts - _lastTs) / 16.67, 3);
  _lastTs = ts;
  _tick++;

  update(dt);
  render();

  _posPushMs += dt * 16.67;
  if (_posPushMs > 200) { _posPushMs = 0; pushPos(); }
}

// ══════════════════════════════════════════
// ФІЗИКА
// ══════════════════════════════════════════

function update(dt) {
  if (!_player) return;
  const p = _player;

  const goLeft  = _keys["ArrowLeft"]  || _keys["a"] || _keys["A"] || _touch.left;
  const goRight = _keys["ArrowRight"] || _keys["d"] || _keys["D"] || _touch.right;
  const doJump  = (_keys["ArrowUp"] || _keys["w"] || _keys["W"] || _keys[" "] || _touch.jump);
  const doAct   = _keys["Mouse0"] || _touch.mine;

  if (goLeft)       { p.vx = -MOVE_SPD; p.dir = -1; }
  else if (goRight) { p.vx =  MOVE_SPD; p.dir =  1; }
  else              { p.vx *= 0.72; }

  if (doJump && p.onGround) { p.vy = JUMP_V; p.onGround = false; }

  p.vy = Math.min(p.vy + GRAVITY * dt, 18);

  // Рух + колізія
  p.x += p.vx * dt;
  resolveX(p);
  p.y += p.vy * dt;
  p.onGround = false;
  resolveY(p);

  // Дія
  if (doAct) {
    if (_buildMode) doBuild();
    else            doMine(dt);
  } else {
    _mineTimer = 0;
    _mineTile  = null;
    p.mining   = false;
  }

  pickupDrops();
  updateParticles(dt);
  updateDrops(dt);

  // Камера
  _camTarget.x = p.x + p.w/2 - _canvas.width  / 2;
  _camTarget.y = p.y + p.h/2 - _canvas.height / 2;
  _camTarget.x = Math.max(0, Math.min(_camTarget.x, W_TILES * T - _canvas.width));
  _camTarget.y = Math.max(0, Math.min(_camTarget.y, H_TILES * T - _canvas.height));
  _cam.x += (_camTarget.x - _cam.x) * CAM_LERP * dt;
  _cam.y += (_camTarget.y - _cam.y) * CAM_LERP * dt;
}

function resolveX(p) {
  const left = Math.floor(p.x / T);
  const right= Math.floor((p.x + p.w - 1) / T);
  const top  = Math.floor(p.y / T);
  const bot  = Math.floor((p.y + p.h - 1) / T);
  for (let tx = left; tx <= right; tx++) {
    for (let ty = top; ty <= bot; ty++) {
      if (!isSolid(tx, ty)) continue;
      if (p.vx > 0) { p.x = tx * T - p.w; }
      else           { p.x = tx * T + T; }
      p.vx = 0;
    }
  }
}

function resolveY(p) {
  const left = Math.floor(p.x / T);
  const right= Math.floor((p.x + p.w - 1) / T);
  const top  = Math.floor(p.y / T);
  const bot  = Math.floor((p.y + p.h - 1) / T);
  for (let tx = left; tx <= right; tx++) {
    for (let ty = top; ty <= bot; ty++) {
      if (!isSolid(tx, ty)) continue;
      if (p.vy > 0) { p.y = ty * T - p.h; p.onGround = true; }
      else           { p.y = ty * T + T; }
      p.vy = 0;
    }
  }
}

// ══════════════════════════════════════════
// КОПАННЯ
// ══════════════════════════════════════════

function doMine(dt) {
  const p  = _player;
  const tx = Math.floor(_mouseWorld.x / T);
  const ty = Math.floor(_mouseWorld.y / T);
  const px = Math.floor((p.x + p.w/2) / T);
  const py = Math.floor((p.y + p.h/2) / T);

  if (Math.abs(tx-px) > 5 || Math.abs(ty-py) > 5) { _mineTimer=0; _mineTile=null; return; }

  const tile = getTile(tx, ty);
  if (tile===T_AIR||tile===T_WATER||tile===T_BEDROCK) { _mineTimer=0; _mineTile=null; return; }

  if (!_mineTile || _mineTile.tx!==tx || _mineTile.ty!==ty) {
    _mineTimer = 0;
    _mineTile  = { tx, ty };
  }

  _mineTimer += dt * 16.67;
  p.mining = true;

  if (_tick % 4 === 0) spawnParticle(tx*T+T/2, ty*T+T/2, TILE_COLOR[tile]||"#888");

  const hard = getTileHardness(tile);
  if (_mineTimer >= hard) {
    _worldMod[tx+","+ty] = T_AIR;
    pushTileMod(tx, ty, T_AIR);
    const res = DROP_RESOURCE[tile];
    if (res) { spawnDrop(tx*T+T/2, ty*T+T/2, res, 1); addLog("⛏ +1 " + (RES_ICON[res]||res)); }
    for (let i=0;i<8;i++) spawnParticle(tx*T+T/2, ty*T+T/2, TILE_COLOR[tile]||"#888");
    _mineTimer=0; _mineTile=null; p.mining=false;
  }
}

function getTileHardness(tile) {
  const h={
    [T_GRASS]:200,[T_DIRT]:200,[T_SAND]:150,
    [T_STONE]:600,[T_WOOD]:300,[T_LEAF]:80,
    [T_IRON]:800,[T_LEAD]:900,[T_GOLD]:950,
    [T_URAN]:1100,[T_DIAM]:1400,[T_NICUS]:1700,
  };
  return h[tile]||500;
}

// ══════════════════════════════════════════
// БУДІВНИЦТВО
// ══════════════════════════════════════════

function doBuild() {
  const p  = _player;
  const tx = Math.floor(_mouseWorld.x / T);
  const ty = Math.floor(_mouseWorld.y / T);
  const px = Math.floor((p.x + p.w/2) / T);
  const py = Math.floor((p.y + p.h/2) / T);

  if (Math.abs(tx-px)>5||Math.abs(ty-py)>5) return;
  if (getTile(tx,ty)!==T_AIR) return;
  // Не будуємо на собі
  if (tx===px&&(ty===py||ty===py-1)) return;

  const resName = _hotbar[_hotbarSel];
  if (!resName||!(_inventory[resName]>0)) return;

  const tileMap = { stone:T_STONE, dirt:T_DIRT, wood:T_WOOD, sand:T_SAND };
  const tile = tileMap[resName];
  if (!tile) return;

  _inventory[resName]--;
  if (!_inventory[resName]) delete _inventory[resName];
  _worldMod[tx+","+ty] = tile;
  pushTileMod(tx, ty, tile);
  for (let i=0;i<4;i++) spawnParticle(tx*T+T/2, ty*T+T/2, TILE_COLOR[tile]||"#888");
  updateHotbarUI();
}

// ══════════════════════════════════════════
// ДРОПИ
// ══════════════════════════════════════════

function spawnDrop(x, y, res, amt) {
  _drops.push({ x, y, vx:(Math.random()-.5)*2, vy:-3-Math.random()*2, res, amt, age:0 });
}

function updateDrops(dt) {
  _drops = _drops.filter(d => {
    d.vy += GRAVITY * dt * 0.7;
    d.x  += d.vx * dt;
    d.y  += d.vy * dt;
    const ty = Math.floor((d.y+6)/T);
    if (isSolid(Math.floor(d.x/T), ty)) { d.vy=0; d.vx*=0.7; d.y=ty*T-6; }
    d.age += dt*16.67;
    return d.age < 30000;
  });
}

function pickupDrops() {
  if (!_player) return;
  const p = _player;
  const cx = p.x+p.w/2, cy = p.y+p.h/2;
  _drops = _drops.filter(d => {
    const dist = Math.hypot(d.x-cx, d.y-cy);
    if (dist < 28) {
      _inventory[d.res] = (_inventory[d.res]||0) + d.amt;
      spawnParticle(cx, p.y, "#f5b100");
      updateHotbarUI();
      return false;
    }
    return true;
  });
}

// ══════════════════════════════════════════
// ЧАСТИНКИ
// ══════════════════════════════════════════

function spawnParticle(x, y, color) {
  _particles.push({
    x, y,
    vx:(Math.random()-.5)*4,
    vy:-1-Math.random()*3,
    life:1.0, color,
    sz: 1.5+Math.random()*2,
  });
}

function updateParticles(dt) {
  _particles = _particles.filter(p => {
    p.x += p.vx*dt; p.y += p.vy*dt;
    p.vy += 0.15*dt;
    p.life -= 0.045*dt;
    return p.life > 0;
  });
  if (_particles.length > 400) _particles.length = 200;
}

// ══════════════════════════════════════════
// РЕНДЕР
// ══════════════════════════════════════════

function render() {
  if (!_ctx || !_canvas || !_world) return;
  const ctx=_ctx, W=_canvas.width, H=_canvas.height;

  // Небо
  const depthFrac = Math.max(0, Math.min(1, _cam.y / (DEEP_TOP * T)));
  const g = ctx.createLinearGradient(0,0,0,H);
  g.addColorStop(0, lerpRGB(135,206,235, 10,10,42, depthFrac));
  g.addColorStop(1, lerpRGB(74,159,200,  5,5,26,  depthFrac));
  ctx.fillStyle = g;
  ctx.fillRect(0,0,W,H);

  ctx.save();
  ctx.translate(-Math.floor(_cam.x), -Math.floor(_cam.y));

  drawVisibleTiles(ctx, W, H);
  drawDrops(ctx);
  drawParticles(ctx);
  drawOtherPlayers(ctx);
  drawSelf(ctx);
  drawMineProgress(ctx);
  drawCursorTile(ctx);

  ctx.restore();

  updateHpHUD();
  updateResHUD();
}

function drawVisibleTiles(ctx, W, H) {
  const cx = Math.floor(_cam.x), cy = Math.floor(_cam.y);
  const sx = Math.max(0, Math.floor(cx/T)-1);
  const sy = Math.max(0, Math.floor(cy/T)-1);
  const ex = Math.min(W_TILES-1, sx+Math.ceil(W/T)+2);
  const ey = Math.min(H_TILES-1, sy+Math.ceil(H/T)+2);

  for (let ty=sy; ty<=ey; ty++) {
    for (let tx=sx; tx<=ex; tx++) {
      const tile = getTile(tx,ty);
      if (tile===T_AIR) continue;
      const color = TILE_COLOR[tile];
      if (!color) continue;
      const px=tx*T, py=ty*T;
      ctx.fillStyle = color;
      ctx.fillRect(px, py, T, T);
      // Тонка обводка
      if (tile!==T_WATER) {
        ctx.fillStyle="rgba(0,0,0,0.12)";
        ctx.fillRect(px, py+T-1, T, 1);
        ctx.fillRect(px+T-1, py, 1, T);
      }
      // Блиск руд
      if (tile>=T_IRON && tile<=T_NICUS) {
        ctx.fillStyle="rgba(255,255,255,0.22)";
        ctx.fillRect(px+2,py+2,3,3);
        ctx.fillRect(px+T-5,py+T-5,2,2);
      }
    }
  }
}

function drawSelf(ctx) {
  if (!_player) return;
  const p=_player;
  drawStickman(ctx, p.x, p.y, p.w, p.h, p.name, p.hp/p.maxHp, p.dir, p.mining, "#e8f4f8");
}

function drawOtherPlayers(ctx) {
  Object.values(_others).forEach(o => {
    drawStickman(ctx, o.x, o.y, 12, 24, o.name||"?", 1, o.dir||1, o.mining||false, "#ffbb44");
  });
}

function drawStickman(ctx, x, y, w, h, name, hpFrac, dir, mining, color) {
  ctx.save();
  const cx  = x+w/2;
  const hy  = y+5;          // центр голови
  const bTop= y+10;
  const bBot= y+h-6;

  // HP
  ctx.fillStyle="rgba(0,0,0,0.5)";
  ctx.fillRect(cx-14, y-16, 28, 5);
  ctx.fillStyle=hpFrac>0.5?"#5ecb3e":hpFrac>0.25?"#f5b100":"#e0203a";
  ctx.fillRect(cx-14, y-16, 28*Math.max(0,hpFrac), 5);

  // Нікнейм
  ctx.fillStyle=color; ctx.font="bold 8px sans-serif"; ctx.textAlign="center";
  ctx.fillText(name.slice(0,14), cx, y-19);

  ctx.strokeStyle=color; ctx.lineWidth=2; ctx.lineCap="round";

  // Голова
  ctx.beginPath(); ctx.arc(cx, hy, 5, 0, Math.PI*2); ctx.stroke();

  // Тіло
  ctx.beginPath(); ctx.moveTo(cx,bTop); ctx.lineTo(cx,bBot); ctx.stroke();

  // Ноги
  const la = Math.sin(_tick*0.18)*8;
  ctx.beginPath();
  ctx.moveTo(cx,bBot); ctx.lineTo(cx-5, bBot+8+la); ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(cx,bBot); ctx.lineTo(cx+5, bBot+8-la); ctx.stroke();

  // Руки + кирка
  const armY=bTop+4;
  if (mining) {
    const sw=Math.sin(_tick*0.28)*18;
    ctx.beginPath(); ctx.moveTo(cx,armY); ctx.lineTo(cx+dir*11, armY+sw); ctx.stroke();
    ctx.strokeStyle="#f5b100"; ctx.lineWidth=2.5;
    ctx.beginPath(); ctx.moveTo(cx+dir*9,armY+sw-2); ctx.lineTo(cx+dir*17,armY+sw+7); ctx.stroke();
  } else {
    ctx.beginPath(); ctx.moveTo(cx,armY); ctx.lineTo(cx-7,armY+6); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(cx,armY); ctx.lineTo(cx+7,armY+6); ctx.stroke();
  }
  ctx.restore();
}

function drawMineProgress(ctx) {
  if (!_mineTile||_mineTimer<=0) return;
  const {tx,ty}=_mineTile;
  const tile=getTile(tx,ty);
  const pct=Math.min(1,_mineTimer/getTileHardness(tile));
  const px=tx*T, py=ty*T;
  // Накладка
  ctx.fillStyle=`rgba(0,0,0,${pct*0.45})`;
  ctx.fillRect(px,py,T,T);
  // Прогрес-бар
  ctx.fillStyle="rgba(0,0,0,0.5)";
  ctx.fillRect(px,py+T-4,T,4);
  ctx.fillStyle="#f5b100";
  ctx.fillRect(px,py+T-4,T*pct,4);
}

function drawDrops(ctx) {
  ctx.font="11px sans-serif"; ctx.textAlign="center";
  _drops.forEach(d => {
    const bob=Math.sin(_tick*0.15+d.x*0.01)*2;
    ctx.fillText(RES_ICON[d.res]||"•", d.x, d.y+bob);
  });
}

function drawParticles(ctx) {
  _particles.forEach(p => {
    ctx.save();
    ctx.globalAlpha=p.life;
    ctx.fillStyle=p.color;
    ctx.fillRect(p.x-p.sz/2,p.y-p.sz/2,p.sz,p.sz);
    ctx.restore();
  });
}

function drawCursorTile(ctx) {
  if (!_player) return;
  const tx=Math.floor(_mouseWorld.x/T), ty=Math.floor(_mouseWorld.y/T);
  const px=Math.floor((_player.x+_player.w/2)/T);
  const py=Math.floor((_player.y+_player.h/2)/T);
  if (Math.abs(tx-px)>5||Math.abs(ty-py)>5) return;
  ctx.strokeStyle=_buildMode?"rgba(80,180,255,0.85)":"rgba(255,200,80,0.85)";
  ctx.lineWidth=1.5;
  ctx.setLineDash([3,3]);
  ctx.strokeRect(tx*T+1,ty*T+1,T-2,T-2);
  ctx.setLineDash([]);
}

// ══════════════════════════════════════════
// HUD
// ══════════════════════════════════════════

function updateHpHUD() {
  const bar=document.getElementById("mine-hp-bar");
  const txt=document.getElementById("mine-hp-txt");
  if (!bar||!_player) return;
  bar.style.width=(_player.hp/_player.maxHp*100)+"%";
  if (txt) txt.textContent=_player.hp+"/"+_player.maxHp;
}

function updateResHUD() {
  const el=document.getElementById("mine-res-row");
  if (!el) return;
  const entries=Object.entries(_inventory).filter(([,v])=>v>0);
  el.innerHTML=entries.slice(0,8).map(([k,v])=>
    `<span class="mres-pill">${RES_ICON[k]||k} ${v}</span>`
  ).join("");
}

function updateOnlineHUD() {
  const el=document.getElementById("mine-hud-tr");
  if (!el) return;
  const names=Object.values(_others).map(o=>o.name||"?");
  el.innerHTML=`<span class="mhud-online">${names.length?"👥 "+names.join(", "):"👁 Лише ти"}</span>`;
}

function updateHotbarUI() {
  const el=document.getElementById("mine-hotbar");
  if (!el) return;
  el.innerHTML=_hotbar.map((res,i)=>{
    const cnt=res?(_inventory[res]||0):0;
    const sel=i===_hotbarSel;
    return `<div class="mhb${sel?" mhb-sel":""}" onclick="mineHotbarSel(${i})">
      <div class="mhb-ico">${res?(RES_ICON[res]||res):""}</div>
      ${cnt>0?`<div class="mhb-cnt">${cnt}</div>`:""}
      <div class="mhb-n">${i+1}</div>
    </div>`;
  }).join("");
}

function addLog(msg) {
  const el=document.getElementById("mine-log");
  if (!el) return;
  const d=document.createElement("div");
  d.className="mlog-row";
  d.textContent=msg;
  el.prepend(d);
  setTimeout(()=>d.remove(), 4000);
}

// ══════════════════════════════════════════
// ВВІД
// ══════════════════════════════════════════

const _kd=(e)=>{ _keys[e.key]=true; if(e.key>="1"&&e.key<="8"){_hotbarSel=+e.key-1;updateHotbarUI();} if(e.key==="e"||e.key==="E")mineToggleMode(); if(e.key===" ")e.preventDefault(); };
const _ku=(e)=>{ delete _keys[e.key]; };
const _mm=(e)=>{ if(!_canvas)return; const r=_canvas.getBoundingClientRect(); _mouseWorld.x=(e.clientX-r.left)+_cam.x; _mouseWorld.y=(e.clientY-r.top)+_cam.y; };
const _md=(e)=>{ if(e.button===0)_keys["Mouse0"]=true; if(e.button===2){_buildMode=!_buildMode;updateModeBtn();} };
const _mu=(e)=>{ if(e.button===0)delete _keys["Mouse0"]; };
const _cx=(e)=>e.preventDefault();
const _wh=(e)=>{ _hotbarSel=((_hotbarSel+(e.deltaY>0?1:-1))+8)%8; updateHotbarUI(); };
const _tm=(e)=>{ if(!_canvas||!_player)return; const r=_canvas.getBoundingClientRect(),t=e.touches[0]; if(!t)return; _mouseWorld.x=(t.clientX-r.left)+_cam.x; _mouseWorld.y=(t.clientY-r.top)+_cam.y; };

function bindInput() {
  window.addEventListener("keydown",_kd);
  window.addEventListener("keyup",_ku);
  _canvas?.addEventListener("mousemove",_mm);
  _canvas?.addEventListener("mousedown",_md);
  _canvas?.addEventListener("mouseup",_mu);
  _canvas?.addEventListener("contextmenu",_cx);
  _canvas?.addEventListener("wheel",_wh,{passive:true});
  _canvas?.addEventListener("touchmove",_tm,{passive:true});
  _canvas?.addEventListener("touchstart",_tm,{passive:true});
}

function unbindInput() {
  window.removeEventListener("keydown",_kd);
  window.removeEventListener("keyup",_ku);
  _canvas?.removeEventListener("mousemove",_mm);
  _canvas?.removeEventListener("mousedown",_md);
  _canvas?.removeEventListener("mouseup",_mu);
  _canvas?.removeEventListener("contextmenu",_cx);
  _canvas?.removeEventListener("wheel",_wh);
  _canvas?.removeEventListener("touchmove",_tm);
  _canvas?.removeEventListener("touchstart",_tm);
}

// ══════════════════════════════════════════
// ГЛОБАЛЬНІ
// ══════════════════════════════════════════

window.mineTouch      = (btn,v) => { _touch[btn]=!!v; };
window.mineToggleMode = ()      => { _buildMode=!_buildMode; updateModeBtn(); };
window.mineHotbarSel  = (i)     => { _hotbarSel=i; updateHotbarUI(); };

function updateModeBtn() {
  const el=document.getElementById("mine-mode-btn");
  if (!el) return;
  el.textContent=_buildMode?"🧱 Будувати":"⛏️ Копати";
  el.style.background=_buildMode?"rgba(40,120,255,0.72)":"rgba(240,125,40,0.72)";
}

// ══════════════════════════════════════════
// УТИЛІТИ
// ══════════════════════════════════════════

function lerpRGB(r1,g1,b1,r2,g2,b2,t) {
  return `rgb(${Math.round(r1+(r2-r1)*t)},${Math.round(g1+(g2-g1)*t)},${Math.round(b1+(b2-b1)*t)})`;
}

// ══════════════════════════════════════════
// CSS
// ══════════════════════════════════════════

function injectMineStyles() {
  if (document.getElementById("mine-styles")) return;
  const s=document.createElement("style"); s.id="mine-styles";
  s.textContent=`
    #mine-page-root { padding:0!important; }
    #mine-wrap {
      position:relative; width:100%;
      height:calc(100vh - 130px); min-height:320px;
      overflow:hidden; background:#08080f;
      touch-action:none; user-select:none; -webkit-user-select:none;
    }
    #mine-canvas {
      display:block; width:100%; height:100%;
      image-rendering:pixelated; cursor:crosshair;
    }
    /* HUD верх-ліво */
    #mine-hud-tl {
      position:absolute; top:8px; left:8px; z-index:10;
      display:flex; flex-direction:column; gap:5px; pointer-events:none;
    }
    #mine-hp-row {
      display:flex; align-items:center; gap:5px;
      background:rgba(0,0,0,0.52); border-radius:8px; padding:4px 8px;
    }
    .mbar-track { width:80px; height:7px; background:rgba(255,255,255,0.1); border-radius:4px; overflow:hidden; }
    .mbar-hp { height:100%; background:linear-gradient(90deg,#e0203a,#f07d28); border-radius:4px; transition:width .25s; }
    #mine-hp-txt { font-size:11px; font-weight:700; color:#fff; }
    #mine-res-row { display:flex; flex-wrap:wrap; gap:4px; }
    .mres-pill { background:rgba(0,0,0,0.52); border-radius:6px; padding:2px 7px; font-size:12px; font-weight:700; color:#fff; }
    /* HUD верх-право */
    #mine-hud-tr {
      position:absolute; top:8px; right:8px; z-index:10; pointer-events:none;
    }
    .mhud-online { display:block; background:rgba(0,0,0,0.52); border-radius:8px; padding:4px 10px; font-size:12px; font-weight:700; color:#aaeeff; }
    /* Хотбар */
    #mine-hotbar {
      position:absolute; bottom:8px; left:50%; transform:translateX(-50%);
      display:flex; gap:3px; z-index:10;
    }
    .mhb {
      width:36px; height:36px; background:rgba(0,0,0,0.58);
      border:2px solid rgba(255,255,255,0.14); border-radius:6px;
      display:flex; flex-direction:column; align-items:center; justify-content:center;
      cursor:pointer; position:relative; transition:border-color .12s;
    }
    .mhb.mhb-sel { border-color:#f5b100; background:rgba(245,177,0,0.2); box-shadow:0 0 8px rgba(245,177,0,0.45); }
    .mhb-ico { font-size:15px; line-height:1; }
    .mhb-cnt { position:absolute; bottom:1px; right:2px; font-size:8px; font-weight:800; color:#fff; }
    .mhb-n   { position:absolute; top:1px; left:3px; font-size:7px; color:rgba(255,255,255,0.35); }
    /* Режим */
    #mine-mode-btn {
      position:absolute; bottom:52px; left:50%; transform:translateX(-50%);
      background:rgba(240,125,40,0.72); color:#fff; font-size:12px; font-weight:700;
      padding:5px 14px; border-radius:20px; cursor:pointer; z-index:10;
      border:1px solid rgba(255,255,255,0.18); transition:background .2s;
    }
    /* Тач */
    #mine-touch-ctrl {
      position:absolute; bottom:8px; left:8px; z-index:20;
      display:flex; gap:5px;
    }
    @media (min-width:700px){ #mine-touch-ctrl{ display:none; } }
    .mtbtn {
      width:50px; height:50px; background:rgba(255,255,255,0.1);
      border:2px solid rgba(255,255,255,0.22); border-radius:50%;
      display:flex; align-items:center; justify-content:center;
      font-size:18px; color:#fff; font-weight:700; cursor:pointer;
      -webkit-tap-highlight-color:transparent; touch-action:none;
    }
    .mtbtn-act { background:rgba(240,125,40,0.22); border-color:rgba(240,125,40,0.5); }
    /* Лог */
    #mine-log {
      position:absolute; top:8px; left:50%; transform:translateX(-50%);
      z-index:10; pointer-events:none;
      display:flex; flex-direction:column; align-items:center; gap:2px;
      min-width:180px;
    }
    .mlog-row {
      background:rgba(0,0,0,0.55); color:#e8f4f8;
      font-size:11px; font-weight:600; padding:2px 12px; border-radius:10px;
      animation:mlogFade 4s forwards;
    }
    @keyframes mlogFade{ 0%{opacity:1;transform:translateY(0)} 75%{opacity:1} 100%{opacity:0;transform:translateY(-10px)} }
  `;
  document.head.appendChild(s);
}