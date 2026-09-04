"use client";

import { getSupabaseBrowserClient } from "@/lib/supabase/client";

import type { KnowledgeDocument } from "@/types/knowledge";

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
  created_at: string;
  updated_at: string;
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
    createdAt: row.created_at,
    updatedAt: row.updated_at,
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
      "id,filename,mime_type,size_bytes,status,page_count,chunk_count,character_count,error_message,created_at,updated_at",
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
  /*
   * Ensure the anonymous session exists
   * before hitting the server route so
   * Supabase SSR receives the auth cookie.
   */
  await ensureKnowledgeUser();

  const formData = new FormData();

  formData.set("file", file);

  let response: Response;

  try {
    response = await fetch("/api/knowledge/upload", {
      method: "POST",
      body: formData,
    });
  } catch (error) {
    console.error("[NARA] Knowledge upload API unreachable:", error);

    throw new Error("Could not reach the Knowledge upload API.");
  }

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
  const supabase = await ensureKnowledgeUser();

  /*
   * Deleting the document also removes its
   * chunks through ON DELETE CASCADE.
   */
  const { error } = await supabase
    .from("knowledge_documents")
    .delete()
    .eq("id", documentId);

  if (error) {
    throw error;
  }
}
