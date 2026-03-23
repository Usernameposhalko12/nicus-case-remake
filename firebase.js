// ============================================
// FIREBASE ПІДКЛЮЧЕННЯ — НІКУС КЕЙС РЕМЕЙК
// ============================================

import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.0/firebase-app.js";
import {
  getFirestore, doc, setDoc, getDoc, updateDoc,
  collection, getDocs, addDoc, deleteDoc, query,
  orderBy, onSnapshot, serverTimestamp, where
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
  // Перевірка унікальності нікнейму
  const usernameDoc = await getDoc(doc(db, "usernames", username));
  if (usernameDoc.exists()) {
    throw new Error("Цей нікнейм вже зайнятий!");
  }

  const userCred = await createUserWithEmailAndPassword(auth, email, password);
  const uid = userCred.user.uid;

  const newUser = {
    username:  username,
    email:     email,
    balance:   100,
    inventory: [],
    level:     1,
    xp:        0,
    friends:   [],
    clan:      null,
    banned:    false,
    createdAt: Date.now(),
    lastSeen:  Date.now(),
  };

  await setDoc(doc(db, "users", uid), newUser);
  // Резервуємо нікнейм
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
    balance:   gameState.balance,
    inventory: gameState.inventory,
    level:     gameState.level,
    xp:        gameState.xp,
    friends:   gameState.friends,
    clan:      gameState.clan,
    lastSeen:  Date.now(),
  });
}

// ── РИНОК ───────────────────────────────────

async function listItemOnMarket(uid, username, item, price) {
  const ref = await addDoc(collection(db, "market"), {
    sellerId:   uid,
    sellerName: username,
    item:       item,
    price:      price,
    listedAt:   serverTimestamp(),
  });
  return ref.id;
}

async function getMarketListings() {
  const snap = await getDocs(
    query(collection(db, "market"), orderBy("listedAt", "desc"))
  );
  return snap.docs.map(d => ({ docId: d.id, ...d.data() }));
}

async function removeMarketListing(docId) {
  await deleteDoc(doc(db, "market", docId));
}

async function buyMarketItem(buyerUid, buyerState, listing) {
  // Зараховуємо продавцю
  const sellerSnap = await getDoc(doc(db, "users", listing.sellerId));
  if (sellerSnap.exists()) {
    const seller = sellerSnap.data();
    await updateDoc(doc(db, "users", listing.sellerId), {
      balance: (seller.balance || 0) + listing.price,
    });
  }
  // Видаляємо лот
  await deleteDoc(doc(db, "market", listing.docId));
}

// ── ТРЕЙДИ ──────────────────────────────────

async function sendTradeRequest(fromUid, fromUsername, toUsername, offerItems, wantItems) {
  // Знаходимо uid отримувача
  const usernameSnap = await getDoc(doc(db, "usernames", toUsername));
  if (!usernameSnap.exists()) throw new Error("Гравця не знайдено!");
  const toUid = usernameSnap.data().uid;

  const ref = await addDoc(collection(db, "trades"), {
    fromUid,
    fromUsername,
    toUid,
    toUsername,
    offerItems,
    wantItems,
    status:    "pending",
    createdAt: serverTimestamp(),
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

async function updateTradeStatus(docId, status) {
  await updateDoc(doc(db, "trades", docId), { status });
}

// ── ВИХІД ───────────────────────────────────

async function logoutUser() {
  await signOut(auth);
}

// ── GOOGLE SIGN-IN ──────────────────────────

async function loginWithGoogle(askUsername) {
  const provider = new GoogleAuthProvider();
  const userCred = await signInWithPopup(auth, provider);
  const uid      = userCred.user.uid;

  const snap = await getDoc(doc(db, "users", uid));
  if (snap.exists()) {
    const data = snap.data();
    if (data.banned) throw new Error("Акаунт заблокований!");
    return { uid, ...data };
  }

  // Новий юзер — питаємо нікнейм
  const username = await askUsername();
  if (!username) throw new Error("Нікнейм обов'язковий!");

  const usernameDoc = await getDoc(doc(db, "usernames", username));
  if (usernameDoc.exists()) throw new Error("Цей нікнейм вже зайнятий!");

  const newUser = {
    username,
    email:     userCred.user.email || "",
    balance:   100,
    inventory: [],
    level:     1,
    xp:        0,
    friends:   [],
    clan:      null,
    banned:    false,
    createdAt: Date.now(),
    lastSeen:  Date.now(),
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
  sendTradeRequest, getMyTrades, updateTradeStatus,
  getAllUsernames,
  onAuthStateChanged,
};