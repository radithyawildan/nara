"use client";

import { useEffect, useReducer, useRef, useState } from "react";

import { avatarReducer } from "@/features/avatar/avatar-machine";
import { NaraAvatar } from "@/features/avatar/nara-avatar";
import { Composer } from "@/features/chat/composer";
import { MessageList } from "@/features/chat/message-list";
import { MemoryCenter } from "@/features/memory/memory-center";
import { NaraSidebar } from "@/features/navigation/nara-sidebar";
import { VoiceSettings } from "@/features/settings/voice-settings";
import { useSpeechRecognition } from "@/features/voice/use-speech-recognition";
import { useSpeechSynthesis } from "@/features/voice/use-speech-synthesis";
import {
  createConversation,
  initializeConversationPersistence,
  listConversations,
  loadConversationMessages,
  saveConversationMessage,
} from "@/lib/conversations/persistence";
import {
  createMemory,
  deleteMemory,
  listMemories,
  updateMemory,
} from "@/lib/memory/client";
import type {
  ChatMessage,
  ConversationMessage,
  ConversationSummary,
} from "@/types/conversation";
import type { MemoryCategory, NaraMemory } from "@/types/memory";

type InputSource = "text" | "voice";

function extractExplicitMemory(content: string) {
  const match = content.match(/^(?:ingat|remember)(?:lah)?\s*:?\s*(.+)$/i);

  const memory = match?.[1]?.trim();

  return memory || null;
}

function SettingsIcon() {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      className="h-4 w-4"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <circle cx="12" cy="12" r="3" />

      <path d="M19.4 15a1.7 1.7 0 0 0 .34 1.88l.06.06-2.83 2.83-.06-.06A1.7 1.7 0 0 0 15 19.4a1.7 1.7 0 0 0-1 .6 1.7 1.7 0 0 0-.4 1.1V21H9.6v-.1a1.7 1.7 0 0 0-1.4-1.6 1.7 1.7 0 0 0-1.88.34l-.06.06-2.83-2.83.06-.06A1.7 1.7 0 0 0 3.8 15a1.7 1.7 0 0 0-.6-1 1.7 1.7 0 0 0-1.1-.4H2V9.6h.1A1.7 1.7 0 0 0 3.7 8.2a1.7 1.7 0 0 0-.34-1.88l-.06-.06 2.83-2.83.06.06A1.7 1.7 0 0 0 8 3.8a1.7 1.7 0 0 0 1-.6 1.7 1.7 0 0 0 .4-1.1V2h4v.1A1.7 1.7 0 0 0 14.8 3.7a1.7 1.7 0 0 0 1.88-.34l.06-.06 2.83 2.83-.06.06A1.7 1.7 0 0 0 19.2 8a1.7 1.7 0 0 0 .6 1 1.7 1.7 0 0 0 1.1.4h.1v4h-.1a1.7 1.7 0 0 0-1.5 1.6Z" />
    </svg>
  );
}

function MemoryIcon() {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      className="h-4 w-4"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M9 4a3 3 0 0 0-5 2.2A3.5 3.5 0 0 0 4.5 13 3.5 3.5 0 0 0 9 17.8V4Z" />
      <path d="M15 4a3 3 0 0 1 5 2.2 3.5 3.5 0 0 1-.5 6.8 3.5 3.5 0 0 1-4.5 4.8V4Z" />
      <path d="M12 4v16" />
    </svg>
  );
}

export function NaraShell() {
  const [avatarState, dispatch] = useReducer(avatarReducer, "idle");

  const [messages, setMessages] = useState<ConversationMessage[]>([]);

  const [conversations, setConversations] = useState<ConversationSummary[]>([]);

  const [memories, setMemories] = useState<NaraMemory[]>([]);

  const [activeConversationId, setActiveConversationId] = useState<
    string | null
  >(null);

  const [isGenerating, setIsGenerating] = useState(false);

  const [isConversationLoading, setIsConversationLoading] = useState(false);

  const [historyLoading, setHistoryLoading] = useState(true);

  const [memoriesLoading, setMemoriesLoading] = useState(true);

  const [persistenceAvailable, setPersistenceAvailable] = useState(false);

  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const [memoryError, setMemoryError] = useState<string | null>(null);

  const [settingsOpen, setSettingsOpen] = useState(false);

  const [memoryCenterOpen, setMemoryCenterOpen] = useState(false);

  const [autoSpeak, setAutoSpeak] = useState(true);

  const [speechRate, setSpeechRate] = useState(1);

  const [speechPitch, setSpeechPitch] = useState(1);

  const [voiceURI, setVoiceURI] = useState<string | null>(null);

  const abortControllerRef = useRef<AbortController | null>(null);

  const {
    isSpeaking,
    voices,
    speak,
    cancel: cancelSpeech,
  } = useSpeechSynthesis({
    language: "id-ID",
    rate: speechRate,
    pitch: speechPitch,
    volume: 1,
    voiceURI,
  });

  useEffect(() => {
    let cancelled = false;

    async function initializePersistence() {
      try {
        const available = await initializeConversationPersistence();

        if (cancelled) {
          return;
        }

        setPersistenceAvailable(available);

        if (!available) {
          return;
        }

        const [storedConversations, storedMemories] = await Promise.all([
          listConversations(),
          listMemories(),
        ]);

        if (cancelled) {
          return;
        }

        setConversations(storedConversations);

        setMemories(storedMemories);

        const latestConversation = storedConversations[0];

        if (!latestConversation) {
          return;
        }

        const storedMessages = await loadConversationMessages(
          latestConversation.id,
        );

        if (cancelled) {
          return;
        }

        setActiveConversationId(latestConversation.id);

        setMessages(storedMessages);
      } catch (error) {
        console.warn("[NARA] Persistence initialization failed:", error);

        if (!cancelled) {
          setPersistenceAvailable(false);
        }
      } finally {
        if (!cancelled) {
          setHistoryLoading(false);

          setMemoriesLoading(false);
        }
      }
    }

    void initializePersistence();

    return () => {
      cancelled = true;
    };
  }, []);

  async function refreshConversationHistory() {
    if (!persistenceAvailable) {
      return;
    }

    try {
      const storedConversations = await listConversations();

      setConversations(storedConversations);
    } catch (error) {
      console.warn("[NARA] Failed to refresh conversation history:", error);
    }
  }

  async function persistMessage(
    conversationId: string,
    message: ConversationMessage,
  ) {
    if (!persistenceAvailable) {
      return;
    }

    try {
      await saveConversationMessage(conversationId, message);
    } catch (error) {
      console.warn("[NARA] Failed to persist message:", error);
    }
  }

  async function handleCreateMemory(content: string, category: MemoryCategory) {
    setMemoryError(null);

    try {
      const memory = await createMemory(content, category);

      if (!memory) {
        return;
      }

      setMemories((current) => [
        memory,
        ...current.filter((item) => item.id !== memory.id),
      ]);
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Could not save memory.";

      setMemoryError(message);

      throw error;
    }
  }

  async function handleUpdateMemory(
    id: string,
    content: string,
    category: MemoryCategory,
  ) {
    setMemoryError(null);

    try {
      const memory = await updateMemory(id, {
        content,
        category,
      });

      if (!memory) {
        return;
      }

      setMemories((current) =>
        current.map((item) => (item.id === id ? memory : item)),
      );
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Could not update memory.";

      setMemoryError(message);

      throw error;
    }
  }

  async function handleToggleMemory(id: string, enabled: boolean) {
    setMemoryError(null);

    try {
      const memory = await updateMemory(id, {
        isEnabled: enabled,
      });

      if (!memory) {
        return;
      }

      setMemories((current) =>
        current.map((item) => (item.id === id ? memory : item)),
      );
    } catch (error) {
      setMemoryError(
        error instanceof Error
          ? error.message
          : "Could not change memory state.",
      );

      throw error;
    }
  }

  async function handleDeleteMemory(id: string) {
    setMemoryError(null);

    try {
      await deleteMemory(id);

      setMemories((current) => current.filter((memory) => memory.id !== id));
    } catch (error) {
      setMemoryError(
        error instanceof Error ? error.message : "Could not delete memory.",
      );

      throw error;
    }
  }

  async function handleSubmit(content: string, source: InputSource = "text") {
    if (isGenerating || isSpeaking || isConversationLoading) {
      return;
    }

    const normalizedContent = content.trim();

    if (!normalizedContent) {
      return;
    }

    const explicitMemory = extractExplicitMemory(normalizedContent);

    if (explicitMemory && persistenceAvailable) {
      try {
        const memory = await createMemory(explicitMemory, "custom");

        if (memory) {
          setMemories((current) => [
            memory,
            ...current.filter((item) => item.id !== memory.id),
          ]);
        }
      } catch (error) {
        console.warn("[NARA] Failed to save explicit memory:", error);
      }
    }

    const userMessage: ConversationMessage = {
      id: crypto.randomUUID(),
      role: "user",
      content: normalizedContent,
      createdAt: new Date().toISOString(),
    };

    const nextMessages = [...messages, userMessage];

    setMessages(nextMessages);

    setErrorMessage(null);
    setSettingsOpen(false);
    setMemoryCenterOpen(false);
    setIsGenerating(true);

    if (source === "text") {
      dispatch({
        type: "RESET",
      });
    }

    dispatch({
      type: "START_THINKING",
    });

    let conversationId = activeConversationId;

    if (persistenceAvailable && !conversationId) {
      try {
        const conversation = await createConversation(normalizedContent);

        if (conversation) {
          conversationId = conversation.id;

          setActiveConversationId(conversation.id);

          setConversations((current) => [
            conversation,
            ...current.filter((item) => item.id !== conversation.id),
          ]);
        }
      } catch (error) {
        console.warn("[NARA] Failed to create persistent conversation:", error);
      }
    }

    if (conversationId) {
      await persistMessage(conversationId, userMessage);
    }

    const controller = new AbortController();

    abortControllerRef.current = controller;

    const requestMessages: ChatMessage[] = nextMessages.map((message) => ({
      role: message.role,
      content: message.content,
    }));

    try {
      const response = await fetch("/api/chat", {
        method: "POST",

        headers: {
          "Content-Type": "application/json",
        },

        body: JSON.stringify({
          messages: requestMessages,
        }),

        signal: controller.signal,
      });

      if (!response.ok) {
        const payload = (await response.json().catch(() => null)) as {
          error?: string;
        } | null;

        throw new Error(
          payload?.error ??
            `Conversation failed with status ${response.status}.`,
        );
      }

      if (!response.body) {
        throw new Error("The conversation stream is unavailable.");
      }

      const assistantId = crypto.randomUUID();

      const assistantCreatedAt = new Date().toISOString();

      setMessages((current) => [
        ...current,
        {
          id: assistantId,
          role: "assistant",
          content: "",
          createdAt: assistantCreatedAt,
        },
      ]);

      const reader = response.body.getReader();

      const decoder = new TextDecoder();

      let assistantContent = "";

      while (true) {
        const { done, value } = await reader.read();

        if (done) {
          break;
        }

        const chunk = decoder.decode(value, {
          stream: true,
        });

        if (!chunk) {
          continue;
        }

        assistantContent += chunk;

        setMessages((current) =>
          current.map((message) =>
            message.id === assistantId
              ? {
                  ...message,
                  content: assistantContent,
                }
              : message,
          ),
        );
      }

      const remainingChunk = decoder.decode();

      if (remainingChunk) {
        assistantContent += remainingChunk;

        setMessages((current) =>
          current.map((message) =>
            message.id === assistantId
              ? {
                  ...message,
                  content: assistantContent,
                }
              : message,
          ),
        );
      }

      if (!assistantContent.trim()) {
        dispatch({
          type: "RESET",
        });

        return;
      }

      const assistantMessage: ConversationMessage = {
        id: assistantId,
        role: "assistant",
        content: assistantContent,
        createdAt: assistantCreatedAt,
      };

      if (conversationId) {
        await persistMessage(conversationId, assistantMessage);

        await refreshConversationHistory();
      }

      if (!autoSpeak) {
        dispatch({
          type: "RESET",
        });

        return;
      }

      try {
        await speak(assistantContent, {
          onStart() {
            dispatch({
              type: "START_SPEAKING",
            });
          },
        });

        dispatch({
          type: "FINISH_SPEAKING",
        });
      } catch (speechError) {
        console.warn("[NARA] Speech synthesis failed:", speechError);

        dispatch({
          type: "RESET",
        });
      }
    } catch (error) {
      if (controller.signal.aborted) {
        dispatch({
          type: "RESET",
        });

        return;
      }

      console.error("[NARA] Conversation request failed:", error);

      setErrorMessage(
        error instanceof Error
          ? error.message
          : "NARA could not complete the response.",
      );

      dispatch({
        type: "FAIL",
      });
    } finally {
      abortControllerRef.current = null;

      setIsGenerating(false);
    }
  }

  const {
    supported: voiceSupported,
    isListening,
    interimTranscript,
    start: startListening,
    stop: stopListening,
    abort: abortListening,
  } = useSpeechRecognition({
    language: "id-ID",

    onStart() {
      cancelSpeech();

      setSettingsOpen(false);
      setMemoryCenterOpen(false);
      setErrorMessage(null);

      dispatch({
        type: "RESET",
      });

      dispatch({
        type: "START_LISTENING",
      });
    },

    onFinalTranscript(transcript) {
      dispatch({
        type: "START_TRANSCRIBING",
      });

      void handleSubmit(transcript, "voice");
    },

    onEnd(hadFinalTranscript) {
      if (!hadFinalTranscript) {
        dispatch({
          type: "RESET",
        });
      }
    },

    onError(message) {
      setErrorMessage(message);

      dispatch({
        type: "FAIL",
      });
    },
  });

  function handleCancel() {
    abortControllerRef.current?.abort();

    abortListening();
    cancelSpeech();

    setIsGenerating(false);

    dispatch({
      type: "RESET",
    });
  }

  function handleNewChat() {
    abortControllerRef.current?.abort();

    abortListening();
    cancelSpeech();

    setMessages([]);
    setErrorMessage(null);
    setIsGenerating(false);
    setActiveConversationId(null);
    setSettingsOpen(false);
    setMemoryCenterOpen(false);

    dispatch({
      type: "RESET",
    });
  }

  async function handleSelectConversation(conversationId: string) {
    if (isGenerating || isSpeaking || isListening || isConversationLoading) {
      return;
    }

    if (conversationId === activeConversationId) {
      return;
    }

    setIsConversationLoading(true);

    setErrorMessage(null);
    cancelSpeech();

    dispatch({
      type: "RESET",
    });

    try {
      const storedMessages = await loadConversationMessages(conversationId);

      setActiveConversationId(conversationId);

      setMessages(storedMessages);
    } catch (error) {
      console.error("[NARA] Failed to load conversation:", error);

      setErrorMessage("Could not load this conversation.");

      dispatch({
        type: "FAIL",
      });
    } finally {
      setIsConversationLoading(false);
    }
  }

  const isBusy =
    isGenerating || isListening || isSpeaking || isConversationLoading;

  const enabledMemoryCount = memories.filter(
    (memory) => memory.isEnabled,
  ).length;

  return (
    <main className="h-dvh overflow-hidden bg-[#050714] text-white">
      <div className="mx-auto grid h-full max-w-[1760px] grid-rows-[auto_minmax(0,1fr)] px-4 py-4 sm:px-6 sm:py-5">
        <header className="relative flex items-center justify-between border-b border-white/[0.07] pb-4">
          <div className="flex items-center gap-4">
            <div className="grid h-10 w-10 place-items-center rounded-2xl border border-violet-400/20 bg-violet-500/10 font-semibold text-violet-200 shadow-lg shadow-violet-500/10">
              N
            </div>

            <div>
              <p className="text-lg font-semibold tracking-[0.3em] text-white">
                NARA
              </p>

              <p className="mt-0.5 hidden text-xs text-slate-500 sm:block">
                Neural Adaptive Responsive Avatar
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              disabled={!persistenceAvailable}
              onClick={() => {
                setSettingsOpen(false);

                setMemoryCenterOpen(true);
              }}
              aria-label="Open Memory Center"
              className="relative grid h-9 w-9 place-items-center rounded-full border border-white/[0.08] bg-white/[0.035] text-slate-400 transition hover:border-violet-400/20 hover:bg-violet-400/[0.08] hover:text-white disabled:opacity-30 xl:hidden"
            >
              <MemoryIcon />

              {enabledMemoryCount > 0 && (
                <span className="absolute -right-1 -top-1 grid min-h-4 min-w-4 place-items-center rounded-full bg-violet-500 px-1 text-[8px] text-white">
                  {enabledMemoryCount}
                </span>
              )}
            </button>

            <div className="hidden items-center gap-2 rounded-full border border-emerald-400/15 bg-emerald-400/[0.05] px-3 py-2 text-xs text-emerald-300 sm:flex">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-300" />
              Online
            </div>

            <button
              type="button"
              aria-label="Open voice settings"
              aria-expanded={settingsOpen}
              onClick={() => {
                setMemoryCenterOpen(false);

                setSettingsOpen((current) => !current);
              }}
              className="grid h-9 w-9 place-items-center rounded-full border border-white/[0.08] bg-white/[0.035] text-slate-400 transition hover:border-violet-400/20 hover:bg-violet-400/[0.08] hover:text-white"
            >
              <SettingsIcon />
            </button>
          </div>

          <VoiceSettings
            open={settingsOpen}
            autoSpeak={autoSpeak}
            rate={speechRate}
            pitch={speechPitch}
            voiceURI={voiceURI}
            voices={voices}
            onClose={() => setSettingsOpen(false)}
            onAutoSpeakChange={setAutoSpeak}
            onRateChange={setSpeechRate}
            onPitchChange={setSpeechPitch}
            onVoiceChange={setVoiceURI}
          />
        </header>

        <section className="min-h-0 pt-4">
          <div className="grid h-full min-h-0 gap-4 lg:grid-cols-[minmax(310px,0.8fr)_minmax(520px,1.25fr)] xl:grid-cols-[220px_minmax(340px,0.82fr)_minmax(560px,1.35fr)]">
            <NaraSidebar
              conversations={conversations}
              activeConversationId={activeConversationId}
              messageCount={messages.length}
              memoryCount={enabledMemoryCount}
              disabled={isBusy}
              loading={historyLoading}
              persistenceAvailable={persistenceAvailable}
              onNewChat={handleNewChat}
              onOpenMemories={() => {
                setSettingsOpen(false);

                setMemoryCenterOpen(true);
              }}
              onSelectConversation={(conversationId) => {
                void handleSelectConversation(conversationId);
              }}
            />

            <section className="relative flex min-h-0 items-center justify-center overflow-hidden rounded-[2rem] border border-white/[0.07] bg-gradient-to-b from-white/[0.025] via-transparent to-violet-500/[0.015]">
              <div
                aria-hidden="true"
                className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_50%_45%,rgba(99,102,241,0.07),transparent_52%)]"
              />

              <div className="origin-center scale-[0.78] sm:scale-[0.86] lg:scale-[0.82] xl:scale-[0.9] 2xl:scale-100">
                <NaraAvatar state={avatarState} />
              </div>
            </section>

            <section className="flex min-h-0 flex-col overflow-hidden rounded-[2rem] border border-white/[0.08] bg-white/[0.022] shadow-2xl shadow-black/10 backdrop-blur-xl">
              <div className="flex shrink-0 items-center justify-between border-b border-white/[0.055] px-5 py-4">
                <div>
                  <p className="text-[10px] font-medium tracking-[0.2em] text-slate-500 uppercase">
                    Conversation
                  </p>

                  <div className="mt-1 flex items-center gap-2">
                    <span
                      className={`h-1.5 w-1.5 rounded-full ${
                        isSpeaking
                          ? "bg-emerald-300"
                          : isListening
                            ? "bg-cyan-300"
                            : isGenerating
                              ? "bg-violet-300"
                              : isConversationLoading
                                ? "bg-sky-300"
                                : "bg-slate-600"
                      }`}
                    />

                    <p className="text-xs text-slate-500">
                      {isListening
                        ? "Listening to your voice..."
                        : isSpeaking
                          ? "NARA is speaking..."
                          : isGenerating
                            ? "Generating response..."
                            : isConversationLoading
                              ? "Loading conversation..."
                              : persistenceAvailable
                                ? "Ready - conversations are saved"
                                : "Ready for conversation"}
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={handleNewChat}
                  disabled={isBusy || messages.length === 0}
                  className="rounded-full px-3 py-1.5 text-xs text-slate-600 transition hover:bg-white/[0.04] hover:text-slate-300 disabled:cursor-not-allowed disabled:opacity-30"
                >
                  New
                </button>
              </div>

              <div className="flex min-h-0 flex-1 flex-col px-5 pt-3">
                <MessageList messages={messages} />

                {errorMessage && (
                  <div className="mb-3 shrink-0 rounded-2xl border border-red-400/20 bg-red-400/[0.05] px-4 py-3 text-sm text-red-300">
                    {errorMessage}
                  </div>
                )}

                <div className="shrink-0 border-t border-white/[0.06] pb-4 pt-4">
                  <Composer
                    isGenerating={
                      isGenerating || isSpeaking || isConversationLoading
                    }
                    isListening={isListening}
                    voiceSupported={voiceSupported}
                    interimTranscript={interimTranscript}
                    onSubmit={(content) => {
                      void handleSubmit(content, "text");
                    }}
                    onCancel={handleCancel}
                    onStartListening={startListening}
                    onStopListening={stopListening}
                  />
                </div>
              </div>
            </section>
          </div>
        </section>
      </div>

      <MemoryCenter
        open={memoryCenterOpen}
        memories={memories}
        loading={memoriesLoading}
        persistenceAvailable={persistenceAvailable}
        error={memoryError}
        onClose={() => {
          setMemoryCenterOpen(false);

          setMemoryError(null);
        }}
        onCreate={handleCreateMemory}
        onUpdate={handleUpdateMemory}
        onToggle={handleToggleMemory}
        onDelete={handleDeleteMemory}
      />
    </main>
  );
}
