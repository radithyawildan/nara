import OpenAI from "openai";

import type { AIProvider, AIStreamOptions } from "@/lib/ai/provider";
import type { ChatMessage } from "@/types/conversation";

interface OpenAIProviderOptions {
  apiKey: string;
  model: string;
}

const NARA_INSTRUCTIONS = `
You are NARA, short for Neural Adaptive Responsive Avatar.

You are a friendly, thoughtful, concise conversational AI assistant.
Respond naturally and helpfully.
Do not pretend to have capabilities that are not available.
`;

function buildConversationInput(messages: ChatMessage[]) {
  return messages
    .map((message) => {
      const speaker = message.role === "user" ? "USER" : "NARA";

      return `${speaker}: ${message.content}`;
    })
    .join("\n\n");
}

export class OpenAIProvider implements AIProvider {
  readonly id = "openai";

  private readonly client: OpenAI;
  private readonly model: string;

  constructor(options: OpenAIProviderOptions) {
    this.client = new OpenAI({
      apiKey: options.apiKey,
    });

    this.model = options.model;
  }

  async *stream(
    messages: ChatMessage[],
    options?: AIStreamOptions,
  ): AsyncIterable<string> {
    const stream = await this.client.responses.create(
      {
        model: this.model,
        instructions: [NARA_INSTRUCTIONS, options?.additionalInstructions]
          .filter(Boolean)
          .join("\n\n"),
        input: buildConversationInput(messages),
        stream: true,
      },
      {
        signal: options?.signal,
      },
    );

    for await (const event of stream) {
      if (event.type === "response.output_text.delta") {
        yield event.delta;
      }
    }
  }
}
