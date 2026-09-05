import { z } from "zod";

import {
  embedMemoryDocument,
  getMemoryEmbeddingModel,
} from "@/lib/memory/embedding";

import { getSupabaseServerClient } from "@/lib/supabase/server";

import type { MemoryCategory } from "@/types/memory";

const requestSchema = z.object({
  memoryId: z.string().uuid(),
});

interface MemoryRow {
  id: string;
  category: MemoryCategory;
  content: string;
}

export async function POST(request: Request) {
  const supabase = await getSupabaseServerClient();

  if (!supabase) {
    return Response.json(
      {
        error: "Supabase is unavailable.",
      },
      {
        status: 503,
      },
    );
  }

  let payload: unknown;

  try {
    payload = await request.json();
  } catch {
    return Response.json(
      {
        error: "Invalid JSON body.",
      },
      {
        status: 400,
      },
    );
  }

  const parsed = requestSchema.safeParse(payload);

  if (!parsed.success) {
    return Response.json(
      {
        error: "Invalid memory id.",
      },
      {
        status: 400,
      },
    );
  }

  const { data: authData, error: authError } = await supabase.auth.getUser();

  if (authError || !authData.user) {
    return Response.json(
      {
        error: "Authentication required.",
      },
      {
        status: 401,
      },
    );
  }

  const { data, error } = await supabase
    .from("memories")
    .select("id,category,content")
    .eq("id", parsed.data.memoryId)
    .single();

  if (error || !data) {
    return Response.json(
      {
        error: "Memory not found.",
      },
      {
        status: 404,
      },
    );
  }

  const memory = data as MemoryRow;

  try {
    const embedding = await embedMemoryDocument(
      memory.content,
      memory.category,
    );

    const { error: updateError } = await supabase
      .from("memories")
      .update({
        embedding,
        embedding_model: getMemoryEmbeddingModel(),
        embedding_updated_at: new Date().toISOString(),
      })
      .eq("id", memory.id);

    if (updateError) {
      throw updateError;
    }

    return Response.json({
      ok: true,
    });
  } catch (error) {
    console.error("[NARA] Memory embedding failed:", error);

    return Response.json(
      {
        error: error instanceof Error ? error.message : "Embedding failed.",
      },
      {
        status: 502,
      },
    );
  }
}
