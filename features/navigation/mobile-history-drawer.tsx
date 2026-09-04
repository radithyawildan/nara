"use client";

import { useMemo, useState } from "react";

import type { ConversationSummary } from "@/types/conversation";

interface MobileHistoryDrawerProps {
  open: boolean;
  conversations: ConversationSummary[];
  activeConversationId: string | null;
  disabled: boolean;
  loading: boolean;
  onClose: () => void;
  onNewChat: () => void;
  onSelectConversation: (conversationId: string) => void;
}

export function HistoryMenuIcon() {
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
      <path d="M4 6h16" />
      <path d="M4 12h16" />
      <path d="M4 18h10" />
    </svg>
  );
}

function formatTime(value: string) {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "";
  }

  return new Intl.DateTimeFormat(undefined, {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

export function MobileHistoryDrawer({
  open,
  conversations,
  activeConversationId,
  disabled,
  loading,
  onClose,
  onNewChat,
  onSelectConversation,
}: MobileHistoryDrawerProps) {
  const [query, setQuery] = useState("");

  const filtered = useMemo(() => {
    const normalized = query.trim().toLowerCase();

    if (!normalized) {
      return conversations;
    }

    return conversations.filter((conversation) =>
      conversation.title.toLowerCase().includes(normalized),
    );
  }, [conversations, query]);

  if (!open) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-[145] xl:hidden">
      <button
        type="button"
        aria-label="Close conversation history"
        onClick={onClose}
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
      />

      <aside className="absolute inset-y-0 left-0 flex w-[min(360px,88vw)] flex-col border-r border-white/[0.08] bg-[#070a15] shadow-2xl shadow-black/60">
        <header className="flex items-center justify-between border-b border-white/[0.06] px-4 py-4">
          <div>
            <p className="text-[10px] font-medium tracking-[0.18em] text-slate-600 uppercase">
              Conversations
            </p>
            <p className="mt-1 text-sm font-medium text-slate-200">History</p>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="grid h-9 w-9 place-items-center rounded-full text-slate-500 transition hover:bg-white/[0.05] hover:text-white"
          >
            ×
          </button>
        </header>

        <div className="p-4">
          <button
            type="button"
            disabled={disabled}
            onClick={() => {
              onNewChat();
              onClose();
            }}
            className="flex w-full items-center justify-center gap-2 rounded-2xl border border-violet-400/20 bg-violet-500/10 px-4 py-3 text-sm font-medium text-violet-100 transition hover:bg-violet-500/15 disabled:opacity-30"
          >
            <span className="text-lg">+</span>
            New conversation
          </button>

          <input
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search conversations"
            className="mt-3 w-full rounded-2xl border border-white/[0.07] bg-black/15 px-4 py-3 text-xs text-slate-300 outline-none placeholder:text-slate-700 focus:border-violet-400/20"
          />
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto px-3 pb-4">
          {loading ? (
            <div className="space-y-2">
              {[0, 1, 2, 3].map((item) => (
                <div
                  key={item}
                  className="h-14 animate-pulse rounded-2xl bg-white/[0.025]"
                />
              ))}
            </div>
          ) : filtered.length > 0 ? (
            <div className="space-y-1">
              {filtered.map((conversation) => {
                const active = conversation.id === activeConversationId;

                return (
                  <button
                    key={conversation.id}
                    type="button"
                    disabled={disabled}
                    onClick={() => {
                      onSelectConversation(conversation.id);
                      onClose();
                    }}
                    className={`w-full rounded-2xl border px-3 py-3 text-left transition ${
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
                      {formatTime(conversation.updatedAt)}
                    </p>
                  </button>
                );
              })}
            </div>
          ) : (
            <div className="rounded-2xl border border-dashed border-white/[0.06] px-4 py-8 text-center">
              <p className="text-xs text-slate-600">
                No matching conversations
              </p>
            </div>
          )}
        </div>
      </aside>
    </div>
  );
}
