import { initializeApp, getApps, deleteApp } from "firebase/app";
import { getAuth, createUserWithEmailAndPassword } from "firebase/auth";
import { db } from "../../../firebase-config";
import { doc, setDoc } from "firebase/firestore";

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const { email, password, username, roleNumber, dateOfBirth, phoneNumber } = req.body;

  if (!email || !password) {
    return res.status(400).json({ error: "Email and password are required" });
  }

  // Use a temporary isolated Firebase App instance so it never overrides active session
  const tempAppName = `ImportWorker_${Date.now()}_${Math.random()}`;
  let tempApp = null;

  try {
    tempApp = initializeApp(firebaseConfig, tempAppName);
    const tempAuth = getAuth(tempApp);

    // Create candidate account in Firebase Authentication
    const credential = await createUserWithEmailAndPassword(tempAuth, email.trim(), password);
    const uid = credential.user.uid;

    // Create corresponding profile in Firestore 'user' collection
    await setDoc(doc(db, "user", uid), {
      email: email.trim(),
      username: username?.trim() || email.split("@")[0],
      roleNumber: roleNumber || Math.floor(100000 + Math.random() * 900000).toString(),
      dateOfBirth: dateOfBirth || "2000-01-01",
      phoneNumber: phoneNumber || "0000000000",
      createdAt: new Date().toISOString(),
      uid: uid,
      isPreRegistered: true,
    });

    return res.status(200).json({
      success: true,
      uid,
      email: email.trim(),
    });
  } catch (err) {
    if (err.code === "auth/email-already-in-use") {
      return res.status(200).json({
        success: true,
        alreadyExists: true,
        email: email.trim(),
        message: "User already registered in Firebase Auth.",
      });
    }
    return res.status(400).json({
      success: false,
      error: err.message || "Failed to create user",
    });
  } finally {
    if (tempApp) {
      try {
        await deleteApp(tempApp);
      } catch (e) {
        // cleanup ignore
      }
    }
  }
}
