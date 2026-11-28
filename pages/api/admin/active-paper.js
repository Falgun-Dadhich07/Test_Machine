import fs from "fs";
import path from "path";
import { db } from "../../../firebase-config";
import { collection, doc, getDoc, getDocs } from "firebase/firestore";
import { questionsData } from "../../../data/questions";

export default async function handler(req, res) {
  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  let cloudPaper = null;
  let localPaper = null;

  // 1. Check Firestore (active doc first, then newest in questionPapers)
  if (db) {
    try {
      const activeSnap = await getDoc(doc(db, "questionPapers", "active"));
      if (activeSnap.exists()) {
        cloudPaper = activeSnap.data();
      } else {
        const allSnap = await getDocs(collection(db, "questionPapers"));
        const papers = allSnap.docs.map((d) => d.data()).filter((p) => p?.questions?.length > 0);
        papers.sort((a, b) => new Date(b.updatedAt || 0) - new Date(a.updatedAt || 0));
        if (papers.length > 0) {
          cloudPaper = papers[0];
        }
      }
    } catch (e) {
      console.warn("Firestore active-paper read note:", e.message);
    }
  }

  // 2. Check local data/active-quiz.json
  try {
    const activeQuizPath = path.join(process.cwd(), "data", "active-quiz.json");
    if (fs.existsSync(activeQuizPath)) {
      localPaper = JSON.parse(fs.readFileSync(activeQuizPath, "utf-8"));
    }
  } catch (e) {}

  // Pick whichever is newer
  let paper = null;
  if (cloudPaper && localPaper) {
    const cloudTime = new Date(cloudPaper.updatedAt || cloudPaper.createdAt || 0).getTime();
    const localTime = new Date(localPaper.updatedAt || localPaper.createdAt || 0).getTime();
    paper = cloudTime >= localTime ? cloudPaper : localPaper;
  } else {
    paper = cloudPaper || localPaper;
  }

  if (!paper) {
    const defaultQ =
      questionsData["Winter Project Selection Test"] ||
      questionsData["Examination"] ||
      [];
    paper = {
      title: "Winter Project Selection Test",
      subject: "Winter Project Selection Test",
      duration: 60,
      instructions: "This test contains 4 sections. Read each question carefully.",
      questions: defaultQ,
    };
  }

  return res.status(200).json({ success: true, paper });
}
