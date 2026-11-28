import fs from "fs";
import path from "path";
import { db } from "../../../firebase-config";
import { collection, getDocs, query, limit } from "firebase/firestore";
import { questionsData } from "../../../data/questions";

function computeSectionScores(answers = {}, questions = []) {
  const sectionScores = {
    0: { name: "Finance", score: 0, total: 0 },
    1: { name: "Python", score: 0, total: 0 },
    2: { name: "ML", score: 0, total: 0 },
    3: { name: "Aptitude", score: 0, total: 0 },
  };

  if (!Array.isArray(questions) || questions.length === 0) {
    return sectionScores;
  }

  const chunkSize = Math.max(1, Math.ceil(questions.length / 4));
  questions.forEach((q, index) => {
    const qId = q.id !== undefined ? q.id : index + 1;
    const studentAns = answers ? answers[qId] : undefined;

    let secIdx = 0;
    if (q.sectionIndex !== undefined && q.sectionIndex >= 0 && q.sectionIndex <= 3) {
      secIdx = q.sectionIndex;
    } else if (q.section) {
      const s = q.section.toString().toLowerCase();
      if (s.includes("finance")) secIdx = 0;
      else if (s.includes("python")) secIdx = 1;
      else if (s === "ml" || s.includes("ml") || s.includes("machine learning")) secIdx = 2;
      else if (s.includes("aptitude")) secIdx = 3;
      else {
        const match = s.match(/(\d)/);
        if (match) {
          secIdx = Math.max(0, Math.min(3, parseInt(match[1], 10) - 1));
        }
      }
    } else {
      secIdx = Math.min(3, Math.floor(index / chunkSize));
    }

    sectionScores[secIdx].total++;

    if (studentAns !== undefined && studentAns !== null && studentAns.toString().trim() !== "") {
      if (q.type === "integer" || !q.options || q.options.length === 0) {
        const parsedStudent = parseInt(studentAns.toString().trim(), 10);
        const parsedCorrect = parseInt((q.correctAnswer ?? "").toString().trim(), 10);
        if (!isNaN(parsedStudent) && parsedStudent === parsedCorrect) {
          sectionScores[secIdx].score++;
        }
      } else if (Number(studentAns) === Number(q.correctAnswer)) {
        sectionScores[secIdx].score++;
      }
    }
  });

  return sectionScores;
}

export default async function handler(req, res) {
  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const resultsMap = new Map();

  // Load active paper questions as fallback for section-wise backfill on legacy records
  let activeQuestions = [];
  try {
    const activeQuizPath = path.join(process.cwd(), "data", "active-quiz.json");
    if (fs.existsSync(activeQuizPath)) {
      const activePaper = JSON.parse(fs.readFileSync(activeQuizPath, "utf-8"));
      if (Array.isArray(activePaper?.questions)) {
        activeQuestions = activePaper.questions;
      }
    }
  } catch (e) {}

  if (activeQuestions.length === 0) {
    activeQuestions =
      questionsData["Winter Project Selection Test"] ||
      questionsData["Examination"] ||
      [];
  }

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

  // Convert map to sorted array (newest first) and backfill sectionScores if absent
  const allResults = Array.from(resultsMap.values()).map((item) => {
    if (!item.sectionScores && item.answers && activeQuestions.length > 0) {
      return {
        ...item,
        sectionScores: computeSectionScores(item.answers, activeQuestions),
      };
    }
    return item;
  });

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
