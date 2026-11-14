"use client";
import * as React from "react";
import Sheet from "@mui/joy/Sheet";
import CssBaseline from "@mui/joy/CssBaseline";
import Typography from "@mui/joy/Typography";
import FormControl from "@mui/joy/FormControl";
import FormLabel from "@mui/joy/FormLabel";
import Input from "@mui/joy/Input";
import Button from "@mui/joy/Button";
import Stack from "@mui/joy/Stack";
import Alert from "@mui/joy/Alert";
import Chip from "@mui/joy/Chip";
import { useState } from "react";
import { useAuth } from "../contexts/AuthContext";
import { useRouter } from "next/router";
import { Lock, Security, Warning } from "@mui/icons-material";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const router = useRouter();

  async function handleSubmit(e) {
    e.preventDefault();

    try {
      setError("");
      setLoading(true);
      await login(email.trim(), password);
      router.push("/dashboard");
    } catch (err) {
      console.error("Login error:", err);
      if (err.code === "auth/user-not-found" || err.code === "auth/invalid-credential" || err.code === "auth/wrong-password") {
        setError("Invalid credentials. Only pre-registered candidate accounts may access the Winter Project Selection Test.");
      } else {
        setError(err.message || "Failed to log in. Please verify your credentials.");
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <main>
      <CssBaseline />
      <Sheet
        sx={{
          width: { xs: "90%", sm: 400 },
          mx: "auto",
          my: { xs: 4, md: 8 },
          py: 4,
          px: { xs: 2.5, sm: 3.5 },
          display: "flex",
          flexDirection: "column",
          gap: 2.5,
          borderRadius: "xl",
          bgcolor: "background.surface",
          borderColor: "neutral.200",
          boxShadow: "lg",
        }}
        variant="outlined"
      >
        <Box sx={{ textAlign: "center" }}>
          <Box display="flex" justifyContent="center" mb={1.5}>
            <img
              src="/share-logo.jpg"
              alt="ShARE: Student Chapter"
              width="64"
              height="64"
              style={{
                borderRadius: "12px",
                objectFit: "cover",
                boxShadow: "0 4px 14px rgba(0, 168, 89, 0.35)",
              }}
            />
          </Box>
          <Box display="flex" justifyContent="center" mb={1}>
            <Chip
              variant="soft"
              color="primary"
              size="sm"
              startDecorator={<Security fontSize="small" />}
            >
              ShARE: Student Chapter
            </Chip>
          </Box>
          <Typography level="h3" component="h1" fontWeight="bold">
            Winter Project Selection Test
          </Typography>
          <Typography level="body-sm" color="neutral" sx={{ mt: 0.5 }}>
            Sign in with your assigned candidate credentials.
          </Typography>
        </Box>

        {error && (
          <Alert color="danger" variant="soft" startDecorator={<Warning />}>
            {error}
          </Alert>
        )}

        <form onSubmit={handleSubmit}>
          <Stack spacing={2}>
            <FormControl required>
              <FormLabel>Registered Email Address</FormLabel>
              <Input
                type="email"
                placeholder="candidate@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </FormControl>

            <FormControl required>
              <FormLabel>Password</FormLabel>
              <Input
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </FormControl>

            <Button
              disabled={loading}
              loading={loading}
              type="submit"
              size="lg"
              color="primary"
              variant="solid"
              startDecorator={<Lock />}
              sx={{ mt: 1, borderRadius: "md" }}
            >
              Sign In to Exam
            </Button>
          </Stack>
        </form>

        <Box sx={{ mt: 1, p: 1.5, bgcolor: "neutral.100", borderRadius: "md", textAlign: "center" }}>
          <Typography level="body-xs" color="neutral">
            🔒 <b>Restricted Exam Access:</b> Public self-registration is closed. Only pre-authorized candidate accounts can access this portal.
          </Typography>
        </Box>
      </Sheet>
    </main>
  );
}

// Minimal Box helper in case Joy UI Box is used
function Box({ children, sx, ...props }) {
  return (
    <div style={{ ...sx }} {...props}>
      {children}
    </div>
  );
}
