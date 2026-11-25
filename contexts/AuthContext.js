"use client";
import { createContext, useContext, useEffect, useState } from "react";
import { auth, db } from "../firebase-config";
import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
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
    const sessionUser = {
      email: cleanEmail,
      uid: candidate?.roleNumber
        ? `cand_${candidate.roleNumber}`
        : `cand_${cleanEmail.replace(/[^a-z0-9]/gi, "_")}`,
      username: candidate?.username || cleanEmail.split("@")[0],
      isAdmin: !!candidate?.isAdmin,
      isServerVerified: true,
    };

    if (typeof window !== "undefined") {
      sessionStorage.setItem("candidate_email", cleanEmail);
      sessionStorage.setItem("verified_session_user", JSON.stringify(sessionUser));
    }

    // 2. Try Firebase Auth on student's device; fall back seamlessly to server-verified session
    // if user exists with an old password, anonymous auth is disabled, or campus IP hits rate limits.
    if (auth) {
      try {
        return await signInWithEmailAndPassword(auth, cleanEmail, cleanPass);
      } catch (signInErr) {
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
            console.warn("Firebase Auth provisioning fallback to server-verified session:", createErr.code || createErr.message);
          }
        } else {
          console.warn("Firebase Auth sign-in fallback to server-verified session:", signInErr.code || signInErr.message);
        }

        // Server already verified credentials via /api/auth/candidate-login
        setCurrentUser(sessionUser);
        return { user: sessionUser };
      }
    } else {
      setCurrentUser(sessionUser);
      return { user: sessionUser };
    }
  }

  function logout() {
    if (typeof window !== "undefined") {
      sessionStorage.removeItem("candidate_email");
      sessionStorage.removeItem("verified_session_user");
    }
    if (!auth) {
      setCurrentUser(null);
      return Promise.resolve();
    }
    return signOut(auth)
      .catch(() => {})
      .finally(() => setCurrentUser(null));
  }

  useEffect(() => {
    const getStoredSessionUser = () => {
      if (typeof window === "undefined") return null;
      try {
        const raw = sessionStorage.getItem("verified_session_user");
        return raw ? JSON.parse(raw) : null;
      } catch {
        return null;
      }
    };

    if (!auth) {
      setCurrentUser(getStoredSessionUser());
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
            setCurrentUser(getStoredSessionUser());
          }
          setLoading(false);
        },
        (error) => {
          console.warn("Auth state changed error:", error);
          setCurrentUser(getStoredSessionUser());
          setLoading(false);
        }
      );

      return unsubscribe;
    } catch (e) {
      console.warn("Failed to subscribe to auth state:", e);
      setCurrentUser(getStoredSessionUser());
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
