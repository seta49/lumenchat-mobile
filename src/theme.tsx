import { createContext, useContext, useMemo, type ReactNode } from "react";
import type { ThemeMode } from "./types/chat";

/** Palet warna Lumen mobile — dark & light. Semua warna lewat sini, class
 * Tailwind/NativeWind dipakai untuk layout & spacing (warna dinamis RN lebih
 * aman lewat object daripada dark: variant). */
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
    bg: "#0f1216",
    surface: "#161a20",
    panel: "#1f252e",
    border: "#2a313b",
    text: "#e8ecf1",
    muted: "#98a2b0",
    accent: "#4f8cff",
    onAccent: "#ffffff",
    danger: "#f87171",
    success: "#34d399",
    input: "#1a2028",
    bubbleUser: "#2e5bb5",
    bubbleAssistant: "#161a20",
    codeBg: "#0b0e12",
  },
  light: {
    bg: "#f6f7f9",
    surface: "#ffffff",
    panel: "#f0f2f5",
    border: "#e4e7ec",
    text: "#181b1f",
    muted: "#6b7280",
    accent: "#3b82f6",
    onAccent: "#ffffff",
    danger: "#dc2626",
    success: "#059669",
    input: "#ffffff",
    bubbleUser: "#3b82f6",
    bubbleAssistant: "#ffffff",
    codeBg: "#eef1f4",
  },
};

interface ThemeValue {
  theme: ThemeMode;
  c: Palette;
}

const ThemeContext = createContext<ThemeValue | null>(null);

export function ThemeProvider({ theme, children }: { theme: ThemeMode; children: ReactNode }) {
  const value = useMemo<ThemeValue>(() => ({ theme, c: palettes[theme] }), [theme]);
  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme(): ThemeValue {
  const ctx = useContext(ThemeContext);
  if (!ctx) {
    throw new Error("useTheme must be used inside ThemeProvider");
  }
  return ctx;
}