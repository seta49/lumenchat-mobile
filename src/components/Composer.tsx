import { Ionicons } from "@expo/vector-icons";
import { Image } from "expo-image";
import { useState } from "react";
import { Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { useI18n } from "../i18n";
import { useStore } from "../store";
import { useTheme } from "../theme";
import { getActiveProvider, getProvider } from "../services/providers";
import { pickAndCompressImage } from "../utils/image";
import type { ContentPart, ThinkingLevel } from "../types/chat";
import { Sheet } from "./Sheet";

const THINK_LEVELS: ThinkingLevel[] = ["off", "low", "medium", "high", "max"];
const THINK_LABELS: Record<ThinkingLevel, "chat.thinkingOff" | "chat.thinkingLow" | "chat.thinkingMedium" | "chat.thinkingHigh" | "chat.thinkingMax"> = {
  off: "chat.thinkingOff",
  low: "chat.thinkingLow",
  medium: "chat.thinkingMedium",
  high: "chat.thinkingHigh",
  max: "chat.thinkingMax",
};

export function Composer() {
  const { settings, streamingId, send, stop, setThinking, setModel } = useStore();
  const provider = getActiveProvider(settings);
  const { t } = useI18n();
  const { c } = useTheme();
  const [text, setText] = useState("");
  const [images, setImages] = useState<ContentPart[]>([]);
  const [modelSheet, setModelSheet] = useState(false);
  const [customModel, setCustomModel] = useState("");

  const streaming = streamingId !== null;
  const canSend = text.trim().length > 0 || images.length > 0;

  const attach = async () => {
    try {
      const part = await pickAndCompressImage();
      if (part) {
        setImages((im) => [...im, part]);
      }
    } catch {
      // user cancel / permission denied — diam saja
    }
  };

  const onSend = () => {
    if (!canSend || streaming) {
      return;
    }
    const msg = text;
    const imgs = images;
    setText("");
    setImages([]);
    void send(msg, imgs);
  };

  const currentLevel = provider.thinking ?? "off";
  const nextLevel = THINK_LEVELS[(THINK_LEVELS.indexOf(currentLevel) + 1) % THINK_LEVELS.length];
  const thinkingOn = currentLevel !== "off";

  const templateModels = getProvider(provider.kind).models;
  const applyModel = (model: string) => {
    const clean = model.trim();
    if (clean) {
      setModel(clean);
    }
    setModelSheet(false);
  };

  return (
    <View style={[styles.wrap, { backgroundColor: c.surface, borderTopColor: c.border }]}>
      {images.length > 0 ? (
        <View style={styles.thumbRow}>
          {images.map((part, i) => (
            <View key={i} style={styles.thumb}>
              <Image
                source={{ uri: part.image_url?.url }}
                style={styles.thumbImage}
                contentFit="cover"
              />
              <Pressable
                onPress={() => setImages((im) => im.filter((_, j) => j !== i))}
                style={[styles.thumbRemove, { backgroundColor: c.danger }]}
                hitSlop={6}
              >
                <Ionicons name="close" size={12} color="#ffffff" />
              </Pressable>
            </View>
          ))}
        </View>
      ) : null}

      <View style={styles.inputRow}>
        <Pressable onPress={attach} hitSlop={8} style={styles.iconBtn}>
          <Ionicons name="image-outline" size={22} color={c.muted} />
        </Pressable>
        <TextInput
          value={text}
          onChangeText={setText}
          placeholder={t("chat.placeholder")}
          placeholderTextColor={c.muted}
          multiline
          style={[
            styles.input,
            { color: c.text, backgroundColor: c.input, borderColor: c.border },
          ]}
        />
        {streaming ? (
          <Pressable onPress={stop} style={[styles.sendBtn, { backgroundColor: c.danger }]}>
            <Ionicons name="stop" size={18} color="#ffffff" />
          </Pressable>
        ) : (
          <Pressable
            onPress={onSend}
            disabled={!canSend}
            style={[styles.sendBtn, { backgroundColor: canSend ? c.accent : c.border }]}
          >
            <Ionicons name="arrow-up" size={18} color={canSend ? c.onAccent : c.muted} />
          </Pressable>
        )}
      </View>

      <View style={styles.toolbar}>
        <Pressable
          onPress={() => setThinking(nextLevel)}
          style={[
            styles.chip,
            {
              borderColor: thinkingOn ? c.accent : c.border,
              backgroundColor: thinkingOn ? c.accent + "1f" : "transparent",
            },
          ]}
        >
          <Ionicons
            name="sparkles-outline"
            size={13}
            color={thinkingOn ? c.accent : c.muted}
          />
          <Text style={{ fontSize: 12, color: thinkingOn ? c.accent : c.muted }}>
            {t(THINK_LABELS[currentLevel])}
          </Text>
        </Pressable>
        <Pressable onPress={() => setModelSheet(true)} style={[styles.chip, { borderColor: c.border }]}>
          <Ionicons name="layers-outline" size={13} color={c.muted} />
          <Text style={{ fontSize: 12, color: c.muted, maxWidth: 150 }} numberOfLines={1}>
            {provider.model || "model"}
          </Text>
          <Ionicons name="chevron-down" size={12} color={c.muted} />
        </Pressable>
        <View style={{ flex: 1 }} />
        <Text style={{ fontSize: 11, color: c.muted }} numberOfLines={1}>
          {provider.name}
        </Text>
      </View>

      <Sheet visible={modelSheet} onClose={() => setModelSheet(false)} title={t("chat.model")}>
        {templateModels.map((m) => (
          <Pressable
            key={m}
            onPress={() => applyModel(m)}
            style={[
              styles.modelRow,
              { backgroundColor: provider.model === m ? c.accent + "1f" : "transparent" },
            ]}
          >
            <Text style={{ color: provider.model === m ? c.accent : c.text, fontSize: 14 }}>
              {m}
            </Text>
            {provider.model === m ? (
              <Ionicons name="checkmark-circle" size={16} color={c.accent} />
            ) : null}
          </Pressable>
        ))}
        <View style={styles.customRow}>
          <TextInput
            value={customModel}
            onChangeText={setCustomModel}
            placeholder={t("settings.modelPlaceholder")}
            placeholderTextColor={c.muted}
            style={[
              styles.customInput,
              { color: c.text, backgroundColor: c.input, borderColor: c.border },
            ]}
          />
          <Pressable
            onPress={() => applyModel(customModel)}
            style={[styles.customSave, { backgroundColor: c.accent }]}
          >
            <Text style={{ color: c.onAccent, fontSize: 13, fontWeight: "600" }}>
              {t("common.save")}
            </Text>
          </Pressable>
        </View>
      </Sheet>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    borderTopWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: 12,
    paddingTop: 8,
    paddingBottom: 4,
  },
  thumbRow: {
    flexDirection: "row",
    gap: 8,
    marginBottom: 8,
    flexWrap: "wrap",
  },
  thumb: { position: "relative" },
  thumbImage: { width: 56, height: 56, borderRadius: 10 },
  thumbRemove: {
    position: "absolute",
    top: -6,
    right: -6,
    borderRadius: 10,
    padding: 2,
  },
  inputRow: {
    flexDirection: "row",
    alignItems: "flex-end",
    gap: 6,
  },
  iconBtn: { padding: 8 },
  input: {
    flex: 1,
    borderRadius: 18,
    paddingHorizontal: 14,
    paddingTop: 9,
    paddingBottom: 9,
    maxHeight: 110,
    fontSize: 15,
    borderWidth: StyleSheet.hairlineWidth,
  },
  sendBtn: {
    padding: 10,
    borderRadius: 22,
  },
  toolbar: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 6,
    gap: 8,
  },
  chip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingVertical: 3,
    paddingHorizontal: 8,
    borderRadius: 12,
    borderWidth: 1,
  },
  modelRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 12,
    marginBottom: 2,
  },
  customRow: {
    flexDirection: "row",
    gap: 8,
    marginTop: 12,
  },
  customInput: {
    flex: 1,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 9,
    fontSize: 14,
    borderWidth: StyleSheet.hairlineWidth,
  },
  customSave: {
    borderRadius: 12,
    paddingHorizontal: 14,
    justifyContent: "center",
  },
});