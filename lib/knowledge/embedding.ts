import { GoogleGenAI } from "@google/genai";

const EMBEDDING_DIMENSION = 768;

function getEmbeddingClient() {
  const apiKey = process.env.GEMINI_API_KEY;

  if (!apiKey) {
    throw new Error("GEMINI_API_KEY is not configured.");
  }

  return new GoogleGenAI({ apiKey });
}

export function getKnowledgeEmbeddingModel() {
  return process.env.GEMINI_EMBEDDING_MODEL ?? "gemini-embedding-2";
}

function validateEmbedding(values: number[] | undefined) {
  if (!values || values.length !== EMBEDDING_DIMENSION) {
    throw new Error(
      `Knowledge embedding must contain ${EMBEDDING_DIMENSION} dimensions.`,
    );
  }

  return values;
}

export async function embedKnowledgeDocuments(contents: string[]) {
  if (contents.length === 0) {
    return [];
  }

  const ai = getEmbeddingClient();
  const response = await ai.models.embedContent({
    model: getKnowledgeEmbeddingModel(),
    contents,
    config: {
      outputDimensionality: EMBEDDING_DIMENSION,
      taskType: "RETRIEVAL_DOCUMENT",
    },
  });

  const embeddings = response.embeddings ?? [];

  if (embeddings.length !== contents.length) {
    throw new Error(
      "Gemini returned an unexpected number of knowledge embeddings.",
    );
  }

  return embeddings.map((embedding) => validateEmbedding(embedding.values));
}

export async function embedKnowledgeQuery(query: string) {
  const ai = getEmbeddingClient();
  const response = await ai.models.embedContent({
    model: getKnowledgeEmbeddingModel(),
    contents: query,
    config: {
      outputDimensionality: EMBEDDING_DIMENSION,
      taskType: "RETRIEVAL_QUERY",
    },
  });

  return validateEmbedding(response.embeddings?.[0]?.values);
}
