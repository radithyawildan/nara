import { embedMemoryQuery } from "@/lib/memory/embedding";

import { rankRelevantMemories } from "@/lib/memory/retrieval";

import { getSupabaseServerClient } from "@/lib/supabase/server";

import type { MemoryRetrievalDebug } from "@/types/memory-debug";

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

export interface MemoryContextResult {
  context: string;
  debug: MemoryRetrievalDebug;
}

function createEmptyDebug(
  query: string,
  semanticAvailable = true,
): MemoryRetrievalDebug {
  return {
    query,

    totalEnabledMemories: 0,
    lexicalCandidateCount: 0,
    semanticCandidateCount: 0,
    selectedCount: 0,

    semanticAvailable,

    selected: [],
  };
}

export async function getMemoryContext(
  query: string,
): Promise<MemoryContextResult> {
  const supabase = await getSupabaseServerClient();

  if (!supabase) {
    return {
      context: "",
      debug: createEmptyDebug(query, false),
    };
  }

  const { data: authData, error: authError } = await supabase.auth.getUser();

  if (authError || !authData.user) {
    return {
      context: "",
      debug: createEmptyDebug(query, false),
    };
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

    return {
      context: "",
      debug: createEmptyDebug(query, false),
    };
  }

  const memories = ((data ?? []) as EnabledMemoryRow[]).map((memory) => ({
    id: memory.id,

    category: memory.category,

    content: memory.content,

    updatedAt: memory.updated_at,
  }));

  const debug = createEmptyDebug(query);

  debug.totalEnabledMemories = memories.length;

  if (memories.length === 0) {
    return {
      context: "",
      debug,
    };
  }

  const lexical = rankRelevantMemories(query, memories, 8);

  debug.lexicalCandidateCount = lexical.length;

  let semantic: SemanticMemoryRow[] = [];

  let semanticAvailable = true;

  try {
    if (query.trim()) {
      const queryEmbedding = await embedMemoryQuery(query);

      const {
        data: semanticData,

        error: semanticError,
      } = await supabase.rpc("match_memories", {
        query_embedding: queryEmbedding,

        match_threshold: 0.45,

        match_count: 8,
      });

      if (semanticError) {
        throw semanticError;
      }

      semantic = (semanticData ?? []) as SemanticMemoryRow[];
    }
  } catch (error) {
    semanticAvailable = false;

    console.warn(
      "[NARA] Semantic memory retrieval unavailable; using lexical fallback:",
      error,
    );
  }

  debug.semanticAvailable = semanticAvailable;

  debug.semanticCandidateCount = semantic.length;

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

      if (!existing.reasons.includes("semantic match")) {
        existing.reasons.push("semantic match");
      }

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

  debug.selectedCount = relevantMemories.length;

  debug.selected = relevantMemories.map((memory) => ({
    id: memory.id,

    category: memory.category,

    content: memory.content,

    score: Number(memory.score.toFixed(3)),

    lexicalScore: Number(memory.lexicalScore.toFixed(3)),

    semanticScore: Number(memory.semanticScore.toFixed(3)),

    reasons: memory.reasons,
  }));

  if (process.env.NODE_ENV === "development") {
    console.log("[NARA] Hybrid memory retrieval:", debug);
  }

  if (relevantMemories.length === 0) {
    return {
      context: "",
      debug,
    };
  }

  const formatted = relevantMemories
    .map((memory) => `- [${memory.category}] ${memory.content}`)
    .join("\n");

  const context = `
The following are relevant long-term memories explicitly saved by the user.

Use them only when relevant to the current request.
Do not mention the memory system or database unless asked.
Never invent memories that are not listed here.
A current user instruction always overrides a saved memory.

Relevant memories:
${formatted}
`.trim();

  return {
    context,
    debug,
  };
}
