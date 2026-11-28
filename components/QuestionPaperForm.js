import { useState, useEffect } from 'react';
import {
  Box,
  Button,
  Card,
  CardContent,
  FormControl,
  FormLabel,
  Input,
  Typography,
  Alert,
  CircularProgress,
  Stack,
  Chip
} from '@mui/joy';
import { Save, Schedule, Description } from '@mui/icons-material';

export default function QuestionPaperForm({ questions, initialDetails, onSave, loading }) {
  const [paperDetails, setPaperDetails] = useState({
    title: 'Winter Project Selection Test',
    duration: 60,
    instructions: 'This test contains 4 sections. Read each question carefully. Both Multiple Choice and Numerical Integer type questions are included.'
  });

  useEffect(() => {
    if (initialDetails) {
      setPaperDetails((prev) => ({
        ...prev,
        ...initialDetails,
      }));
    }
  }, [initialDetails]);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (questions.length === 0) {
      alert('Please add at least one question before saving.');
      return;
    }
    onSave(paperDetails);
  };

  // Calculate question count breakdown across 4 sections
  const secCounts = {
    'Section 1': questions.filter(q => q.section === 'Section 1').length,
    'Section 2': questions.filter(q => q.section === 'Section 2').length,
    'Section 3': questions.filter(q => q.section === 'Section 3').length,
    'Section 4': questions.filter(q => q.section === 'Section 4').length,
  };

  return (
    <Card variant="outlined">
      <CardContent>
        <Typography level="h3" mb={2}>Publish Examination Paper</Typography>
        <form onSubmit={handleSubmit}>
          <Stack spacing={2}>
            <FormControl required>
              <FormLabel>Examination Title</FormLabel>
              <Input
                placeholder="e.g. End-Term Examination"
                value={paperDetails.title}
                onChange={(e) => setPaperDetails({ ...paperDetails, title: e.target.value })}
                required
              />
            </FormControl>

            <FormControl required>
              <FormLabel>Total Duration (minutes)</FormLabel>
              <Input
                type="number"
                value={paperDetails.duration}
                onChange={(e) => setPaperDetails({ ...paperDetails, duration: parseInt(e.target.value, 10) || 60 })}
                startDecorator={<Schedule fontSize="small" />}
                required
                min="1"
              />
            </FormControl>

            <FormControl>
              <FormLabel>Instructions to Examinees</FormLabel>
              <Input
                value={paperDetails.instructions}
                onChange={(e) => setPaperDetails({ ...paperDetails, instructions: e.target.value })}
                startDecorator={<Description fontSize="small" />}
              />
            </FormControl>

            <Box sx={{ p: 1.5, bgcolor: "neutral.100", borderRadius: "md" }}>
              <Typography level="body-xs" fontWeight="bold" sx={{ mb: 1 }}>
                Section Breakdown ({questions.length} total questions):
              </Typography>
              <Box display="flex" flexWrap="wrap" gap={1}>
                <Chip size="sm" variant="soft" color="primary">Sec 1: {secCounts['Section 1']}</Chip>
                <Chip size="sm" variant="soft" color="primary">Sec 2: {secCounts['Section 2']}</Chip>
                <Chip size="sm" variant="soft" color="primary">Sec 3: {secCounts['Section 3']}</Chip>
                <Chip size="sm" variant="soft" color="primary">Sec 4: {secCounts['Section 4']}</Chip>
              </Box>
            </Box>

            <Button
              type="submit"
              size="lg"
              color="success"
              variant="solid"
              disabled={loading || questions.length === 0}
              loading={loading}
              startDecorator={<Save />}
            >
              {loading ? 'Publishing...' : 'Save & Publish Examination'}
            </Button>
          </Stack>
        </form>
      </CardContent>
    </Card>
  );
}
