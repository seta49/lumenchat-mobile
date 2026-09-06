import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useState } from "react";
import { FlatList, Modal, Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useI18n } from "../i18n";
import { useStore } from "../store";
import { useTheme } from "../theme";
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

/** Drawer riwayat v2 ala ChatGPT/Gemini: pill "Chat baru", search inline,
 * list polos (long-press = aksi), footer profil + gear. */
export function Sidebar({ open, onClose }: { open: boolean; onClose: () => void }) {
  const {
    threads,
    activeThreadId,
    createThread,
    deleteThread,
    renameThread,
    setActiveThread,
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
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const filtered = query.trim()
    ? threads.filter(
        (th) =>
          th.title.toLowerCase().includes(query.toLowerCase()) ||
          th.messages.some((m) => messageText(m).toLowerCase().includes(query.toLowerCase())),
      )
    : threads;

  const openRename = (id: string, title: string) => {
    setRenameId(id);
    setRenameValue(title);
  };
  const saveRename = () => {
    if (renameId && renameValue.trim()) {
      renameThread(renameId, renameValue.trim());
    }
    setRenameId(null);
  };
  const confirmDelete = () => {
    if (deleteId) {
      deleteThread(deleteId);
    }
    setDeleteId(null);
  };

  const initials = ((settings.profileName?.trim() || "Lumen")
    .split(/\s+/)
    .map((p) => p[0])
    .slice(0, 2)
    .join("") || "L").toUpperCase();

  return (
    <>
      <Modal transparent visible={open} animationType="slide" onRequestClose={onClose}>
        <View style={styles.container}>
          <Pressable style={styles.backdrop} onPress={onClose} />
          <View
            style={[
              styles.panel,
              { backgroundColor: c.bg, borderLeftColor: c.border, paddingTop: insets.top + 8 },
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
                      onLongPress={() => openRename(item.id, item.title)}
                      delayLongPress={350}
                      style={[styles.threadRow, active && { backgroundColor: c.panel }]}
                    >
                      <Text
                        numberOfLines={1}
                        style={[
                          styles.threadTitle,
                          { color: active ? c.text : c.text, fontWeight: active ? "700" : "400" },
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
                  router.push("/profile");
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
          </View>
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
        <View style={styles.sheetActions}>
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
  backdrop: { flex: 1, backgroundColor: "rgba(0,0,0,0.55)" },
  panel: { width: "86%", maxWidth: 360, height: "100%", borderLeftWidth: StyleSheet.hairlineWidth },
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
  sheetActions: { flexDirection: "row", gap: 8, marginTop: 12 },
  ghostBtn: {
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: 12,
    borderWidth: 1,
  },
  primaryBtn: { paddingHorizontal: 14, paddingVertical: 9, borderRadius: 12 },
});
