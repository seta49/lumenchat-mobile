import { Ionicons } from "@expo/vector-icons";
import { Image } from "expo-image";
import { useState } from "react";
import { Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useI18n } from "../i18n";
import { useStore } from "../store";
import { useTheme } from "../theme";
import { getActiveProvider } from "../services/providers";
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

/** Composer v2: satu pill rounded-full melayang — [attach][input][send],
 * plus mini-toolbar thinking di dalam pill (model pindah ke header). */
export function Composer() {
  const { settings, streamingId, send, stop, setThinking } = useStore();
  const provider = getActiveProvider(settings);
  const { t } = useI18n();
  const { c } = useTheme();
  const insets = useSafeAreaInsets();
  const [text, setText] = useState("");
  const [images, setImages] = useState<ContentPart[]>([]);
  const [toolsOpen, setToolsOpen] = useState(false);

  const streaming = streamingId !== null;
  const canSend = text.trim().length > 0 || images.length > 0;

  const attach = async () => {
    setToolsOpen(false);
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

  return (
    <View style={[styles.wrap, { paddingBottom: Math.max(insets.bottom, 10) }]}>
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

      <View style={[styles.pill, { backgroundColor: c.panel, borderColor: c.border }]}>
        <Pressable onPress={() => setToolsOpen(true)} hitSlop={8} style={styles.iconBtn}>
          <Ionicons name="add" size={24} color={c.text} />
        </Pressable>

        <TextInput
          value={text}
          onChangeText={setText}
          placeholder={t("chat.askLumen")}
          placeholderTextColor={c.muted}
          multiline
          style={[styles.input, { color: c.text }]}
        />

        <Pressable
          onPress={() => setThinking(nextLevel)}
          style={[styles.thinkBtn, thinkingOn && { backgroundColor: c.accent + "26" }]}
          hitSlop={6}
        >
          <Ionicons
            name="sparkles-outline"
            size={17}
            color={thinkingOn ? c.accent : c.muted}
          />
        </Pressable>

        {streaming ? (
          <Pressable onPress={stop} style={[styles.sendBtn, { backgroundColor: c.danger }]}>
            <Ionicons name="stop" size={18} color="#ffffff" />
          </Pressable>
        ) : (
          <Pressable
            onPress={onSend}
            disabled={!canSend}
            style={[styles.sendBtn, { backgroundColor: canSend ? c.accent : c.input }]}
          >
            <Ionicons name="arrow-up" size={19} color={canSend ? c.onAccent : c.muted} />
          </Pressable>
        )}
      </View>

      {/* Sheet "tools" ala Gemini: grid aksi singkat di sekitar input. */}
      <Sheet visible={toolsOpen} title={t("chat.attachImage")} onClose={() => setToolsOpen(false)}>
        <Pressable onPress={attach} style={[styles.toolRow, { borderColor: c.border }]}>
          <Ionicons name="images-outline" size={20} color={c.text} />
          <Text style={{ color: c.text, fontSize: 14 }}>{t("chat.attachImage")}</Text>
        </Pressable>
        <View style={[styles.toolRow, { borderColor: c.border, opacity: 0.45 }]}>
          <Ionicons name="mic-outline" size={20} color={c.text} />
          <Text style={{ color: c.muted, fontSize: 14 }}>
            {t("message.readAloud")} — soon
          </Text>
        </View>
      </Sheet>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    paddingHorizontal: 10,
    paddingTop: 6,
  },
  thumbRow: {
    flexDirection: "row",
    gap: 8,
    marginBottom: 8,
    flexWrap: "wrap",
    paddingHorizontal: 4,
  },
  thumb: { position: "relative" },
  thumbImage: { width: 56, height: 56, borderRadius: 12 },
  thumbRemove: {
    position: "absolute",
    top: -6,
    right: -6,
    borderRadius: 10,
    padding: 2,
  },
  pill: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 28,
    borderWidth: 1,
    paddingLeft: 6,
    paddingRight: 6,
    paddingVertical: 4,
    gap: 2,
  },
  iconBtn: { padding: 8 },
  input: {
    flex: 1,
    maxHeight: 96,
    fontSize: 16,
    paddingVertical: 8,
  },
  thinkBtn: {
    padding: 7,
    borderRadius: 16,
  },
  sendBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
  },
  toolRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingVertical: 12,
    paddingHorizontal: 4,
  },
});
