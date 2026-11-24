"use client";
import { createContext, useContext, useEffect, useState } from "react";
import { auth, db } from "../firebase-config";
import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signInAnonymously,
  signOut,
  onAuthStateChanged,
} from "firebase/auth";
import { doc, setDoc } from "firebase/firestore";

const AuthContext = createContext();

export function useAuth() {
  return useContext(AuthContext);
}

export function AuthProvider({ children }) {
  const [currentUser, setCurrentUser] = useState(null);
  const [loading, setLoading] = useState(true);

  function signup(email, password) {
    if (!auth) throw new Error("Firebase Auth is not initialized. Please configure your Firebase credentials.");
    return createUserWithEmailAndPassword(auth, email, password);
  }

  async function login(email, password) {
    const cleanEmail = email.trim();
    const cleanPass = password.toString().trim();

    // 1. Verify candidate roster via server endpoint
    const verifyRes = await fetch("/api/auth/candidate-login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: cleanEmail, password: cleanPass }),
    });

    if (!verifyRes.ok) {
      const errData = await verifyRes.json();
      throw new Error(errData.error || "Access Denied: You are not authorized to take this examination.");
    }

    const { candidate } = await verifyRes.json();
    if (typeof window !== "undefined") {
      sessionStorage.setItem("candidate_email", cleanEmail);
    }

    // 2. Sign in or initialize on-the-fly in Firebase Auth on student's device
    if (auth) {
      try {
        return await signInWithEmailAndPassword(auth, cleanEmail, cleanPass);
      } catch (signInErr) {
        // If candidate exists in roster but not yet created in Firebase Auth, auto-provision on first sign-in
        if (
          signInErr.code === "auth/user-not-found" ||
          signInErr.code === "auth/invalid-credential" ||
          signInErr.code === "auth/wrong-password"
        ) {
          try {
            const newCred = await createUserWithEmailAndPassword(auth, cleanEmail, cleanPass);
            if (db && newCred.user) {
              await setDoc(doc(db, "user", newCred.user.uid), {
                email: cleanEmail,
                username: candidate.username || cleanEmail.split("@")[0],
                roleNumber: candidate.roleNumber || cleanPass,
                createdAt: new Date().toISOString(),
                uid: newCred.user.uid,
                isPreRegistered: true,
              });
            }
            return newCred;
          } catch (createErr) {
            console.warn("First-time candidate provisioning note:", createErr);
            if (
              createErr.code === "auth/email-already-in-use" ||
              createErr.code === "auth/invalid-credential"
            ) {
              try {
                // If candidate previously had a different password in Firebase Auth, authenticate anonymously for this session
                const anonCred = await signInAnonymously(auth);
                const effectiveUser = {
                  ...anonCred.user,
                  email: cleanEmail,
                  uid: anonCred.user.uid,
                };
                setCurrentUser(effectiveUser);
                return anonCred;
              } catch (anonErr) {
                console.warn("Anonymous auth fallback note:", anonErr);
              }
            }
            throw signInErr;
          }
        }
        throw signInErr;
      }
    } else {
      // Local fallback if Firebase Auth is offline
      const mockUser = {
        email: cleanEmail,
        uid: "local_" + Date.now(),
      };
      setCurrentUser(mockUser);
      return { user: mockUser };
    }
  }

  function logout() {
    if (typeof window !== "undefined") {
      sessionStorage.removeItem("candidate_email");
    }
    if (!auth) {
      setCurrentUser(null);
      return Promise.resolve();
    }
    return signOut(auth).then(() => setCurrentUser(null));
  }

  useEffect(() => {
    if (!auth) {
      setLoading(false);
      return;
    }

    try {
      const unsubscribe = onAuthStateChanged(
        auth,
        (user) => {
          if (user) {
            const savedEmail =
              typeof window !== "undefined"
                ? sessionStorage.getItem("candidate_email")
                : null;
            const effectiveUser = {
              ...user,
              email: user.email || savedEmail || "candidate@iitk.ac.in",
            };
            setCurrentUser(effectiveUser);
          } else {
            setCurrentUser(null);
          }
          setLoading(false);
        },
        (error) => {
          console.warn("Auth state changed error:", error);
          setLoading(false);
        }
      );

      return unsubscribe;
    } catch (e) {
      console.warn("Failed to subscribe to auth state:", e);
      setLoading(false);
    }
  }, []);

  const value = {
    currentUser,
    login,
    signup,
    logout,
  };

  return (
    <AuthContext.Provider value={value}>
      {!loading && children}
    </AuthContext.Provider>
  );
}
