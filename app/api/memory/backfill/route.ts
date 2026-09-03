import {
  embedMemoryDocument,
  getMemoryEmbeddingModel,
} from "@/lib/memory/embedding";

import { getSupabaseServerClient } from "@/lib/supabase/server";

import type { MemoryCategory } from "@/types/memory";

const BATCH_SIZE = 5;

interface MemoryBackfillRow {
  id: string;
  category: MemoryCategory;
  content: string;

  embedding_model: string | null;
}

export async function POST() {
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

  const model = getMemoryEmbeddingModel();

  const { data, error } = await supabase
    .from("memories")
    .select("id,category,content,embedding_model")
    .order("updated_at", {
      ascending: false,
    })
    .limit(200);

  if (error) {
    console.error("[NARA] Could not inspect memories for backfill:", error);

    return Response.json(
      {
        error: "Could not inspect memory embeddings.",
      },
      {
        status: 500,
      },
    );
  }

  const staleMemories = ((data ?? []) as MemoryBackfillRow[]).filter(
    (memory) => memory.embedding_model !== model,
  );

  if (staleMemories.length === 0) {
    return Response.json({
      processed: 0,
      failed: 0,
      remaining: 0,
    });
  }

  const batch = staleMemories.slice(0, BATCH_SIZE);

  let processed = 0;
  let failed = 0;

  for (const memory of batch) {
    try {
      const embedding = await embedMemoryDocument(
        memory.content,
        memory.category,
      );

      const { error: updateError } = await supabase
        .from("memories")
        .update({
          embedding,

          embedding_model: model,

          embedding_updated_at: new Date().toISOString(),
        })
        .eq("id", memory.id);

      if (updateError) {
        throw updateError;
      }

      processed += 1;
    } catch (error) {
      failed += 1;

      console.warn(`[NARA] Could not backfill memory ${memory.id}:`, error);
    }
  }

  return Response.json({
    processed,
    failed,

    remaining: Math.max(0, staleMemories.length - processed),
  });
}
