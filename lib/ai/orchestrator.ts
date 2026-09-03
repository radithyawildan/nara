import type { AIProvider, AIStreamOptions } from "@/lib/ai/provider";
import type { ChatMessage } from "@/types/conversation";

export function streamConversation(
  provider: AIProvider,
  messages: ChatMessage[],
  options?: AIStreamOptions,
) {
  return provider.stream(messages, options);
}
