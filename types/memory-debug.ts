import type { MemoryCategory } from "@/types/memory";

export interface MemoryRetrievalDebugItem {
  id: string;
  category: MemoryCategory;
  content: string;

  score: number;
  lexicalScore: number;
  semanticScore: number;

  reasons: string[];
}

export interface MemoryRetrievalDebug {
  query: string;

  totalEnabledMemories: number;
  lexicalCandidateCount: number;
  semanticCandidateCount: number;
  selectedCount: number;

  semanticAvailable: boolean;

  selected: MemoryRetrievalDebugItem[];
}
