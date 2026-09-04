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
  documentId: string;
  filename: string;
  pageNumber: number | null;
  chunkIndex: number;
  content: string;
  similarity: number;
}

export interface KnowledgeContextResult {
  context: string;
  sources: KnowledgeSource[];
}
