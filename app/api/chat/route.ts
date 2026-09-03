import { z } from "zod";

import { streamConversation } from "@/lib/ai/orchestrator";
import { getAIProvider } from "@/lib/ai/provider-factory";

const requestSchema = z.object({
  messages: z
    .array(
      z.object({
        role: z.enum(["user", "assistant"]),
        content: z.string().trim().min(1).max(8_000),
      }),
    )
    .min(1)
    .max(40),
});

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
        error: "Invalid conversation payload.",
      },
      {
        status: 400,
      },
    );
  }

  let provider;

  try {
    provider = getAIProvider();
  } catch (error) {
    console.error("[NARA] Provider configuration error:", error);

    return Response.json(
      {
        error: "AI provider is not configured correctly.",
      },
      {
        status: 500,
      },
    );
  }

  const encoder = new TextEncoder();

  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      try {
        const response = streamConversation(provider, result.data.messages, {
          signal: request.signal,
        });

        for await (const chunk of response) {
          controller.enqueue(encoder.encode(chunk));
        }

        controller.close();
      } catch (error) {
        if (request.signal.aborted) {
          controller.close();
          return;
        }

        console.error("[NARA] Conversation stream failed:", error);
        controller.error(error);
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "no-cache, no-store",
    },
  });
}
