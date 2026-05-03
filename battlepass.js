// ============================================
// ЛІТНІЙ БАТЛПАС — battlepass.js
// NKR · SummerHeat 2026
// ============================================

import { db } from "./firebase.js";
import {
  doc, getDoc, updateDoc, setDoc, onSnapshot, runTransaction, collection, getDocs
} from "https://www.gstatic.com/firebasejs/10.7.0/firebase-firestore.js";

// ── КОНСТАНТИ ────────────────────────────────

export const BP_MAX_LEVEL  = 50;
export const BP_LBK_PER_TASK_BASE = 100; // базові ЛБК за завдання

// Скільки ЛБК потрібно на рівень
export const BP_LBK_PER_LEVEL = 1000;

// Колесо фартуни кожні N рівнів
export const BP_WHEEL_EVERY = 10;

// Вартість Прайму (нікуси)
export const BP_PRIME_COST = 500;

// ID поточного сезону (зміни при новому сезоні)
export const BP_SEASON_ID = "summerheat2026";

// ── НАГОРОДИ ЗВИЧАЙНОГО ТРЕКУ (50 рівнів) ──

// ── НАГОРОДИ ЗВИЧАЙНОГО ТРЕКУ (50 рівнів) — БЕЗ ЛБК ──
export const BP_NORMAL_REWARDS = [
  { level: 1,  type: "case", caseId: "summer26box",  label: "Літо26 Бокс" },
  { level: 2,  type: "case", caseId: "summer26box",  label: "Літо26 Бокс" },
  { level: 3,  type: "case", caseId: "summer26box",  label: "Літо26 Бокс" },
  { level: 4,  type: "case", caseId: "summer26box",  label: "Літо26 Бокс" },
  { level: 5,  type: "case", caseId: "summer26",     label: "Літо26" },
  { level: 6,  type: "case", caseId: "summer26box",  label: "Літо26 Бокс" },
  { level: 7,  type: "case", caseId: "summer26",     label: "Літо26" },
  { level: 8,  type: "case", caseId: "summer26box",  label: "Літо26 Бокс" },
  { level: 9,  type: "case", caseId: "summer26",     label: "Літо26" },
  { level: 10, type: "wheel",                         label: "🎡 Колесо!" },

  { level: 11, type: "case", caseId: "summer26",     label: "Літо26" },
  { level: 12, type: "case", caseId: "summer26",     label: "Літо26" },
  { level: 13, type: "case", caseId: "summer26box",  label: "Літо26 Бокс" },
  { level: 14, type: "case", caseId: "summer26",     label: "Літо26" },
  { level: 15, type: "case", caseId: "summerheat",   label: "ЛітняСпека" },
  { level: 16, type: "case", caseId: "summer26",     label: "Літо26" },
  { level: 17, type: "case", caseId: "summer26box",  label: "Літо26 Бокс" },
  { level: 18, type: "case", caseId: "summerheat",   label: "ЛітняСпека" },
  { level: 19, type: "case", caseId: "summer26",     label: "Літо26" },
  { level: 20, type: "wheel",                         label: "🎡 Колесо!" },

  { level: 21, type: "case", caseId: "summerheat",   label: "ЛітняСпека" },
  { level: 22, type: "case", caseId: "summer26",     label: "Літо26" },
  { level: 23, type: "case", caseId: "summerheat",   label: "ЛітняСпека" },
  { level: 24, type: "case", caseId: "summer26",     label: "Літо26" },
  { level: 25, type: "case", caseId: "summerheat",   label: "ЛітняСпека" },
  { level: 26, type: "case", caseId: "mellstroy",    label: "МеллстройКолекція" },
  { level: 27, type: "case", caseId: "summerheat",   label: "ЛітняСпека" },
  { level: 28, type: "case", caseId: "summer26",     label: "Літо26" },
  { level: 29, type: "case", caseId: "summerheat",   label: "ЛітняСпека" },
  { level: 30, type: "wheel",                         label: "🎡 Колесо!" },

  { level: 31, type: "case", caseId: "summerheat",   label: "ЛітняСпека" },
  { level: 32, type: "case", caseId: "mellstroy",    label: "МеллстройКолекція" },
  { level: 33, type: "case", caseId: "summerheat",   label: "ЛітняСпека" },
  { level: 34, type: "case", caseId: "mellstroy",    label: "МеллстройКолекція" },
  { level: 35, type: "case", caseId: "summergift26", label: "Літній Дар" },
  { level: 36, type: "case", caseId: "summerheat",   label: "ЛітняСпека" },
  { level: 37, type: "case", caseId: "summergift26", label: "Літній Дар" },
  { level: 38, type: "case", caseId: "mellstroy",    label: "МеллстройКолекція" },
  { level: 39, type: "case", caseId: "summerheat",   label: "ЛітняСпека" },
  { level: 40, type: "wheel",                         label: "🎡 Колесо!" },

  { level: 41, type: "case", caseId: "summergift26", label: "Літній Дар" },
  { level: 42, type: "case", caseId: "mellstroy",    label: "МеллстройКолекція" },
  { level: 43, type: "case", caseId: "summergift26", label: "Літній Дар" },
  { level: 44, type: "case", caseId: "summergift26", label: "Літній Дар" },
  { level: 45, type: "case", caseId: "mellstroy",    label: "МеллстройКолекція" },
  { level: 46, type: "case", caseId: "summergift26", label: "Літній Дар" },
  { level: 47, type: "case", caseId: "mellstroy",    label: "МеллстройКолекція" },
  { level: 48, type: "case", caseId: "summergift26", label: "Літній Дар" },
  { level: 49, type: "case", caseId: "summergift26", label: "Літній Дар" },
{ level: 50, type: "medal", medalId: "medal_bp_summerheat2026",
  name: "Медаль «За проходження Батлпасу SummerHeat 2026»",
  img: "img/items/medal_bp_summerheat2026.png",   // ← своя картинка
  label: "🏅 Медаль BattlePass" },

];

export const BP_PRIME_REWARDS = [
  { level: 1,  type: "case", caseId: "summer26",     label: "Літо26" },
  { level: 2,  type: "case", caseId: "summer26",     label: "Літо26" },
  { level: 3,  type: "case", caseId: "summer26",     label: "Літо26" },
  { level: 4,  type: "case", caseId: "summerheat",   label: "ЛітняСпека" },
  { level: 5,  type: "case", caseId: "summer26",     label: "Літо26" },
  { level: 6,  type: "case", caseId: "summerheat",   label: "ЛітняСпека" },
  { level: 7,  type: "case", caseId: "summer26",     label: "Літо26" },
  { level: 8,  type: "case", caseId: "summerheat",   label: "ЛітняСпека" },
  { level: 9,  type: "case", caseId: "summerheat",   label: "ЛітняСпека" },
  { level: 10, type: "case", caseId: "mellstroy",    label: "МеллстройКолекція" },

  { level: 11, type: "case", caseId: "mellstroy",    label: "МеллстройКолекція" },
  { level: 12, type: "case", caseId: "summerheat",   label: "ЛітняСпека" },
  { level: 13, type: "case", caseId: "mellstroy",    label: "МеллстройКолекція" },
  { level: 14, type: "case", caseId: "summergift26", label: "Літній Дар" },
  { level: 15, type: "case", caseId: "summerheat",   label: "ЛітняСпека" },
  { level: 16, type: "case", caseId: "mellstroy",    label: "МеллстройКолекція" },
  { level: 17, type: "case", caseId: "summergift26", label: "Літній Дар" },
  { level: 18, type: "case", caseId: "mellstroy",    label: "МеллстройКолекція" },
  { level: 19, type: "case", caseId: "summergift26", label: "Літній Дар" },
  { level: 20, type: "case", caseId: "summergift26", label: "Літній Дар" },

  { level: 21, type: "case", caseId: "mellstroy",    label: "МеллстройКолекція" },
  { level: 22, type: "case", caseId: "summergift26", label: "Літній Дар" },
  { level: 23, type: "case", caseId: "mellstroy",    label: "МеллстройКолекція" },
  { level: 24, type: "case", caseId: "summergift26", label: "Літній Дар" },
  { level: 25, type: "case", caseId: "summergift26", label: "Літній Дар" },
  { level: 26, type: "case", caseId: "mellstroy",    label: "МеллстройКолекція" },
  { level: 27, type: "case", caseId: "summergift26", label: "Літній Дар" },
  { level: 28, type: "case", caseId: "summergift26", label: "Літній Дар" },
  { level: 29, type: "case", caseId: "mellstroy",    label: "МеллстройКолекція" },
  { level: 30, type: "case", caseId: "summergift26", label: "Літній Дар" },

  { level: 31, type: "case", caseId: "summergift26", label: "Літній Дар" },
  { level: 32, type: "case", caseId: "summergift26", label: "Літній Дар" },
  { level: 33, type: "case", caseId: "mellstroy",    label: "МеллстройКолекція" },
  { level: 34, type: "case", caseId: "summergift26", label: "Літній Дар" },
  { level: 35, type: "case", caseId: "summergift26", label: "Літній Дар" },
  { level: 36, type: "case", caseId: "mellstroy",    label: "МеллстройКолекція" },
  { level: 37, type: "case", caseId: "summergift26", label: "Літній Дар" },
  { level: 38, type: "case", caseId: "summergift26", label: "Літній Дар" },
  { level: 39, type: "case", caseId: "mellstroy",    label: "МеллстройКолекція" },
  { level: 40, type: "case", caseId: "summergift26", label: "Літній Дар" },

  { level: 41, type: "case", caseId: "summergift26", label: "Літній Дар" },
  { level: 42, type: "case", caseId: "summergift26", label: "Літній Дар" },
  { level: 43, type: "case", caseId: "summergift26", label: "Літній Дар" },
  { level: 44, type: "case", caseId: "summergift26", label: "Літній Дар" },
  { level: 45, type: "case", caseId: "mellstroy",    label: "МеллстройКолекція" },
  { level: 46, type: "case", caseId: "summergift26", label: "Літній Дар" },
  { level: 47, type: "case", caseId: "summergift26", label: "Літній Дар" },
  { level: 48, type: "case", caseId: "summergift26", label: "Літній Дар" },
  { level: 49, type: "case", caseId: "summergift26", label: "Літній Дар" },
  { level: 50, type: "medal", medalId: "medal_bp_prime_summerheat2026",
  name: "Прайм Медаль «За проходження Батлпасу SummerHeat 2026»",
  img: "img/items/medal_bp_prime_summerheat2026.png",  // ← своя картинка
  label: "👑 Прайм Медаль BattlePass" },
];

// ── ТАБЛИЦЯ ШАНСІВ ДЛЯ КОЛЕСА ФАРТУНИ ──────

// Колесо: шанси залежать від ціни кейсу. Список сегментів для колеса на рівні N.
// Перший рядок=дешевше, останній=дорожче. Разом з нікусами.

export const BP_WHEEL_TABLE = [
  { type: "case", caseId: "summer26box",  weight: 40, label: "Літо26 Бокс" },
  { type: "case", caseId: "summer26",     weight: 28, label: "Літо26" },
  { type: "case", caseId: "summerheat",   weight: 12, label: "ЛітняСпека" },
  { type: "case", caseId: "mellstroy",    weight: 12, label: "МеллстройКолекція" },
  { type: "case", caseId: "summergift26", weight: 8,  label: "Літній Дар" },
];

// ── ЗАВДАННЯ ─────────────────────────────────

// Типи завдань (виконуються в script.js через checkBpTask)
// Умови: openCases, spendCoins, earnCoins, craftItems, marketSell, marketBuy,
//         addFriends, tradeComplete, loginDays

export const BP_DAILY_TASKS = [
  { id: "daily_open1",    title: "Відкрий 1 кейс",           type: "openCases",    goal: 1,   lbk: 100, bonus: null },
  { id: "daily_open3",    title: "Відкрий 3 кейси",          type: "openCases",    goal: 3,   lbk: 250, bonus: null },
  { id: "daily_spend100", title: "Витрать 100 нікусів",      type: "spendCoins",   goal: 100, lbk: 150, bonus: null },
  { id: "daily_earn200",  title: "Заробіть 200 нікусів",     type: "earnCoins",    goal: 200, lbk: 200, bonus: null },
  { id: "daily_market1",  title: "Продай предмет на ринку",  type: "marketSell",   goal: 1,   lbk: 120, bonus: null },
  { id: "daily_craft1",   title: "Зкрафть 1 предмет",        type: "craftItems",   goal: 1,   lbk: 180, bonus: null },
  { id: "daily_login",    title: "Увійти в гру",             type: "loginDays",    goal: 1,   lbk: 50,  bonus: null },
];

export const BP_WEEKLY_TASKS = [
  { id: "weekly_open10",   title: "Відкрий 10 кейсів за тиждень",      type: "openCases",    goal: 10,  lbk: 600,  bonus: { type: "coins", amount: 100 } },
  { id: "weekly_spend500", title: "Витрать 500 нікусів за тиждень",    type: "spendCoins",   goal: 500, lbk: 800,  bonus: null },
  { id: "weekly_craft5",   title: "Зкрафть 5 предметів за тиждень",    type: "craftItems",   goal: 5,   lbk: 1000, bonus: { type: "case", caseId: "summer26box" } },
  { id: "weekly_trade2",   title: "Виконай 2 трейди за тиждень",       type: "tradeComplete", goal: 2,  lbk: 1200, bonus: { type: "coins", amount: 200 } },
  { id: "weekly_market5",  title: "Продай 5 предметів на ринку",       type: "marketSell",   goal: 5,  lbk: 800,  bonus: { type: "case", caseId: "summer26" } },
  { id: "weekly_earn1000", title: "Заробіть 1000 нікусів за тиждень",  type: "earnCoins",    goal: 1000, lbk: 1000, bonus: null },
  { id: "weekly_login5",   title: "Зайди 5 днів на тижні",             type: "loginDays",    goal: 5,   lbk: 500,  bonus: null },
];

// Праймові завдання (тільки для прайм-гравців)
export const BP_PRIME_TASKS = [
  { id: "prime_open5",     title: "🌟 Відкрий 5 кейсів (Прайм)",        type: "openCases",   goal: 5,  lbk: 500,  bonus: { type: "case", caseId: "summerheat" } },
  { id: "prime_gift1",     title: "🌟 Надішли гіфт другу (Прайм)",      type: "sendGift",    goal: 1,  lbk: 600,  bonus: { type: "coins", amount: 300 } },
  { id: "prime_craft3",    title: "🌟 Зкрафть 3 предмети (Прайм)",      type: "craftItems",  goal: 3,  lbk: 800,  bonus: { type: "case", caseId: "mellstroy" } },
  { id: "prime_market10",  title: "🌟 Продай 10 предметів (Прайм)",     type: "marketSell",  goal: 10, lbk: 1200, bonus: { type: "case", caseId: "summergift26" } },
  { id: "prime_mellcoin",  title: "🌟 Заробіть 200 МеллКоінс (Прайм)", type: "mellCoins",   goal: 200, lbk: 1000, bonus: { type: "coins", amount: 500 } },
];

// ── ДОПОМІЖНІ ФУНКЦІЇ ─────────────────────────

function getBpRef(uid) { return doc(db, "battlepass", uid); }
function getGlobalBpRef() { return doc(db, "globalData", "battlepass"); }

// Повертає понеділок поточного тижня у форматі "YYYY-WW"
function getWeekKey() {
  const now = new Date();
  const dayOfWeek = (now.getDay() + 6) % 7; // Пн = 0
  const monday = new Date(now);
  monday.setDate(now.getDate() - dayOfWeek);
  const year = monday.getFullYear();
  const startOfYear = new Date(year, 0, 1);
  const weekNum = Math.ceil(((monday - startOfYear) / 86400000 + 1) / 7);
  return `${year}-W${String(weekNum).padStart(2, "0")}`;
}

// Повертає "YYYY-MM-DD" (дата сьогодні)
function getDayKey() {
  const now = new Date();
  return now.toISOString().slice(0, 10);
}

// Вибирає завдання на день (рандомно з пулу, фіксовано по date seed)
function pickDailyTasks(dayKey) {
  // Детермінований вибір по date key (seed)
  let seed = 0;
  for (const c of dayKey) seed += c.charCodeAt(0);
  const pool = [...BP_DAILY_TASKS];
  const picked = [];
  const used = new Set();
  // Вибираємо 3 унікальних завдання
  for (let i = 0; i < 3; i++) {
    seed = (seed * 1664525 + 1013904223) & 0xffffffff;
    const idx = Math.abs(seed) % pool.length;
    if (!used.has(idx)) { picked.push(pool[idx]); used.add(idx); }
    else {
      for (let j = 0; j < pool.length; j++) {
        if (!used.has(j)) { picked.push(pool[j]); used.add(j); break; }
      }
    }
  }
  return picked.slice(0, 3);
}

// Вибирає завдання на тиждень
function pickWeeklyTasks(weekKey) {
  let seed = 0;
  for (const c of weekKey) seed += c.charCodeAt(0);
  const pool = [...BP_WEEKLY_TASKS];
  const picked = [];
  const used = new Set();
  for (let i = 0; i < 3; i++) {
    seed = (seed * 1664525 + 1013904223) & 0xffffffff;
    const idx = Math.abs(seed) % pool.length;
    if (!used.has(idx)) { picked.push(pool[idx]); used.add(idx); }
    else {
      for (let j = 0; j < pool.length; j++) {
        if (!used.has(j)) { picked.push(pool[j]); used.add(j); break; }
      }
    }
  }
  return picked.slice(0, 3);
}

// ── FIRESTORE ФУНКЦІЇ ─────────────────────────

// Завантажити / ініціалізувати прогрес батлпасу гравця
export async function getBpProgress(uid) {
  const snap = await getDoc(getBpRef(uid));
  if (!snap.exists()) {
    const init = {
      seasonId:        BP_SEASON_ID,
      lbk:             0,
      level:           0,
      prime:           false,
      claimedNormal:   [],  // масив level які вже забрано
      claimedPrime:    [],
      claimedWheels:   [],  // [10,20,30,40,50]
      dailyKey:        "",
      weeklyKey:       "",
      dailyTasks:      [],  // [{id, progress, done}]
      weeklyTasks:     [],
      primeTasks:      [],
      primeTasksDone:  [],  // id виконаних прайм завдань
      createdAt:       Date.now(),
    };
    await setDoc(getBpRef(uid), init);
    return init;
  }
  return snap.data();
}

// Синхронізує щоденні/тижневі завдання (оновлення при необхідності)
export async function syncBpTasks(uid) {
  const dayKey  = getDayKey();
  const weekKey = getWeekKey();

  await runTransaction(db, async (tx) => {
    const ref  = getBpRef(uid);
    const snap = await tx.get(ref);
    if (!snap.exists()) return;
    const data   = snap.data();
    const update = {};

    // Оновлюємо щоденні якщо новий день
    if (data.dailyKey !== dayKey) {
      update.dailyKey  = dayKey;
      update.dailyTasks = pickDailyTasks(dayKey).map(t => ({
        id: t.id, progress: 0, done: false
      }));
    }

    // Оновлюємо щотижневі якщо новий тиждень
    if (data.weeklyKey !== weekKey) {
      update.weeklyKey   = weekKey;
      update.weeklyTasks = pickWeeklyTasks(weekKey).map(t => ({
        id: t.id, progress: 0, done: false
      }));
    }

    // Праймові завдання — якщо ще немає або порожні
    if (data.prime && (!data.primeTasks || data.primeTasks.length === 0)) {
      update.primeTasks = BP_PRIME_TASKS.map(t => ({
        id: t.id, progress: 0, done: false
      }));
    }

    if (Object.keys(update).length > 0) tx.update(ref, update);
  });

  return getBpProgress(uid);
}

// Додати ЛБК і підвищити рівень якщо треба
export async function addLbk(uid, amount) {
  return runTransaction(db, async (tx) => {
    const ref  = getBpRef(uid);
    const snap = await tx.get(ref);
    if (!snap.exists()) return null;
    const data = snap.data();

    const newLbk   = (data.lbk || 0) + amount;
    const newLevel = Math.min(BP_MAX_LEVEL, Math.floor(newLbk / BP_LBK_PER_LEVEL));

    tx.update(ref, { lbk: newLbk, level: newLevel });
    return { lbk: newLbk, level: newLevel, prevLevel: data.level || 0 };
  });
}

// Виконати крок завдання (тип, кількість)
export async function progressBpTask(uid, taskType, amount = 1) {
  return runTransaction(db, async (tx) => {
    const ref  = getBpRef(uid);
    const snap = await tx.get(ref);
    if (!snap.exists()) return [];
    const data = snap.data();

    const completed = []; // які завдання завершились
    const allTaskDefs = [...BP_DAILY_TASKS, ...BP_WEEKLY_TASKS, ...BP_PRIME_TASKS];

    function processTaskList(taskList, taskKey) {
      if (!taskList || !taskList.length) return taskList;
      return taskList.map(t => {
        if (t.done) return t;
        const def = allTaskDefs.find(d => d.id === t.id);
        if (!def || def.type !== taskType) return t;
        const newProg = Math.min(def.goal, (t.progress || 0) + amount);
        const done    = newProg >= def.goal;
        if (done && !t.done) completed.push({ ...def, _key: taskKey });
        return { ...t, progress: newProg, done };
      });
    }

    const dayKey  = getDayKey();
    const weekKey = getWeekKey();
    const update  = {};

    // Перевіряємо що завдання ще актуальні
    let dailyTasks  = data.dailyTasks  || [];
    let weeklyTasks = data.weeklyTasks || [];
    let primeTasks  = data.primeTasks  || [];

    if (data.dailyKey !== dayKey) {
      dailyTasks        = pickDailyTasks(dayKey).map(t => ({ id: t.id, progress: 0, done: false }));
      update.dailyKey   = dayKey;
    }
    if (data.weeklyKey !== weekKey) {
      weeklyTasks        = pickWeeklyTasks(weekKey).map(t => ({ id: t.id, progress: 0, done: false }));
      update.weeklyKey   = weekKey;
    }

    update.dailyTasks  = processTaskList(dailyTasks,  "daily");
    update.weeklyTasks = processTaskList(weeklyTasks, "weekly");
    if (data.prime) {
      update.primeTasks = processTaskList(primeTasks, "prime");
    }

    tx.update(ref, update);
    return completed;
  });
}

// Забрати нагороду за завдання (id)
export async function claimBpTaskReward(uid, taskId, gameState) {
  const allDefs = [...BP_DAILY_TASKS, ...BP_WEEKLY_TASKS, ...BP_PRIME_TASKS];
  const def = allDefs.find(d => d.id === taskId);
  if (!def) throw new Error("Завдання не знайдено");

  return runTransaction(db, async (tx) => {
    const bpRef   = getBpRef(uid);
    const userRef = doc(db, "users", uid);
    const [bpSnap, userSnap] = await Promise.all([tx.get(bpRef), tx.get(userRef)]);
    if (!bpSnap.exists() || !userSnap.exists()) throw new Error("Профіль не знайдено");

    const bp   = bpSnap.data();
    const user = userSnap.data();

    // Знаходимо завдання у відповідному списку
    const getTask = (list) => (list || []).find(t => t.id === taskId && t.done);
    const task = getTask(bp.dailyTasks) || getTask(bp.weeklyTasks) || getTask(bp.primeTasks);
    if (!task) throw new Error("Завдання не виконано або вже забрано");
    if (task.claimed) throw new Error("Нагороду вже забрано");

    // Нарахування ЛБК
    const newLbk   = (bp.lbk || 0) + def.lbk;
    const newLevel = Math.min(BP_MAX_LEVEL, Math.floor(newLbk / BP_LBK_PER_LEVEL));

    // Нарахування бонусу
    let invUpdate = [...(user.inventory || [])];
    let balUpdate = user.balance || 0;
    const awarded = [];

    if (def.bonus) {
      if (def.bonus.type === "coins") {
        balUpdate += def.bonus.amount;
        awarded.push({ type: "coins", amount: def.bonus.amount });
      } else if (def.bonus.type === "case") {
        const caseItem = {
          id: "bp_" + Math.random().toString(36).slice(2),
          type: "case", caseId: def.bonus.caseId,
          name: def.bonus.caseId,
          img: "img/cases/" + def.bonus.caseId + ".png",
          source: "battlepass",
          obtainedBy: user.username || uid,
          obtainedAt: Date.now(),
        };
        invUpdate.push(caseItem);
        awarded.push({ type: "case", ...caseItem });
      }
    }

    // Помічаємо завдання як claimed
    const markClaimed = (list) => (list || []).map(t => t.id === taskId ? { ...t, claimed: true } : t);
    const update = {
      lbk:   newLbk,
      level: newLevel,
    };
    if ((bp.dailyTasks || []).find(t => t.id === taskId)) update.dailyTasks  = markClaimed(bp.dailyTasks);
    if ((bp.weeklyTasks|| []).find(t => t.id === taskId)) update.weeklyTasks = markClaimed(bp.weeklyTasks);
    if ((bp.primeTasks || []).find(t => t.id === taskId)) update.primeTasks  = markClaimed(bp.primeTasks);

    tx.update(bpRef,  update);
    tx.update(userRef, { balance: balUpdate, inventory: invUpdate });

    return { lbkGained: def.lbk, newLbk, newLevel, prevLevel: bp.level || 0, bonus: awarded };
  });
}

// Забрати нагороду рівня (normal або prime)
export async function claimBpLevelReward(uid, level, track, gameState, CASES) {
  const rewards = track === "prime" ? BP_PRIME_REWARDS : BP_NORMAL_REWARDS;
  const reward  = rewards.find(r => r.level === level);
  if (!reward) throw new Error("Нагорода не знайдена");

  return runTransaction(db, async (tx) => {
    const bpRef   = getBpRef(uid);
    const userRef = doc(db, "users", uid);
    const [bpSnap, userSnap] = await Promise.all([tx.get(bpRef), tx.get(userRef)]);
    if (!bpSnap.exists() || !userSnap.exists()) throw new Error("Профіль не знайдено");

    const bp   = bpSnap.data();
    const user = userSnap.data();

    // Перевірки
    if (level > (bp.level || 0)) throw new Error("Рівень ще не досягнуто!");
    if (track === "prime" && !bp.prime) throw new Error("Потрібен Прайм!");

    const claimKey = track === "prime" ? "claimedPrime" : "claimedNormal";
    const claimed  = bp[claimKey] || [];
    if (claimed.includes(level)) throw new Error("Нагороду вже забрано!");

    // Якщо колесо — відкрити колесо, не видавати тут
    if (reward.type === "wheel") {
      const claimedWheels = [...(bp.claimedWheels || [])];
      if (claimedWheels.includes(level)) throw new Error("Колесо вже крутилось!");
      tx.update(bpRef, { claimedWheels: claimedWheels.filter(l => l !== level) }); // не додаємо — спін окремо
      return { type: "wheel", level };
    }

    let invUpdate = [...(user.inventory || [])];
    let balUpdate = user.balance || 0;
    const awarded = [];

    if (reward.type === "coins") {
      balUpdate += reward.amount;
      awarded.push({ type: "coins", amount: reward.amount });
    } else if (reward.type === "lbk") {
      const newLbk   = (bp.lbk || 0) + reward.amount;
      const newLevel = Math.min(BP_MAX_LEVEL, Math.floor(newLbk / BP_LBK_PER_LEVEL));
      tx.update(bpRef, { lbk: newLbk, level: newLevel });
      awarded.push({ type: "lbk", amount: reward.amount });
    } else if (reward.type === "case") {
      const c = CASES ? CASES[reward.caseId] : null;
      const caseItem = {
        id: "bp_" + Math.random().toString(36).slice(2),
        type: "case", caseId: reward.caseId,
        name: c ? c.name : reward.label,
        img: c ? c.img : "img/cases/" + reward.caseId + ".png",
        source: "battlepass",
        fromCaseName: "BattlePass SummerHeat 2026",
        obtainedBy: user.username || uid,
        obtainedAt: Date.now(),
      };
      invUpdate.push(caseItem);
      awarded.push({ type: "case", ...caseItem });
    } else if (reward.type === "medal") {
      const medalItem = {
        id: "bp_" + Math.random().toString(36).slice(2),
        type: "item", itemId: reward.medalId,
        name: reward.name, img: reward.img || "img/items/placeholder.png",
        rarity: "special", collection: "battlepass",
        quality: "Прямо з цеху", premium: track === "prime",
        source: "battlepass",
        fromCaseName: "BattlePass SummerHeat 2026",
        obtainedBy: user.username || uid,
        obtainedAt: Date.now(),
      };
      invUpdate.push(medalItem);
      awarded.push({ type: "medal", ...medalItem });
    }

    tx.update(bpRef,  { [claimKey]: [...claimed, level] });
    tx.update(userRef, { balance: balUpdate, inventory: invUpdate });

    return { reward, awarded };
  });
}

// Крутити колесо фортуни (на рівні N)
export async function spinBpWheel(uid, level) {
  const total = BP_WHEEL_TABLE.reduce((s, x) => s + x.weight, 0);
  let r = Math.random() * total;
  let prize = BP_WHEEL_TABLE[BP_WHEEL_TABLE.length - 1];
  for (const entry of BP_WHEEL_TABLE) {
    r -= entry.weight;
    if (r <= 0) { prize = entry; break; }
  }

  return runTransaction(db, async (tx) => {
    const bpRef   = getBpRef(uid);
    const userRef = doc(db, "users", uid);
    const [bpSnap, userSnap] = await Promise.all([tx.get(bpRef), tx.get(userRef)]);
    if (!bpSnap.exists() || !userSnap.exists()) throw new Error("Профіль не знайдено");

    const bp   = bpSnap.data();
    const user = userSnap.data();
    const claimedWheels = bp.claimedWheels || [];

    if (claimedWheels.includes(level)) throw new Error("Колесо вже крутилось на цьому рівні!");

    let invUpdate  = [...(user.inventory || [])];
    let balUpdate  = user.balance || 0;

    if (prize.type === "coins") {
      balUpdate += prize.amount;
    } else if (prize.type === "lbk") {
      // ЛБК без підвищення рівня тут — просто додаємо
      const newLbk   = (bp.lbk || 0) + prize.amount;
      const newLevel = Math.min(BP_MAX_LEVEL, Math.floor(newLbk / BP_LBK_PER_LEVEL));
      tx.update(bpRef, { lbk: newLbk, level: newLevel, claimedWheels: [...claimedWheels, level] });
      tx.update(userRef, { balance: balUpdate, inventory: invUpdate });
      return { prize, awarded: [{ type: "lbk", amount: prize.amount }] };
    } else if (prize.type === "case") {
      invUpdate.push({
        id: "bpw_" + Math.random().toString(36).slice(2),
        type: "case", caseId: prize.caseId,
        name: prize.label, img: "img/cases/" + prize.caseId + ".png",
        source: "battlepass_wheel",
        fromCaseName: "БП Колесо Фортуни",
        obtainedBy: user.username || uid,
        obtainedAt: Date.now(),
      });
    }

    tx.update(bpRef,  { claimedWheels: [...claimedWheels, level] });
    tx.update(userRef, { balance: balUpdate, inventory: invUpdate });

    return { prize, awarded: [{ type: prize.type, ...prize }] };
  });
}

// Купити Прайм
export async function buyBpPrime(uid, gameState) {
  return runTransaction(db, async (tx) => {
    const bpRef   = getBpRef(uid);
    const userRef = doc(db, "users", uid);
    const [bpSnap, userSnap] = await Promise.all([tx.get(bpRef), tx.get(userRef)]);
    if (!bpSnap.exists() || !userSnap.exists()) throw new Error("Профіль не знайдено");

    const bp   = bpSnap.data();
    const user = userSnap.data();

    if (bp.prime) throw new Error("Прайм вже активовано!");
    if ((user.balance || 0) < BP_PRIME_COST) throw new Error("Недостатньо нікусів! Потрібно " + BP_PRIME_COST);

    const primeTasks = BP_PRIME_TASKS.map(t => ({ id: t.id, progress: 0, done: false }));

    tx.update(bpRef,  { prime: true, primeTasks });
    tx.update(userRef, { balance: user.balance - BP_PRIME_COST });
  });
}

// Підписка на реалтайм оновлення БП
export function subscribeBpProgress(uid, callback) {
  return onSnapshot(getBpRef(uid), snap => {
    if (!snap.exists()) callback(null);
    else callback(snap.data());
  });
}

// ── АДМІН ФУНКЦІЇ ────────────────────────────

// Скинути БП конкретному гравцю
export async function adminResetBp(targetUid) {
  const init = {
    seasonId: BP_SEASON_ID,
    lbk: 0, level: 0, prime: false,
    claimedNormal: [], claimedPrime: [], claimedWheels: [],
    dailyKey: "", weeklyKey: "",
    dailyTasks: [], weeklyTasks: [], primeTasks: [],
    primeTasksDone: [],
    createdAt: Date.now(),
  };
  await setDoc(getBpRef(targetUid), init);
}

// Надати/забрати прайм без оплати
export async function adminSetPrime(targetUid, value) {
  const ref  = getBpRef(targetUid);
  const snap = await getDoc(ref);
  if (!snap.exists()) await setDoc(ref, { seasonId: BP_SEASON_ID, lbk: 0, level: 0, prime: value, claimedNormal:[], claimedPrime:[], claimedWheels:[], dailyKey:"", weeklyKey:"", dailyTasks:[], weeklyTasks:[], primeTasks: value ? BP_PRIME_TASKS.map(t=>({id:t.id,progress:0,done:false})) : [], primeTasksDone:[], createdAt: Date.now() });
  else {
    const update = { prime: value };
    if (value && !(snap.data().primeTasks || []).length) {
      update.primeTasks = BP_PRIME_TASKS.map(t => ({ id: t.id, progress: 0, done: false }));
    }
    await updateDoc(ref, update);
  }
}

// Скинути завдання конкретному гравцю
export async function adminResetTasks(targetUid, taskType) {
  const ref  = getBpRef(targetUid);
  const snap = await getDoc(ref);
  if (!snap.exists()) return;
  const data = snap.data();
  const update = {};
  if (taskType === "daily" || taskType === "all") {
    update.dailyKey  = "";
    update.dailyTasks = [];
  }
  if (taskType === "weekly" || taskType === "all") {
    update.weeklyKey   = "";
    update.weeklyTasks = [];
  }
  if (taskType === "prime" || taskType === "all") {
    update.primeTasks = [];
  }
  await updateDoc(ref, update);
}

// Додати ЛБК адміном
export async function adminAddLbk(targetUid, amount) {
  return addLbk(targetUid, amount);
}

// Отримати прогрес всіх гравців (для адмін-панелі)
export async function adminGetAllBpProgress() {
  const snap = await getDocs(collection(db, "battlepass"));
  return snap.docs.map(d => ({ uid: d.id, ...d.data() }));
}

// ── ХУКИ ДЛЯ SCRIPT.JS ───────────────────────
// Виклик цих функцій із script.js при відповідних діях:

// window._bpHook = async (type, amount) => {
//   if (!currentUser) return;
//   const completed = await progressBpTask(currentUser.uid, type, amount);
//   if (completed.length) {
//     completed.forEach(t => showToast("✅ БП завдання виконано: " + t.title, "success"));
//   }
// }