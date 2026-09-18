import { Ionicons } from "@expo/vector-icons";
import * as DocumentPicker from "expo-document-picker";
import { Image } from "expo-image";
import { File } from "expo-file-system";
import { useEffect, useState } from "react";
import { Keyboard, StyleSheet, Text, TextInput, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Button, IconButton, Row, Touch } from "./ui";
import { Sheet } from "./Sheet";
import { useI18n } from "../i18n";
import { getActiveProvider } from "../services/providers";
import { useStore } from "../store";
import { R, SP, useTheme } from "../theme";
import { TXT } from "../fonts";
import { pickAndCompressImage } from "../utils/image";
import { useOptionalVoice } from "../utils/voice";
import type { ContentPart } from "../types/chat";

interface FileAttachment {
  name: string;
  text: string;
}

/**
 * The composer is a two-tier strip, not a floating pill.
 *
 * The field gets the full width of the device instead of sharing a single row
 * with four controls, and the controls sit on their own rail where each one
 * can hold a real 44pt target. The primary action lands in the bottom-right
 * thumb zone.
 */
export function Composer() {
  const { settings, streamingId, send, stop, updateSettings, setThinking } = useStore();
  const { t } = useI18n();
  const { c } = useTheme();
  const insets = useSafeAreaInsets();
  const [text, setText] = useState("");
  const [images, setImages] = useState<ContentPart[]>([]);
  const [files, setFiles] = useState<FileAttachment[]>([]);
  const [toolsOpen, setToolsOpen] = useState(false);
  const [kbOpen, setKbOpen] = useState(false);

  // Share intent (SEND text/plain) fills the field once. This is a bridge from
  // an external event into local state, which is what an effect is for.
  useEffect(() => {
    if (settings.pendingShare) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- consuming a one-shot Android share intent
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
  const thinkingOn = (provider?.thinking ?? "off") !== "off";

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
      // user cancelled or denied permission
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
      const content = await new File(asset.uri).text();
      const clipped = content.length > 60_000 ? content.slice(0, 60_000) : content;
      setFiles((f) => [...f, { name: asset.name ?? "file", text: clipped }]);
    } catch {
      // user cancelled
    }
  };

  const onSend = () => {
    if (!canSend || streaming) {
      return;
    }
    let final = text;
    if (files.length) {
      const blocks = files
        .map((f) => `--- file: ${f.name} ---\n${f.text}`)
        .join("\n\n");
      const header = files.length > 1 ? `${t("file.attached", { n: files.length })}\n\n` : "";
      final = text.trim() ? `${header}${blocks}\n\n${text}` : blocks;
    }
    const imgs = images;
    setText("");
    setImages([]);
    setFiles([]);
    void send(final, imgs);
  };

  return (
    <View
      style={[
        styles.wrap,
        {
          backgroundColor: c.bg,
          borderTopColor: c.border,
          paddingBottom: kbOpen ? SP.sm : Math.max(insets.bottom, SP.sm),
        },
      ]}
    >
      {images.length > 0 || files.length > 0 ? (
        <View style={styles.attachmentRail}>
          {images.map((part, i) => (
            <View key={`img${i}`} style={styles.thumb}>
              <Image
                source={{ uri: part.image_url?.url }}
                style={[styles.thumbImage, { borderColor: c.border }]}
                contentFit="cover"
              />
              <Touch
                onPress={() => setImages((im) => im.filter((_, j) => j !== i))}
                label={t("chat.removeImage")}
                radius={R.xs}
                style={[styles.thumbRemove, { backgroundColor: c.raised, borderColor: c.borderStrong }]}
                press={{ opacity: 0.7 }}
              >
                <Ionicons name="close" size={12} color={c.text} />
              </Touch>
            </View>
          ))}
          {files.map((f, i) => (
            <View
              key={`file${i}`}
              style={[styles.fileChip, { backgroundColor: c.panel, borderColor: c.border }]}
            >
              <Ionicons name="document-text-outline" size={13} color={c.muted} />
              <Text style={[TXT.small, { color: c.text, maxWidth: 120 }]} numberOfLines={1}>
                {f.name}
              </Text>
              <Touch
                onPress={() => setFiles((list) => list.filter((_, j) => j !== i))}
                label={`${t("common.remove")} ${f.name}`}
                radius={R.xs}
                style={styles.fileRemove}
                press={{ opacity: 0.6 }}
              >
                <Ionicons name="close" size={13} color={c.muted} />
              </Touch>
            </View>
          ))}
        </View>
      ) : null}

      <View style={[styles.field, { backgroundColor: c.panel, borderColor: c.border }]}>
        <TextInput
          value={text}
          onChangeText={setText}
          placeholder={t("chat.askLumen")}
          placeholderTextColor={c.faint}
          multiline
          accessibilityLabel={t("chat.askLumen")}
          style={[styles.input, { color: c.text }]}
        />
      </View>

      <View style={styles.rail}>
        <IconButton icon="add" onPress={() => setToolsOpen(true)} label={t("chat.attach")} tone="text" />

        <Touch
          onPress={() => setThinking(thinkingOn ? "off" : "max")}
          label={t("model.reasoning")}
          accessibilityHint={thinkingOn ? t("chat.thinkingOnHint") : t("chat.thinkingOffHint")}
          state={{ selected: thinkingOn }}
          style={[
            styles.reason,
            {
              borderColor: thinkingOn ? c.accentLine : c.border,
              backgroundColor: thinkingOn ? c.accentSoft : "transparent",
            },
          ]}
          hover={{ backgroundColor: thinkingOn ? c.accentSoft : c.panel }}
          press={{ opacity: 0.72 }}
        >
          <Ionicons
            name="sparkles-outline"
            size={14}
            color={thinkingOn ? c.accent : c.faint}
          />
          <Text style={[TXT.label, { color: thinkingOn ? c.accent : c.muted }]}>
            {thinkingOn ? t("chat.thinkingOn") : t("chat.thinkingOff")}
          </Text>
        </Touch>

        <View style={styles.spacer} />

        <IconButton
          icon={listening ? "mic" : "mic-outline"}
          onPress={() => void toggleVoice()}
          label={listening ? t("chat.voiceStop") : t("chat.voiceStart")}
          tone={listening ? "danger" : "muted"}
        />

        {streaming ? (
          <Button label={t("chat.stop")} icon="stop" variant="danger" onPress={stop} />
        ) : (
          <Button
            label={t("chat.send")}
            icon="arrow-up"
            variant="primary"
            onPress={onSend}
            disabled={!canSend}
          />
        )}
      </View>

      <Sheet visible={toolsOpen} title={t("chat.attach")} onClose={() => setToolsOpen(false)}>
        <Row
          label={t("chat.attachImage")}
          desc={t("chat.attachImageHint")}
          onPress={() => void attach()}
          right={<Ionicons name="image-outline" size={18} color={c.muted} />}
        />
        <Row
          label={t("chat.attachFile")}
          desc={t("chat.attachFileHint")}
          onPress={() => void attachFile()}
          right={<Ionicons name="document-outline" size={18} color={c.muted} />}
        />
      </Sheet>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    paddingHorizontal: SP.md,
    paddingTop: SP.sm,
    borderTopWidth: StyleSheet.hairlineWidth,
    gap: SP.sm,
  },
  attachmentRail: {
    flexDirection: "row",
    gap: SP.sm,
    flexWrap: "wrap",
  },
  thumb: { position: "relative" },
  thumbImage: { width: 56, height: 56, borderRadius: R.sm, borderWidth: 1 },
  thumbRemove: {
    position: "absolute",
    top: -6,
    right: -6,
    width: 22,
    height: 22,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
  },
  fileChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: SP.sm,
    borderRadius: R.sm,
    borderWidth: 1,
    paddingLeft: SP.md,
    paddingRight: SP.xs,
    height: 34,
    alignSelf: "flex-end",
  },
  fileRemove: { width: 24, height: 24, alignItems: "center", justifyContent: "center" },
  field: {
    borderRadius: R.sm,
    borderWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: SP.md,
    minHeight: 48,
    justifyContent: "center",
  },
  input: {
    // 16pt keeps iOS from zooming the viewport when the field takes focus.
    fontSize: 16,
    lineHeight: 22,
    letterSpacing: 0.1,
    maxHeight: 132,
    paddingVertical: SP.md,
  },
  rail: {
    flexDirection: "row",
    alignItems: "center",
    gap: SP.xs,
    minHeight: 44,
  },
  reason: {
    flexDirection: "row",
    alignItems: "center",
    gap: SP.sm,
    borderWidth: 1,
    paddingHorizontal: SP.md,
    minHeight: 36,
  },
  spacer: { flex: 1 },
});
