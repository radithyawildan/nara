export type MessageRole = "user" | "assistant" | "system";

export type ChatMessageRole = Exclude<MessageRole, "system">;

export interface ConversationMessage {
  id: string;
  role: ChatMessageRole;
  content: string;
  createdAt: string;
}

export interface ChatMessage {
  role: ChatMessageRole;
  content: string;
}
