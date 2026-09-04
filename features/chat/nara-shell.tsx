"use client";

import { useEffect, useReducer, useRef, useState } from "react";
import { backfillMemoryEmbeddings } from "@/lib/memory/client";

import { avatarReducer } from "@/features/avatar/avatar-machine";
import { NaraAvatar } from "@/features/avatar/nara-avatar";
import { AccountCenter } from "@/features/account/account-center";
import { PersonalityCenter } from "@/features/personality/personality-center";
import { Composer } from "@/features/chat/composer";
import { MessageList } from "@/features/chat/message-list";
import { MemoryCenter } from "@/features/memory/memory-center";
import { KnowledgeCenter } from "@/features/knowledge/knowledge-center";
import { KnowledgeSourceTray } from "@/features/knowledge/knowledge-source-tray";
import { MemoryDebugInspector } from "@/features/memory/memory-debug-inspector";
import { MemorySuggestionCard } from "@/features/memory/memory-suggestion-card";
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
  deleteConversation,
  renameConversation,
} from "@/lib/conversations/persistence";
import { reconcileKnowledgeCitations } from "@/lib/knowledge/citations";
import {
  createMemory,
  deleteMemory,
  listMemories,
  updateMemory,
} from "@/lib/memory/client";
import {
  detectMemoryCandidate,
  type MemoryCandidate,
} from "@/lib/memory/candidate";
import type {
  ChatMessage,
  ConversationMessage,
  ConversationSummary,
} from "@/types/conversation";
import type { MemoryCategory, NaraMemory } from "@/types/memory";
import type {
  KnowledgeCitation,
  KnowledgeRetrievalDebug,
} from "@/types/knowledge";

type InputSource = "text" | "voice";

function getLatestKnowledgeCitations(messages: ConversationMessage[]) {
  return (
    [...messages]
      .reverse()
      .find(
        (message) =>
          message.role === "assistant" &&
          (message.knowledgeCitations?.length ?? 0) > 0,
      )?.knowledgeCitations ?? []
  );
}

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

function KnowledgeIcon() {
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
      <path d="M5 4.5A2.5 2.5 0 0 1 7.5 2H19v17H7.5A2.5 2.5 0 0 0 5 21.5V4.5Z" />
      <path d="M5 4.5A2.5 2.5 0 0 0 2.5 7v12A2.5 2.5 0 0 0 5 21.5" />
      <path d="M9 7h6M9 11h6" />
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

function AccountIcon() {
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
      <circle cx="12" cy="8" r="3.5" />
      <path d="M5 20a7 7 0 0 1 14 0" />
    </svg>
  );
}

import type { MemoryRetrievalDebug } from "@/types/memory-debug";

function PersonalityIcon() {
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
      <circle cx="12" cy="12" r="8" />
      <path d="M8.5 10h.01" />
      <path d="M15.5 10h.01" />
      <path d="M8.5 15c1.1 1 2.25 1.5 3.5 1.5s2.4-.5 3.5-1.5" />
      <path d="M12 4V2" />
      <path d="m18 6 1.4-1.4" />
    </svg>
  );
}

export function NaraShell() {
  const [avatarState, dispatch] = useReducer(avatarReducer, "idle");

  const [messages, setMessages] = useState<ConversationMessage[]>([]);

  const [conversations, setConversations] = useState<ConversationSummary[]>([]);

  const [memories, setMemories] = useState<NaraMemory[]>([]);

  const [memoryDebug, setMemoryDebug] = useState<MemoryRetrievalDebug | null>(
    null,
  );

  const [knowledgeSources, setKnowledgeSources] = useState<KnowledgeCitation[]>(
    [],
  );

  const [knowledgeDebug, setKnowledgeDebug] =
    useState<KnowledgeRetrievalDebug | null>(null);

  const [memoryCandidate, setMemoryCandidate] =
    useState<MemoryCandidate | null>(null);

  const [isSavingMemoryCandidate, setIsSavingMemoryCandidate] = useState(false);

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

  const [accountCenterOpen, setAccountCenterOpen] = useState(false);

  const [personalityCenterOpen, setPersonalityCenterOpen] = useState(false);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);

    if (params.get("account") !== "recovery") {
      return;
    }

    queueMicrotask(() => {
      setSettingsOpen(false);

      setMemoryCenterOpen(false);

      setAccountCenterOpen(true);
    });
  }, []);

  const [knowledgeCenterOpen, setKnowledgeCenterOpen] = useState(false);

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

        void backfillMemoryEmbeddings()
          .then(async (result) => {
            if (cancelled || result.processed === 0) {
              return;
            }

            console.log("[NARA] Automatic memory embedding backfill:", result);

            const refreshedMemories = await listMemories();

            if (!cancelled) {
              setMemories(refreshedMemories);
            }
          })
          .catch((error) => {
            console.warn(
              "[NARA] Automatic memory embedding backfill unavailable:",
              error,
            );
          });

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

        setKnowledgeSources(getLatestKnowledgeCitations(storedMessages));

        setKnowledgeDebug(null);
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

  async function handleAcceptMemoryCandidate(
    content: string,
    category: MemoryCategory,
  ) {
    const normalizedContent = content.trim();

    if (!memoryCandidate || !normalizedContent) {
      return;
    }

    const duplicate = memories.some(
      (memory) =>
        memory.content.trim().toLowerCase() === normalizedContent.toLowerCase(),
    );

    if (duplicate) {
      setMemoryCandidate(null);
      return;
    }

    setIsSavingMemoryCandidate(true);

    try {
      await handleCreateMemory(normalizedContent, category);

      setMemoryCandidate(null);
    } finally {
      setIsSavingMemoryCandidate(false);
    }
  }

  async function handleReplaceMemoryCandidate(
    existingMemoryId: string,
    content: string,
    category: MemoryCategory,
  ) {
    const normalizedContent = content.trim();

    if (!memoryCandidate || !normalizedContent) {
      return;
    }

    setIsSavingMemoryCandidate(true);

    try {
      await handleUpdateMemory(existingMemoryId, normalizedContent, category);

      const replacedMemory = memories.find(
        (memory) => memory.id === existingMemoryId,
      );

      if (replacedMemory && !replacedMemory.isEnabled) {
        await handleToggleMemory(existingMemoryId, true);
      }

      setMemoryCandidate(null);
    } finally {
      setIsSavingMemoryCandidate(false);
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

    const candidate = explicitMemory
      ? null
      : detectMemoryCandidate(normalizedContent);

    setMemoryCandidate(candidate);

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
    setKnowledgeCenterOpen(false);
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

      let responseKnowledgeSources: KnowledgeCitation[] = [];

      const encodedKnowledgeSources = response.headers.get(
        "X-NARA-Knowledge-Sources",
      );

      if (encodedKnowledgeSources) {
        try {
          const parsedKnowledgeSources = JSON.parse(
            decodeURIComponent(encodedKnowledgeSources),
          ) as KnowledgeCitation[];

          responseKnowledgeSources = parsedKnowledgeSources;
          setKnowledgeSources(parsedKnowledgeSources);
        } catch (error) {
          console.warn("[NARA] Could not parse knowledge citations:", error);
          setKnowledgeSources([]);
        }
      } else {
        setKnowledgeSources([]);
      }

      const encodedKnowledgeDebug = response.headers.get(
        "X-NARA-Knowledge-Debug",
      );

      if (encodedKnowledgeDebug) {
        try {
          setKnowledgeDebug(
            JSON.parse(
              decodeURIComponent(encodedKnowledgeDebug),
            ) as KnowledgeRetrievalDebug,
          );
        } catch (error) {
          console.warn(
            "[NARA] Could not parse knowledge debug metadata:",
            error,
          );
          setKnowledgeDebug(null);
        }
      } else {
        setKnowledgeDebug(null);
      }

      const encodedMemoryDebug = response.headers.get("X-NARA-Memory-Debug");

      if (encodedMemoryDebug) {
        try {
          const parsedMemoryDebug = JSON.parse(
            decodeURIComponent(encodedMemoryDebug),
          ) as MemoryRetrievalDebug;

          setMemoryDebug(parsedMemoryDebug);
        } catch (error) {
          console.warn("[NARA] Could not parse memory debug metadata:", error);

          setMemoryDebug(null);
        }
      } else {
        setMemoryDebug(null);
      }

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
      const citationIntegrity = reconcileKnowledgeCitations(
        assistantContent,
        responseKnowledgeSources,
      );

      assistantContent = citationIntegrity.content;
      responseKnowledgeSources = citationIntegrity.citations;

      setKnowledgeSources(citationIntegrity.citations);

      setMessages((current) =>
        current.map((message) =>
          message.id === assistantId
            ? {
                ...message,
                content: citationIntegrity.content,
                knowledgeCitations: citationIntegrity.citations,
              }
            : message,
        ),
      );

      if (process.env.NODE_ENV === "development") {
        if (citationIntegrity.invalidCitationIds.length > 0) {
          console.warn(
            "[NARA] Removed invalid knowledge citation markers:",
            citationIntegrity.invalidCitationIds,
          );
        }

        if (citationIntegrity.retrievedButUncited) {
          console.warn(
            "[NARA] Knowledge sources were retrieved but the final response did not cite them.",
            citationIntegrity.unusedRetrievedIds,
          );
        }
      }

      const assistantMessage: ConversationMessage = {
        id: assistantId,
        role: "assistant",
        content: citationIntegrity.content,
        createdAt: assistantCreatedAt,
        knowledgeCitations: citationIntegrity.citations,
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
    setMemoryCandidate(null);
    setMemoryDebug(null);
    setKnowledgeSources([]);
    setKnowledgeDebug(null);

    dispatch({
      type: "RESET",
    });
  }

  async function handleRenameConversation(
    conversationId: string,
    title: string,
  ) {
    setErrorMessage(null);

    try {
      const updatedConversation = await renameConversation(
        conversationId,
        title,
      );

      if (!updatedConversation) {
        return;
      }

      setConversations((current) => [
        updatedConversation,
        ...current.filter((conversation) => conversation.id !== conversationId),
      ]);
    } catch (error) {
      console.error("[NARA] Failed to rename conversation:", error);

      throw error;
    }
  }

  async function handleDeleteConversation(conversationId: string) {
    setErrorMessage(null);

    try {
      await deleteConversation(conversationId);

      const remainingConversations = conversations.filter(
        (conversation) => conversation.id !== conversationId,
      );

      setConversations(remainingConversations);

      if (conversationId !== activeConversationId) {
        return;
      }

      setActiveConversationId(null);
      setMessages([]);
      setMemoryCandidate(null);
      setMemoryDebug(null);

      dispatch({
        type: "RESET",
      });

      const fallbackConversation = remainingConversations[0];

      if (!fallbackConversation) {
        return;
      }

      setIsConversationLoading(true);

      try {
        const storedMessages = await loadConversationMessages(
          fallbackConversation.id,
        );

        setActiveConversationId(fallbackConversation.id);

        setMessages(storedMessages);

        setKnowledgeSources(getLatestKnowledgeCitations(storedMessages));

        setKnowledgeDebug(null);
      } catch (loadError) {
        console.error(
          "[NARA] Failed to load fallback conversation:",
          loadError,
        );

        setErrorMessage(
          "Conversation deleted, but the next conversation could not be loaded.",
        );
      } finally {
        setIsConversationLoading(false);
      }
    } catch (error) {
      console.error("[NARA] Failed to delete conversation:", error);

      throw error;
    }
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
    setKnowledgeSources([]);
    setKnowledgeDebug(null);
    cancelSpeech();

    dispatch({
      type: "RESET",
    });

    try {
      const storedMessages = await loadConversationMessages(conversationId);

      setActiveConversationId(conversationId);

      setMessages(storedMessages);

      setKnowledgeSources(getLatestKnowledgeCitations(storedMessages));

      setKnowledgeDebug(null);
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
                setMemoryCenterOpen(false);
                setKnowledgeCenterOpen(true);
              }}
              aria-label="Open Knowledge Center"
              className="grid h-9 w-9 place-items-center rounded-full border border-white/[0.08] bg-white/[0.035] text-slate-400 transition hover:border-cyan-400/20 hover:bg-cyan-400/[0.08] hover:text-white disabled:opacity-30"
            >
              <KnowledgeIcon />
            </button>

            <button
              type="button"
              disabled={!persistenceAvailable}
              onClick={() => {
                setSettingsOpen(false);
                setKnowledgeCenterOpen(false);

                setAccountCenterOpen(false);

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
              aria-label="Open account center"
              aria-expanded={accountCenterOpen}
              onClick={() => {
                setSettingsOpen(false);
                setMemoryCenterOpen(false);
                setAccountCenterOpen(true);
              }}
              className="grid h-9 w-9 place-items-center rounded-full border border-white/[0.08] bg-white/[0.035] text-slate-400 transition hover:border-violet-400/20 hover:bg-violet-400/[0.08] hover:text-white"
            >
              <AccountIcon />
            </button>

            <button
              type="button"
              aria-label="Open Personality Center"
              aria-expanded={personalityCenterOpen}
              onClick={() => {
                setSettingsOpen(false);
                setMemoryCenterOpen(false);

                setKnowledgeCenterOpen(false);

                setAccountCenterOpen(false);

                setPersonalityCenterOpen(true);
              }}
              className="grid h-9 w-9 place-items-center rounded-full border border-white/[0.08] bg-white/[0.035] text-slate-400 transition hover:border-violet-400/20 hover:bg-violet-400/[0.08] hover:text-white"
            >
              <PersonalityIcon />
            </button>

            <button
              type="button"
              aria-label="Open voice settings"
              aria-expanded={settingsOpen}
              onClick={() => {
                setMemoryCenterOpen(false);
                setKnowledgeCenterOpen(false);

                setAccountCenterOpen(false);

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
                setKnowledgeCenterOpen(false);

                setAccountCenterOpen(false);

                setMemoryCenterOpen(true);
              }}
              onRenameConversation={handleRenameConversation}
              onDeleteConversation={handleDeleteConversation}
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

                {memoryCandidate && (
                  <MemorySuggestionCard
                    memories={memories}
                    key={`${memoryCandidate.category}:${memoryCandidate.content}`}
                    candidate={memoryCandidate}
                    saving={isSavingMemoryCandidate}
                    disabled={isGenerating || isConversationLoading}
                    onSave={(content, category) => {
                      void handleAcceptMemoryCandidate(content, category);
                    }}
                    onDismiss={() => setMemoryCandidate(null)}

                    onReplace={(existingMemoryId, content, category) => {
                      void handleReplaceMemoryCandidate(
                        existingMemoryId,
                        content,
                        category,
                      );
                    }}
                  />
                )}

                <KnowledgeSourceTray
                  sources={knowledgeSources}
                  debug={knowledgeDebug}
                />

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

      <KnowledgeCenter
        open={knowledgeCenterOpen}
        onClose={() => setKnowledgeCenterOpen(false)}
      />

      <MemoryDebugInspector debug={memoryDebug} />

      <AccountCenter
        open={accountCenterOpen}
        onClose={() => setAccountCenterOpen(false)}
      />

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
      <PersonalityCenter
        open={personalityCenterOpen}
        onClose={() => setPersonalityCenterOpen(false)}
      />
    </main>
  );
}
