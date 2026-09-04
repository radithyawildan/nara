import type { KnowledgeCitation } from "@/types/knowledge";

const CITATION_MARKER_PATTERN = /\[(K\d+)\]/gi;

export interface KnowledgeCitationIntegrityResult {
  content: string;
  citations: KnowledgeCitation[];
  usedCitationIds: string[];
  invalidCitationIds: string[];
  unusedRetrievedIds: string[];
  retrievedButUncited: boolean;
}

function normalizeCitationId(value: string) {
  return value.trim().toUpperCase();
}

function unique(values: string[]) {
  return [...new Set(values)];
}

function cleanRemovedMarkers(content: string) {
  return content
    .replace(/[ \t]+([,.;!?])/g, "$1")
    .replace(/ {2,}/g, " ")
    .replace(/[ \t]+\n/g, "\n");
}

export function reconcileKnowledgeCitations(
  content: string,
  retrievedCitations: KnowledgeCitation[],
): KnowledgeCitationIntegrityResult {
  const citationById = new Map<string, KnowledgeCitation>();

  for (const citation of retrievedCitations) {
    const id = normalizeCitationId(citation.id);

    if (!citationById.has(id)) {
      citationById.set(id, {
        ...citation,
        id,
      });
    }
  }

  const usedCitationIds: string[] = [];
  const invalidCitationIds: string[] = [];

  const sanitizedContent = cleanRemovedMarkers(
    content.replace(CITATION_MARKER_PATTERN, (_marker, rawId: string) => {
      const id = normalizeCitationId(rawId);

      if (!citationById.has(id)) {
        invalidCitationIds.push(id);
        return "";
      }

      usedCitationIds.push(id);
      return `[${id}]`;
    }),
  );

  const uniqueUsedIds = unique(usedCitationIds);
  const uniqueInvalidIds = unique(invalidCitationIds);

  const citations = uniqueUsedIds.flatMap((id) => {
    const citation = citationById.get(id);
    return citation ? [citation] : [];
  });

  const unusedRetrievedIds = [...citationById.keys()].filter(
    (id) => !uniqueUsedIds.includes(id),
  );

  return {
    content: sanitizedContent,
    citations,
    usedCitationIds: uniqueUsedIds,
    invalidCitationIds: uniqueInvalidIds,
    unusedRetrievedIds,
    retrievedButUncited: citationById.size > 0 && uniqueUsedIds.length === 0,
  };
}
