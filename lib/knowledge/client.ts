"use client";

import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import type {
  KnowledgeChunkPreview,
  KnowledgeDocument,
} from "@/types/knowledge";

interface KnowledgeDocumentRow {
  id: string;
  filename: string;
  mime_type: string;
  size_bytes: number;
  status: "processing" | "ready" | "error";
  page_count: number;
  chunk_count: number;
  character_count: number;
  error_message: string | null;
  storage_path: string | null;
  created_at: string;
  updated_at: string;
}

interface KnowledgeChunkRow {
  id: string;
  document_id: string;
  page_number: number | null;
  chunk_index: number;
  content: string;
}

interface KnowledgeMutationResponse {
  document?: KnowledgeDocument;
  error?: string;
}

function mapDocument(row: KnowledgeDocumentRow): KnowledgeDocument {
  return {
    id: row.id,
    filename: row.filename,
    mimeType: row.mime_type,
    sizeBytes: row.size_bytes,
    status: row.status,
    pageCount: row.page_count,
    chunkCount: row.chunk_count,
    characterCount: row.character_count,
    errorMessage: row.error_message,
    hasOriginalFile: Boolean(row.storage_path),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function mapChunk(row: KnowledgeChunkRow): KnowledgeChunkPreview {
  return {
    id: row.id,
    documentId: row.document_id,
    pageNumber: row.page_number,
    chunkIndex: row.chunk_index,
    content: row.content,
  };
}

async function ensureKnowledgeUser() {
  const supabase = getSupabaseBrowserClient();

  if (!supabase) {
    throw new Error("Supabase is not configured.");
  }

  const { data: sessionData, error: sessionError } =
    await supabase.auth.getSession();

  if (sessionError) {
    throw sessionError;
  }

  if (sessionData.session?.user) {
    return supabase;
  }

  const { data, error } = await supabase.auth.signInAnonymously();

  if (error) {
    throw error;
  }

  if (!data.user && !data.session?.user) {
    throw new Error("Anonymous authentication failed.");
  }

  return supabase;
}

async function getErrorMessage(response: Response) {
  const payload = (await response.json().catch(() => null)) as {
    error?: string;
  } | null;

  return payload?.error ?? `Request failed with status ${response.status}.`;
}

export async function listKnowledgeDocuments() {
  const supabase = await ensureKnowledgeUser();

  const { data, error } = await supabase
    .from("knowledge_documents")
    .select(
      "id,filename,mime_type,size_bytes,status,page_count,chunk_count,character_count,error_message,storage_path,created_at,updated_at",
    )
    .order("updated_at", {
      ascending: false,
    })
    .limit(50);

  if (error) {
    throw error;
  }

  return ((data ?? []) as KnowledgeDocumentRow[]).map(mapDocument);
}

export async function uploadKnowledgeDocument(file: File) {
  await ensureKnowledgeUser();

  const formData = new FormData();
  formData.set("file", file);

  const response = await fetch("/api/knowledge/upload", {
    method: "POST",
    body: formData,
  });

  if (!response.ok) {
    throw new Error(await getErrorMessage(response));
  }

  const payload = (await response.json()) as KnowledgeMutationResponse;

  if (!payload.document) {
    throw new Error("Knowledge upload did not return a document.");
  }

  return payload.document;
}

export async function deleteKnowledgeDocument(documentId: string) {
  await ensureKnowledgeUser();

  const response = await fetch("/api/knowledge/delete", {
    method: "DELETE",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ documentId }),
  });

  if (!response.ok) {
    throw new Error(await getErrorMessage(response));
  }
}

export async function getKnowledgeOriginalFileUrl(documentId: string) {
  await ensureKnowledgeUser();

  const response = await fetch(
    `/api/knowledge/file?documentId=${encodeURIComponent(documentId)}`,
    {
      method: "GET",
      cache: "no-store",
    },
  );

  if (!response.ok) {
    throw new Error(await getErrorMessage(response));
  }

  const payload = (await response.json()) as {
    url?: string;
  };

  if (!payload.url) {
    throw new Error("Knowledge file URL was not returned.");
  }

  return payload.url;
}

export async function reindexKnowledgeDocument(documentId: string) {
  await ensureKnowledgeUser();

  const response = await fetch("/api/knowledge/reindex", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ documentId }),
  });

  if (!response.ok) {
    throw new Error(await getErrorMessage(response));
  }

  const payload = (await response.json()) as KnowledgeMutationResponse;

  if (!payload.document) {
    throw new Error("Knowledge re-indexing did not return a document.");
  }

  return payload.document;
}

export async function listKnowledgeDocumentChunks(
  documentId: string,
  limit = 12,
) {
  const supabase = await ensureKnowledgeUser();

  const { data, error } = await supabase
    .from("knowledge_chunks")
    .select("id,document_id,page_number,chunk_index,content")
    .eq("document_id", documentId)
    .order("chunk_index", {
      ascending: true,
    })
    .limit(Math.min(Math.max(limit, 1), 30));

  if (error) {
    throw error;
  }

  return ((data ?? []) as KnowledgeChunkRow[]).map(mapChunk);
}

export async function getKnowledgeChunkPreview(chunkId: string) {
  const supabase = await ensureKnowledgeUser();

  const { data, error } = await supabase
    .from("knowledge_chunks")
    .select("id,document_id,page_number,chunk_index,content")
    .eq("id", chunkId)
    .single();

  if (error) {
    throw error;
  }

  return mapChunk(data as KnowledgeChunkRow);
}
