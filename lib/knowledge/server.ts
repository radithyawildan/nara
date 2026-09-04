import { embedKnowledgeQuery } from "@/lib/knowledge/embedding";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import type {
  KnowledgeContextResult,
  KnowledgeSource,
} from "@/types/knowledge";

interface KnowledgeMatchRow {
  chunk_id: string;
  document_id: string;
  filename: string;
  page_number: number | null;
  chunk_index: number;
  content: string;
  similarity: number;
}

export async function getKnowledgeContext(
  query: string,
): Promise<KnowledgeContextResult> {
  const normalizedQuery = query.trim();

  if (!normalizedQuery) {
    return {
      context: "",
      sources: [],
    };
  }

  try {
    const supabase = await getSupabaseServerClient();

    if (!supabase) {
      return {
        context: "",
        sources: [],
      };
    }

    const { data: authData, error: authError } = await supabase.auth.getUser();

    if (authError || !authData.user) {
      return {
        context: "",
        sources: [],
      };
    }

    const queryEmbedding = await embedKnowledgeQuery(normalizedQuery);

    const { data, error } = await supabase.rpc("match_knowledge_chunks", {
      query_embedding: queryEmbedding,
      match_threshold: 0.42,
      match_count: 6,
    });

    if (error) {
      throw error;
    }

    const sources = ((data ?? []) as KnowledgeMatchRow[]).map(
      (row, index): KnowledgeSource => ({
        id: `K${index + 1}`,
        documentId: row.document_id,
        filename: row.filename,
        pageNumber: row.page_number,
        chunkIndex: row.chunk_index,
        content: row.content,
        similarity: row.similarity,
      }),
    );

    if (sources.length === 0) {
      return {
        context: "",
        sources: [],
      };
    }

    const formattedSources = sources
      .map((source) => {
        const location = source.pageNumber
          ? `${source.filename}, page ${source.pageNumber}`
          : source.filename;

        return `[${source.id}] ${location}\n${source.content}`;
      })
      .join("\n\n");

    const context = `
The user has uploaded private knowledge sources that may be relevant to the current request.

Rules for using these sources:
- Use a source only when it is relevant to the current question.
- When you use information from a source, cite it inline with its exact marker, such as [K1].
- Never invent source markers or cite a source that is not listed below.
- Prefer the uploaded sources over unsupported guesses when the question is about their content.
- If the sources do not contain enough information, say that clearly.
- Do not mention embeddings, vector search, retrieval internals, or database implementation unless the user asks.

Retrieved knowledge sources:
${formattedSources}
`.trim();

    if (process.env.NODE_ENV === "development") {
      console.log(
        "[NARA] Knowledge retrieval:",
        sources.map((source) => ({
          source: source.id,
          filename: source.filename,
          page: source.pageNumber,
          similarity: Number(source.similarity.toFixed(3)),
        })),
      );
    }

    return {
      context,
      sources,
    };
  } catch (error) {
    console.warn("[NARA] Knowledge retrieval unavailable:", error);

    return {
      context: "",
      sources: [],
    };
  }
}
