import fs from "fs";
import path from "path";
import { db } from "../../../firebase-config";
import { collection, getDocs, query, limit } from "firebase/firestore";

export default async function handler(req, res) {
  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const resultsMap = new Map();

  // 1. Read from local individual submission files (data/submissions/*.json)
  try {
    const submissionsDir = path.join(process.cwd(), "data", "submissions");
    if (fs.existsSync(submissionsDir)) {
      const files = fs.readdirSync(submissionsDir);
      for (const file of files) {
        if (file.endsWith(".json")) {
          try {
            const raw = fs.readFileSync(path.join(submissionsDir, file), "utf-8");
            const parsed = JSON.parse(raw);
            if (parsed && parsed.id) {
              resultsMap.set(parsed.id, parsed);
            }
          } catch (e) {}
        }
      }
    }

    // Also check consolidated test-results.json
    const localPath = path.join(process.cwd(), "data", "test-results.json");
    if (fs.existsSync(localPath)) {
      const localData = JSON.parse(fs.readFileSync(localPath, "utf-8"));
      if (Array.isArray(localData)) {
        localData.forEach((item) => {
          if (item && item.id && !resultsMap.has(item.id)) {
            resultsMap.set(item.id, item);
          }
        });
      }
    }
  } catch (fsErr) {
    console.warn("Local storage read note:", fsErr.message);
  }

  // 2. Read from Firestore testResults
  if (db) {
    try {
      const q = query(collection(db, "testResults"), limit(250));
      const snapshot = await getDocs(q);
      snapshot.forEach((doc) => {
        const data = doc.data();
        const id = doc.id;
        resultsMap.set(id, { id, ...data });
      });
    } catch (dbErr) {
      console.warn("Firestore testResults query note:", dbErr.message);
    }
  }

  // Convert map to sorted array (newest first)
  const allResults = Array.from(resultsMap.values());
  allResults.sort((a, b) => {
    const timeA = a.createdAt ? new Date(a.createdAt).getTime() : (a.timestamp?.seconds ? a.timestamp.seconds * 1000 : 0);
    const timeB = b.createdAt ? new Date(b.createdAt).getTime() : (b.timestamp?.seconds ? b.timestamp.seconds * 1000 : 0);
    return timeB - timeA;
  });

  return res.status(200).json({
    success: true,
    count: allResults.length,
    results: allResults,
  });
}
