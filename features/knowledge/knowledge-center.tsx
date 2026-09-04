"use client";

import { useEffect, useRef, useState, type ChangeEvent } from "react";

import {
  deleteKnowledgeDocument,
  listKnowledgeDocuments,
  uploadKnowledgeDocument,
} from "@/lib/knowledge/client";
import type { KnowledgeDocument } from "@/types/knowledge";

interface KnowledgeCenterProps {
  open: boolean;
  onClose: () => void;
}

function formatBytes(bytes: number) {
  if (bytes < 1024) {
    return `${bytes} B`;
  }

  if (bytes < 1024 * 1024) {
    return `${(bytes / 1024).toFixed(1)} KB`;
  }

  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function formatDate(value: string) {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "";
  }

  return new Intl.DateTimeFormat(undefined, {
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

function statusLabel(document: KnowledgeDocument) {
  if (document.status === "processing") {
    return "Indexing";
  }

  if (document.status === "error") {
    return "Error";
  }

  return "Ready";
}

export function KnowledgeCenter({ open, onClose }: KnowledgeCenterProps) {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [documents, setDocuments] = useState<KnowledgeDocument[]>([]);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) {
      return;
    }

    let cancelled = false;

    async function load() {
      setLoading(true);
      setError(null);

      try {
        const storedDocuments = await listKnowledgeDocuments();

        if (!cancelled) {
          setDocuments(storedDocuments);
        }
      } catch (loadError) {
        if (!cancelled) {
          setError(
            loadError instanceof Error
              ? loadError.message
              : "Could not load knowledge documents.",
          );
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    void load();

    return () => {
      cancelled = true;
    };
  }, [open]);

  async function handleFileChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";

    if (!file) {
      return;
    }

    setUploading(true);
    setError(null);

    try {
      const document = await uploadKnowledgeDocument(file);
      setDocuments((current) => [
        document,
        ...current.filter((item) => item.id !== document.id),
      ]);
    } catch (uploadError) {
      setError(
        uploadError instanceof Error
          ? uploadError.message
          : "Could not index this document.",
      );
    } finally {
      setUploading(false);
    }
  }

  async function handleDelete(documentId: string) {
    setDeletingId(documentId);
    setError(null);

    try {
      await deleteKnowledgeDocument(documentId);
      setDocuments((current) =>
        current.filter((document) => document.id !== documentId),
      );
    } catch (deleteError) {
      setError(
        deleteError instanceof Error
          ? deleteError.message
          : "Could not delete this document.",
      );
    } finally {
      setDeletingId(null);
    }
  }

  if (!open) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-[110] flex items-center justify-center bg-black/65 px-4 py-6 backdrop-blur-sm">
      <section className="flex max-h-[82dvh] w-full max-w-2xl flex-col overflow-hidden rounded-[2rem] border border-white/[0.08] bg-[#080b17] shadow-2xl shadow-black/60">
        <header className="flex shrink-0 items-start justify-between border-b border-white/[0.06] px-5 py-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="grid h-7 w-7 place-items-center rounded-xl border border-cyan-400/15 bg-cyan-400/[0.06] text-xs font-semibold text-cyan-200">
                K
              </span>

              <div>
                <p className="text-sm font-medium text-white">Knowledge</p>
                <p className="mt-0.5 text-[10px] text-slate-600">
                  Private documents for grounded answers
                </p>
              </div>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="Close Knowledge Center"
            className="grid h-8 w-8 place-items-center rounded-full text-slate-600 transition hover:bg-white/[0.05] hover:text-white"
          >
            ×
          </button>
        </header>

        <div className="min-h-0 flex-1 overflow-y-auto p-5">
          <input
            ref={inputRef}
            type="file"
            accept=".pdf,.txt,.md,.markdown,application/pdf,text/plain,text/markdown"
            onChange={handleFileChange}
            className="hidden"
          />

          <button
            type="button"
            disabled={uploading}
            onClick={() => inputRef.current?.click()}
            className="flex w-full items-center justify-between rounded-2xl border border-dashed border-cyan-400/20 bg-cyan-400/[0.035] px-4 py-4 text-left transition hover:border-cyan-400/30 hover:bg-cyan-400/[0.06] disabled:cursor-wait disabled:opacity-50"
          >
            <div>
              <p className="text-xs font-medium text-cyan-100">
                {uploading ? "Indexing document..." : "Add knowledge source"}
              </p>
              <p className="mt-1 text-[10px] text-slate-600">
                PDF, TXT, or Markdown · up to 8 MB
              </p>
            </div>

            <span className="rounded-full border border-cyan-400/15 px-3 py-1 text-[9px] text-cyan-300/70">
              {uploading ? "Working" : "Upload"}
            </span>
          </button>

          {error && (
            <div className="mt-3 rounded-2xl border border-red-400/15 bg-red-400/[0.04] px-4 py-3 text-[11px] leading-5 text-red-300/80">
              {error}
            </div>
          )}

          <div className="mt-5 flex items-center justify-between">
            <p className="text-[9px] font-medium tracking-[0.14em] text-slate-600 uppercase">
              Indexed sources
            </p>

            <span className="text-[9px] text-slate-700">
              {documents.length} document{documents.length === 1 ? "" : "s"}
            </span>
          </div>

          <div className="mt-3 space-y-2">
            {loading ? (
              [0, 1, 2].map((index) => (
                <div
                  key={index}
                  className="h-20 animate-pulse rounded-2xl bg-white/[0.025]"
                />
              ))
            ) : documents.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-white/[0.06] px-4 py-8 text-center">
                <p className="text-xs text-slate-500">
                  No knowledge sources yet.
                </p>
                <p className="mt-1 text-[10px] text-slate-700">
                  Upload a document and NARA can retrieve relevant passages
                  while chatting.
                </p>
              </div>
            ) : (
              documents.map((document) => (
                <article
                  key={document.id}
                  className="rounded-2xl border border-white/[0.06] bg-white/[0.02] p-4"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="truncate text-xs font-medium text-slate-300">
                          {document.filename}
                        </p>

                        <span
                          className={`shrink-0 rounded-full border px-2 py-0.5 text-[8px] ${
                            document.status === "ready"
                              ? "border-emerald-400/10 bg-emerald-400/[0.05] text-emerald-300/70"
                              : document.status === "error"
                                ? "border-red-400/10 bg-red-400/[0.05] text-red-300/70"
                                : "border-amber-400/10 bg-amber-400/[0.05] text-amber-300/70"
                          }`}
                        >
                          {statusLabel(document)}
                        </span>
                      </div>

                      <p className="mt-1 text-[9px] text-slate-700">
                        {formatBytes(document.sizeBytes)} ·{" "}
                        {document.chunkCount} chunks
                        {document.pageCount > 1
                          ? ` · ${document.pageCount} pages`
                          : ""}
                      </p>

                      <p className="mt-1 text-[9px] text-slate-700">
                        {formatDate(document.updatedAt)}
                      </p>

                      {document.errorMessage && (
                        <p className="mt-2 text-[9px] leading-4 text-red-300/60">
                          {document.errorMessage}
                        </p>
                      )}
                    </div>

                    <button
                      type="button"
                      disabled={deletingId === document.id}
                      onClick={() => {
                        if (
                          window.confirm(
                            `Delete “${document.filename}” from NARA Knowledge?`,
                          )
                        ) {
                          void handleDelete(document.id);
                        }
                      }}
                      className="shrink-0 rounded-xl px-2.5 py-1.5 text-[9px] text-slate-600 transition hover:bg-red-400/[0.06] hover:text-red-300 disabled:opacity-30"
                    >
                      {deletingId === document.id ? "Deleting..." : "Delete"}
                    </button>
                  </div>
                </article>
              ))
            )}
          </div>
        </div>
      </section>
    </div>
  );
}
