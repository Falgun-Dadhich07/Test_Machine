"use client";
import { useAuth } from "../contexts/AuthContext";
import * as React from "react";
import Box from "@mui/joy/Box";
import Stack from "@mui/joy/Stack";
import ColorSchemeToggle from "./ColorSchemeToggle";
import Link from "next/link";
import Button from "@mui/joy/Button";
import Typography from "@mui/joy/Typography";
import { CssVarsProvider } from "@mui/joy/styles";
import CssBaseline from "@mui/joy/CssBaseline";
import { shareTheme } from "../styles/theme";

export default function Layout({ children }) {
  const { currentUser, logout } = useAuth();

  const handleLogout = async () => {
    try {
      await logout();
    } catch (error) {
      console.error("Failed to logout:", error);
    }
  };
  const [selectedItemIndex, setSelectedItemIndex] = React.useState(0);

  const handleItemClick = (index) => {
    setSelectedItemIndex(index);
  };

  const [showCustomTheme, setShowCustomTheme] = React.useState(true);
  const [open, setOpen] = React.useState(false);


  return (

    <CssVarsProvider theme={shareTheme} disableTransitionOnChange defaultMode="dark">
      <CssBaseline />

      <Box sx={{ minHeight: "100vh", bgcolor: "background.body", color: "text.primary" }}>
        <nav>
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

              {currentUser && (
                <div className="flex items-center gap-2">
                  {(currentUser.email?.toLowerCase() === (process.env.NEXT_PUBLIC_ADMIN_EMAIL || "").toLowerCase() ||
                    currentUser.email?.toLowerCase().startsWith("admin@")) && (
                      <Link href="/admin">
                        <Button variant="soft" color="danger" size="lg">
                          Admin
                        </Button>
                      </Link>
                    )}
                  <Button
                    variant="solid"
                    size="lg"
                    sx={{ ml: 1 }}
                    onClick={handleLogout}
                  >
                    Log Out
                  </Button>
                </div>
              )}
            </Box>
          </Box>
        </nav>
        <main>{children}</main>
      </Box>
    </CssVarsProvider>

  );
}
