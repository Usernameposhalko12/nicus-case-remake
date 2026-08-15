// ============================================
// FIREBASE — НІКУС КЕЙС РЕМЕЙК
// ============================================

import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.0/firebase-app.js";

// 1. ІМПОРТ — прибрати sendClanMessage і subscribeClanChat:
import {
  getFirestore, doc, setDoc, getDoc, updateDoc,
  collection, getDocs, addDoc, deleteDoc, query,
  orderBy, onSnapshot, serverTimestamp, where, runTransaction
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

// Орієнтовна "ринкова ціна" для лота: середня ціна серед інших активних лотів
// того ж рівня рідкості (rarity); якщо таких немає — середня по всьому ринку
// (виключаючи сам лот); якщо і таких немає (лот єдиний на всьому ринку) —
// повертає null, і бот такий лот не купує (нема з чим порівнювати).
// ВАЖЛИВО: сам лот НІКОЛИ не враховується у своїй же довідковій ціні —
// інакше умова "на 25% нижче ринку" ніколи б не виконувалась для унікальних
// лотів (а саме так найчастіше і буває на невеликому ринку).
function _computeRefPrice(allListings, target) {
  const rarity = target.item?.rarity;
  const sameRarityOthers = allListings.filter(l => l.docId !== target.docId && l.item?.rarity === rarity);
  if (sameRarityOthers.length) {
    return sameRarityOthers.reduce((a, b) => a + b.price, 0) / sameRarityOthers.length;
  }
  const allOthers = allListings.filter(l => l.docId !== target.docId);
  if (allOthers.length) {
    return allOthers.reduce((a, b) => a + b.price, 0) / allOthers.length;
  }
  return null;
}

// Атомарна купівля лоту ботом: продавцю зараховується оплата (мінус 10%
// комісії ринку), а предмет потрапляє в інвентар бота (як звичайна покупка).
async function _buyListingAsBot(bot, listing) {
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

    const botRef  = doc(db, "users", bot.uid);
    const botSnap = await tx.get(botRef);
    const botInv  = [...(botSnap.exists() ? (botSnap.data().inventory || []) : [])];
    const item    = liveData.item;
    const newItem = { ...item, id: item?.id || ('bot_' + Date.now().toString(36)), obtainedBy: bot.username };
    botInv.push(newItem);

    const payout = Math.round(liveData.price * (1 - MARKET_COMMISSION));

    tx.update(sellerRef, { balance: sellerBal + payout });
    tx.update(botRef,    { inventory: botInv });
    tx.delete(listingRef);

    notifyPayload = {
      sellerId: liveData.sellerId,
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
  }
}

// Звичайний цикл: кожен бот здійснює максимум 1 покупку за тік —
// лот, ціна якого мінімум на 25% нижче орієнтовної ринкової ціни цього предмета.
async function _botsBuyCycle() {
  for (const name of BOT_USERNAMES) {
    try {
      const uid = "bot_" + name;
      const snap = await getDoc(doc(db, "users", uid));
      if (!snap.exists()) continue;
      let bot = await _ensureBotMonthlyBudget({ uid, username: name, ...snap.data() });
      if (bot.balance <= 0) continue;

      const fresh = await getMarketListings();
      const own = fresh.filter(l => l.sellerId !== uid);
      if (!own.length) continue;

      const candidates = own
        .map(l => ({ l, ref: _computeRefPrice(own, l) }))
        .filter(x => x.ref != null && x.l.price <= x.ref * (1 - BOT_DISCOUNT_RATIO) && x.l.price <= bot.balance)
        .sort((a, b) => a.l.price - b.l.price);

      if (!candidates.length) continue;
      const target = candidates[0].l;
      await _buyListingAsBot(bot, target);
      await updateDoc(doc(db, "users", uid), { balance: bot.balance - target.price, lastSeen: Date.now() });
    } catch (e) { console.warn("Помилка бота-покупця:", name, e); }
  }
}

// Щонедільна "зачистка ринку": боти скуповують ВСІ лоти, що залишились
// (незалежно від знижки), у межах свого місячного бюджету, від найдешевших.
async function _botsMarketSweep() {
  const listings = (await getMarketListings()).sort((a, b) => a.price - b.price);
  if (!listings.length) return;

  const bots = [];
  for (const name of BOT_USERNAMES) {
    const uid = "bot_" + name;
    const snap = await getDoc(doc(db, "users", uid));
    if (!snap.exists()) continue;
    bots.push(await _ensureBotMonthlyBudget({ uid, username: name, ...snap.data() }));
  }
  if (!bots.length) return;

  for (const listing of listings) {
    const buyer = bots.find(b => b.uid !== listing.sellerId && b.balance >= listing.price);
    if (!buyer) continue;
    await _buyListingAsBot(buyer, listing);
    buyer.balance -= listing.price;
    await updateDoc(doc(db, "users", buyer.uid), { balance: buyer.balance, lastSeen: Date.now() });
  }
}

// Головна точка входу — викликати періодично (напр. кожні 60 сек) з клієнта.
// Сама розбирається, чи настав час для покупки ботів (раз на 30 хв) і чи
// настала неділя для тижневої зачистки ринку. Захищена від дублювання
// одночасних тіків з різних вкладок/користувачів через транзакцію-замок
// у документі system/marketBots.
async function runMarketBotsTick() {
  await ensureMarketBots();

  const stateRef = doc(db, "system", "marketBots");
  const now = Date.now();

  let claimedBuy = false;
  try {
    await runTransaction(db, async (tx) => {
      const snap = await tx.get(stateRef);
      const data = snap.exists() ? snap.data() : {};
      if (now - (data.lastTick || 0) < BOT_BUY_INTERVAL_MS) return;
      tx.set(stateRef, { lastTick: now }, { merge: true });
      claimedBuy = true;
    });
  } catch (e) { /* хтось інший вже тримає лок — пропускаємо */ }

  if (claimedBuy) await _botsBuyCycle();

  const today = new Date();
  if (today.getDay() === 0) { // неділя
    const dayKey = today.toISOString().slice(0, 10);
    let claimedSweep = false;
    try {
      await runTransaction(db, async (tx) => {
        const snap = await tx.get(stateRef);
        const data = snap.exists() ? snap.data() : {};
        if (data.lastSweepDay === dayKey) return;
        tx.set(stateRef, { lastSweepDay: dayKey }, { merge: true });
        claimedSweep = true;
      });
    } catch (e) {}
    if (claimedSweep) await _botsMarketSweep();
  }
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
  BOT_USERNAMES, isReservedBotUsername, ensureMarketBots, runMarketBotsTick,
};