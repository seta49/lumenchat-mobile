import { useRouter } from "expo-router";
import { SettingsOverlay } from "../components/SettingsOverlay";

/**
 * The settings route renders the same surface the chat header opens, so a
 * deep link and the in-app panel can never drift apart again.
 */
export default function Settings() {
  const router = useRouter();
  return (
    <SettingsOverlay
      visible
      onClose={() => {
        if (router.canGoBack()) {
          router.back();
        } else {
          router.replace("/");
        }
      }}
    />
  );
}
