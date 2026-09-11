import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useFonts } from "expo-font";
import {
  Sora_400Regular,
  Sora_500Medium,
  Sora_600SemiBold,
  Sora_700Bold,
  Sora_800ExtraBold,
} from "@expo-google-fonts/sora";
import {
  JetBrainsMono_400Regular,
  JetBrainsMono_500Medium,
  JetBrainsMono_700Bold,
} from "@expo-google-fonts/jetbrains-mono";
import { useEffect } from "react";
import { View } from "react-native";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { KeyboardProvider } from "react-native-keyboard-controller";
import { I18nProvider } from "../i18n";
import { StoreProvider, useStore } from "../store";
import { ThemeProvider, useTheme } from "../theme";
import { applyLumenFonts } from "../fonts";

function ThemedRoot() {
  const { c } = useTheme();
  const { ready, settings } = useStore();
  const [fontsLoaded, fontError] = useFonts({
    Sora_400Regular,
    Sora_500Medium,
    Sora_600SemiBold,
    Sora_700Bold,
    Sora_800ExtraBold,
    JetBrainsMono_400Regular,
    JetBrainsMono_500Medium,
    JetBrainsMono_700Bold,
  });

  useEffect(() => {
    if (fontsLoaded || fontError) {
      applyLumenFonts();
    }
  }, [fontsLoaded, fontError]);

  if (!ready || (!fontsLoaded && !fontError)) {
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
    <SafeAreaProvider>
      <KeyboardProvider>
        <StoreProvider>
          <Root />
        </StoreProvider>
      </KeyboardProvider>
    </SafeAreaProvider>
  );
}
