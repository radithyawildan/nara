import { z } from "zod";

import {
  embedKnowledgeDocuments,
  getKnowledgeEmbeddingModel,
} from "@/lib/knowledge/embedding";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import type { KnowledgeDocument } from "@/types/knowledge";

export const runtime = "nodejs";

const EMBEDDING_BATCH_SIZE = 20;

const requestSchema = z.object({
  documentId: z.string().uuid(),
});

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

interface KnowledgeChunkRow {
  id: string;
  document_id: string;
  user_id: string;
  chunk_index: number;
  page_number: number | null;
  content: string;
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

export async function POST(request: Request) {
  const supabase = await getSupabaseServerClient();

  if (!supabase) {
    return Response.json(
      { error: "Supabase is unavailable." },
      { status: 503 },
    );
  }

  const { data: authData, error: authError } = await supabase.auth.getUser();

  if (authError || !authData.user) {
    return Response.json({ error: "Unauthorized." }, { status: 401 });
  }

  let body: unknown;

  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const result = requestSchema.safeParse(body);

  if (!result.success) {
    return Response.json({ error: "Invalid document id." }, { status: 400 });
  }

  const { data: documentData, error: documentError } = await supabase
    .from("knowledge_documents")
    .select(
      "id,filename,mime_type,size_bytes,status,page_count,chunk_count,character_count,error_message,created_at,updated_at",
    )
    .eq("id", result.data.documentId)
    .single();

  if (documentError || !documentData) {
    return Response.json(
      { error: "Knowledge document not found." },
      { status: 404 },
    );
  }

  const { data: chunkData, error: chunkError } = await supabase
    .from("knowledge_chunks")
    .select("id,document_id,user_id,chunk_index,page_number,content")
    .eq("document_id", result.data.documentId)
    .order("chunk_index", { ascending: true });

  if (chunkError) {
    console.error(
      "[NARA] Could not load knowledge chunks for re-indexing:",
      chunkError,
    );
    return Response.json(
      { error: "Could not load stored knowledge chunks." },
      { status: 500 },
    );
  }

  const chunks = (chunkData ?? []) as KnowledgeChunkRow[];

  if (chunks.length === 0) {
    return Response.json(
      { error: "This document has no stored chunks to re-index." },
      { status: 422 },
    );
  }

  await supabase
    .from("knowledge_documents")
    .update({
      status: "processing",
      error_message: null,
      updated_at: new Date().toISOString(),
    })
    .eq("id", result.data.documentId);

  try {
    for (let start = 0; start < chunks.length; start += EMBEDDING_BATCH_SIZE) {
      const batch = chunks.slice(start, start + EMBEDDING_BATCH_SIZE);
      const embeddings = await embedKnowledgeDocuments(
        batch.map((chunk) => chunk.content),
      );

      const now = new Date().toISOString();
      const rows = batch.map((chunk, index) => ({
        id: chunk.id,
        document_id: chunk.document_id,
        user_id: chunk.user_id,
        chunk_index: chunk.chunk_index,
        page_number: chunk.page_number,
        content: chunk.content,
        embedding: embeddings[index],
        embedding_model: getKnowledgeEmbeddingModel(),
        embedding_updated_at: now,
      }));

      const { error: upsertError } = await supabase
        .from("knowledge_chunks")
        .upsert(rows, {
          onConflict: "document_id,chunk_index",
        });

      if (upsertError) {
        throw upsertError;
      }
    }

    const { data: readyDocument, error: readyError } = await supabase
      .from("knowledge_documents")
      .update({
        status: "ready",
        chunk_count: chunks.length,
        error_message: null,
        updated_at: new Date().toISOString(),
      })
      .eq("id", result.data.documentId)
      .select(
        "id,filename,mime_type,size_bytes,status,page_count,chunk_count,character_count,error_message,created_at,updated_at",
      )
      .single();

    if (readyError || !readyDocument) {
      throw (
        readyError ?? new Error("Re-indexed document update returned no row.")
      );
    }

    return Response.json({
      document: mapDocument(readyDocument as KnowledgeDocumentRow),
    });
  } catch (error) {
    console.error("[NARA] Knowledge re-indexing failed:", error);

    await supabase
      .from("knowledge_documents")
      .update({
        status: "error",
        error_message:
          error instanceof Error
            ? error.message.slice(0, 500)
            : "Knowledge re-indexing failed.",
        updated_at: new Date().toISOString(),
      })
      .eq("id", result.data.documentId);

    return Response.json(
      { error: "The document could not be re-indexed." },
      { status: 502 },
    );
  }
}
