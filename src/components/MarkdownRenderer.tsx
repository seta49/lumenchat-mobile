import Markdown from "react-native-markdown-display";
import * as WebBrowser from "expo-web-browser";
import { ScrollView, StyleSheet, Text, View } from "react-native";
import { useTheme } from "../theme";
import { MathView } from "./MathView";

/** Highlighter ringan tanpa lib eksternal — cukup warna keyword/string/comment/number. */
const KEYWORDS =
  /\b(const|let|var|function|return|if|else|for|while|import|from|export|class|def|async|await|new|this|true|false|null|None|True|False|print|type|interface|public|private|extends|implements|try|catch|throw|switch|case|break|continue|in|of|as|default|yield|void|typeof|instanceof)\b/g;

type Piece = { text: string; color?: string };

function tokenizeLine(
  line: string,
  c: { accent: string; success: string; danger: string; muted: string; text: string },
): Piece[] {
  const commentIdx = line.search(/(#|\/\/)/);
  let code = line;
  let comment = "";
  if (commentIdx >= 0) {
    code = line.slice(0, commentIdx);
    comment = line.slice(commentIdx);
  }

  const pieces: Piece[] = [];
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

/** Ambil teks polos dari children markdown (Text nodes / nested). */
function flattenText(children: unknown): string {
  if (children == null) return "";
  if (typeof children === "string") return children;
  if (typeof children === "number") return String(children);
  if (Array.isArray(children)) return children.map(flattenText).join("");
  if (typeof children === "object" && "props" in (children as object)) {
    const props = (children as { props?: { children?: unknown } }).props;
    return flattenText(props?.children);
  }
  return "";
}

/** Fence node → language + isi. */
function fenceInfo(node: {
  content?: string;
  info?: string;
  attributes?: Record<string, unknown>;
}): { lang: string; code: string } {
  const raw = node?.content ?? "";
  const code = raw.endsWith("\n") ? raw.slice(0, -1) : raw;
  const info =
    (typeof node?.info === "string" && node.info) ||
    (typeof node?.attributes?.class === "string"
      ? String(node.attributes.class)
      : "") ||
    "";
  const lang = info.replace(/^language-?/i, "").trim().toLowerCase();
  return { lang, code };
}

const LATEX_LANGS = new Set(["latex", "tex", "math", "katex", "stex"]);

/** KaTeX cuma bisa math — tabular / document / package gak didukung. */
function isKaTeXMath(code: string): boolean {
  if (/\\(begin\{(?:tabular|tabularx|longtable|landscape|document|figure|table)\}|usepackage|documentclass|setlength|renewcommand|toprule|midrule|bottomrule|hline)/.test(code)) {
    return false;
  }
  // Harus ada ciri math
  return /\\(frac|sqrt|sum|prod|int|alpha|beta|gamma|delta|theta|lambda|mu|pi|sigma|omega|cdot|times|leq|geq|neq|infty|left|right|hat|bar|vec|partial|nabla|begin\{(?:equation|align|matrix|bmatrix|pmatrix|cases)\}|\\[|\\(|\^|_)/.test(code);
}

/** Pecah body: $$display$$ dan $inline$ → MathView, sisanya teks biasa. */
function splitMath(body: string): Array<{ type: "text" | "math"; value: string; display?: boolean }> {
  const out: Array<{ type: "text" | "math"; value: string; display?: boolean }> = [];
  const re = /\$\$([\s\S]+?)\$\$|\$([^$\n]+?)\$/g;
  let last = 0;
  let m: RegExpExecArray | null;
  while ((m = re.exec(body))) {
    if (m.index > last) {
      out.push({ type: "text", value: body.slice(last, m.index) });
    }
    if (m[1] != null) {
      out.push({ type: "math", value: m[1].trim(), display: true });
    } else {
      out.push({ type: "math", value: (m[2] ?? "").trim(), display: false });
    }
    last = m.index + m[0].length;
  }
  if (last < body.length) {
    out.push({ type: "text", value: body.slice(last) });
  }
  return out;
}

/** Renderer markdown + code highlight + tabel rapi + LaTeX (KaTeX WebView). */
export function MarkdownRenderer({ body, tint }: { body: string; tint?: string }) {
  const { c } = useTheme();
  const fg = tint ?? c.text;

  const segments = splitMath(body);

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
    table: { marginVertical: 8 },
    th: { color: fg, fontWeight: "700" as const },
    td: { color: fg },
  };

  const rules = {
    fence: (node: {
      content?: string;
      info?: string;
      attributes?: Record<string, unknown>;
      key?: string;
    }) => {
      const { lang, code } = fenceInfo(node);
      const key = node?.key ?? "fence";
      if (LATEX_LANGS.has(lang) || /\\(frac|sqrt|sum|alpha|beta|cdot|times|begin\{equation)/.test(code)) {
        const tex = code.trim();
        // tabular / document LaTeX → code block (KaTeX gak support)
        if (LATEX_LANGS.has(lang) && !isKaTeXMath(tex)) {
          return <HighlightedCode key={key} code={tex} />;
        }
        if (isKaTeXMath(tex)) {
          return <MathView key={key} tex={tex} display />;
        }
      }
      return <HighlightedCode key={key} code={code} />;
    },
    // Tabel full-width + scroll horizontal dengan indikator jelas
    table: (node: { key?: string }, children: unknown) => {
      const key = node?.key ?? "table";
      return (
        <View key={key} style={[stylesTable.wrap, { borderColor: c.border }]}>
          <ScrollView
            horizontal
            nestedScrollEnabled
            showsHorizontalScrollIndicator
            keyboardShouldPersistTaps="handled"
            contentContainerStyle={stylesTable.inner}
          >
            {children as React.ReactNode}
          </ScrollView>
          <View style={[stylesTable.hintBar, { borderTopColor: c.border }]}>
            <Text style={[stylesTable.hint, { color: c.muted }]}>← geser tabel →</Text>
          </View>
        </View>
      );
    },
    thead: (node: { key?: string }, children: unknown) => (
      <View key={node?.key ?? "thead"} style={[stylesTable.row, { backgroundColor: c.panel }]}>
        {children as React.ReactNode}
      </View>
    ),
    tbody: (node: { key?: string }, children: unknown) => (
      <View key={node?.key ?? "tbody"}>{children as React.ReactNode}</View>
    ),
    tr: (node: { key?: string }, children: unknown) => (
      <View key={node?.key ?? "tr"} style={stylesTable.row}>
        {children as React.ReactNode}
      </View>
    ),
    th: (node: { key?: string }, children: unknown) => (
      <View
        key={node?.key ?? "th"}
        style={[stylesTable.cell, { borderColor: c.border, backgroundColor: c.panel }]}
      >
        <Text style={[stylesTable.thText, { color: fg }]} numberOfLines={4}>
          {flattenText(children)}
        </Text>
      </View>
    ),
    td: (node: { key?: string }, children: unknown) => (
      <View key={node?.key ?? "td"} style={[stylesTable.cell, { borderColor: c.border }]}>
        <Text style={[stylesTable.tdText, { color: fg }]} numberOfLines={5}>
          {flattenText(children)}
        </Text>
      </View>
    ),
  };

  return (
    <View>
      {segments.map((seg, i) =>
        seg.type === "math" ? (
          <MathView key={`m${i}`} tex={seg.value} display={seg.display} />
        ) : (
          <Markdown
            key={`t${i}`}
            style={styles as never}
            rules={rules as never}
            onLinkPress={(url: string) => {
              void WebBrowser.openBrowserAsync(url);
              return false;
            }}
          >
            {seg.value}
          </Markdown>
        ),
      )}
    </View>
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

const stylesTable = StyleSheet.create({
  wrap: {
    marginVertical: 8,
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 8,
    overflow: "hidden",
    minHeight: 44,
  },
  inner: {
    flexDirection: "column",
    alignItems: "stretch",
    minWidth: "100%",
  },
  row: {
    flexDirection: "row",
    borderBottomWidth: StyleSheet.hairlineWidth,
    alignItems: "stretch",
  },
  cell: {
    minWidth: 132,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRightWidth: StyleSheet.hairlineWidth,
    justifyContent: "center",
  },
  thText: {
    fontSize: 13,
    fontWeight: "700",
    lineHeight: 18,
  },
  tdText: {
    fontSize: 13,
    lineHeight: 18,
  },
  hintBar: {
    borderTopWidth: StyleSheet.hairlineWidth,
    paddingVertical: 5,
    alignItems: "center",
  },
  hint: {
    fontSize: 11,
    letterSpacing: 0.3,
  },
});
