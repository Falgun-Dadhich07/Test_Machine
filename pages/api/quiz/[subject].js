import fs from "fs";
import path from "path";
import { db } from "../../../firebase-config";
import { collection, query, where, getDocs, doc, getDoc } from "firebase/firestore";
import { questionsData } from "../../../data/questions";

export default async function handler(req, res) {
  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const { subject } = req.query;
  const decodedSubject = decodeURIComponent(subject || "").trim();

  try {
    let paper = null;

    // 1. Check local data/active-quiz.json (Highest priority & fastest)
    try {
      const activeQuizPath = path.join(process.cwd(), "data", "active-quiz.json");
      if (fs.existsSync(activeQuizPath)) {
        const fileContent = JSON.parse(fs.readFileSync(activeQuizPath, "utf-8"));
        if (
          fileContent &&
          (decodedSubject === "Examination" ||
            decodedSubject === "Winter Project Selection Test" ||
            fileContent.title?.toLowerCase() === decodedSubject.toLowerCase() ||
            fileContent.subject?.toLowerCase() === decodedSubject.toLowerCase())
        ) {
          paper = fileContent;
        }
      }
    } catch (e) {
      // file read note
    }

    // 2. Try Firestore questionPapers collection
    if (!paper && db) {
      try {
        const docId = decodedSubject.toLowerCase().replace(/[^a-z0-9]/g, "-");
        const docSnap = await getDoc(doc(db, "questionPapers", docId));
        if (docSnap.exists()) {
          paper = docSnap.data();
        }
      } catch (e) {
        // continue
      }

      if (!paper) {
        try {
          const q = query(
            collection(db, "questionPapers"),
            where("subject", "==", decodedSubject)
          );
          const querySnapshot = await getDocs(q);
          if (!querySnapshot.empty) {
            paper = querySnapshot.docs[0].data();
          }
        } catch (e) {
          // continue
        }
      }
    }

    // 3. Fallback to questionsData
    if (!paper) {
      const defaultKey = questionsData[decodedSubject]
        ? decodedSubject
        : questionsData["Winter Project Selection Test"]
        ? "Winter Project Selection Test"
        : "Examination";
      if (questionsData[defaultKey]) {
        paper = {
          title: "Winter Project Selection Test",
          subject: "Winter Project Selection Test",
          duration: 60,
          instructions: "This test consists of 4 sections. Answer all questions.",
          questions: questionsData[defaultKey],
        };
      }
    }

    if (!paper) {
      return res.status(404).json({ error: "Examination not found" });
    }

    // CRITICAL ANTI-CHEAT: Strip correctAnswer for both MCQ and Integer questions
    const sanitizedQuestions = (paper.questions || []).map((q, index) => {
      // eslint-disable-next-line no-unused-vars
      const { correctAnswer, ...safeQuestion } = q;
      return {
        ...safeQuestion,
        id: q.id !== undefined ? q.id : index + 1,
        type: q.type || (q.options && q.options.length ? "mcq" : "integer"),
        section: q.section || `Section ${Math.min(4, Math.floor(index / Math.ceil((paper.questions?.length || 4) / 4)) + 1)}`,
      };
    });

    return res.status(200).json({
      title: paper.title || "Examination",
      subject: paper.subject || "Examination",
      duration: paper.duration || 60,
      instructions: paper.instructions || "This examination consists of 4 sections. Answer all questions.",
      totalQuestions: sanitizedQuestions.length,
      questions: sanitizedQuestions,
    });
  } catch (error) {
    console.error("Error retrieving quiz:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
}
