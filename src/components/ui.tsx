import { Ionicons } from "@expo/vector-icons";
import { useEffect, useState, type ReactNode } from "react";
import {
  AccessibilityInfo,
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  View,
  type AccessibilityState,
  type PressableStateCallbackType,
  type StyleProp,
  type ViewStyle,
} from "react-native";
import { providerMark, R, SP, useTheme, type Palette } from "../theme";
import type { ProviderId } from "../types/chat";
import { TXT } from "../fonts";

// ─────────────────────────────────────────────────────────────────────
// Lumen control language
//
// Every control on the surface is built from these. Near-square corners,
// hairline edges, no shadow in the content plane, a 44pt floor on anything
// tappable, and a hover/focus treatment that answers to the input mode the
// user is actually on.
// ─────────────────────────────────────────────────────────────────────

/**
 * Focus-visible, done properly.
 *
 * A ring should answer "where is the keyboard", not "what did I click". A
 * pointer press arms the flag; any key press disarms it. Focus always lands
 * after one of those, so the flag is already correct when we render.
 */
type PressState = { pressed: boolean; hovered?: boolean; focused?: boolean };

let pointerActive = false;
if (typeof document !== "undefined") {
  document.addEventListener("pointerdown", () => { pointerActive = true; }, true);
  document.addEventListener("keydown", () => { pointerActive = false; }, true);
}

function ringFor(c: Palette): ViewStyle {
  return {
    outlineStyle: "solid",
    outlineWidth: 2,
    outlineColor: c.focusRing,
    outlineOffset: 2,
  } as unknown as ViewStyle;
}

/**
 * The one tappable surface. Everything else is built on top of it, so hover,
 * pressed, focus-visible and the target floor can never drift between
 * components.
 */
export function Touch({
  children,
  onPress,
  disabled = false,
  label,
  role = "button",
  state,
  style,
  hover,
  press,
  radius = R.sm,
  hitSlop = 0,
  accessibilityHint,
}: {
  children: ReactNode;
  onPress?: () => void;
  disabled?: boolean;
  label?: string;
  role?: "button" | "radio" | "tab" | "link" | "none";
  state?: AccessibilityState;
  style?: StyleProp<ViewStyle>;
  hover?: StyleProp<ViewStyle>;
  press?: StyleProp<ViewStyle>;
  radius?: number;
  /** Expands the target beyond the visible box without moving the layout. */
  hitSlop?: number;
  accessibilityHint?: string;
}) {
  const { c } = useTheme();
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      hitSlop={hitSlop > 0 ? hitSlop : undefined}
      accessibilityRole={role === "none" ? undefined : role}
      accessibilityLabel={label}
      accessibilityHint={accessibilityHint}
      accessibilityState={disabled ? { ...state, disabled: true } : state}
      style={(raw: PressableStateCallbackType): StyleProp<ViewStyle> => {
        const s = raw as unknown as PressState;
        return [
          { borderRadius: radius },
          style,
          s.hovered && !disabled ? hover : null,
          s.pressed && !disabled ? press : null,
          s.focused && !pointerActive ? ringFor(c) : null,
        ];
      }}
    >
      {children}
    </Pressable>
  );
}

// ── Section furniture ────────────────────────────────────────────────

export function SectionLabel({
  children,
  right,
  style,
}: {
  children: string;
  right?: ReactNode;
  style?: StyleProp<ViewStyle>;
}) {
  const { c } = useTheme();
  return (
    <View style={[styles.sectionRow, style]}>
      <Text style={[TXT.label, { color: c.faint }]}>{children}</Text>
      {right}
    </View>
  );
}

export function Divider({ inset = false }: { inset?: boolean }) {
  const { c } = useTheme();
  return (
    <View
      style={{
        height: StyleSheet.hairlineWidth,
        backgroundColor: c.border,
        marginLeft: inset ? SP.lg : 0,
      }}
    />
  );
}

/** A bordered field. Plane 1 by default; `inset` steps it down to plane 2. */
export function Panel({
  children,
  inset = false,
  padded = true,
  style,
}: {
  children: ReactNode;
  inset?: boolean;
  padded?: boolean;
  style?: StyleProp<ViewStyle>;
}) {
  const { c } = useTheme();
  return (
    <View
      style={[
        {
          backgroundColor: inset ? c.panel : c.surface,
          borderWidth: StyleSheet.hairlineWidth,
          borderColor: c.border,
          borderRadius: R.sm,
          overflow: "hidden",
        },
        padded ? styles.panelPad : null,
        style,
      ]}
    >
      {children}
    </View>
  );
}

// ── Rows ─────────────────────────────────────────────────────────────

export function Row({
  label,
  desc,
  value,
  right,
  onPress,
  tone = "default",
  chevron = false,
  flush = false,
}: {
  label: string;
  desc?: string;
  value?: string;
  right?: ReactNode;
  onPress?: () => void;
  tone?: "default" | "accent" | "danger";
  chevron?: boolean;
  /** Drop the horizontal padding when the container already insets. */
  flush?: boolean;
}) {
  const { c } = useTheme();
  const ink = tone === "danger" ? c.danger : tone === "accent" ? c.accent : c.text;
  const pad = flush ? { paddingHorizontal: 0 } : undefined;

  const body = (
    <>
      <View style={styles.rowText}>
        <Text style={[TXT.body, { color: ink }]} numberOfLines={1}>
          {label}
        </Text>
        {desc ? (
          <Text style={[TXT.small, { color: c.muted, marginTop: 2 }]} numberOfLines={2}>
            {desc}
          </Text>
        ) : null}
      </View>
      {value ? (
        <Text style={[TXT.readout, { color: c.muted }]} numberOfLines={1}>
          {value}
        </Text>
      ) : null}
      {right}
      {chevron ? <Ionicons name="chevron-forward" size={16} color={c.faint} /> : null}
    </>
  );

  if (!onPress) {
    return <View style={[styles.row, pad]}>{body}</View>;
  }

  return (
    <Touch
      onPress={onPress}
      label={label}
      style={[styles.row, pad]}
      hover={{ backgroundColor: c.panel }}
      press={{ backgroundColor: c.panel }}
    >
      {body}
    </Touch>
  );
}

// ── Buttons ──────────────────────────────────────────────────────────

export function Button({
  label,
  onPress,
  variant = "primary",
  disabled = false,
  loading = false,
  icon,
  wide = false,
}: {
  label: string;
  onPress: () => void;
  variant?: "primary" | "ghost" | "quiet" | "danger";
  disabled?: boolean;
  loading?: boolean;
  icon?: keyof typeof Ionicons.glyphMap;
  wide?: boolean;
}) {
  const { c } = useTheme();

  const skin: ViewStyle =
    variant === "primary"
      ? { backgroundColor: disabled ? c.panel : c.accent }
      : variant === "danger"
        ? { backgroundColor: disabled ? c.panel : c.danger }
        : variant === "ghost"
          ? { borderWidth: 1, borderColor: c.borderStrong }
          : {};

  const ink =
    variant === "primary"
      ? disabled
        ? c.faint
        : c.onAccent
      : variant === "danger"
        ? disabled
          ? c.faint
          : c.onDanger
        : variant === "ghost"
          ? c.text
          : c.muted;

  return (
    <Touch
      onPress={onPress}
      disabled={disabled}
      label={label}
      state={{ busy: loading }}
      style={[styles.button, skin, wide ? styles.buttonWide : null]}
      hover={variant === "primary" || variant === "danger" ? { opacity: 0.9 } : { backgroundColor: c.panel }}
      press={{ opacity: 0.72 }}
    >
      {loading ? (
        <ActivityIndicator size="small" color={ink} />
      ) : (
        <>
          {icon ? <Ionicons name={icon} size={16} color={ink} /> : null}
          <Text style={[TXT.body, { color: ink, fontWeight: "600" }]}>{label}</Text>
        </>
      )}
    </Touch>
  );
}

const HIT_ICON = 44;

/** An icon-only control. The glyph is small; the target never is. */
export function IconButton({
  icon,
  onPress,
  label,
  tone = "muted",
  size = HIT_ICON,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  onPress: () => void;
  label: string;
  tone?: "muted" | "text" | "accent" | "danger";
  size?: number;
}) {
  const { c } = useTheme();
  const ink =
    tone === "accent"
      ? c.accent
      : tone === "danger"
        ? c.danger
        : tone === "text"
          ? c.text
          : c.muted;
  return (
    <Touch
      onPress={onPress}
      label={label}
      hitSlop={size < HIT_ICON ? Math.ceil((HIT_ICON - size) / 2) : 0}
      style={[styles.iconButton, { width: size, height: size }]}
      hover={{ backgroundColor: c.panel }}
      press={{ backgroundColor: c.panel }}
    >
      <Ionicons name={icon} size={Math.round(size * 0.48)} color={ink} />
    </Touch>
  );
}

// ── Segmented control ────────────────────────────────────────────────

export function Segmented<T extends string>({
  options,
  value,
  onChange,
  label,
}: {
  options: { key: T; label: string }[];
  value: T;
  onChange: (key: T) => void;
  label: string;
}) {
  const { c } = useTheme();
  return (
    <View
      accessibilityRole="radiogroup"
      accessibilityLabel={label}
      style={[styles.segmented, { borderColor: c.border, backgroundColor: c.panel }]}
    >
      {options.map((opt) => {
        const on = opt.key === value;
        return (
          <Touch
            key={opt.key}
            onPress={() => onChange(opt.key)}
            label={opt.label}
            role="radio"
            state={{ selected: on }}
            radius={R.xs}
            style={[styles.segment, on ? { backgroundColor: c.accent } : null]}
            hover={!on ? { backgroundColor: c.raised } : undefined}
            press={{ opacity: 0.75 }}
          >
            <Text style={[TXT.label, { color: on ? c.onAccent : c.muted }]}>{opt.label}</Text>
          </Touch>
        );
      })}
    </View>
  );
}

// ── Provider identity ────────────────────────────────────────────────
// Letter first, hue second. The mark is never a fill behind white text, so
// it cannot fail contrast, and it survives greyscale and colour blindness.

export function ProviderMark({
  kind,
  name,
  size = 26,
}: {
  kind: ProviderId;
  name: string;
  size?: number;
}) {
  const hue = providerMark(kind);
  const letter = (name.trim()[0] ?? "?").toUpperCase();
  return (
    <View
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      style={{
        width: size,
        height: size,
        borderRadius: R.xs,
        borderWidth: 1,
        borderColor: `${hue}66`,
        backgroundColor: `${hue}24`,
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <Text
        style={{
          fontFamily: TXT.readout.fontFamily,
          fontSize: Math.round(size * 0.44),
          lineHeight: Math.round(size * 0.62),
          color: hue,
        }}
      >
        {letter}
      </Text>
    </View>
  );
}

// ── State indication ─────────────────────────────────────────────────
// Never colour alone: the dot ships with a text label beside it.

export function StatusDot({ state }: { state: "live" | "idle" | "error" }) {
  const { c } = useTheme();
  const hue = state === "live" ? c.success : state === "error" ? c.danger : c.faint;
  return (
    <View
      style={{
        width: 7,
        height: 7,
        borderRadius: R.xs,
        borderWidth: 1,
        borderColor: hue,
        backgroundColor: state === "idle" ? "transparent" : hue,
      }}
    />
  );
}

// ── Meter ────────────────────────────────────────────────────────────
// The streaming indicator: three ticks sampling, in the signal colour. It
// reads as an instrument taking a reading, not a chatbot typing.
// Honours reduce-motion by holding a single static tick.

export function Meter({ active, reduced = false }: { active: boolean; reduced?: boolean }) {
  const { c } = useTheme();
  const [step, setStep] = useState(0);

  useEffect(() => {
    if (!active || reduced) {
      return;
    }
    const id = setInterval(() => setStep((s) => (s + 1) % 3), 200);
    return () => clearInterval(id);
  }, [active, reduced]);

  if (!active) {
    return null;
  }

  const heights = reduced ? [6, 6, 6] : [[5, 10, 14], [10, 14, 5], [14, 5, 10]][step];

  return (
    <View style={styles.meter} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
      {heights.map((h, i) => (
        <View
          key={i}
          style={{
            width: 2,
            height: h,
            borderRadius: 1,
            backgroundColor: c.accent,
            opacity: 0.45 + h / 28,
          }}
        />
      ))}
    </View>
  );
}

/**
 * Reduced motion, respected. Anything that loops forever asks this first, so
 * the answer is the platform's accessibility setting rather than a guess.
 */
export function useReducedMotion(): boolean {
  const [reduced, setReduced] = useState(false);
  useEffect(() => {
    let cancelled = false;
    void AccessibilityInfo.isReduceMotionEnabled().then((value) => {
      if (!cancelled) {
        setReduced(value);
      }
    });
    const sub = AccessibilityInfo.addEventListener("reduceMotionChanged", (value) => {
      setReduced(value);
    });
    return () => {
      cancelled = true;
      sub.remove();
    };
  }, []);
  return reduced;
}

const styles = StyleSheet.create({
  sectionRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    minHeight: 20,
  },
  panelPad: { paddingVertical: SP.xs },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: SP.md,
    paddingHorizontal: SP.lg,
    minHeight: HIT_ICON,
    paddingVertical: SP.sm,
  },
  rowText: { flex: 1, minWidth: 0 },
  button: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: SP.sm,
    minHeight: HIT_ICON,
    paddingHorizontal: SP.lg,
  },
  buttonWide: { flex: 1 },
  iconButton: { alignItems: "center", justifyContent: "center" },
  segmented: {
    flexDirection: "row",
    borderRadius: R.sm,
    borderWidth: StyleSheet.hairlineWidth,
    padding: 2,
    gap: 2,
  },
  segment: {
    minHeight: 38,
    paddingHorizontal: SP.md,
    alignItems: "center",
    justifyContent: "center",
  },
  meter: { flexDirection: "row", alignItems: "flex-end", gap: 2, height: 14 },
});
