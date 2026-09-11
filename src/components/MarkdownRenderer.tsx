import Markdown from "react-native-markdown-display";
import * as WebBrowser from "expo-web-browser";
import { ScrollView, StyleSheet, Text, View } from "react-native";
import { useTheme } from "../theme";
import { MathView } from "./MathView";

/** Highlighter ringan tanpa lib eksternal. */
const KEYWORDS =
  /\b(const|let|var|function|return|if|else|for|while|import|from|export|class|def|async|await|new|this|true|false|null|None|True|False|print|type|interface|public|private|extends|implements|try|catch|throw|switch|case|break|continue|in|of|as|default|yield|void|typeof|instanceof)\b/g;

type Piece = { text: string; color?: string };

function tokenizeLine(
  line: string,
  c: { accent: string; success: string; muted: string },
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

function colorKeywords(segment: string, c: { accent: string; muted: string }): Piece[] {
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
        const pieces = tokenizeLine(line, { accent: c.accent, success: c.success, muted: c.muted });
        return (
          <Text key={i} style={styles.codeLine}>
            {pieces.map((p, j) => (
              <Text key={j} style={[styles.codeTok, { color: p.color ?? c.text }]}>
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
    (typeof node?.attributes?.class === "string" ? String(node.attributes.class) : "") ||
    "";
  const lang = info.replace(/^language-?/i, "").trim().toLowerCase();
  return { lang, code };
}

const LATEX_LANGS = new Set(["latex", "tex", "math", "katex", "stex"]);

function isKaTeXMath(code: string): boolean {
  // Tabular / dokumen / package → BUKAN math
  if (/\\(?:begin\{(?:tabular|tabularx|longtable|landscape|document|figure|table|itemize)\}|usepackage|documentclass|setlength|renewcommand|toprule|midrule|bottomrule|hline|textbf|multicolumn|rowcolor)/.test(code)) {
    return false;
  }
  // Terlalu panjang / banyak baris → kemungkinan bukan rumus
  if (code.length > 400 || code.split("\n").length > 12) {
    return false;
  }
  // Harus ada ciri math yang KaTeX kenal
  return /\\(?:frac|sqrt|sum|prod|int|alpha|beta|gamma|delta|theta|lambda|mu|pi|sigma|omega|cdot|times|leq|geq|neq|infty|partial|nabla|hat|bar|vec|lim|log|sin|cos|tan)/.test(code) ||
    /\\begin\{(?:equation|align|gather|matrix|bmatrix|pmatrix|vmatrix|cases)\}/.test(code);
}

// ---------------------------------------------------------------------------
// Segment parser: $$math$$, $math$, ```fence```, |table|
// ---------------------------------------------------------------------------

type Seg =
  | { type: "text"; value: string }
  | { type: "math"; value: string; display: boolean }
  | { type: "code"; lang: string; value: string }
  | { type: "table"; header: string[]; rows: string[][] };

function splitPipeRow(line: string): string[] {
  let s = line.trim();
  if (s.startsWith("|")) s = s.slice(1);
  if (s.endsWith("|")) s = s.slice(0, -1);
  return s.split("|").map((cell) => cell.trim());
}

function isTableSeparator(line: string): boolean {
  const s = line.trim();
  return /^\|?[\s:|-]+\|?$/.test(s) && s.includes("-") && /^[\s|:-]+$/.test(s);
}

function isTableRow(line: string): boolean {
  const s = line.trim();
  return s.includes("|") && s.length > 1 && !isTableSeparator(s) && !s.startsWith("```");
}

/** Pecah body jadi segmen: math, code fence, tabel markdown, teks biasa. */
function parseSegments(body: string): Seg[] {
  const out: Seg[] = [];
  const lines = body.split("\n");
  let i = 0;
  let buf: string[] = [];

  const flushText = () => {
    if (buf.length) {
      // inline math di dalam teks
      const joined = buf.join("\n");
      pushInlineMath(joined, out);
      buf = [];
    }
  };

  while (i < lines.length) {
    const line = lines[i];
    const trimmed = line.trim();

    // Code fence
    if (trimmed.startsWith("```")) {
      flushText();
      const lang = trimmed.slice(3).trim().toLowerCase();
      i += 1;
      const codeLines: string[] = [];
      while (i < lines.length && !lines[i].trim().startsWith("```")) {
        codeLines.push(lines[i]);
        i += 1;
      }
      i += 1; // skip closing
      const code = codeLines.join("\n");
      out.push({ type: "code", lang, value: code });
      continue;
    }

    // Display math $$
    if (trimmed.startsWith("$$")) {
      flushText();
      let math = trimmed.slice(2);
      if (math.endsWith("$$") && math.length >= 2) {
        math = math.slice(0, -2);
        i += 1;
      } else {
        i += 1;
        const acc: string[] = [];
        while (i < lines.length && !lines[i].trim().endsWith("$$")) {
          acc.push(lines[i]);
          i += 1;
        }
        if (i < lines.length) {
          const last = lines[i].trim();
          acc.push(last.slice(0, -2));
          i += 1;
        }
        math = [math, ...acc].filter(Boolean).join("\n");
      }
      out.push({ type: "math", value: math.trim(), display: true });
      continue;
    }

    // Tabel: header | separator | rows
    if (isTableRow(trimmed) && i + 1 < lines.length && isTableSeparator(lines[i + 1])) {
      flushText();
      const header = splitPipeRow(trimmed);
      i += 2;
      const rows: string[][] = [];
      while (i < lines.length && isTableRow(lines[i])) {
        rows.push(splitPipeRow(lines[i]));
        i += 1;
      }
      // samakan jumlah kolom
      const cols = Math.max(header.length, ...rows.map((r) => r.length), 1);
      const pad = (arr: string[]) => {
        const a = arr.slice(0, cols);
        while (a.length < cols) a.push("");
        return a;
      };
      out.push({ type: "table", header: pad(header), rows: rows.map(pad) });
      continue;
    }

    buf.push(line);
    i += 1;
  }
  flushText();
  return out;
}

function pushInlineMath(text: string, out: Seg[]) {
  // $$ display math
  const reDisplay = /\$\$([\s\S]+?)\$\$\$/g;
  // Inline math: $...$ tanpa newline, minimal 1 char, bukan $$
  const reInline = /(?<!\$)\$([^$\n]+?)\$(?!\$)/g;

  let last = 0;
  let m: RegExpExecArray | null;

  while ((m = reDisplay.exec(text))) {
    if (m.index > last) {
      out.push({ type: "text", value: text.slice(last, m.index) });
    }
    out.push({ type: "math", value: m[1].trim(), display: true });
    last = m.index + m[0].length;
  }
  const rest = text.slice(last);
  last = 0;
  while ((m = reInline.exec(rest))) {
    const body = m[1].trim();
    // Skip "math" yang kepanjangan / mirip kode
    if (!body || body.length > 200 || /\\(?:begin|usepackage|hline|textbf)/.test(body)) {
      continue;
    }
    if (m.index > last) {
      out.push({ type: "text", value: rest.slice(last, m.index) });
    }
    out.push({ type: "math", value: body, display: false });
    last = m.index + m[0].length;
  }
  if (last < rest.length) {
    out.push({ type: "text", value: rest.slice(last) });
  }
}

// ---------------------------------------------------------------------------

function NativeTable({ header, rows }: { header: string[]; rows: string[][] }) {
  const { c } = useTheme();
  return (
    <View style={[stylesTable.wrap, { borderColor: c.border }]}>
      <ScrollView
        horizontal
        nestedScrollEnabled
        showsHorizontalScrollIndicator
        keyboardShouldPersistTaps="handled"
      >
        <View>
          <View style={[stylesTable.row, { backgroundColor: c.panel }]}>
            {header.map((h, i) => (
              <View key={i} style={[stylesTable.cell, { borderColor: c.border, backgroundColor: c.panel }]}>
                <Text style={[stylesTable.thText, { color: c.text }]} numberOfLines={4}>
                  {h.replace(/\*\*|__/g, "")}
                </Text>
              </View>
            ))}
          </View>
          {rows.map((row, ri) => (
            <View key={ri} style={[stylesTable.row, { borderBottomColor: c.border }]}>
              {row.map((cell, ci) => (
                <View key={ci} style={[stylesTable.cell, { borderColor: c.border }]}>
                  <Text style={[stylesTable.tdText, { color: c.text }]} numberOfLines={6}>
                    {cell.replace(/\*\*|__/g, "")}
                  </Text>
                </View>
              ))}
            </View>
          ))}
        </View>
      </ScrollView>
      <View style={[stylesTable.hintBar, { borderTopColor: c.border }]}>
        <Text style={[stylesTable.hint, { color: c.muted }]}>← geser tabel →</Text>
      </View>
    </View>
  );
}

/** Renderer markdown + tabel native + code + LaTeX. */
export function MarkdownRenderer({ body, tint }: { body: string; tint?: string }) {
  const { c } = useTheme();
  const fg = tint ?? c.text;
  const segments = parseSegments(body);

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
      if (LATEX_LANGS.has(lang) && isKaTeXMath(code)) {
        return <MathView key={key} tex={code.trim()} display />;
      }
      return <HighlightedCode key={key} code={code} />;
    },
  };

  return (
    <View>
      {segments.map((seg, i) => {
        if (seg.type === "math") {
          return <MathView key={`m${i}`} tex={seg.value} display={seg.display} />;
        }
        if (seg.type === "code") {
          if (LATEX_LANGS.has(seg.lang) && isKaTeXMath(seg.value)) {
            return <MathView key={`c${i}`} tex={seg.value.trim()} display />;
          }
          return <HighlightedCode key={`c${i}`} code={seg.value} />;
        }
        if (seg.type === "table") {
          return <NativeTable key={`tb${i}`} header={seg.header} rows={seg.rows} />;
        }
        if (!seg.value.trim()) {
          return null;
        }
        return (
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
        );
      })}
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
  },
  row: {
    flexDirection: "row",
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  cell: {
    minWidth: 140,
    maxWidth: 220,
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
