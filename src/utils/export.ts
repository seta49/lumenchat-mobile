import { File, Paths } from "expo-file-system";
import * as Sharing from "expo-sharing";
import type { ChatThread } from "../types/chat";
import { newId } from "./id";

export interface ChatExportPayload {
  version: 2;
  exportedAt: number;
  chats: ChatThread[];
}

/** Export chats ke file JSON di cache, lalu share sheet. */
export async function exportChatsJson(chats: ChatThread[]): Promise<void> {
  const payload: ChatExportPayload = {
    version: 2,
    exportedAt: Date.now(),
    chats,
  };
  const json = JSON.stringify(payload, null, 2);
  const stamp = new Date().toISOString().slice(0, 19).replace(/[:T]/g, "-");
  const file = new File(Paths.cache, `lumen-chats-${stamp}.json`);
  file.create({ overwrite: true });
  file.write(json);

  if (await Sharing.isAvailableAsync()) {
    await Sharing.shareAsync(file.uri, {
      mimeType: "application/json",
      dialogTitle: "Export Lumen chats",
      UTI: "public.json",
    });
  }
}

/** Parse file impor → list chat valid (id di-remap biar gak tabrakan). */
export function parseImportedChats(raw: string): ChatThread[] | null {
  let data: unknown;
  try {
    data = JSON.parse(raw);
  } catch {
    return null;
  }

  const list = Array.isArray(data)
    ? data
    : data && typeof data === "object" && Array.isArray((data as { chats?: unknown }).chats)
      ? ((data as { chats: ChatThread[] }).chats)
      : null;
  if (!list) {
    return null;
  }

  const out: ChatThread[] = [];
  for (const item of list) {
    if (!item || typeof item !== "object") continue;
    const th = item as Partial<ChatThread>;
    if (!Array.isArray(th.messages)) continue;
    out.push({
      id: newId(),
      title: typeof th.title === "string" && th.title.trim() ? th.title : "Imported Chat",
      systemPrompt: typeof th.systemPrompt === "string" ? th.systemPrompt : undefined,
      messages: th.messages
        .filter(
          (m) =>
            m &&
            typeof m === "object" &&
            (m.role === "user" || m.role === "assistant" || m.role === "system"),
        )
        .map((m) => ({
          id: newId(),
          role: m.role,
          content: typeof m.content === "string" || Array.isArray(m.content) ? m.content : "",
          createdAt: typeof m.createdAt === "number" ? m.createdAt : Date.now(),
          usage: m.usage,
        })),
      createdAt: typeof th.createdAt === "number" ? th.createdAt : Date.now(),
      updatedAt: typeof th.updatedAt === "number" ? th.updatedAt : Date.now(),
    });
  }
  return out.length ? out : null;
}

/** Baca file text dari URI (DocumentPicker asset). */
export async function readTextFile(uri: string): Promise<string> {
  const file = new File(uri);
  return file.text();
}
