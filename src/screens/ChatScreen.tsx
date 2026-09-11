import { Ionicons } from "@expo/vector-icons";
import * as Linking from "expo-linking";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { PanResponder } from "react-native";
import {
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
  type ListRenderItemInfo,
} from "react-native";
import { KeyboardAvoidingView } from "react-native-keyboard-controller";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { ChatMessage } from "../components/ChatMessage";
import { Composer } from "../components/Composer";
import { ModelSheet } from "../components/ModelSheet";
import { Sidebar } from "../components/Sidebar";
import { useI18n } from "../i18n";
import { useStore } from "../store";
import { useTheme } from "../theme";
import type { ChatMessage as ChatMessageType } from "../types/chat";
import { contentToText } from "../services/ai";

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
  const {
    activeThread,
    streamingId,
    settings,
    createThread,
    updateSettings,
  } = useStore();
  const { c } = useTheme();
  const { t } = useI18n();
  const insets = useSafeAreaInsets();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [modelOpen, setModelOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQ, setSearchQ] = useState("");
  const listRef = useRef<FlatList<ChatMessageType>>(null);

  // Edge swipe dari kiri → buka sidebar (hanya saat drag, gak block tap)
  const edgePan = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => false,
      onMoveShouldSetPanResponder: (evt, g) =>
        evt.nativeEvent.pageX < 28 && g.dx > 12 && Math.abs(g.dy) < 30,
      onPanResponderRelease: (_evt, g) => {
        if (g.dx > 48) setSidebarOpen(true);
      },
    }),
  ).current;

  const messages = activeThread?.messages ?? [];
  const provider =
    settings.providers.find((p) => p.id === settings.activeProviderId) ?? settings.providers[0];
  const modelLabel = provider?.model ?? "";
  const empty = messages.length === 0;

  const searchHits = useMemo(() => {
    if (!searchQ.trim()) return [];
    const q = searchQ.toLowerCase();
    return messages
      .filter((m) => contentToText(m.content).toLowerCase().includes(q))
      .map((m) => m.id);
  }, [messages, searchQ]);

  // Share intent Android (SEND text/plain) → isi composer via settings.pendingShare
  useEffect(() => {
    const handleShare = (url: string) => {
      try {
        const parsed = new URL(url.replace("lumenchat://", "https://"));
        const shared = parsed.searchParams.get("text") ?? "";
        if (shared) {
          updateSettings({ pendingShare: shared });
        }
      } catch {
        // ignore
      }
    };
    const sub = Linking.addEventListener("url", ({ url }) => handleShare(url));
    void Linking.getInitialURL().then((u) => {
      if (u) handleShare(u);
    });
    return () => sub.remove();
  }, [updateSettings]);

  const renderItem = useCallback(
    ({ item }: ListRenderItemInfo<ChatMessageType>) => (
      <ChatMessage
        message={item}
        streaming={streamingId === item.id}
        highlight={searchQ.trim() ? searchQ : undefined}
      />
    ),
    [streamingId, searchQ],
  );

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
          onPress={() => {
            setSearchOpen((v) => !v);
            if (searchOpen) setSearchQ("");
          }}
          hitSlop={8}
          style={styles.headerBtn}
        >
          <Ionicons
            name={searchOpen ? "close" : "search"}
            size={20}
            color={searchOpen ? c.accent : c.text}
          />
        </Pressable>

        <Pressable
          onPress={() => createThread()}
          hitSlop={8}
          style={styles.headerBtn}
          accessibilityLabel={t("sidebar.newChat")}
        >
          <Ionicons name="create-outline" size={21} color={c.text} />
        </Pressable>
      </View>

      {searchOpen ? (
        <View style={[styles.searchBar, { backgroundColor: c.surface, borderBottomColor: c.border }]}>
          <Ionicons name="search" size={15} color={c.muted} />
          <TextInput
            value={searchQ}
            onChangeText={setSearchQ}
            placeholder={t("chat.search")}
            placeholderTextColor={c.muted}
            autoFocus
            style={[styles.searchInput, { color: c.text }]}
          />
          {searchQ ? (
            <Text style={{ color: c.muted, fontSize: 12 }}>
              {t("chat.searchHits", { n: searchHits.length })}
            </Text>
          ) : null}
        </View>
      ) : null}

      <KeyboardAvoidingView style={styles.root} behavior="padding">
        {empty ? (
          <View style={styles.emptyWrap}>
            <EmptyState />
          </View>
        ) : (
          <FlatList
            ref={listRef}
            data={messages}
            keyExtractor={(m) => m.id}
            renderItem={renderItem}
            contentContainerStyle={styles.listContent}
            keyboardShouldPersistTaps="handled"
            // Optimasi chat panjang
            initialNumToRender={12}
            maxToRenderPerBatch={10}
            windowSize={11}
            removeClippedSubviews
            updateCellsBatchingPeriod={50}
            onContentSizeChange={() => {
              listRef.current?.scrollToEnd({ animated: false });
            }}
          />
        )}
        <Composer />
        {/* Overlay tipis di tepi kiri untuk detect edge swipe */}
        <View
          style={styles.edgeHit}
          {...edgePan.panHandlers}
        />
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
    maxWidth: "45%",
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  modelChipText: { fontSize: 15, fontWeight: "700" },
  searchBar: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  searchInput: { flex: 1, fontSize: 14, padding: 0 },
  listContent: {
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  emptyWrap: {
    flex: 1,
    backgroundColor: "transparent",
  },
  edgeHit: {
    position: "absolute",
    left: 0,
    top: 0,
    bottom: 0,
    width: 24,
  },
  empty: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 32,
    paddingBottom: 60,
  },
  sparkleWrap: {
    width: 60,
    height: 60,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 18,
  },
  sparkleDot: { position: "absolute", width: 12, height: 12, borderRadius: 3 },
  greeting: { fontSize: 24, fontWeight: "500", textAlign: "center", lineHeight: 32 },
});
