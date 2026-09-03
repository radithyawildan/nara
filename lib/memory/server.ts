import { getSupabaseServerClient } from "@/lib/supabase/server";

interface EnabledMemoryRow {
  category: string;
  content: string;
}

export async function getMemoryContext() {
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
    .select("category,content")
    .eq("is_enabled", true)
    .order("updated_at", {
      ascending: false,
    })
    .limit(20);

  if (error) {
    console.warn("[NARA] Failed to load memory context:", error);

    return "";
  }

  const memories = (data ?? []) as EnabledMemoryRow[];

  if (memories.length === 0) {
    return "";
  }

  const formatted = memories
    .map((memory) => `- [${memory.category}] ${memory.content}`)
    .join("\n");

  return `
The user has explicitly saved the following long-term memories.

Use them only when relevant.
Do not mention that they came from a database unless the user asks.
Do not invent additional memories.
If a current user instruction conflicts with a saved memory, follow the current instruction.

Saved memories:
${formatted}
`.trim();
}
