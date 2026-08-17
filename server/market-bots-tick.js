// ============================================
// РИНКОВІ БОТИ — СЕРВЕРНИЙ ТІК (Node.js, firebase-admin)
// ============================================
// Запускається окремо від гри (напр. з GitHub Actions за розкладом,
// раз на 30 хв), тому боти працюють навіть коли жоден гравець не онлайн.
// Логіка 1:1 скопійована з firebase.js (runMarketBotsTick і все, від чого
// вона залежить) — просто замінені client SDK виклики на firebase-admin.
//
// Обов'язкові env-змінні:
//   FIREBASE_SERVICE_ACCOUNT_JSON — вміст JSON-ключа сервісного акаунта
//                                    (Project settings → Service accounts
//                                    → Generate new private key), як рядок
//                                    (в GitHub Actions — секрет).
//   FIREBASE_PROJECT_ID (опційно, інакше береться з ключа)

const admin = require("firebase-admin");

// ── ІНІЦІАЛІЗАЦІЯ ──────────────────────────
const raw = process.env.FIREBASE_SERVICE_ACCOUNT_JSON;
if (!raw) {
  console.error("FIREBASE_SERVICE_ACCOUNT_JSON не задано");
  process.exit(1);
}
const serviceAccount = JSON.parse(raw);
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  projectId: process.env.FIREBASE_PROJECT_ID || serviceAccount.project_id,
});
const db = admin.firestore();
const FieldValue = admin.firestore.FieldValue;

// ── КОНФІГУРАЦІЯ (ідентична firebase.js) ──
const BOT_USERNAMES = ["Botik2883", "Qwerty037", "Lavochka", "MenX3m", "Kola207"];
const BOT_MONTHLY_BUDGET   = 10000;
const BOT_BUY_INTERVAL_MS  = 30 * 60 * 1000;
const BOT_DISCOUNT_RATIO   = 0.25;
const MARKET_COMMISSION    = 0.10;
// ЗМІНЕНО: було 2 — на тонкому ринку (мало лотів) computeRefPrice майже
// завжди повертав null, тому кандидатів для купівлі не було взагалі і
// боти реально купували лише під час недільної sweep (там немає умови
// по ціні). З 1 достатньо одного стороннього лота для порівняння.
const BOT_MIN_REF_SAMPLE   = 1;
const BOT_MAX_ITEMS_PER_CYCLE    = 5;
const BOT_RARITY_CYCLE_CAPS      = { legendary: 3, secret: 2, special: 1 };
const BOT_SPECIAL_COOLDOWN_TICKS = 48; // 48 * 30 хв = 24 год
const BOT_RARITY_PRIORITY  = ["special", "secret", "legendary", "epic", "exceptional", "common"];
const NOTIF_LIMIT = 5;

// ── ДОПОМІЖНЕ ──────────────────────────────

async function ensureMarketBots() {
  for (const name of BOT_USERNAMES) {
    const uid = "bot_" + name;
    const uSnap = await db.collection("usernames").doc(name).get();
    if (uSnap.exists) continue;
    await db.collection("users").doc(uid).set({
      username: name, email: "", isBot: true,
      balance: BOT_MONTHLY_BUDGET,
      budgetMonthKey: new Date().toISOString().slice(0, 7),
      inventory: [], level: 1, xp: 0,
      friends: [], friendRequests: [], clan: null, banned: false,
      createdAt: Date.now(), lastSeen: Date.now(),
    });
    await db.collection("usernames").doc(name).set({ uid, isBot: true });
  }
}

async function ensureBotMonthlyBudget(bot) {
  const monthKey = new Date().toISOString().slice(0, 7);
  if (bot.budgetMonthKey !== monthKey) {
    bot.balance = BOT_MONTHLY_BUDGET;
    bot.budgetMonthKey = monthKey;
    await db.collection("users").doc(bot.uid).update({ balance: BOT_MONTHLY_BUDGET, budgetMonthKey: monthKey });
  }
  return bot;
}

function median(nums) {
  const s = [...nums].sort((a, b) => a - b);
  const mid = Math.floor(s.length / 2);
  return s.length % 2 ? s[mid] : (s[mid - 1] + s[mid]) / 2;
}

// ── АДМІН-ДІАПАЗОНИ ЦІН ПО ПРЕДМЕТУ (1:1 з firebase.js) ────────
function getItemPriceRange(itemPrices, itemId) {
  if (!itemId || !itemPrices) return null;
  const r = itemPrices[itemId];
  if (!r || (r.min == null && r.max == null)) return null;
  return { min: r.min != null ? r.min : 0, max: r.max != null ? r.max : Infinity };
}

async function getMarketItemPrices() {
  const snap = await db.collection("system").doc("marketItemPrices").get();
  return snap.exists ? snap.data() : {};
}

function computeRefPrice(allListings, target) {
  const rarity   = target.item?.rarity;
  const sellerId = target.sellerId;
  const sameRarityOthers = allListings.filter(l =>
    l.docId !== target.docId && l.item?.rarity === rarity && l.sellerId !== sellerId
  );
  if (sameRarityOthers.length >= BOT_MIN_REF_SAMPLE) {
    return median(sameRarityOthers.map(l => l.price));
  }
  const allOthers = allListings.filter(l => l.docId !== target.docId && l.sellerId !== sellerId);
  if (allOthers.length >= BOT_MIN_REF_SAMPLE) {
    return median(allOthers.map(l => l.price));
  }
  return null;
}

async function getMarketListings() {
  const snap = await db.collection("market").get();
  return snap.docs.map(d => ({ docId: d.id, ...d.data() }));
}

async function logBotPurchase(entry) {
  const stateRef = db.collection("system").doc("marketBots");
  try {
    await db.runTransaction(async (tx) => {
      const snap = await tx.get(stateRef);
      const data = snap.exists ? snap.data() : {};
      const list = [entry, ...(data.recentPurchases || [])].slice(0, 25);
      tx.set(stateRef, { recentPurchases: list }, { merge: true });
    });
  } catch (e) { console.warn("Не вдалось записати лог покупки бота:", e); }
}

async function recordBotError(where, e) {
  const payload = { lastError: where + ": " + (e?.message || String(e)), lastErrorAt: Date.now() };
  try {
    await db.collection("system").doc("marketBots").set(payload, { merge: true });
  } catch (_) { /* не критично */ }
}

async function addNotification(uid, notif) {
  if (!uid) return;
  const ref = db.collection("users").doc(uid).collection("notifications");
  await ref.add({
    type:    notif.type    || "info",
    icon:    notif.icon    || "🔔",
    title:   notif.title   || "Сповіщення",
    message: notif.message || "",
    meta:    notif.meta    || null,
    read: false,
    createdAt: FieldValue.serverTimestamp(),
  });
  const snap = await ref.orderBy("createdAt", "desc").get();
  const extra = snap.docs.slice(NOTIF_LIMIT);
  if (extra.length) await Promise.all(extra.map(d => d.ref.delete()));
}

// Атомарна купівля лоту ботом (як у firebase.js _buyListingAsBot).
async function buyListingAsBot(bot, listing, extraBotUpdate = {}) {
  let notifyPayload = null;
  await db.runTransaction(async (tx) => {
    const listingRef  = db.collection("market").doc(listing.docId);
    const listingSnap = await tx.get(listingRef);
    if (!listingSnap.exists) return;
    const liveData = listingSnap.data();
    if (liveData.sellerId === bot.uid) return;

    const sellerRef  = db.collection("users").doc(liveData.sellerId);
    const sellerSnap = await tx.get(sellerRef);
    const sellerBal  = sellerSnap.exists ? (sellerSnap.data().balance || 0) : 0;
    const sellerName = sellerSnap.exists ? (sellerSnap.data().username || liveData.sellerId) : liveData.sellerId;

    const botRef  = db.collection("users").doc(bot.uid);
    const botSnap = await tx.get(botRef);
    const botInv  = [...(botSnap.exists ? (botSnap.data().inventory || []) : [])];
    const botBal  = botSnap.exists ? (botSnap.data().balance || 0) : 0;
    if (botBal < liveData.price) return;

    const item    = liveData.item;
    const newItem = { ...item, id: item?.id || ("bot_" + Date.now().toString(36)), obtainedBy: bot.username };
    botInv.push(newItem);

    const payout = Math.round(liveData.price * (1 - MARKET_COMMISSION));

    tx.update(sellerRef, { balance: sellerBal + payout });
    tx.update(botRef,    { inventory: botInv, balance: botBal - liveData.price, lastSeen: Date.now(), ...extraBotUpdate });
    tx.delete(listingRef);

    notifyPayload = {
      sellerId: liveData.sellerId,
      sellerName,
      buyerName: bot.username,
      itemName: item?.name || "Предмет",
      price: liveData.price, payout,
    };
  });

  if (notifyPayload) {
    addNotification(notifyPayload.sellerId, {
      type: "item_sold",
      icon: "🤖",
      title: "Предмет скупив бот!",
      message: notifyPayload.buyerName + " (бот) купив(ла) у тебе \"" + notifyPayload.itemName + "\" за " +
        notifyPayload.price + " нікусів (комісія ринку 10%, зараховано " + notifyPayload.payout + ").",
    }).catch(() => {});

    logBotPurchase({
      botName:    notifyPayload.buyerName,
      itemName:   notifyPayload.itemName,
      price:      notifyPayload.price,
      sellerName: notifyPayload.sellerName,
      at:         Date.now(),
    }).catch(() => {});
  }

  return !!notifyPayload;
}

function sortCandidatesByPriority(candidates) {
  const rank = (r) => { const i = BOT_RARITY_PRIORITY.indexOf(r); return i === -1 ? BOT_RARITY_PRIORITY.length : i; };
  return [...candidates].sort((a, b) => {
    const ra = rank(a.l.item?.rarity), rb = rank(b.l.item?.rarity);
    if (ra !== rb) return ra - rb;
    return a.l.price - b.l.price;
  });
}

async function botsBuyCycle(disabledBots = []) {
  const itemPrices = await getMarketItemPrices();

  for (const name of BOT_USERNAMES) {
    if (disabledBots.includes(name)) continue;
    try {
      const uid = "bot_" + name;
      const snap = await db.collection("users").doc(uid).get();
      if (!snap.exists) continue;
      let bot = await ensureBotMonthlyBudget({ uid, username: name, ...snap.data() });
      if (bot.balance <= 0) {
        console.log(`[${name}] пропуск: баланс 0`);
        continue;
      }

      const fresh = await getMarketListings();
      const own = fresh.filter(l => l.sellerId !== uid);
      if (!own.length) {
        console.log(`[${name}] пропуск: на ринку немає чужих лотів`);
        continue;
      }

      // Якщо для itemId заданий адмін-діапазон [min,max] — він визначає
      // купівлю (медіана ігнорується). Інакше — стара логіка (медіана - 25%).
      let candidates = own
        .map(l => {
          const range = getItemPriceRange(itemPrices, l.item?.itemId);
          if (range) {
            return (l.price >= range.min && l.price <= range.max) ? { l, ref: null } : null;
          }
          const ref = computeRefPrice(own, l);
          return (ref != null && l.price <= ref * (1 - BOT_DISCOUNT_RATIO)) ? { l, ref } : null;
        })
        .filter(Boolean);
      candidates = sortCandidatesByPriority(candidates);

      // ДІАГНОСТИКА: скільки лотів взагалі є і скільки пройшло фільтр по ціні.
      // Якщо лотів багато, а candidates.length === 0 — майже напевно ніхто
      // не продає з дисконтом 25%+ від медіани, і це нормальна поведінка,
      // а не баг.
      console.log(`[${name}] лотів на ринку: ${own.length}, кандидатів на купівлю: ${candidates.length}`);

      const now = Date.now();
      const specialCooldownMs = BOT_SPECIAL_COOLDOWN_TICKS * BOT_BUY_INTERVAL_MS;
      const rarityBoughtThisCycle = {};
      let boughtThisCycle = 0;

      for (const cand of candidates) {
        if (boughtThisCycle >= BOT_MAX_ITEMS_PER_CYCLE) break;
        const rarity = cand.l.item?.rarity || "common";
        const cap = BOT_RARITY_CYCLE_CAPS[rarity];
        if (cap != null && (rarityBoughtThisCycle[rarity] || 0) >= cap) continue;
        if (rarity === "special" && bot.lastSpecialBuyAt && (now - bot.lastSpecialBuyAt) < specialCooldownMs) continue;
        if (cand.l.price > bot.balance) continue;

        const extraUpdate = rarity === "special" ? { lastSpecialBuyAt: now } : {};
        const ok = await buyListingAsBot(bot, cand.l, extraUpdate);
        if (ok) {
          boughtThisCycle++;
          rarityBoughtThisCycle[rarity] = (rarityBoughtThisCycle[rarity] || 0) + 1;
          bot.balance -= cand.l.price;
          if (rarity === "special") bot.lastSpecialBuyAt = now;
        }
      }

      console.log(`[${name}] куплено за цикл: ${boughtThisCycle}`);
    } catch (e) {
      console.warn("Помилка бота-покупця:", name, e);
      await recordBotError("buy:" + name, e);
    }
  }
}

async function botsMarketSweep(disabledBots = []) {
  const listings = (await getMarketListings()).sort((a, b) => a.price - b.price);
  if (!listings.length) return;

  const bots = [];
  for (const name of BOT_USERNAMES) {
    if (disabledBots.includes(name)) continue;
    const uid = "bot_" + name;
    const snap = await db.collection("users").doc(uid).get();
    if (!snap.exists) continue;
    bots.push(await ensureBotMonthlyBudget({ uid, username: name, ...snap.data() }));
  }
  if (!bots.length) return;

  for (const listing of listings) {
    const buyer = bots.find(b => b.uid !== listing.sellerId && b.balance >= listing.price);
    if (!buyer) continue;
    const ok = await buyListingAsBot(buyer, listing);
    if (ok) buyer.balance -= listing.price;
  }
}

// ── ГОЛОВНА ТОЧКА ВХОДУ ────────────────────
// На відміну від клієнтської версії, тут НЕ потрібен setInterval — GitHub
// Actions сам запускає новий процес щоразу за cron-розкладом, скрипт
// робить один прохід і завершується. Лок через транзакцію в
// system/marketBots лишається — про всяк випадок, якщо workflow колись
// запуститься паралельно (напр. ручний запуск + розклад одночасно), а
// також лишає сумісність зі старим клієнтським тіком, якщо той не приберуть.
async function runMarketBotsTick() {
  try {
    await ensureMarketBots();
  } catch (e) { await recordBotError("ensure-bots", e); return; }

  const stateRef = db.collection("system").doc("marketBots");
  const now = Date.now();

  let stateData = {};
  try {
    const stateSnap = await stateRef.get();
    stateData = stateSnap.exists ? stateSnap.data() : {};
  } catch (e) { await recordBotError("read-state", e); }

  if (stateData.botsEnabled === false) {
    console.log("Боти вимкнені адміном (botsEnabled: false) — виходимо.");
    return;
  }

  let claimedBuy = false;
  try {
    await db.runTransaction(async (tx) => {
      const snap = await tx.get(stateRef);
      const data = snap.exists ? snap.data() : {};
      if (data.botsEnabled === false) return;
      if (now - (data.lastTick || 0) < BOT_BUY_INTERVAL_MS) return;
      tx.set(stateRef, { lastTick: now }, { merge: true });
      claimedBuy = true;
    });
  } catch (e) { await recordBotError("tick-lock", e); }

  if (claimedBuy) {
    console.log("Запускаю цикл покупок ботів...");
    try { await botsBuyCycle(stateData.disabledBots || []); }
    catch (e) { await recordBotError("buy-cycle", e); }
  } else {
    // ДІАГНОСТИКА: якщо це повідомлення в логах з'являється майже щоразу —
    // цикл покупок майже ніколи не запускається, бо GitHub Actions викликає
    // тік частіше/рідше, ніж інтервал в 30 хв, і транзакція постійно
    // відбраковує спробу через lastTick. Порівняй cron у workflow з
    // BOT_BUY_INTERVAL_MS.
    console.log("Ще не настав час покупки (< 30 хв з минулого тіку) — пропускаю цикл покупок.");
  }

  const today = new Date();
  if (today.getDay() === 0) {
    const dayKey = today.toISOString().slice(0, 10);
    let claimedSweep = false;
    try {
      await db.runTransaction(async (tx) => {
        const snap = await tx.get(stateRef);
        const data = snap.exists ? snap.data() : {};
        if (data.botsEnabled === false) return;
        if (data.lastSweepDay === dayKey) return;
        tx.set(stateRef, { lastSweepDay: dayKey }, { merge: true });
        claimedSweep = true;
      });
    } catch (e) { await recordBotError("sweep-lock", e); }
    if (claimedSweep) {
      console.log("Неділя — запускаю зачистку ринку...");
      try { await botsMarketSweep(stateData.disabledBots || []); }
      catch (e) { await recordBotError("sweep-cycle", e); }
    }
  }

  console.log("Тік завершено.");
}

runMarketBotsTick()
  .then(() => process.exit(0))
  .catch((e) => { console.error("Фатальна помилка тіку:", e); process.exit(1); });
