// ============================================
// FIREBASE ПІДКЛЮЧЕННЯ
// ============================================

// Імпорт Firebase
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.0/firebase-app.js";
import { getFirestore, doc, setDoc, getDoc, updateDoc, collection, query, onSnapshot } from "https://www.gstatic.com/firebasejs/10.7.0/firebase-firestore.js";
import { getAuth, createUserWithEmailAndPassword, signInWithEmailAndPassword, signOut } from "https://www.gstatic.com/firebasejs/10.7.0/firebase-auth.js";

// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyBR9jgqGiQMWCsSYOI6Wk3l7fCaloxJ-og",
  authDomain: "nicus-case-remake.firebaseapp.com",
  projectId: "nicus-case-remake",
  storageBucket: "nicus-case-remake.firebasestorage.app",
  messagingSenderId: "987703961569",
  appId: "1:987703961569:web:7083d376fb1b2af1d814a0"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Ініціалізація
const app  = initializeApp(firebaseConfig);
const db   = getFirestore(app);
const auth = getAuth(app);

// ============================================
// РЕЄСТРАЦІЯ
// ============================================
async function registerUser(email, password, username) {
  try {
    const userCred = await createUserWithEmailAndPassword(auth, email, password);
    const uid = userCred.user.uid;

    // Створюємо профіль гравця в Firestore
    await setDoc(doc(db, "users", uid), {
      username:  username,
      email:     email,
      balance:   100,        // стартовий баланс
      nikus:     0,
      inventory: [],
      level:     0,
      dosvid:    0,
      createdAt: Date.now()
    });

    alert("✅ Реєстрація успішна! Вітаємо, " + username);
    return uid;

  } catch (error) {
    alert("❌ Помилка: " + error.message);
    return null;
  }
}

// ============================================
// ВХІД
// ============================================
async function loginUser(email, password) {
  try {
    const userCred = await signInWithEmailAndPassword(auth, email, password);
    const uid = userCred.user.uid;

    // Завантажуємо дані гравця
    const snap = await getDoc(doc(db, "users", uid));
    if (snap.exists()) {
      const data = snap.data();
      // Встановлюємо глобальні змінні
      currentUser = data.username;
      balance     = data.balance;
      nikus       = data.nikus;
      inventory   = data.inventory;
      level       = data.level;
      dosvid      = data.dosvid;
    }

    return uid;

  } catch (error) {
    alert("❌ Невірний email або пароль");
    return null;
  }
}

// ============================================
// ЗБЕРЕЖЕННЯ ДАНИХ
// ============================================
async function saveDataOnline() {
  const user = auth.currentUser;
  if (!user) return;

  try {
    await updateDoc(doc(db, "users", user.uid), {
      balance:   balance,
      nikus:     nikus,
      inventory: inventory,
      level:     level,
      dosvid:    dosvid,
      lastSeen:  Date.now()
    });
  } catch (error) {
    console.error("Помилка збереження:", error);
  }
}

// ============================================
// РИНОК — виставити предмет
// ============================================
async function listItemOnMarket(item, price) {
  const user = auth.currentUser;
  if (!user) return;

  const listingId = Date.now().toString();
  await setDoc(doc(db, "market", listingId), {
    sellerId:   user.uid,
    sellerName: currentUser,
    item:       item,
    price:      price,
    listedAt:   Date.now()
  });

  alert("✅ Предмет виставлено на ринок!");
}

// ============================================
// РИНОК — купити предмет
// ============================================
async function buyFromMarket(listingId, price) {
  const user = auth.currentUser;
  if (!user) return;

  if (balance < price) {
    alert("❌ Недостатньо нікусів!");
    return;
  }

  // Тут потрібна транзакція (додамо пізніше)
  balance -= price;
  await saveDataOnline();
  alert("✅ Куплено!");
}

// ============================================
// ВИХІД
// ============================================
async function logoutUser() {
  await saveDataOnline();
  await signOut(auth);
  currentUser = null;
  balance     = 0;
  inventory   = [];
  loginScreen();
}

export { 
  db, auth,
  registerUser, loginUser, 
  saveDataOnline, logoutUser,
  listItemOnMarket, buyFromMarket
};
