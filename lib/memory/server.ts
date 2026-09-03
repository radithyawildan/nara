import { embedMemoryQuery } from "@/lib/memory/embedding";

import { rankRelevantMemories } from "@/lib/memory/retrieval";

import { getSupabaseServerClient } from "@/lib/supabase/server";

import type { MemoryCategory } from "@/types/memory";

interface EnabledMemoryRow {
  id: string;
  category: MemoryCategory;
  content: string;
  updated_at: string;
}

interface SemanticMemoryRow {
  id: string;
  category: MemoryCategory;
  content: string;
  updated_at: string;
  similarity: number;
}

interface HybridMemory {
  id: string;
  category: MemoryCategory;
  content: string;
  updatedAt: string;
  lexicalScore: number;
  semanticScore: number;
  score: number;
  reasons: string[];
}

export async function getMemoryContext(query: string) {
  const supabase = await getSupabaseServerClient();

  if (!supabase) {
    return "";
  }

  const { data: authData, error: authError } = await supabase.auth.getUser();

  if (authError || !authData.user) {
    return "";
  }

  const { data, error } = await supabase
    .from("memories")
    .select("id,category,content,updated_at")
    .eq("is_enabled", true)
    .order("updated_at", {
      ascending: false,
    })
    .limit(50);

  if (error) {
    console.warn("[NARA] Failed to load memories:", error);

    return "";
  }

  const memories = ((data ?? []) as EnabledMemoryRow[]).map((memory) => ({
    id: memory.id,
    category: memory.category,
    content: memory.content,
    updatedAt: memory.updated_at,
  }));

  if (memories.length === 0) {
    return "";
  }

  const lexical = rankRelevantMemories(query, memories, 8);

  let semantic: SemanticMemoryRow[] = [];

  try {
    if (query.trim()) {
      const queryEmbedding = await embedMemoryQuery(query);

      const { data: semanticData, error: semanticError } = await supabase.rpc(
        "match_memories",
        {
          query_embedding: queryEmbedding,
          match_threshold: 0.45,
          match_count: 8,
        },
      );

      if (semanticError) {
        throw semanticError;
      }

      semantic = (semanticData ?? []) as SemanticMemoryRow[];
    }
  } catch (error) {
    console.warn(
      "[NARA] Semantic memory retrieval unavailable; using lexical fallback:",
      error,
    );
  }

  const combined = new Map<string, HybridMemory>();

  for (const memory of lexical) {
    combined.set(memory.id, {
      id: memory.id,
      category: memory.category,
      content: memory.content,
      updatedAt: memory.updatedAt ?? "",
      lexicalScore: memory.score,
      semanticScore: 0,
      score: memory.score,
      reasons: [...memory.reasons],
    });
  }

  for (const memory of semantic) {
    const existing = combined.get(memory.id);

    const semanticScore = Math.max(0, memory.similarity);

    if (existing) {
      existing.semanticScore = semanticScore;

      existing.score = existing.lexicalScore + semanticScore * 6;

      existing.reasons.push("semantic match");

      continue;
    }

    combined.set(memory.id, {
      id: memory.id,
      category: memory.category,
      content: memory.content,
      updatedAt: memory.updated_at,
      lexicalScore: 0,
      semanticScore,
      score: semanticScore * 6,
      reasons: ["semantic match"],
    });
  }

  const relevantMemories = [...combined.values()]
    .sort((left, right) => right.score - left.score)
    .slice(0, 6);

  if (relevantMemories.length === 0) {
    return "";
  }

  if (process.env.NODE_ENV === "development") {
    console.log(
      "[NARA] Hybrid memory retrieval:",
      relevantMemories.map((memory) => ({
        category: memory.category,

        score: Number(memory.score.toFixed(2)),

        lexical: Number(memory.lexicalScore.toFixed(2)),

        semantic: Number(memory.semanticScore.toFixed(3)),

        reasons: memory.reasons,

        content: memory.content,
      })),
    );
  }

  const formatted = relevantMemories
    .map((memory) => `- [${memory.category}] ${memory.content}`)
    .join("\n");

  return `
The following are relevant long-term memories explicitly saved by the user.

Use them only when relevant to the current request.
Do not mention the memory system or database unless asked.
Never invent memories that are not listed here.
A current user instruction always overrides a saved memory.

Relevant memories:
${formatted}
`.trim();
}
