import { Ionicons } from "@expo/vector-icons";
import * as Linking from "expo-linking";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  FlatList,
  PanResponder,
  StyleSheet,
  Text,
  View,
  type ListRenderItemInfo,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
} from "react-native";
import { KeyboardAvoidingView } from "react-native-keyboard-controller";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { ChatMessage } from "../components/ChatMessage";
import { Composer } from "../components/Composer";
import { ModelSheet } from "../components/ModelSheet";
import { SettingsOverlay } from "../components/SettingsOverlay";
import { Sidebar } from "../components/Sidebar";
import { IconButton, Meter, Panel, Touch, useReducedMotion } from "../components/ui";
import { useI18n } from "../i18n";
import { useStore } from "../store";
import { providerMark, R, SP, useTheme } from "../theme";
import { TXT } from "../fonts";
import type { ChatMessage as ChatMessageType } from "../types/chat";

/**
 * The routing bar.
 *
 * The provider and model are the only genuinely variable objects in this app,
 * so they get the top of the screen instead of a 13px chip. The spine on the
 * left carries the provider's hue, and it turns to the signal colour while an
 * answer is streaming: the light tells you what is running.
 */
function RoutingBar({ onOpenDrawer, onOpenModel, onOpenSettings }: {
  onOpenDrawer: () => void;
  onOpenModel: () => void;
  onOpenSettings: () => void;
}) {
  const { settings, streamingId, createThread } = useStore();
  const { c } = useTheme();
  const { t } = useI18n();
  const insets = useSafeAreaInsets();
  const reduced = useReducedMotion();

  const provider =
    settings.providers.find((p) => p.id === settings.activeProviderId) ?? settings.providers[0];
  const streaming = streamingId !== null;
  const model = provider?.model || t("settings.modelPlaceholder");

  return (
    <View
      style={[
        styles.bar,
        {
          backgroundColor: c.bg,
          borderBottomColor: c.border,
          paddingTop: insets.top + SP.sm,
        },
      ]}
    >
      <View
        style={[
          styles.spine,
          { backgroundColor: streaming ? c.accent : providerMark(provider?.kind ?? "custom") },
        ]}
      />

      <IconButton icon="menu" onPress={onOpenDrawer} label={t("sidebar.history")} tone="text" />

      <Touch
        onPress={onOpenModel}
        label={t("chat.model")}
        accessibilityHint={t("chat.changeModel")}
        style={styles.readout}
        hover={{ backgroundColor: c.panel }}
        press={{ backgroundColor: c.panel }}
      >
        <View style={styles.readoutTop}>
          <Text style={[TXT.readout, { color: c.text, flexShrink: 1 }]} numberOfLines={1}>
            {model}
          </Text>
          {streaming ? (
            <Meter active reduced={reduced} />
          ) : (
            <Ionicons name="chevron-down" size={14} color={c.faint} />
          )}
        </View>
        <Text style={[TXT.label, { color: c.faint }]} numberOfLines={1}>
          {[provider?.name ?? "—", provider?.apiFormat ?? ""].filter(Boolean).join("  ·  ")}
        </Text>
      </Touch>

      <IconButton
        icon="create-outline"
        onPress={createThread}
        label={t("sidebar.newChat")}
      />
      <IconButton icon="options-outline" onPress={onOpenSettings} label={t("common.settings")} />
    </View>
  );
}

/** First run: teach the space instead of floating a glyph in the middle of it. */
function EmptyState() {
  const { settings } = useStore();
  const { c } = useTheme();
  const { t } = useI18n();
  const provider =
    settings.providers.find((p) => p.id === settings.activeProviderId) ?? settings.providers[0];

  return (
    <View style={styles.emptyWrap}>
      <Panel style={styles.emptyPanel}>
        <View style={[styles.emptySpine, { backgroundColor: providerMark(provider?.kind ?? "custom") }]} />
        <View style={styles.emptyBody}>
          <Text style={[TXT.label, { color: c.faint }]}>{t("chat.newSession")}</Text>
          <Text style={[TXT.display, { color: c.text, marginTop: SP.sm }]}>
            {t("chat.emptyTitle")}
          </Text>
          <Text style={[TXT.body, { color: c.muted, marginTop: SP.sm }]}>
            {t("chat.emptySubtitle")}
          </Text>

          <View style={[styles.emptyMeta, { borderTopColor: c.border }]}>
            <View style={styles.emptyMetaRow}>
              <Text style={[TXT.label, { color: c.faint }]}>{t("common.provider")}</Text>
              <Text style={[TXT.readout, { color: c.muted }]} numberOfLines={1}>
                {provider?.name ?? "—"}
              </Text>
            </View>
            <View style={styles.emptyMetaRow}>
              <Text style={[TXT.label, { color: c.faint }]}>{t("chat.model")}</Text>
              <Text style={[TXT.readout, { color: c.muted }]} numberOfLines={1}>
                {provider?.model || t("settings.modelPlaceholder")}
              </Text>
            </View>
          </View>
        </View>
      </Panel>
    </View>
  );
}

export function ChatScreen() {
  const { activeThread, streamingId, updateSettings } = useStore();
  const { c } = useTheme();
  const { t } = useI18n();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [modelOpen, setModelOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  // Bumping the session remounts the settings panel, so it always opens on its
  // first screen with no reset effect to keep in sync.
  const [settingsSession, setSettingsSession] = useState(0);
  const listRef = useRef<FlatList<ChatMessageType>>(null);
  const [atBottom, setAtBottom] = useState(true);

  // Edge swipe from the left opens the drawer. The zone is confined to the
  // transcript so it can never swallow a tap on the composer.
  const edgePan = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => false,
        onMoveShouldSetPanResponder: (evt, g) =>
          evt.nativeEvent.pageX < 28 && g.dx > 12 && Math.abs(g.dy) < 30,
        onPanResponderRelease: (_evt, g) => {
          if (g.dx > 48) setSidebarOpen(true);
        },
      }),
    [],
  );

  const messages = activeThread?.messages ?? [];
  const empty = messages.length === 0;

  // Android share intent
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
      <ChatMessage message={item} streaming={streamingId === item.id} />
    ),
    [streamingId],
  );

  const onScroll = useCallback((e: NativeSyntheticEvent<NativeScrollEvent>) => {
    const { contentOffset, contentSize, layoutMeasurement } = e.nativeEvent;
    const distance = contentSize.height - contentOffset.y - layoutMeasurement.height;
    // Only follow the stream when the reader is already at the bottom. Yanking
    // someone back down mid-read is the fastest way to lose their place.
    setAtBottom(distance < 96);
  }, []);

  return (
    <View style={[styles.root, { backgroundColor: c.bg }]}>
      <RoutingBar
        onOpenDrawer={() => setSidebarOpen(true)}
        onOpenModel={() => setModelOpen(true)}
        onOpenSettings={() => {
          setSettingsSession((s) => s + 1);
          setSettingsOpen(true);
        }}
      />

      <KeyboardAvoidingView style={styles.root} behavior="padding">
        <View style={styles.transcript}>
          {empty ? (
            <EmptyState />
          ) : (
            <FlatList
              ref={listRef}
              data={messages}
              keyExtractor={(m) => m.id}
              renderItem={renderItem}
              contentContainerStyle={styles.listContent}
              keyboardShouldPersistTaps="handled"
              onScroll={onScroll}
              scrollEventThrottle={32}
              initialNumToRender={12}
              maxToRenderPerBatch={10}
              windowSize={11}
              removeClippedSubviews
              updateCellsBatchingPeriod={50}
              onContentSizeChange={() => {
                if (atBottom) {
                  listRef.current?.scrollToEnd({ animated: false });
                }
              }}
            />
          )}

          {!empty && !atBottom ? (
            <View style={styles.jumpWrap} pointerEvents="box-none">
              <Touch
                onPress={() => listRef.current?.scrollToEnd({ animated: true })}
                label={t("chat.jumpToBottom")}
                radius={R.sm}
                style={[styles.jump, { backgroundColor: c.raised, borderColor: c.borderStrong }]}
                hover={{ backgroundColor: c.panel }}
                press={{ opacity: 0.75 }}
              >
                <Ionicons name="arrow-down" size={14} color={c.text} />
                <Text style={[TXT.label, { color: c.text }]}>{t("chat.jumpToBottom")}</Text>
              </Touch>
            </View>
          ) : null}

          <View style={styles.edgeHit} {...edgePan.panHandlers} />
        </View>

        <Composer />
      </KeyboardAvoidingView>

      <Sidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      <ModelSheet visible={modelOpen} onClose={() => setModelOpen(false)} />
      <SettingsOverlay
        key={settingsSession}
        visible={settingsOpen}
        onClose={() => setSettingsOpen(false)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  transcript: { flex: 1 },

  bar: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: SP.sm,
    paddingBottom: SP.sm,
    gap: SP.xs,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  spine: { width: 2, height: 34, borderRadius: 1, marginRight: SP.xs },
  readout: {
    flex: 1,
    minWidth: 0,
    paddingHorizontal: SP.sm,
    paddingVertical: SP.xs,
    gap: 3,
  },
  readoutTop: { flexDirection: "row", alignItems: "center", gap: SP.sm },

  listContent: { paddingHorizontal: SP.sm, paddingVertical: SP.md },

  jumpWrap: { position: "absolute", left: 0, right: 0, bottom: SP.md, alignItems: "center" },
  jump: {
    flexDirection: "row",
    alignItems: "center",
    gap: SP.xs,
    borderWidth: 1,
    paddingHorizontal: SP.md,
    minHeight: 36,
  },

  edgeHit: { position: "absolute", left: 0, top: 0, bottom: 0, width: 22 },

  emptyWrap: { flex: 1, paddingHorizontal: SP.lg, paddingTop: SP.macro },
  emptyPanel: { flexDirection: "row", padding: 0, overflow: "hidden" },
  emptySpine: { width: 2 },
  emptyBody: { flex: 1, padding: SP.lg },
  emptyMeta: {
    marginTop: SP.xl,
    paddingTop: SP.md,
    borderTopWidth: StyleSheet.hairlineWidth,
    gap: SP.sm,
  },
  emptyMetaRow: {
    flexDirection: "row",
    alignItems: "baseline",
    justifyContent: "space-between",
    gap: SP.md,
  },
});
