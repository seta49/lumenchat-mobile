import { fetch as expoFetch } from "expo/fetch";
import type { ProviderConfig } from "../types/chat";

/** Cache daftar model per provider (id) — refresh manual lewat tombol. */
const cache = new Map<string, string[]>();

/**
 * Fetch daftar model dari endpoint OpenAI-compatible `GET {baseUrl}/models`.
 * Return null kalau gagal (offline / butuh auth / format aneh) — pemanggil
 * fallback ke daftar template. OpenCode Go & Ollama & kebanyakan endpoint
 * OpenAI-compatible gak butuh API key buat /models.
 */
export async function fetchProviderModels(
  provider: ProviderConfig,
  force = false,
): Promise<string[] | null> {
  if (!force && cache.has(provider.id)) {
    return cache.get(provider.id) ?? null;
  }
  try {
    const base = provider.baseUrl.trim().replace(/\/+$/, "");
    const res = await expoFetch(base + "/models", {
      method: "GET",
      headers: provider.apiKey.trim()
        ? { Authorization: "Bearer " + provider.apiKey.trim() }
        : {},
    });
    if (!res.ok) return null;
    const data = (await res.json()) as {
      data?: Array<{ id?: string }>;
      models?: Array<{ name?: string }>;
    };
    // OpenAI-compatible balikin { data: [{id}] }; Ollama gaya baru { models: [{name}] }.
    const ids = [
      ...(data.data ?? []).map((m) => (m.id ?? "").trim()),
      ...(data.models ?? []).map((m) => (m.name ?? "").trim()),
    ].filter((id) => id && !id.startsWith(":"));
    if (!ids.length) return null;
    const sorted = Array.from(new Set(ids)).sort();
    cache.set(provider.id, sorted);
    return sorted;
  } catch {
    return null;
  }
}
