import { createContext, useContext, useMemo, type ReactNode } from "react";
import type { ProviderId, ThemeMode } from "./types/chat";

// ─────────────────────────────────────────────────────────────────────
// Lumen — "Calibrated"
//
// The interface is an instrument face, not a chat bubble. A warm-neutral
// substrate carries the conversation; one incandescent signal (lumen amber)
// marks what is live; provider identity is the only other chroma and always
// arrives with a letter, never as colour alone.
//
// Every neutral is warm (hue ~80). No neutral is pure grey and no surface is
// pure black, so the four-step ladder stays readable on OLED.
// ─────────────────────────────────────────────────────────────────────

export interface Palette {
  /** Plane 0 — the substrate. */
  bg: string;
  /** Plane 1 — a raised field inside the substrate. */
  surface: string;
  /** Plane 2 — inset fields: inputs, marks, active rows. */
  panel: string;
  /** Plane 3 — the attention plane: sheets, overlays, sticky bars. */
  raised: string;
  /** Plane 3 — overlay surface, one step above `raised`. */
  overlay: string;

  /** Hairline separator. */
  border: string;
  /** Emphasis edge: focus, selection, structural rules. */
  borderStrong: string;

  /** Primary ink. */
  text: string;
  /** Secondary ink. */
  muted: string;
  /** Tertiary ink: labels, timestamps, disabled. */
  faint: string;
  /** Ink that sits on the signal colour. Computed, never guessed. */
  inverse: string;

  /** The signal. Exactly one, used for live and selected state. */
  accent: string;
  /** Ink on `accent`. Derived by contrastRatio, not by a luminance guess. */
  onAccent: string;
  /** Signal at field strength: tinted fills. */
  accentSoft: string;
  /** Signal at rule strength: 1px strokes. */
  accentLine: string;

  danger: string;
  onDanger: string;
  success: string;
  warning: string;

  /** Overlay scrim. Derived per theme so it actually dims. */
  scrim: string;
  /** Focus ring on the web preview. */
  focusRing: string;
  /** Code and math blocks. */
  codeBg: string;
}

// ─────────────────────────────────────────────────────────────────────
// Contrast — computed, not guessed
//
// The previous system used a naive (0.299R + 0.587G + 0.114B) / 255 and a
// 0.7 threshold. That put white text on amber-green at 1.9:1. These are the
// real WCAG numbers.
// ─────────────────────────────────────────────────────────────────────

function channelToLinear(v: number): number {
  const s = v / 255;
  return s <= 0.04045 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
}

export function relativeLuminance(hex: string): number {
  const h = hex.replace("#", "");
  if (h.length !== 6) return 0;
  const r = parseInt(h.slice(0, 2), 16);
  const g = parseInt(h.slice(2, 4), 16);
  const b = parseInt(h.slice(4, 6), 16);
  if ([r, g, b].some((n) => Number.isNaN(n))) return 0;
  return (
    0.2126 * channelToLinear(r) +
    0.7152 * channelToLinear(g) +
    0.0722 * channelToLinear(b)
  );
}

export function contrastRatio(a: string, b: string): number {
  const la = relativeLuminance(a);
  const lb = relativeLuminance(b);
  const hi = Math.max(la, lb);
  const lo = Math.min(la, lb);
  return (hi + 0.05) / (lo + 0.05);
}

/** Ink for a dark substrate. */
export const INK_DARK = "#14120E";
/** Ink for a light substrate. */
export const INK_LIGHT = "#FFFFFF";

/**
 * Whichever ink actually wins on this accent. Deterministic, so every preset
 * in both themes resolves to a legible pair without hand-tuning.
 */
export function inkOn(accent: string): string {
  return contrastRatio(accent, INK_DARK) >= contrastRatio(accent, INK_LIGHT)
    ? INK_DARK
    : INK_LIGHT;
}

/** Hex + alpha, for tinted fields. */
export function alpha(hex: string, a: number): string {
  const clamped = Math.max(0, Math.min(1, a));
  return clamped >= 1 ? hex : `${hex}${Math.round(clamped * 255).toString(16).padStart(2, "0")}`;
}

// ─────────────────────────────────────────────────────────────────────
// Palettes
// ─────────────────────────────────────────────────────────────────────

export const palettes: Record<ThemeMode, Palette> = {
  dark: {
    bg: "#12110D",
    surface: "#191712",
    panel: "#211E18",
    raised: "#2A2620",
    overlay: "#1D1A15",

    border: "#332F27",
    borderStrong: "#4A4438",

    text: "#F2EDE3",
    muted: "#A69E8E",
    faint: "#736C5D",
    inverse: "#14120E",

    accent: "#F4B740",
    onAccent: inkOn("#F4B740"),
    accentSoft: "#F4B74024",
    accentLine: "#F4B74080",

    danger: "#F0776A",
    onDanger: "#1A0E0B",
    success: "#6FC79B",
    warning: "#F4B740",

    scrim: "rgba(8,7,4,0.76)",
    focusRing: "#F4B740",
    codeBg: "#0E0D0A",
  },
  light: {
    bg: "#FAF8F3",
    surface: "#FFFFFF",
    panel: "#F1EDE4",
    raised: "#FFFFFF",
    overlay: "#FFFFFF",

    border: "#E2DCCE",
    borderStrong: "#C7BFAE",

    text: "#1B1915",
    muted: "#6A6457",
    faint: "#948D7C",
    inverse: "#FFFFFF",

    accent: "#A9640A",
    onAccent: inkOn("#A9640A"),
    accentSoft: "#A9640A1F",
    accentLine: "#A9640A66",

    danger: "#B3261E",
    onDanger: "#FFFFFF",
    success: "#1F7A50",
    warning: "#A9640A",

    scrim: "rgba(27,25,21,0.42)",
    focusRing: "#A9640A",
    codeBg: "#F3EFE6",
  },
};

// ─────────────────────────────────────────────────────────────────────
// Signal presets
//
// Five lamps. Each carries `key` so it can be named in the UI, and a light
// and dark value so the signal keeps its contrast on both substrates.
// ─────────────────────────────────────────────────────────────────────

export interface AccentPreset {
  key: "amber" | "ember" | "jade" | "cobalt" | "orchid";
  dark: string;
  light: string;
}

export const ACCENT_PRESETS: AccentPreset[] = [
  { key: "amber", dark: "#F4B740", light: "#A9640A" },
  { key: "ember", dark: "#F2715E", light: "#B23A28" },
  { key: "jade", dark: "#5CC08F", light: "#1F7A50" },
  { key: "cobalt", dark: "#6FA8F5", light: "#2A5DBF" },
  { key: "orchid", dark: "#C08CF0", light: "#7B3FB0" },
];

export function accentValue(preset: AccentPreset, theme: ThemeMode): string {
  return theme === "dark" ? preset.dark : preset.light;
}

// ─────────────────────────────────────────────────────────────────────
// Provider marks
//
// One map, in one place. Providers are identified by a letter first and a
// hue second, so the marks survive colour-vision deficiency and greyscale.
// The hue is never used as a fill behind white text.
// ─────────────────────────────────────────────────────────────────────

export const PROVIDER_MARKS: Record<ProviderId, string> = {
  "opencode-go": "#7C93B8",
  openai: "#4E9E7F",
  "xiaomi-mimo": "#D2704F",
  anthropic: "#C79A72",
  openrouter: "#8E86C9",
  ollama: "#7E8F6B",
  custom: "#8B8375",
};

export function providerMark(kind: ProviderId): string {
  return PROVIDER_MARKS[kind] ?? PROVIDER_MARKS.custom;
}

// ─────────────────────────────────────────────────────────────────────
// Spatial system
//
// One unit is 4px. Every step below is a multiple of it; 16 and 36 are the
// macro breaths (component gap, section break).
// ─────────────────────────────────────────────────────────────────────

export const SP = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 24,
  macro: 36,
} as const;

/** Edge language: near-square. Instruments have corners. */
export const R = {
  none: 0,
  xs: 2,
  sm: 4,
  md: 6,
  lg: 8,
  pill: 999,
} as const;

/** Minimum comfortable touch target. */
export const HIT = 44;

// ─────────────────────────────────────────────────────────────────────

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
    const valid = accent && /^#[0-9a-fA-F]{6}$/.test(accent) ? accent : null;
    if (!valid || valid.toLowerCase() === base.accent.toLowerCase()) {
      return { theme, c: base };
    }
    const c: Palette = {
      ...base,
      accent: valid,
      onAccent: inkOn(valid),
      accentSoft: alpha(valid, 0.14),
      accentLine: alpha(valid, 0.5),
      warning: valid,
      focusRing: valid,
    };
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
