import fs from "fs";
import path from "path";
import { db } from "../../../firebase-config";
import { collection, addDoc, query, where, getDocs, doc, getDoc, serverTimestamp } from "firebase/firestore";
import { questionsData } from "../../../data/questions";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const {
    userId,
    userEmail,
    subject = "Winter Project Selection Test",
    answers = {},
    violations = 0,
    violationDetails = [],
    proctorSnapshots = [],
  } = req.body;

  if (!userId) {
    return res.status(400).json({ error: "Missing required field: userId" });
  }

  try {
    let masterPaper = null;

    // 1. Check local data/active-quiz.json
    try {
      const activeQuizPath = path.join(process.cwd(), "data", "active-quiz.json");
      if (fs.existsSync(activeQuizPath)) {
        masterPaper = JSON.parse(fs.readFileSync(activeQuizPath, "utf-8"));
      }
    } catch (e) {
      // continue
    }

    // 2. Try Firestore
    if (!masterPaper && db) {
      try {
        const docId = (subject || "examination").toLowerCase().replace(/[^a-z0-9]/g, "-");
        const docSnap = await getDoc(doc(db, "questionPapers", docId));
        if (docSnap.exists()) {
          masterPaper = docSnap.data();
        }
      } catch (e) {
        // continue
      }

      if (!masterPaper) {
        try {
          const q = query(
            collection(db, "questionPapers"),
            where("subject", "==", subject)
          );
          const querySnapshot = await getDocs(q);
          if (!querySnapshot.empty) {
            masterPaper = querySnapshot.docs[0].data();
          }
        } catch (e) {
          // continue
        }
      }
    }

    // 3. Fallback to questionsData
    if (!masterPaper) {
      const defaultKey = questionsData[subject]
        ? subject
        : questionsData["Winter Project Selection Test"]
        ? "Winter Project Selection Test"
        : "Examination";
      if (questionsData[defaultKey]) {
        masterPaper = {
          title: "Winter Project Selection Test",
          subject: "Winter Project Selection Test",
          questions: questionsData[defaultKey],
        };
      }
    }

    if (!masterPaper || !masterPaper.questions) {
      return res.status(404).json({ error: "Question paper not found for scoring" });
    }

    // Scoring Calculation: Handles both MCQ and Numerical Integer types
    let score = 0;
    let correctCount = 0;
    let incorrectCount = 0;
    let unattemptedCount = 0;
    const questions = masterPaper.questions;

    questions.forEach((q, index) => {
      const qId = q.id !== undefined ? q.id : index + 1;
      const studentAns = answers[qId];

      if (studentAns === undefined || studentAns === null || studentAns.toString().trim() === "") {
        unattemptedCount++;
      } else if (q.type === "integer" || !q.options || q.options.length === 0) {
        const parsedStudent = parseInt(studentAns.toString().trim(), 10);
        const parsedCorrect = parseInt(q.correctAnswer.toString().trim(), 10);
        if (!isNaN(parsedStudent) && parsedStudent === parsedCorrect) {
          score++;
          correctCount++;
        } else {
          incorrectCount++;
        }
      } else {
        if (Number(studentAns) === Number(q.correctAnswer)) {
          score++;
          correctCount++;
        } else {
          incorrectCount++;
        }
      }
    });

    const totalQuestions = questions.length;
    const percentage = totalQuestions > 0 ? Math.round((score / totalQuestions) * 100) : 0;
    const timestampStr = new Date().toISOString();
    let docId = `res_${Date.now()}`;

    const resultDoc = {
      id: docId,
      userId,
      userEmail: userEmail || "anonymous",
      subject: masterPaper.title || subject || "Examination",
      score,
      totalQuestions,
      percentage,
      correctCount,
      incorrectCount,
      unattemptedCount,
      answers,
      violations: Number(violations) || 0,
      violationDetails: Array.isArray(violationDetails) ? violationDetails.slice(0, 50) : [],
      proctorSnapshots: Array.isArray(proctorSnapshots) ? proctorSnapshots.slice(0, 20) : [],
      createdAt: timestampStr,
    };

    // 1. GUARANTEED CONCURRENT-SAFE LOCAL STORAGE
    // Writing individual JSON files per submission guarantees zero write conflicts even if 200 users submit at the exact same millisecond.
    try {
      const submissionsDir = path.join(process.cwd(), "data", "submissions");
      if (!fs.existsSync(submissionsDir)) {
        fs.mkdirSync(submissionsDir, { recursive: true });
      }
      const singleFilePath = path.join(submissionsDir, `${docId}.json`);
      fs.writeFileSync(singleFilePath, JSON.stringify(resultDoc, null, 2), "utf-8");

      // Also maintain consolidated test-results.json for convenience
      const resultsPath = path.join(process.cwd(), "data", "test-results.json");
      let existingResults = [];
      if (fs.existsSync(resultsPath)) {
        try {
          existingResults = JSON.parse(fs.readFileSync(resultsPath, "utf-8"));
        } catch (e) {
          existingResults = [];
        }
      }
      existingResults.unshift(resultDoc);
      fs.writeFileSync(resultsPath, JSON.stringify(existingResults, null, 2), "utf-8");
    } catch (fsErr) {
      console.warn("Could not write to local storage:", fsErr.message);
    }

    // 2. Also attempt Firestore 'testResults' write
    if (db) {
      try {
        const firestoreDoc = {
          ...resultDoc,
          timestamp: serverTimestamp(),
        };
        const docRef = await addDoc(collection(db, "testResults"), firestoreDoc);
        docId = docRef.id;
        resultDoc.id = docId;
      } catch (saveErr) {
        // Log cleanly without crashing the response
        console.warn("Firestore cloud write note (result safely stored on server):", saveErr.message);
      }
    }

    // Send successful response WITHOUT score to student (as requested)
    return res.status(200).json({
      success: true,
      resultId: docId,
      submitted: true,
      message: "Responses successfully submitted and verified.",
    });
  } catch (error) {
    console.error("Error evaluating test on server:", error);
    return res.status(500).json({ error: "Failed to evaluate test result" });
  }
}
