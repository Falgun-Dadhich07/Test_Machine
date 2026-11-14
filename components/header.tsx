"use client";
import * as React from "react";
import Box from "@mui/joy/Box";
import Stack from "@mui/joy/Stack";
import ColorSchemeToggle from "./ColorSchemeToggle";
import Link from "next/link";
import Button from "@mui/joy/Button";
import Typography from "@mui/joy/Typography";

export default function Header() {
  const [selectedItemIndex, setSelectedItemIndex] = React.useState(0);

  const handleItemClick = (index: number) => {
    setSelectedItemIndex(index);
  };

  const [showCustomTheme, setShowCustomTheme] = React.useState(true);
  const [open, setOpen] = React.useState(false);
  return (
    <Box
      sx={{
        display: "flex",
        flexGrow: 1,
        justifyContent: "space-between",
        zIndex: 1000,
      }}
    >
      <Stack
        direction="row"
        justifyContent="center"
        alignItems="center"
        spacing={0}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
          <img
            src="/share-logo.jpg"
            width="42"
            height="42"
            style={{ borderRadius: "8px", objectFit: "cover" }}
            alt="ShARE: Student Chapter"
          />
          <Typography
            level="h1"
            className="tab_title"
            sx={{ fontWeight: "bold", fontSize: "1.35rem", letterSpacing: "0.5px" }}
          >
            ShARE: Student Chapter
          </Typography>
        </div>
      </Stack>

      <Box
        style={{ position: "fixed", right: 20, top: 10 }}
        sx={{
          display: "flex",
          flexDirection: "row",
          gap: 1.5,
          alignItems: "center",
          zIndex: 1000,
        }}
      >
        <ColorSchemeToggle />
        <Link href="/login">
          <Button variant="solid" size="lg" sx={{ ml: 1 }}>
            Log Out
          </Button>
        </Link>
      </Box>
    </Box>
  );
}
