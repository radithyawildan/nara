"use client";

import { useState } from "react";

import type {
  KnowledgeCitation,
  KnowledgeRetrievalDebug,
} from "@/types/knowledge";

interface KnowledgeSourceTrayProps {
  sources: KnowledgeCitation[];
  debug: KnowledgeRetrievalDebug | null;
}

export function KnowledgeSourceTray(props: KnowledgeSourceTrayProps) {
  const { debug } = props;
  const [open, setOpen] = useState(false);

  if (process.env.NODE_ENV !== "development" || !debug) {
    return null;
  }

  return (
    <div className="mb-3 shrink-0">
      <button
        type="button"
        onClick={() => setOpen((current) => !current)}
        className="inline-flex items-center gap-2 rounded-full border border-cyan-400/10 bg-cyan-400/[0.025] px-3 py-1.5 text-[9px] text-cyan-200/55 transition hover:border-cyan-400/20 hover:bg-cyan-400/[0.05] hover:text-cyan-100"
      >
        <span className="h-1.5 w-1.5 rounded-full bg-cyan-300/60" />
        RAG debug
        <span className="font-mono text-cyan-300/45">
          {debug.selectedCount}/{debug.candidateCount}
        </span>
      </button>

      {open && (
        <div className="mt-2 rounded-2xl border border-cyan-400/10 bg-cyan-400/[0.02] p-3">
          <div className="grid grid-cols-3 gap-2">
            <Metric label="Threshold" value={debug.threshold.toFixed(2)} />
            <Metric label="Candidates" value={String(debug.candidateCount)} />
            <Metric label="Selected" value={String(debug.selectedCount)} />
            <Metric
              label="Documents"
              value={String(debug.uniqueDocumentCount)}
            />
            <Metric label="Per source" value={String(debug.perDocumentLimit)} />
            <Metric label="Deduped" value={String(debug.duplicateCount)} />
          </div>

          <div className="mt-2 flex items-center justify-between rounded-xl border border-white/[0.04] bg-black/10 px-2.5 py-2">
            <span className="text-[8px] text-slate-700">
              Semantic retrieval
            </span>
            <span
              className={`text-[8px] ${
                debug.semanticAvailable
                  ? "text-emerald-300/60"
                  : "text-amber-300/60"
              }`}
            >
              {debug.semanticAvailable ? "Ready" : "Fallback"}
            </span>
          </div>

          <p className="mt-3 line-clamp-2 text-[9px] leading-4 text-slate-600">
            Query: {debug.query}
          </p>

          {debug.sources.length > 0 ? (
            <div className="mt-2 space-y-1.5">
              {debug.sources.map((source) => (
                <div
                  key={source.chunkId}
                  className="rounded-lg bg-black/10 px-2.5 py-2 text-[8px]"
                >
                  <div className="flex items-center justify-between gap-3">
                    <span className="min-w-0 truncate text-slate-600">
                      [{source.id}] {source.filename} · chunk{" "}
                      {source.chunkIndex}
                    </span>

                    <span className="shrink-0 font-mono text-cyan-300/60">
                      {source.rankScore.toFixed(3)}
                    </span>
                  </div>

                  <div className="mt-1 flex flex-wrap gap-x-3 gap-y-1 text-[7px] text-slate-700">
                    <span>semantic {source.similarity.toFixed(3)}</span>
                    <span>redundancy {source.redundancy.toFixed(3)}</span>
                    {source.reasons.map((reason) => (
                      <span key={reason}>{reason}</span>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="mt-2 text-[9px] text-slate-700">
              No knowledge chunk passed the retrieval threshold.
            </p>
          )}
        </div>
      )}
    </div>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-white/[0.05] bg-black/10 px-2.5 py-2">
      <p className="font-mono text-[10px] text-slate-300">{value}</p>
      <p className="mt-0.5 text-[8px] text-slate-700">{label}</p>
    </div>
  );
}
