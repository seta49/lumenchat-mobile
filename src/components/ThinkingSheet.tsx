import { Ionicons } from "@expo/vector-icons";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { useI18n } from "../i18n";
import { getActiveProvider } from "../services/providers";
import { useStore } from "../store";
import { useTheme } from "../theme";
import type { ThinkingLevel } from "../types/chat";
import { Sheet } from "./Sheet";

const LEVELS: ThinkingLevel[] = ["off", "low", "medium", "high", "max"];
const KEYS: Record<ThinkingLevel, "chat.thinkingOff" | "chat.thinkingLow" | "chat.thinkingMedium" | "chat.thinkingHigh" | "chat.thinkingMax"> = {
  off: "chat.thinkingOff",
  low: "chat.thinkingLow",
  medium: "chat.thinkingMedium",
  high: "chat.thinkingHigh",
  max: "chat.thinkingMax",
};
const BLURBS: Record<ThinkingLevel, "model.blurb.flash" | "model.blurb.deep" | null> = {
  off: null,
  low: "model.blurb.flash",
  medium: "model.blurb.flash",
  high: "model.blurb.deep",
  max: "model.blurb.deep",
};

/** Popup pilih tingkat reasoning — menggantikan ikon toggle lama. */
export function ThinkingSheet({ visible, onClose }: { visible: boolean; onClose: () => void }) {
  const { settings, setThinking } = useStore();
  const { c } = useTheme();
  const { t } = useI18n();
  const provider = getActiveProvider(settings);
  const current = provider.thinking ?? "off";

  return (
    <Sheet visible={visible} title={t("model.reasoning")} onClose={onClose}>
      {LEVELS.map((level) => {
        const selected = current === level;
        return (
          <Pressable
            key={level}
            onPress={() => {
              setThinking(level);
              onClose();
            }}
            style={[styles.row, selected && { backgroundColor: c.panel }]}
          >
            <View style={{ flex: 1 }}>
              <Text style={[styles.level, { color: selected ? c.accent : c.text }]}>
                {t(KEYS[level])}
              </Text>
              {BLURBS[level] ? (
                <Text style={[styles.sub, { color: c.muted }]}>{t(BLURBS[level]!)}</Text>
              ) : null}
            </View>
            {selected ? <Ionicons name="checkmark" size={18} color={c.accent} /> : null}
          </Pressable>
        );
      })}
    </Sheet>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingVertical: 11,
    paddingHorizontal: 10,
    borderRadius: 14,
  },
  level: { fontSize: 15, fontWeight: "600" },
  sub: { fontSize: 12, marginTop: 2 },
});
