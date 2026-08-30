import { Ionicons } from "@expo/vector-icons";
import { Image } from "expo-image";
import { useEffect, useRef } from "react";
import { Animated, StyleSheet, Text, View } from "react-native";
import type { ChatMessage as ChatMessageType, ContentPart } from "../types/chat";
import { useI18n } from "../i18n";
import { useTheme } from "../theme";
import { imageDisplaySize } from "../utils/image";
import { MarkdownRenderer } from "./MarkdownRenderer";

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

/** Bubble chat: user kanan (accent), assistant kiri (surface). Mendukung
 *  konten campuran teks + gambar, markdown, dan indikator streaming. */
export function ChatMessage({
  message,
  streaming,
}: {
  message: ChatMessageType;
  streaming: boolean;
}) {
  const { c } = useTheme();
  const isUser = message.role === "user";

  const parts = typeof message.content === "string" ? null : message.content;
  const text = typeof message.content === "string" ? message.content : "";
  const streamingEmpty = streaming && !text.trim() && !parts;

  return (
    <View style={[styles.row, { justifyContent: isUser ? "flex-end" : "flex-start" }]}>
      <View
        style={[
          styles.bubble,
          {
            backgroundColor: isUser ? c.bubbleUser : c.bubbleAssistant,
            borderColor: isUser ? c.bubbleUser : c.border,
            borderWidth: isUser ? 0 : StyleSheet.hairlineWidth,
          },
        ]}
      >
        {parts ? (
          parts.map((part, i) =>
            part.type === "image_url" ? (
              <ImagePart key={i} part={part} />
            ) : (
              <MarkdownRenderer key={i} body={part.text ?? ""} tint={isUser ? c.onAccent : undefined} />
            ),
          )
        ) : streamingEmpty ? (
          <TypingDots />
        ) : (
          <MarkdownRenderer body={text} tint={isUser ? c.onAccent : undefined} />
        )}
        {!streaming && message.usage && !isUser ? (
          <View style={styles.usageRow}>
            <Ionicons name="analytics-outline" size={11} color={c.muted} />
            <Text style={[styles.usageText, { color: c.muted }]}>
              {message.usage.total_tokens} tok
            </Text>
          </View>
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    marginVertical: 4,
  },
  bubble: {
    maxWidth: "84%",
    borderRadius: 18,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  image: {
    borderRadius: 12,
    marginVertical: 4,
  },
  usageRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    marginTop: 6,
  },
  usageText: {
    fontSize: 11,
  },
});