import { extractText, getDocumentProxy } from "unpdf";

import {
  chunkKnowledgePages,
  type KnowledgePage,
} from "@/lib/knowledge/chunking";
import {
  embedKnowledgeDocuments,
  getKnowledgeEmbeddingModel,
} from "@/lib/knowledge/embedding";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import type { KnowledgeDocument } from "@/types/knowledge";

export const runtime = "nodejs";

const MAX_FILE_SIZE = 8 * 1024 * 1024;
const MAX_CHARACTERS = 220_000;
const MAX_CHUNKS = 180;
const EMBEDDING_BATCH_SIZE = 20;

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

function sanitizeFilename(value: string) {
  const cleaned = value.replace(/[^a-zA-Z0-9._()\- ]+/g, "_").trim();
  return cleaned || "document";
}

function getFileKind(file: File) {
  const extension = file.name.split(".").pop()?.toLowerCase();

  if (file.type === "application/pdf" || extension === "pdf") {
    return "pdf" as const;
  }

  if (
    file.type === "text/plain" ||
    file.type === "text/markdown" ||
    extension === "txt" ||
    extension === "md" ||
    extension === "markdown"
  ) {
    return "text" as const;
  }

  return null;
}

async function extractPages(file: File): Promise<KnowledgePage[]> {
  const kind = getFileKind(file);

  if (!kind) {
    throw new Error("Only PDF, TXT, and Markdown files are supported.");
  }

  if (kind === "text") {
    return [
      {
        pageNumber: null,
        text: await file.text(),
      },
    ];
  }

  const bytes = new Uint8Array(await file.arrayBuffer());
  const pdf = await getDocumentProxy(bytes);
  const result = await extractText(pdf, { mergePages: false });
  const pageTexts = Array.isArray(result.text) ? result.text : [result.text];

  return pageTexts.map((text, index) => ({
    pageNumber: index + 1,
    text,
  }));
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

  const formData = await request.formData();
  const value = formData.get("file");

  if (!(value instanceof File)) {
    return Response.json({ error: "A file is required." }, { status: 400 });
  }

  if (value.size <= 0) {
    return Response.json(
      { error: "The uploaded file is empty." },
      { status: 400 },
    );
  }

  if (value.size > MAX_FILE_SIZE) {
    return Response.json(
      { error: "The file is too large. Maximum size is 8 MB." },
      { status: 413 },
    );
  }

  const kind = getFileKind(value);

  if (!kind) {
    return Response.json(
      { error: "Only PDF, TXT, and Markdown files are supported." },
      { status: 415 },
    );
  }

  let pages: KnowledgePage[];

  try {
    pages = await extractPages(value);
  } catch (error) {
    console.error("[NARA] Knowledge text extraction failed:", error);
    return Response.json(
      { error: "Could not extract readable text from this document." },
      { status: 422 },
    );
  }

  const characterCount = pages.reduce(
    (total, page) => total + page.text.length,
    0,
  );

  if (characterCount === 0) {
    return Response.json(
      { error: "No readable text was found in this document." },
      { status: 422 },
    );
  }

  if (characterCount > MAX_CHARACTERS) {
    return Response.json(
      {
        error:
          "This document contains too much text for Knowledge v1. Keep it below roughly 220,000 characters.",
      },
      { status: 413 },
    );
  }

  const chunks = chunkKnowledgePages(pages);

  if (chunks.length === 0) {
    return Response.json(
      { error: "No indexable text chunks were created." },
      { status: 422 },
    );
  }

  if (chunks.length > MAX_CHUNKS) {
    return Response.json(
      {
        error: `This document creates too many chunks (${chunks.length}/${MAX_CHUNKS}).`,
      },
      { status: 413 },
    );
  }

  const filename = sanitizeFilename(value.name);
  const mimeType =
    value.type || (kind === "pdf" ? "application/pdf" : "text/plain");

  const { data: insertedDocument, error: insertDocumentError } = await supabase
    .from("knowledge_documents")
    .insert({
      user_id: authData.user.id,
      filename,
      mime_type: mimeType,
      size_bytes: value.size,
      status: "processing",
      page_count: pages.length,
      chunk_count: 0,
      character_count: characterCount,
    })
    .select(
      "id,filename,mime_type,size_bytes,status,page_count,chunk_count,character_count,error_message,created_at,updated_at",
    )
    .single();

  if (insertDocumentError || !insertedDocument) {
    console.error(
      "[NARA] Could not create knowledge document:",
      insertDocumentError,
    );
    return Response.json(
      { error: "Could not create the knowledge document." },
      { status: 500 },
    );
  }

  const document = insertedDocument as KnowledgeDocumentRow;

  try {
    for (let start = 0; start < chunks.length; start += EMBEDDING_BATCH_SIZE) {
      const batch = chunks.slice(start, start + EMBEDDING_BATCH_SIZE);
      const embeddings = await embedKnowledgeDocuments(
        batch.map((chunk) => chunk.content),
      );

      const rows = batch.map((chunk, index) => ({
        document_id: document.id,
        user_id: authData.user.id,
        chunk_index: chunk.chunkIndex,
        page_number: chunk.pageNumber,
        content: chunk.content,
        embedding: embeddings[index],
        embedding_model: getKnowledgeEmbeddingModel(),
      }));

      const { error: insertChunkError } = await supabase
        .from("knowledge_chunks")
        .insert(rows);

      if (insertChunkError) {
        throw insertChunkError;
      }
    }

    const { data: readyDocument, error: updateError } = await supabase
      .from("knowledge_documents")
      .update({
        status: "ready",
        chunk_count: chunks.length,
        error_message: null,
        updated_at: new Date().toISOString(),
      })
      .eq("id", document.id)
      .select(
        "id,filename,mime_type,size_bytes,status,page_count,chunk_count,character_count,error_message,created_at,updated_at",
      )
      .single();

    if (updateError || !readyDocument) {
      throw (
        updateError ?? new Error("Knowledge document update returned no row.")
      );
    }

    return Response.json({
      document: mapDocument(readyDocument as KnowledgeDocumentRow),
    });
  } catch (error) {
    console.error("[NARA] Knowledge indexing failed:", error);

    const message =
      error instanceof Error ? error.message : "Knowledge indexing failed.";

    await supabase
      .from("knowledge_documents")
      .update({
        status: "error",
        error_message: message.slice(0, 500),
        updated_at: new Date().toISOString(),
      })
      .eq("id", document.id);

    return Response.json(
      { error: "The document was uploaded, but indexing failed." },
      { status: 502 },
    );
  }
}
