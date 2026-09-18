import { StyleSheet, Text, type TextStyle } from "react-native";

// ─────────────────────────────────────────────────────────────────────
// Lumen — type system
//
// IBM Plex Sans carries the conversation: an engineering grotesque with
// enough humanist quirk to belong to an instrument panel. IBM Plex Mono
// carries readouts and labels — the parts of the interface that are
// measurements rather than prose.
//
// Hierarchy: 26 / 20 / 15 body, with 13 for small and 10.5 mono for labels.
// Light-on-dark gets a trace of tracking and more leading than it needs on
// paper, because light type reads optically thinner.
// ─────────────────────────────────────────────────────────────────────

export const FONTS = {
  regular: "IBMPlexSans_400Regular",
  medium: "IBMPlexSans_500Medium",
  semiBold: "IBMPlexSans_600SemiBold",
  bold: "IBMPlexSans_700Bold",
  mono: "IBMPlexMono_400Regular",
  monoMedium: "IBMPlexMono_500Medium",
  monoBold: "IBMPlexMono_600SemiBold",
} as const;

/** Every face we load encodes its weight in the family name. */
const WEIGHT_BEARING = new Set<string>(Object.values(FONTS));

export const T = {
  display: 26,
  title: 20,
  heading: 16,
  body: 15,
  small: 13,
  label: 10.5,
  readout: 15,
  mono: 13,
} as const;

type Named = TextStyle;

/** Display and screen titles. */
export const TXT = {
  display: {
    fontSize: T.display,
    lineHeight: 32,
    fontWeight: "700",
    letterSpacing: -0.2,
  } as Named,
  title: {
    fontSize: T.title,
    lineHeight: 26,
    fontWeight: "600",
    letterSpacing: -0.1,
  } as Named,
  heading: {
    fontSize: T.heading,
    lineHeight: 22,
    fontWeight: "600",
  } as Named,
  body: {
    fontSize: T.body,
    lineHeight: 24,
    letterSpacing: 0.1,
  } as Named,
  bodyStrong: {
    fontSize: T.body,
    lineHeight: 24,
    fontWeight: "600",
    letterSpacing: 0.1,
  } as Named,
  small: {
    fontSize: T.small,
    lineHeight: 19,
    letterSpacing: 0.1,
  } as Named,
  /** Mono readout: model names, versions, counts, keys. */
  readout: {
    fontFamily: FONTS.monoMedium,
    fontSize: T.readout,
    lineHeight: 19,
    letterSpacing: 0.3,
  } as Named,
  /** Mono readout at label scale, for identifiers under a title. */
  readoutSm: {
    fontFamily: FONTS.monoMedium,
    fontSize: 12,
    lineHeight: 17,
    letterSpacing: 0.2,
  } as Named,
  /** Mono micro-label: the small caps furniture of the instrument. */
  label: {
    fontFamily: FONTS.monoMedium,
    fontSize: T.label,
    lineHeight: 13,
    letterSpacing: 1.1,
    textTransform: "uppercase",
  } as Named,
  code: {
    fontFamily: FONTS.mono,
    fontSize: T.mono,
    lineHeight: 20,
  } as Named,
} as const;

function familyFor(weight?: TextStyle["fontWeight"]): string {
  switch (weight) {
    case "800":
    case "900":
    case 800:
    case 900:
      return FONTS.bold;
    case "700":
    case "bold":
    case 700:
      return FONTS.bold;
    case "600":
    case 600:
      return FONTS.semiBold;
    case "500":
    case "medium":
    case 500:
      return FONTS.medium;
    default:
      return FONTS.regular;
  }
}

type TextRenderResult = React.ReactElement<{
  style?: TextStyle | TextStyle[];
}>;

let patched = false;

/**
 * Apply IBM Plex to every <Text> that has not chosen a face itself.
 *
 * Two rules matter here:
 *  1. An explicit family always wins, so code and math keep their mono face.
 *  2. When we substitute a family, `fontWeight` is DROPPED. The loaded face
 *     already *is* the weight (IBMPlexSans_700Bold), and leaving a numeric
 *     weight beside a custom family makes Android synthesise a second bold
 *     on top of the real one.
 */
export function applyLumenFonts() {
  if (patched) {
    return;
  }
  patched = true;

  const AnyText = Text as unknown as {
    render: (...args: unknown[]) => TextRenderResult;
  };
  const originalRender = AnyText.render;

  AnyText.render = function render(this: unknown, ...args: unknown[]) {
    const origin = originalRender.apply(this, args);
    const style = origin.props?.style;
    const flat = StyleSheet.flatten(style) as TextStyle | undefined;

    if (!flat) {
      return {
        ...origin,
        props: { ...origin.props, style: [{ fontFamily: FONTS.regular }] },
      } as TextRenderResult;
    }

    const explicit = flat.fontFamily;
    if (explicit && !WEIGHT_BEARING.has(explicit)) {
      // A face we did not load — leave it and its weight alone.
      return origin;
    }

    // Drop both the family and the weight, then re-emit everything else.
    const { fontFamily: _family, fontWeight: _weight, ...rest } = flat;
    const family = familyFor(flat.fontWeight);

    return {
      ...origin,
      props: {
        ...origin.props,
        style: [{ fontFamily: family }, rest],
      },
    } as TextRenderResult;
  };
}
