import { useMemo, useState } from "react";
import { ActivityIndicator, StyleSheet, View, useWindowDimensions } from "react-native";
import { WebView } from "react-native-webview";
import { useTheme } from "../theme";

/** Render LaTeX pakai KaTeX di WebView (inline atau display). */
export function MathView({
  tex,
  display,
}: {
  tex: string;
  display?: boolean;
}) {
  const { c } = useTheme();
  const { width } = useWindowDimensions();
  const [h, setH] = useState(display ? 56 : 32);
  const [ready, setReady] = useState(false);

  const html = useMemo(() => {
    const escaped = tex
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;");
    const mode = display ? "true" : "false";
    const textColor = c.text;
    return `<!DOCTYPE html>
<html>
<head>
<meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1" />
<link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/katex@0.16.11/dist/katex.min.css" />
<style>
  html,body{margin:0;padding:8px 4px;background:transparent;color:${textColor};
    font-family: system-ui, -apple-system, sans-serif;}
  .err{color:#f87171;font-size:12px;white-space:pre-wrap;}
</style>
<script src="https://cdn.jsdelivr.net/npm/katex@0.16.11/dist/katex.min.js"></script>
</head>
<body>
<div id="out"></div>
<script>
try {
  katex.render(${JSON.stringify(tex)}, document.getElementById('out'), {
    throwOnError: false,
    displayMode: ${mode},
    output: 'html'
  });
} catch (e) {
  document.getElementById('out').innerHTML = '<div class="err">' + (e && e.message ? e.message : 'LaTeX error') + '</div>';
}
window.ReactNativeWebView && window.ReactNativeWebView.postMessage(String(Math.ceil(document.body.scrollHeight)));
</script>
</body>
</html>`;
  }, [tex, display, c.text]);

  return (
    <View style={[styles.wrap, { borderColor: c.border }]}>
      {!ready ? (
        <View style={styles.loading}>
          <ActivityIndicator size="small" color={c.muted} />
        </View>
      ) : null}
      <WebView
        originWhitelist={["*"]}
        source={{ html }}
        style={{
          width: "100%",
          height: h,
          backgroundColor: "transparent",
          opacity: ready ? 1 : 0,
        }}
        scrollEnabled={false}
        onLoadEnd={() => setReady(true)}
        onMessage={(e) => {
          const n = Number(e.nativeEvent.data);
          if (Number.isFinite(n) && n > 0) {
            setH(Math.min(Math.max(n + 8, display ? 48 : 28), 420));
          }
        }}
      />
      {/* padding bawah ekstra utk descender KaTeX */}
      <View style={{ height: 4, backgroundColor: "transparent" }} />
      <View style={{ width, height: 0 }} />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    marginVertical: 4,
    borderRadius: 8,
    overflow: "hidden",
  },
  loading: {
    position: "absolute",
    left: 0,
    right: 0,
    top: 0,
    bottom: 0,
    alignItems: "center",
    justifyContent: "center",
  },
});
