import { z } from "zod";

import { buildRollingConversationState } from "@/lib/conversations/rolling-summary";
import { getSupabaseServerClient } from "@/lib/supabase/server";

import type { ChatMessage } from "@/types/conversation";

const requestSchema = z.object({
  conversationId: z.string().uuid(),
  force: z.boolean().optional(),
});

const MIN_MESSAGES_BETWEEN_REFRESH = 8;
const MAX_MESSAGES_FOR_SUMMARY = 160;

interface ConversationRow {
  id: string;
  context_summary: string | null;
  context_summary_message_count: number | null;
}

interface MessageRow {
  role: "user" | "assistant";
  content: string;
}

export async function POST(request: Request) {
  let body: unknown;

  try {
    body = await request.json();
  } catch {
    return Response.json(
      {
        error: "Invalid JSON body.",
      },
      {
        status: 400,
      },
    );
  }

  const result = requestSchema.safeParse(body);

  if (!result.success) {
    return Response.json(
      {
        error: "Invalid conversation context payload.",
      },
      {
        status: 400,
      },
    );
  }

  const supabase = await getSupabaseServerClient();

  if (!supabase) {
    return Response.json(
      {
        error: "Supabase is not configured.",
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

  const { data: conversationData, error: conversationError } = await supabase
    .from("conversations")
    .select("id,context_summary,context_summary_message_count")
    .eq("id", result.data.conversationId)
    .maybeSingle();

  if (conversationError) {
    return Response.json(
      {
        error: conversationError.message,
      },
      {
        status: 500,
      },
    );
  }

  const conversation = conversationData as ConversationRow | null;

  if (!conversation) {
    return Response.json(
      {
        error: "Conversation not found.",
      },
      {
        status: 404,
      },
    );
  }

  const { data: messageData, error: messageError } = await supabase
    .from("messages")
    .select("role,content,created_at")
    .eq("conversation_id", result.data.conversationId)
    .order("created_at", {
      ascending: true,
    })
    .limit(MAX_MESSAGES_FOR_SUMMARY);

  if (messageError) {
    return Response.json(
      {
        error: messageError.message,
      },
      {
        status: 500,
      },
    );
  }

  const messages = ((messageData ?? []) as MessageRow[]).map(
    (message): ChatMessage => ({
      role: message.role,
      content: message.content,
    }),
  );

  const previousCount = conversation.context_summary_message_count ?? 0;
  const newMessages = Math.max(0, messages.length - previousCount);

  if (
    !result.data.force &&
    conversation.context_summary &&
    newMessages < MIN_MESSAGES_BETWEEN_REFRESH
  ) {
    return Response.json({
      refreshed: false,
      reason: "threshold",
      messageCount: messages.length,
      previousMessageCount: previousCount,
      nextRefreshIn: MIN_MESSAGES_BETWEEN_REFRESH - newMessages,
    });
  }

  if (messages.length < 2) {
    return Response.json({
      refreshed: false,
      reason: "not-enough-messages",
      messageCount: messages.length,
    });
  }

  const state = await buildRollingConversationState(
    messages,
    conversation.context_summary,
  );

  const timestamp = new Date().toISOString();

  const { error: updateError } = await supabase
    .from("conversations")
    .update({
      context_summary: state.summary,
      context_summary_message_count: messages.length,
      context_summary_updated_at: timestamp,
      topic_state: state.topicState,
    })
    .eq("id", result.data.conversationId);

  if (updateError) {
    return Response.json(
      {
        error: updateError.message,
      },
      {
        status: 500,
      },
    );
  }

  if (process.env.NODE_ENV === "development") {
    console.log("[NARA] Persistent conversation context refreshed:", {
      conversationId: result.data.conversationId,
      messageCount: messages.length,
      source: state.source,
      topic: state.topicState.currentTopic,
    });
  }

  return Response.json({
    refreshed: true,
    messageCount: messages.length,
    source: state.source,
    updatedAt: timestamp,
    topicState: state.topicState,
  });
}
