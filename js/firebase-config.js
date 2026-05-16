import { initializeApp } from "https://www.gstatic.com/firebasejs/10.13.2/firebase-app.js";
import { ENV } from "./env.js";
import {
  getAuth, onAuthStateChanged, signInWithEmailAndPassword,
  createUserWithEmailAndPassword, signOut, GoogleAuthProvider,
  signInWithPopup, updateProfile
} from "https://www.gstatic.com/firebasejs/10.13.2/firebase-auth.js";
import {
  getFirestore, doc, getDoc, setDoc, updateDoc, addDoc, getDocs,
  collection, query, where, orderBy, limit, serverTimestamp, increment, deleteDoc, writeBatch
} from "https://www.gstatic.com/firebasejs/10.13.2/firebase-firestore.js";
import {
  getStorage, ref, uploadBytes, getDownloadURL
} from "https://www.gstatic.com/firebasejs/10.13.2/firebase-storage.js";

const firebaseConfig = {
  apiKey: ENV.FIREBASE_API_KEY,
  authDomain: "devcheck-90ae1.firebaseapp.com",
  projectId: "devcheck-90ae1",
  storageBucket: "devcheck-90ae1.firebasestorage.app",
  messagingSenderId: "904786975787",
  appId: "1:904786975787:web:40860f4711cfc20d22de6e",
  measurementId: "G-VX979B4HDB"
};

export const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);
export const googleProvider = new GoogleAuthProvider();

export {
  onAuthStateChanged, signInWithEmailAndPassword, createUserWithEmailAndPassword,
  signOut, signInWithPopup, updateProfile,
  doc, getDoc, setDoc, updateDoc, addDoc, getDocs, deleteDoc, writeBatch,
  collection, query, where, orderBy, limit, serverTimestamp, increment,
  ref, uploadBytes, getDownloadURL
};

// Ensure a user profile doc exists in Firestore
export async function ensureUserProfile(user) {
  const ref = doc(db, "users", user.uid);
  const snap = await getDoc(ref);
  if (!snap.exists()) {
    await setDoc(ref, {
      uid: user.uid,
      displayName: user.displayName || user.email.split("@")[0],
      email: user.email,
      photoURL: user.photoURL || "",
      bio: "",
      handle: (user.email.split("@")[0]).toLowerCase().replace(/[^a-z0-9]/g, ""),
      points: 0,
      bugsResolved: 0,
      shoutouts: 0,
      createdAt: serverTimestamp()
    });
  }
  return (await getDoc(ref)).data();
}
