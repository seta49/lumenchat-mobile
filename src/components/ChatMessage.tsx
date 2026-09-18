import { Ionicons } from "@expo/vector-icons";
import * as Clipboard from "expo-clipboard";
import { Image } from "expo-image";
import { useState } from "react";
import { StyleSheet, Text, TextInput, View } from "react-native";
import { useI18n } from "../i18n";
import { useStore } from "../store";
import { R, SP, useTheme } from "../theme";
import { TXT } from "../fonts";
import type { ChatMessage as ChatMessageType, ContentPart } from "../types/chat";
import { imageDisplaySize } from "../utils/image";
import { MarkdownRenderer } from "./MarkdownRenderer";
import { Button, Divider, IconButton, Meter, Row, useReducedMotion } from "./ui";
import { Sheet } from "./Sheet";

function compactTokens(n: number): string {
  if (n < 1000) {
    return String(n);
  }
  return `${(n / 1000).toFixed(n < 10_000 ? 1 : 0)}k`;
}

function ImagePart({ part }: { part: ContentPart }) {
  const { c } = useTheme();
  const size = imageDisplaySize(part.image_url?.width, part.image_url?.height);
  return (
    <Image
      source={{ uri: part.image_url?.url }}
      style={[styles.image, size, { borderColor: c.border }]}
      contentFit="cover"
      transition={120}
    />
  );
}

function plainText(content: string | ContentPart[]): string {
  if (typeof content === "string") {
    return content;
  }
  return content
    .map((p) => (p.type === "text" ? p.text ?? "" : ""))
    .join("\n")
    .trim();
}

/**
 * A turn in the ledger.
 *
 * Both speakers run full measure and are told apart by a coloured spine and a
 * mono byline, not by a bubble. That keeps pasted code and long prompts at
 * full width, and it gives every turn a place to put its own actions — which
 * is what a long-press-only menu could never provide.
 */
export function ChatMessage({
  message,
  streaming,
}: {
  message: ChatMessageType;
  streaming: boolean;
}) {
  const { c } = useTheme();
  const { t } = useI18n();
  const { regenerate, editAndResend, deleteMessage } = useStore();
  const reduced = useReducedMotion();
  const [actionsOpen, setActionsOpen] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState("");

  const isUser = message.role === "user";
  const parts = typeof message.content === "string" ? null : message.content;
  const rawText = typeof message.content === "string" ? message.content : "";
  const streamingEmpty = streaming && !rawText.trim() && !parts;
  const byline = isUser ? t("common.you") : "Lumen";
  const spineColor = isUser || streaming ? c.accent : c.borderStrong;

  const copy = async () => {
    await Clipboard.setStringAsync(plainText(message.content));
    setActionsOpen(false);
  };
  const doRegenerate = (nuance?: "default" | "shorter" | "longer" | "casual") => {
    setActionsOpen(false);
    void regenerate(message.id, nuance ?? "default");
  };
  const startEdit = () => {
    setActionsOpen(false);
    setDraft(plainText(message.content));
    setEditing(true);
  };
  const saveEdit = () => {
    setEditing(false);
    if (draft.trim()) {
      void editAndResend(message.id, draft);
    }
  };

  return (
    <View style={styles.turn}>
      <View style={[styles.spine, { backgroundColor: spineColor }]} />

      <View style={styles.turnBody}>
        <View style={styles.rail}>
          <Text style={[TXT.label, { color: isUser ? c.accent : c.muted }]}>{byline}</Text>
          {streaming ? <Meter active reduced={reduced} /> : null}
          <View style={styles.railSpacer} />
          {message.usage && !streaming ? (
            <Text style={[TXT.label, { color: c.faint }]}>
              {`↑${compactTokens(message.usage.prompt_tokens)}  ↓${compactTokens(message.usage.completion_tokens)}`}
            </Text>
          ) : null}
          {!streaming ? (
            <IconButton
              icon="ellipsis-horizontal"
              size={30}
              onPress={() => setActionsOpen(true)}
              label={`${t("message.actions")} — ${byline}`}
            />
          ) : null}
        </View>

        {message.error ? (
          <View
            style={[styles.error, { backgroundColor: c.raised, borderColor: c.danger }]}
            accessibilityLiveRegion="polite"
          >
            <View style={styles.errorHead}>
              <Ionicons name="alert-circle-outline" size={16} color={c.danger} />
              <Text style={[TXT.label, { color: c.danger, flex: 1 }]}>
                {t("errors.requestFailed")}
              </Text>
            </View>
            <Text style={[TXT.small, { color: c.muted, marginTop: SP.xs }]} selectable>
              {message.error}
            </Text>
            <View style={styles.errorAction}>
              <Button
                label={t("message.retry")}
                icon="refresh"
                variant="ghost"
                onPress={() => void regenerate(message.id)}
              />
            </View>
          </View>
        ) : null}

        <View
          accessibilityLiveRegion={streaming ? "polite" : "none"}
          style={isUser ? [styles.userField, { backgroundColor: c.panel, borderColor: c.border }] : undefined}
        >
          {parts ? (
            parts.map((part, i) =>
              part.type === "image_url" ? (
                <ImagePart key={i} part={part} />
              ) : isUser ? (
                <Text key={i} style={[TXT.body, { color: c.text }]}>
                  {part.text ?? ""}
                </Text>
              ) : (
                <MarkdownRenderer key={i} body={part.text ?? ""} />
              ),
            )
          ) : streamingEmpty ? (
            <Text style={[TXT.body, { color: c.faint }]}>{t("typing.thinking")}</Text>
          ) : isUser ? (
            <Text style={[TXT.body, { color: c.text }]} selectable>
              {rawText}
            </Text>
          ) : (
            <MarkdownRenderer body={rawText} />
          )}
        </View>
      </View>

      {/* Message actions */}
      <Sheet
        visible={actionsOpen}
        kicker={t("message.actions")}
        title={byline}
        onClose={() => setActionsOpen(false)}
      >
        <Row
          flush
          label={t("message.copy")}
          onPress={() => void copy()}
          right={<Ionicons name="copy-outline" size={18} color={c.muted} />}
        />
        {isUser ? (
          <Row
            flush
            label={t("message.editResend")}
            onPress={startEdit}
            right={<Ionicons name="create-outline" size={18} color={c.muted} />}
          />
        ) : (
          <>
            <Row
              flush
              label={t("message.regenerate")}
              onPress={() => doRegenerate("default")}
              right={<Ionicons name="refresh-outline" size={18} color={c.muted} />}
            />
            <Row
              flush
              label={t("message.regenerateShorter")}
              onPress={() => doRegenerate("shorter")}
              right={<Ionicons name="contract-outline" size={18} color={c.muted} />}
            />
            <Row
              flush
              label={t("message.regenerateLonger")}
              onPress={() => doRegenerate("longer")}
              right={<Ionicons name="expand-outline" size={18} color={c.muted} />}
            />
            <Row
              flush
              label={t("message.regenerateCasual")}
              onPress={() => doRegenerate("casual")}
              right={<Ionicons name="happy-outline" size={18} color={c.muted} />}
            />
          </>
        )}
        <View style={{ marginVertical: SP.sm }}>
          <Divider />
        </View>
        <Row
          flush
          tone="danger"
          label={t("message.delete")}
          onPress={() => {
            setActionsOpen(false);
            setConfirmDelete(true);
          }}
          right={<Ionicons name="trash-outline" size={18} color={c.danger} />}
        />
      </Sheet>

      {/* Delete confirmation — deleting a message had no confirm and no undo. */}
      <Sheet
        visible={confirmDelete}
        title={t("message.delete")}
        onClose={() => setConfirmDelete(false)}
        footer={
          <>
            <Button
              label={t("common.cancel")}
              variant="ghost"
              onPress={() => setConfirmDelete(false)}
            />
            <Button
              label={t("message.delete")}
              variant="danger"
              onPress={() => {
                setConfirmDelete(false);
                deleteMessage(message.id);
              }}
            />
          </>
        }
      >
        <Text style={[TXT.body, { color: c.muted }]}>{t("message.deleteConfirm")}</Text>
      </Sheet>

      {/* Edit and resend */}
      <Sheet
        visible={editing}
        title={t("message.editResend")}
        onClose={() => setEditing(false)}
        footer={
          <>
            <Button label={t("common.cancel")} variant="ghost" onPress={() => setEditing(false)} />
            <Button label={t("message.saveResend")} onPress={saveEdit} disabled={!draft.trim()} />
          </>
        }
      >
        <TextInput
          value={draft}
          onChangeText={setDraft}
          multiline
          autoFocus
          accessibilityLabel={t("message.editResend")}
          style={[
            styles.editInput,
            { color: c.text, backgroundColor: c.panel, borderColor: c.border },
          ]}
        />
      </Sheet>
    </View>
  );
}

const styles = StyleSheet.create({
  turn: {
    flexDirection: "row",
    gap: SP.md,
    paddingVertical: SP.md,
  },
  spine: { width: 2, borderRadius: 1 },
  turnBody: { flex: 1, minWidth: 0 },
  rail: {
    flexDirection: "row",
    alignItems: "center",
    gap: SP.sm,
    minHeight: 30,
  },
  railSpacer: { flex: 1 },
  userField: {
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: R.xs,
    paddingHorizontal: SP.md,
    paddingVertical: SP.md,
  },
  image: { borderRadius: R.sm, borderWidth: 1, marginVertical: SP.xs },
  error: {
    borderWidth: 1,
    borderRadius: R.xs,
    padding: SP.md,
    marginBottom: SP.sm,
  },
  errorHead: { flexDirection: "row", alignItems: "center", gap: SP.sm },
  errorAction: { flexDirection: "row", marginTop: SP.md },
  editInput: {
    borderRadius: R.sm,
    paddingHorizontal: SP.md,
    paddingVertical: SP.md,
    fontSize: 16,
    lineHeight: 22,
    minHeight: 120,
    textAlignVertical: "top",
    borderWidth: StyleSheet.hairlineWidth,
  },
});
