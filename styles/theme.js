import { extendTheme } from "@mui/joy/styles";

export const shareTheme = extendTheme({
  colorSchemes: {
    light: {
      palette: {
        primary: {
          50: "#eaf7ee",
          100: "#c7edd1",
          200: "#9fe2b2",
          300: "#73d690",
          400: "#49cb72",
          500: "#00a859", // Official ShARE emerald green
          600: "#00904c",
          700: "#00743d",
          800: "#005a2f",
          900: "#003e20",
          solidBg: "#00a859",
          solidHoverBg: "#00904c",
          solidActiveBg: "#00743d",
          solidColor: "#ffffff",
          softColor: "#00743d",
          softBg: "rgba(0, 168, 89, 0.08)",
          softHoverBg: "rgba(0, 168, 89, 0.16)",
          softActiveBg: "rgba(0, 168, 89, 0.24)",
          outlinedColor: "#008848",
          outlinedBorder: "rgba(0, 168, 89, 0.35)",
          outlinedHoverBg: "rgba(0, 168, 89, 0.08)",
        },
        background: {
          body: "#ffffff", // Pure white in Light Mode
          surface: "#fcfdfc", // Clean light surface for cards
          popup: "#ffffff",
          level1: "#f4f8f4",
          level2: "#ebf2ec",
          level3: "#e0eae1",
        },
        neutral: {
          50: "#fbfcfb",
          100: "#f0f4f1",
          200: "#e1e7e2",
          300: "#c7d2c8",
          400: "#9eada0",
          500: "#748476",
          600: "#4e5f50",
          700: "#364338",
          800: "#212b23",
          900: "#101611",
        },
        text: {
          primary: "#101611",
          secondary: "#4e5f50",
          tertiary: "#748476",
        },
        focusVisible: "#00a859",
      },
    },
    dark: {
      palette: {
        primary: {
          50: "#eaf7ee",
          100: "#c7edd1",
          200: "#9fe2b2",
          300: "#73d690",
          400: "#49cb72",
          500: "#00a859", // Official ShARE emerald green
          600: "#00bd64",
          700: "#00904c",
          800: "#00743d",
          900: "#005a2f",
          solidBg: "#00a859",
          solidHoverBg: "#00bd64",
          solidActiveBg: "#00904c",
          solidColor: "#ffffff",
          softColor: "#6ee79e",
          softBg: "rgba(0, 168, 89, 0.16)",
          softHoverBg: "rgba(0, 168, 89, 0.25)",
          softActiveBg: "rgba(0, 168, 89, 0.35)",
          outlinedColor: "#49cb72",
          outlinedBorder: "rgba(0, 168, 89, 0.45)",
          outlinedHoverBg: "rgba(0, 168, 89, 0.12)",
        },
        background: {
          body: "#0b120d", // Dark greenish black
          surface: "#131e15", // Elevated dark greenish-black card
          popup: "#18261b",
          level1: "#18261b",
          level2: "#1f3123",
          level3: "#283e2c",
        },
        neutral: {
          50: "#f4f8f4",
          100: "#e2ede3",
          200: "#c3d7c5",
          300: "#a2bea4",
          400: "#7d9e80",
          500: "#5d7c60",
          600: "#435d46",
          700: "#2d4030",
          800: "#1a271c",
          900: "#0d140e",
        },
        text: {
          primary: "#f4f8f4",
          secondary: "#c3d7c5",
          tertiary: "#a2bea4",
        },
        focusVisible: "#00a859",
      },
    },
  },
  fontFamily: {
    body: "Inter, system-ui, -apple-system, sans-serif",
  },
});
