import { z } from "zod";

import { getSupabaseServerClient } from "@/lib/supabase/server";
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

const deleteSchema = z.object({
  documentId: z.string().uuid(),
});

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

async function getAuthenticatedSupabase() {
  const supabase = await getSupabaseServerClient();

  if (!supabase) {
    return null;
  }

  const { data, error } = await supabase.auth.getUser();

  if (error || !data.user) {
    return null;
  }

  return supabase;
}

export async function GET() {
  const supabase = await getAuthenticatedSupabase();

  if (!supabase) {
    return Response.json({ error: "Unauthorized." }, { status: 401 });
  }

  const { data, error } = await supabase
    .from("knowledge_documents")
    .select(
      "id,filename,mime_type,size_bytes,status,page_count,chunk_count,character_count,error_message,created_at,updated_at",
    )
    .order("updated_at", { ascending: false })
    .limit(50);

  if (error) {
    console.error("[NARA] Could not list knowledge documents:", error);
    return Response.json(
      { error: "Could not load knowledge documents." },
      { status: 500 },
    );
  }

  return Response.json({
    documents: ((data ?? []) as KnowledgeDocumentRow[]).map(mapDocument),
  });
}

export async function DELETE(request: Request) {
  const supabase = await getAuthenticatedSupabase();

  if (!supabase) {
    return Response.json({ error: "Unauthorized." }, { status: 401 });
  }

  let body: unknown;

  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const result = deleteSchema.safeParse(body);

  if (!result.success) {
    return Response.json({ error: "Invalid document id." }, { status: 400 });
  }

  const { error } = await supabase
    .from("knowledge_documents")
    .delete()
    .eq("id", result.data.documentId);

  if (error) {
    console.error("[NARA] Could not delete knowledge document:", error);
    return Response.json(
      { error: "Could not delete knowledge document." },
      { status: 500 },
    );
  }

  return Response.json({ ok: true });
}
