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
    let localPaper = null;
    let cloudPaper = null;

    // 1. Read local data/active-quiz.json
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
          localPaper = fileContent;
        }
      }
    } catch (e) {
      // file read note
    }

    // 2. Read Cloud Firestore questionPapers ('active' doc first, then matching docId/subject, then newest)
    if (db) {
      try {
        const activeSnap = await getDoc(doc(db, "questionPapers", "active"));
        if (activeSnap.exists() && activeSnap.data()?.questions?.length > 0) {
          cloudPaper = activeSnap.data();
        }
      } catch (e) {}

      if (!cloudPaper && decodedSubject) {
        try {
          const docId = decodedSubject.toLowerCase().replace(/[^a-z0-9]/g, "-");
          const docSnap = await getDoc(doc(db, "questionPapers", docId));
          if (docSnap.exists() && docSnap.data()?.questions?.length > 0) {
            cloudPaper = docSnap.data();
          }
        } catch (e) {}
      }

      if (!cloudPaper && decodedSubject) {
        try {
          const q = query(
            collection(db, "questionPapers"),
            where("subject", "==", decodedSubject)
          );
          const querySnapshot = await getDocs(q);
          if (!querySnapshot.empty) {
            cloudPaper = querySnapshot.docs[0].data();
          }
        } catch (e) {}
      }

      if (!cloudPaper) {
        try {
          const allSnap = await getDocs(collection(db, "questionPapers"));
          const papers = allSnap.docs.map((d) => d.data()).filter((p) => p?.questions?.length > 0);
          papers.sort((a, b) => new Date(b.updatedAt || 0) - new Date(a.updatedAt || 0));
          if (papers.length > 0) {
            cloudPaper = papers[0];
          }
        } catch (e) {}
      }
    }

    // 3. Pick whichever paper is newer (ensures Vercel Cloud updates override bundled active-quiz.json)
    let paper = null;
    if (cloudPaper && localPaper) {
      const cloudTime = new Date(cloudPaper.updatedAt || cloudPaper.createdAt || 0).getTime();
      const localTime = new Date(localPaper.updatedAt || localPaper.createdAt || 0).getTime();
      paper = cloudTime >= localTime ? cloudPaper : localPaper;
    } else {
      paper = cloudPaper || localPaper;
    }

    // 4. Fallback to static questionsData
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
      title: paper.title || "Winter Project Selection Test",
      subject: paper.subject || "Winter Project Selection Test",
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
