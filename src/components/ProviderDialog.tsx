import { Ionicons } from "@expo/vector-icons";
import { useEffect, useState, type ReactNode } from "react";
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { useI18n } from "../i18n";
import { useStore } from "../store";
import { useTheme } from "../theme";
import { PROVIDERS, providerLabel } from "../services/providers";
import { testProviderConnection } from "../services/ai";
import { newId } from "../utils/id";
import type { ProviderApiFormat, ProviderConfig, ProviderId } from "../types/chat";
import { Sheet } from "./Sheet";

/** Dialog tambah/ubah provider: pilih tipe → isi kredensial → tes → simpan. */
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

  const [kind, setKind] = useState<ProviderId>("opencode-go");
  const [name, setName] = useState("");
  const [baseUrl, setBaseUrl] = useState("");
  const [apiKey, setApiKey] = useState("");
  const [model, setModel] = useState("");
  const [apiFormat, setApiFormat] = useState<ProviderApiFormat>("openai");
  const [showKey, setShowKey] = useState(false);
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<string | null>(null);

  useEffect(() => {
    if (!visible) {
      return;
    }
    if (editing) {
      setKind(editing.kind);
      setName(editing.name);
      setBaseUrl(editing.baseUrl);
      setApiKey(editing.apiKey);
      setModel(editing.model);
      setApiFormat(editing.apiFormat);
    } else {
      const def = PROVIDERS[0];
      setKind(def.id);
      setName(def.label);
      setBaseUrl(def.baseUrl);
      setApiKey("");
      setModel(def.defaultModel);
      setApiFormat(def.apiFormat);
    }
    setShowKey(false);
    setTesting(false);
    setTestResult(null);
  }, [visible, editing]);

  const pickKind = (k: ProviderId) => {
    const def = PROVIDERS.find((p) => p.id === k);
    if (!def) {
      return;
    }
    setKind(k);
    setName(def.label);
    setBaseUrl(def.baseUrl);
    setModel(def.defaultModel);
    setApiFormat(def.apiFormat);
  };

  const runTest = async () => {
    setTesting(true);
    setTestResult(null);
    const res = await testProviderConnection(
      { baseUrl: baseUrl.trim(), apiKey: apiKey.trim(), model: model.trim() || "ping", apiFormat },
      lang,
    );
    setTestResult(res.message);
    setTesting(false);
  };

  const canSave = baseUrl.trim().length > 0 && model.trim().length > 0;

  const save = () => {
    if (!canSave) {
      return;
    }
    const payload: ProviderConfig = {
      id: editing?.id ?? newId(),
      kind,
      name: name.trim() || providerLabel(kind),
      baseUrl: baseUrl.trim(),
      apiKey: apiKey.trim(),
      model: model.trim(),
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
    <Sheet visible={visible} onClose={onClose} title={editing ? t("settings.editProvider") : t("settings.addProvider")}>
      <ScrollView keyboardShouldPersistTaps="handled" style={styles.scroll}>
        <Text style={[styles.hint, { color: c.muted }]}>{t("settings.providerDialogHint")}</Text>

        {!editing ? (
          <View style={styles.kindWrap}>
            {PROVIDERS.map((p) => (
              <Pressable
                key={p.id}
                onPress={() => pickKind(p.id)}
                style={[
                  styles.kindChip,
                  {
                    borderColor: kind === p.id ? c.accent : c.border,
                    backgroundColor: kind === p.id ? c.accent + "1f" : "transparent",
                  },
                ]}
              >
                <Text
                  numberOfLines={1}
                  style={{ fontSize: 12, color: kind === p.id ? c.accent : c.text }}
                >
                  {p.label}
                </Text>
              </Pressable>
            ))}
          </View>
        ) : null}

        <Field label={t("settings.providerName")}>
          <TextInput
            value={name}
            onChangeText={setName}
            placeholder={providerLabel(kind)}
            placeholderTextColor={c.muted}
            style={[styles.input, { color: c.text, backgroundColor: c.input, borderColor: c.border }]}
          />
        </Field>
        <Field label={t("settings.baseUrl")}>
          <TextInput
            value={baseUrl}
            onChangeText={setBaseUrl}
            placeholder="https://api.example.com/v1"
            placeholderTextColor={c.muted}
            autoCapitalize="none"
            autoCorrect={false}
            keyboardType="url"
            style={[styles.input, { color: c.text, backgroundColor: c.input, borderColor: c.border }]}
          />
        </Field>
        <Field label={t("settings.apiKey")}>
          <View style={styles.keyRow}>
            <TextInput
              value={apiKey}
              onChangeText={setApiKey}
              placeholder={t("settings.apiKeyPlaceholder")}
              placeholderTextColor={c.muted}
              secureTextEntry={!showKey}
              autoCapitalize="none"
              autoCorrect={false}
              style={[
                styles.input,
                styles.keyInput,
                { color: c.text, backgroundColor: c.input, borderColor: c.border },
              ]}
            />
            <Pressable
              onPress={() => setShowKey((s) => !s)}
              hitSlop={8}
              style={[styles.eyeBtn, { backgroundColor: c.input, borderColor: c.border }]}
            >
              <Ionicons name={showKey ? "eye-off-outline" : "eye-outline"} size={16} color={c.muted} />
            </Pressable>
          </View>
        </Field>
        <Field label={t("settings.model")}>
          <TextInput
            value={model}
            onChangeText={setModel}
            placeholder={t("settings.modelPlaceholder")}
            placeholderTextColor={c.muted}
            autoCapitalize="none"
            autoCorrect={false}
            style={[styles.input, { color: c.text, backgroundColor: c.input, borderColor: c.border }]}
          />
        </Field>
        <Field label={t("settings.apiFormat")}>
          <View style={styles.segment}>
            {(["openai", "anthropic"] as const).map((fmt) => (
              <Pressable
                key={fmt}
                onPress={() => setApiFormat(fmt)}
                style={[
                  styles.segmentBtn,
                  {
                    backgroundColor: apiFormat === fmt ? c.accent : "transparent",
                  },
                ]}
              >
                <Text
                  style={{
                    fontSize: 12,
                    fontWeight: "600",
                    color: apiFormat === fmt ? c.onAccent : c.muted,
                  }}
                >
                  {fmt === "openai" ? t("settings.apiFormatOpenAI") : t("settings.apiFormatAnthropic")}
                </Text>
              </Pressable>
            ))}
          </View>
        </Field>

        <View style={styles.testRow}>
          <Pressable
            onPress={runTest}
            disabled={testing || !baseUrl.trim()}
            style={[
              styles.testBtn,
              { borderColor: c.border, opacity: !baseUrl.trim() ? 0.5 : 1 },
            ]}
          >
            <Ionicons name="flash-outline" size={15} color={c.accent} />
            <Text style={{ color: c.accent, fontSize: 13, fontWeight: "600" }}>
              {testing ? t("settings.testing") : t("settings.testConnection")}
            </Text>
          </Pressable>
        </View>
        {testResult ? (
          <Text
            style={[
              styles.testResult,
              { color: testResult.startsWith("Terkoneksi") || testResult.startsWith("Connected") ? c.success : c.danger },
            ]}
          >
            {testResult}
          </Text>
        ) : null}

        <Pressable
          onPress={save}
          disabled={!canSave}
          style={[
            styles.saveBtn,
            { backgroundColor: canSave ? c.accent : c.border },
          ]}
        >
          <Text style={{ color: canSave ? c.onAccent : c.muted, fontSize: 14, fontWeight: "700" }}>
            {t("settings.saveProvider")}
          </Text>
        </Pressable>
      </ScrollView>
    </Sheet>
  );
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  const { c } = useTheme();
  return (
    <View style={styles.field}>
      <Text style={[styles.fieldLabel, { color: c.muted }]}>{label}</Text>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  scroll: { flexGrow: 0 },
  hint: { fontSize: 12, marginBottom: 12 },
  kindWrap: { flexDirection: "row", flexWrap: "wrap", gap: 6, marginBottom: 12 },
  kindChip: {
    borderWidth: 1,
    borderRadius: 14,
    paddingHorizontal: 10,
    paddingVertical: 5,
    maxWidth: "100%",
  },
  field: { marginBottom: 10 },
  fieldLabel: { fontSize: 12, marginBottom: 5, fontWeight: "600" },
  input: {
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 9,
    fontSize: 14,
    borderWidth: StyleSheet.hairlineWidth,
  },
  keyRow: { flexDirection: "row", gap: 6 },
  keyInput: { flex: 1 },
  eyeBtn: {
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 12,
    paddingHorizontal: 10,
    justifyContent: "center",
  },
  segment: { flexDirection: "row", gap: 6 },
  segmentBtn: {
    flex: 1,
    paddingVertical: 9,
    borderRadius: 12,
    alignItems: "center",
  },
  testRow: { marginTop: 4 },
  testBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    borderWidth: 1,
    borderRadius: 12,
    paddingVertical: 9,
  },
  testResult: { fontSize: 12, marginTop: 8 },
  saveBtn: {
    marginTop: 14,
    borderRadius: 14,
    paddingVertical: 12,
    alignItems: "center",
  },
});