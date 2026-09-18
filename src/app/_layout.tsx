import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useFonts } from "expo-font";
import {
  IBMPlexSans_400Regular,
  IBMPlexSans_500Medium,
  IBMPlexSans_600SemiBold,
  IBMPlexSans_700Bold,
} from "@expo-google-fonts/ibm-plex-sans";
import {
  IBMPlexMono_400Regular,
  IBMPlexMono_500Medium,
  IBMPlexMono_600SemiBold,
} from "@expo-google-fonts/ibm-plex-mono";
import { useEffect } from "react";
import { Platform, useWindowDimensions, View } from "react-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { KeyboardProvider } from "react-native-keyboard-controller";
import * as SystemUI from "expo-system-ui";
import { I18nProvider } from "../i18n";
import { frameHost } from "../components/FrameModal.shared";
import { StoreProvider, useStore } from "../store";
import { ThemeProvider, useTheme } from "../theme";
import { applyLumenFonts } from "../fonts";

function ThemedRoot() {
  const { c } = useTheme();
  const { ready, settings } = useStore();
  const [fontsLoaded, fontError] = useFonts({
    IBMPlexSans_400Regular,
    IBMPlexSans_500Medium,
    IBMPlexSans_600SemiBold,
    IBMPlexSans_700Bold,
    IBMPlexMono_400Regular,
    IBMPlexMono_500Medium,
    IBMPlexMono_600SemiBold,
  });

  useEffect(() => {
    if (fontsLoaded || fontError) {
      applyLumenFonts();
    }
  }, [fontsLoaded, fontError]);

  // Match the system UI background so no white bars appear above or below the app.
  useEffect(() => {
    SystemUI.setBackgroundColorAsync(c.bg).catch(() => {});
  }, [c.bg]);

  if (!ready || (!fontsLoaded && !fontError)) {
    return <View style={{ flex: 1, backgroundColor: c.bg }} />;
  }
  return (
    <View style={{ flex: 1, backgroundColor: c.bg }}>
      <StatusBar style={settings.theme === "dark" ? "light" : "dark"} />
      <Stack screenOptions={{ headerShown: false, animation: "fade" }} />
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

/**
 * Web-only: hold the app inside a phone-sized bezel so a laptop preview reads
 * like the device. The bezel is deliberately inert (tinted to the dark
 * substrate) so it never competes with the interface inside it.
 */
function WebPhoneStage({ children }: { children: React.ReactNode }) {
  const { width, height } = useWindowDimensions();
  const frameW = Math.min(390, Math.max(320, width - 48));
  const frameH = Math.min(844, Math.max(480, height - 48));
  return (
    <View style={webStage.outer}>
      <View
        ref={(node) => {
          frameHost.node = node as unknown as HTMLElement | null;
        }}
        style={[webStage.phone, { width: frameW, height: frameH }]}
      >
        {children}
      </View>
    </View>
  );
}

const webStage = {
  outer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "transparent",
  },
  phone: {
    borderWidth: 1,
    borderColor: "#2A2620",
    backgroundColor: "#12110D",
    overflow: "hidden",
    boxShadow: "0 24px 60px rgba(0,0,0,0.55)",
  },
} as const;

export default function RootLayout() {
  const app = (
    <SafeAreaProvider>
      <KeyboardProvider>
        <StoreProvider>
          <Root />
        </StoreProvider>
      </KeyboardProvider>
    </SafeAreaProvider>
  );
  return (
    <GestureHandlerRootView style={{ flex: 1, backgroundColor: "#080704" }}>
      {Platform.OS === "web" ? <WebPhoneStage>{app}</WebPhoneStage> : app}
    </GestureHandlerRootView>
  );
}
