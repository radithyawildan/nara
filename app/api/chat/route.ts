import { z } from "zod";

import { streamConversation } from "@/lib/ai/orchestrator";

import { getAIProvider } from "@/lib/ai/provider-factory";

import { getMemoryContext } from "@/lib/memory/server";

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

function getErrorMessage(error: unknown) {
  if (error instanceof Error) {
    return error.message;
  }

  return "Unknown AI provider error.";
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
        error: getErrorMessage(error),
      },
      {
        status: 500,
      },
    );
  }

  try {
    const memoryContext = await getMemoryContext();

    const conversation = streamConversation(provider, result.data.messages, {
      signal: request.signal,

      additionalInstructions: memoryContext || undefined,
    });

    const iterator = conversation[Symbol.asyncIterator]();

    const first = await iterator.next();

    if (first.done) {
      return Response.json(
        {
          error: "AI provider returned an empty response.",
        },
        {
          status: 502,
        },
      );
    }

    const encoder = new TextEncoder();

    const stream = new ReadableStream<Uint8Array>({
      async start(controller) {
        try {
          controller.enqueue(encoder.encode(first.value));

          while (true) {
            const next = await iterator.next();

            if (next.done) {
              break;
            }

            controller.enqueue(encoder.encode(next.value));
          }

          controller.close();
        } catch (error) {
          console.error(
            "[NARA] Conversation stream failed after start:",
            error,
          );

          controller.close();
        }
      },

      async cancel() {
        if (iterator.return) {
          await iterator.return();
        }
      },
    });

    return new Response(stream, {
      headers: {
        "Content-Type": "text/plain; charset=utf-8",

        "Cache-Control": "no-cache, no-store",
      },
    });
  } catch (error) {
    console.error("[NARA] Conversation provider failed:", error);

    return Response.json(
      {
        error: getErrorMessage(error),
      },
      {
        status: 502,
      },
    );
  }
}
