// components/result.js
import { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Card,
  CardContent,
  Table,
  Sheet,
  Chip,
  Button,
  Input,
  Select,
  Option,
  Modal,
  ModalDialog,
  ModalClose,
  Divider,
  Stack,
  Grid,
  IconButton,
  Alert,
  Tooltip,
} from '@mui/joy';
import {
  Search,
  Eye,
  Download,
  Users,
  FileText,
  BarChart3,
  Calendar,
  Unlock,
  ShieldAlert,
  RefreshCw,
} from 'lucide-react';
import { collection, getDocs, query, limit } from 'firebase/firestore';
import { db } from '../firebase-config';

export default function AdminDashboard() {
  const [users, setUsers] = useState([]);
  const [testResults, setTestResults] = useState([]);
  const [filteredResults, setFilteredResults] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedUser, setSelectedUser] = useState(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [subjectFilter, setSubjectFilter] = useState('all');
  const [dateFilter, setDateFilter] = useState('all');

  // Unlock / Renew Participant State
  const [unlockEmailInput, setUnlockEmailInput] = useState('');
  const [unlockTarget, setUnlockTarget] = useState(null);
  const [unlockModalOpen, setUnlockModalOpen] = useState(false);
  const [unlocking, setUnlocking] = useState(false);
  const [actionAlert, setActionAlert] = useState(null);

  const [stats, setStats] = useState({
    totalUsers: 0,
    totalTests: 0,
    averageScore: 0,
    passRate: 0,
  });

  useEffect(() => {
    fetchData();
  }, []);

  useEffect(() => {
    filterResults();
  }, [testResults, searchTerm, subjectFilter, dateFilter]);

  const fetchData = async () => {
    try {
      setLoading(true);

      if (db) {
        try {
          const usersQuery = query(collection(db, 'user'), limit(300));
          const usersSnapshot = await getDocs(usersQuery);
          const usersData = usersSnapshot.docs.map((doc) => ({
            id: doc.id,
            ...doc.data(),
          }));
          setUsers(usersData);
        } catch (uErr) {
          console.warn('Users fetch note:', uErr.message);
        }
      }

      let testResultsData = [];
      try {
        const res = await fetch('/api/admin/results');
        if (res.ok) {
          const json = await res.json();
          if (json.results && Array.isArray(json.results)) {
            testResultsData = json.results;
          }
        }
      } catch (e) {
        console.warn('API results fetch note:', e);
      }

      if (testResultsData.length === 0 && db) {
        try {
          const testResultsQuery = query(collection(db, 'testResults'), limit(250));
          const testResultsSnapshot = await getDocs(testResultsQuery);
          testResultsData = testResultsSnapshot.docs.map((doc) => ({
            id: doc.id,
            ...doc.data(),
          }));
        } catch (dbErr) {
          console.warn('Firestore testResults query note:', dbErr);
        }
      }

      setTestResults(testResultsData);
      calculateStats(users, testResultsData);
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  const calculateStats = (usersData, testResultsData) => {
    const totalUsers = usersData.length || 220;
    const totalTests = testResultsData.length;
    const averageScore =
      totalTests > 0
        ? testResultsData.reduce(
            (sum, test) => sum + ((test.score || 0) / (test.totalQuestions || 1)) * 100,
            0
          ) / totalTests
        : 0;
    const passRate =
      totalTests > 0
        ? (testResultsData.filter(
            (test) => ((test.score || 0) / (test.totalQuestions || 1)) * 100 >= 60
          ).length /
            totalTests) *
          100
        : 0;

    setStats({
      totalUsers,
      totalTests,
      averageScore: Math.round(averageScore * 100) / 100,
      passRate: Math.round(passRate * 100) / 100,
    });
  };

  const getResultDateObj = (result) => {
    if (result.createdAt) return new Date(result.createdAt);
    if (result.timestamp?.toDate) return result.timestamp.toDate();
    if (result.timestamp?.seconds) return new Date(result.timestamp.seconds * 1000);
    if (result.timestamp) return new Date(result.timestamp);
    return null;
  };

  const filterResults = () => {
    let filtered = [...testResults];

    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(
        (result) =>
          result.userEmail?.toLowerCase().includes(term) ||
          result.subject?.toLowerCase().includes(term)
      );
    }

    if (subjectFilter !== 'all') {
      filtered = filtered.filter((result) => result.subject === subjectFilter);
    }

    if (dateFilter !== 'all') {
      const now = new Date();
      const filterDate = new Date();

      switch (dateFilter) {
        case 'today':
          filterDate.setHours(0, 0, 0, 0);
          filtered = filtered.filter((result) => {
            const d = getResultDateObj(result);
            return d && d >= filterDate;
          });
          break;
        case 'week':
          filterDate.setDate(now.getDate() - 7);
          filtered = filtered.filter((result) => {
            const d = getResultDateObj(result);
            return d && d >= filterDate;
          });
          break;
        case 'month':
          filterDate.setMonth(now.getMonth() - 1);
          filtered = filtered.filter((result) => {
            const d = getResultDateObj(result);
            return d && d >= filterDate;
          });
          break;
      }
    }

    setFilteredResults(filtered);
  };

  const getUserInfo = (userId) => {
    return users.find((user) => user.uid === userId) || {};
  };

  const getScoreColor = (score, total) => {
    const percentage = (score / (total || 1)) * 100;
    if (percentage >= 80) return 'success';
    if (percentage >= 60) return 'warning';
    return 'danger';
  };

  const getViolationColor = (count) => {
    const v = Number(count) || 0;
    if (v === 0) return 'success';
    if (v < 3) return 'warning';
    return 'danger';
  };

  const formatTimestamp = (result) => {
    const d = getResultDateObj(result);
    if (!d || isNaN(d.getTime())) return 'N/A';
    return d.toLocaleString();
  };

  const formatSectionScore = (sectionObj) => {
    if (!sectionObj || !sectionObj.total) return '-';
    return `${sectionObj.score}/${sectionObj.total}`;
  };

  const handleViewDetails = (result) => {
    setSelectedUser(result);
    setModalOpen(true);
  };

  const promptUnlockCandidate = (email, resultId = null) => {
    const clean = (email || '').trim();
    if (!clean && !resultId) return;
    setUnlockTarget({ email: clean, resultId });
    setUnlockModalOpen(true);
  };

  const confirmUnlockCandidate = async () => {
    if (!unlockTarget) return;
    setUnlocking(true);
    setActionAlert(null);
    try {
      const res = await fetch('/api/admin/unlock-candidate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: unlockTarget.email,
          resultId: unlockTarget.resultId,
        }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setActionAlert({
          color: 'success',
          message: `Unlocked ${unlockTarget.email}: previous submission cleared and candidate can now retake the test.`,
        });
        setUnlockEmailInput('');
        setModalOpen(false);
        setUnlockModalOpen(false);
        setUnlockTarget(null);
        await fetchData();
      } else {
        setActionAlert({
          color: 'danger',
          message: data.error || 'Failed to unlock candidate.',
        });
      }
    } catch (err) {
      setActionAlert({
        color: 'danger',
        message: 'Network error while unlocking candidate: ' + err.message,
      });
    } finally {
      setUnlocking(false);
    }
  };

  const exportToCSV = () => {
    const headers = [
      'Student Email',
      'Subject',
      'Finance',
      'Python',
      'ML',
      'Aptitude',
      'Total Score',
      'Total Questions',
      'Percentage',
      'Violations',
      'Date',
    ];
    const csvData = filteredResults.map((result) => {
      const s = result.sectionScores || {};
      return [
        result.userEmail,
        result.subject,
        formatSectionScore(s[0]),
        formatSectionScore(s[1]),
        formatSectionScore(s[2]),
        formatSectionScore(s[3]),
        result.score,
        result.totalQuestions,
        `${Math.round(((result.score || 0) / (result.totalQuestions || 1)) * 100)}%`,
        Number(result.violations) || 0,
        formatTimestamp(result),
      ];
    });

    const csvContent = [headers, ...csvData]
      .map((row) => row.map((field) => `"${field}"`).join(','))
      .join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'share_selection_results.csv';
    a.click();
    window.URL.revokeObjectURL(url);
  };

  const getUniqueSubjects = () => {
    return [...new Set(testResults.map((result) => result.subject).filter(Boolean))];
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '40vh' }}>
        <Typography level="h4">Loading dashboard...</Typography>
      </Box>
    );
  }

  return (
    <Box sx={{ p: 3, bgcolor: 'background.surface', borderRadius: 'md' }}>
      {/* Header */}
      <Stack
        direction={{ xs: 'column', sm: 'row' }}
        justifyContent="space-between"
        alignItems={{ xs: 'flex-start', sm: 'center' }}
        spacing={2}
        sx={{ mb: 3 }}
      >
        <div>
          <Typography level="h2" sx={{ mb: 0.5, fontWeight: 'bold' }}>
            Winter Project Selection Test Results
          </Typography>
          <Typography level="body-md" color="neutral">
            Monitor section-wise scores, total scores, proctoring violations, and unlock participants
          </Typography>
        </div>
        <Button
          variant="soft"
          color="primary"
          startDecorator={<RefreshCw size={16} />}
          onClick={fetchData}
        >
          Refresh Results
        </Button>
      </Stack>

      {actionAlert && (
        <Alert
          color={actionAlert.color}
          variant="soft"
          sx={{ mb: 3 }}
          endDecorator={
            <Button size="sm" variant="plain" color={actionAlert.color} onClick={() => setActionAlert(null)}>
              Dismiss
            </Button>
          }
        >
          {actionAlert.message}
        </Alert>
      )}

      {/* Stats Cards */}
      <Grid container spacing={2} sx={{ mb: 3 }}>
        <Grid xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Stack direction="row" spacing={2} alignItems="center">
                <Box sx={{ p: 1, borderRadius: 'md', backgroundColor: 'primary.100' }}>
                  <Users size={20} color="var(--joy-palette-primary-500)" />
                </Box>
                <Box>
                  <Typography level="h3">{stats.totalUsers}</Typography>
                  <Typography level="body-sm" color="neutral">Registered Roster</Typography>
                </Box>
              </Stack>
            </CardContent>
          </Card>
        </Grid>

        <Grid xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Stack direction="row" spacing={2} alignItems="center">
                <Box sx={{ p: 1, borderRadius: 'md', backgroundColor: 'success.100' }}>
                  <FileText size={20} color="var(--joy-palette-success-500)" />
                </Box>
                <Box>
                  <Typography level="h3">{stats.totalTests}</Typography>
                  <Typography level="body-sm" color="neutral">Submissions</Typography>
                </Box>
              </Stack>
            </CardContent>
          </Card>
        </Grid>

        <Grid xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Stack direction="row" spacing={2} alignItems="center">
                <Box sx={{ p: 1, borderRadius: 'md', backgroundColor: 'warning.100' }}>
                  <BarChart3 size={20} color="var(--joy-palette-warning-500)" />
                </Box>
                <Box>
                  <Typography level="h3">{stats.averageScore}%</Typography>
                  <Typography level="body-sm" color="neutral">Average Score</Typography>
                </Box>
              </Stack>
            </CardContent>
          </Card>
        </Grid>

        <Grid xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Stack direction="row" spacing={2} alignItems="center">
                <Box sx={{ p: 1, borderRadius: 'md', backgroundColor: 'danger.100' }}>
                  <Calendar size={20} color="var(--joy-palette-danger-500)" />
                </Box>
                <Box>
                  <Typography level="h3">{stats.passRate}%</Typography>
                  <Typography level="body-sm" color="neutral">Pass Rate (&ge;60%)</Typography>
                </Box>
              </Stack>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Filters & Quick Unlock */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Stack spacing={2}>
            <Stack direction={{ xs: 'column', md: 'row' }} spacing={2} alignItems={{ xs: 'stretch', md: 'center' }} flexWrap="wrap">
              <Input
                placeholder="Search by email or test..."
                startDecorator={<Search size={16} />}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                sx={{ minWidth: 230, flex: 1 }}
              />

              <Select
                placeholder="Filter by test"
                value={subjectFilter}
                onChange={(e, value) => setSubjectFilter(value)}
                sx={{ minWidth: 160 }}
              >
                <Option value="all">All Tests</Option>
                {getUniqueSubjects().map((subject) => (
                  <Option key={subject} value={subject}>
                    {subject}
                  </Option>
                ))}
              </Select>

              <Select
                placeholder="Filter by date"
                value={dateFilter}
                onChange={(e, value) => setDateFilter(value)}
                sx={{ minWidth: 140 }}
              >
                <Option value="all">All Time</Option>
                <Option value="today">Today</Option>
                <Option value="week">This Week</Option>
                <Option value="month">This Month</Option>
              </Select>

              <Button
                variant="outlined"
                startDecorator={<Download size={16} />}
                onClick={exportToCSV}
                disabled={filteredResults.length === 0}
              >
                Export CSV
              </Button>
            </Stack>

            <Divider />

            {/* Quick Unlock Participant by Email */}
            <Stack
              direction={{ xs: 'column', sm: 'row' }}
              spacing={1.5}
              alignItems={{ xs: 'stretch', sm: 'center' }}
            >
              <Typography level="body-sm" fontWeight="bold" sx={{ whiteSpace: 'nowrap' }}>
                Renew / Unlock Participant:
              </Typography>
              <Input
                placeholder="Enter participant email to reverse lock (e.g. name@iitk.ac.in)"
                value={unlockEmailInput}
                onChange={(e) => setUnlockEmailInput(e.target.value)}
                sx={{ flex: 1, minWidth: 260 }}
                size="sm"
              />
              <Button
                size="sm"
                variant="soft"
                color="warning"
                startDecorator={<Unlock size={15} />}
                disabled={!unlockEmailInput.trim()}
                onClick={() => promptUnlockCandidate(unlockEmailInput.trim())}
              >
                Unlock / Allow Retake
              </Button>
            </Stack>
          </Stack>
        </CardContent>
      </Card>

      {/* Results Table */}
      <Card>
        <CardContent sx={{ p: 0 }}>
          <Sheet sx={{ overflow: 'auto' }}>
            <Table hoverRow sx={{ '& th': { whiteSpace: 'nowrap' } }}>
              <thead>
                <tr>
                  <th>Student</th>
                  <th>Test</th>
                  <th>Section-Wise Score (Finance / Python / ML / Aptitude)</th>
                  <th>Total Score</th>
                  <th>Violations</th>
                  <th>Date</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredResults.length === 0 ? (
                  <tr>
                    <td colSpan={7}>
                      <Box sx={{ textAlign: 'center', py: 4 }}>
                        <Typography level="body-md" color="neutral">
                          No test results found
                        </Typography>
                      </Box>
                    </td>
                  </tr>
                ) : (
                  filteredResults.map((result) => {
                    const userInfo = getUserInfo(result.userId);
                    const totalQ = result.totalQuestions || 1;
                    const percentage = Math.round(((result.score || 0) / totalQ) * 100);
                    const sec = result.sectionScores || {};
                    const vCount = Number(result.violations) || 0;

                    return (
                      <tr key={result.id}>
                        <td>
                          <Box>
                            <Typography level="body-sm" fontWeight="md">
                              {result.userEmail}
                            </Typography>
                            <Typography level="body-xs" color="neutral">
                              {userInfo.username || result.userEmail?.split('@')[0] || 'N/A'}
                            </Typography>
                          </Box>
                        </td>
                        <td>
                          <Chip size="sm" variant="soft">
                            {result.subject}
                          </Chip>
                        </td>
                        <td>
                          <Stack direction="row" spacing={0.5} flexWrap="wrap" useFlexGap>
                            {['Finance', 'Python', 'ML', 'Aptitude'].map((label, idx) => (
                              <Chip
                                key={idx}
                                size="sm"
                                variant="outlined"
                                color="neutral"
                                sx={{ fontSize: '0.72rem' }}
                              >
                                {label}: {formatSectionScore(sec[idx])}
                              </Chip>
                            ))}
                          </Stack>
                        </td>
                        <td>
                          <Stack direction="row" spacing={1} alignItems="center">
                            <Typography level="body-sm" fontWeight="bold">
                              {result.score}/{result.totalQuestions}
                            </Typography>
                            <Chip
                              size="sm"
                              color={getScoreColor(result.score, totalQ)}
                            >
                              {percentage}%
                            </Chip>
                          </Stack>
                        </td>
                        <td>
                          <Chip
                            size="sm"
                            variant="soft"
                            color={getViolationColor(vCount)}
                            startDecorator={<ShieldAlert size={13} />}
                          >
                            {vCount} {vCount === 1 ? 'Violation' : 'Violations'}
                          </Chip>
                        </td>
                        <td>
                          <Typography level="body-xs">
                            {formatTimestamp(result)}
                          </Typography>
                        </td>
                        <td>
                          <Stack direction="row" spacing={0.5}>
                            <Tooltip title="View Full Breakdown">
                              <IconButton
                                size="sm"
                                variant="plain"
                                color="primary"
                                onClick={() => handleViewDetails(result)}
                              >
                                <Eye size={16} />
                              </IconButton>
                            </Tooltip>
                            <Tooltip title="Unlock / Allow Retake">
                              <IconButton
                                size="sm"
                                variant="soft"
                                color="warning"
                                onClick={() => promptUnlockCandidate(result.userEmail, result.id)}
                              >
                                <Unlock size={16} />
                              </IconButton>
                            </Tooltip>
                          </Stack>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </Table>
          </Sheet>
        </CardContent>
      </Card>

      {/* Details Modal */}
      <Modal open={modalOpen} onClose={() => setModalOpen(false)}>
        <ModalDialog size="lg" sx={{ maxWidth: 680, width: '95%', maxHeight: '90vh', overflowY: 'auto' }}>
          <ModalClose />
          <Typography level="h4" sx={{ mb: 1.5, fontWeight: 'bold' }}>
            Candidate Assessment &amp; Integrity Report
          </Typography>

          {selectedUser && (
            <Stack spacing={2.5}>
              <Box>
                <Typography level="title-md" sx={{ mb: 1 }}>
                  Student Information
                </Typography>
                <Stack spacing={0.75}>
                  <Typography level="body-sm">
                    <strong>Email:</strong> {selectedUser.userEmail}
                  </Typography>
                  <Typography level="body-sm">
                    <strong>Username:</strong>{' '}
                    {getUserInfo(selectedUser.userId).username ||
                      selectedUser.userEmail?.split('@')[0] ||
                      'N/A'}
                  </Typography>
                  <Typography level="body-sm">
                    <strong>Submitted At:</strong> {formatTimestamp(selectedUser)}
                  </Typography>
                </Stack>
              </Box>

              <Divider />

              <Box>
                <Typography level="title-md" sx={{ mb: 1 }}>
                  Score Summary
                </Typography>
                <Stack direction="row" spacing={2} sx={{ mb: 2 }} flexWrap="wrap">
                  <Chip size="lg" variant="soft" color="primary">
                    Total: {selectedUser.score}/{selectedUser.totalQuestions} (
                    {Math.round(
                      ((selectedUser.score || 0) / (selectedUser.totalQuestions || 1)) * 100
                    )}
                    %)
                  </Chip>
                  <Chip
                    size="lg"
                    variant="soft"
                    color={getViolationColor(selectedUser.violations)}
                    startDecorator={<ShieldAlert size={15} />}
                  >
                    Violations: {Number(selectedUser.violations) || 0}
                  </Chip>
                </Stack>

                <Typography level="title-sm" sx={{ mb: 1 }}>
                  Section-Wise Breakdown
                </Typography>
                <Grid container spacing={1.5}>
                  {['Finance', 'Python', 'ML', 'Aptitude'].map((label, idx) => {
                    const secData = selectedUser.sectionScores?.[idx];
                    return (
                      <Grid key={idx} xs={6} sm={3}>
                        <Sheet
                          variant="outlined"
                          sx={{ p: 1.5, borderRadius: 'md', textAlign: 'center' }}
                        >
                          <Typography level="body-xs" color="neutral">
                            {label}
                          </Typography>
                          <Typography level="title-lg" fontWeight="bold" color="primary">
                            {formatSectionScore(secData)}
                          </Typography>
                        </Sheet>
                      </Grid>
                    );
                  })}
                </Grid>
              </Box>

              <Divider />

              <Box>
                <Typography level="title-md" sx={{ mb: 1 }}>
                  Proctoring Violation Log
                </Typography>
                {Array.isArray(selectedUser.violationDetails) &&
                selectedUser.violationDetails.length > 0 ? (
                  <Sheet
                    variant="soft"
                    color="neutral"
                    sx={{ p: 1.5, borderRadius: 'md', maxHeight: 180, overflowY: 'auto' }}
                  >
                    <Stack spacing={1}>
                      {selectedUser.violationDetails.map((v, i) => (
                        <Box
                          key={i}
                          sx={{
                            p: 1,
                            borderRadius: 'sm',
                            bgcolor: 'background.surface',
                            border: '1px solid',
                            borderColor: 'divider',
                          }}
                        >
                          <Typography level="body-xs" fontWeight="bold" color="danger">
                            {v.type || 'Violation'} {v.violationNumber ? `(#${v.violationNumber})` : ''}
                          </Typography>
                          <Typography level="body-xs">{v.details}</Typography>
                          {v.timestamp && (
                            <Typography level="body-xs" color="neutral">
                              {new Date(v.timestamp).toLocaleString()}
                            </Typography>
                          )}
                        </Box>
                      ))}
                    </Stack>
                  </Sheet>
                ) : (
                  <Typography level="body-sm" color="success">
                    No proctoring violations recorded.
                  </Typography>
                )}
              </Box>

              <Divider />

              <Box display="flex" justifyContent="flex-end" gap={1.5}>
                <Button
                  variant="soft"
                  color="warning"
                  startDecorator={<Unlock size={16} />}
                  onClick={() =>
                    promptUnlockCandidate(selectedUser.userEmail, selectedUser.id)
                  }
                >
                  Unlock / Renew Attempt
                </Button>
                <Button variant="solid" color="neutral" onClick={() => setModalOpen(false)}>
                  Close
                </Button>
              </Box>
            </Stack>
          )}
        </ModalDialog>
      </Modal>

      {/* Unlock Confirmation Modal */}
      <Modal open={unlockModalOpen} onClose={() => !unlocking && setUnlockModalOpen(false)}>
        <ModalDialog variant="outlined" role="alertdialog" sx={{ maxWidth: 460 }}>
          <Typography level="h4" fontWeight="bold" color="warning" startDecorator={<Unlock size={20} />}>
            Unlock Participant for Retake?
          </Typography>
          <Divider sx={{ my: 1.5 }} />
          <Typography level="body-sm" sx={{ mb: 2 }}>
            Are you sure you want to reverse the single-attempt lock for{' '}
            <b>{unlockTarget?.email || unlockTarget?.resultId}</b>?
          </Typography>
          <Alert color="warning" variant="soft" sx={{ mb: 2.5 }}>
            This will remove their mistaken submission record and allow them to log in and take the test again.
          </Alert>
          <Stack direction="row" spacing={1.5} justifyContent="flex-end">
            <Button
              variant="plain"
              color="neutral"
              disabled={unlocking}
              onClick={() => setUnlockModalOpen(false)}
            >
              Cancel
            </Button>
            <Button
              variant="solid"
              color="warning"
              loading={unlocking}
              startDecorator={<Unlock size={16} />}
              onClick={confirmUnlockCandidate}
            >
              Confirm Unlock
            </Button>
          </Stack>
        </ModalDialog>
      </Modal>
    </Box>
  );
}
