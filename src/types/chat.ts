import type { Lang } from "../i18n/translations";

export type ThemeMode = "dark" | "light";

export type ChatRole = "user" | "assistant" | "system";

/** Wire format spoken with the provider endpoint. */
export type ProviderApiFormat = "openai" | "anthropic";

/** Provider template ids (kind) from the registry, plus free-form "custom". */
export type ProviderId =
  | "opencode-go"
  | "openai"
  | "anthropic"
  | "openrouter"
  | "ollama"
  | "custom";

/** Tingkat reasoning yang dikirim ke provider ("off" = thinking mati). */
export type ThinkingLevel = "off" | "low" | "medium" | "high" | "max";

/** A concrete, user-added provider configuration. */
export interface ProviderConfig {
  id: string;
  /** Which registry template this config was created from. */
  kind: ProviderId;
  /** Display name (auto-generated from the template, editable). */
  name: string;
  baseUrl: string;
  apiKey: string;
  model: string;
  apiFormat: ProviderApiFormat;
  /** Mode berpikir (reasoning) — dikirim sebagai reasoning_effort/thinking ke provider. */
  thinking?: ThinkingLevel;
}

export interface ContentPart {
  type: "text" | "image_url";
  text?: string;
  /** width/height optional — dipakai UI mobile untuk aspect-ratio rendering. */
  image_url?: { url: string; width?: number; height?: number };
}

export interface TokenUsage {
  prompt_tokens: number;
  completion_tokens: number;
  total_tokens: number;
}

export interface ChatMessage {
  id: string;
  role: ChatRole;
  content: string | ContentPart[];
  createdAt: number;
  usage?: TokenUsage;
}

export interface ChatThread {
  id: string;
  title: string;
  systemPrompt?: string;
  messages: ChatMessage[];
  createdAt: number;
  updatedAt: number;
}

export interface AppSettings {
  /** All providers the user has added. */
  providers: ProviderConfig[];
  /** Id of the provider used for chat. */
  activeProviderId: string;
  theme: ThemeMode;
  language: Lang;
  /** Hex accent color (override preset palet). Default biru Lumen. */
  accent?: string;
  /** Nama panggilan di greeting layar home. */
  profileName?: string;
}

export interface AIMessage {
  role: ChatRole;
  content: string | ContentPart[];
}