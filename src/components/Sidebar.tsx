import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useState } from "react";
import { FlatList, Modal, Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useI18n } from "../i18n";
import { useStore } from "../store";
import { useTheme } from "../theme";
import { Sheet } from "./Sheet";

function formatDate(ts: number): string {
  return new Date(ts).toLocaleDateString(undefined, { day: "numeric", month: "short" });
}

/** Drawer riwayat chat: daftar thread, buat baru, rename, hapus, ke Settings. */
export function Sidebar({ open, onClose }: { open: boolean; onClose: () => void }) {
  const {
    threads,
    activeThreadId,
    createThread,
    deleteThread,
    renameThread,
    setActiveThread,
  } = useStore();
  const { t } = useI18n();
  const { c } = useTheme();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [renameId, setRenameId] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState("");
  const [deleteId, setDeleteId] = useState<string | null>(null);

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

  return (
    <>
      <Modal transparent visible={open} animationType="fade" onRequestClose={onClose}>
        <View style={styles.container}>
          <Pressable style={styles.backdrop} onPress={onClose} />
          <View
            style={[
              styles.panel,
              { backgroundColor: c.surface, borderLeftColor: c.border, paddingTop: insets.top + 8 },
            ]}
          >
            <View style={styles.header}>
              <Text style={[styles.logo, { color: c.text }]}>Lumen</Text>
              <Pressable
                onPress={() => {
                  createThread();
                  onClose();
                }}
                style={[styles.newBtn, { backgroundColor: c.accent }]}
              >
                <Ionicons name="add" size={16} color={c.onAccent} />
                <Text style={[styles.newBtnText, { color: c.onAccent }]}>
                  {t("common.newChat")}
                </Text>
              </Pressable>
            </View>
            <FlatList
              data={threads}
              keyExtractor={(item) => item.id}
              contentContainerStyle={styles.list}
              ListEmptyComponent={
                <Text style={[styles.empty, { color: c.muted }]}>{t("sidebar.noMessages")}</Text>
              }
              renderItem={({ item }) => {
                const active = item.id === activeThreadId;
                return (
                  <Pressable
                    onPress={() => {
                      setActiveThread(item.id);
                      onClose();
                    }}
                    style={[
                      styles.threadRow,
                      { backgroundColor: active ? c.panel : "transparent" },
                    ]}
                  >
                    <View style={styles.threadInfo}>
                      <Text
                        numberOfLines={1}
                        style={[
                          styles.threadTitle,
                          { color: c.text, fontWeight: active ? "600" : "400" },
                        ]}
                      >
                        {item.title}
                      </Text>
                      <Text style={[styles.threadMeta, { color: c.muted }]}>
                        {item.messages.length} msg · {formatDate(item.updatedAt)}
                      </Text>
                    </View>
                    <Pressable hitSlop={6} onPress={() => openRename(item.id, item.title)} style={styles.iconBtn}>
                      <Ionicons name="pencil-outline" size={15} color={c.muted} />
                    </Pressable>
                    <Pressable hitSlop={6} onPress={() => setDeleteId(item.id)} style={styles.iconBtn}>
                      <Ionicons name="trash-outline" size={15} color={c.muted} />
                    </Pressable>
                  </Pressable>
                );
              }}
            />
            <Pressable
              onPress={() => {
                onClose();
                router.push("/settings");
              }}
              style={[styles.footer, { borderTopColor: c.border }]}
            >
              <Ionicons name="settings-outline" size={18} color={c.muted} />
              <Text style={{ color: c.text, fontSize: 14 }}>{t("common.settings")}</Text>
            </Pressable>
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
            onPress={() => setRenameId(null)}
            style={[styles.ghostBtn, { borderColor: c.border }]}
          >
            <Text style={{ color: c.muted, fontSize: 13 }}>{t("common.cancel")}</Text>
          </Pressable>
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
  backdrop: { flex: 1, backgroundColor: "rgba(0,0,0,0.5)" },
  panel: { width: "82%", maxWidth: 340, height: "100%", borderLeftWidth: 1 },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingBottom: 12,
  },
  logo: { fontSize: 18, fontWeight: "800" },
  newBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    borderRadius: 14,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  newBtnText: { fontSize: 12, fontWeight: "600" },
  list: { paddingHorizontal: 10, paddingBottom: 12 },
  empty: { textAlign: "center", marginTop: 24, fontSize: 13 },
  threadRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 10,
    paddingHorizontal: 10,
    borderRadius: 12,
  },
  threadInfo: { flex: 1 },
  threadTitle: { fontSize: 14 },
  threadMeta: { fontSize: 11, marginTop: 2 },
  iconBtn: { padding: 5 },
  footer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  input: {
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 9,
    fontSize: 14,
    borderWidth: StyleSheet.hairlineWidth,
  },
  sheetActions: { flexDirection: "row", gap: 8, marginTop: 12, justifyContent: "flex-end" },
  ghostBtn: {
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: 12,
    borderWidth: 1,
  },
  primaryBtn: { paddingHorizontal: 14, paddingVertical: 9, borderRadius: 12 },
});