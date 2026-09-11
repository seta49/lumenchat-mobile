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

/** Convert satu thread jadi Markdown readable. */
export function threadToMarkdown(thread: ChatThread): string {
  const lines: string[] = [`# ${thread.title}`, ""];
  if (thread.systemPrompt?.trim()) {
    lines.push(`> System: ${thread.systemPrompt.trim()}`, "");
  }
  for (const m of thread.messages) {
    const role = m.role === "user" ? "You" : m.role === "assistant" ? "Lumen" : "System";
    lines.push(`## ${role}`);
    lines.push("");
    if (typeof m.content === "string") {
      lines.push(m.content);
    } else {
      for (const p of m.content) {
        if (p.type === "text" && p.text) lines.push(p.text);
        if (p.type === "image_url") lines.push("*(image attached)*");
      }
    }
    lines.push("");
  }
  return lines.join("\n");
}

/** Export satu chat ke file .md di cache, lalu share sheet. */
export async function exportThreadMarkdown(thread: ChatThread): Promise<void> {
  const md = threadToMarkdown(thread);
  const stamp = new Date().toISOString().slice(0, 19).replace(/[:T]/g, "-");
  const safe = thread.title.replace(/[^\w\s-]/g, "").slice(0, 32) || "chat";
  const file = new File(Paths.cache, `${safe}-${stamp}.md`);
  file.create({ overwrite: true });
  file.write(md);
  if (await Sharing.isAvailableAsync()) {
    await Sharing.shareAsync(file.uri, {
      mimeType: "text/markdown",
      dialogTitle: "Export Lumen chat",
      UTI: "net.daringfireball.markdown",
    });
  }
}
