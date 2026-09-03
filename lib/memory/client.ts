"use client";

import { getSupabaseBrowserClient } from "@/lib/supabase/client";

import type { MemoryCategory, NaraMemory } from "@/types/memory";

interface MemoryRow {
  id: string;
  category: MemoryCategory;
  content: string;
  is_enabled: boolean;

  embedding_model: string | null;

  embedding_updated_at: string | null;

  created_at: string;
  updated_at: string;
}

interface UpdateMemoryInput {
  content?: string;
  category?: MemoryCategory;
  isEnabled?: boolean;
}

export interface MemoryBackfillResult {
  processed: number;
  failed: number;
  remaining: number;
}

function mapMemory(row: MemoryRow): NaraMemory {
  return {
    id: row.id,
    category: row.category,
    content: row.content,

    isEnabled: row.is_enabled,

    semanticReady: Boolean(row.embedding_model && row.embedding_updated_at),

    embeddingModel: row.embedding_model,

    embeddingUpdatedAt: row.embedding_updated_at,

    createdAt: row.created_at,

    updatedAt: row.updated_at,
  };
}

async function getUserId() {
  const supabase = getSupabaseBrowserClient();

  if (!supabase) {
    return null;
  }

  const { data, error } = await supabase.auth.getUser();

  if (error) {
    throw error;
  }

  return data.user?.id ?? null;
}

async function refreshMemoryEmbedding(memoryId: string) {
  try {
    const response = await fetch("/api/memory/embed", {
      method: "POST",

      headers: {
        "Content-Type": "application/json",
      },

      body: JSON.stringify({
        memoryId,
      }),
    });

    if (!response.ok) {
      const payload = (await response.json().catch(() => null)) as {
        error?: string;
      } | null;

      console.warn(
        "[NARA] Memory saved but embedding refresh failed:",
        payload?.error ?? response.status,
      );
    }
  } catch (error) {
    console.warn("[NARA] Memory saved but embedding refresh failed:", error);
  }
}

export async function backfillMemoryEmbeddings(): Promise<MemoryBackfillResult> {
  let processed = 0;
  let failed = 0;
  let remaining = 0;

  /*
   * Backfill in small batches.
   *
   * This avoids sending a large burst of
   * embedding requests if the user has
   * accumulated many memories.
   */
  for (let round = 0; round < 5; round += 1) {
    const response = await fetch("/api/memory/backfill", {
      method: "POST",
    });

    if (!response.ok) {
      const payload = (await response.json().catch(() => null)) as {
        error?: string;
      } | null;

      throw new Error(payload?.error ?? "Memory embedding backfill failed.");
    }

    const payload = (await response.json()) as {
      processed: number;
      failed: number;
      remaining: number;
    };

    processed += payload.processed;

    failed += payload.failed;

    remaining = payload.remaining;

    if (remaining === 0 || payload.failed > 0) {
      break;
    }
  }

  return {
    processed,
    failed,
    remaining,
  };
}

export async function listMemories() {
  const supabase = getSupabaseBrowserClient();

  if (!supabase) {
    return [];
  }

  const { data, error } = await supabase
    .from("memories")
    .select(
      "id,category,content,is_enabled,embedding_model,embedding_updated_at,created_at,updated_at",
    )
    .order("updated_at", {
      ascending: false,
    });

  if (error) {
    throw error;
  }

  return ((data ?? []) as MemoryRow[]).map(mapMemory);
}

export async function createMemory(
  content: string,
  category: MemoryCategory = "custom",
) {
  const normalizedContent = content.trim();

  if (!normalizedContent) {
    throw new Error("Memory content cannot be empty.");
  }

  const supabase = getSupabaseBrowserClient();

  if (!supabase) {
    return null;
  }

  const userId = await getUserId();

  if (!userId) {
    throw new Error("No authenticated NARA user is available.");
  }

  const { data, error } = await supabase
    .from("memories")
    .insert({
      user_id: userId,
      category,
      content: normalizedContent,
    })
    .select(
      "id,category,content,is_enabled,embedding_model,embedding_updated_at,created_at,updated_at",
    )
    .single();

  if (error) {
    throw error;
  }

  const memory = mapMemory(data as MemoryRow);

  void refreshMemoryEmbedding(memory.id);

  return memory;
}

export async function updateMemory(memoryId: string, input: UpdateMemoryInput) {
  const supabase = getSupabaseBrowserClient();

  if (!supabase) {
    return null;
  }

  const updates: {
    content?: string;
    category?: MemoryCategory;
    is_enabled?: boolean;
    updated_at: string;

    embedding?: null;

    embedding_model?: null;

    embedding_updated_at?: null;
  } = {
    updated_at: new Date().toISOString(),
  };

  let semanticContentChanged = false;

  if (input.content !== undefined) {
    const normalizedContent = input.content.trim();

    if (!normalizedContent) {
      throw new Error("Memory content cannot be empty.");
    }

    updates.content = normalizedContent;

    semanticContentChanged = true;
  }

  if (input.category !== undefined) {
    updates.category = input.category;

    semanticContentChanged = true;
  }

  if (input.isEnabled !== undefined) {
    updates.is_enabled = input.isEnabled;
  }

  if (semanticContentChanged) {
    updates.embedding = null;

    updates.embedding_model = null;

    updates.embedding_updated_at = null;
  }

  const { data, error } = await supabase
    .from("memories")
    .update(updates)
    .eq("id", memoryId)
    .select(
      "id,category,content,is_enabled,embedding_model,embedding_updated_at,created_at,updated_at",
    )
    .single();

  if (error) {
    throw error;
  }

  const memory = mapMemory(data as MemoryRow);

  if (semanticContentChanged) {
    void refreshMemoryEmbedding(memory.id);
  }

  return memory;
}

export async function deleteMemory(memoryId: string) {
  const supabase = getSupabaseBrowserClient();

  if (!supabase) {
    return;
  }

  const { error } = await supabase.from("memories").delete().eq("id", memoryId);

  if (error) {
    throw error;
  }
}
