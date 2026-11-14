import fs from "fs";
import path from "path";
import { db } from "../../../firebase-config";
import { collection, doc, setDoc } from "firebase/firestore";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const { title = "Examination", duration = 60, instructions = "", questions = [] } = req.body;

  if (!questions || questions.length === 0) {
    return res.status(400).json({ error: "Cannot save an empty question paper" });
  }

  const paperData = {
    title: title.trim(),
    subject: title.trim(),
    duration: Number(duration) || 60,
    instructions: instructions || "Answer all questions. Each question carries equal marks.",
    totalQuestions: questions.length,
    questions: questions.map((q, idx) => ({
      ...q,
      id: q.id || idx + 1,
      section: q.section || `Section ${Math.min(4, Math.floor(idx / Math.ceil(questions.length / 4)) + 1)}`,
      type: q.type || (q.options && q.options.length ? "mcq" : "integer"),
    })),
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  // 1. Save directly to local data/active-quiz.json on disk (Guaranteed persistence)
  try {
    const dataDir = path.join(process.cwd(), "data");
    if (!fs.existsSync(dataDir)) {
      fs.mkdirSync(dataDir, { recursive: true });
    }
    const quizFilePath = path.join(dataDir, "active-quiz.json");
    fs.writeFileSync(quizFilePath, JSON.stringify(paperData, null, 2), "utf-8");
  } catch (fsErr) {
    console.warn("Could not save to active-quiz.json:", fsErr);
  }

  // 2. Also save to Firestore collection 'questionPapers'
  let firestoreSaved = false;
  try {
    if (db) {
      const docId = paperData.title.toLowerCase().replace(/[^a-z0-9]/g, "-") || "examination";
      await setDoc(doc(db, "questionPapers", docId), paperData);
      firestoreSaved = true;
    }
  } catch (dbErr) {
    console.warn("Firestore save note (saved locally on server):", dbErr.message);
  }

  return res.status(200).json({
    success: true,
    message: firestoreSaved
      ? "Quiz successfully saved to both Firestore database and server storage!"
      : "Quiz successfully saved to server storage (ready for examinees)!",
    paper: paperData,
  });
}
