import { Ionicons } from "@expo/vector-icons";
import { useMemo, useState } from "react";
import { FlatList, Pressable, StyleSheet, Text, View } from "react-native";
import { KeyboardAvoidingView } from "react-native-keyboard-controller";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { ChatMessage } from "../components/ChatMessage";
import { Composer } from "../components/Composer";
import { ModelSheet } from "../components/ModelSheet";
import { Sidebar } from "../components/Sidebar";
import { useI18n } from "../i18n";
import { useStore } from "../store";
import { useTheme } from "../theme";

function EmptyState() {
  const { c } = useTheme();
  const { t } = useI18n();
  const { settings } = useStore();
  const name = settings.profileName?.trim();
  return (
    <View style={styles.empty}>
      <SparkleMark />
      <Text style={[styles.greeting, { color: c.text }]}>
        {name ? t("chat.greeting", { name }) : t("chat.greetingDefault")}
      </Text>
    </View>
  );
}

/** Sparkle 4-titik ala Gemini — digambar dengan 4 View rotated, no assets. */
function SparkleMark() {
  const { c } = useTheme();
  const dots = [
    { x: 0, y: -14, col: c.accent },
    { x: 14, y: 0, col: c.accent + "cc" },
    { x: 0, y: 14, col: c.accent + "99" },
    { x: -14, y: 0, col: c.accent + "66" },
  ];
  return (
    <View style={styles.sparkleWrap}>
      {dots.map((d, i) => (
        <View
          key={i}
          style={[
            styles.sparkleDot,
            {
              backgroundColor: d.col,
              transform: [
                { translateX: d.x },
                { translateY: d.y },
                { rotate: "45deg" },
              ],
            },
          ]}
        />
      ))}
    </View>
  );
}

export function ChatScreen() {
  const { activeThread, streamingId, settings, createThread } = useStore();
  const { c } = useTheme();
  const { t } = useI18n();
  const insets = useSafeAreaInsets();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [modelOpen, setModelOpen] = useState(false);

  const messages = activeThread?.messages ?? [];
  // inverted FlatList: data harus newest-first biar chat terlihat normal
  const reversed = useMemo(() => [...messages].reverse(), [messages]);
  const provider = settings.providers.find((p) => p.id === settings.activeProviderId)
    ?? settings.providers[0];
  const modelLabel = provider?.model ?? "";
  const empty = messages.length === 0;

  return (
    <View style={[styles.root, { backgroundColor: c.bg }]}>
      <View
        style={[
          styles.header,
          {
            backgroundColor: c.bg,
            borderBottomColor: c.border,
            paddingTop: insets.top + 6,
          },
        ]}
      >
        <Pressable onPress={() => setSidebarOpen(true)} hitSlop={8} style={styles.headerBtn}>
          <Ionicons name="menu" size={22} color={c.text} />
        </Pressable>

        <Pressable onPress={() => setModelOpen(true)} style={styles.modelChip}>
          <Text numberOfLines={1} style={[styles.modelChipText, { color: c.text }]}>
            {modelLabel}
          </Text>
          <Ionicons name="chevron-down" size={14} color={c.muted} />
        </Pressable>

        <View style={{ flex: 1 }} />

        <Pressable
          onPress={() => createThread()}
          hitSlop={8}
          style={styles.headerBtn}
          accessibilityLabel={t("sidebar.newChat")}
        >
          <Ionicons name="create-outline" size={21} color={c.text} />
        </Pressable>
      </View>

      {/* Composer di LUAR scroll — biar nempel di bawah, gak ikut ke-scroll. */}
      <KeyboardAvoidingView style={styles.root} behavior="padding">
        {empty ? (
          <View style={styles.emptyWrap}>
            <EmptyState />
          </View>
        ) : (
          <FlatList
            inverted
            data={reversed}
            keyExtractor={(m) => m.id}
            renderItem={({ item }) => (
              <ChatMessage message={item} streaming={streamingId === item.id} />
            )}
            contentContainerStyle={styles.listContent}
            keyboardShouldPersistTaps="handled"
          />
        )}
        <Composer />
      </KeyboardAvoidingView>

      <Sidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      <ModelSheet visible={modelOpen} onClose={() => setModelOpen(false)} />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingBottom: 8,
    paddingHorizontal: 8,
    borderBottomWidth: StyleSheet.hairlineWidth,
    gap: 4,
  },
  headerBtn: { padding: 8 },
  modelChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    maxWidth: "55%",
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  modelChipText: { fontSize: 15, fontWeight: "700" },
  listContent: {
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  emptyWrap: {
    flex: 1,
    backgroundColor: "transparent",
  },
  empty: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 32,
    paddingBottom: 60,
  },
  sparkleWrap: { width: 60, height: 60, alignItems: "center", justifyContent: "center", marginBottom: 18 },
  sparkleDot: { position: "absolute", width: 12, height: 12, borderRadius: 3 },
  greeting: { fontSize: 24, fontWeight: "500", textAlign: "center", lineHeight: 32 },
});
