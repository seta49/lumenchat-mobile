import Markdown from "react-native-markdown-display";
import { StyleSheet, Text, View } from "react-native";
import { useTheme } from "../theme";

/** Highlighter ringan tanpa lib eksternal — cukup warna keyword/string/comment/number. */
const KEYWORDS =
  /\b(const|let|var|function|return|if|else|for|while|import|from|export|class|def|async|await|new|this|true|false|null|None|True|False|print|type|interface|public|private|extends|implements|try|catch|throw|switch|case|break|continue|in|of|as|default|yield|void|typeof|instanceof)\b/g;

type Piece = { text: string; color?: string };

function tokenizeLine(line: string, c: { accent: string; success: string; danger: string; muted: string; text: string }): Piece[] {
  // comment dulu (# atau //)
  const commentIdx = line.search(/(#|\/\/)/);
  let code = line;
  let comment = "";
  if (commentIdx >= 0) {
    code = line.slice(0, commentIdx);
    comment = line.slice(commentIdx);
  }

  const pieces: Piece[] = [];
  // string "..." atau '...'
  const strRe = /("(?:\\.|[^"\\])*"|'(?:\\.|[^'\\])*')/g;
  let last = 0;
  let m: RegExpExecArray | null;
  while ((m = strRe.exec(code))) {
    if (m.index > last) {
      pieces.push(...colorKeywords(code.slice(last, m.index), c));
    }
    pieces.push({ text: m[0], color: c.success });
    last = m.index + m[0].length;
  }
  if (last < code.length) {
    pieces.push(...colorKeywords(code.slice(last), c));
  }
  if (comment) {
    pieces.push({ text: comment, color: c.muted });
  }
  return pieces;
}

function colorKeywords(
  segment: string,
  c: { accent: string; danger: string; muted: string },
): Piece[] {
  const pieces: Piece[] = [];
  let last = 0;
  KEYWORDS.lastIndex = 0;
  let m: RegExpExecArray | null;
  while ((m = KEYWORDS.exec(segment))) {
    if (m.index > last) {
      pieces.push({ text: segment.slice(last, m.index) });
    }
    pieces.push({ text: m[0], color: c.accent });
    last = m.index + m[0].length;
  }
  if (last < segment.length) {
    pieces.push({ text: segment.slice(last) });
  }
  return pieces;
}

function HighlightedCode({ code }: { code: string }) {
  const { c } = useTheme();
  const lines = code.replace(/\n$/, "").split("\n");
  return (
    <View style={[styles.codeCard, { backgroundColor: c.codeBg, borderColor: c.border }]}>
      {lines.map((line, i) => {
        const pieces = tokenizeLine(line, {
          accent: c.accent,
          success: c.success,
          danger: c.danger,
          muted: c.muted,
          text: c.text,
        });
        return (
          <Text key={i} style={styles.codeLine}>
            {pieces.map((p, j) => (
              <Text
                key={j}
                style={[styles.codeTok, p.color ? { color: p.color } : { color: c.text }]}
              >
                {p.text}
              </Text>
            ))}
            {line.length === 0 ? " " : ""}
          </Text>
        );
      })}
    </View>
  );
}

/** Renderer markdown dengan code block highlight custom (tanpa prism/refractor). */
export function MarkdownRenderer({ body, tint }: { body: string; tint?: string }) {
  const { c } = useTheme();
  const fg = tint ?? c.text;

  const styles = {
    body: { color: fg, fontSize: 15, lineHeight: 21 },
    text: { color: fg },
    paragraph: { marginTop: 0, marginBottom: 8, color: fg },
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
    // fence/code_block pakai renderer custom di bawah (style tetap kosong-ish)
    code_block: {
      backgroundColor: "transparent",
      color: fg,
      fontFamily: "monospace",
      fontSize: 13,
      padding: 0,
      marginVertical: 6,
    },
    fence: {
      backgroundColor: "transparent",
      color: fg,
      fontFamily: "monospace",
      fontSize: 13,
      padding: 0,
      marginVertical: 6,
    },
    blockquote: {
      borderLeftWidth: 3,
      borderLeftColor: c.accent,
      paddingLeft: 10,
      paddingVertical: 6,
      paddingRight: 8,
      marginVertical: 4,
      backgroundColor: c.panel,
      color: c.muted,
      fontStyle: "italic" as const,
      borderRadius: 4,
    },
    bullet_list_icon: { color: c.muted },
    ordered_list_icon: { color: c.muted },
    hr: { backgroundColor: c.border, height: StyleSheet.hairlineWidth },
    table: { borderColor: c.border },
    th: { color: fg, backgroundColor: c.panel, fontWeight: "700" as const },
    td: { color: fg },
  };

  // Override fence: render HighlightedCode (fungsi langsung, bukan { renderer })
  const rules = {
    fence: (node: { content?: string; key?: string }) => {
      const code = node?.content ?? "";
      return <HighlightedCode key={node?.key ?? "fence"} code={code} />;
    },
  };

  return (
    <Markdown style={styles as never} rules={rules as never}>
      {body}
    </Markdown>
  );
}

const styles = StyleSheet.create({
  codeCard: {
    borderRadius: 10,
    borderWidth: StyleSheet.hairlineWidth,
    padding: 12,
    marginVertical: 6,
  },
  codeLine: {
    fontFamily: "monospace",
    fontSize: 13,
    lineHeight: 18,
  },
  codeTok: {
    fontFamily: "monospace",
    fontSize: 13,
  },
});
