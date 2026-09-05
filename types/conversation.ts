import type { KnowledgeCitation } from "@/types/knowledge";

export type MessageRole = "user" | "assistant" | "system";

export type ChatMessageRole = Exclude<MessageRole, "system">;

export interface ConversationMessage {
  id: string;
  role: ChatMessageRole;
  content: string;
  createdAt: string;
  knowledgeCitations?: KnowledgeCitation[];
}

export interface ChatMessage {
  role: ChatMessageRole;
  content: string;
}

export interface ConversationSummary {
  id: string;
  title: string;
  createdAt: string;
  updatedAt: string;
}
