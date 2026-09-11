import { Ionicons } from "@expo/vector-icons";
import * as DocumentPicker from "expo-document-picker";
import { useRouter } from "expo-router";
import { useState } from "react";
import { Alert, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { ProviderDialog, ProviderModelSheet } from "../components/ProviderDialog";
import { Sheet } from "../components/Sheet";
import { getActiveProvider } from "../services/providers";
import { useI18n } from "../i18n";
import { useStore } from "../store";
import { ACCENT_PRESETS, useTheme } from "../theme";
import { exportChatsJson, parseImportedChats, readTextFile } from "../utils/export";
import type { ProviderConfig, ProviderId, ThemeMode } from "../types/chat";

const PROVIDER_COLORS: Record<ProviderId, string> = {
  "opencode-go": "#34d399",
  openai: "#10a37f",
  "xiaomi-mimo": "#ff6900",
  anthropic: "#d97757",
  openrouter: "#6c5ce7",
  ollama: "#94a3b8",
  custom: "#4f8cff",
};

function initialsOf(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (!parts.length) return "L";
  return (parts[0][0] + (parts[1]?.[0] ?? "")).toUpperCase();
}

function SectionLabel({ children }: { children: string }) {
  const { c } = useTheme();
  return <Text style={[styles.sectionLabel, { color: c.muted }]}>{children}</Text>;
}

function Divider() {
  const { c } = useTheme();
  return <View style={[styles.divider, { backgroundColor: c.border }]} />;
}

function Segment({
  options,
  value,
  onChange,
}: {
  options: { key: string; label: string }[];
  value: string;
  onChange: (key: string) => void;
}) {
  const { c } = useTheme();
  return (
    <View style={[styles.segment, { backgroundColor: c.input, borderColor: c.border }]}>
      {options.map((opt) => {
        const on = opt.key === value;
        return (
          <Pressable
            key={opt.key}
            onPress={() => onChange(opt.key)}
            style={[styles.segmentBtn, on && { backgroundColor: c.accent }]}
          >
            <Text
              style={{
                fontSize: 12,
                fontWeight: "600",
                color: on ? c.onAccent : c.muted,
              }}
            >
              {opt.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

export function SettingsScreen() {
  const {
    settings,
    updateSettings,
    removeProvider,
    setActiveProvider,
    threads,
    importThreads,
    clearAllChats,
  } = useStore();
  const { t } = useI18n();
  const { c } = useTheme();
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const [dialogOpen, setDialogOpen] = useState(false);
  const [modelSheetOpen, setModelSheetOpen] = useState(false);
  const [editing, setEditing] = useState<ProviderConfig | null>(null);
  const [confirmRemove, setConfirmRemove] = useState<ProviderConfig | null>(null);
  const [confirmClear, setConfirmClear] = useState(false);
  const [aboutOpen, setAboutOpen] = useState(false);
  const [nameEditing, setNameEditing] = useState(false);
  const [nameDraft, setNameDraft] = useState(settings.profileName ?? "");

  const activeProvider = getActiveProvider(settings);
  const displayName = settings.profileName?.trim() || "Lumen";
  const accent = settings.accent ?? c.accent;

  const openNameEdit = () => {
    setNameDraft(settings.profileName ?? "");
    setNameEditing(true);
  };

  const saveName = () => {
    updateSettings({ profileName: nameDraft.trim() });
    setNameEditing(false);
  };

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
          {
            backgroundColor: c.bg,
            paddingTop: insets.top + 6,
          },
        ]}
      >
        <Pressable onPress={() => router.back()} hitSlop={8} style={styles.headerBtn}>
          <Ionicons name="arrow-back" size={22} color={c.text} />
        </Pressable>
        <Text style={[styles.headerTitle, { color: c.text }]}>{t("common.settings")}</Text>
        <View style={styles.headerBtn} />
      </View>

      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <Pressable onPress={openNameEdit} style={styles.hero}>
          <View style={[styles.avatar, { backgroundColor: c.accent }]}>
            <Text style={[styles.avatarText, { color: c.onAccent }]}>{initialsOf(displayName)}</Text>
          </View>
          <View style={styles.heroBody}>
            <View style={styles.heroNameLine}>
              <Text style={[styles.heroName, { color: c.text }]}>{displayName}</Text>
              <Ionicons name="create-outline" size={14} color={c.muted} />
            </View>
            <Text style={[styles.heroSub, { color: c.muted }]}>
              {t("settings.heroMeta", {
                p: settings.providers.length,
                c: threads.length,
              })}
            </Text>
          </View>
        </Pressable>

        <Pressable
          onPress={() => setModelSheetOpen(true)}
          style={[styles.modelCard, { backgroundColor: c.surface, borderColor: c.accent + "55" }]}
        >
          <Text style={[styles.modelKicker, { color: c.accent }]}>{t("settings.defaultModel")}</Text>
          <Text style={[styles.modelName, { color: c.text }]} numberOfLines={1}>
            {activeProvider?.model || t("settings.modelPlaceholder")}
          </Text>
          <View style={styles.modelMeta}>
            <Text style={[styles.modelProvider, { color: c.muted }]} numberOfLines={1}>
              {activeProvider?.name || "—"}
            </Text>
            <View style={[styles.switchPill, { backgroundColor: c.accent + "1f" }]}>
              <Text style={{ fontSize: 12, fontWeight: "700", color: c.accent }}>
                {t("settings.change")}
              </Text>
            </View>
          </View>
        </Pressable>

        <SectionLabel>{t("settings.aiProviders")}</SectionLabel>
        <View style={[styles.card, { backgroundColor: c.surface, borderColor: c.border }]}>
          {settings.providers.map((provider, index) => {
            const active = provider.id === settings.activeProviderId;
            const letter = (provider.name?.trim()?.[0] || "P").toUpperCase();
            const logo = PROVIDER_COLORS[provider.kind] ?? c.accent;
            return (
              <View key={provider.id}>
                {index > 0 ? <Divider /> : null}
                <Pressable
                  onPress={() => !active && setActiveProvider(provider.id)}
                  style={styles.providerRow}
                >
                  <View
                    style={[
                      styles.providerLogo,
                      {
                        backgroundColor: logo,
                        borderWidth: active ? 2 : 0,
                        borderColor: c.accent,
                      },
                    ]}
                  >
                    <Text style={styles.providerLetter}>{letter}</Text>
                  </View>
                  <View style={styles.rowBody}>
                    <Text style={[styles.rowTitle, { color: c.text }]} numberOfLines={1}>
                      {provider.name}
                    </Text>
                    <Text style={[styles.rowSub, { color: c.muted }]} numberOfLines={1}>
                      {provider.model} · {provider.apiFormat}
                    </Text>
                  </View>
                  {active ? (
                    <Ionicons name="checkmark-circle" size={20} color={c.accent} />
                  ) : null}
                  <Pressable
                    onPress={() => {
                      setEditing(provider);
                      setDialogOpen(true);
                    }}
                    hitSlop={8}
                    style={styles.rowAction}
                  >
                    <Ionicons name="pencil-outline" size={15} color={c.muted} />
                  </Pressable>
                  <Pressable
                    onPress={() => setConfirmRemove(provider)}
                    hitSlop={8}
                    style={styles.rowAction}
                  >
                    <Ionicons name="trash-outline" size={15} color={c.muted} />
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

        <SectionLabel>{t("profile.appearance")}</SectionLabel>
        <View style={[styles.card, { backgroundColor: c.surface, borderColor: c.border }]}>
          <View style={styles.inlineRow}>
            <Text style={[styles.rowTitle, { color: c.text }]}>{t("settings.theme")}</Text>
            <Segment
              options={[
                { key: "dark", label: t("common.dark") },
                { key: "light", label: t("common.light") },
              ]}
              value={settings.theme}
              onChange={(key) => updateSettings({ theme: key as ThemeMode })}
            />
          </View>
          <Divider />
          <View style={styles.inlineRow}>
            <Text style={[styles.rowTitle, { color: c.text }]}>{t("profile.accent")}</Text>
            <View style={styles.dots}>
              {ACCENT_PRESETS.map((preset) => (
                <Pressable
                  key={preset.hex}
                  onPress={() => updateSettings({ accent: preset.hex })}
                  style={[
                    styles.dot,
                    { backgroundColor: preset.hex },
                    accent === preset.hex && styles.dotSelected,
                  ]}
                />
              ))}
            </View>
          </View>
          <Divider />
          <View style={styles.inlineRow}>
            <Text style={[styles.rowTitle, { color: c.text }]}>{t("settings.language")}</Text>
            <Segment
              options={[
                { key: "id", label: "ID" },
                { key: "en", label: "EN" },
              ]}
              value={settings.language}
              onChange={(key) => updateSettings({ language: key as "id" | "en" })}
            />
          </View>
        </View>

        <SectionLabel>{t("settings.data")}</SectionLabel>
        <View style={styles.tileGrid}>
          <Pressable
            onPress={() => {
              void exportChatsJson(threads).catch(() => {
                Alert.alert(t("errors.requestFailed"));
              });
            }}
            style={[styles.tile, { backgroundColor: c.surface, borderColor: c.border }]}
          >
            <Ionicons name="download-outline" size={18} color={c.text} />
            <Text style={[styles.tileLabel, { color: c.text }]}>{t("settings.exportAll")}</Text>
            <Text style={[styles.tileSub, { color: c.muted }]}>{t("settings.exportHint")}</Text>
          </Pressable>
          <Pressable
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
            style={[styles.tile, { backgroundColor: c.surface, borderColor: c.border }]}
          >
            <Ionicons name="cloud-upload-outline" size={18} color={c.text} />
            <Text style={[styles.tileLabel, { color: c.text }]}>{t("settings.importChats")}</Text>
            <Text style={[styles.tileSub, { color: c.muted }]}>{t("settings.importHint")}</Text>
          </Pressable>
          <Pressable
            onPress={() => setConfirmClear(true)}
            style={[styles.tile, { backgroundColor: c.surface, borderColor: c.border }]}
          >
            <Ionicons name="trash-outline" size={18} color={c.danger} />
            <Text style={[styles.tileLabel, { color: c.danger }]}>{t("profile.clearAll")}</Text>
            <Text style={[styles.tileSub, { color: c.muted }]}>{t("settings.clearHint")}</Text>
          </Pressable>
          <Pressable
            onPress={() => setAboutOpen(true)}
            style={[styles.tile, { backgroundColor: c.surface, borderColor: c.border }]}
          >
            <Ionicons name="information-circle-outline" size={18} color={c.text} />
            <Text style={[styles.tileLabel, { color: c.text }]}>{t("profile.about")}</Text>
            <Text style={[styles.tileSub, { color: c.muted }]}>{t("profile.aboutSub")}</Text>
          </Pressable>
        </View>

        <Text style={[styles.version, { color: c.muted }]}>Lumen mobile 0.3.0</Text>
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
          <Pressable onPress={() => setConfirmRemove(null)} style={[styles.ghostBtn, { borderColor: c.border }]}>
            <Text style={{ color: c.muted, fontSize: 13 }}>{t("common.cancel")}</Text>
          </Pressable>
          <Pressable onPress={confirmDelete} style={[styles.dangerBtn, { backgroundColor: c.danger }]}>
            <Text style={{ color: "#ffffff", fontSize: 13, fontWeight: "600" }}>{t("common.remove")}</Text>
          </Pressable>
        </View>
      </Sheet>

      <Sheet visible={confirmClear} title={t("profile.clearAll")} onClose={() => setConfirmClear(false)}>
        <Text style={{ color: c.muted, fontSize: 14, marginBottom: 14 }}>{t("profile.clearAllConfirm")}</Text>
        <View style={styles.sheetActions}>
          <Pressable onPress={() => setConfirmClear(false)} style={[styles.ghostBtn, { borderColor: c.border }]}>
            <Text style={{ color: c.muted, fontSize: 13 }}>{t("common.cancel")}</Text>
          </Pressable>
          <Pressable
            onPress={() => {
              setConfirmClear(false);
              clearAllChats();
            }}
            style={[styles.dangerBtn, { backgroundColor: c.danger }]}
          >
            <Text style={{ color: "#ffffff", fontSize: 13, fontWeight: "600" }}>{t("common.remove")}</Text>
          </Pressable>
        </View>
      </Sheet>

      <Sheet visible={nameEditing} title={t("profile.name")} onClose={() => setNameEditing(false)}>
        <Text style={{ color: c.muted, fontSize: 12, marginBottom: 8 }}>{t("profile.nameHint")}</Text>
        <TextInput
          value={nameDraft}
          onChangeText={setNameDraft}
          autoFocus
          placeholder="Atha"
          placeholderTextColor={c.muted}
          style={[styles.input, { color: c.text, backgroundColor: c.input, borderColor: c.border }]}
        />
        <View style={styles.sheetActions}>
          <Pressable onPress={() => setNameEditing(false)} style={[styles.ghostBtn, { borderColor: c.border }]}>
            <Text style={{ color: c.muted, fontSize: 13 }}>{t("common.cancel")}</Text>
          </Pressable>
          <Pressable onPress={saveName} style={[styles.primaryBtn, { backgroundColor: c.accent }]}>
            <Text style={{ color: c.onAccent, fontSize: 13, fontWeight: "600" }}>{t("common.save")}</Text>
          </Pressable>
        </View>
      </Sheet>

      <Sheet visible={aboutOpen} title={t("profile.about")} onClose={() => setAboutOpen(false)}>
        <Text style={{ color: c.text, fontSize: 15, fontWeight: "700", marginBottom: 6 }}>Lumen mobile</Text>
        <Text style={{ color: c.muted, fontSize: 13, lineHeight: 20, marginBottom: 12 }}>
          {t("profile.aboutSub")}
        </Text>
        <Text style={{ color: c.muted, fontSize: 12, marginBottom: 16 }}>{t("settings.storageHint")}</Text>
        <View style={styles.sheetActions}>
          <Pressable onPress={() => setAboutOpen(false)} style={[styles.primaryBtn, { backgroundColor: c.accent }]}>
            <Text style={{ color: c.onAccent, fontSize: 13, fontWeight: "600" }}>{t("common.close")}</Text>
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
    paddingBottom: 4,
    paddingHorizontal: 8,
  },
  headerBtn: { padding: 8, width: 38 },
  headerTitle: { flex: 1, textAlign: "center", fontSize: 15, fontWeight: "600" },
  content: { paddingHorizontal: 14, paddingBottom: 40 },
  hero: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingHorizontal: 4,
    paddingVertical: 10,
    marginBottom: 6,
  },
  avatar: {
    width: 52,
    height: 52,
    borderRadius: 26,
    alignItems: "center",
    justifyContent: "center",
  },
  avatarText: { fontSize: 20, fontWeight: "800" },
  heroBody: { flex: 1 },
  heroNameLine: { flexDirection: "row", alignItems: "center", gap: 6 },
  heroName: { fontSize: 18, fontWeight: "700" },
  heroSub: { fontSize: 12, marginTop: 2 },
  modelCard: {
    borderRadius: 18,
    borderWidth: 1,
    padding: 14,
    marginBottom: 4,
  },
  modelKicker: {
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 0.5,
    textTransform: "uppercase",
  },
  modelName: { fontSize: 16, fontWeight: "700", marginTop: 4 },
  modelMeta: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: 10,
    gap: 10,
  },
  modelProvider: { flex: 1, fontSize: 12 },
  switchPill: { borderRadius: 999, paddingHorizontal: 12, paddingVertical: 6 },
  sectionLabel: {
    fontSize: 11,
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginTop: 18,
    marginBottom: 8,
    paddingHorizontal: 4,
  },
  card: { borderRadius: 16, borderWidth: 1, overflow: "hidden" },
  divider: { height: StyleSheet.hairlineWidth },
  providerRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingHorizontal: 12,
    paddingVertical: 11,
  },
  providerLogo: {
    width: 36,
    height: 36,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  providerLetter: { color: "#fff", fontSize: 13, fontWeight: "800" },
  rowBody: { flex: 1, minWidth: 0 },
  rowTitle: { fontSize: 14, fontWeight: "600" },
  rowSub: { fontSize: 12, marginTop: 2 },
  rowAction: { padding: 6 },
  addRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 12,
    paddingVertical: 12,
  },
  inlineRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 10,
    paddingHorizontal: 12,
    paddingVertical: 12,
  },
  segment: {
    flexDirection: "row",
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
    padding: 2,
    gap: 2,
  },
  segmentBtn: { paddingHorizontal: 12, paddingVertical: 7, borderRadius: 9 },
  dots: { flexDirection: "row", gap: 8, alignItems: "center" },
  dot: { width: 18, height: 18, borderRadius: 9 },
  dotSelected: {
    borderWidth: 2,
    borderColor: "#ededed",
  },
  tileGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  tile: {
    width: "48%",
    flexGrow: 1,
    borderRadius: 14,
    borderWidth: 1,
    padding: 14,
    gap: 8,
  },
  tileLabel: { fontSize: 13, fontWeight: "600" },
  tileSub: { fontSize: 11, lineHeight: 15 },
  version: { textAlign: "center", fontSize: 11, marginTop: 20 },
  sheetActions: { flexDirection: "row", gap: 8, marginTop: 12, justifyContent: "flex-end" },
  ghostBtn: { paddingHorizontal: 14, paddingVertical: 9, borderRadius: 12, borderWidth: 1 },
  dangerBtn: { paddingHorizontal: 14, paddingVertical: 9, borderRadius: 12 },
  primaryBtn: { paddingHorizontal: 14, paddingVertical: 9, borderRadius: 12 },
  input: {
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 9,
    fontSize: 14,
    borderWidth: StyleSheet.hairlineWidth,
  },
});
