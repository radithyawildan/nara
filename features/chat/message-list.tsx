"use client";

import { useEffect, useRef } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

import { KnowledgeMessageSources } from "@/features/knowledge/knowledge-message-sources";
import type { ConversationMessage } from "@/types/conversation";

interface MessageListProps {
  messages: ConversationMessage[];
}

function formatMessageTime(value: string) {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "";
  }

  return new Intl.DateTimeFormat(undefined, {
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

export function MessageList({ messages }: MessageListProps) {
  const scrollRef = useRef<HTMLDivElement | null>(null);

  const lastMessage = messages[messages.length - 1];
  const lastContentLength = lastMessage?.content.length ?? 0;

  useEffect(() => {
    const element = scrollRef.current;

    if (!element) {
      return;
    }

    element.scrollTo({
      top: element.scrollHeight,
      behavior: "smooth",
    });
  }, [messages.length, lastContentLength]);

  return (
    <div
      ref={scrollRef}
      className="min-h-0 flex-1 overflow-y-auto overscroll-contain pr-1"
    >
      {messages.length === 0 ? (
        <div className="flex min-h-full items-center justify-center px-6 py-12 text-center">
          <div className="max-w-sm">
            <div className="mx-auto grid h-10 w-10 place-items-center rounded-2xl border border-violet-400/15 bg-violet-500/[0.06] text-sm font-semibold text-violet-200">
              N
            </div>

            <p className="mt-4 text-sm font-medium text-slate-300">
              Start a conversation with NARA
            </p>

            <p className="mt-1 text-xs leading-5 text-slate-600">
              Ask a question, speak naturally, or use your private Knowledge
              sources for grounded answers.
            </p>
          </div>
        </div>
      ) : (
        <div className="space-y-4 py-3">
          {messages.map((message) => {
            const isUser = message.role === "user";
            const citations = message.knowledgeCitations ?? [];

            return (
              <div
                key={message.id}
                className={`flex ${isUser ? "justify-end" : "justify-start"}`}
              >
                <article
                  className={`min-w-0 max-w-[90%] sm:max-w-[86%] ${
                    isUser
                      ? "rounded-[1.35rem] rounded-br-md bg-gradient-to-br from-violet-500 to-violet-600 px-4 py-3 text-white shadow-lg shadow-violet-950/10"
                      : "rounded-[1.35rem] rounded-bl-md border border-white/[0.07] bg-white/[0.035] px-4 py-3 text-slate-200"
                  }`}
                >
                  {message.content ? (
                    <div
                      className={`min-w-0 text-[13px] leading-6 ${
                        isUser ? "text-white" : "text-slate-200"
                      }`}
                    >
                      <ReactMarkdown
                        remarkPlugins={[remarkGfm]}
                        components={{
                          p({ children }) {
                            return <p className="mb-2 last:mb-0">{children}</p>;
                          },
                          strong({ children }) {
                            return (
                              <strong className="font-semibold text-inherit">
                                {children}
                              </strong>
                            );
                          },
                          em({ children }) {
                            return <em className="italic">{children}</em>;
                          },
                          ul({ children }) {
                            return (
                              <ul className="my-2 list-disc space-y-1 pl-5">
                                {children}
                              </ul>
                            );
                          },
                          ol({ children }) {
                            return (
                              <ol className="my-2 list-decimal space-y-1 pl-5">
                                {children}
                              </ol>
                            );
                          },
                          li({ children }) {
                            return <li className="pl-0.5">{children}</li>;
                          },
                          blockquote({ children }) {
                            return (
                              <blockquote className="my-2 border-l-2 border-cyan-300/20 pl-3 text-slate-400">
                                {children}
                              </blockquote>
                            );
                          },
                          a({ href, children }) {
                            return (
                              <a
                                href={href}
                                target="_blank"
                                rel="noreferrer"
                                className="text-cyan-300 underline decoration-cyan-300/30 underline-offset-2 transition hover:text-cyan-200"
                              >
                                {children}
                              </a>
                            );
                          },
                          code({ children, className }) {
                            const block = className?.includes("language-");

                            if (block) {
                              return (
                                <code className={className}>{children}</code>
                              );
                            }

                            return (
                              <code className="rounded-md border border-white/[0.06] bg-black/25 px-1.5 py-0.5 font-mono text-[0.9em] text-cyan-100/80">
                                {children}
                              </code>
                            );
                          },
                          pre({ children }) {
                            return (
                              <pre className="my-3 overflow-x-auto rounded-xl border border-white/[0.06] bg-black/30 p-3 font-mono text-[11px] leading-5 text-slate-300">
                                {children}
                              </pre>
                            );
                          },
                          h1({ children }) {
                            return (
                              <h1 className="mb-2 mt-3 text-base font-semibold first:mt-0">
                                {children}
                              </h1>
                            );
                          },
                          h2({ children }) {
                            return (
                              <h2 className="mb-2 mt-3 text-sm font-semibold first:mt-0">
                                {children}
                              </h2>
                            );
                          },
                          h3({ children }) {
                            return (
                              <h3 className="mb-1.5 mt-3 text-[13px] font-semibold first:mt-0">
                                {children}
                              </h3>
                            );
                          },
                        }}
                      >
                        {message.content}
                      </ReactMarkdown>
                    </div>
                  ) : (
                    <div
                      className="flex h-6 items-center gap-1.5"
                      aria-label="NARA is responding"
                    >
                      {[0, 1, 2].map((index) => (
                        <span
                          key={index}
                          className="h-1.5 w-1.5 animate-pulse rounded-full bg-violet-300/60"
                          style={{ animationDelay: `${index * 120}ms` }}
                        />
                      ))}
                    </div>
                  )}

                  {!isUser && citations.length > 0 && (
                    <KnowledgeMessageSources citations={citations} />
                  )}

                  <p
                    className={`mt-2 text-[8px] ${
                      isUser ? "text-violet-100/45" : "text-slate-700"
                    }`}
                  >
                    {formatMessageTime(message.createdAt)}
                  </p>
                </article>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
