import { Ionicons } from "@expo/vector-icons";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { useI18n } from "../i18n";
import { getActiveProvider } from "../services/providers";
import { useStore } from "../store";
import { useTheme } from "../theme";
import { Sheet } from "./Sheet";

/** Thinking: cuma On / Off. On = level max model. */
export function ThinkingSheet({ visible, onClose }: { visible: boolean; onClose: () => void }) {
  const { settings, setThinking } = useStore();
  const { c } = useTheme();
  const { t } = useI18n();
  const provider = getActiveProvider(settings);
  const on = (provider.thinking ?? "off") !== "off";

  const options = [
    {
      key: "off" as const,
      label: t("chat.thinkingOff"),
      blurb: t("chat.thinkingOffHint"),
    },
    {
      key: "max" as const,
      label: t("chat.thinkingOn"),
      blurb: t("chat.thinkingOnHint"),
    },
  ];

  return (
    <Sheet visible={visible} title={t("model.reasoning")} onClose={onClose}>
      {options.map((opt) => {
        const selected = opt.key === "max" ? on : !on;
        return (
          <Pressable
            key={opt.key}
            onPress={() => {
              setThinking(opt.key);
              onClose();
            }}
            style={[styles.row, selected && { backgroundColor: c.panel }]}
          >
            <View style={{ flex: 1 }}>
              <Text style={[styles.level, { color: selected ? c.accent : c.text }]}>
                {opt.label}
              </Text>
              <Text style={[styles.sub, { color: c.muted }]}>{opt.blurb}</Text>
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
