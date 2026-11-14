import { useState } from 'react';
import {
  Box,
  Button,
  Card,
  CardContent,
  FormControl,
  FormLabel,
  Input,
  Select,
  Option,
  Textarea,
  Typography,
  IconButton,
  Radio,
  RadioGroup,
  Stack,
  Chip
} from '@mui/joy';
import { Add, Delete, Numbers, ListAlt } from '@mui/icons-material';

export default function QuestionForm({ onAddQuestion }) {
  const [questionType, setQuestionType] = useState('mcq'); // 'mcq' | 'integer'
  const [section, setSection] = useState('Section 1');
  const [questionText, setQuestionText] = useState('');
  const [image, setImage] = useState('');
  const [options, setOptions] = useState(['', '', '', '']);
  const [correctOptionIndex, setCorrectOptionIndex] = useState(0);
  const [integerAnswer, setIntegerAnswer] = useState('');

  const handleOptionChange = (index, value) => {
    const updated = [...options];
    updated[index] = value;
    setOptions(updated);
  };

  const addOption = () => {
    if (options.length < 6) {
      setOptions([...options, '']);
    }
  };

  const removeOption = (index) => {
    if (options.length > 2) {
      const updated = options.filter((_, i) => i !== index);
      setOptions(updated);
      if (correctOptionIndex >= updated.length) {
        setCorrectOptionIndex(0);
      }
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!questionText.trim()) return;

    if (questionType === 'mcq') {
      const validOptions = options.map(o => o.trim()).filter(Boolean);
      if (validOptions.length < 2) {
        alert('Multiple choice questions require at least 2 options.');
        return;
      }

      onAddQuestion({
        id: Date.now(),
        section: section,
        type: 'mcq',
        question: questionText.trim(),
        image: image.trim(),
        options: validOptions,
        correctAnswer: Math.min(correctOptionIndex, validOptions.length - 1),
      });
    } else {
      // Integer question
      if (integerAnswer === '' || isNaN(Number(integerAnswer))) {
        alert('Please enter a valid integer answer (e.g. 42).');
        return;
      }

      onAddQuestion({
        id: Date.now(),
        section: section,
        type: 'integer',
        question: questionText.trim(),
        image: image.trim(),
        correctAnswer: parseInt(integerAnswer, 10),
      });
    }

    // Reset form
    setQuestionText('');
    setImage('');
    setOptions(['', '', '', '']);
    setCorrectOptionIndex(0);
    setIntegerAnswer('');
  };

  return (
    <Card variant="outlined">
      <CardContent>
        <Typography level="h3" mb={2}>Add Question to Examination</Typography>
        <form onSubmit={handleSubmit}>
          <Stack spacing={2}>
            {/* Section Selection */}
            <FormControl>
              <FormLabel>Target Section (Total 4 Sections)</FormLabel>
              <Select
                value={section}
                onChange={(e, value) => setSection(value)}
              >
                <Option value="Section 1">Section 1</Option>
                <Option value="Section 2">Section 2</Option>
                <Option value="Section 3">Section 3</Option>
                <Option value="Section 4">Section 4</Option>
              </Select>
            </FormControl>

            {/* Question Type: MCQ vs Integer */}
            <FormControl>
              <FormLabel>Question Format</FormLabel>
              <Box display="flex" gap={1}>
                <Button
                  size="sm"
                  variant={questionType === 'mcq' ? 'solid' : 'outlined'}
                  color="primary"
                  startDecorator={<ListAlt />}
                  onClick={() => setQuestionType('mcq')}
                >
                  Multiple Choice (MCQ)
                </Button>
                <Button
                  size="sm"
                  variant={questionType === 'integer' ? 'solid' : 'outlined'}
                  color="primary"
                  startDecorator={<Numbers />}
                  onClick={() => setQuestionType('integer')}
                >
                  Numerical / Integer Type
                </Button>
              </Box>
            </FormControl>

            {/* Question Text */}
            <FormControl required>
              <FormLabel>Question Text</FormLabel>
              <Textarea
                placeholder="Type your question here..."
                value={questionText}
                onChange={(e) => setQuestionText(e.target.value)}
                minRows={2}
                required
              />
            </FormControl>

            {/* Optional Image URL */}
            <FormControl>
              <FormLabel>Optional Diagram / Image URL</FormLabel>
              <Input
                placeholder="https://example.com/diagram.png"
                value={image}
                onChange={(e) => setImage(e.target.value)}
              />
            </FormControl>

            {/* Conditional fields based on type */}
            {questionType === 'mcq' ? (
              <Box>
                <Box display="flex" justifyContent="space-between" alignItems="center" mb={1}>
                  <FormLabel>Options (Select the correct option)</FormLabel>
                  {options.length < 6 && (
                    <Button size="sm" variant="plain" startDecorator={<Add />} onClick={addOption}>
                      Add Option
                    </Button>
                  )}
                </Box>

                <Stack spacing={1}>
                  {options.map((opt, idx) => (
                    <Box key={idx} display="flex" alignItems="center" gap={1}>
                      <Radio
                        checked={correctOptionIndex === idx}
                        onChange={() => setCorrectOptionIndex(idx)}
                        name="correct-option-group"
                      />
                      <Input
                        placeholder={`Option ${String.fromCharCode(65 + idx)}`}
                        value={opt}
                        onChange={(e) => handleOptionChange(idx, e.target.value)}
                        sx={{ flex: 1 }}
                        required={idx < 2}
                      />
                      {options.length > 2 && (
                        <IconButton size="sm" color="danger" variant="plain" onClick={() => removeOption(idx)}>
                          <Delete />
                        </IconButton>
                      )}
                    </Box>
                  ))}
                </Stack>
              </Box>
            ) : (
              <FormControl required>
                <FormLabel>Correct Integer Answer</FormLabel>
                <Input
                  type="number"
                  step="1"
                  placeholder="e.g. 42, -5, 100"
                  value={integerAnswer}
                  onChange={(e) => setIntegerAnswer(e.target.value)}
                  sx={{ maxWidth: 220, fontSize: "1.1rem", fontWeight: "bold" }}
                  required
                />
                <Typography level="body-xs" color="neutral" sx={{ mt: 0.5 }}>
                  Examinees will type an integer into an input box instead of choosing options.
                </Typography>
              </FormControl>
            )}

            <Button type="submit" size="md" color="success" startDecorator={<Add />}>
              Add to {section}
            </Button>
          </Stack>
        </form>
      </CardContent>
    </Card>
  );
}
