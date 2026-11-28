import {
  Box,
  Card,
  CardContent,
  Typography,
  Chip,
  IconButton,
  Stack,
  Divider
} from '@mui/joy';
import { Delete, Numbers, ListAlt } from '@mui/icons-material';

export default function QuestionsList({ questions, onDeleteQuestion }) {
  return (
    <Box>
      {questions.length === 0 ? (
        <Card variant="soft" color="neutral">
          <CardContent sx={{ textAlign: "center", py: 4 }}>
            <Typography level="body1" color="neutral">
              No questions added yet. Use the form on the left to add questions to Finance, Python, ML, or Aptitude.
            </Typography>
          </CardContent>
        </Card>
      ) : (
        <Stack spacing={2}>
          {questions.map((q, index) => (
            <Card key={q.id || index} variant="outlined">
              <CardContent>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 1 }}>
                  <Box sx={{ flex: 1 }}>
                    <Box display="flex" alignItems="center" gap={1} mb={0.5}>
                      <Typography level="title-md">
                        Q{index + 1}. {q.question}
                      </Typography>
                    </Box>
                    <Stack direction="row" spacing={1}>
                      <Chip size="sm" variant="solid" color="primary">
                        {q.section || "Finance"}
                      </Chip>
                      <Chip
                        size="sm"
                        variant="soft"
                        color={q.type === 'integer' ? 'warning' : 'neutral'}
                        startDecorator={q.type === 'integer' ? <Numbers fontSize="small" /> : <ListAlt fontSize="small" />}
                      >
                        {q.type === 'integer' ? 'Integer Answer' : 'Multiple Choice'}
                      </Chip>
                    </Stack>
                  </Box>
                  <IconButton
                    variant="plain"
                    color="danger"
                    size="sm"
                    onClick={() => onDeleteQuestion(q.id)}
                  >
                    <Delete />
                  </IconButton>
                </Box>

                {q.image && (
                  <Box sx={{ my: 1 }}>
                    <img
                      src={q.image}
                      alt="Question illustration"
                      style={{
                        maxWidth: '220px',
                        maxHeight: '140px',
                        objectFit: 'contain',
                        borderRadius: '4px',
                        border: '1px solid #ddd'
                      }}
                    />
                  </Box>
                )}

                {q.type === 'integer' ? (
                  <Box sx={{ mt: 1, p: 1, bgcolor: 'warning.softBg', borderRadius: 'md', width: 'fit-content' }}>
                    <Typography level="body2">
                      Correct Integer Answer: <b>{q.correctAnswer}</b>
                    </Typography>
                  </Box>
                ) : (
                  <Box sx={{ mt: 1 }}>
                    <Typography level="body2" fontWeight="md" mb={0.5}>Options:</Typography>
                    {q.options && q.options.map((option, optIndex) => (
                      <Box key={optIndex} sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
                        <Typography level="body2" sx={{ minWidth: '20px' }}>
                          {String.fromCharCode(65 + optIndex)}.
                        </Typography>
                        <Typography level="body2">{option}</Typography>
                        {q.correctAnswer === optIndex && (
                          <Chip size="sm" color="success" variant="soft">
                            Correct
                          </Chip>
                        )}
                      </Box>
                    ))}
                  </Box>
                )}
              </CardContent>
            </Card>
          ))}
        </Stack>
      )}
    </Box>
  );
}
