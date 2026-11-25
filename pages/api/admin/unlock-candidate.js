import fs from "fs";
import path from "path";
import { db } from "../../../firebase-config";
import {
  collection,
  query,
  where,
  getDocs,
  doc,
  deleteDoc,
} from "firebase/firestore";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const { email, resultId } = req.body || {};
  if (!email && !resultId) {
    return res.status(400).json({ error: "Missing required field: email or resultId" });
  }

  const cleanEmail = (email || "").toString().trim().toLowerCase();
  const rawEmail = (email || "").toString().trim();
  let removedLocal = 0;
  let removedCloud = 0;

  // 1. Remove from local data/submitted-candidates.json
  try {
    const regPath = path.join(process.cwd(), "data", "submitted-candidates.json");
    if (fs.existsSync(regPath)) {
      const list = JSON.parse(fs.readFileSync(regPath, "utf-8"));
      if (Array.isArray(list)) {
        const filtered = list.filter((e) => e.toLowerCase().trim() !== cleanEmail);
        if (filtered.length !== list.length) {
          fs.writeFileSync(regPath, JSON.stringify(filtered, null, 2), "utf-8");
          removedLocal++;
        }
      }
    }
  } catch (e) {
    console.warn("Local submitted-candidates unlock note:", e.message);
  }

  // 2. Remove from local data/test-results.json
  try {
    const resultsPath = path.join(process.cwd(), "data", "test-results.json");
    if (fs.existsSync(resultsPath)) {
      const list = JSON.parse(fs.readFileSync(resultsPath, "utf-8"));
      if (Array.isArray(list)) {
        const filtered = list.filter((item) => {
          const itemEmail = (item?.userEmail || "").toLowerCase().trim();
          const matchEmail = cleanEmail && itemEmail === cleanEmail;
          const matchId = resultId && item?.id === resultId;
          return !matchEmail && !matchId;
        });
        if (filtered.length !== list.length) {
          fs.writeFileSync(resultsPath, JSON.stringify(filtered, null, 2), "utf-8");
          removedLocal += list.length - filtered.length;
        }
      }
    }
  } catch (e) {
    console.warn("Local test-results unlock note:", e.message);
  }

  // 3. Remove individual submission files in data/submissions/*.json
  try {
    const submissionsDir = path.join(process.cwd(), "data", "submissions");
    if (fs.existsSync(submissionsDir)) {
      const files = fs.readdirSync(submissionsDir);
      for (const file of files) {
        if (!file.endsWith(".json")) continue;
        const filePath = path.join(submissionsDir, file);
        try {
          const parsed = JSON.parse(fs.readFileSync(filePath, "utf-8"));
          const itemEmail = (parsed?.userEmail || "").toLowerCase().trim();
          if ((cleanEmail && itemEmail === cleanEmail) || (resultId && parsed?.id === resultId)) {
            fs.unlinkSync(filePath);
            removedLocal++;
          }
        } catch (err) {
          // skip
        }
      }
    }
  } catch (e) {
    console.warn("Local submissions dir unlock note:", e.message);
  }

  // 4. Remove from Cloud Firestore (submittedCandidates & testResults)
  if (db) {
    try {
      if (cleanEmail) {
        await deleteDoc(doc(db, "submittedCandidates", cleanEmail));
        removedCloud++;
      }
      if (rawEmail && rawEmail !== cleanEmail) {
        await deleteDoc(doc(db, "submittedCandidates", rawEmail));
      }
    } catch (e) {
      console.warn("Firestore submittedCandidates delete note:", e.message);
    }

    try {
      if (resultId) {
        await deleteDoc(doc(db, "testResults", resultId));
        removedCloud++;
      }

      if (cleanEmail) {
        const qLower = query(collection(db, "testResults"), where("userEmail", "==", cleanEmail));
        const snapLower = await getDocs(qLower);
        for (const d of snapLower.docs) {
          await deleteDoc(doc(db, "testResults", d.id));
          removedCloud++;
        }
      }

      if (rawEmail && rawEmail !== cleanEmail) {
        const qRaw = query(collection(db, "testResults"), where("userEmail", "==", rawEmail));
        const snapRaw = await getDocs(qRaw);
        for (const d of snapRaw.docs) {
          await deleteDoc(doc(db, "testResults", d.id));
          removedCloud++;
        }
      }
    } catch (e) {
      console.warn("Firestore testResults delete note:", e.message);
    }
  }

  return res.status(200).json({
    success: true,
    email: cleanEmail,
    removedLocal,
    removedCloud,
    message: `Candidate ${cleanEmail || resultId} has been unlocked and may now retake the test.`,
  });
}
