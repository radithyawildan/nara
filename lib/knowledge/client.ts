"use client";

import type { KnowledgeDocument } from "@/types/knowledge";

interface KnowledgeListResponse {
  documents?: KnowledgeDocument[];
  error?: string;
}

interface KnowledgeMutationResponse {
  document?: KnowledgeDocument;
  error?: string;
}

async function getErrorMessage(response: Response) {
  const payload = (await response.json().catch(() => null)) as {
    error?: string;
  } | null;

  return payload?.error ?? `Request failed with status ${response.status}.`;
}

export async function listKnowledgeDocuments() {
  const response = await fetch("/api/knowledge", {
    method: "GET",
    cache: "no-store",
  });

  if (!response.ok) {
    throw new Error(await getErrorMessage(response));
  }

  const payload = (await response.json()) as KnowledgeListResponse;

  return payload.documents ?? [];
}

export async function uploadKnowledgeDocument(file: File) {
  const formData = new FormData();
  formData.set("file", file);

  const response = await fetch("/api/knowledge/upload", {
    method: "POST",
    body: formData,
  });

  if (!response.ok) {
    throw new Error(await getErrorMessage(response));
  }

  const payload = (await response.json()) as KnowledgeMutationResponse;

  if (!payload.document) {
    throw new Error("Knowledge upload did not return a document.");
  }

  return payload.document;
}

export async function deleteKnowledgeDocument(documentId: string) {
  const response = await fetch("/api/knowledge", {
    method: "DELETE",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ documentId }),
  });

  if (!response.ok) {
    throw new Error(await getErrorMessage(response));
  }
}
