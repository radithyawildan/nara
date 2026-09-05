"use client";

import { useMemo, useState } from "react";

import {
  getKnowledgeChunkPreview,
  getKnowledgeOriginalFileUrl,
} from "@/lib/knowledge/client";
import type {
  KnowledgeChunkPreview,
  KnowledgeCitation,
} from "@/types/knowledge";

interface KnowledgeMessageSourcesProps {
  citations: KnowledgeCitation[];
}

function formatSimilarity(value: number) {
  return `${Math.round(value * 100)}%`;
}

export function KnowledgeMessageSources({
  citations,
}: KnowledgeMessageSourcesProps) {
  const sources = useMemo(() => {
    const unique = new Map<string, KnowledgeCitation>();

    for (const citation of citations) {
      if (!unique.has(citation.chunkId)) {
        unique.set(citation.chunkId, citation);
      }
    }

    return [...unique.values()];
  }, [citations]);

  const [preview, setPreview] = useState<KnowledgeChunkPreview | null>(null);
  const [previewSource, setPreviewSource] = useState<KnowledgeCitation | null>(
    null,
  );
  const [loadingId, setLoadingId] = useState<string | null>(null);
  const [openingOriginal, setOpeningOriginal] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (sources.length === 0) {
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

  async function openOriginal() {
    if (!previewSource) {
      return;
    }

    setOpeningOriginal(true);
    setError(null);

    try {
      const url = await getKnowledgeOriginalFileUrl(previewSource.documentId);
      window.open(url, "_blank", "noopener,noreferrer");
    } catch (openError) {
      setError(
        openError instanceof Error
          ? openError.message
          : "Could not open the original source file.",
      );
    } finally {
      setOpeningOriginal(false);
    }
  }

  return (
    <>
      <div className="mt-3 border-t border-white/[0.06] pt-2.5">
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="mr-0.5 text-[8px] font-medium tracking-[0.14em] text-cyan-300/45 uppercase">
            Sources
          </span>

          {sources.map((source) => (
            <button
              key={source.chunkId}
              type="button"
              disabled={loadingId === source.chunkId}
              onClick={() => void openSource(source)}
              title={`${source.filename} · similarity ${source.similarity.toFixed(3)}`}
              className="group inline-flex max-w-[220px] items-center gap-1.5 rounded-full border border-cyan-400/10 bg-cyan-400/[0.035] px-2 py-1 text-[8px] text-cyan-100/65 transition hover:border-cyan-400/25 hover:bg-cyan-400/[0.07] hover:text-cyan-100 disabled:cursor-wait disabled:opacity-40"
            >
              <span className="shrink-0 font-mono text-cyan-300/80">
                [{source.id}]
              </span>

              <span className="min-w-0 truncate">{source.filename}</span>

              {source.pageNumber && (
                <span className="shrink-0 text-cyan-300/35">
                  p.{source.pageNumber}
                </span>
              )}
            </button>
          ))}
        </div>

        {error && (
          <p className="mt-2 text-[9px] leading-4 text-red-300/65">{error}</p>
        )}
      </div>

      {preview && previewSource && (
        <div className="fixed inset-0 z-[160] flex items-center justify-center bg-black/75 px-4 py-6 backdrop-blur-sm">
          <section className="flex max-h-[78dvh] w-full max-w-2xl flex-col overflow-hidden rounded-[1.8rem] border border-white/[0.08] bg-[#080b17] shadow-2xl shadow-black/70">
            <header className="flex items-start justify-between gap-4 border-b border-white/[0.06] px-5 py-4">
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="rounded-full border border-cyan-400/15 bg-cyan-400/[0.05] px-2 py-0.5 font-mono text-[9px] text-cyan-300">
                    [{previewSource.id}]
                  </span>

                  <p className="min-w-0 truncate text-xs font-medium text-slate-200">
                    {previewSource.filename}
                  </p>
                </div>

                <div className="mt-1.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-[9px] text-slate-600">
                  {preview.pageNumber && <span>Page {preview.pageNumber}</span>}

                  <span>Chunk {preview.chunkIndex}</span>

                  <span>Similarity {previewSource.similarity.toFixed(3)}</span>

                  <span>{formatSimilarity(previewSource.similarity)}</span>
                </div>
              </div>

              <div className="flex shrink-0 items-center gap-2">
                <button
                  type="button"
                  disabled={openingOriginal}
                  onClick={() => void openOriginal()}
                  className="rounded-full border border-cyan-400/15 bg-cyan-400/[0.04] px-3 py-1.5 text-[9px] text-cyan-200/80 transition hover:border-cyan-400/30 hover:bg-cyan-400/[0.08] disabled:cursor-wait disabled:opacity-40"
                >
                  {openingOriginal ? "Opening..." : "Open original"}
                </button>

                <button
                  type="button"
                  aria-label="Close source preview"
                  onClick={() => {
                    setPreview(null);
                    setPreviewSource(null);
                    setError(null);
                  }}
                  className="grid h-8 w-8 place-items-center rounded-full text-slate-600 transition hover:bg-white/[0.05] hover:text-white"
                >
                  ×
                </button>
              </div>
            </header>

            <div className="min-h-0 flex-1 overflow-y-auto p-5">
              <div className="rounded-2xl border border-white/[0.05] bg-white/[0.015] p-4">
                <p className="whitespace-pre-wrap text-[12px] leading-6 text-slate-300">
                  {preview.content}
                </p>
              </div>

              {error && (
                <p className="mt-3 rounded-xl border border-red-400/10 bg-red-400/[0.04] px-3 py-2 text-[9px] leading-4 text-red-300/70">
                  {error}
                </p>
              )}
            </div>
          </section>
        </div>
      )}
    </>
  );
}
