import { Ionicons } from "@expo/vector-icons";
import * as Clipboard from "expo-clipboard";
import { Image } from "expo-image";
import { useEffect, useRef, useState } from "react";
import { Animated, Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { useI18n } from "../i18n";
import { useStore } from "../store";
import { useTheme } from "../theme";
import type { ChatMessage as ChatMessageType, ContentPart } from "../types/chat";
import { imageDisplaySize } from "../utils/image";
import { MarkdownRenderer } from "./MarkdownRenderer";
import { Sheet } from "./Sheet";

function TypingDots() {
  const { c } = useTheme();
  const { t } = useI18n();
  const opacity = useRef(new Animated.Value(0.4)).current;
  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, { toValue: 1, duration: 500, useNativeDriver: true }),
        Animated.timing(opacity, { toValue: 0.4, duration: 500, useNativeDriver: true }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [opacity]);
  return (
    <Animated.Text style={{ color: c.muted, opacity, fontStyle: "italic", fontSize: 14 }}>
      {t("typing.thinking")}
    </Animated.Text>
  );
}

function ImagePart({ part }: { part: ContentPart }) {
  const size = imageDisplaySize(part.image_url?.width, part.image_url?.height);
  return (
    <Image
      source={{ uri: part.image_url?.url }}
      style={[styles.image, size]}
      contentFit="cover"
      transition={120}
    />
  );
}

function plainText(content: string | ContentPart[]): string {
  if (typeof content === "string") return content;
  return content
    .map((p) => (p.type === "text" ? p.text ?? "" : ""))
    .join("\n")
    .trim();
}

/** Bubble chat v2: tap lama = aksi (copy, regenerate/edit, hapus). */
export function ChatMessage({
  message,
  streaming,
  highlight,
}: {
  message: ChatMessageType;
  streaming: boolean;
  highlight?: string;
}) {
  const { c } = useTheme();
  const { t } = useI18n();
  const { regenerate, editAndResend, deleteMessage } = useStore();
  const [actionsOpen, setActionsOpen] = useState(false);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState("");

  const isUser = message.role === "user";
  const parts = typeof message.content === "string" ? null : message.content;
  const rawText = typeof message.content === "string" ? message.content : "";
  const streamingEmpty = streaming && !rawText.trim() && !parts;
  const matched =
    highlight &&
    rawText.toLowerCase().includes(highlight.toLowerCase());

  const copy = async () => {
    await Clipboard.setStringAsync(plainText(message.content));
    setActionsOpen(false);
  };
  const doRegenerate = (nuance?: "default" | "shorter" | "longer" | "casual") => {
    setActionsOpen(false);
    void regenerate(message.id, nuance ?? "default");
  };
  const startEdit = () => {
    setActionsOpen(false);
    setDraft(plainText(message.content));
    setEditing(true);
  };
  const saveEdit = () => {
    setEditing(false);
    if (draft.trim()) void editAndResend(message.id, draft);
  };

  return (
    <View style={[styles.row, isUser && styles.rowUser]}>
      <Pressable
        onLongPress={() => !streaming && setActionsOpen(true)}
        delayLongPress={300}
        style={
          isUser
            ? [
                styles.bubble,
                {
                  backgroundColor: c.bubbleUser,
                  borderColor: matched ? c.accent : c.border,
                  borderWidth: matched ? 1 : 0,
                },
              ]
            : [
                styles.aiBlock,
                matched
                  ? {
                      borderLeftWidth: 2,
                      borderLeftColor: c.accent,
                      paddingLeft: 10,
                    }
                  : null,
              ]
        }
      >
        {parts ? (
          parts.map((part, i) =>
            part.type === "image_url" ? (
              <ImagePart key={i} part={part} />
            ) : isUser ? (
              <Text key={i} style={[styles.userText, { color: c.text }]}>
                {part.text ?? ""}
              </Text>
            ) : (
              <MarkdownRenderer key={i} body={part.text ?? ""} />
            ),
          )
        ) : streamingEmpty ? (
          <TypingDots />
        ) : isUser ? (
          <Text style={[styles.userText, { color: c.text }]}>{rawText}</Text>
        ) : (
          <MarkdownRenderer body={rawText} />
        )}
      </Pressable>

      {/* Aksi pesan */}
      <Sheet visible={actionsOpen} title={t("common.edit")} onClose={() => setActionsOpen(false)}>
        <Pressable onPress={copy} style={styles.actionRow}>
          <Ionicons name="copy-outline" size={18} color={c.text} />
          <Text style={{ color: c.text, fontSize: 14 }}>{t("message.copy")}</Text>
        </Pressable>
        {isUser ? (
          <Pressable onPress={startEdit} style={styles.actionRow}>
            <Ionicons name="create-outline" size={18} color={c.text} />
            <Text style={{ color: c.text, fontSize: 14 }}>{t("message.editResend")}</Text>
          </Pressable>
        ) : (
          <>
            <Pressable onPress={() => doRegenerate("default")} style={styles.actionRow}>
              <Ionicons name="refresh-outline" size={18} color={c.text} />
              <Text style={{ color: c.text, fontSize: 14 }}>{t("message.regenerate")}</Text>
            </Pressable>
            <Pressable onPress={() => doRegenerate("shorter")} style={styles.actionRow}>
              <Ionicons name="contract-outline" size={18} color={c.text} />
              <Text style={{ color: c.text, fontSize: 14 }}>{t("message.regenerateShorter")}</Text>
            </Pressable>
            <Pressable onPress={() => doRegenerate("longer")} style={styles.actionRow}>
              <Ionicons name="expand-outline" size={18} color={c.text} />
              <Text style={{ color: c.text, fontSize: 14 }}>{t("message.regenerateLonger")}</Text>
            </Pressable>
            <Pressable onPress={() => doRegenerate("casual")} style={styles.actionRow}>
              <Ionicons name="happy-outline" size={18} color={c.text} />
              <Text style={{ color: c.text, fontSize: 14 }}>{t("message.regenerateCasual")}</Text>
            </Pressable>
          </>
        )}
        <Pressable
          onPress={() => {
            setActionsOpen(false);
            deleteMessage(message.id);
          }}
          style={styles.actionRow}
        >
          <Ionicons name="trash-outline" size={18} color={c.danger} />
          <Text style={{ color: c.danger, fontSize: 14 }}>{t("message.delete")}</Text>
        </Pressable>
      </Sheet>

      {/* Edit & resend */}
      <Sheet visible={editing} title={t("message.editResend")} onClose={() => setEditing(false)}>
        <TextInput
          value={draft}
          onChangeText={setDraft}
          multiline
          autoFocus
          style={[
            styles.editInput,
            { color: c.text, backgroundColor: c.input, borderColor: c.border },
          ]}
        />
        <View style={styles.editActions}>
          <Pressable
            onPress={() => setEditing(false)}
            style={[styles.ghostBtn, { borderColor: c.border }]}
          >
            <Text style={{ color: c.muted, fontSize: 13 }}>{t("common.cancel")}</Text>
          </Pressable>
          <Pressable
            onPress={saveEdit}
            style={[styles.primaryBtn, { backgroundColor: c.accent }]}
          >
            <Text style={{ color: c.onAccent, fontSize: 13, fontWeight: "600" }}>
              {t("message.saveResend")}
            </Text>
          </Pressable>
        </View>
      </Sheet>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    marginVertical: 6,
  },
  rowUser: {
    alignItems: "flex-end",
  },
  bubble: {
    maxWidth: "84%",
    borderRadius: 18,
    paddingHorizontal: 14,
    paddingVertical: 9,
  },
  userText: {
    fontSize: 15,
    lineHeight: 21,
  },
  // Balasan AI: full-width tanpa bubble — ala ChatGPT
  aiBlock: {
    width: "100%",
    paddingHorizontal: 2,
    paddingVertical: 2,
  },
  image: {
    borderRadius: 12,
    marginVertical: 4,
  },
  actionRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingVertical: 12,
    paddingHorizontal: 4,
  },
  editInput: {
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 9,
    fontSize: 14,
    minHeight: 80,
    textAlignVertical: "top",
    borderWidth: StyleSheet.hairlineWidth,
  },
  editActions: { flexDirection: "row", gap: 8, marginTop: 12, justifyContent: "flex-end" },
  ghostBtn: { paddingHorizontal: 14, paddingVertical: 9, borderRadius: 12, borderWidth: 1 },
  primaryBtn: { paddingHorizontal: 14, paddingVertical: 9, borderRadius: 12 },
});
