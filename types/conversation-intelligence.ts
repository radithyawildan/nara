export interface ConversationCompactionStats {
  originalMessages: number;
  deliveredMessages: number;
  summarizedMessages: number;
  estimatedOriginalTokens: number;
  estimatedDeliveredTokens: number;
  compacted: boolean;
}

export interface ConversationContextResult<TMessage> {
  messages: TMessage[];
  summaryInstructions?: string;
  stats: ConversationCompactionStats;
}
