import { z } from "zod";

import {
  createSupabaseCredentialVerifier,
  getSupabaseAdminClient,
} from "@/lib/account/admin";
import { getSupabaseServerClient } from "@/lib/supabase/server";

const requestSchema = z.object({
  confirmation: z.literal("DELETE"),
  password: z.string().optional().default(""),
});

interface KnowledgeStorageRow {
  storage_path: string | null;
}

export async function DELETE(request: Request) {
  let body: unknown;

  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const parsed = requestSchema.safeParse(body);

  if (!parsed.success) {
    return Response.json(
      { error: "Type DELETE to confirm account deletion." },
      { status: 400 },
    );
  }

  try {
    const userClient = await getSupabaseServerClient();

    if (!userClient) {
      return Response.json(
        { error: "Supabase is unavailable." },
        { status: 503 },
      );
    }

    const { data: authData, error: authError } =
      await userClient.auth.getUser();

    if (authError || !authData.user) {
      return Response.json({ error: "Unauthorized." }, { status: 401 });
    }

    const user = authData.user;

    if (!user.is_anonymous) {
      if (!user.email || !parsed.data.password) {
        return Response.json(
          { error: "Your current password is required." },
          { status: 400 },
        );
      }

      const verifier = createSupabaseCredentialVerifier();
      const { data: verified, error: verifyError } =
        await verifier.auth.signInWithPassword({
          email: user.email,
          password: parsed.data.password,
        });

      if (verifyError || verified.user?.id !== user.id) {
        return Response.json(
          { error: "The current password is incorrect." },
          { status: 401 },
        );
      }
    }

    const admin = getSupabaseAdminClient();

    const { data: storageRows, error: storageQueryError } = await admin
      .from("knowledge_documents")
      .select("storage_path")
      .eq("user_id", user.id);

    if (storageQueryError) {
      console.error(
        "[NARA] Account file cleanup inspection failed:",
        storageQueryError,
      );
      return Response.json(
        { error: "Could not prepare account deletion." },
        { status: 500 },
      );
    }

    const paths = ((storageRows ?? []) as KnowledgeStorageRow[])
      .map((row) => row.storage_path)
      .filter((path): path is string => Boolean(path));

    if (paths.length > 0) {
      const { error: storageDeleteError } = await admin.storage
        .from("knowledge-files")
        .remove(paths);

      if (storageDeleteError) {
        console.error(
          "[NARA] Account knowledge file cleanup failed:",
          storageDeleteError,
        );
        return Response.json(
          { error: "Could not safely remove private knowledge files." },
          { status: 500 },
        );
      }
    }

    const { data: deletionResult, error: dataDeleteError } = await admin.rpc(
      "delete_nara_account_data",
      {
        target_user_id: user.id,
      },
    );

    if (dataDeleteError) {
      console.error("[NARA] Account data cleanup failed:", dataDeleteError);
      return Response.json(
        { error: "Could not remove NARA account data." },
        { status: 500 },
      );
    }

    const { error: deleteUserError } = await admin.auth.admin.deleteUser(
      user.id,
    );

    if (deleteUserError) {
      console.error("[NARA] Auth account deletion failed:", deleteUserError);
      return Response.json(
        {
          error:
            "Account data was removed, but the authentication identity could not be deleted. Retry the deletion once more.",
        },
        { status: 500 },
      );
    }

    return Response.json({
      ok: true,
      result: deletionResult,
    });
  } catch (error) {
    console.error("[NARA] Account deletion route failed:", error);

    return Response.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Account deletion is unavailable.",
      },
      { status: 500 },
    );
  }
}
