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
            Ask something below. Voice interaction is coming next.
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
              {message.content || (
                <span className="animate-pulse text-slate-500">? ? ?</span>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
