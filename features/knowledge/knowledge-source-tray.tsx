"use client";

import { useState } from "react";

import { getKnowledgeChunkPreview } from "@/lib/knowledge/client";
import type {
  KnowledgeChunkPreview,
  KnowledgeCitation,
  KnowledgeRetrievalDebug,
} from "@/types/knowledge";

interface KnowledgeSourceTrayProps {
  sources: KnowledgeCitation[];
  debug: KnowledgeRetrievalDebug | null;
}

function formatSimilarity(value: number) {
  return `${Math.round(value * 100)}%`;
}

export function KnowledgeSourceTray({
  sources,
  debug,
}: KnowledgeSourceTrayProps) {
  const [preview, setPreview] = useState<KnowledgeChunkPreview | null>(null);
  const [previewSource, setPreviewSource] = useState<KnowledgeCitation | null>(
    null,
  );
  const [loadingId, setLoadingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [debugOpen, setDebugOpen] = useState(false);

  if (sources.length === 0 && !debug) {
    return null;
  }

  async function openSource(source: KnowledgeCitation) {
    setLoadingId(source.chunkId);
    setError(null);

    try {
      const chunk = await getKnowledgeChunkPreview(source.chunkId);
      setPreviewSource(source);
      setPreview(chunk);
    } catch (loadError) {
      setError(
        loadError instanceof Error
          ? loadError.message
          : "Could not load this source passage.",
      );
    } finally {
      setLoadingId(null);
    }
  }

  return (
    <>
      <div className="mb-3 shrink-0 rounded-2xl border border-cyan-400/10 bg-cyan-400/[0.025] px-3 py-2.5">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-[9px] font-medium tracking-[0.14em] text-cyan-300/60 uppercase">
            Sources
          </span>

          {sources.length === 0 ? (
            <span className="text-[9px] text-slate-700">No source matched</span>
          ) : (
            sources.map((source) => (
              <button
                key={source.chunkId}
                type="button"
                disabled={loadingId === source.chunkId}
                onClick={() => void openSource(source)}
                title={`${source.filename}${source.pageNumber ? ` · page ${source.pageNumber}` : ""}`}
                className="flex max-w-[210px] items-center gap-1.5 rounded-full border border-cyan-400/15 bg-cyan-400/[0.045] px-2.5 py-1 text-[9px] text-cyan-100/80 transition hover:border-cyan-400/30 hover:bg-cyan-400/[0.08] disabled:opacity-50"
              >
                <span className="font-mono text-cyan-300">[{source.id}]</span>
                <span className="truncate">{source.filename}</span>
                {source.pageNumber && (
                  <span className="shrink-0 text-slate-600">
                    p.{source.pageNumber}
                  </span>
                )}
              </button>
            ))
          )}

          {process.env.NODE_ENV === "development" && debug && (
            <button
              type="button"
              onClick={() => setDebugOpen((current) => !current)}
              className="ml-auto rounded-full border border-white/[0.06] px-2.5 py-1 text-[8px] text-slate-600 transition hover:border-white/[0.12] hover:text-slate-300"
            >
              RAG debug
            </button>
          )}
        </div>

        {error && (
          <p className="mt-2 text-[9px] leading-4 text-red-300/70">{error}</p>
        )}

        {process.env.NODE_ENV === "development" && debug && debugOpen && (
          <div className="mt-3 border-t border-white/[0.05] pt-3">
            <div className="grid grid-cols-3 gap-2">
              <DebugMetric
                label="Threshold"
                value={debug.threshold.toFixed(2)}
              />
              <DebugMetric
                label="Selected"
                value={String(debug.selectedCount)}
              />
              <DebugMetric
                label="Semantic"
                value={debug.semanticAvailable ? "Ready" : "Fallback"}
              />
            </div>

            <p className="mt-3 line-clamp-2 text-[9px] leading-4 text-slate-600">
              Query: {debug.query}
            </p>

            {debug.sources.length > 0 && (
              <div className="mt-2 space-y-1">
                {debug.sources.map((source) => (
                  <div
                    key={source.chunkId}
                    className="flex items-center justify-between gap-3 rounded-lg bg-black/10 px-2.5 py-1.5 text-[8px]"
                  >
                    <span className="min-w-0 truncate text-slate-600">
                      [{source.id}] {source.filename} · chunk{" "}
                      {source.chunkIndex}
                    </span>
                    <span className="shrink-0 font-mono text-cyan-300/60">
                      {source.similarity.toFixed(3)} ·{" "}
                      {formatSimilarity(source.similarity)}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {preview && previewSource && (
        <div className="fixed inset-0 z-[140] flex items-center justify-center bg-black/70 px-4 py-6 backdrop-blur-sm">
          <section className="flex max-h-[76dvh] w-full max-w-xl flex-col overflow-hidden rounded-[1.75rem] border border-white/[0.08] bg-[#080b17] shadow-2xl shadow-black/60">
            <header className="flex items-start justify-between border-b border-white/[0.06] px-5 py-4">
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <span className="rounded-full border border-cyan-400/15 bg-cyan-400/[0.05] px-2 py-0.5 font-mono text-[9px] text-cyan-300">
                    [{previewSource.id}]
                  </span>
                  <p className="truncate text-xs font-medium text-slate-200">
                    {previewSource.filename}
                  </p>
                </div>
                <p className="mt-1 text-[9px] text-slate-600">
                  {preview.pageNumber ? `Page ${preview.pageNumber} · ` : ""}
                  Chunk {preview.chunkIndex} · similarity{" "}
                  {previewSource.similarity.toFixed(3)}
                </p>
              </div>

              <button
                type="button"
                aria-label="Close source preview"
                onClick={() => {
                  setPreview(null);
                  setPreviewSource(null);
                }}
                className="grid h-8 w-8 place-items-center rounded-full text-slate-600 transition hover:bg-white/[0.05] hover:text-white"
              >
                ×
              </button>
            </header>

            <div className="min-h-0 flex-1 overflow-y-auto p-5">
              <p className="whitespace-pre-wrap text-[12px] leading-6 text-slate-300">
                {preview.content}
              </p>
            </div>
          </section>
        </div>
      )}
    </>
  );
}

function DebugMetric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-white/[0.05] bg-black/10 px-2.5 py-2">
      <p className="font-mono text-[10px] text-slate-300">{value}</p>
      <p className="mt-0.5 text-[8px] text-slate-700">{label}</p>
    </div>
  );
}
