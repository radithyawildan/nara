"use client";

import { useReducer } from "react";

import { avatarReducer } from "@/features/avatar/avatar-machine";
import { NaraAvatar } from "@/features/avatar/nara-avatar";
import type { AvatarEvent } from "@/types/avatar";

const controls: Array<{
  label: string;
  event: AvatarEvent;
}> = [
  { label: "Listen", event: { type: "START_LISTENING" } },
  { label: "Transcribe", event: { type: "START_TRANSCRIBING" } },
  { label: "Think", event: { type: "START_THINKING" } },
  { label: "Speak", event: { type: "START_SPEAKING" } },
  { label: "Finish", event: { type: "FINISH_SPEAKING" } },
  { label: "Error", event: { type: "FAIL" } },
  { label: "Reset", event: { type: "RESET" } },
];

export function NaraShell() {
  const [avatarState, dispatch] = useReducer(avatarReducer, "idle");

  return (
    <main className="min-h-screen bg-[#050714] text-white">
      <div className="mx-auto flex min-h-screen max-w-7xl flex-col px-6 py-8">
        <header className="flex items-center justify-between border-b border-white/10 pb-6">
          <div>
            <p className="text-xl font-semibold tracking-[0.28em]">NARA</p>
            <p className="mt-1 text-sm text-slate-400">
              Neural Adaptive Responsive Avatar
            </p>
          </div>

          <div className="flex items-center gap-2 rounded-full border border-emerald-400/20 bg-emerald-400/5 px-3 py-2 text-xs text-emerald-300">
            <span className="h-2 w-2 rounded-full bg-emerald-400" />
            Core online
          </div>
        </header>

        <section className="grid flex-1 place-items-center py-12">
          <div className="flex w-full max-w-4xl flex-col items-center gap-12">
            <NaraAvatar state={avatarState} />

            <div className="w-full rounded-3xl border border-white/10 bg-white/[0.03] p-4 backdrop-blur-xl">
              <p className="mb-3 text-xs tracking-[0.2em] text-slate-500 uppercase">
                Temporary State Controls
              </p>

              <div className="flex flex-wrap gap-2">
                {controls.map(({ label, event }) => (
                  <button
                    key={label}
                    type="button"
                    onClick={() => dispatch(event)}
                    className="rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm text-slate-200 transition hover:border-violet-400/40 hover:bg-violet-400/10 hover:text-white"
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex w-full items-center gap-3 rounded-full border border-violet-400/20 bg-black/30 p-2 shadow-2xl shadow-violet-950/30">
              <button
                type="button"
                aria-label="Start voice input"
                className="grid h-12 w-12 shrink-0 place-items-center rounded-full bg-white/5 text-lg"
              >
                ?
              </button>

              <input
                disabled
                placeholder="Ask NARA anything..."
                className="h-12 flex-1 bg-transparent px-2 text-sm text-white outline-none placeholder:text-slate-600 disabled:cursor-not-allowed"
              />

              <button
                type="button"
                disabled
                className="h-12 rounded-full bg-violet-500 px-6 text-sm font-medium text-white opacity-60"
              >
                Send
              </button>
            </div>

            <p className="text-center text-xs text-slate-600">
              Conversation input will be enabled in the next milestone.
            </p>
          </div>
        </section>
      </div>
    </main>
  );
}
