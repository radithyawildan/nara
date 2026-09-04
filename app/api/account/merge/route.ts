import { z } from "zod";

import {
  createSupabaseCredentialVerifier,
  getSupabaseAdminClient,
} from "@/lib/account/admin";
import { getSupabaseServerClient } from "@/lib/supabase/server";

const requestSchema = z.object({
  email: z.string().trim().email(),
  password: z.string().min(1),
  confirmation: z.literal("MERGE"),
  mode: z.enum(["merge", "discard"]).default("merge"),
});

interface KnowledgeStorageRow {
  id: string;
  storage_path: string | null;
}

interface StorageMove {
  from: string;
  to: string;
}

function createTargetStoragePath(
  sourcePath: string,
  sourceUserId: string,
  targetUserId: string,
  documentId: string,
) {
  const segments = sourcePath.split("/").filter(Boolean);

  if (segments.length === 0) {
    return `${targetUserId}/${documentId}/document`;
  }

  if (segments[0] === sourceUserId) {
    segments[0] = targetUserId;
    return segments.join("/");
  }

  return `${targetUserId}/${segments.join("/")}`;
}

async function rollbackStorageMoves(moves: StorageMove[]) {
  if (moves.length === 0) {
    return;
  }

  const admin = getSupabaseAdminClient();

  for (const move of [...moves].reverse()) {
    const { error } = await admin.storage
      .from("knowledge-files")
      .move(move.to, move.from);

    if (error) {
      console.error("[NARA] Storage merge rollback failed:", error);
    }
  }
}

export async function POST(request: Request) {
  let body: unknown;

  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const parsed = requestSchema.safeParse(body);

  if (!parsed.success) {
    return Response.json(
      { error: "Valid merge credentials are required." },
      { status: 400 },
    );
  }

  try {
    const sourceClient = await getSupabaseServerClient();

    if (!sourceClient) {
      return Response.json(
        { error: "Supabase is unavailable." },
        { status: 503 },
      );
    }

    const { data: sourceAuth, error: sourceAuthError } =
      await sourceClient.auth.getUser();

    if (sourceAuthError || !sourceAuth.user) {
      return Response.json({ error: "Unauthorized." }, { status: 401 });
    }

    if (!sourceAuth.user.is_anonymous) {
      return Response.json(
        { error: "Only a temporary NARA account can be merged." },
        { status: 409 },
      );
    }

    const verifier = createSupabaseCredentialVerifier();
    const { data: targetAuth, error: targetAuthError } =
      await verifier.auth.signInWithPassword({
        email: parsed.data.email.toLowerCase(),
        password: parsed.data.password,
      });

    if (
      targetAuthError ||
      !targetAuth.user ||
      !targetAuth.session ||
      !targetAuth.session.access_token ||
      !targetAuth.session.refresh_token
    ) {
      return Response.json(
        { error: "The destination account credentials are invalid." },
        { status: 401 },
      );
    }

    if (targetAuth.user.is_anonymous) {
      return Response.json(
        { error: "The destination must be a persistent account." },
        { status: 409 },
      );
    }

    const sourceUserId = sourceAuth.user.id;
    const targetUserId = targetAuth.user.id;

    if (sourceUserId === targetUserId) {
      return Response.json(
        { error: "Source and destination accounts are identical." },
        { status: 409 },
      );
    }

    const admin = getSupabaseAdminClient();

    const { data: storageRows, error: storageQueryError } = await admin
      .from("knowledge_documents")
      .select("id,storage_path")
      .eq("user_id", sourceUserId);

    if (storageQueryError) {
      console.error(
        "[NARA] Could not inspect source knowledge files:",
        storageQueryError,
      );
      return Response.json(
        { error: "Could not prepare temporary account data." },
        { status: 500 },
      );
    }

    const documents = (storageRows ?? []) as KnowledgeStorageRow[];

    if (parsed.data.mode === "discard") {
      const paths = documents
        .map((document) => document.storage_path)
        .filter((path): path is string => Boolean(path));

      if (paths.length > 0) {
        const { error: storageDeleteError } = await admin.storage
          .from("knowledge-files")
          .remove(paths);

        if (storageDeleteError) {
          console.error(
            "[NARA] Could not remove discarded temporary files:",
            storageDeleteError,
          );

          return Response.json(
            { error: "Could not safely discard temporary knowledge files." },
            { status: 500 },
          );
        }
      }

      const { error: dataDeleteError } = await admin.rpc(
        "delete_nara_account_data",
        {
          target_user_id: sourceUserId,
        },
      );

      if (dataDeleteError) {
        console.error(
          "[NARA] Temporary data deletion failed:",
          dataDeleteError,
        );
        return Response.json(
          { error: "Could not discard the temporary NARA data." },
          { status: 500 },
        );
      }

      const { error: sourceDeleteError } =
        await admin.auth.admin.deleteUser(sourceUserId);

      if (sourceDeleteError) {
        console.warn(
          "[NARA] Temporary auth identity cleanup failed after data deletion:",
          sourceDeleteError,
        );
      }

      return Response.json({
        mode: "discard",
        accessToken: targetAuth.session.access_token,
        refreshToken: targetAuth.session.refresh_token,
      });
    }

    const completedMoves: StorageMove[] = [];
    const storagePathMap: Record<string, string> = {};

    for (const document of documents) {
      if (!document.storage_path) {
        continue;
      }

      const targetPath = createTargetStoragePath(
        document.storage_path,
        sourceUserId,
        targetUserId,
        document.id,
      );

      if (targetPath === document.storage_path) {
        storagePathMap[document.id] = targetPath;
        continue;
      }

      const { error: moveError } = await admin.storage
        .from("knowledge-files")
        .move(document.storage_path, targetPath);

      if (moveError) {
        console.error(
          "[NARA] Knowledge file ownership move failed:",
          moveError,
        );
        await rollbackStorageMoves(completedMoves);

        return Response.json(
          { error: "Could not safely transfer temporary knowledge files." },
          { status: 500 },
        );
      }

      completedMoves.push({
        from: document.storage_path,
        to: targetPath,
      });

      storagePathMap[document.id] = targetPath;
    }

    const { data: mergeResult, error: mergeError } = await admin.rpc(
      "merge_anonymous_account_data",
      {
        source_user_id: sourceUserId,
        target_user_id: targetUserId,
        storage_path_map: storagePathMap,
      },
    );

    if (mergeError) {
      console.error("[NARA] Account data merge failed:", mergeError);
      await rollbackStorageMoves(completedMoves);

      return Response.json(
        { error: "Could not merge the temporary NARA data." },
        { status: 500 },
      );
    }

    const { error: sourceDeleteError } =
      await admin.auth.admin.deleteUser(sourceUserId);

    if (sourceDeleteError) {
      console.warn(
        "[NARA] Source anonymous identity cleanup failed after merge:",
        sourceDeleteError,
      );
    }

    return Response.json({
      mode: "merge",
      accessToken: targetAuth.session.access_token,
      refreshToken: targetAuth.session.refresh_token,
      result: mergeResult,
      cleanupWarning: sourceDeleteError
        ? "Temporary auth identity cleanup should be retried later."
        : null,
    });
  } catch (error) {
    console.error("[NARA] Account merge route failed:", error);

    return Response.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Account merge is unavailable.",
      },
      { status: 500 },
    );
  }
}
