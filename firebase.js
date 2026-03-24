// ============================================
// FIREBASE ПІДКЛЮЧЕННЯ — НІКУС КЕЙС РЕМЕЙК
// ============================================

import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.0/firebase-app.js";
import {
  getFirestore, doc, setDoc, getDoc, updateDoc,
  collection, getDocs, addDoc, deleteDoc, query,
  orderBy, onSnapshot, serverTimestamp, where, runTransaction
} from "https://www.gstatic.com/firebasejs/10.7.0/firebase-firestore.js";
import {
  getAuth,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  GoogleAuthProvider,
  signInWithPopup,
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
    username, email,
    balance: 100, inventory: [], level: 1, xp: 0,
    friends: [], clan: null, banned: false,
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
    friends: gameState.friends, clan: gameState.clan,
    lastSeen: Date.now(),
  });
}

// ── РИНОК ───────────────────────────────────

async function listItemOnMarket(uid, username, item, price) {
  const ref = await addDoc(collection(db, "market"), {
    sellerId: uid, sellerName: username,
    item, price, listedAt: serverTimestamp(),
  });
  return ref.id;
}

async function getMarketListings() {
  const snap = await getDocs(query(collection(db, "market"), orderBy("listedAt", "desc")));
  return snap.docs.map(d => ({ docId: d.id, ...d.data() }));
}

async function removeMarketListing(docId) {
  await deleteDoc(doc(db, "market", docId));
}

// ФІКС: транзакція — атомарно переводимо гроші продавцю і видаляємо лот
async function buyMarketItem(buyerUid, buyerGameState, listing) {
  if (buyerUid === listing.sellerId) throw new Error("Не можна купити свій предмет!");
  if ((buyerGameState.balance ?? 0) < listing.price) throw new Error("Недостатньо нікусів!");

  await runTransaction(db, async (tx) => {
    const listingRef = doc(db, "market", listing.docId);
    const listingSnap = await tx.get(listingRef);
    if (!listingSnap.exists()) throw new Error("Лот вже не існує!");

    const sellerRef  = doc(db, "users", listing.sellerId);
    const sellerSnap = await tx.get(sellerRef);
    const sellerBal  = sellerSnap.exists() ? (sellerSnap.data().balance || 0) : 0;

    const buyerRef  = doc(db, "users", buyerUid);
    const buyerSnap = await tx.get(buyerRef);
    if (!buyerSnap.exists()) throw new Error("Профіль покупця не знайдено!");
    const buyerBal = buyerSnap.data().balance ?? 0;
    if (buyerBal < listing.price) throw new Error("Недостатньо нікусів!");

    const buyerInv = [...(buyerSnap.data().inventory || [])];
    const newItem = { ...listing.item, id: listing.item.id || ('m_' + Date.now().toString(36)), obtainedAt: Date.now() };
    buyerInv.push(newItem);

    tx.update(sellerRef, { balance: sellerBal + listing.price });
    tx.update(buyerRef,  { balance: buyerBal - listing.price, inventory: buyerInv });
    tx.delete(listingRef);

    // повертаємо новий предмет щоб оновити локальний стан
    return newItem;
  });
}

// ── ТРЕЙДИ ──────────────────────────────────

async function sendTradeRequest(fromUid, fromUsername, toUsername, offerItems, wantItems) {
  const usernameSnap = await getDoc(doc(db, "usernames", toUsername));
  if (!usernameSnap.exists()) throw new Error("Гравця не знайдено!");
  const toUid = usernameSnap.data().uid;

  const ref = await addDoc(collection(db, "trades"), {
    fromUid, fromUsername, toUid, toUsername,
    offerItems, wantItems,
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
  recvSnap.docs.forEach(d => trades.push({ docId: d.id, ...d.data() }));
  return trades;
}

// ФІКС: реальний обмін предметами при підтвердженні трейду
async function acceptTradeAndSwap(docId, receiverUid) {
  await runTransaction(db, async (tx) => {
    const tradeRef  = doc(db, "trades", docId);
    const tradeSnap = await tx.get(tradeRef);
    if (!tradeSnap.exists()) throw new Error("Трейд не знайдено!");
    const trade = tradeSnap.data();
    if (trade.status !== "pending") throw new Error("Трейд вже не активний!");

    const senderRef  = doc(db, "users", trade.fromUid);
    const receiverRef = doc(db, "users", trade.toUid);
    const [sSnap, rSnap] = await Promise.all([tx.get(senderRef), tx.get(receiverRef)]);

    const sInv = [...(sSnap.data()?.inventory || [])];
    const rInv = [...(rSnap.data()?.inventory || [])];

    // Перевіряємо що відправник ще має предмети
    for (const offItem of (trade.offerItems || [])) {
      const idx = sInv.findIndex(i => i.id === offItem.id);
      if (idx === -1) throw new Error("Відправник більше не має предмет: " + offItem.name);
    }

    // Перевіряємо що отримувач ще має предмети (якщо wantItems мають id)
    for (const wantItem of (trade.wantItems || [])) {
      if (!wantItem.id) continue;
      const idx = rInv.findIndex(i => i.id === wantItem.id);
      if (idx === -1) throw new Error("Ти більше не маєш предмет: " + wantItem.name);
    }

    // Переміщуємо offerItems від sender до receiver
    for (const offItem of (trade.offerItems || [])) {
      const idx = sInv.findIndex(i => i.id === offItem.id);
      if (idx !== -1) sInv.splice(idx, 1);
      rInv.push({ ...offItem, obtainedAt: Date.now() });
    }

    // Переміщуємо wantItems від receiver до sender (якщо мають id)
    for (const wantItem of (trade.wantItems || [])) {
      if (!wantItem.id) continue;
      const idx = rInv.findIndex(i => i.id === wantItem.id);
      if (idx !== -1) rInv.splice(idx, 1);
      sInv.push({ ...wantItem, obtainedAt: Date.now() });
    }

    tx.update(senderRef,  { inventory: sInv });
    tx.update(receiverRef, { inventory: rInv });
    tx.update(tradeRef, { status: "confirmed" });
  });
}

async function updateTradeStatus(docId, status) {
  await updateDoc(doc(db, "trades", docId), { status });
}

// ── ПРОФІЛЬ ГРАВЦЯ ─────────────────────────

async function getUserProfile(username) {
  const usernameSnap = await getDoc(doc(db, "usernames", username));
  if (!usernameSnap.exists()) throw new Error("Гравця не знайдено!");
  const uid = usernameSnap.data().uid;
  const snap = await getDoc(doc(db, "users", uid));
  if (!snap.exists()) throw new Error("Профіль не знайдено!");
  return { uid, ...snap.data() };
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
    friends: [], clan: null, banned: false,
    createdAt: Date.now(), lastSeen: Date.now(),
  };

  await setDoc(doc(db, "users", uid), newUser);
  await setDoc(doc(db, "usernames", username), { uid });
  return { uid, ...newUser };
}

// ── СПИСОК ГРАВЦІВ ──────────────────────────

async function getAllUsernames() {
  const snap = await getDocs(collection(db, "usernames"));
  return snap.docs.map(d => d.id);
}

export {
  db, auth,
  registerUser, loginUser, loginWithGoogle, saveUserData, logoutUser,
  listItemOnMarket, getMarketListings, removeMarketListing, buyMarketItem,
  sendTradeRequest, getMyTrades, updateTradeStatus, acceptTradeAndSwap,
  getUserProfile, getAllUsernames, onAuthStateChanged,
};