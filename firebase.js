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

// ── РЕЄСТРАЦІЯ ─────────────────────────────

async function registerUser(username, email, password) {
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

    // Атомарно: списуємо у покупця, нараховуємо продавцю, видаляємо лот
    tx.update(sellerRef, { balance: sellerBal + price });
    tx.update(buyerRef,  { balance: buyerBal - price, inventory: buyerInv });
    tx.delete(listingRef);
  });

  return boughtItem;
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
   let taken = null;  // ← оголошуємо перед if/else

if (type === "balance") {
  if (vault.balance < amount) throw new Error("В общаку недостатньо нікусів!");
  vault.balance -= amount;
  tx.update(userRef, { balance: (user.balance || 0) + amount });
} else {
  const idx = vault.inventory.findIndex(i => i.id === itemId);
  if (idx === -1) throw new Error("Предмет не знайдено в общаку!");
  taken = vault.inventory.splice(idx, 1)[0];  // ← присвоюємо, не const
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
  itemName: type === "item" ? (taken?.name || "Предмет") : null,  // ← тепер taken доступна
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
    const user  = uSnap.data();
    if (type === "balance") {
      if (vault.balance < amount) throw new Error("В общаку недостатньо нікусів!");
      vault.balance -= amount;
      tx.update(userRef, { balance: (user.balance || 0) + amount });
    } else {
      const idx = vault.inventory.findIndex(i => i.id === itemId);
      if (idx === -1) throw new Error("Предмет не знайдено в общаку!");
      const taken = vault.inventory.splice(idx, 1)[0];
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
};