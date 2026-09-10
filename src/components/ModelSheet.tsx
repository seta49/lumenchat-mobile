import { Ionicons } from "@expo/vector-icons";
import { useEffect, useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { useI18n } from "../i18n";
import { getActiveProvider, getProvider, resolveModelInfo } from "../services/providers";
import { fetchProviderModels } from "../services/models";
import { useStore } from "../store";
import { useTheme } from "../theme";
import { Sheet } from "./Sheet";

/** Dropdown pemilih model: fetch SEMUA model dari GET /models (fallback ke
 * template kalau gagal). Reasoning pindah ke Composer. */
export function ModelSheet({ visible, onClose }: { visible: boolean; onClose: () => void }) {
  const { settings, setModel } = useStore();
  const { c } = useTheme();
  const { t } = useI18n();
  const [models, setModels] = useState<string[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);

  const provider = getActiveProvider(settings);
  const template = getProvider(provider.kind);

  // Fetch daftar model tiap kali sheet dibuka (pakai cache di services/models).
  useEffect(() => {
    if (!visible) return;
    let cancelled = false;
    setLoading(true);
    void fetchProviderModels(provider).then((list) => {
      if (!cancelled) {
        setModels(list);
        setLoading(false);
        setError(list === null);
      }
    });
    return () => {
      cancelled = true;
    };
  }, [visible, provider]);

  const pick = (model: string) => {
    const clean = model.trim();
    if (clean) setModel(clean);
    onClose();
  };

  // Custom model yang tidak ada di list tetap tampil di atas (dipilih).
  const list = models ?? template.models;
  const all = list.includes(provider.model) ? list : [provider.model, ...list];

  return (
    <Sheet visible={visible} title={provider.name} onClose={onClose}>
      <ScrollView style={styles.list} showsVerticalScrollIndicator={false}>
        {loading ? (
          <Text style={[styles.status, { color: c.muted }]}>{t("settings.testing")}</Text>
        ) : null}
        {error && !loading ? (
          <Text style={[styles.status, { color: c.danger }]}>{t("model.listOffline")}</Text>
        ) : null}

        {all.map((m) => {
          const selected = provider.model === m;
          const info = resolveModelInfo(provider.kind, m);
          return (
            <Pressable
              key={m}
              onPress={() => pick(m)}
              style={[styles.row, selected && { backgroundColor: c.panel }]}
            >
              <View style={{ flex: 1 }}>
                <Text style={[styles.rowTitle, { color: c.text }]} numberOfLines={1}>
                  {m}
                </Text>
                {info.label !== m || info.blurbKey ? (
                  <Text style={[styles.rowSub, { color: c.muted }]} numberOfLines={1}>
                    {[info.label !== m ? info.label : null, info.blurbKey ? t(info.blurbKey as never) : null]
                      .filter(Boolean)
                      .join(" · ")}
                  </Text>
                ) : null}
              </View>
              {selected ? <Ionicons name="checkmark" size={18} color={c.accent} /> : null}
            </Pressable>
          );
        })}

        <View style={[styles.divider, { backgroundColor: c.border }]} />
        <View style={styles.customRow}>
          <Pressable
            onPress={() => void fetchProviderModels(provider, true).then((l) => {
              if (l) {
                setModels(l);
                setError(false);
              } else {
                setError(true);
              }
            })}
            style={[styles.refreshBtn, { borderColor: c.border }]}
          >
            <Ionicons name="refresh-outline" size={15} color={c.muted} />
            <Text style={{ fontSize: 12, color: c.muted }}>{t("model.refresh")}</Text>
          </Pressable>
        </View>
      </ScrollView>
    </Sheet>
  );
}

const styles = StyleSheet.create({
  list: { maxHeight: 420 },
  status: { fontSize: 13, paddingHorizontal: 10, paddingVertical: 8 },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingVertical: 10,
    paddingHorizontal: 10,
    borderRadius: 14,
  },
  rowTitle: { fontSize: 15, fontWeight: "600" },
  rowSub: { fontSize: 12, marginTop: 2 },
  divider: { height: StyleSheet.hairlineWidth, marginVertical: 8 },
  customRow: { flexDirection: "row", justifyContent: "center", marginTop: 4, marginBottom: 8 },
  refreshBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    borderRadius: 14,
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
});
