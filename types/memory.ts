export const MEMORY_CATEGORIES = [
  "identity",
  "preference",
  "response_style",
  "interest",
  "custom",
] as const;

export type MemoryCategory = (typeof MEMORY_CATEGORIES)[number];

export interface NaraMemory {
  id: string;
  category: MemoryCategory;
  content: string;
  isEnabled: boolean;
  createdAt: string;
  updatedAt: string;
}
