import { Ionicons } from "@expo/vector-icons";
import { useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { useI18n } from "../i18n";
import { getActiveProvider, getProvider, resolveModelInfo } from "../services/providers";
import { useStore } from "../store";
import { useTheme } from "../theme";
import type { ThinkingLevel } from "../types/chat";
import { Sheet } from "./Sheet";

const THINK_LEVELS: ThinkingLevel[] = ["off", "low", "medium", "high", "max"];
const THINK_KEYS: Record<ThinkingLevel, "chat.thinkingOff" | "chat.thinkingLow" | "chat.thinkingMedium" | "chat.thinkingHigh" | "chat.thinkingMax"> = {
  off: "chat.thinkingOff",
  low: "chat.thinkingLow",
  medium: "chat.thinkingMedium",
  high: "chat.thinkingHigh",
  max: "chat.thinkingMax",
};

/** Dropdown pemilih model ala Gemini: daftar model + subtitle blurb +
 * separator + baris Penalaran (cycle thinking level) + custom model. */
export function ModelSheet({
  visible,
  onClose,
}: {
  visible: boolean;
  onClose: () => void;
  thinkingOn?: boolean;
}) {
  const { settings, setModel, setThinking } = useStore();
  const { c } = useTheme();
  const { t } = useI18n();
  const [custom, setCustom] = useState("");

  const provider = getActiveProvider(settings);
  const template = getProvider(provider.kind);
  const currentLevel = provider.thinking ?? "off";
  const nextLevel = THINK_LEVELS[(THINK_LEVELS.indexOf(currentLevel) + 1) % THINK_LEVELS.length];

  const pick = (model: string) => {
    const clean = model.trim();
    if (clean) setModel(clean);
    setCustom("");
    onClose();
  };

  return (
    <Sheet visible={visible} title={t("chat.model")} onClose={onClose}>
      <ScrollView style={styles.list} showsVerticalScrollIndicator={false}>
        {template.models.length === 0 ? (
          <Text style={{ color: c.muted, fontSize: 13, marginBottom: 8 }}>
            {t("settings.modelPlaceholder")}
          </Text>
        ) : null}
        {template.models.map((m) => {
          const { label, blurbKey } = resolveModelInfo(provider.kind, m);
          const selected = provider.model === m;
          return (
            <Pressable
              key={m}
              onPress={() => pick(m)}
              style={[styles.row, selected && { backgroundColor: c.panel }]}
            >
              <View style={{ flex: 1 }}>
                <Text style={[styles.rowTitle, { color: c.text }]}>{label}</Text>
                <Text style={[styles.rowSub, { color: c.muted }]}>
                  {blurbKey ? t(blurbKey as never) : m}
                </Text>
              </View>
              {selected ? <Ionicons name="checkmark" size={18} color={c.accent} /> : null}
            </Pressable>
          );
        })}

        <View style={[styles.divider, { backgroundColor: c.border }]} />

        <Pressable
          onPress={() => setThinking(nextLevel)}
          style={styles.row}
        >
          <View style={styles.reasonIcon}>
            <Ionicons name="sparkles" size={15} color={currentLevel !== "off" ? c.accent : c.muted} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={[styles.rowTitle, { color: c.text }]}>{t("model.reasoning")}</Text>
            <Text style={[styles.rowSub, { color: c.muted }]}>{t(THINK_KEYS[currentLevel])}</Text>
          </View>
          <Text style={{ fontSize: 12, color: c.muted }}>›</Text>
        </Pressable>

        <View style={[styles.divider, { backgroundColor: c.border }]} />

        <View style={styles.customRow}>
          <TextInput
            value={custom}
            onChangeText={setCustom}
            placeholder={t("settings.modelPlaceholder")}
            placeholderTextColor={c.muted}
            style={[styles.customInput, { color: c.text, backgroundColor: c.input, borderColor: c.border }]}
          />
          <Pressable
            onPress={() => pick(custom)}
            style={[styles.customSave, { backgroundColor: c.accent }]}
          >
            <Text style={{ color: c.onAccent, fontSize: 13, fontWeight: "600" }}>{t("common.save")}</Text>
          </Pressable>
        </View>
      </ScrollView>
    </Sheet>
  );
}

const styles = StyleSheet.create({
  list: { maxHeight: 380 },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingVertical: 10,
    paddingHorizontal: 10,
    borderRadius: 14,
  },
  rowTitle: { fontSize: 15, fontWeight: "600" },
  rowSub: { fontSize: 12, marginTop: 2 },
  reasonIcon: {
    width: 30,
    height: 30,
    borderRadius: 15,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: "transparent",
    alignItems: "center",
    justifyContent: "center",
  },
  divider: { height: StyleSheet.hairlineWidth, marginVertical: 8 },
  customRow: { flexDirection: "row", gap: 8, marginTop: 4, marginBottom: 8 },
  customInput: {
    flex: 1,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 9,
    fontSize: 14,
    borderWidth: StyleSheet.hairlineWidth,
  },
  customSave: { borderRadius: 12, paddingHorizontal: 14, justifyContent: "center" },
});
