import { GoogleGenAI, type Content } from "@google/genai";

import type { AIProvider, AIStreamOptions } from "@/lib/ai/provider";
import type { ChatMessage } from "@/types/conversation";

interface GeminiProviderOptions {
  apiKey: string;
  model: string;
}

const NARA_INSTRUCTIONS = `
You are NARA, short for Neural Adaptive Responsive Avatar.

You are a friendly, thoughtful, and concise conversational AI assistant.

Guidelines:
- Respond naturally and helpfully.
- Match the user's language whenever practical.
- Keep responses conversational rather than robotic.
- Be concise unless the user asks for detail.
- Never pretend to have capabilities that are not actually available.
`;

const FALLBACK_MODEL = "gemini-3.5-flash-lite";
const MAX_RETRIES = 2;

function buildContents(messages: ChatMessage[]): Content[] {
  return messages.map((message) => ({
    role: message.role === "assistant" ? "model" : "user",
    parts: [
      {
        text: message.content,
      },
    ],
  }));
}

function getStatus(error: unknown) {
  if (
    typeof error === "object" &&
    error !== null &&
    "status" in error &&
    typeof error.status === "number"
  ) {
    return error.status;
  }

  return undefined;
}

function isRetryable(error: unknown) {
  const status = getStatus(error);

  return status === 429 || status === 500 || status === 502 || status === 503;
}

async function wait(milliseconds: number, signal?: AbortSignal) {
  if (signal?.aborted) {
    throw new DOMException("Request aborted", "AbortError");
  }

  await new Promise<void>((resolve, reject) => {
    const timeout = windowOrNodeSetTimeout(resolve, milliseconds);

    if (!signal) {
      return;
    }

    const handleAbort = () => {
      clearTimeout(timeout);

      reject(new DOMException("Request aborted", "AbortError"));
    };

    signal.addEventListener("abort", handleAbort, {
      once: true,
    });
  });
}

function windowOrNodeSetTimeout(callback: () => void, milliseconds: number) {
  return setTimeout(callback, milliseconds);
}

export class GeminiProvider implements AIProvider {
  readonly id = "gemini";

  private readonly client: GoogleGenAI;
  private readonly model: string;

  constructor(options: GeminiProviderOptions) {
    this.client = new GoogleGenAI({
      apiKey: options.apiKey,
    });

    this.model = options.model;
  }

  async *stream(
    messages: ChatMessage[],
    options?: AIStreamOptions,
  ): AsyncIterable<string> {
    const models = Array.from(new Set([this.model, FALLBACK_MODEL]));

    let lastError: unknown;

    for (const model of models) {
      for (let attempt = 0; attempt <= MAX_RETRIES; attempt += 1) {
        try {
          console.info(
            `[NARA] Gemini request using ${model}, attempt ${attempt + 1}.`,
          );

          const response = await this.client.models.generateContentStream({
            model,
            contents: buildContents(messages),
            config: {
              systemInstruction: NARA_INSTRUCTIONS,
              abortSignal: options?.signal,
            },
          });

          for await (const chunk of response) {
            if (chunk.text) {
              yield chunk.text;
            }
          }

          return;
        } catch (error) {
          lastError = error;

          if (options?.signal?.aborted || !isRetryable(error)) {
            throw error;
          }

          const isLastAttempt = attempt === MAX_RETRIES;

          if (isLastAttempt) {
            console.warn(
              `[NARA] Gemini model ${model} unavailable. Trying fallback if available.`,
            );

            break;
          }

          const delay = 750 * 2 ** attempt;

          console.warn(
            `[NARA] Gemini ${model} temporarily unavailable. Retrying in ${delay}ms.`,
          );

          await wait(delay, options?.signal);
        }
      }
    }

    throw lastError instanceof Error
      ? lastError
      : new Error("All Gemini models are currently unavailable.");
  }
}
