"use client";

import { useState } from "react";

import {
  MEMORY_CATEGORIES,
  type MemoryCategory,
  type NaraMemory,
} from "@/types/memory";

interface MemoryCenterProps {
  open: boolean;
  memories: NaraMemory[];
  loading: boolean;
  persistenceAvailable: boolean;
  error: string | null;

  onClose: () => void;

  onCreate: (content: string, category: MemoryCategory) => Promise<void>;

  onUpdate: (
    id: string,
    content: string,
    category: MemoryCategory,
  ) => Promise<void>;

  onToggle: (id: string, enabled: boolean) => Promise<void>;

  onDelete: (id: string) => Promise<void>;
}

const categoryLabels: Record<MemoryCategory, string> = {
  identity: "Identity",
  preference: "Preference",
  response_style: "Response style",
  interest: "Interest",
  custom: "Custom",
};

function MemoryIcon() {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      className="h-5 w-5"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M9 4a3 3 0 0 0-5 2.2A3.5 3.5 0 0 0 4.5 13 3.5 3.5 0 0 0 9 17.8V4Z" />
      <path d="M15 4a3 3 0 0 1 5 2.2 3.5 3.5 0 0 1-.5 6.8 3.5 3.5 0 0 1-4.5 4.8V4Z" />
      <path d="M9 8h2" />
      <path d="M13 8h2" />
      <path d="M9 13h6" />
      <path d="M12 4v16" />
    </svg>
  );
}

export function MemoryCenter({
  open,
  memories,
  loading,
  persistenceAvailable,
  error,
  onClose,
  onCreate,
  onUpdate,
  onToggle,
  onDelete,
}: MemoryCenterProps) {
  const [newContent, setNewContent] = useState("");

  const [newCategory, setNewCategory] = useState<MemoryCategory>("custom");

  const [editingId, setEditingId] = useState<string | null>(null);

  const [editContent, setEditContent] = useState("");

  const [editCategory, setEditCategory] = useState<MemoryCategory>("custom");

  const [busyId, setBusyId] = useState<string | null>(null);

  const [isCreating, setIsCreating] = useState(false);

  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  if (!open) {
    return null;
  }

  async function handleCreate() {
    const content = newContent.trim();

    if (!content) {
      return;
    }

    setIsCreating(true);

    try {
      await onCreate(content, newCategory);

      setNewContent("");
      setNewCategory("custom");
    } finally {
      setIsCreating(false);
    }
  }

  function beginEdit(memory: NaraMemory) {
    setEditingId(memory.id);
    setEditContent(memory.content);
    setEditCategory(memory.category);
    setDeleteConfirmId(null);
  }

  async function saveEdit(memoryId: string) {
    if (!editContent.trim()) {
      return;
    }

    setBusyId(memoryId);

    try {
      await onUpdate(memoryId, editContent, editCategory);

      setEditingId(null);
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-label="NARA Memory Center"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) {
          onClose();
        }
      }}
    >
      <section className="flex max-h-[88dvh] w-full max-w-2xl flex-col overflow-hidden rounded-[2rem] border border-white/10 bg-[#090c19] shadow-2xl shadow-black/70">
        <header className="flex shrink-0 items-start justify-between border-b border-white/[0.07] px-5 py-5 sm:px-6">
          <div className="flex gap-3">
            <div className="grid h-10 w-10 shrink-0 place-items-center rounded-2xl border border-violet-400/20 bg-violet-500/10 text-violet-200">
              <MemoryIcon />
            </div>

            <div>
              <h2 className="font-medium text-white">Memory Center</h2>

              <p className="mt-1 text-xs leading-5 text-slate-500">
                Control what NARA can remember across conversations.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="Close Memory Center"
            className="grid h-9 w-9 shrink-0 place-items-center rounded-full border border-white/[0.07] bg-white/[0.03] text-slate-500 transition hover:bg-white/[0.08] hover:text-white"
          >
            ×
          </button>
        </header>

        <div className="min-h-0 flex-1 overflow-y-auto px-5 py-5 sm:px-6">
          {!persistenceAvailable ? (
            <div className="rounded-2xl border border-amber-400/15 bg-amber-400/[0.04] p-4">
              <p className="text-sm text-amber-200">Memory is unavailable.</p>

              <p className="mt-1 text-xs leading-5 text-amber-200/50">
                NARA needs cloud persistence before long-term memories can be
                stored.
              </p>
            </div>
          ) : (
            <>
              <section className="rounded-2xl border border-white/[0.07] bg-white/[0.02] p-4">
                <p className="text-xs font-medium tracking-[0.14em] text-slate-500 uppercase">
                  Add memory
                </p>

                <textarea
                  value={newContent}
                  onChange={(event) => setNewContent(event.target.value)}
                  placeholder="Example: Call me Dithya."
                  rows={2}
                  className="mt-3 w-full resize-none rounded-2xl border border-white/[0.07] bg-black/20 px-4 py-3 text-sm leading-6 text-white outline-none placeholder:text-slate-700 focus:border-violet-400/30"
                />

                <div className="mt-3 flex flex-col gap-2 sm:flex-row">
                  <select
                    value={newCategory}
                    onChange={(event) =>
                      setNewCategory(event.target.value as MemoryCategory)
                    }
                    className="h-10 flex-1 rounded-xl border border-white/[0.07] bg-black/20 px-3 text-xs text-slate-300 outline-none"
                  >
                    {MEMORY_CATEGORIES.map((category) => (
                      <option key={category} value={category}>
                        {categoryLabels[category]}
                      </option>
                    ))}
                  </select>

                  <button
                    type="button"
                    disabled={isCreating || !newContent.trim()}
                    onClick={() => {
                      void handleCreate();
                    }}
                    className="h-10 rounded-xl bg-violet-500 px-5 text-xs font-medium text-white transition hover:bg-violet-400 disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    {isCreating ? "Saving..." : "Save memory"}
                  </button>
                </div>
              </section>

              <div className="my-5 flex items-center justify-between">
                <p className="text-xs font-medium tracking-[0.14em] text-slate-500 uppercase">
                  Saved memories
                </p>

                <span className="rounded-full border border-white/[0.06] bg-white/[0.03] px-2.5 py-1 text-[10px] text-slate-500">
                  {memories.length}
                </span>
              </div>

              {error && (
                <div className="mb-4 rounded-2xl border border-red-400/15 bg-red-400/[0.04] px-4 py-3 text-xs text-red-300">
                  {error}
                </div>
              )}

              {loading ? (
                <div className="space-y-3">
                  {[0, 1, 2].map((index) => (
                    <div
                      key={index}
                      className="h-24 animate-pulse rounded-2xl bg-white/[0.025]"
                    />
                  ))}
                </div>
              ) : memories.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-white/[0.07] px-5 py-10 text-center">
                  <p className="text-sm text-slate-500">
                    No long-term memories yet.
                  </p>

                  <p className="mt-2 text-xs text-slate-700">
                    {
                      'Add one here or tell NARA, for example, "Ingat: panggil aku Dithya."'
                    }
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {memories.map((memory) => {
                    const editing = editingId === memory.id;

                    const busy = busyId === memory.id;

                    return (
                      <article
                        key={memory.id}
                        className={`rounded-2xl border p-4 transition ${
                          memory.isEnabled
                            ? "border-white/[0.07] bg-white/[0.025]"
                            : "border-white/[0.04] bg-white/[0.01] opacity-60"
                        }`}
                      >
                        {editing ? (
                          <>
                            <textarea
                              value={editContent}
                              onChange={(event) =>
                                setEditContent(event.target.value)
                              }
                              rows={3}
                              className="w-full resize-none rounded-xl border border-white/[0.08] bg-black/20 px-3 py-2 text-sm leading-6 text-white outline-none focus:border-violet-400/30"
                            />

                            <select
                              value={editCategory}
                              onChange={(event) =>
                                setEditCategory(
                                  event.target.value as MemoryCategory,
                                )
                              }
                              className="mt-2 h-9 w-full rounded-xl border border-white/[0.07] bg-black/20 px-3 text-xs text-slate-300 outline-none"
                            >
                              {MEMORY_CATEGORIES.map((category) => (
                                <option key={category} value={category}>
                                  {categoryLabels[category]}
                                </option>
                              ))}
                            </select>

                            <div className="mt-3 flex justify-end gap-2">
                              <button
                                type="button"
                                disabled={busy}
                                onClick={() => setEditingId(null)}
                                className="rounded-lg px-3 py-1.5 text-xs text-slate-500 hover:text-white"
                              >
                                Cancel
                              </button>

                              <button
                                type="button"
                                disabled={busy || !editContent.trim()}
                                onClick={() => {
                                  void saveEdit(memory.id);
                                }}
                                className="rounded-lg bg-violet-500 px-3 py-1.5 text-xs text-white disabled:opacity-40"
                              >
                                {busy ? "Saving..." : "Save"}
                              </button>
                            </div>
                          </>
                        ) : (
                          <>
                            <div className="flex items-start gap-3">
                              <div className="min-w-0 flex-1">
                                <span className="rounded-full border border-violet-400/10 bg-violet-400/[0.05] px-2 py-1 text-[9px] text-violet-300/80">
                                  {categoryLabels[memory.category]}
                                </span>

                                <p className="mt-3 text-sm leading-6 text-slate-300">
                                  {memory.content}
                                </p>
                              </div>

                              <button
                                type="button"
                                role="switch"
                                aria-checked={memory.isEnabled}
                                disabled={busy}
                                onClick={() => {
                                  setBusyId(memory.id);

                                  void onToggle(
                                    memory.id,
                                    !memory.isEnabled,
                                  ).finally(() => setBusyId(null));
                                }}
                                className={`relative h-6 w-11 shrink-0 rounded-full border transition ${
                                  memory.isEnabled
                                    ? "border-emerald-400/20 bg-emerald-400/30"
                                    : "border-white/10 bg-white/[0.04]"
                                }`}
                              >
                                <span
                                  className={`absolute top-1/2 h-4 w-4 -translate-y-1/2 rounded-full bg-white transition ${
                                    memory.isEnabled ? "left-6" : "left-1"
                                  }`}
                                />
                              </button>
                            </div>

                            <div className="mt-4 flex items-center justify-between border-t border-white/[0.05] pt-3">
                              <div className="flex flex-wrap items-center gap-2">
                                <span className="text-[10px] text-slate-700">
                                  {memory.isEnabled
                                    ? "Used when relevant"
                                    : "Currently disabled"}
                                </span>

                                <span
                                  className={`rounded-full border px-2 py-0.5 text-[9px] ${
                                    memory.semanticReady
                                      ? "border-cyan-400/15 bg-cyan-400/[0.05] text-cyan-300/70"
                                      : "border-amber-400/15 bg-amber-400/[0.05] text-amber-300/70"
                                  }`}
                                  title={
                                    memory.embeddingModel ?? "Embedding pending"
                                  }
                                >
                                  {memory.semanticReady
                                    ? "Semantic ready"
                                    : "Semantic pending"}
                                </span>
                              </div>

                              <div className="flex items-center gap-1">
                                <button
                                  type="button"
                                  disabled={busy}
                                  onClick={() => beginEdit(memory)}
                                  className="rounded-lg px-2.5 py-1.5 text-[10px] text-slate-500 transition hover:bg-white/[0.04] hover:text-white"
                                >
                                  Edit
                                </button>

                                {deleteConfirmId === memory.id ? (
                                  <>
                                    <button
                                      type="button"
                                      onClick={() => setDeleteConfirmId(null)}
                                      className="rounded-lg px-2.5 py-1.5 text-[10px] text-slate-500"
                                    >
                                      Cancel
                                    </button>

                                    <button
                                      type="button"
                                      disabled={busy}
                                      onClick={() => {
                                        setBusyId(memory.id);

                                        void onDelete(memory.id).finally(() => {
                                          setBusyId(null);

                                          setDeleteConfirmId(null);
                                        });
                                      }}
                                      className="rounded-lg bg-red-400/10 px-2.5 py-1.5 text-[10px] text-red-300"
                                    >
                                      Confirm
                                    </button>
                                  </>
                                ) : (
                                  <button
                                    type="button"
                                    disabled={busy}
                                    onClick={() =>
                                      setDeleteConfirmId(memory.id)
                                    }
                                    className="rounded-lg px-2.5 py-1.5 text-[10px] text-red-300/60 transition hover:bg-red-400/[0.06] hover:text-red-300"
                                  >
                                    Delete
                                  </button>
                                )}
                              </div>
                            </div>
                          </>
                        )}
                      </article>
                    );
                  })}
                </div>
              )}
            </>
          )}
        </div>

        <footer className="shrink-0 border-t border-white/[0.06] px-5 py-3 sm:px-6">
          <p className="text-[10px] leading-4 text-slate-700">
            Only enabled memories are supplied to NARA. Current instructions
            always take priority over saved memories.
          </p>
        </footer>
      </section>
    </div>
  );
}
