import AsyncStorage from "@react-native-async-storage/async-storage";
import * as SecureStore from "expo-secure-store";
import { createProviderConfig, getProvider } from "./providers";
import type {
  AppSettings,
  ChatThread,
  ProviderApiFormat,
  ProviderConfig,
  ProviderId,
  ThinkingLevel,
} from "../types/chat";
import { newId } from "../utils/id";

// Versi mobile: data disimpan di AsyncStorage (pengganti localStorage web).
// API key di SecureStore (Android Keystore) — tidak lagi di AsyncStorage.
const SETTINGS_KEY = "lumen-ai.settings.v5";
const CHATS_KEY = "lumen-ai.chats.v2";
const SECURE_KEY_PREFIX = "lumen.key.";

// Legacy keys (one-time migration):
//  - v4 era: multi-provider, tanpa accent/profileName
//  - v3 era: single provider fields (providerId/baseUrl/apiKey/model/apiFormat)
//  - v1/v2 era: Hermes gateway settings (apiKey/baseUrl/profile)
const LEGACY_SETTINGS_KEYS = [
  "lumen-ai.settings.v4",
  "lumen-ai.settings.v3",
  "lumen-ai.settings.v2",
  "lumen-ai.settings",
];
const LEGACY_CHATS_KEY = "lumen-ai.chats";

type LegacyV3Settings = Partial<{
  providerId: ProviderId;
  baseUrl: string;
  apiKey: string;
  model: string;
  apiFormat: ProviderApiFormat;
  theme: "dark" | "light";
  language: "en" | "id";
}>;

type LegacyHermesSettings = Partial<{
  apiKey: string;
  baseUrl: string;
  profile: string;
  theme: "dark" | "light";
  language: "en" | "id";
}>;

function secureId(id: string): string {
  return `${SECURE_KEY_PREFIX}${id}`;
}

async function storeApiKey(id: string, key: string): Promise<void> {
  try {
    if (key) {
      await SecureStore.setItemAsync(secureId(id), key);
    } else {
      await SecureStore.deleteItemAsync(secureId(id));
    }
  } catch {
    // SecureStore unavailable (web/simulator edge) — fallback ke tempat kosong.
  }
}

async function loadApiKey(id: string): Promise<string> {
  try {
    return (await SecureStore.getItemAsync(secureId(id))) ?? "";
  } catch {
    return "";
  }
}

/** Pindahkan apiKey provider ke SecureStore; return provider tanpa key (untuk AsyncStorage). */
async function stripAndStoreKeys(providers: ProviderConfig[]): Promise<ProviderConfig[]> {
  const cleaned: ProviderConfig[] = [];
  for (const p of providers) {
    await storeApiKey(p.id, p.apiKey);
    cleaned.push({ ...p, apiKey: "" });
  }
  return cleaned;
}

async function hydrateKeys(providers: ProviderConfig[]): Promise<ProviderConfig[]> {
  return Promise.all(
    providers.map(async (p) => ({
      ...p,
      apiKey: p.apiKey || (await loadApiKey(p.id)),
    })),
  );
}

function safeParse<T>(value: string | null, fallback: T): T {
  if (!value) {
    return fallback;
  }
  try {
    return JSON.parse(value) as T;
  } catch {
    return fallback;
  }
}

export function createDefaultSettings(): AppSettings {
  const provider = createProviderConfig("opencode-go");
  return {
    providers: [provider],
    activeProviderId: provider.id,
    theme: "dark",
    language: "en",
  };
}

function isValidProviderConfig(value: unknown): value is ProviderConfig {
  if (!value || typeof value !== "object") {
    return false;
  }
  const provider = value as Partial<ProviderConfig>;
  return (
    typeof provider.id === "string" &&
    typeof provider.kind === "string" &&
    (typeof provider.name === "string" || provider.name === undefined) &&
    typeof provider.baseUrl === "string" &&
    typeof provider.apiKey === "string" &&
    typeof provider.model === "string" &&
    (provider.apiFormat === "openai" || provider.apiFormat === "anthropic")
  );
}

const THINKING_LEVELS: ThinkingLevel[] = ["off", "low", "medium", "high", "max"];

function sanitizeThinking(value: unknown): ThinkingLevel {
  if (typeof value === "string" && (THINKING_LEVELS as string[]).includes(value)) {
    return value as ThinkingLevel;
  }
  // Migrasi dari versi lama: `thinking: true` (boolean) → default "medium".
  if (value === true) {
    return "medium";
  }
  return "off";
}

function sanitizeProvider(provider: Partial<ProviderConfig>): ProviderConfig {
  const kind: ProviderId =
    provider.kind && getProvider(provider.kind).id === provider.kind
      ? provider.kind
      : "custom";
  const def = getProvider(kind);
  return {
    id: typeof provider.id === "string" && provider.id ? provider.id : newId(),
    kind,
    name: typeof provider.name === "string" && provider.name.trim() ? provider.name : def.label,
    baseUrl: typeof provider.baseUrl === "string" ? provider.baseUrl : def.baseUrl,
    apiKey: typeof provider.apiKey === "string" ? provider.apiKey : "",
    model: typeof provider.model === "string" && provider.model.trim() ? provider.model : def.defaultModel,
    apiFormat:
      provider.apiFormat === "anthropic" || provider.apiFormat === "openai"
        ? provider.apiFormat
        : def.apiFormat,
    thinking: sanitizeThinking(provider.thinking),
  };
}

/** Convert a v3 single-provider setting into a v4 provider config. */
function fromV3Settings(v3: LegacyV3Settings): ProviderConfig | null {
  if (!v3 || typeof v3.providerId !== "string") {
    return null;
  }
  const kind: ProviderId = getProvider(v3.providerId as ProviderId).id === v3.providerId
    ? (v3.providerId as ProviderId)
    : "custom";
  return sanitizeProvider({
    kind,
    baseUrl: v3.baseUrl,
    apiKey: v3.apiKey,
    model: v3.model,
    apiFormat: v3.apiFormat,
  });
}

/** Migrate pre-provider (Hermes era) settings into a provider config. */
function fromHermesSettings(legacy: LegacyHermesSettings | undefined): ProviderConfig | null {
  if (!legacy) {
    return null;
  }
  const oldBase = typeof legacy.baseUrl === "string" ? legacy.baseUrl.trim() : "";
  const oldKey = typeof legacy.apiKey === "string" ? legacy.apiKey : "";
  const isHermesGateway =
    oldBase.startsWith("http://127.0.0.1:8642") || oldBase.startsWith("http://localhost:8642");

  if (isHermesGateway || !oldBase) {
    // Old Hermes setup → start fresh on the OpenCode Go trial preset.
    return createProviderConfig("opencode-go");
  }
  // User had a custom (non-Hermes) endpoint → keep it as a custom provider.
  return sanitizeProvider({
    kind: "custom",
    baseUrl: oldBase,
    apiKey: oldKey,
    model: typeof legacy.profile === "string" ? legacy.profile : "",
  });
}

export async function loadSettings(): Promise<AppSettings> {
  const defaults = createDefaultSettings();
  const out: AppSettings = { ...defaults, providers: [...defaults.providers] };

  const stored = safeParse<Partial<AppSettings>>(await AsyncStorage.getItem(SETTINGS_KEY), {});

  if (Array.isArray(stored.providers)) {
    // v4: sanitize the stored list.
    const providers = stored.providers.filter(isValidProviderConfig).map(sanitizeProvider);
    if (providers.length > 0) {
      out.providers = providers;
    }
    const activeStillExists = out.providers.some((provider) => provider.id === stored.activeProviderId);
    out.activeProviderId =
      typeof stored.activeProviderId === "string" && activeStillExists
        ? stored.activeProviderId
        : out.providers[0].id;
  } else {
    // One-time migration from older shapes.
    let migrated: ProviderConfig | null = null;

    // v4 (multi-provider list, tanpa accent/profileName)
    const v4 = safeParse<Partial<AppSettings>>(
      await AsyncStorage.getItem("lumen-ai.settings.v4"),
      {},
    );
    if (Array.isArray(v4.providers)) {
      const providers = v4.providers.filter(isValidProviderConfig).map(sanitizeProvider);
      if (providers.length > 0) {
        out.providers = providers;
        const activeStillExists = providers.some((p) => p.id === v4.activeProviderId);
        out.activeProviderId =
          typeof v4.activeProviderId === "string" && activeStillExists
            ? v4.activeProviderId
            : providers[0].id;
      }
      if (typeof v4.theme === "string") out.theme = v4.theme === "light" ? "light" : "dark";
      if (v4.language === "en" || v4.language === "id") out.language = v4.language;
    } else {
      // v3 (single provider fields)
      migrated = fromV3Settings(
        safeParse<LegacyV3Settings>(await AsyncStorage.getItem("lumen-ai.settings.v3"), {}),
      );

      // v1/v2 (Hermes era)
      if (!migrated) {
        for (const key of ["lumen-ai.settings.v2", "lumen-ai.settings"]) {
          migrated = fromHermesSettings(
            safeParse<LegacyHermesSettings>(await AsyncStorage.getItem(key), {}),
          );
          if (migrated) {
            break;
          }
        }
      }

      if (migrated) {
        out.providers = [migrated];
        out.activeProviderId = migrated.id;
      }

      // Carry over theme/language from any legacy shape.
      for (const key of LEGACY_SETTINGS_KEYS) {
        const legacy = safeParse<LegacyV3Settings | LegacyHermesSettings>(
          await AsyncStorage.getItem(key),
          {},
        );
        if (legacy && (legacy.theme === "dark" || legacy.theme === "light")) {
          out.theme = legacy.theme;
        }
        if (legacy && (legacy.language === "en" || legacy.language === "id")) {
          out.language = legacy.language;
        }
        break;
      }
    }
  }

  if (typeof stored.accent === "string" && /^#[0-9a-fA-F]{6}$/.test(stored.accent)) {
    out.accent = stored.accent;
  }
  if (typeof stored.profileName === "string") {
    out.profileName = stored.profileName;
  }

  // Ambil API key dari SecureStore (migrasi: kalau masih ada key di JSON, pindahkan).
  out.providers = await hydrateKeys(out.providers);

  return out;
}

export async function saveSettings(settings: AppSettings): Promise<void> {
  const providers = await stripAndStoreKeys(settings.providers);
  // pendingShare hanya ephemeral (share intent) — jangan persist
  const { pendingShare: _share, ...rest } = settings;
  await AsyncStorage.setItem(
    SETTINGS_KEY,
    JSON.stringify({ ...rest, providers }),
  );
}

export async function loadChats(): Promise<ChatThread[]> {
  let chats = safeParse<ChatThread[]>(await AsyncStorage.getItem(CHATS_KEY), []);
  // Migrate from legacy key when v2 is empty.
  if (chats.length === 0) {
    const legacy = safeParse<ChatThread[]>(await AsyncStorage.getItem(LEGACY_CHATS_KEY), []);
    if (legacy.length > 0) {
      chats = legacy;
      void saveChats(chats);
    }
  }
  return chats;
}

export async function saveChats(chats: ChatThread[]): Promise<void> {
  await AsyncStorage.setItem(CHATS_KEY, JSON.stringify(chats));
}