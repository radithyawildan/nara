"use client";

import { useReducer, useRef, useState } from "react";

import { avatarReducer } from "@/features/avatar/avatar-machine";
import { NaraAvatar } from "@/features/avatar/nara-avatar";
import { Composer } from "@/features/chat/composer";
import { MessageList } from "@/features/chat/message-list";
import { useSpeechRecognition } from "@/features/voice/use-speech-recognition";
import { useSpeechSynthesis } from "@/features/voice/use-speech-synthesis";
import type { ChatMessage, ConversationMessage } from "@/types/conversation";

type InputSource = "text" | "voice";

export function NaraShell() {
  const [avatarState, dispatch] = useReducer(avatarReducer, "idle");

  const [messages, setMessages] = useState<ConversationMessage[]>([]);

  const [isGenerating, setIsGenerating] = useState(false);

  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const abortControllerRef = useRef<AbortController | null>(null);

  const {
    isSpeaking,
    speak,
    cancel: cancelSpeech,
  } = useSpeechSynthesis({
    language: "id-ID",
    rate: 1,
    pitch: 1,
    volume: 1,
  });

  async function handleSubmit(content: string, source: InputSource = "text") {
    if (isGenerating || isSpeaking) {
      return;
    }

    const normalizedContent = content.trim();

    if (!normalizedContent) {
      return;
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
    setIsGenerating(true);

    if (source === "text") {
      dispatch({
        type: "RESET",
      });
    }

    dispatch({
      type: "START_THINKING",
    });

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

      const assistantMessage: ConversationMessage = {
        id: assistantId,
        role: "assistant",
        content: "",
        createdAt: new Date().toISOString(),
      };

      setMessages((current) => [...current, assistantMessage]);

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

    dispatch({
      type: "RESET",
    });
  }

  const isBusy = isGenerating || isListening || isSpeaking;

  return (
    <main className="min-h-screen bg-[#050714] text-white">
      <div className="mx-auto flex min-h-screen max-w-7xl flex-col px-4 py-5 sm:px-6 sm:py-8">
        <header className="flex items-center justify-between border-b border-white/10 pb-5">
          <div>
            <p className="text-lg font-semibold tracking-[0.28em] sm:text-xl">
              NARA
            </p>

            <p className="mt-1 hidden text-sm text-slate-500 sm:block">
              Neural Adaptive Responsive Avatar
            </p>
          </div>

          <div className="flex items-center gap-2 rounded-full border border-emerald-400/20 bg-emerald-400/5 px-3 py-2 text-xs text-emerald-300">
            <span className="h-2 w-2 rounded-full bg-emerald-400" />
            Online
          </div>
        </header>

        <section className="grid flex-1 place-items-center py-8">
          <div className="flex w-full max-w-4xl flex-col gap-7">
            <NaraAvatar state={avatarState} />

            <div className="overflow-hidden rounded-[2rem] border border-white/10 bg-white/[0.025] p-4 backdrop-blur-xl sm:p-5">
              <div className="mb-4 flex items-center justify-between px-1">
                <div>
                  <p className="text-xs font-medium tracking-[0.18em] text-slate-500 uppercase">
                    Conversation
                  </p>

                  {isListening && (
                    <p className="mt-1 text-xs text-violet-300">
                      Listening to your voice�
                    </p>
                  )}

                  {isSpeaking && (
                    <p className="mt-1 text-xs text-cyan-300">
                      NARA is speaking�
                    </p>
                  )}
                </div>

                {messages.length > 0 && (
                  <button
                    type="button"
                    disabled={isBusy}
                    onClick={handleNewChat}
                    className="text-xs text-slate-500 transition hover:text-white disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    New chat
                  </button>
                )}
              </div>

              <MessageList messages={messages} />

              {errorMessage && (
                <div className="my-4 rounded-2xl border border-red-400/20 bg-red-400/5 px-4 py-3 text-sm text-red-300">
                  {errorMessage}
                </div>
              )}

              <div className="mt-5">
                <Composer
                  isGenerating={isGenerating || isSpeaking}
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

              {!voiceSupported && (
                <p className="mt-3 px-2 text-xs text-amber-300/70">
                  Voice input is not supported by this browser. Text chat
                  remains available.
                </p>
              )}
            </div>

            <p className="text-center text-xs text-slate-700">
              NARA can make mistakes. Check important information.
            </p>
          </div>
        </section>
      </div>
    </main>
  );
}
