// ============================================
// FIREBASE — НІКУС КЕЙС РЕМЕЙК
// ============================================

import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.0/firebase-app.js";

// 1. ІМПОРТ — прибрати sendClanMessage і subscribeClanChat:
import {
  getFirestore, doc, setDoc, getDoc, updateDoc,
  collection, getDocs, addDoc, deleteDoc, query,
  orderBy, onSnapshot, serverTimestamp, where, runTransaction, deleteField
} from "https://www.gstatic.com/firebasejs/10.7.0/firebase-firestore.js";
import {
  getAuth, createUserWithEmailAndPassword, signInWithEmailAndPassword,
  signOut, onAuthStateChanged, GoogleAuthProvider, signInWithPopup,
} from "https://www.gstatic.com/firebasejs/10.7.0/firebase-auth.js";

const firebaseConfig = {
  apiKey:            "AIzaSyBR9jgqGiQMWCsSYOI6Wk3l7fCaloxJ-og",
  authDomain:        "nicus-case-remake.firebaseapp.com",
  projectId:         "nicus-case-remake",
  storageBucket:     "nicus-case-remake.firebasestorage.app",
  messagingSenderId: "987703961569",
  appId:             "1:987703961569:web:7083d376fb1b2af1d814a0"
};

const app  = initializeApp(firebaseConfig);
const db   = getFirestore(app);
const auth = getAuth(app);

// ============================================
// РИНКОВІ БОТИ — конфігурація
// ============================================
// Ніки ботів. Ці нікнейми зарезервовані і недоступні для реєстрації гравцями.
const BOT_USERNAMES = ["Botik2883", "Qwerty037", "Lavochka", "MenX3m", "Kola207"];
const BOT_MONTHLY_BUDGET  = 10000;                 // нікусів на місяць на кожного бота
const BOT_BUY_INTERVAL_MS = 30 * 60 * 1000;        // 30 хв між покупками ботів
const BOT_DISCOUNT_RATIO  = 0.25;                  // боти купують на 25% нижче ринкової ціни
const MARKET_COMMISSION   = 0.10;                  // комісія ринку 10% (сплачує продавець)
const BOT_MIN_REF_SAMPLE  = 2;                     // мін. к-сть НЕЗАЛЕЖНИХ (чужих) лотів для довіри до довідкової ціни

// Ліміти на ОДНУ "чистку" (тобто на один регулярний тік бота, раз на 30 хв —
// BOT_BUY_INTERVAL_MS). Кожен бот може купити за одну чистку максимум
// BOT_MAX_ITEMS_PER_CYCLE предметів сумарно. Додатково — по рідкості:
// звичайна/виняткова/епічна ліміту не мають (обмежені лише загальним
// лімітом), легендарна/секретна/спеціальна — мають власні ліміти нижче.
// Спеціальна рідкість додатково має "перезарядку": не частіше одного разу
// на BOT_SPECIAL_COOLDOWN_TICKS чисток (= 24 год при чистці раз на 30 хв).
const BOT_MAX_ITEMS_PER_CYCLE   = 5;
const BOT_RARITY_CYCLE_CAPS     = { legendary: 3, secret: 2, special: 1 };
const BOT_SPECIAL_COOLDOWN_TICKS = 48; // 48 * 30 хв = 24 год
// Пріоритет купівлі між рідкостями в межах однієї чистки: спершу
// найрідкісніші (бо саме вони обмежені й "закінчуються" найшвидше),
// потім по спадаючій; в межах однієї рідкості — від найдешевшого лота.
const BOT_RARITY_PRIORITY = ["special", "secret", "legendary", "epic", "exceptional", "common"];

function isReservedBotUsername(username) {
  return BOT_USERNAMES.some(n => n.toLowerCase() === String(username || "").toLowerCase());
}

// ── РЕЄСТРАЦІЯ ─────────────────────────────

async function registerUser(username, email, password) {
  if (isReservedBotUsername(username)) throw new Error("Цей нікнейм зарезервований для бота і недоступний для реєстрації!");
  const usernameDoc = await getDoc(doc(db, "usernames", username));
  if (usernameDoc.exists()) throw new Error("Цей нікнейм вже зайнятий!");
  const userCred = await createUserWithEmailAndPassword(auth, email, password);
  const uid = userCred.user.uid;
  const newUser = {
    username, email, balance: 100, inventory: [], level: 1, xp: 0,
    friends: [], friendRequests: [], clan: null, banned: false,
    createdAt: Date.now(), lastSeen: Date.now(),
  };
  await setDoc(doc(db, "users", uid), newUser);
  await setDoc(doc(db, "usernames", username), { uid });
  return { uid, ...newUser };
}

// ── ВХІД ───────────────────────────────────

async function loginUser(email, password) {
  const userCred = await signInWithEmailAndPassword(auth, email, password);
  const uid = userCred.user.uid;
  const snap = await getDoc(doc(db, "users", uid));
  if (!snap.exists()) throw new Error("Профіль не знайдено!");
  const data = snap.data();
  if (data.banned) throw new Error("Акаунт заблокований!");
  return { uid, ...data };
}

// ── ЗБЕРЕЖЕННЯ ─────────────────────────────

async function saveUserData(uid, gameState) {
  await updateDoc(doc(db, "users", uid), {
    balance: gameState.balance, inventory: gameState.inventory,
    level: gameState.level, xp: gameState.xp,
    friends: gameState.friends,
    friendRequests: gameState.friendRequests || [],
    clan: gameState.clan, lastSeen: Date.now(),
  });
}

// ── РИНОК ───────────────────────────────────

async function listItemOnMarket(uid, username, item, price) {
  const ref = await addDoc(collection(db, "market"), {
    sellerId: uid, sellerName: username,
    item, price, listedAt: serverTimestamp(),
    status: "active", // Додаємо явний статус
  });
  return ref.id;
}

async function getMarketListings() {
  const snap = await getDocs(query(collection(db, "market"), orderBy("listedAt", "desc")));
  return snap.docs.map(d => ({ docId: d.id, ...d.data() }));
}

function subscribeMarket(callback) {
  return onSnapshot(
    query(collection(db, "market"), orderBy("listedAt", "desc")),
    snap => callback(snap.docs.map(d => ({ docId: d.id, ...d.data() })))
  );
}

// ── ЗАХИСТ ВІД ДЮП: cancelListing через транзакцію ──────────────────────────
// Гарантує атомарність: або лот знятий і предмет повернутий, або нічого
async function removeMarketListing(docId, sellerUid) {
  await runTransaction(db, async (tx) => {
    const listingRef  = doc(db, "market", docId);
    const listingSnap = await tx.get(listingRef);

    // Якщо лот вже не існує (хтось встиг купити) — кидаємо помилку
    if (!listingSnap.exists()) throw new Error("Лот вже не існує! Можливо, його щойно купили.");

    const listing = listingSnap.data();

    // Перевіряємо що це справді продавець
    if (listing.sellerId !== sellerUid) throw new Error("Недостатньо прав!");

    const userRef  = doc(db, "users", sellerUid);
    const userSnap = await tx.get(userRef);
    if (!userSnap.exists()) throw new Error("Профіль не знайдено!");

    const inv = [...(userSnap.data().inventory || [])];
    // Повертаємо предмет продавцю
  inv.push({ ...listing.item, id: listing.item?.id || ('ret_' + Date.now().toString(36)) });

    // Атомарно: видаляємо лот і повертаємо предмет
    tx.delete(listingRef);
    tx.update(userRef, { inventory: inv });
  });
}

// ── ЗАХИСТ ВІД ДЮП: buyMarketItem через транзакцію ─────────────────────────
// Повністю атомарна операція: читаємо лот, перевіряємо, переводимо
async function buyMarketItem(buyerUid, buyerGameState, listing) {
  if (buyerUid === listing.sellerId) throw new Error("Не можна купити свій предмет!");

  let boughtItem = null;
  let notifyPayload = null; // заповнюємо всередині транзакції, надсилаємо сповіщення вже після її успіху

  await runTransaction(db, async (tx) => {
    const listingRef  = doc(db, "market", listing.docId);
    const listingSnap = await tx.get(listingRef);

    // КРИТИЧНО: перевіряємо чи лот ще існує в момент транзакції
    if (!listingSnap.exists()) throw new Error("Лот вже не існує! Можливо, його щойно зняли або купили.");

    const liveData = listingSnap.data();
    const price    = liveData.price;
    const item     = liveData.item;

    // Перевіряємо що продавець не змінився
    if (liveData.sellerId === buyerUid) throw new Error("Не можна купити свій предмет!");

    const buyerRef  = doc(db, "users", buyerUid);
    const buyerSnap = await tx.get(buyerRef);
    if (!buyerSnap.exists()) throw new Error("Профіль покупця не знайдено!");

    const buyerBal = buyerSnap.data().balance ?? 0;
    if (buyerBal < price) throw new Error("Недостатньо нікусів!");

    const sellerRef  = doc(db, "users", liveData.sellerId);
    const sellerSnap = await tx.get(sellerRef);
    const sellerBal  = sellerSnap.exists() ? (sellerSnap.data().balance || 0) : 0;

    const buyerInv = [...(buyerSnap.data().inventory || [])];
  const newItem  = { ...item, id: item?.id || ('m_' + Date.now().toString(36)) };
    buyerInv.push(newItem);
    boughtItem = newItem;

    // Комісія ринку 10%: продавець отримує 90% від ціни лоту
    const payout = Math.round(price * (1 - MARKET_COMMISSION));
    const feeAmt = price - payout;

    notifyPayload = {
      sellerId: liveData.sellerId,
      buyerName: buyerGameState?.username || "Гравець",
      itemName: item?.name || "Предмет",
      price, payout, feeAmt,
    };

    // Атомарно: списуємо у покупця повну ціну, нараховуємо продавцю ціну мінус комісія, видаляємо лот
    tx.update(sellerRef, { balance: sellerBal + payout });
    tx.update(buyerRef,  { balance: buyerBal - price, inventory: buyerInv });
    tx.delete(listingRef);
  });

  if (notifyPayload) {
    addNotification(notifyPayload.sellerId, {
      type: "item_sold",
      icon: "💰",
      title: "Предмет продано!",
      message: notifyPayload.buyerName + " купив(ла) у тебе \"" + notifyPayload.itemName + "\" за " + notifyPayload.price +
        " нікусів. Комісія ринку 10% (" + notifyPayload.feeAmt + "), на баланс зараховано " + notifyPayload.payout + ".",
    }).catch(() => {});
  }

  return boughtItem;
}

// ── ЦЕНТР ПОВІДОМЛЕНЬ ───────────────────────
// Зберігаємо сповіщення у підколекції users/{uid}/notifications,
// щоб стрічку можна було швидко читати/оновлювати без гонок за основним документом юзера.

const NOTIF_LIMIT = 5; // зберігаємо тільки останні 5 сповіщень на юзера

async function addNotification(uid, notif) {
  if (!uid) return;
  const ref = collection(db, "users", uid, "notifications");
  await addDoc(ref, {
    type:    notif.type    || "info",
    icon:    notif.icon    || "🔔",
    title:   notif.title   || "Сповіщення",
    message: notif.message || "",
    meta:    notif.meta    || null,
    read: false,
    createdAt: serverTimestamp(),
  });

  // Обрізаємо стрічку до останніх NOTIF_LIMIT — старіші видаляємо
  const snap = await getDocs(
    query(collection(db, "users", uid, "notifications"), orderBy("createdAt", "desc"))
  );
  const extra = snap.docs.slice(NOTIF_LIMIT);
  if (extra.length) {
    await Promise.all(extra.map(d => deleteDoc(d.ref)));
  }
}

async function getNotifications(uid, max = NOTIF_LIMIT) {
  const snap = await getDocs(
    query(collection(db, "users", uid, "notifications"), orderBy("createdAt", "desc"))
  );
  return snap.docs.slice(0, max).map(d => ({ docId: d.id, ...d.data() }));
}

function subscribeNotifications(uid, callback) {
  return onSnapshot(
    query(collection(db, "users", uid, "notifications"), orderBy("createdAt", "desc")),
    snap => callback(snap.docs.map(d => ({ docId: d.id, ...d.data() })))
  );
}

async function getUnreadNotificationsCount(uid) {
  const notifs = await getNotifications(uid);
  return notifs.filter(n => !n.read).length;
}

async function markNotificationRead(uid, notifId) {
  await updateDoc(doc(db, "users", uid, "notifications", notifId), { read: true });
}

async function markAllNotificationsRead(uid, notifIds) {
  await Promise.all(
    (notifIds || []).map(id => updateDoc(doc(db, "users", uid, "notifications", id), { read: true }))
  );
}

async function deleteNotification(uid, notifId) {
  await deleteDoc(doc(db, "users", uid, "notifications", notifId));
}

async function clearAllNotifications(uid, notifIds) {
  await Promise.all(
    (notifIds || []).map(id => deleteDoc(doc(db, "users", uid, "notifications", id)))
  );
}

// ── КЛАНОВИЙ ЧАТ ───────────────────────────

async function sendClanMessage(clanId, uid, username, text) {
  const ref = collection(db, "clans", clanId, "chat");
  await addDoc(ref, {
    uid, username, text,
    createdAt: serverTimestamp(),
  });
  // Обрізаємо до 50 повідомлень
  const snap = await getDocs(query(ref, orderBy("createdAt", "asc")));
  if (snap.docs.length > 50) {
    const toDelete = snap.docs.slice(0, snap.docs.length - 50);
    for (const d of toDelete) await deleteDoc(d.ref);
  }
}

function subscribeClanChat(clanId, callback) {
  return onSnapshot(
    query(collection(db, "clans", clanId, "chat"), orderBy("createdAt", "asc")),
    snap => callback(snap.docs.map(d => ({ id: d.id, ...d.data() })))
  );
}

// ── ТРЕЙДИ / ГІФТИ ──────────────────────────

async function sendTradeRequest(fromUid, fromUsername, toUsername, offerItems, wantItems, type) {
  const usernameSnap = await getDoc(doc(db, "usernames", toUsername));
  if (!usernameSnap.exists()) throw new Error("Гравця не знайдено!");
  const toUid = usernameSnap.data().uid;
  const ref = await addDoc(collection(db, "trades"), {
    fromUid, fromUsername, toUid, toUsername,
    offerItems: offerItems || [],
    wantItems:  wantItems  || [],
    type: type || "trade",
    status: "pending", createdAt: serverTimestamp(),
  });
  addNotification(toUid, {
    type: type === "gift" ? "gift_request" : "trade_request",
    icon: type === "gift" ? "🎁" : "🔄",
    title: type === "gift" ? "Тобі надіслали гіфт!" : "Новий запит на обмін",
    message: fromUsername + (type === "gift" ? " хоче подарувати тобі предмет(и)." : " пропонує обмін предметами."),
  }).catch(() => {});
  return ref.id;
}

async function getMyTrades(uid) {
  const [sentSnap, recvSnap] = await Promise.all([
    getDocs(query(collection(db, "trades"), where("fromUid", "==", uid))),
    getDocs(query(collection(db, "trades"), where("toUid",   "==", uid))),
  ]);
  const trades = [];
  sentSnap.docs.forEach(d => trades.push({ docId: d.id, ...d.data() }));
  recvSnap.docs.forEach(d => { if (!trades.find(t => t.docId === d.id)) trades.push({ docId: d.id, ...d.data() }); });
  return trades;
}

async function acceptTradeAndSwap(docId) {
  await runTransaction(db, async (tx) => {
    const tradeRef  = doc(db, "trades", docId);
    const tradeSnap = await tx.get(tradeRef);
    if (!tradeSnap.exists()) throw new Error("Трейд не знайдено!");
    const trade = tradeSnap.data();
    if (trade.status !== "pending") throw new Error("Трейд вже не активний!");

    const senderRef   = doc(db, "users", trade.fromUid);
    const receiverRef = doc(db, "users", trade.toUid);
    const [sSnap, rSnap] = await Promise.all([tx.get(senderRef), tx.get(receiverRef)]);

    let sInv = [...(sSnap.data()?.inventory || [])];
    let rInv = [...(rSnap.data()?.inventory || [])];
    let sBal = sSnap.data()?.balance || 0;
    let rBal = rSnap.data()?.balance || 0;

    for (const offItem of (trade.offerItems || [])) {
      if (offItem._type === "balance") {
        if (sBal < offItem._amount) throw new Error("Відправник більше не має достатньо нікусів!");
        sBal -= offItem._amount;
        rBal += offItem._amount;
      } else {
        const idx = sInv.findIndex(i => i.id === offItem.id);
        if (idx === -1) throw new Error("Відправник більше не має: " + offItem.name);
        sInv.splice(idx, 1);
    rInv.push({ ...offItem });
      }
    }

    if (trade.type !== "gift") {
      for (const wantItem of (trade.wantItems || [])) {
        if (!wantItem.id) continue;
        const idx = rInv.findIndex(i => i.id === wantItem.id);
        if (idx === -1) throw new Error("Отримувач більше не має: " + wantItem.name);
        rInv.splice(idx, 1);
       sInv.push({ ...wantItem });
      }
    }

    tx.update(senderRef,   { inventory: sInv, balance: sBal });
    tx.update(receiverRef, { inventory: rInv, balance: rBal });
    tx.update(tradeRef, { status: "confirmed" });
  });
}

async function updateTradeStatus(docId, status) {
  await updateDoc(doc(db, "trades", docId), { status });
}

// ── ЗАПИТИ В ДРУЗІ ─────────────────────────

async function sendFriendRequest(fromUid, fromUsername, toUsername) {
  const snap = await getDoc(doc(db, "usernames", toUsername));
  if (!snap.exists()) throw new Error("Гравця не знайдено!");
  const toUid   = snap.data().uid;
  const toSnap  = await getDoc(doc(db, "users", toUid));
  const toData  = toSnap.data();
  if ((toData.friends || []).includes(fromUsername)) throw new Error("Вже в друзях!");
  const requests = toData.friendRequests || [];
  if (requests.includes(fromUsername)) throw new Error("Запит вже надіслано!");
  await updateDoc(doc(db, "users", toUid), { friendRequests: [...requests, fromUsername] });
  addNotification(toUid, {
    type: "friend_request",
    icon: "🤝",
    title: "Новий запит у друзі",
    message: fromUsername + " хоче додати тебе в друзі.",
  }).catch(() => {});
}

async function acceptFriendRequest(myUid, myUsername, fromUsername) {
  const fromSnap = await getDoc(doc(db, "usernames", fromUsername));
  if (!fromSnap.exists()) throw new Error("Гравця не знайдено!");
  const fromUid = fromSnap.data().uid;
  await runTransaction(db, async (tx) => {
    const myRef   = doc(db, "users", myUid);
    const fromRef = doc(db, "users", fromUid);
    const [myD, fromD] = await Promise.all([tx.get(myRef), tx.get(fromRef)]);
    const myFriends   = [...(myD.data()?.friends || [])];
    const fromFriends = [...(fromD.data()?.friends || [])];
    const myRequests  = (myD.data()?.friendRequests || []).filter(r => r !== fromUsername);
    if (!myFriends.includes(fromUsername)) myFriends.push(fromUsername);
    if (!fromFriends.includes(myUsername)) fromFriends.push(myUsername);
    tx.update(myRef,   { friends: myFriends, friendRequests: myRequests });
    tx.update(fromRef, { friends: fromFriends });
  });
  addNotification(fromUid, {
    type: "friend_accepted",
    icon: "✅",
    title: "Заявку прийнято",
    message: myUsername + " прийняв(ла) твою заявку в друзі!",
  }).catch(() => {});
}

async function declineFriendRequest(myUid, fromUsername) {
  const mySnap   = await getDoc(doc(db, "users", myUid));
  const requests = (mySnap.data()?.friendRequests || []).filter(r => r !== fromUsername);
  await updateDoc(doc(db, "users", myUid), { friendRequests: requests });
}

// ── КЛАНИ (Firebase) ───────────────────────

async function createClanDB(leaderUid, leaderUsername, clanName) {
  const clanId = 'clan_' + Date.now().toString(36);
  const clanData = {
    id: clanId, name: clanName,
    leader: leaderUsername, leaderUid,
    members: [leaderUsername], memberUids: [leaderUid],
    joinRequests: [],
    vault: { balance: 0, inventory: [] },
    createdAt: Date.now(),
  };
  await setDoc(doc(db, "clans", clanId), clanData);
  await updateDoc(doc(db, "users", leaderUid), { clan: clanId });
  return clanId;
}

async function getClan(clanId) {
  const timeout = new Promise((_, reject) =>
    setTimeout(() => reject(new Error("Таймаут 5с — clanId: " + clanId)), 5000)
  );
  const snap = await Promise.race([
    getDoc(doc(db, "clans", clanId)),
    timeout
  ]);
  return snap.exists() ? snap.data() : null;
}

async function sendClanJoinRequest(userUid, username, clanId) {
  const snap = await getDoc(doc(db, "clans", clanId));
  if (!snap.exists()) throw new Error("Клан не знайдено!");
  const clan = snap.data();
  if ((clan.memberUids || []).includes(userUid)) throw new Error("Ти вже в цьому клані!");
  if ((clan.joinRequests || []).find(r => r.uid === userUid)) throw new Error("Запит вже надіслано!");
  await updateDoc(doc(db, "clans", clanId), {
    joinRequests: [...(clan.joinRequests || []), { uid: userUid, username }]
  });
}

async function acceptClanJoinRequest(clanId, applicantUid, applicantUsername) {
  await runTransaction(db, async (tx) => {
    const clanRef  = doc(db, "clans", clanId);
    const userRef  = doc(db, "users", applicantUid);
    const snap     = await tx.get(clanRef);
    if (!snap.exists()) throw new Error("Клан не знайдено!");
    const clan        = snap.data();
    const members     = [...(clan.members || [])];
    const memberUids  = [...(clan.memberUids || [])];
    const joinRequests = (clan.joinRequests || []).filter(r => r.uid !== applicantUid);
    if (!members.includes(applicantUsername)) members.push(applicantUsername);
    if (!memberUids.includes(applicantUid))   memberUids.push(applicantUid);
    tx.update(clanRef, { members, memberUids, joinRequests });
    tx.update(userRef, { clan: clanId });
  });
  addNotification(applicantUid, {
    type: "clan_accepted",
    icon: "🛡️",
    title: "Прийнято в клан!",
    message: "Твою заявку на вступ до клану схвалено.",
  }).catch(() => {});
}

async function declineClanJoinRequest(clanId, applicantUid) {
  const snap = await getDoc(doc(db, "clans", clanId));
  if (!snap.exists()) return;
  const joinRequests = (snap.data().joinRequests || []).filter(r => r.uid !== applicantUid);
  await updateDoc(doc(db, "clans", clanId), { joinRequests });
}

async function leaveClanDB(userUid, username, clanId) {
  await runTransaction(db, async (tx) => {
    const clanRef = doc(db, "clans", clanId);
    const userRef = doc(db, "users", userUid);
    const snap    = await tx.get(clanRef);
    if (!snap.exists()) { tx.update(userRef, { clan: null }); return; }
    const clan       = snap.data();
    const members    = (clan.members || []).filter(m => m !== username);
    const memberUids = (clan.memberUids || []).filter(u => u !== userUid);
    if (members.length === 0) {
      tx.delete(clanRef);
    } else {
      const newLeader = clan.leader === username ? members[0] : clan.leader;
      tx.update(clanRef, { members, memberUids, leader: newLeader });
    }
    tx.update(userRef, { clan: null });
  });
}

async function kickFromClanDB(clanId, targetUid, targetUsername) {
  await runTransaction(db, async (tx) => {
    const clanRef   = doc(db, "clans", clanId);
    const targetRef = doc(db, "users", targetUid);
    const snap      = await tx.get(clanRef);
    if (!snap.exists()) return;
    const clan       = snap.data();
    const members    = (clan.members || []).filter(m => m !== targetUsername);
    const memberUids = (clan.memberUids || []).filter(u => u !== targetUid);
    tx.update(clanRef, { members, memberUids });
    tx.update(targetRef, { clan: null });
  });
}

// ── КЛАНОВИЙ ОБЩАК ─────────────────────────

async function clanVaultDeposit(clanId, depositorUid, depositorUsername, type, amount, item) {
  await runTransaction(db, async (tx) => {
    const clanRef = doc(db, "clans", clanId);
    const userRef = doc(db, "users", depositorUid);
    const [cSnap, uSnap] = await Promise.all([tx.get(clanRef), tx.get(userRef)]);
    if (!cSnap.exists()) throw new Error("Клан не знайдено!");
    const clan  = cSnap.data();
    const vault = { balance: clan.vault?.balance || 0, inventory: [...(clan.vault?.inventory || [])] };
    const user  = uSnap.data();

    if (type === "balance") {
      if ((user.balance || 0) < amount) throw new Error("Недостатньо нікусів!");
      vault.balance += amount;
      tx.update(userRef, { balance: user.balance - amount });
    } else {
      const inv = [...(user.inventory || [])];
      const idx = inv.findIndex(i => i.id === item.id);
      if (idx === -1) throw new Error("Предмет не знайдено!");
      inv.splice(idx, 1);
      vault.inventory.push({ ...item, donatedBy: depositorUsername, donatedAt: Date.now() });
      tx.update(userRef, { inventory: inv });
    }

    const logs = [...(clan.logs || [])];
    logs.push({
      uid: depositorUid,
      username: depositorUsername,
      action: type === "balance" ? "deposit_balance" : "deposit_item",
      amount: type === "balance" ? amount : 0,
      itemName: type === "item" ? item.name : null,
      date: Date.now(),
    });
    if (logs.length > 10) logs.splice(0, logs.length - 10);
    tx.update(clanRef, { vault, logs });
  });
}

async function clanVaultWithdraw(clanId, withdrawerUid, type, amount, itemId) {
  await runTransaction(db, async (tx) => {
    const clanRef = doc(db, "clans", clanId);
    const userRef = doc(db, "users", withdrawerUid);
    const [cSnap, uSnap] = await Promise.all([tx.get(clanRef), tx.get(userRef)]);
    if (!cSnap.exists()) throw new Error("Клан не знайдено!");
    const clan  = cSnap.data();
    const vault = {
      balance: clan.vault?.balance || 0,
      inventory: [...(clan.vault?.inventory || [])]
    };
    const user = uSnap.data();

    let taken = null;

    if (type === "balance") {
      if (vault.balance < amount) throw new Error("В общаку недостатньо нікусів!");
      vault.balance -= amount;
      tx.update(userRef, { balance: (user.balance || 0) + amount });
    } else {
      const idx = vault.inventory.findIndex(i => i.id === itemId);
      if (idx === -1) throw new Error("Предмет не знайдено в общаку!");
      taken = vault.inventory.splice(idx, 1)[0];
      const cleanedItem = { ...taken };
      delete cleanedItem.donatedBy;
      delete cleanedItem.donatedAt;
      const uInv = [...(user.inventory || []), cleanedItem];
      tx.update(userRef, { inventory: uInv });
    }

    const logs = [...(clan.logs || [])];
    logs.push({
      uid: withdrawerUid,
      username: (uSnap.data()?.username || withdrawerUid),
      action: type === "balance" ? "withdraw_balance" : "withdraw_item",
      amount: type === "balance" ? amount : 0,
      itemName: type === "item" ? (taken?.name || "Предмет") : null,
      date: Date.now(),
    });
    if (logs.length > 10) logs.splice(0, logs.length - 10);
    tx.update(clanRef, { vault, logs });
  });
}

// ============================================
// РИНКОВІ БОТИ — логіка
// ============================================
// Боти виглядають для гравців як звичайні гравці (мають профіль, нік, баланс,
// інвентар), але взаємодія з ними обмежена: не можна додати в друзі, обміняти
// чи подарувати предмет (це фільтрується на рівні UI в script.js). Кожен бот
// щомісяця має бюджет 10000 нікусів, купує лоти на ринку мінімум на 25%
// нижче орієнтовної ринкової ціни цього предмета, а куплений предмет
// зараховується боту в інвентар (як звичайна покупка). Раз на 30 хв кожен
// бот здійснює щонайбільше 1 покупку. Кожну неділю боти додатково проводять
// "зачистку ринку" — скуповують усі лоти, що залишились, у межах бюджету.

// Створює профілі ботів (один раз) і резервує їхні нікнейми в колекції usernames,
// щоб гравці не могли зареєструватись під цими нікнеймами.
async function ensureMarketBots() {
  for (const name of BOT_USERNAMES) {
    const uid = "bot_" + name;
    const uSnap = await getDoc(doc(db, "usernames", name));
    if (uSnap.exists()) continue;
    await setDoc(doc(db, "users", uid), {
      username: name, email: "", isBot: true,
      balance: BOT_MONTHLY_BUDGET,
      budgetMonthKey: new Date().toISOString().slice(0, 7),
      inventory: [], level: 1, xp: 0,
      friends: [], friendRequests: [], clan: null, banned: false,
      createdAt: Date.now(), lastSeen: Date.now(),
    });
    await setDoc(doc(db, "usernames", name), { uid, isBot: true });
  }
}

// Якщо настав новий місяць — обнуляємо бюджет бота до 10000
async function _ensureBotMonthlyBudget(bot) {
  const monthKey = new Date().toISOString().slice(0, 7);
  if (bot.budgetMonthKey !== monthKey) {
    bot.balance = BOT_MONTHLY_BUDGET;
    bot.budgetMonthKey = monthKey;
    await updateDoc(doc(db, "users", bot.uid), { balance: BOT_MONTHLY_BUDGET, budgetMonthKey: monthKey });
  }
  return bot;
}

function _median(nums) {
  const s = [...nums].sort((a, b) => a - b);
  const mid = Math.floor(s.length / 2);
  return s.length % 2 ? s[mid] : (s[mid - 1] + s[mid]) / 2;
}

// Орієнтовна "ринкова ціна" для лота: медіана цін серед ЧУЖИХ активних лотів
// того ж рівня рідкості (rarity); якщо таких недостатньо — медіана по всьому
// ринку (теж лише чужі лоти); якщо і таких недостатньо — повертає null,
// і бот такий лот не купує (нема з чим надійно порівнювати).
//
// ФІКС ЕКСПЛОЙТУ "космічних цін": раніше довідкова ціна рахувалась як
// СЕРЕДНЄ і включала ІНШІ лоти ТОГО Ж продавця. Це дозволяло грати так:
// продавець виставляв лот-приманку тієї ж рідкості за космічну суму
// (напр. 999 999 999), і відносно цього викиду середня ціна різко
// зростала — після чого будь-який ІНШИЙ лот того самого продавця з
// ціною нижче 75% від цього фейкового "середнього" миттєво проходив
// перевірку і бот скуповував його за грабіжницьку суму.
// Тепер: (1) лоти ТОГО Ж продавця повністю виключаються з розрахунку
// довідкової ціни — самому собі накрутити середню ціну більше не можна;
// (2) використовується МЕДІАНА, а не середнє — вона набагато стійкіша
// до поодиноких викидів, тож маніпуляція вимагає вже кількох НЕЗАЛЕЖНИХ
// акаунтів-приманок, а не одного; (3) вимагається мінімум
// BOT_MIN_REF_SAMPLE чужих лотів — якщо даних замало, бот обережно
// пропускає лот, а не купує наосліп.
// ── АДМІН-ДІАПАЗОНИ ЦІН ПО ПРЕДМЕТУ ────────
// system/marketItemPrices = { [itemId]: { min, max } }. Якщо для предмета
// заданий діапазон — він ПОВНІСТЮ визначає, чи купує бот лот цього предмета
// (ціна лота має бути в межах [min, max]), і стара перевірка по медіані для
// нього більше НЕ застосовується. Це навмисно: адмінський діапазон —
// фіксоване число, яке ніхто з гравців не може підняти лотом-приманкою
// (на відміну від медіани, яку рахує сам ринок). Для предметів, для яких
// діапазон ще не заданий, лишається стара логіка (медіана - 25%), щоб
// нічого не зламати, поки не пройдешся по всіх предметах.
function _getItemPriceRange(itemPrices, itemId) {
  if (!itemId || !itemPrices) return null;
  const r = itemPrices[itemId];
  if (!r || (r.min == null && r.max == null)) return null;
  return { min: r.min != null ? r.min : 0, max: r.max != null ? r.max : Infinity };
}

async function _getMarketItemPrices() {
  const snap = await getDoc(doc(db, "system", "marketItemPrices"));
  return snap.exists() ? snap.data() : {};
}

// Разова вибірка діапазонів для адмін-панелі / живе оновлення.
async function getMarketItemPrices() { return _getMarketItemPrices(); }

function subscribeMarketItemPrices(callback) {
  return onSnapshot(doc(db, "system", "marketItemPrices"), snap => {
    callback(snap.exists() ? snap.data() : {});
  });
}

// Задає/оновлює діапазон [min, max] для одного предмета. min/max можуть
// бути null — тоді відповідна межа не обмежена (0 знизу / безкінечність зверху).
async function adminSetItemPriceRange(itemId, min, max) {
  if (!itemId) throw new Error("itemId обов'язковий!");
  const minVal = (min === "" || min == null) ? null : Number(min);
  const maxVal = (max === "" || max == null) ? null : Number(max);
  if (minVal != null && (isNaN(minVal) || minVal < 0)) throw new Error("Некоректне мінімальне значення!");
  if (maxVal != null && (isNaN(maxVal) || maxVal < 0)) throw new Error("Некоректне максимальне значення!");
  if (minVal != null && maxVal != null && minVal > maxVal) throw new Error("Мінімум не може бути більшим за максимум!");
  await setDoc(doc(db, "system", "marketItemPrices"), { [itemId]: { min: minVal, max: maxVal } }, { merge: true });
}

// Прибирає заданий діапазон для предмета — бот знову орієнтуватиметься на медіану.
async function adminClearItemPriceRange(itemId) {
  if (!itemId) return;
  const ref = doc(db, "system", "marketItemPrices");
  const snap = await getDoc(ref);
  if (!snap.exists()) return; // нема документа — нема що чистити
  await updateDoc(ref, { [itemId]: deleteField() });
}

function _computeRefPrice(allListings, target) {
  const rarity   = target.item?.rarity;
  const sellerId = target.sellerId;
  const sameRarityOthers = allListings.filter(l =>
    l.docId !== target.docId && l.item?.rarity === rarity && l.sellerId !== sellerId
  );
  if (sameRarityOthers.length >= BOT_MIN_REF_SAMPLE) {
    return _median(sameRarityOthers.map(l => l.price));
  }
  const allOthers = allListings.filter(l => l.docId !== target.docId && l.sellerId !== sellerId);
  if (allOthers.length >= BOT_MIN_REF_SAMPLE) {
    return _median(allOthers.map(l => l.price));
  }
  return null;
}

// Записує покупку бота в короткий лог (system/marketBots.recentPurchases,
// максимум 25 останніх) — щоб адмін бачив дії ботів у адмін-панелі.
async function _logBotPurchase(entry) {
  const stateRef = doc(db, "system", "marketBots");
  try {
    await runTransaction(db, async (tx) => {
      const snap = await tx.get(stateRef);
      const data = snap.exists() ? snap.data() : {};
      const list = [entry, ...(data.recentPurchases || [])].slice(0, 25);
      tx.set(stateRef, { recentPurchases: list }, { merge: true });
    });
  } catch (e) { console.warn("Не вдалось записати лог покупки бота:", e); }
}

// Записує останню помилку бот-циклу в system/marketBots, щоб вона була
// видна в адмін-панелі навіть без доступу до консолі розробника (гравець
// може працювати з мобільного і не бачити console.warn у DevTools).
async function _recordBotError(where, e) {
  const payload = { lastError: where + ": " + (e?.message || String(e)), lastErrorAt: Date.now() };
  try {
    await setDoc(doc(db, "system", "marketBots"), payload, { merge: true });
  } catch (_) { /* нічого — не критично, якщо навіть це не вдалось записати */ }
}

// Атомарна купівля лоту ботом: продавцю зараховується оплата (мінус 10%
// комісії ринку), предмет потрапляє в інвентар бота, а бюджет бота
// списується — все ОДНІЄЮ транзакцією (як звичайна покупка).
//
// ФІКС БАГА "боти не витрачають гроші і не отримують предмети": раніше
// баланс бота списувався ОКРЕМИМ updateDoc() вже ПІСЛЯ цієї транзакції,
// і робилося це безумовно — навіть якщо транзакція вище нічого не
// зробила (напр. лот вже встигли купити/зняти до того, як бот дістався
// до нього). Тепер списання балансу — частина тієї самої атомарної
// операції, тож або відбувається все разом (гроші + інвентар), або
// нічого. Повертає true/false — чи покупка справді відбулась.
async function _buyListingAsBot(bot, listing, extraBotUpdate = {}) {
  let notifyPayload = null;
  await runTransaction(db, async (tx) => {
    const listingRef  = doc(db, "market", listing.docId);
    const listingSnap = await tx.get(listingRef);
    if (!listingSnap.exists()) return; // лот вже купили/зняли — нічого не робимо
    const liveData = listingSnap.data();
    if (liveData.sellerId === bot.uid) return;

    const sellerRef  = doc(db, "users", liveData.sellerId);
    const sellerSnap = await tx.get(sellerRef);
    const sellerBal  = sellerSnap.exists() ? (sellerSnap.data().balance || 0) : 0;
    const sellerName = sellerSnap.exists() ? (sellerSnap.data().username || liveData.sellerId) : liveData.sellerId;

    const botRef  = doc(db, "users", bot.uid);
    const botSnap = await tx.get(botRef);
    const botInv  = [...(botSnap.exists() ? (botSnap.data().inventory || []) : [])];
    const botBal  = botSnap.exists() ? (botSnap.data().balance || 0) : 0;
    if (botBal < liveData.price) return; // подвійна перевірка бюджету всередині транзакції

    const item    = liveData.item;
    const newItem = { ...item, id: item?.id || ('bot_' + Date.now().toString(36)), obtainedBy: bot.username };
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

    _logBotPurchase({
      botName:    notifyPayload.buyerName,
      itemName:   notifyPayload.itemName,
      price:      notifyPayload.price,
      sellerName: notifyPayload.sellerName,
      at:         Date.now(),
    }).catch(() => {});
  }

  return !!notifyPayload;
}

// Сортує кандидатів на купівлю за пріоритетом рідкості (спершу
// найрідкісніші, бо саме на них діють жорсткі ліміти й вони "закінчуються"
// найшвидше), а в межах однієї рідкості — від найдешевшого лота.
function _sortCandidatesByPriority(candidates) {
  const rank = (r) => { const i = BOT_RARITY_PRIORITY.indexOf(r); return i === -1 ? BOT_RARITY_PRIORITY.length : i; };
  return [...candidates].sort((a, b) => {
    const ra = rank(a.l.item?.rarity), rb = rank(b.l.item?.rarity);
    if (ra !== rb) return ra - rb;
    return a.l.price - b.l.price;
  });
}

// Звичайний цикл ("чистка", раз на BOT_BUY_INTERVAL_MS = 30 хв): кожен бот
// за одну чистку купує лоти, ціна яких мінімум на 25% нижче орієнтовної
// ринкової ціни цього предмета — але не більше BOT_MAX_ITEMS_PER_CYCLE
// предметів сумарно, з пріоритетом на рідкісніші рідкості й окремими
// лімітами: легендарна ≤3, секретна ≤2, спеціальна ≤1 (і не частіше ніж
// раз на BOT_SPECIAL_COOLDOWN_TICKS чисток — тобто раз на добу).
// disabledBots — нікнейми ботів, яких адмін тимчасово вимкнув (пропускаються).
async function _botsBuyCycle(disabledBots = []) {
  const itemPrices = await _getMarketItemPrices();

  for (const name of BOT_USERNAMES) {
    if (disabledBots.includes(name)) continue;
    try {
      const uid = "bot_" + name;
      const snap = await getDoc(doc(db, "users", uid));
      if (!snap.exists()) continue;
      let bot = await _ensureBotMonthlyBudget({ uid, username: name, ...snap.data() });
      if (bot.balance <= 0) continue;

      const fresh = await getMarketListings();
      const own = fresh.filter(l => l.sellerId !== uid);
      if (!own.length) continue;

      // Для кожного лота: якщо адмін задав діапазон [min,max] для цього
      // itemId — лот проходить лише якщо ціна в межах діапазону (медіана
      // ігнорується). Якщо діапазону нема — стара логіка (медіана - 25%).
      let candidates = own
        .map(l => {
          const range = _getItemPriceRange(itemPrices, l.item?.itemId);
          if (range) {
            return (l.price >= range.min && l.price <= range.max) ? { l, ref: null } : null;
          }
          const ref = _computeRefPrice(own, l);
          return (ref != null && l.price <= ref * (1 - BOT_DISCOUNT_RATIO)) ? { l, ref } : null;
        })
        .filter(Boolean);
      candidates = _sortCandidatesByPriority(candidates);

      const now = Date.now();
      const specialCooldownMs = BOT_SPECIAL_COOLDOWN_TICKS * BOT_BUY_INTERVAL_MS;
      const rarityBoughtThisCycle = {};
      let boughtThisCycle = 0;

      for (const cand of candidates) {
        if (boughtThisCycle >= BOT_MAX_ITEMS_PER_CYCLE) break;
        const rarity = cand.l.item?.rarity || "common";
        const cap = BOT_RARITY_CYCLE_CAPS[rarity]; // undefined = без ліміту рідкості
        if (cap != null && (rarityBoughtThisCycle[rarity] || 0) >= cap) continue;
        if (rarity === "special" && bot.lastSpecialBuyAt && (now - bot.lastSpecialBuyAt) < specialCooldownMs) continue;
        if (cand.l.price > bot.balance) continue;

        const extraUpdate = rarity === "special" ? { lastSpecialBuyAt: now } : {};
        const ok = await _buyListingAsBot(bot, cand.l, extraUpdate);
        if (ok) {
          boughtThisCycle++;
          rarityBoughtThisCycle[rarity] = (rarityBoughtThisCycle[rarity] || 0) + 1;
          bot.balance -= cand.l.price;
          if (rarity === "special") bot.lastSpecialBuyAt = now;
        }
      }
    } catch (e) {
      console.warn("Помилка бота-покупця:", name, e);
      await _recordBotError("buy:" + name, e);
    }
  }
}

// Щонедільна "зачистка ринку": боти скуповують ВСІ лоти, що залишились
// (незалежно від знижки), у межах свого місячного бюджету, від найдешевших.
// Також викликається вручну адміном через adminTriggerMarketSweep().
async function _botsMarketSweep(disabledBots = []) {
  const listings = (await getMarketListings()).sort((a, b) => a.price - b.price);
  if (!listings.length) return;

  const bots = [];
  for (const name of BOT_USERNAMES) {
    if (disabledBots.includes(name)) continue;
    const uid = "bot_" + name;
    const snap = await getDoc(doc(db, "users", uid));
    if (!snap.exists()) continue;
    bots.push(await _ensureBotMonthlyBudget({ uid, username: name, ...snap.data() }));
  }
  if (!bots.length) return;

  for (const listing of listings) {
    const buyer = bots.find(b => b.uid !== listing.sellerId && b.balance >= listing.price);
    if (!buyer) continue;
    const ok = await _buyListingAsBot(buyer, listing); // баланс списується всередині транзакції
    if (ok) buyer.balance -= listing.price; // лише локальний трекер для решти цього циклу
  }
}

// Головна точка входу — викликати періодично (напр. кожні 60 сек) з клієнта.
// Сама розбирається, чи настав час для покупки ботів (раз на 30 хв) і чи
// настала неділя для тижневої зачистки ринку. Захищена від дублювання
// одночасних тіків з різних вкладок/користувачів через транзакцію-замок
// у документі system/marketBots. Будь-яка помилка на будь-якому етапі
// записується в system/marketBots.lastError, щоб бути видною в адмін-панелі
// навіть без доступу до консолі розробника.
async function runMarketBotsTick() {
  try {
    await ensureMarketBots();
  } catch (e) { await _recordBotError("ensure-bots", e); return; }

  const stateRef = doc(db, "system", "marketBots");
  const now = Date.now();

  let stateData = {};
  try {
    const stateSnap = await getDoc(stateRef);
    stateData = stateSnap.exists() ? stateSnap.data() : {};
  } catch (e) { await _recordBotError("read-state", e); }

  if (stateData.botsEnabled === false) return; // адмін вимкнув ботів глобально

  let claimedBuy = false;
  try {
    await runTransaction(db, async (tx) => {
      const snap = await tx.get(stateRef);
      const data = snap.exists() ? snap.data() : {};
      if (data.botsEnabled === false) return;
      if (now - (data.lastTick || 0) < BOT_BUY_INTERVAL_MS) return;
      tx.set(stateRef, { lastTick: now }, { merge: true });
      claimedBuy = true;
    });
  } catch (e) { await _recordBotError("tick-lock", e); /* хтось інший тримає лок — пропускаємо */ }

  if (claimedBuy) {
    try { await _botsBuyCycle(stateData.disabledBots || []); }
    catch (e) { await _recordBotError("buy-cycle", e); }
  }

  const today = new Date();
  if (today.getDay() === 0) { // неділя
    const dayKey = today.toISOString().slice(0, 10);
    let claimedSweep = false;
    try {
      await runTransaction(db, async (tx) => {
        const snap = await tx.get(stateRef);
        const data = snap.exists() ? snap.data() : {};
        if (data.botsEnabled === false) return;
        if (data.lastSweepDay === dayKey) return;
        tx.set(stateRef, { lastSweepDay: dayKey }, { merge: true });
        claimedSweep = true;
      });
    } catch (e) { await _recordBotError("sweep-lock", e); }
    if (claimedSweep) {
      try { await _botsMarketSweep(stateData.disabledBots || []); }
      catch (e) { await _recordBotError("sweep-cycle", e); }
    }
  }
}

// ── АДМІН: керування ринковими ботами ───────

// Поточний стан ботів одноразово (таймер, статус, останні покупки, помилки).
async function getMarketBotsState() {
  const snap = await getDoc(doc(db, "system", "marketBots"));
  return snap.exists() ? snap.data() : {};
}

// Підписка в реальному часі на стан ботів — для живого оновлення адмін-панелі.
function subscribeMarketBotsState(callback) {
  return onSnapshot(doc(db, "system", "marketBots"), snap => {
    callback(snap.exists() ? snap.data() : {});
  });
}

// Глобально вмикає/вимикає ВСІХ ринкових ботів одразу.
async function adminSetBotsEnabled(enabled) {
  await setDoc(doc(db, "system", "marketBots"), { botsEnabled: enabled }, { merge: true });
}

// Вмикає/вимикає ОКРЕМОГО бота за нікнеймом (не бере участі в покупках/зачистці).
async function adminSetBotDisabled(botName, disabled) {
  const stateRef = doc(db, "system", "marketBots");
  await runTransaction(db, async (tx) => {
    const snap = await tx.get(stateRef);
    const data = snap.exists() ? snap.data() : {};
    let list = [...(data.disabledBots || [])];
    if (disabled && !list.includes(botName)) list.push(botName);
    if (!disabled) list = list.filter(n => n !== botName);
    tx.set(stateRef, { disabledBots: list }, { merge: true });
  });
}

// Обнуляє таймер між покупками — вже наступний тік (до 60 сек) здійснить покупку.
async function adminResetBotBuyTimer() {
  await setDoc(doc(db, "system", "marketBots"), { lastTick: 0 }, { merge: true });
}

// Примусово запускає "зачистку ринку" ботами прямо зараз, поза розкладом неділі.
async function adminTriggerMarketSweep() {
  const stateSnap = await getDoc(doc(db, "system", "marketBots"));
  const disabledBots = stateSnap.exists() ? (stateSnap.data().disabledBots || []) : [];
  await _botsMarketSweep(disabledBots);
}

// Забирає весь поточний баланс бота собі на рахунок (адміну).
async function adminCollectBotBalance(botUid, adminUid) {
  await runTransaction(db, async (tx) => {
    const botRef   = doc(db, "users", botUid);
    const adminRef = doc(db, "users", adminUid);
    const botSnap   = await tx.get(botRef);
    const adminSnap = await tx.get(adminRef);
    if (!botSnap.exists())   throw new Error("Бота не знайдено!");
    if (!adminSnap.exists()) throw new Error("Профіль адміна не знайдено!");
    const amount = botSnap.data().balance || 0;
    tx.update(botRef,   { balance: 0 });
    tx.update(adminRef, { balance: (adminSnap.data().balance || 0) + amount });
  });
}

// ── ПРОФІЛЬ ГРАВЦЯ ─────────────────────────

async function getUserProfile(username) {
  const snap = await getDoc(doc(db, "usernames", username));
  if (!snap.exists()) throw new Error("Гравця не знайдено!");
  const uid  = snap.data().uid;
  const uSnap = await getDoc(doc(db, "users", uid));
  if (!uSnap.exists()) throw new Error("Профіль не знайдено!");
  return { uid, ...uSnap.data() };
}

// ── ВИХІД ───────────────────────────────────

async function logoutUser() { await signOut(auth); }

// ── GOOGLE SIGN-IN ──────────────────────────

async function loginWithGoogle(askUsername) {
  const provider = new GoogleAuthProvider();
  const userCred = await signInWithPopup(auth, provider);
  const uid = userCred.user.uid;
  const snap = await getDoc(doc(db, "users", uid));
  if (snap.exists()) {
    const data = snap.data();
    if (data.banned) throw new Error("Акаунт заблокований!");
    return { uid, ...data };
  }
  const username = await askUsername();
  if (!username) throw new Error("Нікнейм обов'язковий!");
  if (isReservedBotUsername(username)) throw new Error("Цей нікнейм зарезервований для бота і недоступний для реєстрації!");
  const usernameDoc = await getDoc(doc(db, "usernames", username));
  if (usernameDoc.exists()) throw new Error("Цей нікнейм вже зайнятий!");
  const newUser = {
    username, email: userCred.user.email || "",
    balance: 100, inventory: [], level: 1, xp: 0,
    friends: [], friendRequests: [], clan: null, banned: false,
    createdAt: Date.now(), lastSeen: Date.now(),
  };
  await setDoc(doc(db, "users", uid), newUser);
  await setDoc(doc(db, "usernames", username), { uid });
  return { uid, ...newUser };
}

async function getAllUsernames() {
  const snap = await getDocs(collection(db, "usernames"));
  return snap.docs.map(d => d.id);
}

// ============================================
// ЧОРНИЙ РИНОК: коди гравців, платний блок предметів, крадіжки
// ============================================

const BM_LOCK_PRICE_PER_DAY = 15; // нікусів/добу за блок предмета (1..10 діб)
const BM_LOOKUP_FEE          = 100; // нікусів за конвертацію нік <-> код
const BM_LOCKPICK_PRICE      = 250; // нікусів за відмичку

function generatePlayerCode() {
  // 7-значний кодовий ID гравця, перша цифра 1-9
  return String(Math.floor(1000000 + Math.random() * 9000000));
}

function getItemLockPrice(days) {
  return BM_LOCK_PRICE_PER_DAY * days;
}

// Ліниво створює й повертає кодовий ID гравця (генерується один раз, назавжди).
async function ensurePlayerCode(uid) {
  const userRef = doc(db, "users", uid);
  let code = null;
  await runTransaction(db, async (tx) => {
    const userSnap = await tx.get(userRef);
    if (!userSnap.exists()) throw new Error("Профіль не знайдено!");
    const data = userSnap.data();
    if (data.playerCode) { code = data.playerCode; return; }

    let candidate, codeRef, codeSnap, attempt = 0;
    do {
      candidate = generatePlayerCode();
      codeRef   = doc(db, "playerCodes", candidate);
      codeSnap  = await tx.get(codeRef);
      attempt++;
    } while (codeSnap.exists() && attempt < 12);
    if (codeSnap.exists()) throw new Error("Не вдалось згенерувати код, спробуй ще раз.");

    tx.set(codeRef, { uid, username: data.username || "" });
    tx.update(userRef, { playerCode: candidate });
    code = candidate;
  });
  return code;
}

// Купівля даних на чорному ринку (нік->код або код->нік), 100 нікусів.
// Списує оплату окремою транзакцією, а сам пошук — звичайні публічні читання.
async function blackMarketPayLookupFee(uid) {
  const userRef = doc(db, "users", uid);
  await runTransaction(db, async (tx) => {
    const snap = await tx.get(userRef);
    if (!snap.exists()) throw new Error("Профіль не знайдено!");
    const bal = snap.data().balance || 0;
    if (bal < BM_LOOKUP_FEE) throw new Error("Недостатньо нікусів! Потрібно " + BM_LOOKUP_FEE + ".");
    tx.update(userRef, { balance: bal - BM_LOOKUP_FEE });
  });
}

async function getPlayerCodeByUsername(username) {
  const uSnap = await getDoc(doc(db, "usernames", username));
  if (!uSnap.exists()) throw new Error("Гравця не знайдено!");
  const uid = uSnap.data().uid;
  const pSnap = await getDoc(doc(db, "users", uid));
  if (!pSnap.exists()) throw new Error("Профіль не знайдено!");
  const code = pSnap.data().playerCode;
  if (!code) throw new Error("У цього гравця ще немає кодового ID (він жодного разу не заходив у чорний ринок).");
  return code;
}

async function getPlayerByCode(code) {
  const snap = await getDoc(doc(db, "playerCodes", String(code).trim()));
  if (!snap.exists()) throw new Error("Гравця з таким кодом не знайдено!");
  return snap.data(); // { uid, username }
}

// Купівля відмички — звичайний платний предмет в інвентарі.
async function buyLockpick(uid) {
  const userRef = doc(db, "users", uid);
  let item = null;
  await runTransaction(db, async (tx) => {
    const snap = await tx.get(userRef);
    if (!snap.exists()) throw new Error("Профіль не знайдено!");
    const bal = snap.data().balance || 0;
    if (bal < BM_LOCKPICK_PRICE) throw new Error("Недостатньо нікусів! Потрібно " + BM_LOCKPICK_PRICE + ".");
    const inv = [...(snap.data().inventory || [])];
    item = {
      id: "lp_" + Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
      type: "lockpick", name: "Відмичка", img: "img/lockpick.png",
      obtainedAt: Date.now(),
    };
    inv.push(item);
    tx.update(userRef, { balance: bal - BM_LOCKPICK_PRICE, inventory: inv });
  });
  return item;
}

// Платно блокує предмет у власному інвентарі на N діб (1..10). Достроково
// зняти блок не можна — саме в цьому й цінність платного захисту.
async function lockInventoryItem(uid, itemId, days) {
  if (!(Number.isInteger(days) && days >= 1 && days <= 10)) {
    throw new Error("Термін блоку — ціле число від 1 до 10 діб!");
  }
  const price = getItemLockPrice(days);
  const userRef = doc(db, "users", uid);
  let blockedUntil = null;
  await runTransaction(db, async (tx) => {
    const snap = await tx.get(userRef);
    if (!snap.exists()) throw new Error("Профіль не знайдено!");
    const data = snap.data();
    const bal  = data.balance || 0;
    if (bal < price) throw new Error("Недостатньо нікусів! Потрібно " + price + ".");
    const inv = [...(data.inventory || [])];
    const idx = inv.findIndex(i => i.id === itemId);
    if (idx === -1) throw new Error("Предмет не знайдено!");
    if (inv[idx].blockedUntil && inv[idx].blockedUntil > Date.now()) {
      throw new Error("Предмет вже заблокований!");
    }
    blockedUntil = Date.now() + days * 24 * 60 * 60 * 1000;
    inv[idx] = { ...inv[idx], blockedUntil, blockedDays: days };
    tx.update(userRef, { balance: bal - price, inventory: inv });
  });
  return blockedUntil;
}

// Знімок інвентаря жертви для крадіжки: лише незаблоковані предмети видно.
async function getRobberyTargetSnapshot(uid) {
  const snap = await getDoc(doc(db, "users", uid));
  if (!snap.exists()) throw new Error("Гравця не знайдено!");
  const data = snap.data();
  const now = Date.now();
  return {
    uid,
    username: data.username || "?",
    stealable: (data.inventory || []).filter(i => !(i.blockedUntil && i.blockedUntil > now)),
  };
}

// Списує одну відмичку з інвентаря грабіжника (після спроби, незалежно від результату).
async function consumeLockpick(uid, lockpickItemId) {
  const userRef = doc(db, "users", uid);
  await runTransaction(db, async (tx) => {
    const snap = await tx.get(userRef);
    if (!snap.exists()) throw new Error("Профіль не знайдено!");
    const inv = [...(snap.data().inventory || [])];
    const idx = inv.findIndex(i => i.id === lockpickItemId);
    if (idx === -1) return; // вже витрачено — нічого страшного
    inv.splice(idx, 1);
    tx.update(userRef, { inventory: inv });
  });
}

// Атомарно переносить один предмет з інвентаря жертви до грабіжника —
// повторно перевіряє, що предмет ще на місці й не заблокований (захист від гонок).
async function stealInventoryItem(thiefUid, victimUid, itemId) {
  const thiefRef  = doc(db, "users", thiefUid);
  const victimRef = doc(db, "users", victimUid);
  let stolenItemName = null;
  let victimCode = null;

  await runTransaction(db, async (tx) => {
    const thiefSnap  = await tx.get(thiefRef);
    const victimSnap = await tx.get(victimRef);
    if (!thiefSnap.exists() || !victimSnap.exists()) throw new Error("Профіль не знайдено!");

    const victimInv = [...(victimSnap.data().inventory || [])];
    const idx = victimInv.findIndex(i => i.id === itemId);
    if (idx === -1) throw new Error("Предмет вже недоступний!");
    const item = victimInv[idx];
    if (item.blockedUntil && item.blockedUntil > Date.now()) throw new Error("Предмет заблокований!");

    victimInv.splice(idx, 1);
    const thiefInv = [...(thiefSnap.data().inventory || [])];
    const newItem  = { ...item, id: "stolen_" + Date.now().toString(36) + Math.random().toString(36).slice(2, 6) };
    thiefInv.push(newItem);
    stolenItemName = item.name || "Предмет";
    victimCode = victimSnap.data().playerCode || null;

    tx.update(victimRef, { inventory: victimInv });
    tx.update(thiefRef,  { inventory: thiefInv });
  });

  return { stolenItemName, victimCode };
}

// 2. EXPORT — додати обидві функції:
export {
  db, auth,
  registerUser, loginUser, loginWithGoogle, saveUserData, logoutUser,
  listItemOnMarket, getMarketListings, subscribeMarket, removeMarketListing, buyMarketItem,
  sendTradeRequest, getMyTrades, updateTradeStatus, acceptTradeAndSwap,
  sendFriendRequest, acceptFriendRequest, declineFriendRequest,
  createClanDB, getClan, sendClanJoinRequest, acceptClanJoinRequest,
  declineClanJoinRequest, leaveClanDB, kickFromClanDB,
  clanVaultDeposit, clanVaultWithdraw,
  getUserProfile, getAllUsernames, onAuthStateChanged,
  sendClanMessage, subscribeClanChat,  // ← додати
  addNotification, getNotifications, subscribeNotifications, getUnreadNotificationsCount,
  markNotificationRead, markAllNotificationsRead, deleteNotification, clearAllNotifications,
  BOT_USERNAMES, BOT_BUY_INTERVAL_MS, BOT_MONTHLY_BUDGET,
  BOT_MAX_ITEMS_PER_CYCLE, BOT_RARITY_CYCLE_CAPS, BOT_SPECIAL_COOLDOWN_TICKS, BOT_RARITY_PRIORITY,
  isReservedBotUsername, ensureMarketBots, runMarketBotsTick,
  getMarketBotsState, subscribeMarketBotsState,
  adminSetBotsEnabled, adminSetBotDisabled, adminResetBotBuyTimer,
  adminTriggerMarketSweep, adminCollectBotBalance,
  getMarketItemPrices, subscribeMarketItemPrices,
  adminSetItemPriceRange, adminClearItemPriceRange,
  // Чорний ринок
  BM_LOCK_PRICE_PER_DAY, BM_LOOKUP_FEE, BM_LOCKPICK_PRICE,
  ensurePlayerCode, getItemLockPrice,
  blackMarketPayLookupFee, getPlayerCodeByUsername, getPlayerByCode,
  buyLockpick, lockInventoryItem, getRobberyTargetSnapshot,
  consumeLockpick, stealInventoryItem,
};