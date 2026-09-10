import { Ionicons } from "@expo/vector-icons";
import * as DocumentPicker from "expo-document-picker";
import { useRouter } from "expo-router";
import { useState } from "react";
import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { ProviderDialog, ProviderModelSheet } from "../components/ProviderDialog";
import { getActiveProvider } from "../services/providers";
import { Sheet } from "../components/Sheet";
import { useI18n } from "../i18n";
import { useStore } from "../store";
import { useTheme } from "../theme";
import { exportChatsJson, parseImportedChats, readTextFile } from "../utils/export";
import type { ProviderConfig } from "../types/chat";

function SectionHeader({ icon, label, sub }: { icon: string; label: string; sub?: string }) {
  const { c } = useTheme();
  return (
    <View style={styles.sectionHeader}>
      <Text style={[styles.sectionLabel, { color: c.muted }]}>{label}</Text>
      {sub ? <Text style={[styles.sectionSub, { color: c.muted }]}>{sub}</Text> : null}
    </View>
  );
}

function Divider() {
  const { c } = useTheme();
  return <View style={[styles.divider, { backgroundColor: c.border }]} />;
}

function DataActionRow({
  icon,
  label,
  onPress,
  danger,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  onPress: () => void;
  danger?: boolean;
}) {
  const { c } = useTheme();
  return (
    <Pressable onPress={onPress} style={styles.row}>
      <Ionicons name={icon} size={18} color={danger ? c.danger : c.text} />
      <Text style={{ color: danger ? c.danger : c.text, fontSize: 14, fontWeight: "600", flex: 1 }}>
        {label}
      </Text>
    </Pressable>
  );
}

export function SettingsScreen() {
  const {
    settings,
    removeProvider,
    setActiveProvider,
    threads,
    importThreads,
  } = useStore();
  const { t } = useI18n();
  const { c } = useTheme();
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const [dialogOpen, setDialogOpen] = useState(false);
  const [modelSheetOpen, setModelSheetOpen] = useState(false);
  const [editing, setEditing] = useState<ProviderConfig | null>(null);
  const [confirmRemove, setConfirmRemove] = useState<ProviderConfig | null>(null);

  const activeProvider = getActiveProvider(settings);

  const confirmDelete = () => {
    if (confirmRemove) {
      removeProvider(confirmRemove.id);
    }
    setConfirmRemove(null);
  };

  return (
    <View style={[styles.root, { backgroundColor: c.bg }]}>
      <View
        style={[
          styles.header,
          { backgroundColor: c.surface, borderBottomColor: c.border, paddingTop: insets.top + 6 },
        ]}
      >
        <Pressable onPress={() => router.back()} hitSlop={8} style={styles.headerBtn}>
          <Ionicons name="arrow-back" size={22} color={c.text} />
        </Pressable>
        <Text style={[styles.headerTitle, { color: c.text }]}>{t("common.settings")}</Text>
        <View style={styles.headerBtn} />
      </View>

      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <SectionHeader icon="layers-outline" label={t("settings.defaultModel")} sub={t("settings.defaultModelHint")} />
        <View style={[styles.card, { backgroundColor: c.surface, borderColor: c.border }]}>
          <Pressable onPress={() => setModelSheetOpen(true)} style={styles.row}>
            <Ionicons name="hardware-chip-outline" size={18} color={c.text} />
            <View style={styles.rowBody}>
              <Text style={[styles.rowTitle, { color: c.text }]}>
                {activeProvider?.model || t("settings.modelPlaceholder")}
              </Text>
              <Text style={[styles.rowSub, { color: c.muted }]} numberOfLines={1}>
                {activeProvider?.name}
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={15} color={c.muted} />
          </Pressable>
        </View>

        <SectionHeader icon="cloud" label={t("settings.connection")} sub={t("settings.connectionSub")} />
        <View style={[styles.card, { backgroundColor: c.surface, borderColor: c.border }]}>
          {settings.providers.map((provider, index) => {
            const active = provider.id === settings.activeProviderId;
            return (
              <View key={provider.id}>
                {index > 0 ? <Divider /> : null}
                <Pressable
                  onPress={() => !active && setActiveProvider(provider.id)}
                  style={styles.row}
                >
                  <Pressable
                    onPress={() => !active && setActiveProvider(provider.id)}
                    hitSlop={8}
                    style={styles.rowLeft}
                  >
                    <Ionicons
                      name={active ? "checkmark-circle" : "ellipse-outline"}
                      size={20}
                      color={active ? c.accent : c.muted}
                    />
                  </Pressable>
                  <View style={styles.rowBody}>
                    <View style={styles.rowTitleLine}>
                      <Text style={[styles.rowTitle, { color: c.text }]} numberOfLines={1}>
                        {provider.name}
                      </Text>
                      {active ? (
                        <View style={[styles.badge, { backgroundColor: c.accent + "1f" }]}>
                          <Text style={{ fontSize: 10, fontWeight: "700", color: c.accent }}>
                            {t("settings.active")}
                          </Text>
                        </View>
                      ) : null}
                    </View>
                    <Text style={[styles.rowSub, { color: c.muted }]} numberOfLines={1}>
                      {provider.model} · {provider.apiFormat}
                    </Text>
                  </View>
                  <Pressable
                    onPress={() => {
                      setEditing(provider);
                      setDialogOpen(true);
                    }}
                    hitSlop={6}
                    style={styles.rowAction}
                  >
                    <Ionicons name="pencil-outline" size={16} color={c.muted} />
                  </Pressable>
                  <Pressable
                    onPress={() => setConfirmRemove(provider)}
                    hitSlop={6}
                    style={styles.rowAction}
                  >
                    <Ionicons name="trash-outline" size={16} color={c.muted} />
                  </Pressable>
                </Pressable>
              </View>
            );
          })}
          <Divider />
          <Pressable
            onPress={() => {
              setEditing(null);
              setDialogOpen(true);
            }}
            style={styles.addRow}
          >
            <Ionicons name="add-circle-outline" size={18} color={c.accent} />
            <Text style={{ color: c.accent, fontSize: 14, fontWeight: "600" }}>
              {t("settings.addProvider")}
            </Text>
          </Pressable>
        </View>

        <SectionHeader
          icon="color-palette"
          label={t("profile.appearance")}
          sub={t("settings.appearanceSub")}
        />
        <View style={[styles.card, { backgroundColor: c.surface, borderColor: c.border }]}>
          <Pressable onPress={() => router.push("/profile")} style={styles.row}>
            <Ionicons name="color-palette-outline" size={18} color={c.text} />
            <View style={styles.rowBody}>
              <Text style={[styles.rowTitle, { color: c.text }]}>{t("profile.appearance")}</Text>
              <Text style={[styles.rowSub, { color: c.muted }]}>
                {settings.theme === "dark" ? t("common.dark") : t("common.light")} ·{" "}
                {settings.language === "en" ? t("common.english") : t("common.indonesian")}
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={15} color={c.muted} />
          </Pressable>
        </View>

        <SectionHeader icon="server" label={t("settings.data")} sub={t("settings.dataSub")} />
        <View style={[styles.card, { backgroundColor: c.surface, borderColor: c.border }]}>
          <DataActionRow
            icon="download-outline"
            label={t("settings.exportAll")}
            onPress={() => {
              void exportChatsJson(threads).catch(() => {
                Alert.alert(t("errors.requestFailed"));
              });
            }}
          />
          <Divider />
          <DataActionRow
            icon="cloud-upload-outline"
            label={t("settings.importChats")}
            onPress={() => {
              void (async () => {
                const res = await DocumentPicker.getDocumentAsync({
                  type: "application/json",
                  copyToCacheDirectory: true,
                });
                if (res.canceled || !res.assets?.length) return;
                const raw = await readTextFile(res.assets[0].uri);
                const imported = parseImportedChats(raw);
                if (!imported) {
                  Alert.alert(t("errors.importFailed"));
                  return;
                }
                importThreads(imported);
              })();
            }}
          />
          <Divider />
          <View style={styles.row}>
            <View style={styles.rowBody}>
              <Text style={[styles.rowTitle, { color: c.text }]}>{t("settings.storage")}</Text>
              <Text style={[styles.rowSub, { color: c.muted }]}>{t("settings.storageHint")}</Text>
            </View>
          </View>
        </View>

        <Text style={[styles.version, { color: c.muted }]}>Lumen mobile 0.2.0</Text>
      </ScrollView>

      <ProviderDialog visible={dialogOpen} editing={editing} onClose={() => setDialogOpen(false)} />
      {activeProvider ? (
        <ProviderModelSheet
          provider={activeProvider}
          visible={modelSheetOpen}
          onClose={() => setModelSheetOpen(false)}
        />
      ) : null}

      <Sheet visible={confirmRemove !== null} title={t("message.delete")} onClose={() => setConfirmRemove(null)}>
        <Text style={{ color: c.muted, fontSize: 14, marginBottom: 14 }}>
          {t("settings.editProvider")} — {confirmRemove?.name}
        </Text>
        <View style={styles.sheetActions}>
          <Pressable
            onPress={() => setConfirmRemove(null)}
            style={[styles.ghostBtn, { borderColor: c.border }]}
          >
            <Text style={{ color: c.muted, fontSize: 13 }}>{t("common.cancel")}</Text>
          </Pressable>
          <Pressable
            onPress={confirmDelete}
            style={[styles.dangerBtn, { backgroundColor: c.danger }]}
          >
            <Text style={{ color: "#ffffff", fontSize: 13, fontWeight: "600" }}>
              {t("common.remove")}
            </Text>
          </Pressable>
        </View>
      </Sheet>
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
  headerBtn: { padding: 8, width: 38 },
  headerTitle: { flex: 1, textAlign: "center", fontSize: 15, fontWeight: "600" },
  content: { padding: 14, paddingBottom: 40 },
  sectionHeader: { marginTop: 14, marginBottom: 6, paddingHorizontal: 2 },
  sectionLabel: { fontSize: 11, fontWeight: "700", textTransform: "uppercase", letterSpacing: 0.5 },
  sectionSub: { fontSize: 12, marginTop: 2 },
  card: { borderRadius: 16, borderWidth: 1, overflow: "hidden" },
  divider: { height: StyleSheet.hairlineWidth, marginHorizontal: 12 },
  row: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 11,
    gap: 6,
  },
  rowLeft: { paddingVertical: 2 },
  rowBody: { flex: 1 },
  rowTitleLine: { flexDirection: "row", alignItems: "center", gap: 6 },
  rowTitle: { fontSize: 14, fontWeight: "600" },
  rowSub: { fontSize: 12, marginTop: 2 },
  badge: { borderRadius: 8, paddingHorizontal: 6, paddingVertical: 2 },
  rowAction: { padding: 4 },
  addRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 11,
  },
  version: { textAlign: "center", fontSize: 11, marginTop: 18 },
  sheetActions: { flexDirection: "row", gap: 8, marginTop: 12, justifyContent: "flex-end" },
  ghostBtn: { paddingHorizontal: 14, paddingVertical: 9, borderRadius: 12, borderWidth: 1 },
  dangerBtn: { paddingHorizontal: 14, paddingVertical: 9, borderRadius: 12 },
});