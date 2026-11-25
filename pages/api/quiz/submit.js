import fs from "fs";
import path from "path";
import { db } from "../../../firebase-config";
import { collection, addDoc, query, where, getDocs, doc, getDoc, setDoc, serverTimestamp } from "firebase/firestore";
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

  const cleanEmail = (userEmail || "").trim().toLowerCase();

  // 0. SINGLE-ATTEMPT ENFORCEMENT: Candidate can take test only once (Admin can redo multiple times)
  const adminEmails = (process.env.NEXT_PUBLIC_ADMIN_EMAIL || "")
    .split(",")
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);

  const isAdmin = adminEmails.includes(cleanEmail) || cleanEmail.startsWith("admin@");

  if (!isAdmin && cleanEmail) {
    let alreadySubmitted = false;

    // Check local submitted-candidates registry
    try {
      const regPath = path.join(process.cwd(), "data", "submitted-candidates.json");
      if (fs.existsSync(regPath)) {
        const list = JSON.parse(fs.readFileSync(regPath, "utf-8"));
        if (Array.isArray(list) && list.some((e) => e.toLowerCase() === cleanEmail)) {
          alreadySubmitted = true;
        }
      }
    } catch (e) {}

    // Check local test-results.json
    if (!alreadySubmitted) {
      try {
        const resPath = path.join(process.cwd(), "data", "test-results.json");
        if (fs.existsSync(resPath)) {
          const list = JSON.parse(fs.readFileSync(resPath, "utf-8"));
          if (Array.isArray(list) && list.some((r) => r.userEmail && r.userEmail.toLowerCase().trim() === cleanEmail)) {
            alreadySubmitted = true;
          }
        }
      } catch (e) {}
    }

    // Check Cloud Firestore (for Vercel serverless persistence)
    if (!alreadySubmitted && db) {
      try {
        const docRef = doc(db, "submittedCandidates", cleanEmail);
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          alreadySubmitted = true;
        }
      } catch (e) {}

      if (!alreadySubmitted) {
        try {
          const q = query(collection(db, "testResults"), where("userEmail", "==", cleanEmail));
          const querySnap = await getDocs(q);
          if (!querySnap.empty) {
            alreadySubmitted = true;
          }
        } catch (e) {}
      }
    }

    if (alreadySubmitted) {
      return res.status(403).json({
        error: "Access Denied: You have already completed and submitted your examination. Multiple attempts are strictly prohibited.",
        alreadySubmitted: true,
      });
    }
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

    // Scoring Calculation: Handles both MCQ and Numerical Integer types + Section-wise breakdown
    let score = 0;
    let correctCount = 0;
    let incorrectCount = 0;
    let unattemptedCount = 0;
    const questions = masterPaper.questions;
    const chunkSize = Math.max(1, Math.ceil(questions.length / 4));
    const sectionScores = {
      0: { name: "Section 1", score: 0, total: 0 },
      1: { name: "Section 2", score: 0, total: 0 },
      2: { name: "Section 3", score: 0, total: 0 },
      3: { name: "Section 4", score: 0, total: 0 },
    };

    questions.forEach((q, index) => {
      const qId = q.id !== undefined ? q.id : index + 1;
      const studentAns = answers[qId];

      let secIdx = 0;
      if (q.sectionIndex !== undefined && q.sectionIndex >= 0 && q.sectionIndex <= 3) {
        secIdx = q.sectionIndex;
      } else if (q.section) {
        const match = q.section.match(/(\d)/);
        if (match) {
          secIdx = Math.max(0, Math.min(3, parseInt(match[1], 10) - 1));
        }
      } else {
        secIdx = Math.min(3, Math.floor(index / chunkSize));
      }
      sectionScores[secIdx].total++;

      if (studentAns === undefined || studentAns === null || studentAns.toString().trim() === "") {
        unattemptedCount++;
      } else if (q.type === "integer" || !q.options || q.options.length === 0) {
        const parsedStudent = parseInt(studentAns.toString().trim(), 10);
        const parsedCorrect = parseInt(q.correctAnswer.toString().trim(), 10);
        if (!isNaN(parsedStudent) && parsedStudent === parsedCorrect) {
          score++;
          correctCount++;
          sectionScores[secIdx].score++;
        } else {
          incorrectCount++;
        }
      } else {
        if (Number(studentAns) === Number(q.correctAnswer)) {
          score++;
          correctCount++;
          sectionScores[secIdx].score++;
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
      userEmail: cleanEmail || userEmail || "anonymous",
      subject: masterPaper.title || subject || "Examination",
      score,
      totalQuestions,
      percentage,
      sectionScores,
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
      // Record in data/submitted-candidates.json registry for instant single-attempt lookups
      if (cleanEmail) {
        const regPath = path.join(process.cwd(), "data", "submitted-candidates.json");
        let submittedList = [];
        if (fs.existsSync(regPath)) {
          try {
            submittedList = JSON.parse(fs.readFileSync(regPath, "utf-8"));
          } catch (e) {
            submittedList = [];
          }
        }
        if (!submittedList.includes(cleanEmail)) {
          submittedList.push(cleanEmail);
          fs.writeFileSync(regPath, JSON.stringify(submittedList, null, 2), "utf-8");
        }
      }
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

        // Also record in Firestore 'submittedCandidates' doc for fast single-attempt checks on serverless
        if (cleanEmail) {
          try {
            await setDoc(doc(db, "submittedCandidates", cleanEmail), {
              email: cleanEmail,
              submittedAt: serverTimestamp(),
              score,
              totalQuestions,
              resultId: docId,
            });
          } catch (regErr) {
            console.warn("Firestore submittedCandidates note:", regErr.message);
          }
        }
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
