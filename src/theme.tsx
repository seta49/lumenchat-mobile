import { createContext, useContext, useMemo, type ReactNode } from "react";
import type { ThemeMode } from "./types/chat";

/** Palet warna Lumen mobile v2 — gelapnya mendekati hitam murni ala
 * Gemini app; accent bisa diganti user (settings.accent). */
export interface Palette {
  bg: string;
  surface: string;
  panel: string;
  border: string;
  text: string;
  muted: string;
  accent: string;
  onAccent: string;
  danger: string;
  success: string;
  input: string;
  bubbleUser: string;
  bubbleAssistant: string;
  codeBg: string;
}

export const palettes: Record<ThemeMode, Palette> = {
  dark: {
    bg: "#000000",
    surface: "#0d0d0d",
    panel: "#1f1f1f",
    border: "#2a2a2a",
    text: "#ededed",
    muted: "#9b9b9b",
    accent: "#4f8cff",
    onAccent: "#ffffff",
    danger: "#f87171",
    success: "#34d399",
    input: "#1a1a1a",
    bubbleUser: "#1f1f1f",
    bubbleAssistant: "#000000",
    codeBg: "#0a0a0a",
  },
  light: {
    bg: "#ffffff",
    surface: "#fafafa",
    panel: "#f0f0f0",
    border: "#e2e2e2",
    text: "#1a1a1a",
    muted: "#6f6f6f",
    accent: "#3b82f6",
    onAccent: "#ffffff",
    danger: "#dc2626",
    success: "#059669",
    input: "#f5f5f5",
    bubbleUser: "#eef4ff",
    bubbleAssistant: "#ffffff",
    codeBg: "#f2f2f2",
  },
};

/** Preset warna aksen (Profile > Accent color). */
export const ACCENT_PRESETS: { hex: string; key: string }[] = [
  { hex: "#4f8cff", key: "blue" },
  { hex: "#34d399", key: "green" },
  { hex: "#a78bfa", key: "purple" },
  { hex: "#fb923c", key: "orange" },
  { hex: "#f472b6", key: "pink" },
];

/** Warna teks di atas accent — gelap buat accent terang, putih sisanya. */
function readableOn(accent: string): string {
  const hex = accent.replace("#", "");
  if (hex.length !== 6) return "#ffffff";
  const r = parseInt(hex.slice(0, 2), 16);
  const g = parseInt(hex.slice(2, 4), 16);
  const b = parseInt(hex.slice(4, 6), 16);
  const lum = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  return lum > 0.7 ? "#101010" : "#ffffff";
}

interface ThemeValue {
  theme: ThemeMode;
  c: Palette;
}

const ThemeContext = createContext<ThemeValue | null>(null);

export function ThemeProvider({
  theme,
  accent,
  children,
}: {
  theme: ThemeMode;
  accent?: string;
  children: ReactNode;
}) {
  const value = useMemo<ThemeValue>(() => {
    const base = palettes[theme];
    const c =
      accent && /^#[0-9a-fA-F]{6}$/.test(accent)
        ? { ...base, accent, onAccent: readableOn(accent) }
        : base;
    return { theme, c };
  }, [theme, accent]);
  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme(): ThemeValue {
  const ctx = useContext(ThemeContext);
  if (!ctx) {
    throw new Error("useTheme must be used inside ThemeProvider");
  }
  return ctx;
}
