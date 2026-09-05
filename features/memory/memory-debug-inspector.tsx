"use client";

import { useState } from "react";

import type { MemoryRetrievalDebug } from "@/types/memory-debug";

interface MemoryDebugInspectorProps {
  debug: MemoryRetrievalDebug | null;
}

function formatScore(value: number) {
  return value.toFixed(2);
}

export function MemoryDebugInspector({ debug }: MemoryDebugInspectorProps) {
  const [open, setOpen] = useState(false);

  if (process.env.NODE_ENV !== "development") {
    return null;
  }

  return (
    <div className="fixed bottom-4 left-4 z-[120]">
      {open && (
        <section className="mb-2 flex max-h-[65dvh] w-[min(390px,calc(100vw-2rem))] flex-col overflow-hidden rounded-[1.5rem] border border-cyan-400/15 bg-[#070b16]/95 shadow-2xl shadow-black/60 backdrop-blur-xl">
          <header className="flex shrink-0 items-start justify-between border-b border-white/[0.06] px-4 py-3">
            <div>
              <div className="flex items-center gap-2">
                <span className="h-1.5 w-1.5 rounded-full bg-cyan-300" />

                <p className="text-xs font-medium text-cyan-100">
                  Memory Inspector
                </p>

                <span className="rounded-full border border-cyan-400/10 bg-cyan-400/[0.05] px-2 py-0.5 text-[8px] tracking-[0.1em] text-cyan-300/70 uppercase">
                  Dev
                </span>
              </div>

              <p className="mt-1 text-[9px] text-slate-600">
                Hybrid retrieval observability
              </p>
            </div>

            <button
              type="button"
              aria-label="Close memory inspector"
              onClick={() => setOpen(false)}
              className="grid h-7 w-7 place-items-center rounded-full text-slate-600 transition hover:bg-white/[0.05] hover:text-white"
            >
              ×
            </button>
          </header>

          <div className="min-h-0 flex-1 overflow-y-auto p-4">
            {!debug ? (
              <div className="rounded-2xl border border-dashed border-white/[0.07] px-4 py-8 text-center">
                <p className="text-xs text-slate-500">No retrieval data yet.</p>

                <p className="mt-1 text-[10px] leading-4 text-slate-700">
                  Send a message to inspect NARA&apos;s memory retrieval.
                </p>
              </div>
            ) : (
              <>
                <div className="rounded-2xl border border-white/[0.06] bg-white/[0.02] p-3">
                  <p className="text-[9px] font-medium tracking-[0.12em] text-slate-600 uppercase">
                    Query
                  </p>

                  <p className="mt-2 text-xs leading-5 text-slate-300">
                    {debug.query}
                  </p>
                </div>

                <div className="mt-3 grid grid-cols-4 gap-2">
                  <Metric label="Enabled" value={debug.totalEnabledMemories} />

                  <Metric label="Lexical" value={debug.lexicalCandidateCount} />

                  <Metric
                    label="Semantic"
                    value={debug.semanticCandidateCount}
                  />

                  <Metric label="Selected" value={debug.selectedCount} />
                </div>

                <div className="mt-3 flex items-center justify-between rounded-xl border border-white/[0.05] bg-black/10 px-3 py-2">
                  <span className="text-[10px] text-slate-600">
                    Semantic retrieval
                  </span>

                  <span
                    className={`flex items-center gap-1.5 text-[10px] ${
                      debug.semanticAvailable
                        ? "text-emerald-300/70"
                        : "text-amber-300/70"
                    }`}
                  >
                    <span
                      className={`h-1.5 w-1.5 rounded-full ${
                        debug.semanticAvailable
                          ? "bg-emerald-300"
                          : "bg-amber-300"
                      }`}
                    />

                    {debug.semanticAvailable ? "Available" : "Fallback"}
                  </span>
                </div>

                <div className="my-4 flex items-center justify-between">
                  <p className="text-[9px] font-medium tracking-[0.12em] text-slate-600 uppercase">
                    Selected memories
                  </p>

                  <span className="text-[9px] text-slate-700">
                    ranked high → low
                  </span>
                </div>

                {debug.selected.length === 0 ? (
                  <div className="rounded-xl border border-dashed border-white/[0.06] px-3 py-5 text-center text-[10px] text-slate-600">
                    No memory passed the retrieval threshold.
                  </div>
                ) : (
                  <div className="space-y-2">
                    {debug.selected.map((memory, index) => (
                      <article
                        key={memory.id}
                        className="rounded-2xl border border-white/[0.06] bg-white/[0.018] p-3"
                      >
                        <div className="flex items-center justify-between gap-2">
                          <div className="flex items-center gap-2">
                            <span className="grid h-5 w-5 place-items-center rounded-lg border border-white/[0.06] bg-black/20 text-[8px] text-slate-500">
                              {index + 1}
                            </span>

                            <span className="rounded-full border border-violet-400/10 bg-violet-400/[0.05] px-2 py-0.5 text-[8px] text-violet-300/70">
                              {memory.category}
                            </span>
                          </div>

                          <span className="font-mono text-[10px] text-cyan-300/70">
                            {formatScore(memory.score)}
                          </span>
                        </div>

                        <p className="mt-2 text-[11px] leading-5 text-slate-400">
                          {memory.content}
                        </p>

                        <div className="mt-3 grid grid-cols-2 gap-2">
                          <Score label="Lexical" value={memory.lexicalScore} />

                          <Score
                            label="Semantic"
                            value={memory.semanticScore}
                          />
                        </div>

                        <div className="mt-2 flex flex-wrap gap-1">
                          {memory.reasons.map((reason) => (
                            <span
                              key={reason}
                              className="rounded-full border border-white/[0.05] bg-black/10 px-2 py-0.5 text-[8px] text-slate-600"
                            >
                              {reason}
                            </span>
                          ))}
                        </div>
                      </article>
                    ))}
                  </div>
                )}
              </>
            )}
          </div>
        </section>
      )}

      <button
        type="button"
        onClick={() => setOpen((current) => !current)}
        className="flex h-10 items-center gap-2 rounded-full border border-cyan-400/15 bg-[#080c18]/90 px-4 text-[10px] font-medium text-cyan-200 shadow-xl shadow-black/40 backdrop-blur-xl transition hover:border-cyan-400/30 hover:bg-cyan-400/[0.07]"
      >
        <span className="relative flex h-2 w-2">
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-cyan-300 opacity-30" />

          <span className="relative inline-flex h-2 w-2 rounded-full bg-cyan-300" />
        </span>
        Memory debug
        {debug && (
          <span className="rounded-full bg-white/[0.05] px-1.5 py-0.5 font-mono text-[8px] text-slate-500">
            {debug.selectedCount}
          </span>
        )}
      </button>
    </div>
  );
}

function Metric({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-xl border border-white/[0.05] bg-black/10 px-2 py-2 text-center">
      <p className="font-mono text-sm text-slate-300">{value}</p>

      <p className="mt-0.5 text-[8px] text-slate-700">{label}</p>
    </div>
  );
}

function Score({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-lg bg-black/10 px-2.5 py-1.5">
      <div className="flex items-center justify-between">
        <span className="text-[8px] text-slate-700">{label}</span>

        <span className="font-mono text-[9px] text-slate-500">
          {value.toFixed(3)}
        </span>
      </div>
    </div>
  );
}
