import { z } from "zod";

import { getSupabaseServerClient } from "@/lib/supabase/server";

const querySchema = z.string().uuid();

export async function GET(request: Request) {
  const url = new URL(request.url);
  const parsedId = querySchema.safeParse(url.searchParams.get("documentId"));

  if (!parsedId.success) {
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
    .select("id,filename,mime_type,storage_path")
    .eq("id", parsedId.data)
    .single();

  if (error || !data) {
    return Response.json(
      { error: "Knowledge document was not found." },
      { status: 404 },
    );
  }

  if (!data.storage_path) {
    return Response.json(
      {
        error:
          "The original file is unavailable because this document was indexed before file storage was enabled. Re-upload it to enable original-file access.",
      },
      { status: 404 },
    );
  }

  const { data: signedData, error: signedError } = await supabase.storage
    .from("knowledge-files")
    .createSignedUrl(data.storage_path, 60);

  if (signedError || !signedData?.signedUrl) {
    console.error("[NARA] Could not create knowledge file URL:", signedError);
    return Response.json(
      { error: "Could not open the original file." },
      { status: 502 },
    );
  }

  return Response.json({
    url: signedData.signedUrl,
    filename: data.filename,
    mimeType: data.mime_type,
  });
}
