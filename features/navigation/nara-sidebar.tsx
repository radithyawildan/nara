"use client";

import { useState, type FormEvent } from "react";

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

  onRenameConversation: (
    conversationId: string,
    title: string,
  ) => Promise<void>;

  onDeleteConversation: (conversationId: string) => Promise<void>;
}

function isSameDay(left: Date, right: Date) {
  return (
    left.getFullYear() === right.getFullYear() &&
    left.getMonth() === right.getMonth() &&
    left.getDate() === right.getDate()
  );
}

function formatConversationTime(value: string) {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "";
  }

  const now = new Date();

  if (isSameDay(date, now)) {
    return new Intl.DateTimeFormat(undefined, {
      hour: "2-digit",
      minute: "2-digit",
    }).format(date);
  }

  if (date.getFullYear() === now.getFullYear()) {
    return new Intl.DateTimeFormat(undefined, {
      day: "numeric",
      month: "short",
    }).format(date);
  }

  return new Intl.DateTimeFormat(undefined, {
    month: "short",
    year: "numeric",
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

function SearchIcon() {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      className="h-3.5 w-3.5"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
    >
      <circle cx="11" cy="11" r="6" />
      <path d="m16 16 4 4" />
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
  onRenameConversation,
  onDeleteConversation,
}: NaraSidebarProps) {
  const [searchQuery, setSearchQuery] = useState("");

  const [openMenuId, setOpenMenuId] = useState<string | null>(null);

  const [editingId, setEditingId] = useState<string | null>(null);

  const [renameValue, setRenameValue] = useState("");

  const [deleteId, setDeleteId] = useState<string | null>(null);

  const [pendingId, setPendingId] = useState<string | null>(null);

  const [actionError, setActionError] = useState<string | null>(null);

  const normalizedSearch = searchQuery.trim().toLowerCase();

  const filteredConversations = normalizedSearch
    ? conversations.filter((conversation) =>
        conversation.title.toLowerCase().includes(normalizedSearch),
      )
    : conversations;

  function beginRename(conversation: ConversationSummary) {
    setOpenMenuId(null);
    setDeleteId(null);
    setActionError(null);
    setEditingId(conversation.id);
    setRenameValue(conversation.title);
  }

  async function submitRename(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!editingId) {
      return;
    }

    const title = renameValue.trim();

    if (!title) {
      return;
    }

    setPendingId(editingId);
    setActionError(null);

    try {
      await onRenameConversation(editingId, title);

      setEditingId(null);
      setRenameValue("");
    } catch (error) {
      setActionError(
        error instanceof Error
          ? error.message
          : "Could not rename conversation.",
      );
    } finally {
      setPendingId(null);
    }
  }

  async function confirmDelete(conversationId: string) {
    setPendingId(conversationId);
    setActionError(null);

    try {
      await onDeleteConversation(conversationId);

      setDeleteId(null);
      setOpenMenuId(null);
    } catch (error) {
      setActionError(
        error instanceof Error
          ? error.message
          : "Could not delete conversation.",
      );
    } finally {
      setPendingId(null);
    }
  }

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

      <div className="mt-4">
        <div className="flex items-center gap-2 rounded-xl border border-white/[0.06] bg-black/10 px-3 py-2 transition focus-within:border-violet-400/20">
          <span className="text-slate-600">
            <SearchIcon />
          </span>

          <input
            type="search"
            value={searchQuery}
            onChange={(event) => setSearchQuery(event.target.value)}
            placeholder="Search history"
            className="min-w-0 flex-1 bg-transparent text-[11px] text-slate-300 outline-none placeholder:text-slate-700"
          />

          {searchQuery && (
            <button
              type="button"
              aria-label="Clear search"
              onClick={() => setSearchQuery("")}
              className="text-[10px] text-slate-700 transition hover:text-slate-400"
            >
              ×
            </button>
          )}
        </div>
      </div>

      <div className="mt-4 flex min-h-0 flex-1 flex-col">
        <div className="flex items-center justify-between px-2">
          <p className="text-[10px] font-medium tracking-[0.18em] text-slate-600 uppercase">
            {normalizedSearch ? "Search" : "Recent"}
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
          ) : filteredConversations.length > 0 ? (
            filteredConversations.map((conversation) => {
              const active = conversation.id === activeConversationId;

              const pending = pendingId === conversation.id;

              const editing = editingId === conversation.id;

              const confirmingDelete = deleteId === conversation.id;

              return (
                <div key={conversation.id} className="relative">
                  {editing ? (
                    <form
                      onSubmit={submitRename}
                      className="rounded-2xl border border-violet-400/20 bg-violet-400/[0.06] p-2"
                    >
                      <input
                        autoFocus
                        maxLength={80}
                        value={renameValue}
                        disabled={pending}
                        onChange={(event) => setRenameValue(event.target.value)}
                        className="w-full rounded-xl border border-white/[0.07] bg-black/20 px-2.5 py-2 text-xs text-white outline-none transition focus:border-violet-400/30"
                      />

                      <div className="mt-2 flex justify-end gap-1">
                        <button
                          type="button"
                          disabled={pending}
                          onClick={() => {
                            setEditingId(null);

                            setRenameValue("");
                          }}
                          className="rounded-lg px-2 py-1 text-[9px] text-slate-600 transition hover:text-slate-300"
                        >
                          Cancel
                        </button>

                        <button
                          type="submit"
                          disabled={pending || !renameValue.trim()}
                          className="rounded-lg bg-violet-500/15 px-2 py-1 text-[9px] text-violet-200 transition hover:bg-violet-500/25 disabled:opacity-30"
                        >
                          {pending ? "Saving..." : "Save"}
                        </button>
                      </div>
                    </form>
                  ) : (
                    <>
                      <button
                        type="button"
                        disabled={disabled || pending}
                        onClick={() => {
                          setOpenMenuId(null);

                          setDeleteId(null);

                          onSelectConversation(conversation.id);
                        }}
                        className={`w-full rounded-2xl border px-3 py-2.5 pr-9 text-left transition ${
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

                      <button
                        type="button"
                        aria-label={`Conversation actions for ${conversation.title}`}
                        disabled={disabled || pending}
                        onClick={() => {
                          setDeleteId(null);

                          setOpenMenuId((current) =>
                            current === conversation.id
                              ? null
                              : conversation.id,
                          );
                        }}
                        className="absolute right-2 top-2 grid h-7 w-7 place-items-center rounded-lg text-[12px] tracking-widest text-slate-700 transition hover:bg-white/[0.05] hover:text-slate-300 disabled:opacity-30"
                      >
                        •••
                      </button>

                      {openMenuId === conversation.id && (
                        <div className="absolute right-2 top-9 z-20 w-28 rounded-xl border border-white/[0.08] bg-[#0a0d19] p-1 shadow-2xl shadow-black/50">
                          <button
                            type="button"
                            onClick={() => beginRename(conversation)}
                            className="w-full rounded-lg px-2.5 py-2 text-left text-[10px] text-slate-400 transition hover:bg-white/[0.05] hover:text-white"
                          >
                            Rename
                          </button>

                          <button
                            type="button"
                            onClick={() => {
                              setOpenMenuId(null);

                              setEditingId(null);

                              setDeleteId(conversation.id);
                            }}
                            className="w-full rounded-lg px-2.5 py-2 text-left text-[10px] text-red-300/70 transition hover:bg-red-400/[0.08] hover:text-red-200"
                          >
                            Delete
                          </button>
                        </div>
                      )}
                    </>
                  )}

                  {confirmingDelete && !editing && (
                    <div className="mt-1 rounded-xl border border-red-400/15 bg-red-400/[0.04] p-2.5">
                      <p className="text-[10px] leading-4 text-red-200/70">
                        Delete this conversation and its messages?
                      </p>

                      <div className="mt-2 flex justify-end gap-1">
                        <button
                          type="button"
                          disabled={pending}
                          onClick={() => setDeleteId(null)}
                          className="rounded-lg px-2 py-1 text-[9px] text-slate-600 transition hover:text-white"
                        >
                          Cancel
                        </button>

                        <button
                          type="button"
                          disabled={pending}
                          onClick={() => {
                            void confirmDelete(conversation.id);
                          }}
                          className="rounded-lg bg-red-400/10 px-2 py-1 text-[9px] text-red-300 transition hover:bg-red-400/20 disabled:opacity-30"
                        >
                          {pending ? "Deleting..." : "Delete"}
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              );
            })
          ) : (
            <div className="rounded-2xl border border-dashed border-white/[0.06] px-3 py-5 text-center">
              <p className="text-xs text-slate-600">
                {normalizedSearch
                  ? "No conversations found"
                  : "No saved conversations"}
              </p>

              {normalizedSearch && (
                <p className="mt-1 text-[9px] text-slate-700">
                  Try another search term.
                </p>
              )}
            </div>
          )}

          {actionError && (
            <div className="mt-2 rounded-xl border border-red-400/15 bg-red-400/[0.04] px-3 py-2 text-[9px] leading-4 text-red-300/70">
              {actionError}
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
