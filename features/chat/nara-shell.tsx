"use client";

import { useReducer, useRef, useState } from "react";

import { avatarReducer } from "@/features/avatar/avatar-machine";
import { NaraAvatar } from "@/features/avatar/nara-avatar";
import { Composer } from "@/features/chat/composer";
import { MessageList } from "@/features/chat/message-list";
import type { ChatMessage, ConversationMessage } from "@/types/conversation";

export function NaraShell() {
  const [avatarState, dispatch] = useReducer(avatarReducer, "idle");
  const [messages, setMessages] = useState<ConversationMessage[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const abortControllerRef = useRef<AbortController | null>(null);

  async function handleSubmit(content: string) {
    if (isGenerating) {
      return;
    }

    const userMessage: ConversationMessage = {
      id: crypto.randomUUID(),
      role: "user",
      content,
      createdAt: new Date().toISOString(),
    };

    const nextMessages = [...messages, userMessage];

    setMessages(nextMessages);
    setErrorMessage(null);
    setIsGenerating(true);

    dispatch({ type: "RESET" });
    dispatch({ type: "START_THINKING" });

    const controller = new AbortController();
    abortControllerRef.current = controller;

    const requestMessages: ChatMessage[] = nextMessages.map((message) => ({
      role: message.role,
      content: message.content,
    }));

    let assistantId: string | null = null;
    let speakingStarted = false;

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

      assistantId = crypto.randomUUID();

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

        if (!speakingStarted) {
          dispatch({ type: "START_SPEAKING" });
          speakingStarted = true;
        }

        assistantContent += chunk;

        const currentAssistantId = assistantId;

        setMessages((current) =>
          current.map((message) =>
            message.id === currentAssistantId
              ? {
                  ...message,
                  content: assistantContent,
                }
              : message,
          ),
        );
      }

      if (speakingStarted) {
        dispatch({ type: "FINISH_SPEAKING" });
      } else {
        dispatch({ type: "RESET" });
      }
    } catch (error) {
      if (controller.signal.aborted) {
        dispatch({ type: "RESET" });
        return;
      }

      console.error("[NARA] Conversation request failed:", error);

      setErrorMessage(
        error instanceof Error
          ? error.message
          : "NARA could not complete the response.",
      );

      dispatch({ type: "FAIL" });
    } finally {
      abortControllerRef.current = null;
      setIsGenerating(false);
    }
  }

  function handleCancel() {
    abortControllerRef.current?.abort();
  }

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
                </div>

                {messages.length > 0 && (
                  <button
                    type="button"
                    disabled={isGenerating}
                    onClick={() => {
                      setMessages([]);
                      setErrorMessage(null);
                      dispatch({ type: "RESET" });
                    }}
                    className="text-xs text-slate-500 transition hover:text-white disabled:opacity-40"
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
                  isGenerating={isGenerating}
                  onSubmit={handleSubmit}
                  onCancel={handleCancel}
                />
              </div>
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
