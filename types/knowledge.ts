export type KnowledgeDocumentStatus = "processing" | "ready" | "error";

export interface KnowledgeDocument {
  id: string;
  filename: string;
  mimeType: string;
  sizeBytes: number;
  status: KnowledgeDocumentStatus;
  pageCount: number;
  chunkCount: number;
  characterCount: number;
  errorMessage: string | null;
  hasOriginalFile?: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface KnowledgeSource {
  id: string;
  chunkId: string;
  documentId: string;
  filename: string;
  pageNumber: number | null;
  chunkIndex: number;
  content: string;
  similarity: number;
}

export interface KnowledgeCitation {
  id: string;
  chunkId: string;
  documentId: string;
  filename: string;
  pageNumber: number | null;
  chunkIndex: number;
  similarity: number;
}

export interface KnowledgeRetrievalDebugSource extends KnowledgeCitation {
  rankScore: number;
  redundancy: number;
  reasons: string[];
}

export interface KnowledgeRetrievalDebug {
  query: string;
  threshold: number;
  candidateCount: number;
  selectedCount: number;
  uniqueDocumentCount: number;
  perDocumentLimit: number;
  duplicateCount: number;
  semanticAvailable: boolean;
  sources: KnowledgeRetrievalDebugSource[];
}

export interface KnowledgeContextResult {
  context: string;
  sources: KnowledgeSource[];
  debug: KnowledgeRetrievalDebug;
}

export interface KnowledgeChunkPreview {
  id: string;
  documentId: string;
  pageNumber: number | null;
  chunkIndex: number;
  content: string;
}
