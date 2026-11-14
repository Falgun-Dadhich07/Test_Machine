"use client";
import React, { useState, useEffect, useCallback } from "react";
import {
  Box,
  Typography,
  Card,
  CardContent,
  Button,
  Textarea,
  Input,
  LinearProgress,
  Alert,
  Table,
  Sheet,
  Chip,
  Stack,
  Divider,
} from "@mui/joy";
import {
  GroupAdd,
  Download,
  CheckCircle,
  Warning,
  Refresh,
  Person,
  ContentPaste,
} from "@mui/icons-material";
import { collection, getDocs, query, limit } from "firebase/firestore";
import { db } from "../firebase-config";

export default function CandidateManager() {
  const [inputText, setInputText] = useState("");
  const [usersList, setUsersList] = useState([]);
  const [loading, setLoading] = useState(false);
  const [importing, setImporting] = useState(false);
  const [progress, setProgress] = useState({ current: 0, total: 0, success: 0, failed: 0 });
  const [statusAlert, setStatusAlert] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");

  const fetchUsers = useCallback(async () => {
    setLoading(true);
    try {
      const q = query(collection(db, "user"), limit(300));
      const snap = await getDocs(q);
      const data = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
      setUsersList(data);
    } catch (e) {
      console.error("Failed to load users:", e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  const parseInput = (text) => {
    const lines = text.split("\n").map((l) => l.trim()).filter(Boolean);
    const parsed = [];

    lines.forEach((line) => {
      // Format 1: email, password, name, rollNumber
      // Format 2: email, password
      const parts = line.split(",").map((p) => p.trim());
      if (parts.length >= 2 && parts[0].includes("@")) {
        parsed.push({
          email: parts[0],
          password: parts[1],
          username: parts[2] || parts[0].split("@")[0],
          roleNumber: parts[3] || Math.floor(100000 + Math.random() * 900000).toString(),
        });
      }
    });

    return parsed;
  };

  const handleStartImport = async () => {
    const candidates = parseInput(inputText);
    if (candidates.length === 0) {
      setStatusAlert({
        type: "warning",
        message: "No valid lines found. Use format: email, password, [optionalName], [optionalRollNumber]",
      });
      return;
    }

    setImporting(true);
    setProgress({ current: 0, total: candidates.length, success: 0, failed: 0 });
    setStatusAlert(null);

    let successCount = 0;
    let failedCount = 0;

    for (let i = 0; i < candidates.length; i++) {
      const candidate = candidates[i];
      try {
        const res = await fetch("/api/admin/create-user", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(candidate),
        });

        const data = await res.json();
        if (data.success) {
          successCount++;
        } else {
          failedCount++;
        }
      } catch (err) {
        failedCount++;
      }

      setProgress({
        current: i + 1,
        total: candidates.length,
        success: successCount,
        failed: failedCount,
      });
    }

    setImporting(false);
    setStatusAlert({
      type: "success",
      message: `Batch import complete! Successfully provisioned ${successCount} candidate accounts (${failedCount} failed or skipped).`,
    });
    setInputText("");
    fetchUsers();
  };

  const handleFillTemplate = () => {
    // Fill 5 demo lines so user can see format
    const demo = [
      "candidate001@example.com,Pass1234,Aarav Sharma,101",
      "candidate002@example.com,Pass1234,Priya Patel,102",
      "candidate003@example.com,Pass1234,Rohan Gupta,103",
      "candidate004@example.com,Pass1234,Ananya Singh,104",
      "candidate005@example.com,Pass1234,Kavya Joshi,105",
    ].join("\n");
    setInputText(demo);
  };

  const handleExportCSV = () => {
    if (usersList.length === 0) return;
    const header = "Email,Username,RollNumber,DateOfBirth\n";
    const rows = usersList
      .map((u) => `"${u.email || ""}","${u.username || ""}","${u.roleNumber || ""}","${u.dateOfBirth || ""}"`)
      .join("\n");

    const blob = new Blob([header + rows], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `registered_candidates_${new Date().toISOString().split("T")[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const filteredUsers = usersList.filter(
    (u) =>
      u.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      u.username?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      u.roleNumber?.toString().includes(searchTerm)
  );

  return (
    <Box sx={{ maxWidth: 1200, mx: "auto" }}>
      <Stack spacing={3}>
        {/* Bulk Account Importer Card */}
        <Card variant="outlined">
          <CardContent>
            <Box display="flex" justifyContent="space-between" alignItems="center" mb={1}>
              <Typography level="h3" startDecorator={<GroupAdd />}>
                Bulk Candidate Account Importer (210 Accounts)
              </Typography>
              <Button size="sm" variant="outlined" color="neutral" onClick={handleFillTemplate}>
                Insert Format Example
              </Button>
            </Box>

            <Typography level="body-sm" color="neutral" sx={{ mb: 2 }}>
              Paste your 210 candidate credentials below (one candidate per line).
              Format: <code>email, password, [optionalName], [optionalRollNumber]</code>
            </Typography>

            <Textarea
              minRows={5}
              maxRows={12}
              placeholder="student1@school.com, MySecretPass123, Student Name, 10001
student2@school.com, MySecretPass123, Student Name, 10002"
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              disabled={importing}
              sx={{ fontFamily: "monospace", fontSize: "0.875rem", mb: 2 }}
            />

            {importing && (
              <Box sx={{ my: 2 }}>
                <Box display="flex" justifyContent="space-between" mb={0.5}>
                  <Typography level="body-sm">
                    Creating Candidate Accounts: {progress.current} / {progress.total}
                  </Typography>
                  <Typography level="body-sm" fontWeight="bold">
                    {Math.round((progress.current / progress.total) * 100)}%
                  </Typography>
                </Box>
                <LinearProgress
                  determinate
                  value={(progress.current / progress.total) * 100}
                  color="primary"
                />
              </Box>
            )}

            {statusAlert && (
              <Alert
                color={statusAlert.type === "success" ? "success" : "warning"}
                variant="soft"
                sx={{ mb: 2 }}
                startDecorator={statusAlert.type === "success" ? <CheckCircle /> : <Warning />}
              >
                {statusAlert.message}
              </Alert>
            )}

            <Button
              size="lg"
              color="primary"
              variant="solid"
              disabled={importing || !inputText.trim()}
              loading={importing}
              startDecorator={<ContentPaste />}
              onClick={handleStartImport}
            >
              {importing ? "Importing Candidates..." : "Provision & Register Candidates in Firebase"}
            </Button>
          </CardContent>
        </Card>

        {/* Existing Registered Candidates Card */}
        <Card variant="outlined">
          <CardContent>
            <Box
              display="flex"
              flexDirection={{ xs: "column", sm: "row" }}
              justifyContent="space-between"
              alignItems={{ xs: "flex-start", sm: "center" }}
              gap={2}
              mb={2}
            >
              <div>
                <Typography level="h3" startDecorator={<Person />}>
                  Authorized Candidates ({usersList.length})
                </Typography>
                <Typography level="body-xs" color="neutral">
                  These accounts are authorized to sign in and take quizzes.
                </Typography>
              </div>

              <Stack direction="row" spacing={1}>
                <Input
                  size="sm"
                  placeholder="Search by email / roll #..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  sx={{ width: 220 }}
                />
                <Button size="sm" variant="outlined" color="neutral" startDecorator={<Refresh />} onClick={fetchUsers}>
                  Refresh
                </Button>
                <Button size="sm" variant="soft" color="success" startDecorator={<Download />} onClick={handleExportCSV}>
                  Export CSV
                </Button>
              </Stack>
            </Box>

            <Sheet
              variant="outlined"
              sx={{
                borderRadius: "md",
                overflow: "auto",
                maxHeight: 400,
              }}
            >
              <Table borderAxis="bothBetween" stripe="odd" stickyHeader>
                <thead>
                  <tr>
                    <th style={{ width: 40 }}>#</th>
                    <th>Email</th>
                    <th>Name</th>
                    <th>Roll Number</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredUsers.length === 0 ? (
                    <tr>
                      <td colSpan={5} style={{ textAlign: "center", padding: "20px" }}>
                        {loading ? "Loading registered candidates..." : "No candidate accounts found. Paste candidates above to import them."}
                      </td>
                    </tr>
                  ) : (
                    filteredUsers.map((u, i) => (
                      <tr key={u.id || i}>
                        <td>{i + 1}</td>
                        <td style={{ fontWeight: 500 }}>{u.email}</td>
                        <td>{u.username || "—"}</td>
                        <td>{u.roleNumber || "—"}</td>
                        <td>
                          <Chip size="sm" variant="soft" color="success">
                            Authorized
                          </Chip>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </Table>
            </Sheet>
          </CardContent>
        </Card>
      </Stack>
    </Box>
  );
}
