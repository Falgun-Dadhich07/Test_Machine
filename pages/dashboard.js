import { useAuth } from "../contexts/AuthContext";
import { useRouter } from "next/router";
import { useEffect, useState, useCallback } from "react";
import { subjects as defaultSubjects, questionsData } from "../data/questions";
import { db } from "../firebase-config";
import { collection, getDocs } from "firebase/firestore";
import {
  Box,
  Typography,
  Card,
  CardContent,
  Button,
  Grid,
  Chip,
  CircularProgress,
  Stack,
  Checkbox,
  Sheet,
  Divider,
  Alert,
} from "@mui/joy";
import {
  PlayArrow,
  AdminPanelSettings,
  Timer,
  Security,
  AssignmentTurnedIn,
  CheckCircleOutline,
  HelpOutline,
  Lock,
} from "@mui/icons-material";
import Link from "next/link";

const initialDefaultTests = defaultSubjects.map((sub) => ({
  id: sub,
  subject: sub,
  title: sub,
  duration: 60,
  totalQuestions: questionsData[sub]?.length || 4,
}));

export default function Dashboard() {
  const { currentUser } = useAuth();
  const router = useRouter();
  const [availableTests, setAvailableTests] = useState(initialDefaultTests);
  const [agreed, setAgreed] = useState(false);
  const [hasSubmitted, setHasSubmitted] = useState(false);
  const [checkingAttempt, setCheckingAttempt] = useState(true);

  const adminEmails = (process.env.NEXT_PUBLIC_ADMIN_EMAIL || "")
    .split(",")
    .map((e) => e.trim().toLowerCase());
  const isAdmin =
    currentUser?.email &&
    (adminEmails.includes(currentUser.email.toLowerCase()) ||
      currentUser.email.toLowerCase().startsWith("admin@"));

  const checkCandidateAttempt = useCallback(async () => {
    if (!currentUser?.email) return;
    try {
      setCheckingAttempt(true);
      const res = await fetch(`/api/quiz/check-attempt?email=${encodeURIComponent(currentUser.email)}`);
      if (res.ok) {
        const data = await res.json();
        if (data.hasSubmitted && !data.isAdmin) {
          setHasSubmitted(true);
        }
      }
    } catch (e) {
      console.warn("Attempt check error:", e);
    } finally {
      setCheckingAttempt(false);
    }
  }, [currentUser]);

  const fetchDashboardData = useCallback(async () => {
    if (!currentUser) return;

    try {
      if (db) {
        const papersSnapshot = await getDocs(collection(db, "questionPapers"));
        const dynamicTests = [];
        papersSnapshot.forEach((doc) => {
          const data = doc.data();
          dynamicTests.push({
            id: doc.id,
            subject: data.subject || data.title,
            title: data.title || data.subject,
            duration: data.duration || 60,
            totalQuestions: data.totalQuestions || data.questions?.length || 4,
          });
        });

        if (dynamicTests.length > 0) {
          setAvailableTests(dynamicTests);
        }
      }
    } catch (papersErr) {
      console.warn("Question papers fetch note (using fallback):", papersErr.message);
    }
  }, [currentUser]);

  useEffect(() => {
    if (!currentUser) {
      router.push("/login");
      return;
    }
    fetchDashboardData();
    checkCandidateAttempt();
  }, [currentUser, router, fetchDashboardData, checkCandidateAttempt]);

  const startTest = (subjectOrId) => {
    if (hasSubmitted && !isAdmin) return;
    if (!agreed) return;
    router.push(`/test/${encodeURIComponent(subjectOrId)}`);
  };

  if (!currentUser) {
    return (
      <Box
        display="flex"
        justifyContent="center"
        alignItems="center"
        minHeight="50vh"
      >
        <CircularProgress size="lg" />
      </Box>
    );
  }

  const primaryTest = availableTests[0] || initialDefaultTests[0];

  return (
    <Box sx={{ maxWidth: 1100, mx: "auto", p: { xs: 2, md: 3 } }}>
      {/* Header Banner */}
      <Box
        display="flex"
        justifyContent="space-between"
        alignItems="center"
        sx={{ mb: 4, pb: 2, borderBottom: "1px solid", borderColor: "divider" }}
      >
        <Box display="flex" alignItems="center" gap={2}>
          <img
            src="/share-logo.jpg"
            alt="ShARE: Student Chapter"
            width="50"
            height="50"
            style={{ borderRadius: "10px", objectFit: "cover" }}
          />
          <div>
            <Typography level="h1" sx={{ fontWeight: "bold", fontSize: "1.75rem" }}>
              ShARE: Student Chapter
            </Typography>
            <Typography level="body-sm" color="neutral" sx={{ mt: 0.25 }}>
              Candidate ID: <b>{currentUser.email}</b>
            </Typography>
          </div>
        </Box>

        {isAdmin && (
          <Link href="/admin">
            <Button
              color="danger"
              variant="soft"
              startDecorator={<AdminPanelSettings />}
            >
              Admin Panel
            </Button>
          </Link>
        )}
      </Box>

      {/* Main Grid: Exam Overview on Left, Instructions & Agreement on Right */}
      <Grid container spacing={3}>
        {/* Left Column: Examination Details Card */}
        <Grid xs={12} md={5}>
          <Card
            variant="outlined"
            sx={{
              height: "100%",
              display: "flex",
              flexDirection: "column",
              justifyContent: "space-between",
              p: 3,
              borderRadius: "lg",
              boxShadow: "sm",
            }}
          >
            <div>
              {hasSubmitted && !isAdmin ? (
                <Chip
                  size="sm"
                  variant="solid"
                  color="danger"
                  startDecorator={<Lock fontSize="small" />}
                  sx={{ mb: 2, fontWeight: "bold" }}
                >
                  TEST ALREADY SUBMITTED
                </Chip>
              ) : (
                <Chip
                  size="sm"
                  variant="solid"
                  color="primary"
                  sx={{ mb: 2, fontWeight: "bold" }}
                >
                  WINTER PROJECT SELECTION
                </Chip>
              )}
              <Typography level="h2" sx={{ fontWeight: "bold", mb: 1 }}>
                Winter Project Selection Test
              </Typography>
              <Typography level="body-sm" color="neutral" sx={{ mb: 2 }}>
                Official selection assessment featuring 4 sections with both
                Multiple Choice and Numerical Integer-type questions.
              </Typography>

              {hasSubmitted && !isAdmin && (
                <Alert color="danger" variant="soft" sx={{ mb: 2.5 }} startDecorator={<Lock />}>
                  <div>
                    <Typography level="title-sm" fontWeight="bold">
                      Single Attempt Limit
                    </Typography>
                    <Typography level="body-xs">
                      You have already completed and submitted your examination. Under ShARE guidelines, candidates may take the test only once. Multiple attempts are not permitted.
                    </Typography>
                  </div>
                </Alert>
              )}

              <Stack spacing={1.5} sx={{ mb: 3 }}>
                <Box display="flex" alignItems="center" gap={1.5}>
                  <Timer color="action" />
                  <div>
                    <Typography level="body-xs" color="neutral">
                      Total Duration
                    </Typography>
                    <Typography level="body-sm" sx={{ fontWeight: "bold" }}>
                      {primaryTest.duration} Minutes
                    </Typography>
                  </div>
                </Box>

                <Box display="flex" alignItems="center" gap={1.5}>
                  <AssignmentTurnedIn color="action" />
                  <div>
                    <Typography level="body-xs" color="neutral">
                      Question Structure
                    </Typography>
                    <Typography level="body-sm" sx={{ fontWeight: "bold" }}>
                      4 Sections (MCQ + Numerical Integer)
                    </Typography>
                  </div>
                </Box>

                <Box display="flex" alignItems="center" gap={1.5}>
                  <Security color="action" />
                  <div>
                    <Typography level="body-xs" color="neutral">
                      Proctoring Status
                    </Typography>
                    <Typography level="body-sm" sx={{ fontWeight: "bold" }}>
                      AI Facial &amp; Fullscreen Monitoring Active
                    </Typography>
                  </div>
                </Box>
              </Stack>
            </div>

            <Box sx={{ pt: 2, borderTop: "1px solid", borderColor: "divider" }}>
              {hasSubmitted && !isAdmin ? (
                <Button
                  variant="soft"
                  color="neutral"
                  size="lg"
                  fullWidth
                  disabled
                  startDecorator={<Lock />}
                  sx={{ borderRadius: "md", py: 1.5, fontWeight: "bold" }}
                >
                  Test Completed (Locked)
                </Button>
              ) : (
                <>
                  <Button
                    variant="solid"
                    color="primary"
                    size="lg"
                    fullWidth
                    disabled={!agreed}
                    startDecorator={<PlayArrow />}
                    onClick={() => startTest(primaryTest.subject)}
                    sx={{ borderRadius: "md", py: 1.5, fontWeight: "bold" }}
                  >
                    Start Selection Test
                  </Button>
                  {!agreed && (
                    <Typography
                      level="body-xs"
                      color="danger"
                      sx={{ textAlign: "center", mt: 1 }}
                    >
                      * Read instructions and tick the declaration checkbox to enable
                    </Typography>
                  )}
                </>
              )}
            </Box>
          </Card>
        </Grid>

        {/* Right Column: Complete Examination Instructions & Mandatory Agreement Checkbox */}
        <Grid xs={12} md={7}>
          <Card
            variant="outlined"
            sx={{
              p: 3,
              borderRadius: "lg",
              boxShadow: "sm",
              display: "flex",
              flexDirection: "column",
            }}
          >
            <Box display="flex" alignItems="center" gap={1} sx={{ mb: 2 }}>
              <Security color="primary" />
              <Typography level="h3" sx={{ fontWeight: "bold" }}>
                Test Instructions &amp; Rules
              </Typography>
            </Box>

            <Sheet
              variant="soft"
              color="neutral"
              sx={{
                p: 2.5,
                borderRadius: "md",
                maxHeight: 330,
                overflowY: "auto",
                mb: 2.5,
                fontSize: "0.9rem",
              }}
            >
              <Stack spacing={2}>
                <Box>
                  <Typography level="title-sm" sx={{ fontWeight: "bold", color: "primary.600" }}>
                    1. Structure of the Test
                  </Typography>
                  <Typography level="body-xs" sx={{ mt: 0.5 }}>
                    The test is organized into <b>4 distinct sections</b>. You can navigate between sections using the tabs at the top of the test window.
                    Sections 1, 2, and 3 contain Multiple Choice Questions. Section 4 consists of Numerical/Integer questions where you must type the integer answer.
                  </Typography>
                </Box>

                <Box>
                  <Typography level="title-sm" sx={{ fontWeight: "bold", color: "primary.600" }}>
                    2. Mandatory Fullscreen Mode
                  </Typography>
                  <Typography level="body-xs" sx={{ mt: 0.5 }}>
                    The test will immediately launch in full-screen mode. Attempting to exit full-screen, minimize the browser, or switch to another tab/window will be recorded as a <b>security violation</b>.
                  </Typography>
                </Box>

                <Box>
                  <Typography level="title-sm" sx={{ fontWeight: "bold", color: "primary.600" }}>
                    3. AI Camera Proctoring
                  </Typography>
                  <Typography level="body-xs" sx={{ mt: 0.5 }}>
                    Your webcam must remain enabled throughout the test. Ensure your face is centered and clearly lit. Looking away repeatedly, having another person in frame, or covering the camera will trigger violation alerts.
                  </Typography>
                </Box>

                <Box>
                  <Typography level="title-sm" sx={{ fontWeight: "bold", color: "primary.600" }}>
                    4. Violation Limit &amp; Auto-Submit
                  </Typography>
                  <Typography level="body-xs" sx={{ mt: 0.5 }}>
                    A maximum of <b>3 violations</b> is permitted. If the violation threshold is exceeded or if time expires, your answers will be automatically submitted and locked.
                  </Typography>
                </Box>

                <Box>
                  <Typography level="title-sm" sx={{ fontWeight: "bold", color: "primary.600" }}>
                    5. Privacy &amp; Evaluation
                  </Typography>
                  <Typography level="body-xs" sx={{ mt: 0.5 }}>
                    Once submitted, your responses are sent securely to the administrative server. Official scores and evaluations will be reviewed directly by the ShARE team.
                  </Typography>
                </Box>
              </Stack>
            </Sheet>

            {/* Candidate Declaration Checkbox */}
            <Sheet
              variant="outlined"
              color={agreed ? "success" : "primary"}
              sx={{
                p: 2,
                borderRadius: "md",
                backgroundColor: agreed ? "success.softBg" : "background.level1",
              }}
            >
              <Checkbox
                checked={agreed}
                onChange={(e) => setAgreed(e.target.checked)}
                color="primary"
                size="md"
                label={
                  <Typography level="body-sm" sx={{ fontWeight: "semibold", cursor: "pointer" }}>
                    I have carefully read, understood, and agreed to all the Winter Project Selection Test rules, proctoring guidelines, and code of conduct.
                  </Typography>
                }
              />
            </Sheet>
          </Card>
        </Grid>
      </Grid>
    </Box>
  );
}
