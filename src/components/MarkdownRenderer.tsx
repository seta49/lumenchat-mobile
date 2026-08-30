import Markdown from "react-native-markdown-display";
import { StyleSheet } from "react-native";
import { useTheme } from "../theme";

/** Renderer markdown (react-native-markdown-display) dengan palet tema.
 *  Mermaid/KaTeX tidak di-port di v1 — diagram render sebagai code block,
 *  rumus sebagai teks biasa (lihat plan). */
export function MarkdownRenderer({ body, tint }: { body: string; tint?: string }) {
  const { c } = useTheme();
  const fg = tint ?? c.text;
  const styles = {
    body: { color: fg, fontSize: 15, lineHeight: 21 },
    text: { color: fg },
    paragraph: { marginTop: 0, marginBottom: 8 },
    heading1: { color: fg, fontSize: 20, fontWeight: "700" as const, marginTop: 10, marginBottom: 6 },
    heading2: { color: fg, fontSize: 18, fontWeight: "700" as const, marginTop: 9, marginBottom: 5 },
    heading3: { color: fg, fontSize: 16, fontWeight: "700" as const, marginTop: 8, marginBottom: 4 },
    heading4: { color: fg, fontSize: 15, fontWeight: "700" as const, marginTop: 8, marginBottom: 4 },
    link: { color: c.accent, textDecorationLine: "underline" as const },
    strong: { fontWeight: "700" as const },
    em: { fontStyle: "italic" as const },
    code_inline: {
      backgroundColor: c.codeBg,
      color: c.accent,
      fontFamily: "monospace",
      fontSize: 13,
      paddingHorizontal: 4,
      borderRadius: 4,
    },
    code_block: {
      backgroundColor: c.codeBg,
      color: fg,
      fontFamily: "monospace",
      fontSize: 13,
      padding: 12,
      borderRadius: 10,
      marginVertical: 6,
    },
    fence: {
      backgroundColor: c.codeBg,
      color: fg,
      fontFamily: "monospace",
      fontSize: 13,
      padding: 12,
      borderRadius: 10,
      marginVertical: 6,
    },
    blockquote: {
      borderLeftWidth: 3,
      borderLeftColor: c.border,
      paddingLeft: 10,
      color: c.muted,
      fontStyle: "italic" as const,
    },
    bullet_list_icon: { color: c.muted },
    ordered_list_icon: { color: c.muted },
    hr: { backgroundColor: c.border, height: StyleSheet.hairlineWidth },
    table: { borderColor: c.border },
    th: { color: fg, backgroundColor: c.panel, fontWeight: "700" as const },
    td: { color: fg },
  };
  return <Markdown style={styles as never}>{body}</Markdown>;
}