import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import type {
  AIMessage,
  AppSettings,
  ChatMessage,
  ChatThread,
  ContentPart,
  ProviderConfig,
  ThinkingLevel,
} from "./types/chat";
import { createProviderConfig, getActiveProvider } from "./services/providers";
import { streamProviderMessage } from "./services/ai";
import { loadChats, loadSettings, saveChats, saveSettings } from "./services/storage";
import { newId } from "./utils/id";

interface StoreValue {
  ready: boolean;
  settings: AppSettings;
  threads: ChatThread[];
  activeThreadId: string | null;
  activeThread: ChatThread | null;
  /** Message id yang sedang di-stream (ada = sedang berpikir). */
  streamingId: string | null;
  createThread: () => void;
  deleteThread: (id: string) => void;
  renameThread: (id: string, title: string) => void;
  setActiveThread: (id: string) => void;
  send: (text: string, images: ContentPart[]) => Promise<void>;
  /** Generate ulang jawaban assistant (hapus pesan itu, kirim ulang konteks s/d sebelumnya). */
  regenerate: (assistantMessageId: string) => Promise<void>;
  /** Ganti isi pesan user & hapus semua pesan setelahnya, lalu stream jawaban baru. */
  editAndResend: (userMessageId: string, text: string) => Promise<void>;
  deleteMessage: (messageId: string) => void;
  stop: () => void;
  updateSettings: (patch: Partial<AppSettings>) => void;
  addProvider: (config: ProviderConfig) => void;
  updateProvider: (id: string, patch: Partial<ProviderConfig>) => void;
  removeProvider: (id: string) => void;
  setActiveProvider: (id: string) => void;
  setThinking: (level: ThinkingLevel) => void;
  setModel: (model: string) => void;
}

const StoreContext = createContext<StoreValue | null>(null);

export function StoreProvider({ children }: { children: ReactNode }) {
  const [ready, setReady] = useState(false);
  const [settings, setSettings] = useState<AppSettings>(() => ({
    providers: [],
    activeProviderId: "",
    theme: "dark",
    language: "en",
  }));
  const [threads, setThreads] = useState<ChatThread[]>([]);
  const [activeThreadId, setActiveThreadId] = useState<string | null>(null);
  const [streamingId, setStreamingId] = useState<string | null>(null);

  const abortRef = useRef<AbortController | null>(null);

  // Snapshot terbaru buat dipakai di async callback (send/stop) tanpa stale closure.
  const stateRef = useRef({ settings, threads, activeThreadId });
  stateRef.current = { settings, threads, activeThreadId };
  const streamingIdRef = useRef<string | null>(null);
  streamingIdRef.current = streamingId;

  // ------------------------------------------------------------------ load
  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const [st, ch] = await Promise.all([loadSettings(), loadChats()]);
      if (cancelled) {
        return;
      }
      setSettings(st);
      setThreads(ch);
      setActiveThreadId(ch[0]?.id ?? null);
      setReady(true);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  // ------------------------------------------------------------- persistence
  useEffect(() => {
    if (ready) {
      void saveChats(threads);
    }
  }, [threads, ready]);

  useEffect(() => {
    if (ready) {
      void saveSettings(settings);
    }
  }, [settings, ready]);

  // ---------------------------------------------------------------- actions
  const createThread = useCallback(() => {
    const thread: ChatThread = {
      id: newId(),
      title: `Chat ${stateRef.current.threads.length + 1}`,
      messages: [],
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };
    setThreads((ts) => [thread, ...ts]);
    setActiveThreadId(thread.id);
  }, []);

  const deleteThread = useCallback((id: string) => {
    setThreads((ts) => ts.filter((t) => t.id !== id));
    if (stateRef.current.activeThreadId === id) {
      const remaining = stateRef.current.threads.filter((t) => t.id !== id);
      setActiveThreadId(remaining[0]?.id ?? null);
    }
  }, []);

  const renameThread = useCallback((id: string, title: string) => {
    setThreads((ts) =>
      ts.map((t) => (t.id === id ? { ...t, title, updatedAt: Date.now() } : t)),
    );
  }, []);

  const setActiveThread = useCallback((id: string) => {
    setActiveThreadId(id);
  }, []);

  const stop = useCallback(() => {
    abortRef.current?.abort();
    abortRef.current = null;
    setStreamingId(null);
  }, []);

  /** Inti streaming: stream jawaban ke assistantMsgId di thread threadId dengan
   * historyMessages sebagai konteks. Dipakai send/regenerate/editAndResend. */
  const streamAssistant = useCallback(
    async (
      threadId: string,
      assistantMsg: ChatMessage,
      historyMessages: AIMessage[],
      currentSettings: AppSettings,
    ) => {
      const provider = getActiveProvider(currentSettings);
      if (!provider) {
        setStreamingId(null);
        return;
      }

      const controller = new AbortController();
      abortRef.current = controller;
      setStreamingId(assistantMsg.id);

      const appendDelta = (delta: string) => {
        setThreads((ts) =>
          ts.map((t) =>
            t.id === threadId
              ? {
                  ...t,
                  messages: t.messages.map((m) =>
                    m.id === assistantMsg.id
                      ? { ...m, content: (typeof m.content === "string" ? m.content : "") + delta }
                      : m,
                  ),
                }
              : t,
          ),
        );
      };
      const setUsage = (usage: { prompt_tokens: number; completion_tokens: number; total_tokens: number }) => {
        setThreads((ts) =>
          ts.map((t) =>
            t.id === threadId
              ? {
                  ...t,
                  messages: t.messages.map((m) => (m.id === assistantMsg.id ? { ...m, usage } : m)),
                }
              : t,
          ),
        );
      };

      try {
        await streamProviderMessage({
          settings: provider,
          lang: currentSettings.language,
          messages: historyMessages,
          signal: controller.signal,
          callbacks: { onDelta: appendDelta, onUsage: setUsage },
        });
      } catch (error) {
        if (!controller.signal.aborted) {
          const message = error instanceof Error ? error.message : String(error);
          setThreads((ts) =>
            ts.map((t) =>
              t.id === threadId
                ? {
                    ...t,
                    messages: t.messages.map((m) =>
                      m.id === assistantMsg.id
                        ? {
                            ...m,
                            content:
                              typeof m.content === "string" && m.content.trim()
                                ? m.content + `\n\n⚠️ ${message}`
                                : message,
                          }
                        : m,
                    ),
                  }
                : t,
            ),
          );
        }
      } finally {
        abortRef.current = null;
        setStreamingId(null);
      }
    },
    [],
  );

  const send = useCallback(async (text: string, images: ContentPart[]) => {
    const parts: ContentPart[] = [];
    if (text.trim()) {
      parts.push({ type: "text", text: text.trim() });
    }
    parts.push(...images);
    if (!parts.length) {
      return;
    }

    const { settings: currentSettings, threads: currentThreads, activeThreadId: currentActive } =
      stateRef.current;
    let threadId = currentActive;
    let existing = currentThreads.find((t) => t.id === threadId) ?? null;

    const userMsg: ChatMessage = { id: newId(), role: "user", content: parts, createdAt: Date.now() };
    const assistantMsg: ChatMessage = {
      id: newId(),
      role: "assistant",
      content: "",
      createdAt: Date.now(),
    };

    if (!existing) {
      const fresh: ChatThread = {
        id: newId(),
        title: `Chat ${currentThreads.length + 1}`,
        messages: [userMsg, assistantMsg],
        createdAt: Date.now(),
        updatedAt: Date.now(),
      };
      existing = fresh;
      threadId = fresh.id;
      setThreads((ts) => [fresh, ...ts]);
      setActiveThreadId(fresh.id);
    } else {
      setThreads((ts) =>
        ts.map((t) =>
          t.id === threadId
            ? { ...t, updatedAt: Date.now(), messages: [...t.messages, userMsg, assistantMsg] }
            : t,
        ),
      );
    }

    const historyMessages: AIMessage[] = existing.messages
      .filter((m) => m.id !== userMsg.id && m.id !== assistantMsg.id)
      .map((m) => ({ role: m.role, content: m.content }));

    await streamAssistant(threadId!, assistantMsg, historyMessages, currentSettings);
  }, [streamAssistant]);

  /** Regenerate: buang jawaban assistant tsb, stream ulang dari konteks sebelumnya. */
  const regenerate = useCallback(
    async (assistantMessageId: string) => {
      if (streamingIdRef.current) return;
      const { settings: currentSettings, threads: currentThreads } = stateRef.current;
      const thread = currentThreads.find((t) => t.messages.some((m) => m.id === assistantMessageId));
      if (!thread) return;
      const idx = thread.messages.findIndex((m) => m.id === assistantMessageId);
      const historyMessages: AIMessage[] = thread.messages
        .slice(0, idx)
        .map((m) => ({ role: m.role, content: m.content }));
      if (!historyMessages.length) return;

      const fresh: ChatMessage = {
        id: newId(),
        role: "assistant",
        content: "",
        createdAt: Date.now(),
      };
      setThreads((ts) =>
        ts.map((t) =>
          t.id === thread.id
            ? {
                ...t,
                updatedAt: Date.now(),
                messages: [...t.messages.slice(0, idx), fresh],
              }
            : t,
        ),
      );
      await streamAssistant(thread.id, fresh, historyMessages, currentSettings);
    },
    [streamAssistant],
  );

  /** Edit pesan user: ganti isinya, buang SEMUA pesan setelahnya, stream jawaban baru. */
  const editAndResend = useCallback(
    async (userMessageId: string, text: string) => {
      const { settings: currentSettings, threads: currentThreads } = stateRef.current;
      const thread = currentThreads.find((t) => t.messages.some((m) => m.id === userMessageId));
      if (!thread) return;
      const idx = thread.messages.findIndex((m) => m.id === userMessageId);
      const edited: ChatMessage = {
        ...thread.messages[idx],
        content: text.trim(),
        createdAt: Date.now(),
      };
      const fresh: ChatMessage = {
        id: newId(),
        role: "assistant",
        content: "",
        createdAt: Date.now(),
      };
      const kept = [...thread.messages.slice(0, idx), edited];
      setThreads((ts) =>
        ts.map((t) =>
          t.id === thread.id
            ? { ...t, updatedAt: Date.now(), messages: [...kept, fresh] }
            : t,
        ),
      );
      await streamAssistant(
        thread.id,
        fresh,
        kept.map((m) => ({ role: m.role, content: m.content })),
        currentSettings,
      );
    },
    [streamAssistant],
  );

  const deleteMessage = useCallback((messageId: string) => {
    setThreads((ts) =>
      ts.map((t) =>
        t.messages.some((m) => m.id === messageId)
          ? { ...t, messages: t.messages.filter((m) => m.id !== messageId) }
          : t,
      ),
    );
  }, []);

  const updateSettings = useCallback((patch: Partial<AppSettings>) => {
    setSettings((s) => ({ ...s, ...patch }));
  }, []);

  const addProvider = useCallback((config: ProviderConfig) => {
    setSettings((s) => ({
      ...s,
      providers: [...s.providers, config],
      activeProviderId: config.id,
    }));
  }, []);

  const updateProvider = useCallback((id: string, patch: Partial<ProviderConfig>) => {
    setSettings((s) => ({
      ...s,
      providers: s.providers.map((p) => (p.id === id ? { ...p, ...patch } : p)),
    }));
  }, []);

  const removeProvider = useCallback((id: string) => {
    setSettings((s) => {
      let providers = s.providers.filter((p) => p.id !== id);
      if (providers.length === 0) {
        providers = [createProviderConfig("opencode-go")];
      }
      const activeStillExists = providers.some((p) => p.id === s.activeProviderId);
      return {
        ...s,
        providers,
        activeProviderId: activeStillExists ? s.activeProviderId : providers[0].id,
      };
    });
  }, []);

  const setActiveProvider = useCallback((id: string) => {
    setSettings((s) => ({ ...s, activeProviderId: id }));
  }, []);

  const patchActiveProvider = useCallback(
    (patch: Partial<ProviderConfig>) => {
      setSettings((s) => {
        const activeId = s.activeProviderId;
        return {
          ...s,
          providers: s.providers.map((p) => (p.id === activeId ? { ...p, ...patch } : p)),
        };
      });
    },
    [],
  );

  const setThinking = useCallback(
    (level: ThinkingLevel) => patchActiveProvider({ thinking: level }),
    [patchActiveProvider],
  );

  const setModel = useCallback(
    (model: string) => patchActiveProvider({ model }),
    [patchActiveProvider],
  );

  const activeThread = useMemo(
    () => threads.find((t) => t.id === activeThreadId) ?? null,
    [threads, activeThreadId],
  );

  const value = useMemo<StoreValue>(
    () => ({
      ready,
      settings,
      threads,
      activeThreadId,
      activeThread,
      streamingId,
      createThread,
      deleteThread,
      renameThread,
      setActiveThread,
      send,
      regenerate,
      editAndResend,
      deleteMessage,
      stop,
      updateSettings,
      addProvider,
      updateProvider,
      removeProvider,
      setActiveProvider,
      setThinking,
      setModel,
    }),
    [
      ready,
      settings,
      threads,
      activeThreadId,
      activeThread,
      streamingId,
      createThread,
      deleteThread,
      renameThread,
      setActiveThread,
      send,
      regenerate,
      editAndResend,
      deleteMessage,
      stop,
      updateSettings,
      addProvider,
      updateProvider,
      removeProvider,
      setActiveProvider,
      setThinking,
      setModel,
    ],
  );

  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>;
}

export function useStore(): StoreValue {
  const ctx = useContext(StoreContext);
  if (!ctx) {
    throw new Error("useStore must be used inside StoreProvider");
  }
  return ctx;
}