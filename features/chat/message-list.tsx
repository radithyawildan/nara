import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

import type { ConversationMessage } from "@/types/conversation";

interface MessageListProps {
  messages: ConversationMessage[];
}

export function MessageList({ messages }: MessageListProps) {
  if (messages.length === 0) {
    return (
      <div className="flex min-h-48 items-center justify-center px-6 text-center">
        <div>
          <p className="text-sm font-medium text-slate-300">
            Start a conversation with NARA
          </p>

          <p className="mt-2 text-sm text-slate-600">
            Ask something below or talk to NARA using your microphone.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div
      aria-live="polite"
      className="flex max-h-[26rem] flex-col gap-4 overflow-y-auto px-1 py-2"
    >
      {messages.map((message) => {
        const isUser = message.role === "user";

        return (
          <div
            key={message.id}
            className={`flex ${isUser ? "justify-end" : "justify-start"}`}
          >
            <div
              className={
                isUser
                  ? "max-w-[80%] rounded-3xl rounded-br-lg bg-violet-500 px-5 py-3 text-sm leading-6 text-white"
                  : "max-w-[85%] rounded-3xl rounded-bl-lg border border-white/10 bg-white/[0.04] px-5 py-3 text-sm leading-6 text-slate-200"
              }
            >
              {message.content ? (
                isUser ? (
                  <p className="whitespace-pre-wrap">{message.content}</p>
                ) : (
                  <ReactMarkdown
                    remarkPlugins={[remarkGfm]}
                    components={{
                      p: ({ children }) => (
                        <p className="mb-3 last:mb-0">{children}</p>
                      ),

                      strong: ({ children }) => (
                        <strong className="font-semibold text-white">
                          {children}
                        </strong>
                      ),

                      em: ({ children }) => (
                        <em className="text-slate-300">{children}</em>
                      ),

                      h1: ({ children }) => (
                        <h1 className="mb-3 mt-5 text-xl font-semibold text-white first:mt-0">
                          {children}
                        </h1>
                      ),

                      h2: ({ children }) => (
                        <h2 className="mb-3 mt-5 text-lg font-semibold text-white first:mt-0">
                          {children}
                        </h2>
                      ),

                      h3: ({ children }) => (
                        <h3 className="mb-2 mt-4 font-semibold text-white first:mt-0">
                          {children}
                        </h3>
                      ),

                      ul: ({ children }) => (
                        <ul className="mb-3 list-disc space-y-1 pl-5 last:mb-0">
                          {children}
                        </ul>
                      ),

                      ol: ({ children }) => (
                        <ol className="mb-3 list-decimal space-y-1 pl-5 last:mb-0">
                          {children}
                        </ol>
                      ),

                      li: ({ children }) => (
                        <li className="pl-1">{children}</li>
                      ),

                      blockquote: ({ children }) => (
                        <blockquote className="my-3 border-l-2 border-violet-400/50 pl-4 text-slate-400">
                          {children}
                        </blockquote>
                      ),

                      code: ({ children, className }) => {
                        const isBlock = Boolean(className);

                        if (isBlock) {
                          return <code className={className}>{children}</code>;
                        }

                        return (
                          <code className="rounded-md border border-white/10 bg-black/40 px-1.5 py-0.5 font-mono text-[0.85em] text-violet-200">
                            {children}
                          </code>
                        );
                      },

                      pre: ({ children }) => (
                        <pre className="my-3 overflow-x-auto rounded-2xl border border-white/10 bg-black/40 p-4 font-mono text-xs leading-5 text-slate-300">
                          {children}
                        </pre>
                      ),

                      a: ({ children, href }) => (
                        <a
                          href={href}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-violet-300 underline decoration-violet-400/40 underline-offset-4 transition hover:text-violet-200"
                        >
                          {children}
                        </a>
                      ),

                      hr: () => <hr className="my-4 border-white/10" />,
                    }}
                  >
                    {message.content}
                  </ReactMarkdown>
                )
              ) : (
                <span className="animate-pulse text-slate-500">? ? ?</span>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
