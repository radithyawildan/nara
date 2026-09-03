"use client";

import type { ConversationSummary } from "@/types/conversation";

interface NaraSidebarProps {
  conversations: ConversationSummary[];
  activeConversationId: string | null;

  messageCount: number;
  memoryCount: number;

  disabled: boolean;
  loading: boolean;
  persistenceAvailable: boolean;

  onNewChat: () => void;
  onOpenMemories: () => void;

  onSelectConversation: (conversationId: string) => void;
}

function formatConversationTime(value: string) {
  const date = new Date(value);

  return new Intl.DateTimeFormat(undefined, {
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
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

export function NaraSidebar({
  conversations,
  activeConversationId,
  messageCount,
  memoryCount,
  disabled,
  loading,
  persistenceAvailable,
  onNewChat,
  onOpenMemories,
  onSelectConversation,
}: NaraSidebarProps) {
  return (
    <aside className="hidden min-h-0 flex-col rounded-[2rem] border border-white/[0.07] bg-white/[0.018] p-4 xl:flex">
      <button
        type="button"
        onClick={onNewChat}
        disabled={disabled}
        className="flex w-full items-center justify-center gap-2 rounded-2xl border border-violet-400/20 bg-violet-500/10 px-4 py-3 text-sm font-medium text-violet-100 transition hover:bg-violet-500/15 disabled:cursor-not-allowed disabled:opacity-40"
      >
        <span className="text-lg leading-none">+</span>
        New conversation
      </button>

      <button
        type="button"
        disabled={!persistenceAvailable}
        onClick={onOpenMemories}
        className="mt-2 flex w-full items-center justify-between rounded-2xl border border-transparent px-3 py-3 text-sm text-slate-400 transition hover:border-white/[0.06] hover:bg-white/[0.03] hover:text-white disabled:cursor-not-allowed disabled:opacity-30"
      >
        <span className="flex items-center gap-3">
          <MemoryIcon />
          Memory
        </span>

        <span className="rounded-full border border-white/[0.06] bg-white/[0.03] px-2 py-0.5 text-[9px] text-slate-500">
          {memoryCount}
        </span>
      </button>

      <div className="mt-5 flex min-h-0 flex-1 flex-col">
        <div className="flex items-center justify-between px-2">
          <p className="text-[10px] font-medium tracking-[0.18em] text-slate-600 uppercase">
            Recent
          </p>

          {persistenceAvailable && (
            <span className="text-[9px] text-emerald-300/60">Saved</span>
          )}
        </div>

        <div className="mt-3 min-h-0 flex-1 space-y-1 overflow-y-auto pr-1">
          {loading ? (
            <div className="space-y-2">
              {[0, 1, 2].map((index) => (
                <div
                  key={index}
                  className="h-12 animate-pulse rounded-2xl bg-white/[0.025]"
                />
              ))}
            </div>
          ) : conversations.length > 0 ? (
            conversations.map((conversation) => {
              const active = conversation.id === activeConversationId;

              return (
                <button
                  key={conversation.id}
                  type="button"
                  disabled={disabled}
                  onClick={() => onSelectConversation(conversation.id)}
                  className={`w-full rounded-2xl border px-3 py-2.5 text-left transition ${
                    active
                      ? "border-violet-400/20 bg-violet-400/[0.08]"
                      : "border-transparent hover:border-white/[0.05] hover:bg-white/[0.025]"
                  }`}
                >
                  <p
                    className={`truncate text-xs ${
                      active ? "text-violet-100" : "text-slate-400"
                    }`}
                  >
                    {conversation.title}
                  </p>

                  <p className="mt-1 text-[9px] text-slate-700">
                    {formatConversationTime(conversation.updatedAt)}
                  </p>
                </button>
              );
            })
          ) : (
            <div className="rounded-2xl border border-dashed border-white/[0.06] px-3 py-5 text-center">
              <p className="text-xs text-slate-600">No saved conversations</p>
            </div>
          )}
        </div>
      </div>

      <div className="my-4 h-px bg-white/[0.06]" />

      <div className="rounded-2xl border border-white/[0.06] bg-black/10 p-3">
        <div className="flex items-center justify-between">
          <span className="text-xs text-slate-500">Current messages</span>

          <span className="text-xs font-medium text-slate-300">
            {messageCount}
          </span>
        </div>

        <div className="mt-3 flex items-center gap-2">
          <span
            className={`h-1.5 w-1.5 rounded-full ${
              persistenceAvailable ? "bg-emerald-300" : "bg-amber-300"
            }`}
          />

          <span
            className={`text-[10px] ${
              persistenceAvailable ? "text-emerald-300/70" : "text-amber-300/70"
            }`}
          >
            {persistenceAvailable ? "Cloud persistence active" : "Session only"}
          </span>
        </div>
      </div>
    </aside>
  );
}
