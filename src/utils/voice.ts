import { useEffect, useRef, useState } from "react";
import { Alert, Platform } from "react-native";
import Constants from "expo-constants";

/** Cek apakah native module speech tersedia tanpa require yang bisa throw. */
function isSpeechAvailable(): boolean {
  if (Platform.OS === "web") return false;
  // Expo Go tidak bawa native module ini — jangan require sama sekali.
  const env = Constants.executionEnvironment;
  if (env === "storeClient") return false;
  return true;
}

/** Voice input optional. Di Expo Go: available=false, gak require module. */
export function useOptionalVoice(
  onTranscript: (text: string) => void,
  unavailableMsg: string,
) {
  const [listening, setListening] = useState(false);
  const available = isSpeechAvailable();
  const transcriptRef = useRef(onTranscript);
  transcriptRef.current = onTranscript;

  const toggle = async () => {
    if (!available) {
      Alert.alert(unavailableMsg);
      return;
    }
    try {
      // Lazy require hanya di dev build / production (bukan Expo Go)
      const mod = require("expo-speech-recognition");
      const M = mod?.ExpoSpeechRecognitionModule;
      if (!M?.start) {
        Alert.alert(unavailableMsg);
        return;
      }
      if (listening) {
        M.stop();
        setListening(false);
        return;
      }
      const perm = await M.requestPermissionsAsync();
      if (!perm.granted) {
        Alert.alert(unavailableMsg);
        return;
      }
      setListening(true);
      M.start({ lang: "id-ID", interimResults: false, maxAlternatives: 1 });
    } catch {
      setListening(false);
      Alert.alert(unavailableMsg);
    }
  };

  useEffect(() => {
    return () => {
      if (!available) return;
      try {
        const mod = require("expo-speech-recognition");
        mod?.ExpoSpeechRecognitionModule?.stop?.();
      } catch {
        // ignore
      }
    };
  }, [available]);

  return { available, listening, toggle };
}
