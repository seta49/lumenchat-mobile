import type {
  AppSettings,
  ProviderApiFormat,
  ProviderConfig,
  ProviderId,
} from "../types/chat";
import { newId } from "../utils/id";

export interface ModelInfo {
  id: string;
  /** Label pendek buat dropdown model (kalau kosong: pakai id apa adanya). */
  label?: string;
  /** Deskripsi satu baris ala Gemini ("Jawaban tercepat", dll). */
  blurb?: string;
}

export interface ProviderTemplate {
  id: ProviderId;
  label: string;
  baseUrl: string;
  apiFormat: ProviderApiFormat;
  defaultModel: string;
  /** Known model ids for suggestions (user can still type any model). */
  models: string[];
  /** Metadata tampilan model yang dikenal (sisa model = tanpa subtitle). */
  modelInfo?: ModelInfo[];
  /** Short hint for the API key input placeholder. */
  keyHint?: string;
}

/**
 * Provider templates shown in the "Add provider" flow. Lumen no longer ships
 * a fixed backend: each added provider is an independent configuration
 * (OpenCode Go, OpenAI, Anthropic, OpenRouter, Ollama, or a custom
 * OpenAI/Anthropic-compatible endpoint).
 */
export const PROVIDERS: ProviderTemplate[] = [
  {
    id: "opencode-go",
    label: "OpenCode Go",
    baseUrl: "https://opencode.ai/zen/go/v1",
    apiFormat: "openai",
    defaultModel: "deepseek-v4-flash",
    models: [
      "deepseek-v4-flash",
      "deepseek-v4-pro",
      "kimi-k3",
      "kimi-k2.7-code",
      "kimi-k2.6",
      "glm-5.3",
      "glm-5.2",
      "glm-5.1",
      "mimo-v2.5",
      "mimo-v2.5-pro",
      "minimax-m3",
      "minimax-m2.7",
      "hy3",
    ],
    modelInfo: [
      { id: "deepseek-v4-flash", label: "Flash", blurb: "model.blurb.flash" },
      { id: "deepseek-v4-pro", label: "Pro", blurb: "model.blurb.deep" },
      { id: "kimi-k3", blurb: "model.blurb.deep" },
      { id: "kimi-k2.7-code", label: "K2.7 Code", blurb: "model.blurb.code" },
      { id: "kimi-k2.6" },
      { id: "glm-5.3" },
      { id: "glm-5.2" },
      { id: "glm-5.1" },
      { id: "mimo-v2.5", blurb: "model.blurb.vision" },
      { id: "mimo-v2.5-pro" },
      { id: "minimax-m3" },
      { id: "minimax-m2.7" },
      { id: "hy3" },
    ],
    keyHint: "Paste your API key from the OpenCode Zen console (opencode.ai/zen)",
  },
  {
    id: "openai",
    label: "OpenAI",
    baseUrl: "https://api.openai.com/v1",
    apiFormat: "openai",
    defaultModel: "gpt-4o",
    models: ["gpt-4o", "gpt-4o-mini", "gpt-4.1", "gpt-4.1-mini", "o3-mini"],
  },
  {
    id: "anthropic",
    label: "Anthropic",
    baseUrl: "https://api.anthropic.com/v1",
    apiFormat: "anthropic",
    defaultModel: "claude-sonnet-4-5",
    models: [
      "claude-sonnet-4-5",
      "claude-opus-4-1",
      "claude-haiku-4-5",
      "claude-3-7-sonnet-latest",
    ],
  },
  {
    id: "openrouter",
    label: "OpenRouter",
    baseUrl: "https://openrouter.ai/api/v1",
    apiFormat: "openai",
    defaultModel: "openrouter/auto",
    models: [
      "openrouter/auto",
      "deepseek/deepseek-chat-v3-0324",
      "anthropic/claude-sonnet-4.5",
      "google/gemini-2.5-pro",
    ],
  },
  {
    id: "ollama",
    label: "Ollama (local)",
    baseUrl: "http://localhost:11434/v1",
    apiFormat: "openai",
    defaultModel: "llama3.2",
    models: ["llama3.2", "llama3.1", "qwen2.5", "mistral"],
    keyHint: "Local — no API key needed",
  },
  {
    id: "custom",
    label: "Custom (OpenAI-compatible)",
    baseUrl: "",
    apiFormat: "openai",
    defaultModel: "",
    models: [],
    keyHint: "Paste your API key (leave empty if not required)",
  },
];

export function getProvider(id: ProviderId): ProviderTemplate {
  return PROVIDERS.find((provider) => provider.id === id) ?? PROVIDERS[0];
}

export function providerLabel(kind: ProviderId): string {
  return getProvider(kind).label;
}

/**
 * Create a fresh provider config from a template. Custom providers start
 * empty; presets get the registry defaults (base URL, model, wire format).
 */
export function createProviderConfig(
  kind: ProviderId,
  overrides?: Partial<ProviderConfig>,
): ProviderConfig {
  const def = getProvider(kind);
  return {
    id: newId(),
    kind,
    name: def.label,
    baseUrl: def.baseUrl,
    apiKey: "",
    model: def.defaultModel,
    apiFormat: def.apiFormat,
    ...overrides,
  };
}

/** Resolve the active provider, falling back to the first one. */
export function getActiveProvider(settings: AppSettings): ProviderConfig {
  const found = settings.providers.find((provider) => provider.id === settings.activeProviderId);
  return found ?? settings.providers[0];
}

/** Label + blurb buat model di dropdown header; unknown model = label = id. */
export function resolveModelInfo(
  kind: ProviderId,
  modelId: string,
): { label: string; blurbKey?: string } {
  const def = getProvider(kind);
  const info = def.modelInfo?.find((m) => m.id === modelId);
  return { label: info?.label ?? modelId, blurbKey: info?.blurb };
}