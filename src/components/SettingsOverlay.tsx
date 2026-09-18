import { Ionicons } from "@expo/vector-icons";
import * as DocumentPicker from "expo-document-picker";
import { useState } from "react";
import { Alert, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { FrameModal } from "./FrameModal";
import { ModelSheet } from "./ModelSheet";
import { ProviderDialog } from "./ProviderDialog";
import { Sheet } from "./Sheet";
import {
  Button,
  Divider,
  IconButton,
  Panel,
  ProviderMark,
  Row,
  SectionLabel,
  Segmented,
  StatusDot,
  Touch,
} from "./ui";
import { useI18n } from "../i18n";
import { getActiveProvider } from "../services/providers";
import { testProviderConnection } from "../services/ai";
import { useStore } from "../store";
import {
  ACCENT_PRESETS,
  accentValue,
  inkOn,
  R,
  SP,
  useTheme,
} from "../theme";
import { TXT } from "../fonts";
import { exportChatsJson, parseImportedChats, readTextFile } from "../utils/export";
import type { ProviderConfig, ThemeMode } from "../types/chat";

type View_ = "main" | "provider";

function maskKey(key: string): string {
  if (!key) {
    return "—";
  }
  if (key.length <= 8) {
    return `${key.slice(0, 4)}····`;
  }
  return `${key.slice(0, 4)}${"·".repeat(Math.min(key.length - 4, 24))}`;
}

/**
 * Settings — the single configuration surface.
 *
 * There used to be two of these, disagreeing on theme controls, provider
 * colours and which actions existed at all. This is the one. Every row either
 * does something or is not a row.
 */
export function SettingsOverlay({
  visible,
  onClose,
}: {
  visible: boolean;
  onClose: () => void;
}) {
  const {
    settings,
    updateSettings,
    setActiveProvider,
    removeProvider,
    setThinking,
    threads,
    importThreads,
    clearAllChats,
  } = useStore();
  const { c, theme } = useTheme();
  const { t } = useI18n();
  const insets = useSafeAreaInsets();

  const [view, setView] = useState<View_>("main");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<ProviderConfig | null>(null);
  // Each open remounts the provider form so it starts clean from its props.
  const [dialogSession, setDialogSession] = useState(0);
  const [modelOpen, setModelOpen] = useState(false);
  const [nameOpen, setNameOpen] = useState(false);
  const [nameDraft, setNameDraft] = useState("");
  const [manageProvider, setManageProvider] = useState<ProviderConfig | null>(null);
  const [confirmRemove, setConfirmRemove] = useState<ProviderConfig | null>(null);
  const [confirmClear, setConfirmClear] = useState(false);
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<string | null>(null);

  const provider = getActiveProvider(settings);
  const thinkingOn = (provider?.thinking ?? "off") !== "off";
  const profileName = settings.profileName?.trim() || "";
  const activeAccent = settings.accent ?? c.accent;
  const activePreset = ACCENT_PRESETS.find(
    (preset) => accentValue(preset, theme).toLowerCase() === activeAccent.toLowerCase(),
  );

  const openDialog = (target: ProviderConfig | null) => {
    setEditing(target);
    setDialogSession((s) => s + 1);
    setDialogOpen(true);
  };

  const runTest = async () => {
    setTesting(true);
    setTestResult(null);
    try {
      const res = await testProviderConnection(
        {
          baseUrl: provider.baseUrl,
          apiKey: provider.apiKey,
          model: provider.model,
          apiFormat: provider.apiFormat,
        },
        settings.language,
      );
      setTestResult(res.message);
    } catch (error) {
      setTestResult(error instanceof Error ? error.message : t("settings.testFail"));
    } finally {
      setTesting(false);
    }
  };

  const importChats = async () => {
    const res = await DocumentPicker.getDocumentAsync({
      type: "application/json",
      copyToCacheDirectory: true,
    });
    if (res.canceled || !res.assets?.length) {
      return;
    }
    const raw = await readTextFile(res.assets[0].uri);
    const imported = parseImportedChats(raw);
    if (!imported) {
      Alert.alert(t("errors.importFailed"));
      return;
    }
    importThreads(imported);
  };

  const testOk = testResult
    ? !/fail|gagal|tidak bisa|could not|cannot/i.test(testResult)
    : false;

  return (
    <FrameModal
      visible={visible}
      animationType="slide"
      presentationStyle="fullScreen"
      onRequestClose={onClose}
      label={t("common.settings")}
    >
      <View style={[styles.root, { backgroundColor: c.bg }]}>
        {/* Header bar */}
        <View
          style={[
            styles.header,
            {
              paddingTop: insets.top + SP.sm,
              borderBottomColor: c.border,
              backgroundColor: c.bg,
            },
          ]}
        >
          <IconButton
            icon={view === "main" ? "close" : "arrow-back"}
            onPress={view === "main" ? onClose : () => setView("main")}
            label={view === "main" ? t("common.close") : t("common.back")}
            tone="text"
          />
          <View style={styles.headerText}>
            <Text style={[TXT.label, { color: c.faint }]}>
              {view === "main" ? t("common.settings") : t("settings.providers")}
            </Text>
            <Text style={[TXT.title, { color: c.text }]} numberOfLines={1}>
              {view === "main" ? t("settings.panelTitle") : provider?.name ?? "—"}
            </Text>
          </View>
          {view === "provider" ? (
            <IconButton
              icon="add"
              onPress={() => openDialog(null)}
              label={t("settings.addProvider")}
              tone="accent"
            />
          ) : (
            <View style={styles.headerSpacer} />
          )}
        </View>

        <ScrollView
          style={styles.scroll}
          contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + SP.macro }]}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {view === "main" ? (
            <>
              <SectionLabel style={styles.section}>
                {t("settings.routing")}
              </SectionLabel>
              <Panel>
                <Row
                  label={t("settings.providerAndKey")}
                  desc={`${provider?.name ?? "—"}  ·  ${maskKey(provider?.apiKey ?? "")}`}
                  value={provider?.apiFormat === "anthropic" ? "Anthropic" : "OpenAI"}
                  onPress={() => setView("provider")}
                />
                <Divider />
                <Row
                  label={t("settings.defaultModel")}
                  desc={provider?.model || t("settings.modelPlaceholder")}
                  onPress={() => setModelOpen(true)}
                />
                <Divider />
                <View style={styles.controlRow}>
                  <Text style={[TXT.body, { color: c.text, flex: 1 }]}>
                    {t("model.reasoning")}
                  </Text>
                  <Segmented
                    label={t("model.reasoning")}
                    options={[
                      { key: "off", label: t("chat.thinkingOff") },
                      { key: "max", label: t("chat.thinkingOn") },
                    ]}
                    value={thinkingOn ? "max" : "off"}
                    onChange={(key) => setThinking(key === "max" ? "max" : "off")}
                  />
                </View>
              </Panel>

              <SectionLabel style={styles.section}>
                {t("profile.appearance")}
              </SectionLabel>
              <Panel>
                <View style={styles.controlRow}>
                  <Text style={[TXT.body, { color: c.text, flex: 1 }]}>
                    {t("settings.theme")}
                  </Text>
                  <Segmented
                    label={t("settings.theme")}
                    options={[
                      { key: "dark", label: t("common.dark") },
                      { key: "light", label: t("common.light") },
                    ]}
                    value={settings.theme}
                    onChange={(key) => updateSettings({ theme: key as ThemeMode })}
                  />
                </View>
                <Divider />
                <View style={styles.accentBlock}>
                  <View style={styles.accentHead}>
                    <Text style={[TXT.body, { color: c.text }]}>{t("profile.accent")}</Text>
                    <Text style={[TXT.label, { color: c.faint }]}>
                      {activePreset
                        ? t(`accent.${activePreset.key}` as never)
                        : t("settings.accentCustom")}
                    </Text>
                  </View>
                  <View style={styles.swatches}>
                    {ACCENT_PRESETS.map((preset) => {
                      const value = accentValue(preset, theme);
                      const selected = activeAccent.toLowerCase() === value.toLowerCase();
                      return (
                        <Touch
                          key={preset.key}
                          onPress={() => updateSettings({ accent: value })}
                          label={t(`accent.${preset.key}` as never)}
                          role="radio"
                          state={{ selected }}
                          style={styles.swatchTarget}
                          press={{ opacity: 0.75 }}
                        >
                          <View
                            style={[
                              styles.swatch,
                              { backgroundColor: value },
                              selected ? { borderColor: c.text } : null,
                            ]}
                          >
                            {selected ? (
                              <Ionicons name="checkmark" size={14} color={inkOn(value)} />
                            ) : null}
                          </View>
                        </Touch>
                      );
                    })}
                  </View>
                </View>
                <Divider />
                <View style={styles.controlRow}>
                  <Text style={[TXT.body, { color: c.text, flex: 1 }]}>
                    {t("settings.language")}
                  </Text>
                  <Segmented
                    label={t("settings.language")}
                    options={[
                      { key: "id", label: "ID" },
                      { key: "en", label: "EN" },
                    ]}
                    value={settings.language}
                    onChange={(key) => updateSettings({ language: key as "id" | "en" })}
                  />
                </View>
              </Panel>

              <SectionLabel style={styles.section}>{t("settings.identity")}</SectionLabel>
              <Panel>
                <Row
                  label={t("profile.name")}
                  desc={profileName || t("profile.nameUnset")}
                  onPress={() => {
                    setNameDraft(settings.profileName ?? "");
                    setNameOpen(true);
                  }}
                />
              </Panel>

              <SectionLabel style={styles.section}>{t("settings.data")}</SectionLabel>
              <Panel>
                <Row
                  label={t("settings.exportAll")}
                  desc={t("settings.exportHint")}
                  onPress={() =>
                    void exportChatsJson(threads).catch(() => Alert.alert(t("errors.requestFailed")))
                  }
                  right={<Ionicons name="download-outline" size={18} color={c.muted} />}
                />
                <Divider />
                <Row
                  label={t("settings.importChats")}
                  desc={t("settings.importHint")}
                  onPress={() => void importChats()}
                  right={<Ionicons name="cloud-upload-outline" size={18} color={c.muted} />}
                />
                <Divider />
                <Row
                  tone="danger"
                  label={t("profile.clearAll")}
                  desc={t("settings.clearHint")}
                  onPress={() => setConfirmClear(true)}
                  right={<Ionicons name="trash-outline" size={18} color={c.danger} />}
                />
              </Panel>

              <SectionLabel style={styles.section}>{t("profile.about")}</SectionLabel>
              <Panel>
                <Row label="Lumen mobile" value="0.3.0" />
                <Divider />
                <Row label={t("settings.storage")} desc={t("settings.storageHint")} />
              </Panel>
            </>
          ) : (
            <>
              <SectionLabel style={styles.section}>{t("settings.providers")}</SectionLabel>
              <Panel>
                {settings.providers.map((p, i) => {
                  const active = p.id === settings.activeProviderId;
                  return (
                    <View key={p.id}>
                      {i > 0 ? <Divider /> : null}
                      <View style={styles.providerRow}>
                        <View
                          style={[
                            styles.providerRule,
                            { backgroundColor: active ? c.accent : "transparent" },
                          ]}
                        />
                        <Touch
                          onPress={() => setActiveProvider(p.id)}
                          disabled={active}
                          label={`${t("settings.useProvider")} ${p.name}`}
                          style={styles.providerMain}
                          hover={{ backgroundColor: c.panel }}
                          press={{ backgroundColor: c.panel }}
                        >
                          <ProviderMark kind={p.kind} name={p.name} size={26} />
                          <View style={styles.providerText}>
                            <Text style={[TXT.body, { color: c.text }]} numberOfLines={1}>
                              {p.name}
                            </Text>
                            <Text style={[TXT.readoutSm, { color: c.faint, marginTop: 3 }]} numberOfLines={1}>
                              {p.model || t("settings.modelPlaceholder")}
                            </Text>
                          </View>
                          {active ? (
                            <Text style={[TXT.label, { color: c.accent }]}>
                              {t("settings.active")}
                            </Text>
                          ) : null}
                        </Touch>
                        <IconButton
                          icon="ellipsis-horizontal"
                          size={34}
                          onPress={() => setManageProvider(p)}
                          label={`${t("settings.manageProvider")} — ${p.name}`}
                        />
                      </View>
                    </View>
                  );
                })}
              </Panel>

              <View style={styles.providerAction}>
                <Button
                  label={t("settings.addProvider")}
                  icon="add"
                  variant="ghost"
                  wide
                  onPress={() => openDialog(null)}
                />
              </View>

              <SectionLabel style={styles.section}>{t("settings.connection")}</SectionLabel>
              <Panel>
                <Row
                  label={testing ? t("settings.testing") : t("settings.testConnection")}
                  desc={provider?.name}
                  onPress={() => void runTest()}
                  right={
                    testing ? (
                      <StatusDot state="idle" />
                    ) : (
                      <Ionicons name="flash-outline" size={18} color={c.accent} />
                    )
                  }
                />
                {testResult ? (
                  <View style={[styles.testRow, { borderTopColor: c.border }]}>
                    <StatusDot state={testOk ? "live" : "error"} />
                    <Text style={[TXT.small, { color: c.text, flex: 1 }]}>{testResult}</Text>
                  </View>
                ) : null}
              </Panel>
            </>
          )}
        </ScrollView>

        <ProviderDialog
          key={dialogSession}
          visible={dialogOpen}
          editing={editing}
          onClose={() => setDialogOpen(false)}
        />
        <ModelSheet visible={modelOpen} onClose={() => setModelOpen(false)} />

        {/* Per-provider actions */}
        <Sheet
          visible={manageProvider !== null}
          kicker={t("settings.manageProvider")}
          title={manageProvider?.name ?? ""}
          onClose={() => setManageProvider(null)}
        >
          <Row
            flush
            label={t("settings.useProvider")}
            onPress={() => {
              if (manageProvider) {
                setActiveProvider(manageProvider.id);
              }
              setManageProvider(null);
            }}
            right={<Ionicons name="checkmark-circle-outline" size={18} color={c.muted} />}
          />
          <Row
            flush
            label={t("settings.editProvider")}
            onPress={() => {
              const target = manageProvider;
              setManageProvider(null);
              openDialog(target);
            }}
            right={<Ionicons name="create-outline" size={18} color={c.muted} />}
          />
          <View style={{ marginVertical: SP.sm }}>
            <Divider />
          </View>
          <Row
            flush
            tone="danger"
            label={t("common.remove")}
            onPress={() => {
              setConfirmRemove(manageProvider);
              setManageProvider(null);
            }}
            right={<Ionicons name="trash-outline" size={18} color={c.danger} />}
          />
        </Sheet>

        <Sheet
          visible={confirmRemove !== null}
          title={t("settings.removeProvider")}
          onClose={() => setConfirmRemove(null)}
          footer={
            <>
              <Button
                label={t("common.cancel")}
                variant="ghost"
                onPress={() => setConfirmRemove(null)}
              />
              <Button
                label={t("common.remove")}
                variant="danger"
                onPress={() => {
                  if (confirmRemove) {
                    removeProvider(confirmRemove.id);
                  }
                  setConfirmRemove(null);
                }}
              />
            </>
          }
        >
          <Text style={[TXT.body, { color: c.muted }]}>
            {t("settings.removeProviderConfirm", { name: confirmRemove?.name ?? "" })}
          </Text>
        </Sheet>

        <Sheet
          visible={confirmClear}
          title={t("profile.clearAll")}
          onClose={() => setConfirmClear(false)}
          footer={
            <>
              <Button
                label={t("common.cancel")}
                variant="ghost"
                onPress={() => setConfirmClear(false)}
              />
              <Button
                label={t("profile.clearAll")}
                variant="danger"
                onPress={() => {
                  clearAllChats();
                  setConfirmClear(false);
                }}
              />
            </>
          }
        >
          <Text style={[TXT.body, { color: c.muted }]}>{t("profile.clearAllConfirm")}</Text>
        </Sheet>

        <Sheet
          visible={nameOpen}
          title={t("profile.name")}
          onClose={() => setNameOpen(false)}
          footer={
            <>
              <Button label={t("common.cancel")} variant="ghost" onPress={() => setNameOpen(false)} />
              <Button
                label={t("common.save")}
                onPress={() => {
                  updateSettings({ profileName: nameDraft.trim() || undefined });
                  setNameOpen(false);
                }}
              />
            </>
          }
        >
          <Text style={[TXT.small, { color: c.muted }]}>{t("profile.nameHint")}</Text>
          <TextInput
            value={nameDraft}
            onChangeText={setNameDraft}
            autoFocus
            accessibilityLabel={t("profile.name")}
            placeholderTextColor={c.faint}
            style={[styles.input, { color: c.text, backgroundColor: c.panel, borderColor: c.border }]}
          />
        </Sheet>
      </View>
    </FrameModal>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  header: {
    flexDirection: "row",
    alignItems: "center",
    gap: SP.sm,
    paddingHorizontal: SP.sm,
    paddingBottom: SP.sm,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  headerText: { flex: 1, minWidth: 0 },
  headerSpacer: { width: 44 },
  scroll: { flex: 1 },
  content: { paddingHorizontal: SP.md },
  section: { marginTop: SP.xxl, marginBottom: SP.sm, paddingHorizontal: SP.xs },

  controlRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: SP.md,
    paddingHorizontal: SP.lg,
    minHeight: 56,
    paddingVertical: SP.sm,
  },

  accentBlock: { paddingHorizontal: SP.lg, paddingVertical: SP.md },
  accentHead: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: SP.md,
  },
  swatches: { flexDirection: "row", gap: SP.xs },
  swatchTarget: { width: 46, height: 46, alignItems: "center", justifyContent: "center" },
  swatch: {
    width: 28,
    height: 28,
    borderRadius: R.xs,
    borderWidth: 1,
    borderColor: "transparent",
    alignItems: "center",
    justifyContent: "center",
  },

  providerRow: { flexDirection: "row", alignItems: "center" },
  providerRule: { width: 2, alignSelf: "stretch" },
  providerMain: {
    flex: 1,
    minWidth: 0,
    flexDirection: "row",
    alignItems: "center",
    gap: SP.md,
    paddingLeft: SP.md,
    paddingVertical: SP.sm,
    minHeight: 58,
  },
  providerText: { flex: 1, minWidth: 0 },
  providerAction: { marginTop: SP.sm },

  testRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: SP.sm,
    paddingHorizontal: SP.lg,
    paddingVertical: SP.md,
    borderTopWidth: StyleSheet.hairlineWidth,
  },

  input: {
    borderRadius: R.sm,
    paddingHorizontal: SP.md,
    paddingVertical: SP.md,
    fontSize: 16,
    lineHeight: 22,
    borderWidth: StyleSheet.hairlineWidth,
    marginTop: SP.sm,
  },
});
