import type { ReactNode } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { FrameModal } from "./FrameModal";
import { IconButton } from "./ui";
import { useI18n } from "../i18n";
import { R, SP, useTheme } from "../theme";
import { TXT } from "../fonts";

/**
 * The base panel: a bottom-anchored surface on the attention plane.
 *
 * It carries a 1px top rule rather than a drag handle, because there is no
 * drag-to-dismiss here and a grabber would promise one.
 */
export function Sheet({
  visible,
  title,
  kicker,
  onClose,
  children,
  footer,
}: {
  visible: boolean;
  title?: string;
  kicker?: string;
  onClose: () => void;
  children: ReactNode;
  footer?: ReactNode;
}) {
  const { c } = useTheme();
  const { t } = useI18n();
  const insets = useSafeAreaInsets();

  return (
    <FrameModal
      transparent
      visible={visible}
      animationType="slide"
      onRequestClose={onClose}
      label={title}
    >
      <View style={styles.root}>
        <Pressable
          style={[styles.scrim, { backgroundColor: c.scrim }]}
          onPress={onClose}
          accessible={false}
          focusable={false}
        />
        <View
          accessibilityViewIsModal
          style={[
            styles.panel,
            {
              backgroundColor: c.overlay,
              borderColor: c.borderStrong,
              paddingBottom: Math.max(insets.bottom, SP.lg),
            },
          ]}
        >
          <View style={[styles.head, { borderBottomColor: c.border }]}>
            <View style={styles.headText}>
              {kicker ? (
                <Text style={[TXT.label, { color: c.faint }]}>{kicker}</Text>
              ) : null}
              {title ? (
                <Text style={[TXT.heading, { color: c.text }]} numberOfLines={1}>
                  {title}
                </Text>
              ) : null}
            </View>
            <IconButton icon="close" onPress={onClose} label={t("common.close")} />
          </View>

          <ScrollView
            style={styles.body}
            contentContainerStyle={styles.bodyContent}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            {children}
          </ScrollView>

          {footer ? (
            <View style={[styles.foot, { borderTopColor: c.border }]}>{footer}</View>
          ) : null}
        </View>
      </View>
    </FrameModal>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, justifyContent: "flex-end" },
  scrim: { position: "absolute", top: 0, left: 0, right: 0, bottom: 0 },
  panel: {
    maxHeight: "88%",
    borderTopWidth: 1,
    borderTopLeftRadius: R.lg,
    borderTopRightRadius: R.lg,
  },
  head: {
    flexDirection: "row",
    alignItems: "center",
    gap: SP.md,
    paddingLeft: SP.lg,
    paddingRight: SP.xs,
    paddingVertical: SP.sm,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  headText: { flex: 1, minWidth: 0, gap: 2 },
  body: { flexGrow: 0 },
  bodyContent: { padding: SP.lg, gap: SP.sm },
  foot: {
    paddingHorizontal: SP.lg,
    paddingTop: SP.md,
    borderTopWidth: StyleSheet.hairlineWidth,
    flexDirection: "row",
    gap: SP.sm,
    justifyContent: "flex-end",
  },
});
