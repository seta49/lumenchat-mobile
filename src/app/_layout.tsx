import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import * as SystemUI from "expo-system-ui";
import { useEffect } from "react";
import { StyleSheet, View } from "react-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { KeyboardProvider } from "react-native-keyboard-controller";
import { I18nProvider } from "../i18n";
import { StoreProvider, useStore } from "../store";
import { ThemeProvider, useTheme } from "../theme";

function ThemedRoot() {
  const { c } = useTheme();
  const { ready, settings } = useStore();

  // Warna window background = warna tema (hilangkan gap putih status/nav bar)
  useEffect(() => {
    void SystemUI.setBackgroundColorAsync(c.bg);
  }, [c.bg]);

  if (!ready) {
    return <View style={{ flex: 1, backgroundColor: c.bg }} />;
  }
  return (
    <View style={{ flex: 1, backgroundColor: c.bg }}>
      <StatusBar style={settings.theme === "dark" ? "light" : "dark"} />
      <Stack screenOptions={{ headerShown: false }} />
    </View>
  );
}

function Root() {
  const { ready, settings, updateSettings } = useStore();
  if (!ready) {
    return null;
  }
  return (
    <I18nProvider
      lang={settings.language}
      onLangChange={(lang) => updateSettings({ language: lang })}
    >
      <ThemeProvider theme={settings.theme} accent={settings.accent}>
        <ThemedRoot />
      </ThemeProvider>
    </I18nProvider>
  );
}

export default function RootLayout() {
  return (
    <GestureHandlerRootView style={styles.flex}>
      <SafeAreaProvider>
        <KeyboardProvider>
          <StoreProvider>
            <Root />
          </StoreProvider>
        </KeyboardProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
});