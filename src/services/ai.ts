import { fetch as expoFetch } from "expo/fetch";
import type {
  AIMessage,
  ContentPart,
  ProviderConfig,
  ThinkingLevel,
  TokenUsage,
} from "../types/chat";
import type { Lang } from "../i18n/translations";

/**
 * Provider-agnostic AI client (port dari Lumen web, diadaptasi ke React Native).
 * Lumen mobile berbicara LANGSUNG ke provider (OpenCode Go, OpenAI, Anthropic,
 * OpenRouter, Ollama, atau endpoint custom) — di native TIDAK ada CORS, jadi
 * proxy yang dipakai versi web (vite /api/proxy) tidak diperlukan.
 *
 * Supported wire formats:
 *  - "openai":    POST {baseUrl}/chat/completions (SSE stream)
 *  - "anthropic": POST {baseUrl}/messages (SSE stream, Anthropic Messages API)
 *
 * Streaming memakai `expo/fetch` (WinterCG-compliant, support ReadableStream)
 * karena fetch bawaan React Native tidak punya streaming response body.
 */

export interface StreamCallbacks {
  onDelta: (text: string) => void;
  onUsage: (usage: TokenUsage) => void;
}

export interface StreamResult {
  content: string;
  usage?: TokenUsage;
  finishReason: string | null;
}

interface RequestParams {
  settings: Pick<ProviderConfig, "baseUrl" | "apiKey" | "model" | "apiFormat" | "thinking">;
  lang?: Lang;
  messages: AIMessage[];
  signal?: AbortSignal;
}

type StreamParams = RequestParams & { callbacks: StreamCallbacks };

function normalizeBaseUrl(baseUrl: string): string {
  return baseUrl.trim().replace(/\/+$/, "");
}

// ---------------------------------------------------------------------------
// Thinking / reasoning levels
// ---------------------------------------------------------------------------

/** Map level thinking ke `reasoning_effort` (OpenAI-compatible). */
const REASONING_EFFORT: Record<ThinkingLevel, string | undefined> = {
  off: undefined,
  low: "low",
  medium: "medium",
  high: "high",
  max: "high", // API OpenAI cuma sampai "high"
};

/** Map level thinking ke `budget_tokens` (Anthropic). */
const THINKING_BUDGET: Record<ThinkingLevel, number | undefined> = {
  off: undefined,
  low: 1024,
  medium: 4096,
  high: 16384,
  max: 32000,
};

function reasoningEffort(level: ThinkingLevel | undefined): string | undefined {
  return REASONING_EFFORT[level ?? "off"];
}

function thinkingBudget(level: ThinkingLevel | undefined): number | undefined {
  return THINKING_BUDGET[level ?? "off"];
}

// ---------------------------------------------------------------------------
// Errors
// ---------------------------------------------------------------------------

export function providerErrorMessage(
  lang: Lang,
  status?: number,
  apiMessage?: string | null,
  code?: string,
  baseUrl?: string,
): string {
  const base = baseUrl?.trim() || "provider";
  const networkCodes = ["ECONNREFUSED", "ERR_CONNECTION_REFUSED", "ERR_NETWORK", "Failed to fetch", "Network request failed"];

  if (lang === "id") {
    if (status === 401 || status === 403) {
      return "API key tidak valid (401/403). Cek API key provider di Settings.";
    }
    if (status === 404) {
      return "Endpoint tidak ketemu (404). Pastikan Base URL provider sudah benar.";
    }
    if (status === 429) {
      return "Rate limit / kuota provider tercapai (429). Coba lagi nanti.";
    }
    if (!status && code && networkCodes.some((c) => code.includes(c))) {
      return "Tidak bisa connect ke " + base + ". Pastikan server/provider aktif.";
    }
    return apiMessage
      ? "Provider API " + (status ?? "error") + ": " + apiMessage
      : "Provider request failed" + (status ? " (" + status + ")" : "") + ".";
  }

  if (status === 401 || status === 403) {
    return "API key is invalid (401/403). Check the provider API key in Settings.";
  }
  if (status === 404) {
    return "Endpoint not found (404). Make sure the provider Base URL is correct.";
  }
  if (status === 429) {
    return "Provider rate limit / quota reached (429). Try again later.";
  }
  if (!status && code && networkCodes.some((c) => code.includes(c))) {
    return "Cannot connect to " + base + ". Make sure the server/provider is running.";
  }
  return apiMessage
    ? "Provider API " + (status ?? "error") + ": " + apiMessage
    : "Provider request failed" + (status ? " (" + status + ")" : "") + ".";
}

async function parseError(response: Response, lang: Lang, baseUrl?: string): Promise<Error> {
  let apiMessage: string | null = null;
  try {
    const data = await response.json();
    apiMessage = data?.error?.message ?? data?.message ?? null;
  } catch {
    // not JSON — ignore
  }
  return new Error(providerErrorMessage(lang, response.status, apiMessage, undefined, baseUrl));
}

function emptyResponseError(lang?: Lang): Error {
  return new Error(
    lang === "id"
      ? "Provider mengembalikan respons kosong."
      : "The provider returned an empty response.",
  );
}

// ---------------------------------------------------------------------------
// Message conversion
// ---------------------------------------------------------------------------

function splitSystem(messages: AIMessage[]): { system: string; messages: AIMessage[] } {
  const system = messages
    .filter((message) => message.role === "system")
    .map((message) => contentToText(message.content))
    .join("\n")
    .trim();
  return { system, messages: messages.filter((message) => message.role !== "system") };
}

function toOpenAIMessages(messages: AIMessage[]): unknown[] {
  return messages.map((message) => {
    let content = message.content;
    // OpenAI-compatible lebih stabil dengan string utk teks murni;
    // array cuma dipakai kalau ada gambar.
    if (Array.isArray(content)) {
      const hasImage = content.some((p) => p.type === "image_url");
      if (!hasImage) {
        content = content
          .map((p) => (p.type === "text" ? p.text ?? "" : ""))
          .join("")
          .trim();
      }
    }
    return { role: message.role, content };
  });
}

function toAnthropicContent(content: string | ContentPart[]): unknown[] {
  if (typeof content === "string") {
    return [{ type: "text", text: content }];
  }
  return content.map((part) => {
    if (part.type === "text") {
      return { type: "text", text: part.text ?? "" };
    }
    const url = part.image_url?.url ?? "";
    const dataMatch = /^data:(image\/[\w.+-]+);base64,(.+)$/s.exec(url);
    if (dataMatch) {
      return {
        type: "image",
        source: { type: "base64", media_type: dataMatch[1], data: dataMatch[2] },
      };
    }
    return { type: "image", source: { type: "url", url } };
  });
}

function toAnthropicMessages(messages: AIMessage[]): unknown[] {
  return messages.map((message) => ({
    role: message.role === "assistant" ? "assistant" : "user",
    content: toAnthropicContent(message.content),
  }));
}

function normalizeUsage(inputTokens: number, outputTokens: number): TokenUsage | undefined {
  if (!inputTokens && !outputTokens) {
    return undefined;
  }
  return {
    prompt_tokens: inputTokens,
    completion_tokens: outputTokens,
    total_tokens: inputTokens + outputTokens,
  };
}

// ---------------------------------------------------------------------------
// OpenAI-compatible chat completions (streaming + one-shot)
// ---------------------------------------------------------------------------

async function streamOpenAI(params: StreamParams): Promise<StreamResult> {
  const { settings, lang, signal, callbacks } = params;
  const { system, messages } = splitSystem(params.messages);
  // Jangan kirim system kosong — beberapa model jadi aneh / salah identitas.
  const openaiMessages = [
    ...(system ? [{ role: "system", content: system }] : []),
    ...toOpenAIMessages(messages),
  ];

  // DEBUG sementara — hapus setelah ketemu masalah bus/blind spot
  if (__DEV__) {
    console.log(
      "[Lumen API]",
      settings.model,
      JSON.stringify(
        openaiMessages.map((m) => ({
          role: (m as { role: string }).role,
          content:
            typeof (m as { content: unknown }).content === "string"
              ? String((m as { content: string }).content).slice(0, 80)
              : "[parts]",
        })),
      ),
    );
  }

  const response = await expoFetch(normalizeBaseUrl(settings.baseUrl) + "/chat/completions", {
    method: "POST",
    signal,
    headers: {
      "Content-Type": "application/json",
      ...(settings.apiKey.trim() ? { Authorization: "Bearer " + settings.apiKey.trim() } : {}),
    },
    body: JSON.stringify({
      model: settings.model,
      messages: openaiMessages,
      stream: true,
      ...(reasoningEffort(settings.thinking) ? { reasoning_effort: reasoningEffort(settings.thinking) } : {}),
    }),
  });

  if (!response.ok) {
    throw await parseError(response, lang ?? "en", settings.baseUrl);
  }
  if (!response.body) {
    throw new Error(
      lang === "id"
        ? "Runtime ini tidak mendukung streaming."
        : "This runtime does not support streaming.",
    );
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  let fullContent = "";
  let usage: TokenUsage | undefined;
  let finishReason: string | null = null;

  const handleLine = (line: string) => {
    const trimmed = line.replace(/\r$/, "");
    if (!trimmed.startsWith("data:")) {
      return;
    }
    const data = trimmed.slice(5).trim();
    if (data === "[DONE]") {
      return;
    }
    try {
      const chunk = JSON.parse(data);
      const choice = chunk?.choices?.[0];
      // Some compatible servers (vLLM, Ollama) send `message` instead of `delta`.
      const delta = choice?.delta ?? choice?.message ?? {};
      if (typeof delta?.content === "string") {
        fullContent += delta.content;
        callbacks.onDelta?.(delta.content);
      }
      if (choice?.finish_reason) {
        finishReason = choice.finish_reason;
      }
      if (chunk?.usage) {
        usage = chunk.usage;
        callbacks.onUsage?.(chunk.usage);
      }
    } catch {
      // malformed chunk — ignore
    }
  };

  while (true) {
    const { done, value } = await reader.read();
    if (done) {
      break;
    }
    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split("\n");
    buffer = lines.pop() ?? "";
    for (const line of lines) {
      handleLine(line);
    }
  }
  if (buffer.trim()) {
    handleLine(buffer);
  }

  if (!fullContent.trim()) {
    throw emptyResponseError(lang);
  }
  return { content: fullContent, usage, finishReason };
}

async function completeOpenAI(params: RequestParams): Promise<{ content: string; usage?: TokenUsage }> {
  const { settings, lang, signal } = params;
  const { system, messages } = splitSystem(params.messages);
  const openaiMessages = [
    ...(system ? [{ role: "system", content: system }] : []),
    ...toOpenAIMessages(messages),
  ];

  const response = await expoFetch(normalizeBaseUrl(settings.baseUrl) + "/chat/completions", {
    method: "POST",
    signal,
    headers: {
      "Content-Type": "application/json",
      ...(settings.apiKey.trim() ? { Authorization: "Bearer " + settings.apiKey.trim() } : {}),
    },
    body: JSON.stringify({
      model: settings.model,
      messages: openaiMessages,
      stream: false,
      ...(reasoningEffort(settings.thinking) ? { reasoning_effort: reasoningEffort(settings.thinking) } : {}),
    }),
  });

  if (!response.ok) {
    throw await parseError(response, lang ?? "en", settings.baseUrl);
  }
  const data = await response.json();
  const content = data?.choices?.[0]?.message?.content;
  if (typeof content !== "string" || !content.trim()) {
    throw emptyResponseError(lang);
  }
  return { content, usage: data?.usage };
}

// ---------------------------------------------------------------------------
// Anthropic Messages API (streaming + one-shot)
// ---------------------------------------------------------------------------

function anthropicHeaders(apiKey: string): Record<string, string> {
  return {
    "Content-Type": "application/json",
    "x-api-key": apiKey.trim(),
    "anthropic-version": "2023-06-01",
  };
}

async function streamAnthropic(params: StreamParams): Promise<StreamResult> {
  const { settings, lang, signal, callbacks } = params;
  const { system, messages } = splitSystem(params.messages);

  const response = await expoFetch(normalizeBaseUrl(settings.baseUrl) + "/messages", {
    method: "POST",
    signal,
    headers: anthropicHeaders(settings.apiKey),
    body: JSON.stringify({
      model: settings.model,
      max_tokens: 8192,
      ...(thinkingBudget(settings.thinking) !== undefined
        ? { thinking: { type: "enabled", budget_tokens: thinkingBudget(settings.thinking) } }
        : {}),
      ...(system ? { system } : {}),
      messages: toAnthropicMessages(messages),
      stream: true,
    }),
  });

  if (!response.ok) {
    throw await parseError(response, lang ?? "en", settings.baseUrl);
  }
  if (!response.body) {
    throw new Error(
      lang === "id"
        ? "Runtime ini tidak mendukung streaming."
        : "This runtime does not support streaming.",
    );
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  let fullContent = "";
  let inputTokens = 0;
  let outputTokens = 0;
  let finishReason: string | null = null;
  let apiError: string | null = null;

  const handleLine = (line: string) => {
    const trimmed = line.replace(/\r$/, "");

    if (!trimmed.startsWith("data:")) {
      return;
    }
    const data = trimmed.slice(5).trim();
    if (!data) {
      return;
    }

    try {
      const event = JSON.parse(data) as {
        type?: string;
        delta?: { type?: string; text?: string };
        usage?: { input_tokens?: number; output_tokens?: number };
        stop_reason?: string | null;
        error?: { message?: string; type?: string };
      };

      if (event.type === "message_start" && event.usage?.input_tokens) {
        inputTokens = event.usage.input_tokens;
      }
      if (event.type === "content_block_delta" && event.delta?.type === "text_delta" && event.delta.text) {
        fullContent += event.delta.text;
        callbacks.onDelta?.(event.delta.text);
      }
      if (event.type === "message_delta") {
        if (event.usage?.output_tokens) {
          outputTokens = event.usage.output_tokens;
        }
        if (event.stop_reason) {
          finishReason = event.stop_reason;
        }
      }
      if (event.type === "error" && event.error?.message) {
        apiError = event.error.message;
      }
    } catch {
      // malformed event — ignore
    }
  };

  while (true) {
    const { done, value } = await reader.read();
    if (done) {
      break;
    }
    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split("\n");
    buffer = lines.pop() ?? "";
    for (const line of lines) {
      handleLine(line);
    }
  }
  if (buffer.trim()) {
    handleLine(buffer);
  }

  if (apiError) {
    throw new Error("Provider API error: " + apiError);
  }
  if (!fullContent.trim()) {
    throw emptyResponseError(lang);
  }

  const usage = normalizeUsage(inputTokens, outputTokens);
  if (usage) {
    callbacks.onUsage?.(usage);
  }
  return { content: fullContent, usage, finishReason };
}

async function completeAnthropic(params: RequestParams): Promise<{ content: string; usage?: TokenUsage }> {
  const { settings, lang, signal } = params;
  const { system, messages } = splitSystem(params.messages);

  const response = await expoFetch(normalizeBaseUrl(settings.baseUrl) + "/messages", {
    method: "POST",
    signal,
    headers: anthropicHeaders(settings.apiKey),
    body: JSON.stringify({
      model: settings.model,
      max_tokens: 8192,
      ...(thinkingBudget(settings.thinking) !== undefined
        ? { thinking: { type: "enabled", budget_tokens: thinkingBudget(settings.thinking) } }
        : {}),
      ...(system ? { system } : {}),
      messages: toAnthropicMessages(messages),
      stream: false,
    }),
  });

  if (!response.ok) {
    throw await parseError(response, lang ?? "en", settings.baseUrl);
  }
  const data = (await response.json()) as {
    content?: Array<{ type?: string; text?: string }>;
    usage?: { input_tokens?: number; output_tokens?: number };
  };
  const content = data?.content
    ?.filter((part) => part.type === "text")
    .map((part) => part.text ?? "")
    .join("")
    .trim();

  if (!content) {
    throw emptyResponseError(lang);
  }
  const usage = normalizeUsage(data?.usage?.input_tokens ?? 0, data?.usage?.output_tokens ?? 0);
  return { content, usage };
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

export async function streamProviderMessage(
  params: StreamParams,
): Promise<StreamResult> {
  if (params.settings.apiFormat === "anthropic") {
    return streamAnthropic(params);
  }
  return streamOpenAI(params);
}

export async function completeProviderMessage(
  params: RequestParams,
): Promise<{ content: string; usage?: TokenUsage }> {
  if (params.settings.apiFormat === "anthropic") {
    return completeAnthropic(params);
  }
  return completeOpenAI(params);
}

export interface ConnectionTestResult {
  ok: boolean;
  /** Human-readable, localized message shown next to the Test button. */
  message: string;
}

/**
 * Full connection test used by the Settings "Test connection" button.
 * Sends a tiny real request (max_tokens 1) so it can distinguish a bad API
 * key (401/403) from a wrong endpoint (404) from a rate limit (429) — a plain
 * GET /models cannot do that because several providers (OpenCode Go) return
 * 200 to /models even with an invalid key.
 */
export async function testProviderConnection(
  settings: Pick<ProviderConfig, "baseUrl" | "apiKey" | "model" | "apiFormat">,
  lang: Lang = "en",
): Promise<ConnectionTestResult> {
  const base = normalizeBaseUrl(settings.baseUrl);
  if (!base) {
    return {
      ok: false,
      message: lang === "id" ? "Base URL masih kosong." : "Base URL is empty.",
    };
  }
  try {
    if (settings.apiFormat === "anthropic") {
      const response = await expoFetch(base + "/messages", {
        method: "POST",
        headers: anthropicHeaders(settings.apiKey),
        body: JSON.stringify({
          model: settings.model,
          max_tokens: 1,
          messages: [{ role: "user", content: "ping" }],
        }),
      });
      if (response.ok) {
        return { ok: true, message: lang === "id" ? "Terkoneksi — API key valid." : "Connected — API key is valid." };
      }
      return { ok: false, message: await parseError(response, lang, base).then((error) => error.message) };
    }

    const response = await expoFetch(base + "/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(settings.apiKey.trim() ? { Authorization: "Bearer " + settings.apiKey.trim() } : {}),
      },
      body: JSON.stringify({
        model: settings.model,
        messages: [{ role: "user", content: "ping" }],
        max_tokens: 1,
        stream: false,
      }),
    });
    if (response.ok) {
      return { ok: true, message: lang === "id" ? "Terkoneksi — API key valid." : "Connected — API key is valid." };
    }
    return { ok: false, message: await parseError(response, lang, base).then((error) => error.message) };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return {
      ok: false,
      message:
        lang === "id"
          ? "Tidak bisa connect ke provider (network). " + message
          : "Cannot reach the provider (network). " + message,
    };
  }
}

export function contentToText(content: string | ContentPart[]): string {
  if (typeof content === "string") {
    return content;
  }
  return content
    .map((part) => (part.type === "text" ? part.text ?? "" : "[image]"))
    .join(" ")
    .trim();
}