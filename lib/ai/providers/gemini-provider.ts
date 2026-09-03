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
    const response = await this.client.models.generateContentStream({
      model: this.model,
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
  }
}
