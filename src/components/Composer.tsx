import { Ionicons } from "@expo/vector-icons";
import * as DocumentPicker from "expo-document-picker";
import { Image } from "expo-image";
import { File } from "expo-file-system";
import { useEffect, useState } from "react";
import { Keyboard, Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useI18n } from "../i18n";
import { getActiveProvider } from "../services/providers";
import { useStore } from "../store";
import { useTheme } from "../theme";
import { pickAndCompressImage } from "../utils/image";
import { useOptionalVoice } from "../utils/voice";
import type { ContentPart } from "../types/chat";
import { Sheet } from "./Sheet";
import { ThinkingSheet } from "./ThinkingSheet";

interface FileAttachment {
  name: string;
  text: string;
}

/** Composer: pill [+][input][reasoning][send], keyboard-aware native,
 * attach gambar + dokumen (txt/md/json/csv/kode). */
export function Composer() {
  const { settings, streamingId, send, stop, updateSettings } = useStore();
  const { t } = useI18n();
  const { c } = useTheme();
  const insets = useSafeAreaInsets();
  const [text, setText] = useState("");
  const [images, setImages] = useState<ContentPart[]>([]);
  const [files, setFiles] = useState<FileAttachment[]>([]);
  const [toolsOpen, setToolsOpen] = useState(false);
  const [reasoningOpen, setReasoningOpen] = useState(false);
  const [kbOpen, setKbOpen] = useState(false);

  // Share intent (SEND text/plain) → isi composer sekali.
  useEffect(() => {
    if (settings.pendingShare) {
      setText((prev) => (prev ? `${prev}\n${settings.pendingShare}` : settings.pendingShare ?? ""));
      updateSettings({ pendingShare: undefined });
    }
  }, [settings.pendingShare, updateSettings]);

  const { listening, toggle: toggleVoice } = useOptionalVoice(
    (transcript) => {
      setText((prev) => (prev ? `${prev} ${transcript}` : transcript));
    },
    t("chat.voiceUnavailable"),
  );

  useEffect(() => {
    const show = Keyboard.addListener("keyboardDidShow", () => setKbOpen(true));
    const hide = Keyboard.addListener("keyboardDidHide", () => setKbOpen(false));
    return () => {
      show.remove();
      hide.remove();
    };
  }, []);

  const provider = getActiveProvider(settings);
  const thinking = provider?.thinking ?? "off";
  const thinkingOn = thinking !== "off";
  const thinkingLabel = thinkingOn ? t("chat.thinkingOn") : t("chat.thinkingOff");

  const streaming = streamingId !== null;
  const canSend = text.trim().length > 0 || images.length > 0 || files.length > 0;

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

  const attachFile = async () => {
    setToolsOpen(false);
    try {
      const res = await DocumentPicker.getDocumentAsync({
        multiple: false,
        type: [
          "text/*",
          "application/json",
          "text/csv",
          "text/markdown",
          "application/javascript",
          "text/x-python",
        ],
      });
      if (res.canceled || !res.assets?.length) {
        return;
      }
      const asset = res.assets[0];
      // Baca sebagai teks (isi dipotong biar hemat).
      const content = await new File(asset.uri).text();
      const clipped = content.length > 60_000 ? content.slice(0, 60_000) : content;
      setFiles((f) => [...f, { name: asset.name ?? "file", text: clipped }]);
    } catch {
      // user cancel — diam saja
    }
  };

  const removeFile = (i: number) => setFiles((f) => f.filter((_, j) => j !== i));

  const onSend = () => {
    if (!canSend || streaming) {
      return;
    }
    // File dijadikan teks context di depan prompt user.
    let final = text;
    if (files.length) {
      const blocks = files
        .map((f) => `--- file: ${f.name} ---\n${f.text}`)
        .join("\n\n");
      final = final.trim() ? `${blocksHeader(files.length)}${blocks}\n\n${text}` : `${blocks}\n${""}`;
      if (!text.trim()) {
        final = blocks;
      }
    }
    const imgs = images;
    setText("");
    setImages([]);
    setFiles([]);
    void send(final, imgs);
  };

  const blocksHeader = (n: number) =>
    n > 1 ? `${t("file.attached", { n })}\n\n` : "";

  return (
    <View
      style={[
        styles.wrap,
        {
          backgroundColor: c.bg,
          borderTopColor: c.border,
          borderTopWidth: StyleSheet.hairlineWidth,
          paddingBottom: kbOpen ? 8 : Math.max(insets.bottom, 10),
        },
      ]}
    >
      {images.length > 0 || files.length > 0 ? (
        <View style={styles.thumbRow}>
          {images.map((part, i) => (
            <View key={`img${i}`} style={styles.thumb}>
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
          {files.map((f, i) => (
            <View key={`file${i}`} style={[styles.fileChip, { backgroundColor: c.panel, borderColor: c.border }]}>
              <Ionicons name="document-text-outline" size={14} color={c.text} />
              <Text numberOfLines={1} style={[styles.fileName, { color: c.text }]}>
                {f.name}
              </Text>
              <Pressable onPress={() => removeFile(i)} hitSlop={6} style={styles.fileRemove}>
                <Ionicons name="close" size={12} color={c.muted} />
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
          onPress={() => setReasoningOpen(true)}
          hitSlop={6}
          style={[
            styles.reasonChip,
            {
              backgroundColor: thinkingOn ? c.accent + "1f" : c.input,
              borderColor: thinkingOn ? c.accent + "55" : c.border,
            },
          ]}
          accessibilityLabel={t("model.reasoning")}
        >
          <Ionicons
            name="sparkles-outline"
            size={14}
            color={thinkingOn ? c.accent : c.muted}
          />
          <Text
            numberOfLines={1}
            style={[styles.reasonChipText, { color: thinkingOn ? c.accent : c.muted }]}
          >
            {thinkingLabel}
          </Text>
        </Pressable>

        <Pressable
          onPress={() => void toggleVoice()}
          hitSlop={6}
          style={[styles.iconBtn, listening && { backgroundColor: c.danger + "33" }]}
          accessibilityLabel={listening ? t("chat.voiceStop") : t("chat.voiceStart")}
        >
          <Ionicons
            name={listening ? "mic" : "mic-outline"}
            size={20}
            color={listening ? c.danger : c.muted}
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

      <Sheet visible={toolsOpen} title={t("chat.attach")} onClose={() => setToolsOpen(false)}>
        <Pressable onPress={attach} style={styles.toolRow}>
          <Ionicons name="images-outline" size={20} color={c.text} />
          <Text style={{ color: c.text, fontSize: 14 }}>{t("chat.attachImage")}</Text>
        </Pressable>
        <Pressable onPress={attachFile} style={styles.toolRow}>
          <Ionicons name="document-outline" size={20} color={c.text} />
          <Text style={{ color: c.text, fontSize: 14 }}>{t("chat.attachFile")}</Text>
        </Pressable>
      </Sheet>

      <ThinkingSheet visible={reasoningOpen} onClose={() => setReasoningOpen(false)} />
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
  fileChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 10,
    paddingVertical: 8,
    maxWidth: 180,
  },
  fileName: { fontSize: 12, flexShrink: 1, maxWidth: 110 },
  fileRemove: { padding: 2 },
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
  reasonChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    borderRadius: 16,
    borderWidth: 1,
    paddingHorizontal: 8,
    paddingVertical: 7,
    maxWidth: 92,
    flexShrink: 0,
  },
  reasonChipText: {
    fontSize: 11,
    fontWeight: "600",
    flexShrink: 1,
  },
  input: {
    flex: 1,
    maxHeight: 96,
    fontSize: 16,
    paddingVertical: 8,
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
