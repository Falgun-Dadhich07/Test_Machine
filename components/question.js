import { useState } from 'react';
import {
  Container,
  Typography,
  Box,
  Grid,
  Alert,
  Button
} from '@mui/joy';
import QuestionForm from './QuestionForm';
import QuestionsList from './QuestionsList';
import QuestionPaperForm from './QuestionPaperForm';

export default function Home() {
  const [questions, setQuestions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState('');

  const handleAddQuestion = (newQuestion) => {
    setQuestions([...questions, newQuestion]);
  };

  const handleDeleteQuestion = (questionId) => {
    setQuestions(questions.filter(q => q.id !== questionId));
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
          questions: questions,
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
          Create questions across 4 sections (MCQ and Numerical Integer type).
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

      <Grid container spacing={3}>
        <Grid xs={12} md={6}>
          <QuestionForm onAddQuestion={handleAddQuestion} />
        </Grid>
        
        <Grid xs={12} md={6}>
          <QuestionPaperForm
            questions={questions}
            onSave={handleSaveQuestionPaper}
            loading={loading}
          />
        </Grid>

        <Grid xs={12}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
            <Typography level="h3">Current Examination Questions ({questions.length})</Typography>
            {questions.length > 0 && (
              <Button variant="outlined" color="danger" size="sm" onClick={clearAllQuestions}>
                Clear All Questions
              </Button>
            )}
          </Box>
          <QuestionsList questions={questions} onDeleteQuestion={handleDeleteQuestion} />
        </Grid>
      </Grid>
    </Container>
  );
}
