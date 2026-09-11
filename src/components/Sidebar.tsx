import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useEffect, useRef, useState } from "react";
import {
  Animated,
  Dimensions,
  Easing,
  FlatList,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useI18n } from "../i18n";
import { useStore } from "../store";
import { useTheme } from "../theme";
import { exportThreadMarkdown } from "../utils/export";
import { Sheet } from "./Sheet";

function messageText(msg: { content: unknown }): string {
  if (typeof msg.content === "string") return msg.content;
  if (Array.isArray(msg.content)) {
    return msg.content
      .map((p) => (p && typeof p === "object" && "text" in p ? String((p as { text?: string }).text ?? "") : ""))
      .join(" ");
  }
  return "";
}

/** Drawer riwayat v2: slide dari KIRI nempel mepet, backdrop fade,
 * pill chat baru + search + list polos (long-press = aksi), footer profil. */
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
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [query, setQuery] = useState("");
  const [searching, setSearching] = useState(false);
  const [renameId, setRenameId] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState("");
  const [personaDraft, setPersonaDraft] = useState("");
  const [deleteId, setDeleteId] = useState<string | null>(null);

  // Slide dari kiri: panel mulai -width → 0. Struktur: [panel][backdrop flex]
  // dalam row — panel nempel mepet kiri layar, sisanya backdrop.
  const width = Math.min(Dimensions.get("window").width * 0.86, 360);
  const slide = useRef(new Animated.Value(-width)).current;
  const fade = useRef(new Animated.Value(0)).current;
  const [rendered, setRendered] = useState(open);

  useEffect(() => {
    if (open) {
      setRendered(true);
      Animated.parallel([
        Animated.timing(slide, {
          toValue: 0,
          duration: 240,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }),
        Animated.timing(fade, { toValue: 1, duration: 220, useNativeDriver: true }),
      ]).start();
    } else if (rendered) {
      Animated.parallel([
        Animated.timing(slide, {
          toValue: -width,
          duration: 200,
          easing: Easing.in(Easing.cubic),
          useNativeDriver: true,
        }),
        Animated.timing(fade, { toValue: 0, duration: 180, useNativeDriver: true }),
      ]).start(() => setRendered(false));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const filtered = query.trim()
    ? threads.filter(
        (th) =>
          th.title.toLowerCase().includes(query.toLowerCase()) ||
          th.messages.some((m) => messageText(m).toLowerCase().includes(query.toLowerCase())),
      )
    : threads;

  const openRename = (id: string, title: string, systemPrompt?: string) => {
    setRenameId(id);
    setRenameValue(title);
    setPersonaDraft(systemPrompt ?? "");
  };
  const saveRename = () => {
    if (renameId) {
      if (renameValue.trim()) {
        renameThread(renameId, renameValue.trim());
      }
      setThreadSystemPrompt(renameId, personaDraft.trim() || undefined);
    }
    setRenameId(null);
  };
  const confirmDelete = () => {
    if (deleteId) {
      deleteThread(deleteId);
    }
    setDeleteId(null);
  };
  const exportMd = (id: string) => {
    const thread = threads.find((th) => th.id === id);
    if (thread) void exportThreadMarkdown(thread);
  };

  const initials = ((settings.profileName?.trim() || "Lumen")
    .split(/\s+/)
    .map((p) => p[0])
    .slice(0, 2)
    .join("") || "L").toUpperCase();

  if (!rendered) {
    return (
      <>
        <Sheet
          visible={renameId !== null}
          title={t("sidebar.chatTitlePlaceholder")}
          onClose={() => setRenameId(null)}
        >
          {null}
        </Sheet>
      </>
    );
  }

  return (
    <>
      <Modal transparent visible={rendered} animationType="none" onRequestClose={onClose}>
        <View style={styles.container}>
          <Animated.View
            style={[
              styles.panel,
              {
                backgroundColor: c.bg,
                borderRightColor: c.border,
                paddingTop: insets.top + 8,
                transform: [{ translateX: slide }],
              },
            ]}
          >
            <View style={styles.header}>
              <Text style={[styles.logo, { color: c.text }]}>Lumen</Text>
              <Pressable onPress={onClose} hitSlop={8} style={styles.iconBtn}>
                <Ionicons name="close" size={20} color={c.muted} />
              </Pressable>
            </View>

            <View style={styles.body}>
              <Pressable
                onPress={() => {
                  createThread();
                  onClose();
                }}
                style={[styles.newPill, { backgroundColor: c.panel }]}
              >
                <Ionicons name="create-outline" size={16} color={c.text} />
                <Text style={[styles.newPillText, { color: c.text }]}>{t("sidebar.newChat")}</Text>
              </Pressable>

              <View style={[styles.searchBox, { backgroundColor: c.panel }]}>
                <Ionicons name="search" size={15} color={c.muted} />
                <TextInput
                  value={query}
                  onChangeText={setQuery}
                  onFocus={() => setSearching(true)}
                  placeholder={t("sidebar.searchChats")}
                  placeholderTextColor={c.muted}
                  style={[styles.searchInput, { color: c.text }]}
                />
                {query ? (
                  <Pressable onPress={() => setQuery("")} hitSlop={6}>
                    <Ionicons name="close-circle" size={15} color={c.muted} />
                  </Pressable>
                ) : null}
              </View>

              <Text style={[styles.sectionLabel, { color: c.muted }]}>{t("sidebar.recents")}</Text>

              <FlatList
                data={filtered}
                keyExtractor={(item) => item.id}
                contentContainerStyle={styles.list}
                ListEmptyComponent={
                  <Text style={[styles.empty, { color: c.muted }]}>
                    {searching && query ? t("sidebar.noMatches") : t("sidebar.noMessages")}
                  </Text>
                }
                renderItem={({ item }) => {
                  const active = item.id === activeThreadId;
                  return (
                    <Pressable
                      onPress={() => {
                        setActiveThread(item.id);
                        onClose();
                      }}
                      onLongPress={() => openRename(item.id, item.title, item.systemPrompt)}
                      delayLongPress={350}
                      style={[styles.threadRow, active && { backgroundColor: c.panel }]}
                    >
                      <Text
                        numberOfLines={1}
                        style={[
                          styles.threadTitle,
                          { color: c.text, fontWeight: active ? "700" : "400" },
                        ]}
                      >
                        {item.title}
                      </Text>
                    </Pressable>
                  );
                }}
              />
            </View>

            <View style={[styles.footer, { borderTopColor: c.border }]}>
              <Pressable
                onPress={() => {
                  onClose();
                  router.push("/settings");
                }}
                style={styles.footerProfile}
              >
                <View style={[styles.avatar, { backgroundColor: c.accent }]}>
                  <Text style={[styles.avatarText, { color: c.onAccent }]}>{initials}</Text>
                </View>
                <Text numberOfLines={1} style={{ color: c.text, fontSize: 14, flex: 1 }}>
                  {settings.profileName?.trim() || "Lumen"}
                </Text>
              </Pressable>
              <Pressable
                onPress={() => {
                  onClose();
                  router.push("/settings");
                }}
                hitSlop={8}
                style={styles.iconBtn}
              >
                <Ionicons name="settings-outline" size={19} color={c.text} />
              </Pressable>
            </View>
          </Animated.View>

          <Animated.View style={[styles.backdropWrap, { opacity: fade }]}>
            <Pressable style={StyleSheet.absoluteFill} onPress={onClose} />
          </Animated.View>
        </View>
      </Modal>

      <Sheet
        visible={renameId !== null}
        title={t("sidebar.chatTitlePlaceholder")}
        onClose={() => setRenameId(null)}
      >
        <TextInput
          value={renameValue}
          onChangeText={setRenameValue}
          autoFocus
          placeholder={t("sidebar.chatTitlePlaceholder")}
          placeholderTextColor={c.muted}
          style={[
            styles.input,
            { color: c.text, backgroundColor: c.input, borderColor: c.border },
          ]}
        />
        <Text style={[styles.personaLabel, { color: c.muted }]}>{t("sidebar.systemPrompt")}</Text>
        <TextInput
          value={personaDraft}
          onChangeText={setPersonaDraft}
          multiline
          placeholder={t("sidebar.personaPlaceholder")}
          placeholderTextColor={c.muted}
          style={[
            styles.input,
            styles.personaInput,
            { color: c.text, backgroundColor: c.input, borderColor: c.border },
          ]}
        />
        <View style={styles.sheetActions}>
          <Pressable
            onPress={() => {
              if (renameId) {
                exportMd(renameId);
              }
              setRenameId(null);
            }}
            style={[styles.ghostBtn, { borderColor: c.border }]}
          >
            <Text style={{ color: c.accent, fontSize: 13 }}>{t("settings.exportMd")}</Text>
          </Pressable>
          <Pressable
            onPress={() => {
              if (renameId) setDeleteId(renameId);
              setRenameId(null);
            }}
            style={[styles.ghostBtn, { borderColor: c.border }]}
          >
            <Text style={{ color: c.danger, fontSize: 13 }}>{t("common.remove")}</Text>
          </Pressable>
          <View style={{ flex: 1 }} />
          <Pressable onPress={saveRename} style={[styles.primaryBtn, { backgroundColor: c.accent }]}>
            <Text style={{ color: c.onAccent, fontSize: 13, fontWeight: "600" }}>
              {t("common.save")}
            </Text>
          </Pressable>
        </View>
      </Sheet>

      <Sheet
        visible={deleteId !== null}
        title={t("message.delete")}
        onClose={() => setDeleteId(null)}
      >
        <Text style={{ color: c.muted, fontSize: 14, marginBottom: 14 }}>
          {t("sidebar.actionsFor", {
            title: threads.find((th) => th.id === deleteId)?.title ?? "",
          })}
        </Text>
        <View style={styles.sheetActions}>
          <Pressable
            onPress={() => setDeleteId(null)}
            style={[styles.ghostBtn, { borderColor: c.border }]}
          >
            <Text style={{ color: c.muted, fontSize: 13 }}>{t("common.cancel")}</Text>
          </Pressable>
          <Pressable
            onPress={confirmDelete}
            style={[styles.primaryBtn, { backgroundColor: c.danger }]}
          >
            <Text style={{ color: "#ffffff", fontSize: 13, fontWeight: "600" }}>
              {t("common.remove")}
            </Text>
          </Pressable>
        </View>
      </Sheet>
    </>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, flexDirection: "row" },
  // Panel anak pertama = mepet kiri; lebar 86% (sisanya backdrop terlihat di kanan, ala ChatGPT).
  panel: {
    width: "86%",
    maxWidth: 360,
    height: "100%",
    borderRightWidth: StyleSheet.hairlineWidth,
  },
  backdropWrap: { flex: 1, backgroundColor: "rgba(0,0,0,0.55)" },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingBottom: 10,
  },
  logo: { fontSize: 19, fontWeight: "600" },
  body: { flex: 1, paddingHorizontal: 12 },
  newPill: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    borderRadius: 22,
    paddingVertical: 11,
    marginBottom: 10,
  },
  newPillText: { fontSize: 14, fontWeight: "600" },
  searchBox: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    borderRadius: 22,
    paddingHorizontal: 14,
    paddingVertical: 9,
    marginBottom: 14,
  },
  searchInput: { flex: 1, fontSize: 14, padding: 0 },
  sectionLabel: {
    fontSize: 11,
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: 0.6,
    paddingHorizontal: 10,
    marginBottom: 4,
  },
  list: { paddingBottom: 12 },
  empty: { textAlign: "center", marginTop: 24, fontSize: 13 },
  threadRow: {
    paddingVertical: 10,
    paddingHorizontal: 10,
    borderRadius: 14,
  },
  threadTitle: { fontSize: 14 },
  iconBtn: { padding: 8 },
  footer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 14,
    paddingVertical: 10,
    paddingBottom: 16,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  footerProfile: { flexDirection: "row", alignItems: "center", gap: 10, flex: 1 },
  avatar: {
    width: 30,
    height: 30,
    borderRadius: 15,
    alignItems: "center",
    justifyContent: "center",
  },
  avatarText: { fontSize: 11, fontWeight: "800" },
  input: {
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 9,
    fontSize: 14,
    borderWidth: StyleSheet.hairlineWidth,
  },
  personaLabel: {
    fontSize: 12,
    fontWeight: "700",
    marginTop: 12,
    marginBottom: 6,
    letterSpacing: 0.2,
  },
  personaInput: {
    minHeight: 72,
    textAlignVertical: "top",
  },
  sheetActions: { flexDirection: "row", gap: 8, marginTop: 12 },
  ghostBtn: {
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: 12,
    borderWidth: 1,
  },
  primaryBtn: { paddingHorizontal: 14, paddingVertical: 9, borderRadius: 12 },
});
