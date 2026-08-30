import type { ReactNode } from "react";
import { Modal, Pressable, StyleSheet, Text, View } from "react-native";
import { useTheme } from "../theme";

/** Modal sheet dasar (backdrop gelap + kartu tengah). Semua dialog pakai ini. */
export function Sheet({
  visible,
  title,
  onClose,
  children,
}: {
  visible: boolean;
  title?: string;
  onClose: () => void;
  children: ReactNode;
}) {
  const { c } = useTheme();
  return (
    <Modal transparent visible={visible} animationType="fade" onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose}>
        <Pressable
          style={[styles.card, { backgroundColor: c.panel, borderColor: c.border }]}
          onPress={(e) => e.stopPropagation()}
        >
          {title ? <Text style={[styles.title, { color: c.text }]}>{title}</Text> : null}
          {children}
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.55)",
    alignItems: "center",
    justifyContent: "center",
    padding: 20,
  },
  card: {
    width: "100%",
    maxWidth: 430,
    maxHeight: "85%",
    borderRadius: 20,
    borderWidth: 1,
    padding: 20,
  },
  title: { fontSize: 17, fontWeight: "700", marginBottom: 14 },
});