import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useRef, useState } from "react";
import { FlatList, Pressable, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { ChatMessage } from "../components/ChatMessage";
import { Composer } from "../components/Composer";
import { Sidebar } from "../components/Sidebar";
import { useI18n } from "../i18n";
import { useStore } from "../store";
import { useTheme } from "../theme";
import type { ChatMessage as ChatMessageType } from "../types/chat";

function EmptyState() {
  const { c } = useTheme();
  const { t } = useI18n();
  return (
    <View style={styles.empty}>
      <View style={[styles.emptyIcon, { backgroundColor: c.panel, borderColor: c.border }]}>
        <Ionicons name="sparkles" size={26} color={c.accent} />
      </View>
      <Text style={[styles.emptyTitle, { color: c.text }]}>{t("chat.emptyTitle")}</Text>
      <Text style={[styles.emptySub, { color: c.muted }]}>{t("chat.emptySubtitle")}</Text>
    </View>
  );
}

export function ChatScreen() {
  const { activeThread, streamingId } = useStore();
  const { c } = useTheme();
  const { t } = useI18n();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const listRef = useRef<FlatList<ChatMessageType>>(null);

  const messages = activeThread?.messages ?? [];

  return (
    <View style={[styles.root, { backgroundColor: c.bg }]}>
      <View
        style={[
          styles.header,
          {
            backgroundColor: c.surface,
            borderBottomColor: c.border,
            paddingTop: insets.top + 6,
          },
        ]}
      >
        <Pressable onPress={() => setSidebarOpen(true)} hitSlop={8} style={styles.headerBtn}>
          <Ionicons name="menu-outline" size={22} color={c.text} />
        </Pressable>
        <Text numberOfLines={1} style={[styles.headerTitle, { color: c.text }]}>
          {activeThread?.title ?? "Lumen"}
        </Text>
        <Pressable onPress={() => router.push("/settings")} hitSlop={8} style={styles.headerBtn}>
          <Ionicons name="settings-outline" size={21} color={c.text} />
        </Pressable>
      </View>

      <FlatList
        ref={listRef}
        data={messages}
        keyExtractor={(m) => m.id}
        renderItem={({ item }) => (
          <ChatMessage message={item} streaming={streamingId === item.id} />
        )}
        contentContainerStyle={styles.listContent}
        onContentSizeChange={() => listRef.current?.scrollToEnd({ animated: true })}
        ListEmptyComponent={<EmptyState />}
        keyboardShouldPersistTaps="handled"
      />

      <Composer />
      <Sidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />
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
  },
  headerBtn: { padding: 8 },
  headerTitle: { flex: 1, textAlign: "center", fontSize: 15, fontWeight: "600" },
  listContent: {
    paddingHorizontal: 12,
    paddingVertical: 10,
    flexGrow: 1,
  },
  empty: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 32,
    paddingBottom: 60,
  },
  emptyIcon: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    marginBottom: 14,
  },
  emptyTitle: { fontSize: 17, fontWeight: "700", marginBottom: 6, textAlign: "center" },
  emptySub: { fontSize: 13, textAlign: "center", lineHeight: 19 },
});