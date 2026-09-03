"use client";

import { useMemo, useState } from "react";

import type { MemoryCandidate } from "@/lib/memory/candidate";

import { analyzeMemoryRelationship } from "@/lib/memory/relationship";

import {
  MEMORY_CATEGORIES,
  type MemoryCategory,
  type NaraMemory,
} from "@/types/memory";

interface MemorySuggestionCardProps {
  candidate: MemoryCandidate;
  memories: NaraMemory[];

  saving: boolean;
  disabled?: boolean;

  onSave: (content: string, category: MemoryCategory) => void;

  onReplace: (
    existingMemoryId: string,
    content: string,
    category: MemoryCategory,
  ) => void;

  onDismiss: () => void;
}

const CATEGORY_LABELS: Record<MemoryCategory, string> = {
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

export function MemorySuggestionCard({
  candidate,
  memories,
  saving,
  disabled = false,
  onSave,
  onReplace,
  onDismiss,
}: MemorySuggestionCardProps) {
  const [editing, setEditing] = useState(false);

  const [content, setContent] = useState(candidate.content);

  const [category, setCategory] = useState<MemoryCategory>(candidate.category);

  const normalizedContent = content.trim();

  const relationship = useMemo(
    () =>
      analyzeMemoryRelationship(
        {
          content: normalizedContent,
          category,
        },
        memories,
      ),
    [normalizedContent, category, memories],
  );

  const changed =
    normalizedContent !== candidate.content.trim() ||
    category !== candidate.category;

  const isDuplicate = relationship?.kind === "duplicate";

  const isConflict = relationship?.kind === "conflict";

  return (
    <aside className="mb-3 shrink-0 overflow-hidden rounded-2xl border border-violet-400/15 bg-violet-400/[0.045]">
      <div className="p-3.5">
        <div className="flex items-start gap-3">
          <div className="grid h-8 w-8 shrink-0 place-items-center rounded-xl border border-violet-400/15 bg-violet-400/[0.08] text-violet-300">
            <MemoryIcon />
          </div>

          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <p className="text-xs font-medium text-violet-100">
                {isDuplicate
                  ? "Already remembered"
                  : isConflict
                    ? "Possible memory conflict"
                    : "Save as memory?"}
              </p>

              {!editing && (
                <span className="rounded-full border border-violet-400/10 bg-violet-400/[0.06] px-2 py-0.5 text-[9px] text-violet-300/70">
                  {CATEGORY_LABELS[category]}
                </span>
              )}
            </div>

            <p className="mt-1 text-[10px] leading-4 text-slate-600">
              {isDuplicate
                ? "NARA already has this memory."
                : isConflict
                  ? "This may replace something NARA already remembers."
                  : "NARA detected something that may be useful across future conversations."}
            </p>

            {editing ? (
              <div className="mt-3 space-y-2">
                <textarea
                  value={content}
                  onChange={(event) => setContent(event.target.value)}
                  rows={3}
                  autoFocus
                  className="w-full resize-none rounded-xl border border-white/[0.08] bg-black/20 px-3 py-2 text-xs leading-5 text-slate-200 outline-none focus:border-violet-400/30"
                />

                <select
                  value={category}
                  onChange={(event) =>
                    setCategory(event.target.value as MemoryCategory)
                  }
                  className="h-9 w-full rounded-xl border border-white/[0.07] bg-[#090c19] px-3 text-[10px] text-slate-300 outline-none"
                >
                  {MEMORY_CATEGORIES.map((memoryCategory) => (
                    <option key={memoryCategory} value={memoryCategory}>
                      {CATEGORY_LABELS[memoryCategory]}
                    </option>
                  ))}
                </select>
              </div>
            ) : (
              <div className="mt-2 rounded-xl border border-white/[0.05] bg-black/10 px-3 py-2 text-xs leading-5 text-slate-300">
                {content}
              </div>
            )}

            {relationship && (
              <div
                className={`mt-3 rounded-xl border px-3 py-2.5 ${
                  isDuplicate
                    ? "border-emerald-400/15 bg-emerald-400/[0.04]"
                    : "border-amber-400/15 bg-amber-400/[0.04]"
                }`}
              >
                <p
                  className={`text-[9px] font-medium tracking-[0.12em] uppercase ${
                    isDuplicate ? "text-emerald-300/70" : "text-amber-300/70"
                  }`}
                >
                  {isDuplicate ? "Existing memory" : "Currently remembered"}
                </p>

                <p className="mt-1.5 text-xs leading-5 text-slate-400">
                  {relationship.memory.content}
                </p>

                {isConflict && relationship.slots.length > 0 && (
                  <p className="mt-2 text-[9px] text-slate-700">
                    Conflict area:{" "}
                    {relationship.slots
                      .map((slot) => slot.replace(".", " / "))
                      .join(", ")}
                  </p>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-2 border-t border-white/[0.05] bg-black/[0.08] px-3.5 py-2.5">
        <div>
          {editing && (
            <span className="text-[9px] text-slate-700">
              {changed ? "Edited before saving" : "Review memory"}
            </span>
          )}
        </div>

        <div className="ml-auto flex flex-wrap items-center justify-end gap-1">
          {!isDuplicate && (
            <button
              type="button"
              disabled={saving || disabled}
              onClick={() => setEditing((current) => !current)}
              className="rounded-lg px-2.5 py-1.5 text-[10px] text-slate-500 transition hover:bg-white/[0.04] hover:text-white disabled:opacity-40"
            >
              {editing ? "Preview" : "Edit"}
            </button>
          )}

          <button
            type="button"
            disabled={saving || disabled}
            onClick={onDismiss}
            className="rounded-lg px-2.5 py-1.5 text-[10px] text-slate-500 transition hover:bg-white/[0.04] hover:text-white disabled:opacity-40"
          >
            {isDuplicate ? "Dismiss" : "Not now"}
          </button>

          {!isDuplicate && isConflict && (
            <button
              type="button"
              disabled={saving || disabled || !normalizedContent}
              onClick={() => onSave(normalizedContent, category)}
              className="rounded-lg border border-white/[0.07] bg-white/[0.035] px-3 py-1.5 text-[10px] text-slate-300 transition hover:bg-white/[0.07] disabled:opacity-40"
            >
              Keep both
            </button>
          )}

          {!isDuplicate && isConflict && relationship && (
            <button
              type="button"
              disabled={saving || disabled || !normalizedContent}
              onClick={() =>
                onReplace(relationship.memory.id, normalizedContent, category)
              }
              className="rounded-lg border border-amber-400/20 bg-amber-400/10 px-3 py-1.5 text-[10px] font-medium text-amber-100 transition hover:bg-amber-400/15 disabled:opacity-40"
            >
              {saving ? "Replacing..." : "Replace existing"}
            </button>
          )}

          {!isDuplicate && !isConflict && (
            <button
              type="button"
              disabled={saving || disabled || !normalizedContent}
              onClick={() => onSave(normalizedContent, category)}
              className="rounded-lg border border-violet-400/20 bg-violet-500/15 px-3 py-1.5 text-[10px] font-medium text-violet-100 transition hover:bg-violet-500/25 disabled:opacity-40"
            >
              {saving ? "Saving..." : "Save memory"}
            </button>
          )}
        </div>
      </div>
    </aside>
  );
}
