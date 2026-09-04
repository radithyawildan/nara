"use client";

import { useEffect, useMemo, useState } from "react";

import { NARA_SHORTCUTS, isEditableTarget } from "@/lib/experience/shortcuts";

interface CommandPaletteProps {
  onNewChat: () => void;
  onOpenHistory: () => void;
  onOpenControls: () => void;
}

interface Action {
  id: string;
  label: string;
  hint: string;
  run: () => void;
}

export function NaraCommandPalette({
  onNewChat,
  onOpenHistory,
  onOpenControls,
}: CommandPaletteProps) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");

  const actions = useMemo<Action[]>(
    () => [
      {
        id: "new",
        label: "New conversation",
        hint: "Start a clean thread",
        run: onNewChat,
      },
      {
        id: "history",
        label: "Conversation history",
        hint: "Browse saved threads",
        run: onOpenHistory,
      },
      {
        id: "controls",
        label: "NARA controls",
        hint: "Voice, personality, memory, knowledge, account",
        run: onOpenControls,
      },
      {
        id: "focus",
        label: "Focus composer",
        hint: "Jump back to the message box",
        run() {
          document.querySelector<HTMLTextAreaElement>("textarea")?.focus();
        },
      },
    ],
    [onNewChat, onOpenControls, onOpenHistory],
  );

  const filtered = useMemo(() => {
    const normalized = query.trim().toLowerCase();

    if (!normalized) {
      return actions;
    }

    return actions.filter((action) =>
      `${action.label} ${action.hint}`.toLowerCase().includes(normalized),
    );
  }, [actions, query]);

  useEffect(() => {
    function openPalette() {
      setOpen(true);
      setQuery("");
    }

    function handleKeyDown(event: KeyboardEvent) {
      const mod = event.metaKey || event.ctrlKey;

      if (mod && event.key.toLowerCase() === "k") {
        event.preventDefault();
        openPalette();
        return;
      }

      if (
        !isEditableTarget(event.target) &&
        mod &&
        event.shiftKey &&
        event.key.toLowerCase() === "n"
      ) {
        event.preventDefault();
        onNewChat();
        return;
      }

      if (
        !isEditableTarget(event.target) &&
        mod &&
        event.shiftKey &&
        event.key.toLowerCase() === "h"
      ) {
        event.preventDefault();
        onOpenHistory();
        return;
      }

      if (!isEditableTarget(event.target) && mod && event.key === ",") {
        event.preventDefault();
        onOpenControls();
        return;
      }

      if (event.key === "Escape") {
        setOpen(false);
      }
    }

    window.addEventListener("nara:open-command-palette", openPalette);
    window.addEventListener("keydown", handleKeyDown);

    return () => {
      window.removeEventListener("nara:open-command-palette", openPalette);
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [onNewChat, onOpenControls, onOpenHistory]);

  if (!open) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-[160] grid place-items-start bg-black/60 px-4 pt-[12dvh] backdrop-blur-sm">
      <button
        type="button"
        aria-label="Close quick actions"
        onClick={() => setOpen(false)}
        className="absolute inset-0"
      />

      <section className="relative z-10 w-full max-w-xl overflow-hidden rounded-[1.75rem] border border-white/[0.08] bg-[#080b17] shadow-2xl shadow-black/60">
        <div className="border-b border-white/[0.06] p-3">
          <input
            autoFocus
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Type an action..."
            className="w-full rounded-xl bg-transparent px-3 py-2 text-sm text-slate-200 outline-none placeholder:text-slate-700"
          />
        </div>

        <div className="max-h-[48dvh] overflow-y-auto p-2">
          {filtered.map((action) => (
            <button
              key={action.id}
              type="button"
              onClick={() => {
                setOpen(false);
                action.run();
              }}
              className="flex w-full items-center justify-between gap-4 rounded-xl px-3 py-3 text-left transition hover:bg-white/[0.04]"
            >
              <div>
                <p className="text-xs font-medium text-slate-300">
                  {action.label}
                </p>
                <p className="mt-1 text-[10px] text-slate-700">{action.hint}</p>
              </div>
              <span className="text-slate-700">↗</span>
            </button>
          ))}

          {filtered.length === 0 && (
            <p className="px-3 py-8 text-center text-xs text-slate-600">
              No matching actions.
            </p>
          )}
        </div>

        <footer className="flex flex-wrap gap-2 border-t border-white/[0.06] px-4 py-3">
          {NARA_SHORTCUTS.map((shortcut) => (
            <span key={shortcut.id} className="text-[8px] text-slate-700">
              {shortcut.keys.join(" + ")} · {shortcut.label}
            </span>
          ))}
        </footer>
      </section>
    </div>
  );
}
