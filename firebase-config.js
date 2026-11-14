import { initializeApp, getApps, getApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY || "AIzaSyFakeKeyForBuildingWithoutCrash12",
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN || "open-proctor.firebaseapp.com",
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || "open-proctor",
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET || "open-proctor.appspot.com",
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID || "1234567890",
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID || "1:1234567890:web:abcdef123456",
  measurementId: process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID || ""
};

// Initialize Firebase (safeguard against duplicate app initialization in Next.js fast refresh)
const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();

export const auth = typeof window !== "undefined" || process.env.NEXT_PUBLIC_FIREBASE_API_KEY
  ? getAuth(app)
  : null;

export const db = getFirestore(app);
export const storage = process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET
  ? getStorage(app)
  : null;
export default app;
