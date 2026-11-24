import fs from "fs";
import path from "path";
import { db } from "../../../firebase-config";
import { collection, query, where, getDocs, doc, getDoc } from "firebase/firestore";

export default async function handler(req, res) {
  if (req.method !== "GET" && req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const emailParam = req.method === "GET" ? req.query.email : req.body?.email;
  if (!emailParam) {
    return res.status(400).json({ error: "Missing required parameter: email" });
  }

  const cleanEmail = emailParam.toString().trim().toLowerCase();

  // 1. Check if the user is an administrator
  const adminEmails = (process.env.NEXT_PUBLIC_ADMIN_EMAIL || "")
    .split(",")
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);

  const isAdmin = adminEmails.includes(cleanEmail) || cleanEmail.startsWith("admin@");

  // Administrators are explicitly allowed to retake or preview the test multiple times
  if (isAdmin) {
    return res.status(200).json({
      canAttempt: true,
      hasSubmitted: false,
      isAdmin: true,
      message: "Administrator access: Multiple attempts permitted.",
    });
  }

  // 2. Check local submitted-candidates.json registry
  try {
    const registryPath = path.join(process.cwd(), "data", "submitted-candidates.json");
    if (fs.existsSync(registryPath)) {
      const submittedList = JSON.parse(fs.readFileSync(registryPath, "utf-8"));
      if (Array.isArray(submittedList) && submittedList.some((e) => e.toLowerCase() === cleanEmail)) {
        return res.status(200).json({
          canAttempt: false,
          hasSubmitted: true,
          isAdmin: false,
          message: "You have already completed and submitted your examination. Multiple attempts are not permitted.",
        });
      }
    }
  } catch (e) {
    console.warn("Local submitted registry read note:", e.message);
  }

  // 3. Check local submissions directory (data/submissions/*.json)
  try {
    const submissionsDir = path.join(process.cwd(), "data", "submissions");
    if (fs.existsSync(submissionsDir)) {
      const files = fs.readdirSync(submissionsDir);
      for (const file of files) {
        if (file.endsWith(".json")) {
          try {
            const raw = fs.readFileSync(path.join(submissionsDir, file), "utf-8");
            const parsed = JSON.parse(raw);
            if (parsed && parsed.userEmail && parsed.userEmail.toLowerCase().trim() === cleanEmail) {
              return res.status(200).json({
                canAttempt: false,
                hasSubmitted: true,
                isAdmin: false,
                submittedAt: parsed.createdAt || null,
                message: "You have already completed and submitted your examination. Multiple attempts are not permitted.",
              });
            }
          } catch (readErr) {
            // skip corrupt file
          }
        }
      }
    }
  } catch (fsErr) {
    console.warn("Submissions dir scan note:", fsErr.message);
  }

  // 4. Check consolidated test-results.json
  try {
    const consolidatedPath = path.join(process.cwd(), "data", "test-results.json");
    if (fs.existsSync(consolidatedPath)) {
      const raw = fs.readFileSync(consolidatedPath, "utf-8");
      const list = JSON.parse(raw);
      if (Array.isArray(list)) {
        const match = list.find(
          (item) => item && item.userEmail && item.userEmail.toLowerCase().trim() === cleanEmail
        );
        if (match) {
          return res.status(200).json({
            canAttempt: false,
            hasSubmitted: true,
            isAdmin: false,
            submittedAt: match.createdAt || null,
            message: "You have already completed and submitted your examination. Multiple attempts are not permitted.",
          });
        }
      }
    }
  } catch (e) {
    console.warn("Consolidated test-results read note:", e.message);
  }

  // 5. Check Cloud Firestore (for serverless environments like Vercel)
  if (db) {
    try {
      // 5a. Direct fast lookup in submittedCandidates document
      const docRef = doc(db, "submittedCandidates", cleanEmail);
      const docSnap = await getDoc(docRef);
      if (docSnap.exists()) {
        return res.status(200).json({
          canAttempt: false,
          hasSubmitted: true,
          isAdmin: false,
          submittedAt: docSnap.data().submittedAt || null,
          message: "You have already completed and submitted your examination. Multiple attempts are not permitted.",
        });
      }

      // 5b. Query testResults collection
      const q = query(collection(db, "testResults"), where("userEmail", "==", cleanEmail));
      const querySnap = await getDocs(q);
      if (!querySnap.empty) {
        return res.status(200).json({
          canAttempt: false,
          hasSubmitted: true,
          isAdmin: false,
          message: "You have already completed and submitted your examination. Multiple attempts are not permitted.",
        });
      }
    } catch (dbErr) {
      console.warn("Firestore check attempt note:", dbErr.message);
    }
  }

  // Candidate has not taken the test yet
  return res.status(200).json({
    canAttempt: true,
    hasSubmitted: false,
    isAdmin: false,
  });
}
