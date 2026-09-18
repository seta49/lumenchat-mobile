import { Ionicons } from "@expo/vector-icons";
import { useEffect, useState } from "react";
import { StyleSheet, Text, TextInput, View } from "react-native";
import { useI18n } from "../i18n";
import { getActiveProvider, getProvider, resolveModelInfo } from "../services/providers";
import { fetchProviderModels } from "../services/models";
import { useStore } from "../store";
import { R, SP, useTheme } from "../theme";
import { TXT } from "../fonts";
import { Button, IconButton, Meter, Row, useReducedMotion } from "./ui";
import { Sheet } from "./Sheet";

/**
 * Model picker.
 *
 * A provider's model list comes from `GET /models` and can be long, so the
 * search field and the count are part of the interface rather than an
 * afterthought. Loading, empty, error and overflow all have their own state.
 */
export function ModelSheet({ visible, onClose }: { visible: boolean; onClose: () => void }) {
  const { settings, setModel } = useStore();
  const { c } = useTheme();
  const { t } = useI18n();
  const reduced = useReducedMotion();

  const provider = getActiveProvider(settings);
  const template = getProvider(provider.kind);

  const [models, setModels] = useState<string[] | null>(null);
  const [error, setError] = useState(false);
  const [query, setQuery] = useState("");
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    if (!visible) {
      return;
    }
    let cancelled = false;
    void fetchProviderModels(provider, attempt > 0).then((list) => {
      if (cancelled) {
        return;
      }
      setModels(list);
      setError(list === null);
    });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible, provider.id, attempt]);

  // Derived, not stored: if we have no list and no error, we are still waiting.
  const loading = models === null && !error;

  const close = () => {
    setQuery("");
    onClose();
  };

  // A custom model that is not in the fetched list still has to be visible,
  // or the selected model would disappear from its own picker.
  const base = models ?? template.models;
  const all = base.includes(provider.model) || !provider.model ? base : [provider.model, ...base];
  const needle = query.trim().toLowerCase();
  const shown = needle ? all.filter((m) => m.toLowerCase().includes(needle)) : all;

  return (
    <Sheet
      visible={visible}
      kicker={t("chat.model")}
      title={provider.name}
      onClose={close}
      footer={
        <>
          <Text style={[TXT.label, { color: c.faint, flex: 1, alignSelf: "center" }]}>
            {t("model.count", { n: all.length })}
          </Text>
          <Button
            label={t("model.refresh")}
            variant="ghost"
            icon="refresh"
            onPress={() => setAttempt((a) => a + 1)}
            loading={loading}
          />
        </>
      }
    >
      <View style={[styles.search, { backgroundColor: c.panel, borderColor: c.border }]}>
        <Ionicons name="search" size={15} color={c.faint} />
        <TextInput
          value={query}
          onChangeText={setQuery}
          placeholder={t("model.search")}
          placeholderTextColor={c.faint}
          accessibilityLabel={t("model.search")}
          autoCapitalize="none"
          autoCorrect={false}
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

      {error ? (
        <View style={[styles.notice, { borderColor: c.danger, backgroundColor: c.raised }]}>
          <View style={styles.noticeHead}>
            <Ionicons name="cloud-offline-outline" size={16} color={c.danger} />
            <Text style={[TXT.label, { color: c.danger, flex: 1 }]}>
              {t("model.listOfflineTitle")}
            </Text>
          </View>
          <Text style={[TXT.small, { color: c.muted, marginTop: SP.xs }]}>
            {t("model.listOffline")}
          </Text>
        </View>
      ) : null}

      {loading && !models ? (
        <View style={styles.loading}>
          <Meter active reduced={reduced} />
          <Text style={[TXT.label, { color: c.faint }]}>{t("model.loading")}</Text>
        </View>
      ) : null}

      {shown.length === 0 && !loading && !error ? (
        <View style={[styles.notice, { borderColor: c.border }]}>
          <Text style={[TXT.body, { color: c.muted }]}>{t("model.noMatches", { q: query })}</Text>
        </View>
      ) : null}

      {shown.map((m) => {
        const selected = provider.model === m;
        const info = resolveModelInfo(provider.kind, m);
        const blurb = info.blurbKey ? t(info.blurbKey as never) : undefined;
        const desc = [info.label !== m ? info.label : null, blurb].filter(Boolean).join("  ·  ");
        return (
          <Row
            key={m}
            flush
            label={m}
            desc={desc || undefined}
            tone={selected ? "accent" : "default"}
            onPress={() => {
              setModel(m.trim());
              close();
            }}
            right={
              selected ? <Ionicons name="checkmark" size={18} color={c.accent} /> : undefined
            }
          />
        );
      })}
    </Sheet>
  );
}

const styles = StyleSheet.create({
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
  searchInput: { flex: 1, fontSize: 15, lineHeight: 20, paddingVertical: SP.sm },
  notice: { borderWidth: 1, borderRadius: R.xs, padding: SP.md, marginTop: SP.xs },
  noticeHead: { flexDirection: "row", alignItems: "center", gap: SP.sm },
  loading: { flexDirection: "row", alignItems: "center", gap: SP.md, paddingVertical: SP.md },
});
