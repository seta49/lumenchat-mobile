import { StyleSheet, Text, type TextStyle } from "react-native";

/** Nama font setelah di-load via expo-font / @expo-google-fonts. */
export const FONTS = {
  regular: "Sora_400Regular",
  medium: "Sora_500Medium",
  semiBold: "Sora_600SemiBold",
  bold: "Sora_700Bold",
  extraBold: "Sora_800ExtraBold",
  mono: "JetBrainsMono_400Regular",
  monoMedium: "JetBrainsMono_500Medium",
  monoBold: "JetBrainsMono_700Bold",
} as const;

function sansForWeight(weight?: TextStyle["fontWeight"]): string {
  switch (weight) {
    case "800":
    case "900":
    case 800:
    case 900:
      return FONTS.extraBold;
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
 * Apply Sora ke semua <Text> yang belum set fontFamily sendiri
 * (code block set fontFamily eksplisit → mono tetap aman).
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

    if (flat?.fontFamily) {
      return origin;
    }

    const fontFamily = sansForWeight(flat?.fontWeight);
    const nextStyle: TextStyle[] = [
      { fontFamily },
      ...(Array.isArray(style) ? style : style ? [style] : []),
    ];

    return {
      ...origin,
      props: {
        ...origin.props,
        style: nextStyle,
      },
    } as TextRenderResult;
  };
}
