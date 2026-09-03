import { rankRelevantMemories } from "@/lib/memory/retrieval";

import { getSupabaseServerClient } from "@/lib/supabase/server";

import type { MemoryCategory } from "@/types/memory";

interface EnabledMemoryRow {
  id: string;
  category: MemoryCategory;
  content: string;
  updated_at: string;
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
    console.warn("[NARA] Failed to load memory context:", error);

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

  const relevantMemories = rankRelevantMemories(query, memories, 6);

  if (relevantMemories.length === 0) {
    return "";
  }

  if (process.env.NODE_ENV === "development") {
    console.log(
      "[NARA] Memory retrieval:",
      relevantMemories.map((memory) => ({
        category: memory.category,
        score: Number(memory.score.toFixed(2)),
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
