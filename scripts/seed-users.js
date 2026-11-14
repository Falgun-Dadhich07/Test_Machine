/**
 * Batch Account Provisioning Script
 * Reads candidates from candidates.json and registers them into Firebase Auth & Firestore.
 *
 * Usage:
 *   node scripts/seed-users.js
 */

const fs = require("fs");
const path = require("path");
const { initializeApp } = require("firebase/app");
const { getAuth, createUserWithEmailAndPassword } = require("firebase/auth");
const { getFirestore, doc, setDoc } = require("firebase/firestore");

// Simple native .env.local parser (no external dotenv package required)
const envPath = path.join(__dirname, "..", ".env.local");
const envConfig = {};
if (fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, "utf-8");
  envContent.split(/\r?\n/).forEach((line) => {
    const trimmed = line.trim();
    if (trimmed && !trimmed.startsWith("#")) {
      const idx = trimmed.indexOf("=");
      if (idx !== -1) {
        const key = trimmed.substring(0, idx).trim();
        const val = trimmed.substring(idx + 1).trim();
        envConfig[key] = val;
      }
    }
  });
}

const firebaseConfig = {
  apiKey: envConfig.NEXT_PUBLIC_FIREBASE_API_KEY || process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: envConfig.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN || process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: envConfig.NEXT_PUBLIC_FIREBASE_PROJECT_ID || process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: envConfig.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET || process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: envConfig.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID || process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: envConfig.NEXT_PUBLIC_FIREBASE_APP_ID || process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

if (!firebaseConfig.apiKey) {
  console.error("Error: NEXT_PUBLIC_FIREBASE_API_KEY not found in .env.local!");
  process.exit(1);
}

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

async function main() {
  const jsonPath = path.join(__dirname, "..", "candidates.json");

  if (!fs.existsSync(jsonPath)) {
    console.error("No candidates.json file found!");
    process.exit(1);
  }

  const candidates = JSON.parse(fs.readFileSync(jsonPath, "utf-8"));
  console.log(`Starting account provisioning for ${candidates.length} candidates...`);

  let success = 0;
  let skipped = 0;
  let failed = 0;

  for (let i = 0; i < candidates.length; i++) {
    const c = candidates[i];
    try {
      const userCredential = await createUserWithEmailAndPassword(auth, c.email.trim(), c.password.toString());
      const uid = userCredential.user.uid;

      await setDoc(doc(db, "user", uid), {
        email: c.email.trim(),
        username: c.username || c.email.split("@")[0],
        roleNumber: c.roleNumber || c.password.toString(),
        createdAt: new Date().toISOString(),
        uid: uid,
        isPreRegistered: true,
      });

      success++;
      console.log(`[${i + 1}/${candidates.length}] Created: ${c.email}`);
    } catch (err) {
      if (err.code === "auth/email-already-in-use") {
        console.log(`[${i + 1}/${candidates.length}] Already exists: ${c.email}`);
        skipped++;
      } else {
        console.error(`[${i + 1}/${candidates.length}] Failed ${c.email}:`, err.message);
        failed++;
      }
    }
    // Small polite pause to avoid hitting aggressive burst rate limits
    await new Promise((r) => setTimeout(r, 80));
  }

  console.log(`\n========================================`);
  console.log(`Done! Created: ${success}, Already Registered: ${skipped}, Failed: ${failed}`);
  console.log(`========================================`);
  process.exit(0);
}

main().catch(console.error);
