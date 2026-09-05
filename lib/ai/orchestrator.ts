import type { AIProvider, AIStreamOptions } from "@/lib/ai/provider";
import { compactConversationContext } from "@/lib/conversations/intelligence";
import type { ChatMessage } from "@/types/conversation";

export function streamConversation(
  provider: AIProvider,
  messages: ChatMessage[],
  options?: AIStreamOptions,
) {
  const context = compactConversationContext(messages);

  const additionalInstructions = [
    options?.additionalInstructions,
    context.summaryInstructions,
  ]
    .filter((value): value is string => Boolean(value))
    .join("\n\n");

  if (process.env.NODE_ENV === "development" && context.stats.compacted) {
    console.log("[NARA] Conversation context compacted:", context.stats);
  }

  return provider.stream(context.messages, {
    ...options,
    additionalInstructions: additionalInstructions || undefined,
  });
}
