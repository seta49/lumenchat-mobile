import { Ionicons } from "@expo/vector-icons";
import { useEffect, useState } from "react";
import {
  Animated,
  Dimensions,
  Easing,
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { FrameModal } from "./FrameModal";
import { Sheet } from "./Sheet";
import { Button, Divider, IconButton, SectionLabel, Touch, useReducedMotion } from "./ui";
import { useI18n } from "../i18n";
import { useStore } from "../store";
import { R, SP, useTheme } from "../theme";
import { TXT } from "../fonts";
import { exportThreadMarkdown } from "../utils/export";

function messageText(msg: { content: unknown }): string {
  if (typeof msg.content === "string") {
    return msg.content;
  }
  if (Array.isArray(msg.content)) {
    return msg.content
      .map((p) =>
        p && typeof p === "object" && "text" in p
          ? String((p as { text?: string }).text ?? "")
          : "",
      )
      .join(" ");
  }
  return "";
}

function initialsFrom(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (!parts.length) {
    return "L";
  }
  return (parts[0][0] + (parts[1]?.[0] ?? "")).toUpperCase();
}

/** The transcript drawer: a ledger of past conversations, searchable. */
export function Sidebar({ open, onClose }: { open: boolean; onClose: () => void }) {
  const {
    threads,
    activeThreadId,
    createThread,
    deleteThread,
    renameThread,
    setActiveThread,
    setThreadSystemPrompt,
    settings,
  } = useStore();
  const { t } = useI18n();
  const { c } = useTheme();
  const insets = useSafeAreaInsets();
  const reduced = useReducedMotion();

  const [query, setQuery] = useState("");
  const [manageId, setManageId] = useState<string | null>(null);
  const [titleDraft, setTitleDraft] = useState("");
  const [personaDraft, setPersonaDraft] = useState("");
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const width = Math.min(Dimensions.get("window").width * 0.88, 360);
  const [slide] = useState(() => new Animated.Value(-width));
  const [fade] = useState(() => new Animated.Value(0));
  // The drawer has to stay mounted while it animates out, so `rendered` trails
  // `open` by one animation.
  const [rendered, setRendered] = useState(open);

  useEffect(() => {
    if (open) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- the drawer mounts a frame before its entrance animation starts
      setRendered(true);
      if (reduced) {
        slide.setValue(0);
        fade.setValue(1);
        return;
      }
      Animated.parallel([
        Animated.timing(slide, {
          toValue: 0,
          duration: 220,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }),
        Animated.timing(fade, { toValue: 1, duration: 200, useNativeDriver: true }),
      ]).start();
    } else if (rendered) {
      if (reduced) {
        setRendered(false);
        return;
      }
      Animated.parallel([
        Animated.timing(slide, {
          toValue: -width,
          duration: 150,
          easing: Easing.in(Easing.cubic),
          useNativeDriver: true,
        }),
        Animated.timing(fade, { toValue: 0, duration: 130, useNativeDriver: true }),
      ]).start(() => setRendered(false));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, reduced]);

  const needle = query.trim().toLowerCase();
  const filtered = needle
    ? threads.filter(
        (th) =>
          th.title.toLowerCase().includes(needle) ||
          th.messages.some((m) => messageText(m).toLowerCase().includes(needle)),
      )
    : threads;

  const openManage = (id: string) => {
    const thread = threads.find((th) => th.id === id);
    setManageId(id);
    setTitleDraft(thread?.title ?? "");
    setPersonaDraft(thread?.systemPrompt ?? "");
  };

  const saveManage = () => {
    if (manageId) {
      if (titleDraft.trim()) {
        renameThread(manageId, titleDraft.trim());
      }
      setThreadSystemPrompt(manageId, personaDraft.trim() || undefined);
    }
    setManageId(null);
  };

  if (!rendered) {
    return null;
  }

  const profileName = settings.profileName?.trim() || "Lumen";

  return (
    <>
      <FrameModal
        transparent
        visible={rendered}
        animationType="none"
        onRequestClose={onClose}
        label={t("sidebar.history")}
      >
        <View style={styles.container}>
          <Animated.View
            style={[
              styles.panel,
              {
                backgroundColor: c.raised,
                borderRightColor: c.borderStrong,
                paddingTop: insets.top + SP.md,
                transform: [{ translateX: slide }],
              },
            ]}
          >
            <View style={styles.header}>
              <Text style={[TXT.label, { color: c.faint }]}>{t("sidebar.history")}</Text>
              <IconButton icon="close" onPress={onClose} label={t("common.close")} tone="text" />
            </View>

            <View style={styles.controls}>
              <Button
                label={t("sidebar.newChat")}
                icon="add"
                wide
                onPress={() => {
                  createThread();
                  onClose();
                }}
              />
              <View style={[styles.search, { backgroundColor: c.panel, borderColor: c.border }]}>
                <Ionicons name="search" size={15} color={c.faint} />
                <TextInput
                  value={query}
                  onChangeText={setQuery}
                  placeholder={t("sidebar.searchChats")}
                  placeholderTextColor={c.faint}
                  accessibilityLabel={t("sidebar.searchChats")}
                  style={[styles.searchInput, { color: c.text }]}
                />
                {query ? (
                  <IconButton
                    icon="close-circle"
                    size={28}
                    onPress={() => setQuery("")}
                    label={t("common.close")}
                  />
                ) : null}
              </View>
            </View>

            <View style={styles.listHead}>
              <SectionLabel>{t("sidebar.recents")}</SectionLabel>
              <Text style={[TXT.label, { color: c.faint }]}>
                {needle
                  ? t("sidebar.found", { n: filtered.length })
                  : String(threads.length)}
              </Text>
            </View>

            <FlatList
              data={filtered}
              keyExtractor={(item) => item.id}
              contentContainerStyle={styles.list}
              keyboardShouldPersistTaps="handled"
              ListEmptyComponent={
                <View style={[styles.empty, { borderColor: c.border }]}>
                  <Text style={[TXT.body, { color: c.muted }]}>
                    {needle ? t("sidebar.noMatches") : t("sidebar.emptyTitle")}
                  </Text>
                  <Text style={[TXT.small, { color: c.faint, marginTop: SP.xs }]}>
                    {needle ? t("sidebar.noMatchesHint") : t("sidebar.emptyHint")}
                  </Text>
                </View>
              }
              renderItem={({ item }) => {
                const active = item.id === activeThreadId;
                const last = item.messages[item.messages.length - 1];
                return (
                  <View style={styles.threadWrap}>
                    <View
                      style={[
                        styles.threadRule,
                        { backgroundColor: active ? c.accent : "transparent" },
                      ]}
                    />
                    <Touch
                      onPress={() => {
                        setActiveThread(item.id);
                        onClose();
                      }}
                      label={item.title}
                      style={[styles.thread, active ? { backgroundColor: c.panel } : null]}
                      hover={{ backgroundColor: c.panel }}
                      press={{ backgroundColor: c.panel }}
                    >
                      <View style={styles.threadText}>
                        <Text
                          style={[TXT.body, { color: c.text }]}
                          numberOfLines={1}
                        >
                          {item.title}
                        </Text>
                        <Text style={[TXT.label, { color: c.faint, marginTop: 3 }]}>
                          {t("sidebar.messageCount", { n: item.messages.length })}
                          {last ? `  ·  ${preview(last)}` : ""}
                        </Text>
                      </View>
                      <IconButton
                        icon="ellipsis-horizontal"
                        size={30}
                        onPress={() => openManage(item.id)}
                        label={`${t("sidebar.manage")} — ${item.title}`}
                      />
                    </Touch>
                  </View>
                );
              }}
            />

            <Divider />
            <View style={styles.footer}>
              <View style={[styles.avatar, { backgroundColor: c.accent }]}>
                <Text style={[TXT.label, { color: c.onAccent }]}>{initialsFrom(profileName)}</Text>
              </View>
              <Text style={[TXT.body, { color: c.text, flex: 1 }]} numberOfLines={1}>
                {profileName}
              </Text>
            </View>
          </Animated.View>

          <Animated.View
            style={[styles.scrimWrap, { opacity: fade, backgroundColor: c.scrim }]}
          >
            <Pressable
              style={StyleSheet.absoluteFill}
              onPress={onClose}
              accessible={false}
              focusable={false}
            />
          </Animated.View>
        </View>
      </FrameModal>

      {/* Manage a thread: title, persona, export, remove. Reachable from the
          row's own button, not from a long press nobody would guess. */}
      <Sheet
        visible={manageId !== null}
        kicker={t("sidebar.manage")}
        title={t("sidebar.chatTitlePlaceholder")}
        onClose={() => setManageId(null)}
        footer={
          <>
            <Button
              label={t("settings.exportMd")}
              variant="ghost"
              icon="download-outline"
              onPress={() => {
                const thread = threads.find((th) => th.id === manageId);
                if (thread) {
                  void exportThreadMarkdown(thread);
                }
                setManageId(null);
              }}
            />
            <Button label={t("common.save")} variant="primary" onPress={saveManage} />
          </>
        }
      >
        <Text style={[TXT.label, { color: c.faint }]}>{t("sidebar.chatTitlePlaceholder")}</Text>
        <TextInput
          value={titleDraft}
          onChangeText={setTitleDraft}
          accessibilityLabel={t("sidebar.chatTitlePlaceholder")}
          placeholderTextColor={c.faint}
          style={[styles.input, { color: c.text, backgroundColor: c.panel, borderColor: c.border }]}
        />
        <Text style={[TXT.label, { color: c.faint, marginTop: SP.md }]}>
          {t("sidebar.systemPrompt")}
        </Text>
        <TextInput
          value={personaDraft}
          onChangeText={setPersonaDraft}
          multiline
          accessibilityLabel={t("sidebar.systemPrompt")}
          placeholder={t("sidebar.personaPlaceholder")}
          placeholderTextColor={c.faint}
          style={[
            styles.input,
            styles.personaInput,
            { color: c.text, backgroundColor: c.panel, borderColor: c.border },
          ]}
        />
        <View style={{ marginTop: SP.sm }}>
          <Button
            label={t("common.remove")}
            variant="quiet"
            icon="trash-outline"
            onPress={() => {
              setDeleteId(manageId);
              setManageId(null);
            }}
          />
        </View>
      </Sheet>

      <Sheet
        visible={deleteId !== null}
        title={t("message.delete")}
        onClose={() => setDeleteId(null)}
        footer={
          <>
            <Button label={t("common.cancel")} variant="ghost" onPress={() => setDeleteId(null)} />
            <Button
              label={t("common.remove")}
              variant="danger"
              onPress={() => {
                if (deleteId) {
                  deleteThread(deleteId);
                }
                setDeleteId(null);
              }}
            />
          </>
        }
      >
        <Text style={[TXT.body, { color: c.muted }]}>
          {t("sidebar.actionsFor", {
            title: threads.find((th) => th.id === deleteId)?.title ?? "",
          })}
        </Text>
      </Sheet>
    </>
  );
}

function preview(msg: { content: unknown; role: string }): string {
  const text = messageText(msg).replace(/\s+/g, " ").trim();
  if (!text) {
    return "";
  }
  return text.length > 42 ? `${text.slice(0, 42)}…` : text;
}

const styles = StyleSheet.create({
  container: { flex: 1, flexDirection: "row" },
  panel: {
    width: "88%",
    maxWidth: 360,
    height: "100%",
    borderRightWidth: 1,
  },
  scrimWrap: { flex: 1 },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingLeft: SP.lg,
    paddingRight: SP.xs,
    paddingBottom: SP.sm,
  },
  controls: { paddingHorizontal: SP.lg, gap: SP.sm },
  search: {
    flexDirection: "row",
    alignItems: "center",
    gap: SP.sm,
    borderRadius: R.sm,
    borderWidth: StyleSheet.hairlineWidth,
    paddingLeft: SP.md,
    paddingRight: SP.xs,
    minHeight: 42,
  },
  searchInput: {
    flex: 1,
    fontSize: 15,
    lineHeight: 20,
    paddingVertical: SP.sm,
  },
  listHead: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: SP.lg,
    paddingTop: SP.lg,
    paddingBottom: SP.sm,
  },
  list: { paddingBottom: SP.md },
  empty: {
    marginHorizontal: SP.lg,
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: R.sm,
    padding: SP.lg,
  },
  threadWrap: { flexDirection: "row" },
  threadRule: { width: 2 },
  thread: {
    flex: 1,
    minWidth: 0,
    flexDirection: "row",
    alignItems: "center",
    gap: SP.sm,
    paddingLeft: SP.lg,
    paddingRight: SP.xs,
    paddingVertical: SP.sm,
    minHeight: 58,
  },
  threadText: { flex: 1, minWidth: 0 },
  footer: {
    flexDirection: "row",
    alignItems: "center",
    gap: SP.md,
    paddingHorizontal: SP.lg,
    paddingVertical: SP.md,
  },
  avatar: {
    width: 30,
    height: 30,
    borderRadius: R.xs,
    alignItems: "center",
    justifyContent: "center",
  },
  input: {
    borderRadius: R.sm,
    paddingHorizontal: SP.md,
    paddingVertical: SP.md,
    fontSize: 16,
    lineHeight: 22,
    borderWidth: StyleSheet.hairlineWidth,
    marginTop: SP.xs,
  },
  personaInput: { minHeight: 88, textAlignVertical: "top" },
});
