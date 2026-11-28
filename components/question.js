import { useState, useEffect } from 'react';
import {
  Container,
  Typography,
  Box,
  Grid,
  Alert,
  Button,
  CircularProgress,
} from '@mui/joy';
import QuestionForm from './QuestionForm';
import QuestionsList from './QuestionsList';
import QuestionPaperForm from './QuestionPaperForm';

export default function Home() {
  const [questions, setQuestions] = useState([]);
  const [initialDetails, setInitialDetails] = useState(null);
  const [loadingPaper, setLoadingPaper] = useState(true);
  const [loading, setLoading] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState('');

  const loadActivePaper = async () => {
    setLoadingPaper(true);
    try {
      const res = await fetch('/api/admin/active-paper');
      if (res.ok) {
        const data = await res.json();
        if (data.paper) {
          setQuestions(Array.isArray(data.paper.questions) ? data.paper.questions : []);
          setInitialDetails({
            title: data.paper.title || 'Winter Project Selection Test',
            duration: data.paper.duration || 60,
            instructions:
              data.paper.instructions ||
              'This test contains 4 sections. Read each question carefully. Both Multiple Choice and Numerical Integer type questions are included.',
          });
        }
      }
    } catch (err) {
      console.warn('Could not load active paper:', err);
    } finally {
      setLoadingPaper(false);
    }
  };

  useEffect(() => {
    loadActivePaper();
  }, []);

  const handleAddQuestion = (newQuestion) => {
    setQuestions((prev) => [...prev, newQuestion]);
    setSuccessMessage('');
    setErrorMessage('');
  };

  const handleDeleteQuestion = (questionId) => {
    setQuestions((prev) => prev.filter((q) => q.id !== questionId));
  };

  const handleSaveQuestionPaper = async (paperDetails) => {
    setLoading(true);
    setSuccessMessage('');
    setErrorMessage('');

    try {
      const res = await fetch('/api/admin/save-paper', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...paperDetails,
          questions,
        }),
      });

      const data = await res.json();
      if (res.ok && data.success) {
        setSuccessMessage(data.message || 'Question paper saved successfully!');
      } else {
        setErrorMessage(data.error || 'Failed to save question paper.');
      }
    } catch (error) {
      console.error('Error saving question paper:', error);
      setErrorMessage('Network or server error while saving question paper.');
    } finally {
      setLoading(false);
    }
  };

  const clearAllQuestions = () => {
    if (window.confirm('Are you sure you want to clear all questions?')) {
      setQuestions([]);
    }
  };

  return (
    <Container maxWidth="lg" sx={{ py: 2 }}>
      <Box sx={{ mb: 3, textAlign: 'center' }}>
        <Typography level="h2" mb={1}>
          Examination Paper Creator
        </Typography>
        <Typography level="body-sm" color="neutral">
          Create or edit questions across 4 sections (MCQ and Numerical Integer type), then click Save &amp; Publish.
        </Typography>
      </Box>

      {successMessage && (
        <Alert color="success" variant="soft" sx={{ mb: 3 }}>
          {successMessage}
        </Alert>
      )}

      {errorMessage && (
        <Alert color="danger" variant="soft" sx={{ mb: 3 }}>
          {errorMessage}
        </Alert>
      )}

      {loadingPaper ? (
        <Box display="flex" justifyContent="center" alignItems="center" gap={2} sx={{ py: 6 }}>
          <CircularProgress size="md" />
          <Typography level="body-md">Loading currently active quiz...</Typography>
        </Box>
      ) : (
        <Grid container spacing={3}>
          <Grid xs={12} md={6}>
            <QuestionForm onAddQuestion={handleAddQuestion} />
          </Grid>

          <Grid xs={12} md={6}>
            <QuestionPaperForm
              questions={questions}
              initialDetails={initialDetails}
              onSave={handleSaveQuestionPaper}
              loading={loading}
            />
          </Grid>

          <Grid xs={12}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2, flexWrap: 'wrap', gap: 1 }}>
              <Typography level="h3">Current Examination Questions ({questions.length})</Typography>
              <Box display="flex" gap={1}>
                <Button variant="outlined" color="neutral" size="sm" onClick={loadActivePaper}>
                  Reload Live Quiz
                </Button>
                {questions.length > 0 && (
                  <Button variant="outlined" color="danger" size="sm" onClick={clearAllQuestions}>
                    Clear All Questions
                  </Button>
                )}
              </Box>
            </Box>
            <QuestionsList questions={questions} onDeleteQuestion={handleDeleteQuestion} />
          </Grid>
        </Grid>
      )}
    </Container>
  );
}
