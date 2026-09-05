"use client";

import { useEffect, useRef, useState, type ChangeEvent } from "react";

import {
  deleteKnowledgeDocument,
  listKnowledgeDocumentChunks,
  listKnowledgeDocuments,
  reindexKnowledgeDocument,
  uploadKnowledgeDocument,
} from "@/lib/knowledge/client";
import type {
  KnowledgeChunkPreview,
  KnowledgeDocument,
} from "@/types/knowledge";

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

function statusClasses(status: KnowledgeDocument["status"]) {
  if (status === "processing") {
    return "border-amber-400/15 bg-amber-400/[0.05] text-amber-300/80";
  }

  if (status === "error") {
    return "border-red-400/15 bg-red-400/[0.05] text-red-300/80";
  }

  return "border-emerald-400/15 bg-emerald-400/[0.05] text-emerald-300/80";
}

function statusLabel(status: KnowledgeDocument["status"]) {
  if (status === "processing") {
    return "Processing";
  }

  if (status === "error") {
    return "Failed";
  }

  return "Ready";
}

export function KnowledgeCenter({ open, onClose }: KnowledgeCenterProps) {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [documents, setDocuments] = useState<KnowledgeDocument[]>([]);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [reindexingId, setReindexingId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [previewDocument, setPreviewDocument] =
    useState<KnowledgeDocument | null>(null);
  const [previewChunks, setPreviewChunks] = useState<KnowledgeChunkPreview[]>(
    [],
  );
  const [previewLoading, setPreviewLoading] = useState(false);
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

  const normalizedSearch = searchQuery.trim().toLowerCase();
  const filteredDocuments = normalizedSearch
    ? documents.filter((document) =>
        document.filename.toLowerCase().includes(normalizedSearch),
      )
    : documents;

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
      setDeleteConfirmId(null);

      if (previewDocument?.id === documentId) {
        setPreviewDocument(null);
        setPreviewChunks([]);
      }
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

  async function handleReindex(documentId: string) {
    setReindexingId(documentId);
    setError(null);

    setDocuments((current) =>
      current.map((document) =>
        document.id === documentId
          ? { ...document, status: "processing", errorMessage: null }
          : document,
      ),
    );

    try {
      const document = await reindexKnowledgeDocument(documentId);
      setDocuments((current) =>
        current.map((item) => (item.id === document.id ? document : item)),
      );
    } catch (reindexError) {
      setError(
        reindexError instanceof Error
          ? reindexError.message
          : "Could not re-index this document.",
      );

      try {
        setDocuments(await listKnowledgeDocuments());
      } catch {
        // Keep the optimistic status if refresh is unavailable.
      }
    } finally {
      setReindexingId(null);
    }
  }

  async function handlePreview(document: KnowledgeDocument) {
    setPreviewDocument(document);
    setPreviewChunks([]);
    setPreviewLoading(true);
    setError(null);

    try {
      setPreviewChunks(await listKnowledgeDocumentChunks(document.id, 12));
    } catch (previewError) {
      setError(
        previewError instanceof Error
          ? previewError.message
          : "Could not load document passages.",
      );
    } finally {
      setPreviewLoading(false);
    }
  }

  if (!open) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-[110] flex items-center justify-center bg-black/65 px-4 py-6 backdrop-blur-sm">
      <section className="flex max-h-[86dvh] w-full max-w-4xl flex-col overflow-hidden rounded-[2rem] border border-white/[0.08] bg-[#080b17] shadow-2xl shadow-black/60">
        <header className="flex shrink-0 items-start justify-between border-b border-white/[0.06] px-5 py-4">
          <div className="flex items-center gap-3">
            <span className="grid h-8 w-8 place-items-center rounded-xl border border-cyan-400/15 bg-cyan-400/[0.06] text-xs font-semibold text-cyan-200">
              K
            </span>

            <div>
              <div className="flex items-center gap-2">
                <p className="text-sm font-medium text-white">Knowledge</p>
                <span className="rounded-full border border-white/[0.06] bg-white/[0.025] px-2 py-0.5 text-[8px] text-slate-600">
                  RAG v1.1
                </span>
              </div>
              <p className="mt-0.5 text-[10px] text-slate-600">
                Private documents for grounded answers and source citations
              </p>
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

        <div className="grid min-h-0 flex-1 lg:grid-cols-[minmax(0,1fr)_320px]">
          <div className="min-h-0 overflow-y-auto p-5">
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

            <div className="mt-4 flex items-center gap-2 rounded-xl border border-white/[0.06] bg-black/10 px-3 py-2.5">
              <span className="text-[10px] text-slate-700">⌕</span>
              <input
                type="search"
                value={searchQuery}
                onChange={(event) => setSearchQuery(event.target.value)}
                placeholder="Search documents"
                className="min-w-0 flex-1 bg-transparent text-[11px] text-slate-300 outline-none placeholder:text-slate-700"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery("")}
                  className="text-[10px] text-slate-700 transition hover:text-white"
                >
                  ×
                </button>
              )}
            </div>

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
                    className="h-24 animate-pulse rounded-2xl bg-white/[0.025]"
                  />
                ))
              ) : filteredDocuments.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-white/[0.06] px-4 py-8 text-center">
                  <p className="text-xs text-slate-500">
                    {normalizedSearch
                      ? "No documents match this search."
                      : "No knowledge sources yet."}
                  </p>
                  <p className="mt-1 text-[10px] text-slate-700">
                    Upload a document and NARA can retrieve relevant passages
                    while chatting.
                  </p>
                </div>
              ) : (
                filteredDocuments.map((document) => {
                  const reindexing = reindexingId === document.id;
                  const deleting = deletingId === document.id;
                  const confirmingDelete = deleteConfirmId === document.id;

                  return (
                    <article
                      key={document.id}
                      className={`rounded-2xl border p-4 transition ${
                        previewDocument?.id === document.id
                          ? "border-cyan-400/20 bg-cyan-400/[0.035]"
                          : "border-white/[0.06] bg-white/[0.02]"
                      }`}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <button
                          type="button"
                          onClick={() => void handlePreview(document)}
                          className="min-w-0 flex-1 text-left"
                        >
                          <div className="flex min-w-0 items-center gap-2">
                            <p className="truncate text-xs font-medium text-slate-300">
                              {document.filename}
                            </p>
                            <span
                              className={`shrink-0 rounded-full border px-2 py-0.5 text-[8px] ${statusClasses(document.status)}`}
                            >
                              {reindexing
                                ? "Processing"
                                : statusLabel(document.status)}
                            </span>
                          </div>

                          <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-[9px] text-slate-700">
                            <span>{formatBytes(document.sizeBytes)}</span>
                            <span>
                              {document.pageCount} page
                              {document.pageCount === 1 ? "" : "s"}
                            </span>
                            <span>{document.chunkCount} chunks</span>
                            <span>
                              {document.characterCount.toLocaleString()} chars
                            </span>
                          </div>

                          <p className="mt-2 text-[8px] text-slate-700">
                            Updated {formatDate(document.updatedAt)} · click to
                            preview passages
                          </p>
                        </button>

                        <div className="flex shrink-0 items-center gap-1">
                          <button
                            type="button"
                            disabled={
                              reindexing ||
                              deleting ||
                              document.status === "processing"
                            }
                            onClick={() => void handleReindex(document.id)}
                            title="Refresh embeddings from stored chunks"
                            className="rounded-lg px-2 py-1.5 text-[9px] text-cyan-300/60 transition hover:bg-cyan-400/[0.06] hover:text-cyan-200 disabled:opacity-30"
                          >
                            Re-index
                          </button>

                          <button
                            type="button"
                            disabled={deleting || reindexing}
                            onClick={() =>
                              setDeleteConfirmId((current) =>
                                current === document.id ? null : document.id,
                              )
                            }
                            className="rounded-lg px-2 py-1.5 text-[9px] text-red-300/50 transition hover:bg-red-400/[0.06] hover:text-red-200 disabled:opacity-30"
                          >
                            Delete
                          </button>
                        </div>
                      </div>

                      {document.errorMessage && (
                        <p className="mt-3 rounded-xl border border-red-400/10 bg-red-400/[0.03] px-3 py-2 text-[9px] leading-4 text-red-300/60">
                          {document.errorMessage}
                        </p>
                      )}

                      {confirmingDelete && (
                        <div className="mt-3 flex items-center justify-between gap-3 rounded-xl border border-red-400/12 bg-red-400/[0.035] px-3 py-2.5">
                          <p className="text-[9px] text-red-200/60">
                            Delete this document and all indexed chunks?
                          </p>
                          <div className="flex gap-1">
                            <button
                              type="button"
                              disabled={deleting}
                              onClick={() => setDeleteConfirmId(null)}
                              className="rounded-lg px-2 py-1 text-[8px] text-slate-600 hover:text-white"
                            >
                              Cancel
                            </button>
                            <button
                              type="button"
                              disabled={deleting}
                              onClick={() => void handleDelete(document.id)}
                              className="rounded-lg bg-red-400/10 px-2 py-1 text-[8px] text-red-300 hover:bg-red-400/20 disabled:opacity-40"
                            >
                              {deleting ? "Deleting..." : "Confirm"}
                            </button>
                          </div>
                        </div>
                      )}
                    </article>
                  );
                })
              )}
            </div>
          </div>

          <aside className="min-h-0 border-t border-white/[0.06] bg-black/10 p-5 lg:border-l lg:border-t-0">
            <div className="flex items-center justify-between">
              <p className="text-[9px] font-medium tracking-[0.14em] text-slate-600 uppercase">
                Source preview
              </p>
              {previewDocument && (
                <button
                  type="button"
                  onClick={() => {
                    setPreviewDocument(null);
                    setPreviewChunks([]);
                  }}
                  className="text-[9px] text-slate-700 hover:text-white"
                >
                  Clear
                </button>
              )}
            </div>

            {!previewDocument ? (
              <div className="mt-4 rounded-2xl border border-dashed border-white/[0.06] px-4 py-8 text-center">
                <p className="text-[10px] leading-5 text-slate-700">
                  Select a document to inspect the stored passages NARA can
                  retrieve.
                </p>
              </div>
            ) : (
              <div className="mt-4">
                <p className="break-words text-xs font-medium text-slate-300">
                  {previewDocument.filename}
                </p>
                <p className="mt-1 text-[9px] text-slate-700">
                  Showing up to 12 indexed chunks
                </p>

                <div className="mt-3 max-h-[52dvh] space-y-2 overflow-y-auto pr-1">
                  {previewLoading ? (
                    [0, 1, 2].map((index) => (
                      <div
                        key={index}
                        className="h-24 animate-pulse rounded-xl bg-white/[0.025]"
                      />
                    ))
                  ) : previewChunks.length === 0 ? (
                    <p className="rounded-xl border border-dashed border-white/[0.05] px-3 py-5 text-center text-[9px] text-slate-700">
                      No stored passages found.
                    </p>
                  ) : (
                    previewChunks.map((chunk) => (
                      <article
                        key={chunk.id}
                        className="rounded-xl border border-white/[0.05] bg-white/[0.015] p-3"
                      >
                        <div className="flex items-center justify-between text-[8px] text-slate-700">
                          <span>Chunk {chunk.chunkIndex}</span>
                          <span>
                            {chunk.pageNumber
                              ? `Page ${chunk.pageNumber}`
                              : "Text"}
                          </span>
                        </div>
                        <p className="mt-2 line-clamp-6 whitespace-pre-wrap text-[10px] leading-5 text-slate-500">
                          {chunk.content}
                        </p>
                      </article>
                    ))
                  )}
                </div>
              </div>
            )}

            <div className="mt-4 rounded-xl border border-white/[0.05] bg-white/[0.015] p-3">
              <p className="text-[8px] font-medium tracking-[0.12em] text-slate-700 uppercase">
                Re-index behavior
              </p>
              <p className="mt-1.5 text-[9px] leading-4 text-slate-600">
                Re-index refreshes embeddings from the stored chunks. The
                original file is not re-read in v1.1.
              </p>
            </div>
          </aside>
        </div>
      </section>
    </div>
  );
}
