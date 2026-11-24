"use client";
import React, { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { useRouter } from "next/router";
import {
  Typography,
  Tabs,
  TabList,
  Tab,
  tabClasses,
  Radio,
  Sheet,
  Grid,
  Button,
  Modal,
  ModalDialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Divider,
  Stack,
  Box,
  Card,
  Chip,
  Alert,
  CircularProgress,
  Input,
  Checkbox,
} from "@mui/joy";
import {
  WarningRounded,
  NavigateNext,
  NavigateBefore,
  BookmarkBorder,
  Bookmark,
  Fullscreen,
  CheckCircle,
  Security,
  Numbers,
  ListAlt,
  Layers,
  Lock,
} from "@mui/icons-material";
import CustomWebcam from "../../components/CustomWebcam";
import UserInfo from "../../components/info";
import { useAuth } from "../../contexts/AuthContext";
import { useFullscreenProctor } from "../../hooks/useFullscreenProctor";
import { db } from "../../firebase-config";
import {
  collection,
  addDoc,
  serverTimestamp,
  getDocs,
  query,
  where,
} from "firebase/firestore";
import { questionsData } from "../../data/questions";

const SECTION_NAMES = [
  "Section 1",
  "Section 2",
  "Section 3",
  "Section 4",
];

export default function ExamPage() {
  const router = useRouter();
  const { subject } = router.query;
  const { currentUser, logout } = useAuth();

  // Test State
  const [questions, setQuestions] = useState([]);
  const [paperDetails, setPaperDetails] = useState({
    title: "Winter Project Selection Test",
    duration: 60,
    instructions: "",
  });
  const [loading, setLoading] = useState(true);
  const [activeSectionIndex, setActiveSectionIndex] = useState(0); // 0, 1, 2, 3
  const [currentQuestionId, setCurrentQuestionId] = useState(null);
  const [answers, setAnswers] = useState({});
  const [markedForReview, setMarkedForReview] = useState({});
  const [timeLeft, setTimeLeft] = useState(60 * 60);
  const [hasStarted, setHasStarted] = useState(false);
  const [instructionChecked, setInstructionChecked] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [submittedUserEmail, setSubmittedUserEmail] = useState("");
  const [hasPreviousSubmission, setHasPreviousSubmission] = useState(false);
  const [logoutCountdown, setLogoutCountdown] = useState(8);
  const [submissionResult, setSubmissionResult] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [confirmModalOpen, setConfirmModalOpen] = useState(false);

  const adminEmails = useMemo(
    () =>
      (process.env.NEXT_PUBLIC_ADMIN_EMAIL || "")
        .split(",")
        .map((e) => e.trim().toLowerCase())
        .filter(Boolean),
    []
  );

  const isAdmin = useMemo(() => {
    if (!currentUser?.email) return false;
    const cleanEmail = currentUser.email.toLowerCase().trim();
    return adminEmails.includes(cleanEmail) || cleanEmail.startsWith("admin@");
  }, [currentUser, adminEmails]);

  // Proctoring State
  const [proctorSnapshots, setProctorSnapshots] = useState([]);
  const [faceAnomalies, setFaceAnomalies] = useState([]);
  const webcamRef = useRef(null);

  // 1. Fullscreen Proctor Hook
  const handleViolationTrigger = useCallback((type, count) => {
    console.warn(`Fullscreen violation triggered: ${type} (count: ${count})`);
    if (type === "max_violations_reached") {
      handleAutoSubmit("Maximum security violations exceeded");
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const {
    isFullscreen,
    violations,
    warningMessage,
    clearWarning,
    enterFullscreen,
    violationLogs,
  } = useFullscreenProctor({
    maxViolations: 3,
    enableWarnings: true,
    enabled: hasStarted && !isSubmitted,
    onFullscreenViolation: handleViolationTrigger,
  });

  // 2. Fetch Quiz Questions Dynamically
  useEffect(() => {
    if (!currentUser && !isSubmitted) {
      router.push("/login");
      return;
    }

    let isMounted = true;
    async function fetchQuizData() {
      setLoading(true);

      // Check if candidate has already submitted (single attempt enforcement)
      if (currentUser?.email && !isAdmin) {
        try {
          const attemptRes = await fetch(`/api/quiz/check-attempt?email=${encodeURIComponent(currentUser.email)}`);
          if (attemptRes.ok) {
            const attemptData = await attemptRes.json();
            if (attemptData.hasSubmitted && !attemptData.isAdmin) {
              if (isMounted) {
                setHasPreviousSubmission(true);
                setLoading(false);
                return;
              }
            }
          }
        } catch (attemptErr) {
          console.warn("Attempt verification error:", attemptErr);
        }
      }

      try {
        const queryTarget = subject && subject !== "[subject]" ? subject : "Winter Project Selection Test";
        const apiRes = await fetch(`/api/quiz/${encodeURIComponent(queryTarget)}`);
        if (apiRes.ok) {
          const data = await apiRes.json();
          if (isMounted && data.questions && data.questions.length > 0) {
            setQuestions(data.questions);
            setPaperDetails({
              title: data.title || "Winter Project Selection Test",
              duration: data.duration || 60,
              instructions: data.instructions || "",
            });
            setTimeLeft((data.duration || 60) * 60);
            setCurrentQuestionId(data.questions[0]?.id || 1);
            setLoading(false);
            return;
          }
        }
      } catch (e) {
        console.warn("API route quiz note, checking local fallback:", e);
      }

      // Fallback to questionsData["Winter Project Selection Test"] or questionsData["Examination"]
      const defaultQ = questionsData["Winter Project Selection Test"] || questionsData["Examination"] || [];
      if (isMounted) {
        setQuestions(defaultQ);
        setPaperDetails({
          title: "Winter Project Selection Test",
          duration: 60,
          instructions: "This test consists of 4 sections. Answer all questions.",
        });
        setTimeLeft(60 * 60);
        setCurrentQuestionId(defaultQ[0]?.id || 1);
        setLoading(false);
      }
    }

    fetchQuizData();

    return () => {
      isMounted = false;
    };
  }, [currentUser, router]);

  // Group questions by section
  const sectionQuestionsMap = useMemo(() => {
    const map = { 0: [], 1: [], 2: [], 3: [] };
    const qCount = questions.length;
    const chunkSize = Math.max(1, Math.ceil(qCount / 4));

    questions.forEach((q, idx) => {
      let secIdx = 0;
      if (q.sectionIndex !== undefined && q.sectionIndex >= 0 && q.sectionIndex <= 3) {
        secIdx = q.sectionIndex;
      } else if (q.section) {
        const match = q.section.match(/(\d)/);
        if (match) {
          secIdx = Math.max(0, Math.min(3, parseInt(match[1], 10) - 1));
        }
      } else {
        secIdx = Math.min(3, Math.floor(idx / chunkSize));
      }
      map[secIdx].push(q);
    });

    return map;
  }, [questions]);

  // Questions in the currently active section page
  const currentSectionQuestions = useMemo(() => {
    return sectionQuestionsMap[activeSectionIndex] || [];
  }, [sectionQuestionsMap, activeSectionIndex]);

  // When changing section, ensure current question belongs to the active section
  useEffect(() => {
    if (currentSectionQuestions.length > 0) {
      const isCurrentInSec = currentSectionQuestions.some((q) => q.id === currentQuestionId);
      if (!isCurrentInSec) {
        setCurrentQuestionId(currentSectionQuestions[0].id);
      }
    }
  }, [activeSectionIndex, currentSectionQuestions, currentQuestionId]);

  // Active question object
  const currentQ = useMemo(() => {
    return questions.find((q) => q.id === currentQuestionId) || currentSectionQuestions[0] || {};
  }, [questions, currentQuestionId, currentSectionQuestions]);

  const currentQSectionIndex = currentSectionQuestions.findIndex((q) => q.id === currentQ.id);

  // 3. Auto-Submit & Countdown Timer
  const handleAutoSubmit = useCallback((reason) => {
    handleSubmit(null, reason);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (hasStarted && timeLeft > 0 && !isSubmitted && !loading) {
      const timer = setTimeout(() => setTimeLeft((prev) => prev - 1), 1000);
      return () => clearTimeout(timer);
    } else if (hasStarted && timeLeft === 0 && !isSubmitted && !loading) {
      handleAutoSubmit("Exam time expired");
    }
  }, [hasStarted, timeLeft, isSubmitted, loading, handleAutoSubmit]);

  // Logout countdown timer after submission
  useEffect(() => {
    if (isSubmitted) {
      if (logoutCountdown > 0) {
        const timer = setTimeout(() => {
          setLogoutCountdown((prev) => prev - 1);
        }, 1000);
        return () => clearTimeout(timer);
      } else {
        router.push("/login");
      }
    }
  }, [isSubmitted, logoutCountdown, router]);

  const handleAnswerSelect = (questionId, value) => {
    setAnswers((prev) => ({
      ...prev,
      [questionId]: value,
    }));
  };

  const handleClearAnswer = (questionId) => {
    setAnswers((prev) => {
      const copy = { ...prev };
      delete copy[questionId];
      return copy;
    });
  };

  const toggleMarkForReview = (questionId) => {
    setMarkedForReview((prev) => ({
      ...prev,
      [questionId]: !prev[questionId],
    }));
  };

  // 4. Secure Score Submission
  const handleSubmit = async (e, submitReason = "Normal submission") => {
    if (isSubmitted || submitting) return;
    setSubmitting(true);
    setConfirmModalOpen(false);

    const candidateEmail = currentUser?.email || "candidate";
    setSubmittedUserEmail(candidateEmail);

    const totalQ = questions.length;
    const allViolations = [
      ...violationLogs,
      ...faceAnomalies,
      ...(submitReason !== "Normal submission"
        ? [{ type: "auto_submit", details: submitReason, timestamp: new Date().toISOString() }]
        : []),
    ];

    const exitFullscreenHelper = async () => {
      if (typeof document !== "undefined" && (document.fullscreenElement || document.webkitFullscreenElement)) {
        try {
          if (document.exitFullscreen) await document.exitFullscreen();
          else if (document.webkitExitFullscreen) await document.webkitExitFullscreen();
        } catch (e) {
          // ignore
        }
      }
    };

    const performCandidateLogout = async () => {
      try {
        if (logout) {
          await logout();
        }
      } catch (logoutErr) {
        console.warn("Logout error after submit:", logoutErr);
      }
    };

    try {
      const res = await fetch("/api/quiz/submit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: currentUser?.uid || "candidate",
          userEmail: candidateEmail,
          subject: paperDetails.title || "Examination",
          answers,
          violations: violations + faceAnomalies.length,
          violationDetails: allViolations,
          proctorSnapshots: proctorSnapshots.slice(0, 20),
        }),
      });

      if (res.ok) {
        const resultData = await res.json();
        setSubmissionResult(resultData);
        setIsSubmitted(true);
        setSubmitting(false);

        await exitFullscreenHelper();
        await performCandidateLogout();
        return;
      }

      if (res.status === 403) {
        const errData = await res.json();
        alert(errData.error || "You have already completed this test. Multiple attempts are not allowed.");
        setHasPreviousSubmission(true);
        setSubmitting(false);
        await exitFullscreenHelper();
        await performCandidateLogout();
        return;
      }
    } catch (apiErr) {
      console.warn("API submit failed, falling back to local evaluation:", apiErr);
    }

    // Fallback if offline
    let localScore = 0;
    questions.forEach((q) => {
      const userAns = answers[q.id];
      if (userAns !== undefined && userAns !== null) {
        if (q.type === "integer") {
          if (parseInt(userAns, 10) === parseInt(q.correctAnswer, 10)) localScore++;
        } else {
          if (Number(userAns) === Number(q.correctAnswer)) localScore++;
        }
      }
    });

    setSubmissionResult({
      totalQuestions: totalQ,
      violations: violations + faceAnomalies.length,
      submitted: true,
    });
    setIsSubmitted(true);
    setSubmitting(false);

    await exitFullscreenHelper();
    await performCandidateLogout();
  };

  const handleFaceAnomaly = useCallback((anomaly) => {
    setFaceAnomalies((prev) => [
      ...prev,
      { ...anomaly, timestamp: new Date().toISOString() },
    ]);
  }, []);

  const handleSnapshotUploaded = useCallback((url) => {
    setProctorSnapshots((prev) => [...prev, url]);
  }, []);

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  if ((!currentUser && !isSubmitted) || loading) {
    return (
      <Box
        display="flex"
        flexDirection="column"
        justifyContent="center"
        alignItems="center"
        minHeight="70vh"
        gap={2}
      >
        <CircularProgress size="lg" />
        <Typography level="title-md">Loading Examination Sections...</Typography>
      </Box>
    );
  }

  // 0. Single-Attempt Guard View: Candidate has already completed the test
  if (hasPreviousSubmission && !isAdmin) {
    return (
      <Box sx={{ maxWidth: 650, mx: "auto", my: { xs: 4, md: 8 }, p: { xs: 2, md: 3 } }}>
        <Card variant="outlined" sx={{ p: { xs: 3, md: 4 }, textAlign: "center", borderRadius: "lg", boxShadow: "lg" }}>
          <Box display="flex" justifyContent="center" mb={2}>
            <img
              src="/share-logo.jpg"
              alt="ShARE: Student Chapter"
              width="64"
              height="64"
              style={{ borderRadius: "12px", objectFit: "cover" }}
            />
          </Box>
          <Box display="flex" justifyContent="center" mb={1.5}>
            <Chip size="md" variant="soft" color="danger" startDecorator={<Lock fontSize="small" />}>
              Single Attempt Limit Reached
            </Chip>
          </Box>
          <Typography level="h2" sx={{ fontWeight: "bold", mb: 1 }}>
            Examination Already Submitted
          </Typography>
          <Typography level="body-sm" color="neutral" sx={{ mb: 3 }}>
            Candidate ID: <b>{currentUser?.email}</b>
          </Typography>

          <Alert color="danger" variant="soft" sx={{ mb: 3, textAlign: "left" }}>
            Our records confirm that you have already completed and submitted the Winter Project Selection Test. Under ShARE examination guidelines, only one attempt per candidate is permitted. Your recorded submission is currently undergoing evaluation.
          </Alert>

          <Stack direction={{ xs: "column", sm: "row" }} spacing={2} justifyContent="center">
            <Button variant="solid" color="primary" onClick={() => router.push("/dashboard")}>
              Return to Dashboard
            </Button>
            <Button
              variant="outlined"
              color="neutral"
              onClick={async () => {
                try {
                  if (logout) await logout();
                  router.push("/login");
                } catch (e) {}
              }}
            >
              Log Out
            </Button>
          </Stack>
        </Card>
      </Box>
    );
  }

  // 1. Pre-Examination Instructions View (Before Test Starts)
  if (!hasStarted) {
    return (
      <Box sx={{ maxWidth: 850, mx: "auto", my: { xs: 2, md: 5 }, p: { xs: 2, md: 3 } }}>
        <Card variant="outlined" sx={{ p: { xs: 3, md: 4 }, borderRadius: "lg", boxShadow: "md" }}>
          <Box display="flex" alignItems="center" gap={2} sx={{ mb: 2 }}>
            <img
              src="/share-logo.jpg"
              alt="ShARE: Student Chapter"
              width="50"
              height="50"
              style={{ borderRadius: "10px", objectFit: "cover" }}
            />
            <div>
              <Typography level="h1" sx={{ fontWeight: "bold", fontSize: "1.65rem" }}>
                Winter Project Selection Test
              </Typography>
              <Typography level="body-sm" color="neutral">
                ShARE: Student Chapter | Candidate: <b>{currentUser?.email}</b>
              </Typography>
            </div>
          </Box>
          <Divider sx={{ my: 2 }} />

          <Grid container spacing={2} sx={{ mb: 3 }}>
            <Grid xs={6} sm={3}>
              <Sheet variant="soft" color="primary" sx={{ p: 2, borderRadius: "md", textAlign: "center" }}>
                <Typography level="body-xs">Total Duration</Typography>
                <Typography level="title-lg" fontWeight="bold">
                  {paperDetails.duration || 60} Mins
                </Typography>
              </Sheet>
            </Grid>
            <Grid xs={6} sm={3}>
              <Sheet variant="soft" color="success" sx={{ p: 2, borderRadius: "md", textAlign: "center" }}>
                <Typography level="body-xs">Total Questions</Typography>
                <Typography level="title-lg" fontWeight="bold">
                  {questions.length}
                </Typography>
              </Sheet>
            </Grid>
            <Grid xs={6} sm={3}>
              <Sheet variant="soft" color="warning" sx={{ p: 2, borderRadius: "md", textAlign: "center" }}>
                <Typography level="body-xs">Sections</Typography>
                <Typography level="title-lg" fontWeight="bold">
                  4 Sections
                </Typography>
              </Sheet>
            </Grid>
            <Grid xs={6} sm={3}>
              <Sheet variant="soft" color="danger" sx={{ p: 2, borderRadius: "md", textAlign: "center" }}>
                <Typography level="body-xs">Max Violations</Typography>
                <Typography level="title-lg" fontWeight="bold">
                  3 Violations
                </Typography>
              </Sheet>
            </Grid>
          </Grid>

          <Typography level="title-md" sx={{ fontWeight: "bold", mb: 1.5 }}>
            Guidelines & System Rules:
          </Typography>

          <Sheet
            variant="soft"
            color="neutral"
            sx={{ p: 3, borderRadius: "md", mb: 3, maxHeight: 300, overflowY: "auto" }}
          >
            <Stack spacing={2}>
              <Box>
                <Typography level="title-sm" fontWeight="bold" color="primary">
                  1. 4 Structured Sections
                </Typography>
                <Typography level="body-sm" sx={{ mt: 0.5 }}>
                  This test consists of 4 distinct sections. Use the top navigation tabs to switch between sections.
                  Sections 1, 2, and 3 are Multiple Choice. Section 4 consists of Numerical / Integer type questions where you type your numeric answer directly.
                </Typography>
              </Box>

              <Box>
                <Typography level="title-sm" fontWeight="bold" color="primary">
                  2. Mandatory Fullscreen Mode
                </Typography>
                <Typography level="body-sm" sx={{ mt: 0.5 }}>
                  Clicking &quot;Start Test &amp; Enter Fullscreen&quot; will lock the test into fullscreen mode. Exiting fullscreen, minimizing the browser, or switching tabs is strictly prohibited and counts as an integrity violation.
                </Typography>
              </Box>

              <Box>
                <Typography level="title-sm" fontWeight="bold" color="primary">
                  3. Webcam & AI Proctoring
                </Typography>
                <Typography level="body-sm" sx={{ mt: 0.5 }}>
                  Your webcam will activate and monitor your presence throughout the exam. Please remain centered and clearly visible.
                </Typography>
              </Box>

              <Box>
                <Typography level="title-sm" fontWeight="bold" color="primary">
                  4. Security Limit & Auto-Submit
                </Typography>
                <Typography level="body-sm" sx={{ mt: 0.5 }}>
                  If you accumulate 3 security violations or when the timer reaches 00:00, your exam will be automatically locked and submitted.
                </Typography>
              </Box>
            </Stack>
          </Sheet>

          {/* Agreement Checkbox */}
          <Sheet
            variant="outlined"
            color={instructionChecked ? "success" : "neutral"}
            sx={{ p: 2, borderRadius: "md", mb: 3 }}
          >
            <Checkbox
              checked={instructionChecked}
              onChange={(e) => setInstructionChecked(e.target.checked)}
              label={
                <Typography level="body-sm" fontWeight="semibold">
                  I have read and agree to all the examination rules. I confirm my camera is functional and declare I will not use any unauthorized materials.
                </Typography>
              }
            />
          </Sheet>

          <Button
            size="lg"
            variant="solid"
            color="primary"
            disabled={!instructionChecked}
            startDecorator={<Fullscreen />}
            onClick={async () => {
              try {
                await enterFullscreen();
              } catch (e) {
                console.warn(e);
              }
              setHasStarted(true);
            }}
            sx={{ py: 1.5, fontWeight: "bold" }}
          >
            Start Test & Enter Fullscreen
          </Button>
        </Card>
      </Box>
    );
  }

  // 2. Submitted Confirmation View (CANDIDATE LOGGED OUT & NO SCORE SHOWN)
  if (isSubmitted) {
    const total = submissionResult?.totalQuestions || questions.length || 1;
    const attemptedCount = Object.keys(answers).length;
    const unattemptedCount = Math.max(0, total - attemptedCount);
    const totalViolations = submissionResult?.violations ?? violations;
    const displayEmail = submittedUserEmail || currentUser?.email || "Submitted Candidate";

    return (
      <Box sx={{ maxWidth: "42rem", mx: "auto", my: 6, p: 2 }}>
        <Card variant="outlined" sx={{ p: 4, textAlign: "center", boxShadow: "lg", borderRadius: "lg" }}>
          <Box display="flex" justifyContent="center" mb={1.5}>
            <img
              src="/share-logo.jpg"
              alt="ShARE: Student Chapter"
              width="60"
              height="60"
              style={{ borderRadius: "12px", objectFit: "cover" }}
            />
          </Box>
          <CheckCircle sx={{ fontSize: 56, color: "success.500", mx: "auto", mb: 1 }} />
          <Typography level="h1" sx={{ mb: 1, fontWeight: "bold" }}>
            Winter Project Selection Test Submitted
          </Typography>
          <Box display="flex" justifyContent="center" alignItems="center" gap={1} sx={{ mb: 3 }}>
            <Chip size="md" variant="soft" color="success" startDecorator={<Lock fontSize="small" />}>
              Candidate Logged Out &amp; Session Ended
            </Chip>
          </Box>
          <Typography level="body-md" color="neutral" sx={{ mb: 3 }}>
            Paper: <b>{paperDetails.title || "Winter Project Selection Test"}</b> (All 4 Sections Finished)
          </Typography>

          <Sheet variant="soft" color="neutral" sx={{ p: 3, borderRadius: "md", mb: 3, textAlign: "left" }}>
            <Stack spacing={1.5}>
              <Box display="flex" justifyContent="space-between">
                <Typography level="body-sm" color="neutral">Candidate ID:</Typography>
                <Typography level="body-sm" fontWeight="bold">{displayEmail}</Typography>
              </Box>
              <Divider />
              <Box display="flex" justifyContent="space-between">
                <Typography level="body-sm" color="neutral">Total Questions:</Typography>
                <Typography level="body-sm" fontWeight="bold">{total}</Typography>
              </Box>
              <Box display="flex" justifyContent="space-between">
                <Typography level="body-sm" color="neutral">Questions Attempted:</Typography>
                <Typography level="body-sm" fontWeight="bold" color="success.600">{attemptedCount}</Typography>
              </Box>
              <Box display="flex" justifyContent="space-between">
                <Typography level="body-sm" color="neutral">Unattempted Questions:</Typography>
                <Typography level="body-sm" fontWeight="bold">{unattemptedCount}</Typography>
              </Box>
              <Box display="flex" justifyContent="space-between">
                <Typography level="body-sm" color="neutral">Proctoring Status:</Typography>
                <Chip size="sm" variant="soft" color={totalViolations > 0 ? "warning" : "success"}>
                  {totalViolations === 0 ? "Verified (Clean)" : `${totalViolations} Violation(s) Logged`}
                </Chip>
              </Box>
            </Stack>
          </Sheet>

          <Alert color="success" variant="soft" sx={{ mb: 4, textAlign: "left" }}>
            Your responses have been securely recorded and locked. To maintain examination integrity, your candidate session has been officially ended and you have been logged out.
          </Alert>

          <Button
            size="lg"
            variant="solid"
            color="primary"
            onClick={() => router.push("/login")}
            sx={{ minWidth: 240, mx: "auto" }}
          >
            Exit to Login Now ({logoutCountdown}s)
          </Button>
        </Card>
      </Box>
    );
  }

  const isIntegerType = currentQ.type === "integer" || !currentQ.options || currentQ.options.length === 0;

  return (
    <Box
      sx={{
        p: { xs: 1, md: 2 },
        userSelect: "none",
        WebkitUserSelect: "none",
      }}
      onCopy={(e) => e.preventDefault()}
      onCut={(e) => e.preventDefault()}
      onPaste={(e) => e.preventDefault()}
    >
      {/* Security Warning Modal */}
      <Modal open={!!warningMessage} onClose={clearWarning}>
        <ModalDialog variant="outlined" color="danger" role="alertdialog">
          <DialogTitle>
            <WarningRounded sx={{ color: "danger.500" }} /> Security Alert
          </DialogTitle>
          <Divider />
          <DialogContent>
            <Typography level="body-md">{warningMessage}</Typography>
          </DialogContent>
          <DialogActions>
            <Button
              variant="solid"
              color="danger"
              onClick={() => {
                clearWarning();
                enterFullscreen();
              }}
            >
              I Understand & Resume
            </Button>
          </DialogActions>
        </ModalDialog>
      </Modal>

      {/* Confirmation to Submit Modal */}
      <Modal open={confirmModalOpen} onClose={() => setConfirmModalOpen(false)}>
        <ModalDialog variant="outlined" role="alertdialog">
          <DialogTitle>
            <WarningRounded /> Submit Selection Test
          </DialogTitle>
          <Divider />
          <DialogContent>
            <Typography level="body-md">
              Are you sure you want to finish and submit the Winter Project Selection Test?
              <br />
              Answered: <b>{Object.keys(answers).length}</b> of <b>{questions.length}</b> questions across all 4 sections.
            </Typography>
          </DialogContent>
          <DialogActions>
            <Button
              variant="solid"
              color="danger"
              loading={submitting}
              onClick={(e) => handleSubmit(e, "Student confirmed submission")}
            >
              Yes, Submit Test
            </Button>
            <Button
              variant="plain"
              color="neutral"
              onClick={() => setConfirmModalOpen(false)}
            >
              Continue Test
            </Button>
          </DialogActions>
        </ModalDialog>
      </Modal>

      {/* Fullscreen Alert Banner if not in fullscreen */}
      {!isFullscreen && (
        <Alert
          color="warning"
          variant="soft"
          sx={{ mb: 2 }}
          startDecorator={<Fullscreen />}
          endDecorator={
            <Button size="sm" variant="solid" color="warning" onClick={enterFullscreen}>
              Enter Fullscreen
            </Button>
          }
        >
          Proctoring Rule: You must stay in Fullscreen mode during the test.
        </Alert>
      )}

      {/* Top 4 Section Page Selector Tabs */}
      <Sheet variant="outlined" sx={{ p: 1, mb: 2, borderRadius: "lg" }}>
        <Tabs
          value={activeSectionIndex}
          onChange={(e, val) => setActiveSectionIndex(val)}
          sx={{ bgcolor: "transparent" }}
        >
          <TabList
            tabFlex={1}
            sx={{
              [`&& .${tabClasses.root}`]: {
                fontWeight: 600,
                fontSize: { xs: "0.85rem", md: "1rem" },
                py: 1,
              },
            }}
          >
            {SECTION_NAMES.map((secName, secIdx) => {
              const qCount = (sectionQuestionsMap[secIdx] || []).length;
              return (
                <Tab key={secIdx} value={secIdx}>
                  <Layers fontSize="small" sx={{ mr: 1, display: { xs: "none", sm: "inline-block" } }} />
                  {secName} ({qCount} Qs)
                </Tab>
              );
            })}
          </TabList>
        </Tabs>
      </Sheet>

      <Grid container spacing={2}>
        {/* Main Section Question Interface */}
        <Grid xs={12} sm={9} lg={9}>
          <Sheet
            variant="soft"
            color="neutral"
            sx={{
              borderRadius: "lg",
              p: { xs: 2, md: 3 },
              minHeight: "80vh",
              display: "flex",
              flexDirection: "column",
              justifyContent: "space-between",
            }}
          >
            <Box>
              {/* Question Header & Chips */}
              <Box
                display="flex"
                justifyContent="space-between"
                alignItems="center"
                sx={{ mb: 2 }}
              >
                <Box display="flex" alignItems="center" gap={1}>
                  <Chip size="md" variant="solid" color="primary">
                    {SECTION_NAMES[activeSectionIndex]}
                  </Chip>
                  <Typography level="title-md">
                    Question {currentQSectionIndex + 1} of {currentSectionQuestions.length}
                  </Typography>
                </Box>

                <Stack direction="row" spacing={1}>
                  <Chip
                    size="sm"
                    variant="soft"
                    color={isIntegerType ? "warning" : "neutral"}
                    startDecorator={isIntegerType ? <Numbers fontSize="small" /> : <ListAlt fontSize="small" />}
                  >
                    {isIntegerType ? "Integer Type" : "Multiple Choice"}
                  </Chip>

                  {markedForReview[currentQ.id] && (
                    <Chip size="sm" color="warning" variant="solid" startDecorator={<Bookmark />}>
                      Marked
                    </Chip>
                  )}

                  {answers[currentQ.id] !== undefined && answers[currentQ.id] !== "" ? (
                    <Chip size="sm" color="success" variant="soft">
                      Answered
                    </Chip>
                  ) : (
                    <Chip size="sm" color="neutral" variant="soft">
                      Unanswered
                    </Chip>
                  )}
                </Stack>
              </Box>

              {/* Question Text */}
              <Typography level="h3" sx={{ mb: 3, fontWeight: 500, fontSize: "1.25rem" }}>
                {currentQ.question || "No question available in this section."}
              </Typography>

              {/* Optional Question Image */}
              {currentQ.image && (
                <Box sx={{ textAlign: "center", mb: 3 }}>
                  <img
                    src={currentQ.image}
                    alt="Question Diagram"
                    style={{
                      maxWidth: "100%",
                      maxHeight: "260px",
                      objectFit: "contain",
                      borderRadius: "8px",
                      border: "1px solid #ddd",
                    }}
                    onError={(e) => {
                      e.currentTarget.style.display = "none";
                    }}
                  />
                </Box>
              )}

              {/* QUESTION INPUT: INTEGER TYPE VS MCQ */}
              {isIntegerType ? (
                <Box
                  sx={{
                    my: 3,
                    p: 2.5,
                    bgcolor: "background.surface",
                    border: "2px dashed",
                    borderColor: "primary.300",
                    borderRadius: "md",
                  }}
                >
                  <Typography level="title-sm" sx={{ mb: 1 }}>
                    Numerical / Integer Input:
                  </Typography>
                  <Typography level="body-xs" color="neutral" sx={{ mb: 1.5 }}>
                    Enter an integer value (positive or negative number).
                  </Typography>
                  <Input
                    type="number"
                    step="1"
                    placeholder="Type your integer answer here..."
                    value={answers[currentQ.id] !== undefined ? answers[currentQ.id] : ""}
                    onChange={(e) => handleAnswerSelect(currentQ.id, e.target.value)}
                    size="lg"
                    sx={{
                      maxWidth: 320,
                      fontSize: "1.3rem",
                      fontWeight: "bold",
                      fontFamily: "monospace",
                    }}
                  />
                </Box>
              ) : (
                <Stack spacing={1.5} sx={{ mb: 4 }}>
                  {(currentQ.options || []).map((optText, optIdx) => {
                    const isSelected = answers[currentQ.id] === optIdx;
                    return (
                      <Box
                        key={optIdx}
                        onClick={() => handleAnswerSelect(currentQ.id, optIdx)}
                        sx={{
                          p: 1.5,
                          px: 2,
                          borderRadius: "md",
                          border: "2px solid",
                          borderColor: isSelected ? "primary.500" : "neutral.300",
                          bgcolor: isSelected ? "primary.softBg" : "background.surface",
                          cursor: "pointer",
                          transition: "all 0.15s ease",
                          display: "flex",
                          alignItems: "center",
                        }}
                      >
                        <Radio
                          checked={isSelected}
                          onChange={() => handleAnswerSelect(currentQ.id, optIdx)}
                          value={optIdx}
                          name={`question-${currentQ.id}`}
                          label={
                            <Typography level="body-md" sx={{ fontWeight: isSelected ? 600 : 400 }}>
                              {String.fromCharCode(65 + optIdx)}. {optText}
                            </Typography>
                          }
                        />
                      </Box>
                    );
                  })}
                </Stack>
              )}
            </Box>

            {/* Bottom Question Palette & Controls */}
            <Box>
              <Divider sx={{ my: 2 }} />

              {/* Section-specific question number pills */}
              <Box
                sx={{
                  display: "flex",
                  gap: 0.8,
                  overflowX: "auto",
                  pb: 1.5,
                  mb: 2,
                  "&::-webkit-scrollbar": { height: 6 },
                  "&::-webkit-scrollbar-thumb": { bgcolor: "neutral.400", borderRadius: 3 },
                }}
              >
                {currentSectionQuestions.map((q, idx) => {
                  const isCurrent = q.id === currentQ.id;
                  const isAns = answers[q.id] !== undefined && answers[q.id] !== "";
                  const isRev = markedForReview[q.id];

                  let variant = "outlined";
                  let color = "neutral";
                  if (isCurrent) {
                    variant = "solid";
                    color = "primary";
                  } else if (isRev) {
                    variant = "solid";
                    color = "warning";
                  } else if (isAns) {
                    variant = "soft";
                    color = "success";
                  }

                  return (
                    <Button
                      key={q.id || idx}
                      size="sm"
                      variant={variant}
                      color={color}
                      onClick={() => setCurrentQuestionId(q.id)}
                      sx={{
                        minWidth: 36,
                        height: 36,
                        p: 0,
                        flexShrink: 0,
                        fontWeight: 600,
                      }}
                    >
                      {idx + 1}
                    </Button>
                  );
                })}
              </Box>

              {/* Action Buttons */}
              <Stack
                direction={{ xs: "column", sm: "row" }}
                justifyContent="space-between"
                alignItems="center"
                spacing={1.5}
              >
                <Stack direction="row" spacing={1}>
                  <Button
                    variant="outlined"
                    color="neutral"
                    startDecorator={<BookmarkBorder />}
                    onClick={() => toggleMarkForReview(currentQ.id)}
                  >
                    {markedForReview[currentQ.id] ? "Unmark Review" : "Mark for Review"}
                  </Button>
                  {answers[currentQ.id] !== undefined && answers[currentQ.id] !== "" && (
                    <Button
                      variant="plain"
                      color="danger"
                      onClick={() => handleClearAnswer(currentQ.id)}
                    >
                      Clear Answer
                    </Button>
                  )}
                </Stack>

                <Stack direction="row" spacing={1}>
                  {/* Previous Question in Section */}
                  <Button
                    variant="outlined"
                    color="neutral"
                    disabled={currentQSectionIndex <= 0}
                    startDecorator={<NavigateBefore />}
                    onClick={() => {
                      if (currentQSectionIndex > 0) {
                        setCurrentQuestionId(currentSectionQuestions[currentQSectionIndex - 1].id);
                      }
                    }}
                  >
                    Previous
                  </Button>

                  {/* Next Question in Section */}
                  {currentQSectionIndex < currentSectionQuestions.length - 1 ? (
                    <Button
                      variant="solid"
                      color="primary"
                      endDecorator={<NavigateNext />}
                      onClick={() => {
                        setCurrentQuestionId(currentSectionQuestions[currentQSectionIndex + 1].id);
                      }}
                    >
                      Next
                    </Button>
                  ) : activeSectionIndex < 3 ? (
                    /* Next Section Page Button */
                    <Button
                      variant="solid"
                      color="warning"
                      endDecorator={<NavigateNext />}
                      onClick={() => {
                        setActiveSectionIndex((prev) => Math.min(3, prev + 1));
                      }}
                    >
                      Go to {SECTION_NAMES[activeSectionIndex + 1]} ➡️
                    </Button>
                  ) : (
                    /* Last section -> Submit button */
                    <Button
                      variant="solid"
                      color="danger"
                      onClick={() => setConfirmModalOpen(true)}
                    >
                      Submit Exam
                    </Button>
                  )}
                </Stack>
              </Stack>
            </Box>
          </Sheet>
        </Grid>

        {/* Side Panel: Webcam, Timer, Profile & Submit */}
        <Grid xs={12} sm={3} lg={3}>
          <Stack spacing={2}>
            {/* Live Camera & Face Tracking Component */}
            <Sheet variant="soft" color="neutral" sx={{ p: 1.5, borderRadius: "lg" }}>
              <CustomWebcam
                ref={webcamRef}
                examSubject={paperDetails.title || "Examination"}
                userId={currentUser.uid}
                onFaceAnomaly={handleFaceAnomaly}
                onSnapshotUploaded={handleSnapshotUploaded}
                enableSnapshots={true}
              />
            </Sheet>

            {/* Timer */}
            <Sheet
              variant="soft"
              color={timeLeft < 300 ? "danger" : "neutral"}
              sx={{ p: 2, borderRadius: "lg", textAlign: "center" }}
            >
              <Typography level="body-xs" color="neutral">
                EXAM TIME REMAINING
              </Typography>
              <Typography level="h1" sx={{ fontWeight: "bold", fontFamily: "monospace" }}>
                {formatTime(timeLeft)}
              </Typography>
            </Sheet>

            {/* Security Status Box */}
            <Sheet variant="soft" color="neutral" sx={{ p: 1.5, borderRadius: "lg" }}>
              <Stack spacing={1}>
                <Box display="flex" justifyContent="space-between" alignItems="center">
                  <Typography level="title-sm" startDecorator={<Security fontSize="small" />}>
                    Violations:
                  </Typography>
                  <Chip
                    size="sm"
                    color={violations === 0 ? "success" : violations < 3 ? "warning" : "danger"}
                    variant="solid"
                  >
                    {violations} / 3 Max
                  </Chip>
                </Box>
                <Typography level="body-xs" color="neutral">
                  Tab-switches, window blur, and exiting fullscreen are recorded.
                </Typography>
              </Stack>
            </Sheet>

            {/* User Candidate Profile */}
            <UserInfo />

            {/* Finish & Submit Button */}
            <Button
              fullWidth
              size="lg"
              color="danger"
              variant="solid"
              onClick={() => setConfirmModalOpen(true)}
            >
              Finish & Submit Test
            </Button>
          </Stack>
        </Grid>
      </Grid>
    </Box>
  );
}
