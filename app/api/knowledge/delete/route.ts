import { z } from "zod";

import { getSupabaseServerClient } from "@/lib/supabase/server";

const requestSchema = z.object({
  documentId: z.string().uuid(),
});

export async function DELETE(request: Request) {
  let body: unknown;

  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const result = requestSchema.safeParse(body);

  if (!result.success) {
    return Response.json(
      { error: "A valid documentId is required." },
      { status: 400 },
    );
  }

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

  const { data, error } = await supabase
    .from("knowledge_documents")
    .select("id,storage_path")
    .eq("id", result.data.documentId)
    .single();

  if (error || !data) {
    return Response.json(
      { error: "Knowledge document was not found." },
      { status: 404 },
    );
  }

  if (data.storage_path) {
    const { error: storageError } = await supabase.storage
      .from("knowledge-files")
      .remove([data.storage_path]);

    if (storageError) {
      console.warn("[NARA] Knowledge file cleanup failed:", storageError);
    }
  }

  const { error: deleteError } = await supabase
    .from("knowledge_documents")
    .delete()
    .eq("id", result.data.documentId);

  if (deleteError) {
    console.error("[NARA] Knowledge document deletion failed:", deleteError);
    return Response.json(
      { error: "Could not delete the knowledge document." },
      { status: 500 },
    );
  }

  return Response.json({ ok: true });
}
