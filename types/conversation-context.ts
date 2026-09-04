export interface ConversationTopicState {
  currentTopic: string | null;
  lockedDecisions: string[];
  openLoops: string[];
  userGoals: string[];
}

export interface PersistedConversationContext {
  summary: string;
  messageCount: number;
  updatedAt: string | null;
  topicState: ConversationTopicState;
}

export interface ConversationContextDebug {
  conversationId: string;
  summaryAvailable: boolean;
  summaryMessageCount: number;
  summaryUpdatedAt: string | null;
  summaryPreview: string;
  topicState: ConversationTopicState;
}
