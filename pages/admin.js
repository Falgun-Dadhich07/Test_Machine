"use client";
import React, { useState, useEffect } from "react";
import { useAuth } from "../contexts/AuthContext";
import { useRouter } from "next/router";
import {
  Box,
  Typography,
  Tabs,
  TabList,
  Tab,
  TabPanel,
  Button,
  Alert,
  CircularProgress,
  Stack,
  Card,
  CardContent,
} from "@mui/joy";
import {
  ArrowBack,
  AdminPanelSettings,
  Assessment,
  NoteAdd,
  Lock,
} from "@mui/icons-material";
import Link from "next/link";
import Result from "../components/result";
import Question from "../components/question";
import CandidateManager from "../components/CandidateManager";

export default function AdminPage() {
  const { currentUser } = useAuth();
  const router = useRouter();
  const [selectedTab, setSelectedTab] = useState(0);
  const [checking, setChecking] = useState(true);

  const adminEmails = (process.env.NEXT_PUBLIC_ADMIN_EMAIL || "")
    .split(",")
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);

  const isAdmin =
    currentUser?.email &&
    (adminEmails.length === 0 || // If no admin emails set in env yet, allow developer access in dev
      adminEmails.includes(currentUser.email.toLowerCase()) ||
      currentUser.email.toLowerCase().startsWith("admin@"));

  useEffect(() => {
    if (!currentUser) {
      router.push("/login");
    } else {
      setChecking(false);
    }
  }, [currentUser, router]);

  if (checking) {
    return (
      <Box
        display="flex"
        justifyContent="center"
        alignItems="center"
        minHeight="60vh"
      >
        <CircularProgress size="lg" />
      </Box>
    );
  }

  if (!isAdmin) {
    return (
      <Box sx={{ maxWidth: 600, mx: "auto", mt: 8, p: 3 }}>
        <Card variant="outlined" color="danger">
          <CardContent sx={{ textAlign: "center", py: 4 }}>
            <Lock sx={{ fontSize: 60, color: "danger.500", mb: 2 }} />
            <Typography level="h2" color="danger" sx={{ mb: 1 }}>
              Access Denied
            </Typography>
            <Typography level="body-md" color="neutral" sx={{ mb: 3 }}>
              You do not have administrative privileges to access this area.
              Current signed in account: <b>{currentUser?.email}</b>
            </Typography>
            <Link href="/dashboard">
              <Button
                variant="solid"
                color="primary"
                startDecorator={<ArrowBack />}
              >
                Back to Student Dashboard
              </Button>
            </Link>
          </CardContent>
        </Card>
      </Box>
    );
  }

  return (
    <Box sx={{ maxWidth: 1400, mx: "auto", p: { xs: 2, md: 4 } }}>
      <Stack
        direction={{ xs: "column", sm: "row" }}
        justifyContent="space-between"
        alignItems={{ xs: "flex-start", sm: "center" }}
        spacing={2}
        sx={{ mb: 3 }}
      >
        <Box display="flex" alignItems="center" gap={2}>
          <img
            src="/share-logo.jpg"
            alt="ShARE: Student Chapter"
            width="46"
            height="46"
            style={{ borderRadius: "10px", objectFit: "cover" }}
          />
          <div>
            <Typography level="h1" sx={{ fontSize: "1.75rem", fontWeight: "bold" }}>
              ShARE: Student Chapter — Admin Panel
            </Typography>
            <Typography level="body-xs" color="neutral">
              Signed in as {currentUser.email}
            </Typography>
          </div>
        </Box>

        <Link href="/dashboard">
          <Button
            variant="outlined"
            color="neutral"
            startDecorator={<ArrowBack />}
          >
            Student Dashboard
          </Button>
        </Link>
      </Stack>

      <Tabs
        value={selectedTab}
        onChange={(e, val) => setSelectedTab(val)}
        sx={{ borderRadius: "lg", bgcolor: "background.body" }}
      >
        <TabList
          sx={{
            pt: 1,
            justifyContent: "center",
            [`&& .MuiTab-root`]: {
              fontWeight: 600,
              fontSize: "1rem",
              px: { xs: 1.5, sm: 3 },
            },
          }}
        >
          <Tab value={0}>
            <Assessment sx={{ mr: 1 }} /> Exam Results & Audits
          </Tab>
          <Tab value={1}>
            <NoteAdd sx={{ mr: 1 }} /> Quiz Creator & Manager
          </Tab>
          <Tab value={2}>
            <AdminPanelSettings sx={{ mr: 1 }} /> Candidate Accounts (210 Users)
          </Tab>
        </TabList>

        <TabPanel value={0} sx={{ p: 0, pt: 3 }}>
          <Result />
        </TabPanel>

        <TabPanel value={1} sx={{ p: 0, pt: 3 }}>
          <Question />
        </TabPanel>

        <TabPanel value={2} sx={{ p: 0, pt: 3 }}>
          <CandidateManager />
        </TabPanel>
      </Tabs>
    </Box>
  );
}
