import { useMemo, useState } from "react";
import { ActivityIndicator, StyleSheet, Text, View } from "react-native";
import { WebView } from "react-native-webview";
import { useTheme } from "../theme";

/** Render LaTeX pakai KaTeX di WebView. Kalau gagal → tampilkan code block biasa. */
export function MathView({ tex, display }: { tex: string; display?: boolean }) {
  const { c } = useTheme();
  const [h, setH] = useState(display ? 56 : 32);
  const [ready, setReady] = useState(false);
  const [failed, setFailed] = useState(false);

  const html = useMemo(() => {
    const mode = display ? "true" : "false";
    return `<!DOCTYPE html>
<html>
<head>
<meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1" />
<link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/katex@0.16.11/dist/katex.min.css" />
<style>
  html,body{margin:0;padding:8px 4px;background:transparent;color:${c.text};
    font-family: system-ui, -apple-system, sans-serif;}
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
  if (document.querySelector('.katex-error')) {
    window.ReactNativeWebView && window.ReactNativeWebView.postMessage('ERROR');
  } else {
    window.ReactNativeWebView && window.ReactNativeWebView.postMessage('H:' + Math.ceil(document.body.scrollHeight));
  }
} catch (e) {
  window.ReactNativeWebView && window.ReactNativeWebView.postMessage('ERROR');
}
</script>
</body>
</html>`;
  }, [tex, display, c.text]);

  if (failed) {
    return (
      <View style={[styles.code, { backgroundColor: c.codeBg, borderColor: c.border }]}>
        <Text style={[styles.codeText, { color: c.muted }]} selectable>
          {tex}
        </Text>
      </View>
    );
  }

  return (
    <View style={styles.wrap}>
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
          const data = String(e.nativeEvent.data ?? "");
          if (data === "ERROR") {
            setFailed(true);
            return;
          }
          if (data.startsWith("H:")) {
            const n = Number(data.slice(2));
            if (Number.isFinite(n) && n > 0) {
              setH(Math.min(Math.max(n + 8, display ? 48 : 28), 420));
            }
          }
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { marginVertical: 4 },
  loading: {
    position: "absolute",
    left: 0,
    right: 0,
    top: 0,
    bottom: 0,
    alignItems: "center",
    justifyContent: "center",
  },
  code: {
    marginVertical: 6,
    borderRadius: 10,
    borderWidth: StyleSheet.hairlineWidth,
    padding: 12,
  },
  codeText: {
    fontFamily: "monospace",
    fontSize: 13,
    lineHeight: 18,
  },
});
