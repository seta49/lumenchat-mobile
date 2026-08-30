import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { View } from "react-native";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { I18nProvider } from "../i18n";
import { StoreProvider, useStore } from "../store";
import { ThemeProvider, useTheme } from "../theme";

function ThemedRoot() {
  const { c } = useTheme();
  const { ready, settings } = useStore();
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
      <ThemeProvider theme={settings.theme}>
        <ThemedRoot />
      </ThemeProvider>
    </I18nProvider>
  );
}

export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <StoreProvider>
        <Root />
      </StoreProvider>
    </SafeAreaProvider>
  );
}