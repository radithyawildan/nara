import type { ChatMessage } from "@/types/conversation";

export interface AIStreamOptions {
  signal?: AbortSignal;
}

export interface AIProvider {
  readonly id: string;

  stream(
    messages: ChatMessage[],
    options?: AIStreamOptions,
  ): AsyncIterable<string>;
}
