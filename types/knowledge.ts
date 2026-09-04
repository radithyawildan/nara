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

export interface KnowledgeRetrievalDebug {
  query: string;
  threshold: number;
  selectedCount: number;
  semanticAvailable: boolean;
  sources: KnowledgeCitation[];
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
