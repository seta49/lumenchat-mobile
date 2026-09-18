import { Ionicons } from "@expo/vector-icons";
import { useState, type ReactNode } from "react";
import { ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { useI18n } from "../i18n";
import { useStore } from "../store";
import { R, SP, useTheme } from "../theme";
import { TXT } from "../fonts";
import { PROVIDERS, providerLabel } from "../services/providers";
import { fetchProviderModels } from "../services/models";
import { testProviderConnection } from "../services/ai";
import { newId } from "../utils/id";
import type { ProviderApiFormat, ProviderConfig, ProviderId } from "../types/chat";
import { Sheet } from "./Sheet";
import { Button, ProviderMark, Row, Segmented, StatusDot, Touch } from "./ui";

/** Add or edit one provider configuration. */
export function ProviderDialog({
  visible,
  editing,
  onClose,
}: {
  visible: boolean;
  editing: ProviderConfig | null;
  onClose: () => void;
}) {
  const { addProvider, updateProvider } = useStore();
  const { t, lang } = useI18n();
  const { c } = useTheme();

  // The parent remounts this form per open, so initial state comes straight
  // from props and there is no reset effect to keep in sync.
  const [kind, setKind] = useState<ProviderId>(() => editing?.kind ?? PROVIDERS[0].id);
  const [name, setName] = useState(() => editing?.name ?? PROVIDERS[0].label);
  const [baseUrl, setBaseUrl] = useState(() => editing?.baseUrl ?? PROVIDERS[0].baseUrl);
  const [apiKey, setApiKey] = useState(() => editing?.apiKey ?? "");
  const [apiFormat, setApiFormat] = useState<ProviderApiFormat>(
    () => editing?.apiFormat ?? PROVIDERS[0].apiFormat,
  );
  const [showKey, setShowKey] = useState(false);
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<string | null>(null);

  const pickKind = (next: ProviderId) => {
    const def = PROVIDERS.find((p) => p.id === next);
    if (!def) {
      return;
    }
    setKind(next);
    setBaseUrl(def.baseUrl);
    setApiFormat(def.apiFormat);
    if (!editing) {
      setName(def.label);
    }
  };

  const runTest = async () => {
    setTesting(true);
    setTestResult(null);
    try {
      // Many providers reject a dummy "ping" model, so test with a real one.
      const def = PROVIDERS.find((p) => p.id === kind);
      let testModel = editing?.model?.trim() || def?.defaultModel?.trim() || "";
      if (!testModel) {
        const list = await fetchProviderModels({
          id: `test-${Date.now()}`,
          kind,
          name: "test",
          baseUrl: baseUrl.trim(),
          apiKey: apiKey.trim(),
          model: "",
          apiFormat,
        });
        testModel = list?.[0] ?? "";
      }
      const res = await testProviderConnection(
        { baseUrl: baseUrl.trim(), apiKey, model: testModel, apiFormat },
        lang,
      );
      setTestResult(res.message);
    } catch (error) {
      setTestResult(error instanceof Error ? error.message : t("settings.testFail"));
    } finally {
      setTesting(false);
    }
  };

  const canSave = baseUrl.trim().length > 0;
  const testOk = testResult
    ? !/fail|gagal|tidak bisa|could not|cannot/i.test(testResult)
    : false;

  const save = () => {
    if (!canSave) {
      return;
    }
    const def = PROVIDERS.find((p) => p.id === kind);
    const payload: ProviderConfig = {
      id: editing?.id ?? newId(),
      kind,
      name: name.trim() || providerLabel(kind),
      baseUrl: baseUrl.trim(),
      apiKey: apiKey.trim(),
      model: editing?.model || def?.defaultModel || "",
      apiFormat,
      thinking: editing?.thinking,
    };
    if (editing) {
      updateProvider(editing.id, payload);
    } else {
      addProvider(payload);
    }
    onClose();
  };

  return (
    <Sheet
      visible={visible}
      kicker={t("settings.providerKind")}
      title={editing ? t("settings.editProvider") : t("settings.addProvider")}
      onClose={onClose}
      footer={
        <>
          <Button label={t("common.cancel")} variant="ghost" onPress={onClose} />
          <Button
            label={editing ? t("common.save") : t("settings.saveProvider")}
            onPress={save}
            disabled={!canSave}
          />
        </>
      }
    >
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <Text style={[TXT.small, { color: c.muted }]}>{t("settings.providerDialogHint")}</Text>

        {!editing ? (
          <View style={styles.kinds}>
            {PROVIDERS.map((p) => {
              const on = kind === p.id;
              return (
                <Touch
                  key={p.id}
                  onPress={() => pickKind(p.id)}
                  label={p.label}
                  role="radio"
                  state={{ selected: on }}
                  style={[
                    styles.kind,
                    {
                      borderColor: on ? c.accentLine : c.border,
                      backgroundColor: on ? c.accentSoft : "transparent",
                    },
                  ]}
                  hover={{ backgroundColor: on ? c.accentSoft : c.panel }}
                  press={{ opacity: 0.75 }}
                >
                  <ProviderMark kind={p.id} name={p.label} size={20} />
                  <Text style={[TXT.small, { color: on ? c.accent : c.text }]} numberOfLines={1}>
                    {p.label}
                  </Text>
                </Touch>
              );
            })}
          </View>
        ) : (
          <Row
            flush
            label={editing.name}
            value={editing.apiFormat === "anthropic" ? "Anthropic" : "OpenAI"}
            right={<ProviderMark kind={editing.kind} name={editing.name} size={24} />}
          />
        )}

        <Field label={t("settings.providerName")}>
          <TextInput
            value={name}
            onChangeText={setName}
            accessibilityLabel={t("settings.providerName")}
            placeholderTextColor={c.faint}
            style={[styles.input, { color: c.text, backgroundColor: c.panel, borderColor: c.border }]}
          />
        </Field>

        <Field label={t("settings.baseUrl")}>
          <TextInput
            value={baseUrl}
            onChangeText={setBaseUrl}
            placeholder="https://api.example.com/v1"
            placeholderTextColor={c.faint}
            autoCapitalize="none"
            autoCorrect={false}
            keyboardType="url"
            accessibilityLabel={t("settings.baseUrl")}
            style={[styles.input, { color: c.text, backgroundColor: c.panel, borderColor: c.border }]}
          />
        </Field>

        <Field
          label={t("settings.apiKey")}
          hint={PROVIDERS.find((p) => p.id === kind)?.keyHint}
        >
          <View style={styles.keyRow}>
            <TextInput
              value={apiKey}
              onChangeText={setApiKey}
              placeholder={t("settings.apiKeyPlaceholder")}
              placeholderTextColor={c.faint}
              secureTextEntry={!showKey}
              autoCapitalize="none"
              autoCorrect={false}
              accessibilityLabel={t("settings.apiKey")}
              style={[
                styles.input,
                styles.keyInput,
                { color: c.text, backgroundColor: c.panel, borderColor: c.border },
              ]}
            />
            <Touch
              onPress={() => setShowKey((s) => !s)}
              label={showKey ? t("settings.hideKey") : t("settings.showKey")}
              state={{ selected: showKey }}
              style={[styles.eye, { backgroundColor: c.panel, borderColor: c.border }]}
              hover={{ backgroundColor: c.raised }}
              press={{ opacity: 0.75 }}
            >
              <Ionicons
                name={showKey ? "eye-off-outline" : "eye-outline"}
                size={16}
                color={c.muted}
              />
            </Touch>
          </View>
        </Field>

        <Field label={t("settings.apiFormat")}>
          <Segmented
            label={t("settings.apiFormat")}
            options={[
              { key: "openai", label: "OpenAI" },
              { key: "anthropic", label: "Anthropic" },
            ]}
            value={apiFormat}
            onChange={setApiFormat}
          />
        </Field>

        <Row
          flush
          label={testing ? t("settings.testing") : t("settings.testConnection")}
          desc={t("settings.testConnectionHint")}
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
          <View style={[styles.result, { borderColor: c.border }]}>
            <StatusDot state={testOk ? "live" : "error"} />
            <Text style={[TXT.small, { color: c.text, flex: 1 }]}>{testResult}</Text>
          </View>
        ) : null}
      </ScrollView>
    </Sheet>
  );
}

function Field({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: ReactNode;
}) {
  const { c } = useTheme();
  return (
    <View style={styles.field}>
      <View style={styles.fieldHead}>
        <Text style={[TXT.label, { color: c.faint }]}>{label}</Text>
      </View>
      {children}
      {hint ? (
        <Text style={[TXT.small, { color: c.faint, marginTop: SP.sm }]}>{hint}</Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  scroll: { flexGrow: 0 },
  scrollContent: { padding: SP.lg, gap: SP.lg },
  kinds: { flexDirection: "row", flexWrap: "wrap", gap: SP.sm },
  kind: {
    flexDirection: "row",
    alignItems: "center",
    gap: SP.sm,
    borderWidth: 1,
    borderRadius: R.sm,
    paddingHorizontal: SP.md,
    minHeight: 44,
  },
  field: { gap: SP.sm },
  fieldHead: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  input: {
    borderRadius: R.sm,
    paddingHorizontal: SP.md,
    paddingVertical: SP.md,
    fontSize: 16,
    lineHeight: 22,
    borderWidth: StyleSheet.hairlineWidth,
  },
  keyRow: { flexDirection: "row", gap: SP.sm },
  keyInput: { flex: 1 },
  eye: {
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: R.sm,
    paddingHorizontal: SP.md,
    alignItems: "center",
    justifyContent: "center",
    minWidth: 48,
  },
  result: {
    flexDirection: "row",
    alignItems: "center",
    gap: SP.sm,
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: R.xs,
    padding: SP.md,
  },
});
