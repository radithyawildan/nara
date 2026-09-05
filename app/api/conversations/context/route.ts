import { getConversationContextDebug } from "@/lib/conversations/context-server";

export async function GET(request: Request) {
  if (process.env.NODE_ENV !== "development") {
    return Response.json(
      {
        error: "Not found.",
      },
      {
        status: 404,
      },
    );
  }

  const url = new URL(request.url);
  const conversationId = url.searchParams.get("conversationId")?.trim();

  if (!conversationId) {
    return Response.json(
      {
        error: "conversationId is required.",
      },
      {
        status: 400,
      },
    );
  }

  const context = await getConversationContextDebug(conversationId);

  if (!context) {
    return Response.json(
      {
        error: "Conversation context not found.",
      },
      {
        status: 404,
      },
    );
  }

  return Response.json(context);
}
