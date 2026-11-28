import fs from "fs";
import path from "path";
import { db } from "../../../firebase-config";
import { doc, setDoc } from "firebase/firestore";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const { title = "Winter Project Selection Test", duration = 60, instructions = "", questions = [] } = req.body || {};

  if (!questions || questions.length === 0) {
    return res.status(400).json({ error: "Cannot save an empty question paper" });
  }

  const nowIso = new Date().toISOString();
  const cleanTitle = (title || "Winter Project Selection Test").trim();

  const paperData = {
    title: cleanTitle,
    subject: cleanTitle,
    duration: Number(duration) || 60,
    instructions: instructions || "Answer all questions. Each question carries equal marks.",
    totalQuestions: questions.length,
    questions: questions.map((q, idx) => ({
      ...q,
      id: q.id || idx + 1,
      section: q.section || `Section ${Math.min(4, Math.floor(idx / Math.ceil(questions.length / 4)) + 1)}`,
      type: q.type || (q.options && q.options.length ? "mcq" : "integer"),
    })),
    createdAt: nowIso,
    updatedAt: nowIso,
  };

  // 1. Try saving to local data/active-quiz.json (works locally; read-only on Vercel)
  let localSaved = false;
  try {
    const dataDir = path.join(process.cwd(), "data");
    if (!fs.existsSync(dataDir)) {
      fs.mkdirSync(dataDir, { recursive: true });
    }
    const quizFilePath = path.join(dataDir, "active-quiz.json");
    fs.writeFileSync(quizFilePath, JSON.stringify(paperData, null, 2), "utf-8");
    localSaved = true;
  } catch (fsErr) {
    console.warn("Local active-quiz.json write note (expected on Vercel read-only FS):", fsErr.message);
  }

  // 2. Save to Cloud Firestore: both 'active' pointer doc AND titled doc
  let firestoreSaved = false;
  let firestoreError = null;
  try {
    if (db) {
      const docId = cleanTitle.toLowerCase().replace(/[^a-z0-9]/g, "-") || "examination";
      await setDoc(doc(db, "questionPapers", "active"), paperData);
      await setDoc(doc(db, "questionPapers", docId), paperData);
      firestoreSaved = true;
    }
  } catch (dbErr) {
    firestoreError = dbErr.message;
    console.warn("Firestore save note:", dbErr.message);
  }

  if (!localSaved && !firestoreSaved) {
    return res.status(500).json({
      success: false,
      error: `Failed to save quiz to both cloud Firestore (${firestoreError || "unavailable"}) and server storage. Check Firebase Firestore Rules.`,
    });
  }

  return res.status(200).json({
    success: true,
    firestoreSaved,
    localSaved,
    message: firestoreSaved
      ? "Quiz successfully published and live for all candidates!"
      : "Quiz saved to local server storage (note: Firestore write failed — check Firestore Rules for Vercel!).",
    paper: paperData,
  });
}
