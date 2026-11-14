"use client";
import React, { useEffect } from "react";
import { useRouter } from "next/router";
import Sheet from "@mui/joy/Sheet";
import Typography from "@mui/joy/Typography";
import Button from "@mui/joy/Button";
import Link from "next/link";
import { Lock, ArrowBack } from "@mui/icons-material";

export default function SignupDisabledPage() {
  const router = useRouter();

  useEffect(() => {
    // Automatically redirect after 3 seconds
    const timer = setTimeout(() => {
      router.push("/login");
    }, 3000);
    return () => clearTimeout(timer);
  }, [router]);

  return (
    <main>
      <Sheet
        sx={{
          width: { xs: "90%", sm: 420 },
          mx: "auto",
          my: { xs: 6, md: 10 },
          py: 5,
          px: 3,
          textAlign: "center",
          borderRadius: "xl",
          bgcolor: "background.surface",
          borderColor: "neutral.200",
          boxShadow: "lg",
        }}
        variant="outlined"
      >
        <Lock sx={{ fontSize: 50, color: "neutral.500", mb: 2 }} />
        <Typography level="h3" fontWeight="bold" sx={{ mb: 1 }}>
          Registration Closed
        </Typography>
        <Typography level="body-md" color="neutral" sx={{ mb: 3 }}>
          Self-registration is disabled for this test. All 210 candidate accounts are pre-allocated by the exam administrator.
        </Typography>

        <Link href="/login">
          <Button
            size="lg"
            variant="solid"
            color="primary"
            startDecorator={<ArrowBack />}
          >
            Go to Candidate Login
          </Button>
        </Link>
      </Sheet>
    </main>
  );
}
