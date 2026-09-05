import { GoogleGenAI } from "@google/genai";

import type { MemoryCategory } from "@/types/memory";

const EMBEDDING_DIMENSION = 768;

function getEmbeddingClient() {
  const apiKey = process.env.GEMINI_API_KEY;

  if (!apiKey) {
    throw new Error("GEMINI_API_KEY is not configured.");
  }

  return new GoogleGenAI({
    apiKey,
  });
}

function getEmbeddingModel() {
  return process.env.GEMINI_EMBEDDING_MODEL ?? "gemini-embedding-2";
}

function prepareMemoryDocument(content: string, category: MemoryCategory) {
  return `title: NARA ${category} memory | text: ${content}`;
}

function prepareMemoryQuery(query: string) {
  return `task: search result | query: ${query}`;
}

async function embed(content: string) {
  const ai = getEmbeddingClient();

  const response = await ai.models.embedContent({
    model: getEmbeddingModel(),

    contents: content,

    config: {
      outputDimensionality: EMBEDDING_DIMENSION,
    },
  });

  const values = response.embeddings?.[0]?.values;

  if (!values || values.length !== EMBEDDING_DIMENSION) {
    throw new Error(
      `Gemini returned an invalid embedding dimension. Expected ${EMBEDDING_DIMENSION}, received ${values?.length ?? 0}.`,
    );
  }

  return values;
}

export function getMemoryEmbeddingModel() {
  return getEmbeddingModel();
}

export async function embedMemoryDocument(
  content: string,
  category: MemoryCategory,
) {
  return embed(prepareMemoryDocument(content, category));
}

export async function embedMemoryQuery(query: string) {
  return embed(prepareMemoryQuery(query));
}
