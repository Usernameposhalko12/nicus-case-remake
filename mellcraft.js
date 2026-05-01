// ============================================
// МЕЛЛСТРОЙ КРАФТ — mellcraft.js
// ============================================

import { db } from "./firebase.js";
import {
  doc, getDoc, updateDoc, setDoc, onSnapshot, runTransaction
} from "https://www.gstatic.com/firebasejs/10.7.0/firebase-firestore.js";

// ── КОНСТАНТИ ────────────────────────────────

export const MELLCRAFT_MELL_ITEMS = [
  "item_a_haha","item_a_fog","item_a_uu","item_a_11what",
  "item_a_dorime","item_a_7class","item_a_hlop","item_a_red",
  "item_a_relax","item_a_fpv","item_a_artur","item_a_bem",
];

// МеллКоінс за крафт залежно від рідкості + преміум
export const MELL_CRAFT_COINS = {
  common:      { base: 5,  premium: 8  },
  exceptional: { base: 10, premium: 15 },
  epic:        { base: 18, premium: 25 },
  legendary:   { base: 30, premium: 40 },
  secret:      { base: 45, premium: 50 }, // max 50
  special:     { base: 50, premium: 50 },
};

// МеллХП за крафт (фіксовано)
export const MELL_CRAFT_HP = 10;

// Глобальні рівні МеллХП → нагорода
export const MELL_HP_REWARDS = [
  { hp: 0,    reward: { type: "case", caseId: "mellstroy", label: "МеллстройКолекція" } },
  { hp: 100,  reward: { type: "case", caseId: "mellstroy", label: "МеллстройКолекція" } },
  { hp: 200,  reward: { type: "case", caseId: "mellstroy", label: "МеллстройКолекція" } },
  { hp: 300,  reward: { type: "case", caseId: "mellstroy", label: "МеллстройКолекція" } },
  { hp: 400,  reward: { type: "case", caseId: "mellstroy", label: "МеллстройКолекція" } },
  { hp: 500,  reward: { type: "case+coins", caseId: "mellstroy", coins: 100, label: "МеллстройКолекція + 100 МеллКоінс" } },
  { hp: 600,  reward: { type: "case", caseId: "mellstroy", label: "МеллстройКолекція" } },
  { hp: 700,  reward: { type: "case", caseId: "mellstroy", label: "МеллстройКолекція" } },
  { hp: 800,  reward: { type: "case", caseId: "mellstroy", label: "МеллстройКолекція" } },
  { hp: 900,  reward: { type: "case+coins", caseId: "mellstroy", coins: 100, label: "МеллстройКолекція + 100 МеллКоінс" } },
  { hp: 1000, reward: { type: "medal", medalId: "medal_mellcraft_2026", label: "🏅 Медаль «МеллстройКрафт 2026»" } },
];

// Спін (100 МеллКоінс)
export const MELL_SPIN_COST = 100;

export const MELL_SPIN_TABLE = [
  // { rarity/type, weight, label }
  { type: "item", rarity: "special",   itemId: "item_a_artur",    weight: 2,  label: "ПривітАртур (Спеціальна)" },
  { type: "item", rarity: "special",   itemId: "item_a_bem",      weight: 2,  label: "Бем-Бем (Спеціальна)" },
  { type: "item", rarity: "secret",    itemId: "item_a_relax",    weight: 4,  label: "ЛовиРелакс (Секретна)" },
  { type: "item", rarity: "secret",    itemId: "item_a_fpv",      weight: 4,  label: "ФПВДРУН (Секретна)" },
  { type: "item", rarity: "legendary", itemId: "item_a_hlop",     weight: 10, label: "Аплодуємо (Легендарна)" },
  { type: "item", rarity: "legendary", itemId: "item_a_red",      weight: 10, label: "ЯВжеЧервоний (Легендарна)" },
  { type: "case", caseId: "mellstroy",                             weight: 70, label: "Кейс МеллстройКолекція" },
];

// ── FIRESTORE ────────────────────────────────

const GLOBAL_REF = () => doc(db, "globalData", "mellcraft");

export async function getMellCraftGlobal() {
  const snap = await getDoc(GLOBAL_REF());
  if (!snap.exists()) return { totalHp: 0, claimedLevels: [] };
  return snap.data();
}

export async function subscribeGlobalMellHP(callback) {
  return onSnapshot(GLOBAL_REF(), snap => {
    if (!snap.exists()) callback({ totalHp: 0, claimedLevels: [] });
    else callback(snap.data());
  });
}

// Додає МеллХП глобально + нараховує МеллКоінс + перевіряє глобальні нагороди
export async function submitMellCraft(uid, username, craftedItem, gameState) {
  const rarity  = craftedItem.rarity || "common";
  const premium = !!craftedItem.premium;
  const coinsEarned = Math.min(50, (MELL_CRAFT_COINS[rarity] || MELL_CRAFT_COINS.common)[premium ? "premium" : "base"]);

  let globalRewardToGive = null;

  await runTransaction(db, async (tx) => {
    const globalSnap = await tx.get(GLOBAL_REF());
    const globalData = globalSnap.exists()
      ? globalSnap.data()
      : { totalHp: 0, claimedLevels: [] };

    const prevHp = globalData.totalHp || 0;
    const newHp  = prevHp + MELL_CRAFT_HP;
    const claimed = [...(globalData.claimedLevels || [])];

    // Перевіряємо чи перетнули рівень
    for (const milestone of MELL_HP_REWARDS) {
      if (milestone.hp > 0 && prevHp < milestone.hp && newHp >= milestone.hp) {
        if (!claimed.includes(milestone.hp)) {
          claimed.push(milestone.hp);
          globalRewardToGive = milestone.reward;
        }
      }
    }

    // Оновлюємо профіль юзера: mellCoins + mellHpContrib
    const userRef  = doc(db, "users", uid);
    const userSnap = await tx.get(userRef);
    if (!userSnap.exists()) throw new Error("Профіль не знайдено!");
    const uData     = userSnap.data();
    const newCoins  = (uData.mellCoins || 0) + coinsEarned;
    const newContrib = (uData.mellHpContrib || 0) + MELL_CRAFT_HP;

    tx.update(userRef, { mellCoins: newCoins, mellHpContrib: newContrib });

    if (globalSnap.exists()) {
      tx.update(GLOBAL_REF(), { totalHp: newHp, claimedLevels: claimed });
    } else {
      tx.set(GLOBAL_REF(), { totalHp: newHp, claimedLevels: claimed });
    }
  });

  // Повертаємо результат для UI
  return { coinsEarned, globalRewardToGive };
}

// Спін колеса

export async function doMellSpin(uid, gameState, username) {
  if ((gameState.mellCoins || 0) < MELL_SPIN_COST) {
    throw new Error("Недостатньо МеллКоінс! Потрібно " + MELL_SPIN_COST);
  }

  const total = MELL_SPIN_TABLE.reduce((s, x) => s + x.weight, 0);
  let r = Math.random() * total;
  let prize = MELL_SPIN_TABLE[MELL_SPIN_TABLE.length - 1];
  for (const entry of MELL_SPIN_TABLE) {
    r -= entry.weight;
    if (r <= 0) { prize = entry; break; }
  }

  await runTransaction(db, async (tx) => {
    const userRef  = doc(db, "users", uid);
    const userSnap = await tx.get(userRef);
    if (!userSnap.exists()) throw new Error("Профіль не знайдено!");
    const uData = userSnap.data();
    if ((uData.mellCoins || 0) < MELL_SPIN_COST) throw new Error("Недостатньо МеллКоінс!");

    const inv = [...(uData.inventory || [])];
    // username передається зовні — гарантовано правильний
    const prizeItem = buildPrizeItem(prize, username || uData.username || "?");
    inv.push(prizeItem);

    tx.update(userRef, {
      mellCoins: (uData.mellCoins || 0) - MELL_SPIN_COST,
      inventory: inv,
    });
  });

  return prize;
}

function buildPrizeItem(prize, username) {
  const id = "mc_" + Math.random().toString(36).slice(2) + Date.now().toString(36);
  if (prize.type === "case") {
    return {
      id, type: "case", caseId: prize.caseId,
      name: "МеллстройКолекція", img: "img/cases/mellstroy.png",
      fromCaseName: "МеллКрафт Спін", source: "mellspin",
      obtainedBy: username || "?",
      obtainedAt: Date.now(),
    };
  }
  const MELL_ITEMS_MAP = {
    item_a_artur: { name: "ПривітАртур",    img: "img/items/m11.png", rarity: "special"   },
    item_a_bem:   { name: "Бем-Бем",        img: "img/items/m12.png", rarity: "special"   },
    item_a_relax: { name: "ЛовиРелакс",     img: "img/items/m9.png",  rarity: "secret"    },
    item_a_fpv:   { name: "ФПВДРУН",        img: "img/items/m10.png", rarity: "secret"    },
    item_a_hlop:  { name: "Аплодуємо",      img: "img/items/m7.png",  rarity: "legendary" },
    item_a_red:   { name: "ЯВжеЧервоний",   img: "img/items/m8.png",  rarity: "legendary" },
  };
  const meta = MELL_ITEMS_MAP[prize.itemId] || { name: "Предмет", img: "img/items/placeholder.png", rarity: "common" };
  return {
    id, type: "item", itemId: prize.itemId,
    name: meta.name, img: meta.img, rarity: meta.rarity,
    collection: "mellstroy",
    quality: "Прямо з цеху", premium: false,
    fromCase: "mellspin", fromCaseName: "МеллКрафт Спін",
    source: "mellspin",
    obtainedBy: username || "?",
    obtainedAt: Date.now(),
  };
}

// Адмін: скидання глобального МеллХП
export async function adminResetMellHP() {
  await setDoc(GLOBAL_REF(), { totalHp: 0, claimedLevels: [] });
}

// Адмін: скидання МеллКоінс гравця
export async function adminResetMellCoins(uid) {
  await updateDoc(doc(db, "users", uid), { mellCoins: 0, mellHpContrib: 0 });
}
