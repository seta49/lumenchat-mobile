import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Sheet } from "../components/Sheet";
import { useI18n } from "../i18n";
import { useStore } from "../store";
import { ACCENT_PRESETS, useTheme } from "../theme";
import type { ThemeMode } from "../types/chat";

function initialsOf(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (!parts.length) return "L";
  return (parts[0][0] + (parts[1]?.[0] ?? "")).toUpperCase();
}

/** Baris kartu [ikon][label/subtitle][kontrol][chevron] ala halaman profil. */
function CardRow({
  icon,
  label,
  sub,
  right,
  onPress,
  last,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  sub?: string;
  right?: React.ReactNode;
  onPress?: () => void;
  last?: boolean;
}) {
  const { c } = useTheme();
  const inner = (
    <View style={styles.row}>
      <View style={[styles.rowIcon, { backgroundColor: c.input }]}>
        <Ionicons name={icon} size={16} color={c.text} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={[styles.rowTitle, { color: c.text }]}>{label}</Text>
        {sub ? (
          <Text style={[styles.rowSub, { color: c.muted }]} numberOfLines={1}>
            {sub}
          </Text>
        ) : null}
      </View>
      {right ?? null}
      {onPress ? <Ionicons name="chevron-forward" size={15} color={c.muted} /> : null}
    </View>
  );
  return onPress ? (
    <Pressable onPress={onPress}>
      {inner}
      {!last ? <View style={[styles.divider, { backgroundColor: c.border }]} /> : null}
    </Pressable>
  ) : (
    <>
      {inner}
      {!last ? <View style={[styles.divider, { backgroundColor: c.border }]} /> : null}
    </>
  );
}

export function ProfileScreen() {
  const { settings, updateSettings, threads, deleteThread } = useStore();
  const { c } = useTheme();
  const { t } = useI18n();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [nameEditing, setNameEditing] = useState(false);
  const [nameDraft, setNameDraft] = useState(settings.profileName ?? "");
  const [confirmClear, setConfirmClear] = useState(false);

  const name = settings.profileName?.trim() || "Lumen";

  const saveName = () => {
    updateSettings({ profileName: nameDraft.trim() });
    setNameEditing(false);
  };

  return (
    <View style={[styles.root, { backgroundColor: c.bg }]}>
      <View
        style={[
          styles.header,
          { paddingTop: insets.top + 6, borderBottomColor: c.border },
        ]}
      >
        <Pressable onPress={() => router.back()} hitSlop={8} style={styles.headerBtn}>
          <Ionicons name="arrow-back" size={22} color={c.text} />
        </Pressable>
        <Text style={[styles.headerTitle, { color: c.text }]}>{t("profile.title")}</Text>
        <View style={styles.headerBtn} />
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        {/* Identity */}
        <View style={styles.identity}>
          <View style={[styles.bigAvatar, { backgroundColor: c.accent }]}>
            <Text style={[styles.bigAvatarText, { color: c.onAccent }]}>{initialsOf(name)}</Text>
          </View>
          <Pressable
            onPress={() => {
              setNameDraft(settings.profileName ?? "");
              setNameEditing(true);
            }}
          >
            <Text style={[styles.profileName, { color: c.text }]}>{name}</Text>
          </Pressable>
        </View>

        {/* Appearance */}
        <Text style={[styles.groupLabel, { color: c.muted }]}>{t("profile.appearance")}</Text>
        <View style={[styles.card, { backgroundColor: c.surface, borderColor: c.border }]}>
          <ThemeRow />
          <View style={[styles.divider, { backgroundColor: c.border }]} />
          <AccentRow />
          <View style={[styles.divider, { backgroundColor: c.border }]} />
          <LanguageRow />
        </View>

        {/* Providers & data */}
        <Text style={[styles.groupLabel, { color: c.muted }]}>{t("common.settings")}</Text>
        <View style={[styles.card, { backgroundColor: c.surface, borderColor: c.border }]}>
          <CardRow
            icon="cloud-outline"
            label={t("profile.providersRow")}
            sub={t("profile.providersSub", { n: settings.providers.length })}
            onPress={() => router.push("/settings")}
          />
          <View style={[styles.divider, { backgroundColor: c.border }]} />
          <CardRow
            icon="server-outline"
            label={t("profile.dataRow")}
            sub={t("profile.dataSub", { n: threads.length })}
            onPress={() => setConfirmClear(true)}
            right={undefined}
            last
          />
        </View>

        {/* About */}
        <View style={[styles.card, { backgroundColor: c.surface, borderColor: c.border }]}>
          <CardRow icon="information-circle-outline" label={t("profile.about")} sub={t("profile.aboutSub")} last />
        </View>
        <Text style={[styles.version, { color: c.muted }]}>v0.2.0</Text>
      </ScrollView>

      {/* Sheet ganti nama */}
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
          <Pressable
            onPress={() => setNameEditing(false)}
            style={[styles.ghostBtn, { borderColor: c.border }]}
          >
            <Text style={{ color: c.muted, fontSize: 13 }}>{t("common.cancel")}</Text>
          </Pressable>
          <Pressable onPress={saveName} style={[styles.primaryBtn, { backgroundColor: c.accent }]}>
            <Text style={{ color: c.onAccent, fontSize: 13, fontWeight: "600" }}>{t("common.save")}</Text>
          </Pressable>
        </View>
      </Sheet>

      {/* Sheet hapus semua chat */}
      <Sheet visible={confirmClear} title={t("profile.clearAll")} onClose={() => setConfirmClear(false)}>
        <Text style={{ color: c.muted, fontSize: 14, marginBottom: 14 }}>
          {t("profile.clearAllConfirm")}
        </Text>
        <View style={styles.sheetActions}>
          <Pressable
            onPress={() => setConfirmClear(false)}
            style={[styles.ghostBtn, { borderColor: c.border }]}
          >
            <Text style={{ color: c.muted, fontSize: 13 }}>{t("common.cancel")}</Text>
          </Pressable>
          <Pressable
            onPress={() => {
              setConfirmClear(false);
              for (const th of threads) {
                deleteThread(th.id);
              }
            }}
            style={[styles.primaryBtn, { backgroundColor: c.danger }]}
          >
            <Text style={{ color: "#ffffff", fontSize: 13, fontWeight: "600" }}>{t("common.remove")}</Text>
          </Pressable>
        </View>
      </Sheet>
    </View>
  );
}

/** Baris tema: 3 segmen System(tidak ada → dark/light saja) — dark/light. */
function ThemeRow() {
  const { settings, updateSettings } = useStore();
  const { c } = useTheme();
  const { t } = useI18n();
  return (
    <View style={styles.row}>
      <View style={[styles.rowIcon, { backgroundColor: c.input }]}>
        <Ionicons name={settings.theme === "dark" ? "moon-outline" : "sunny-outline"} size={16} color={c.text} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={[styles.rowTitle, { color: c.text }]}>{t("settings.theme")}</Text>
      </View>
      <View style={[styles.segment, { backgroundColor: c.input, borderColor: c.border }]}>
        {(["dark", "light"] as ThemeMode[]).map((mode) => (
          <Pressable
            key={mode}
            onPress={() => updateSettings({ theme: mode })}
            style={[styles.segmentBtn, settings.theme === mode && { backgroundColor: c.accent }]}
          >
            <Text
              style={{
                fontSize: 12,
                fontWeight: "600",
                color: settings.theme === mode ? c.onAccent : c.muted,
              }}
            >
              {mode === "dark" ? t("common.dark") : t("common.light")}
            </Text>
          </Pressable>
        ))}
      </View>
    </View>
  );
}

function AccentRow() {
  const { settings, updateSettings } = useStore();
  const { c } = useTheme();
  const { t } = useI18n();
  const current = settings.accent ?? c.accent;
  return (
    <View style={styles.row}>
      <View style={[styles.rowIcon, { backgroundColor: c.input }]}>
        <Ionicons name="color-palette-outline" size={16} color={c.text} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={[styles.rowTitle, { color: c.text }]}>{t("profile.accent")}</Text>
      </View>
      <View style={styles.dots}>
        {ACCENT_PRESETS.map((preset) => (
          <Pressable
            key={preset.hex}
            onPress={() => updateSettings({ accent: preset.hex })}
            style={[
              styles.dot,
              { backgroundColor: preset.hex },
              current === preset.hex && { borderWidth: 2, borderColor: c.text },
            ]}
          />
        ))}
      </View>
    </View>
  );
}

function LanguageRow() {
  const { settings, updateSettings } = useStore();
  const { c } = useTheme();
  const { t } = useI18n();
  return (
    <View style={styles.row}>
      <View style={[styles.rowIcon, { backgroundColor: c.input }]}>
        <Ionicons name="globe-outline" size={16} color={c.text} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={[styles.rowTitle, { color: c.text }]}>{t("settings.language")}</Text>
      </View>
      <View style={[styles.segment, { backgroundColor: c.input, borderColor: c.border }]}>
        {(["en", "id"] as const).map((lang) => (
          <Pressable
            key={lang}
            onPress={() => updateSettings({ language: lang })}
            style={[styles.segmentBtn, settings.language === lang && { backgroundColor: c.accent }]}
          >
            <Text
              style={{
                fontSize: 12,
                fontWeight: "600",
                color: settings.language === lang ? c.onAccent : c.muted,
              }}
            >
              {lang === "en" ? t("common.english") : t("common.indonesian")}
            </Text>
          </Pressable>
        ))}
      </View>
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
  content: { padding: 16, paddingBottom: 48 },
  identity: { alignItems: "center", marginBottom: 24, marginTop: 8 },
  bigAvatar: { width: 72, height: 72, borderRadius: 36, alignItems: "center", justifyContent: "center", marginBottom: 10 },
  bigAvatarText: { fontSize: 26, fontWeight: "800" },
  profileName: { fontSize: 18, fontWeight: "600" },
  groupLabel: {
    fontSize: 11,
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: 0.6,
    marginBottom: 6,
    paddingHorizontal: 4,
    marginTop: 18,
  },
  card: { borderRadius: 18, borderWidth: 1, overflow: "hidden" },
  divider: { height: StyleSheet.hairlineWidth, marginLeft: 56 },
  row: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 11,
    gap: 10,
  },
  rowIcon: { width: 32, height: 32, borderRadius: 16, alignItems: "center", justifyContent: "center" },
  rowTitle: { fontSize: 14, fontWeight: "600" },
  rowSub: { fontSize: 12, marginTop: 1 },
  segment: { flexDirection: "row", borderRadius: 12, borderWidth: 1, padding: 2 },
  segmentBtn: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 9 },
  dots: { flexDirection: "row", gap: 8, alignItems: "center" },
  dot: { width: 20, height: 20, borderRadius: 10 },
  version: { textAlign: "center", fontSize: 11, marginTop: 16 },
  input: {
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 9,
    fontSize: 14,
    borderWidth: StyleSheet.hairlineWidth,
  },
  sheetActions: { flexDirection: "row", gap: 8, marginTop: 12, justifyContent: "flex-end" },
  ghostBtn: { paddingHorizontal: 14, paddingVertical: 9, borderRadius: 12, borderWidth: 1 },
  primaryBtn: { paddingHorizontal: 14, paddingVertical: 9, borderRadius: 12 },
});
