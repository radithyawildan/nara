export interface KnowledgeRetrievalCandidate {
  chunkId: string;
  documentId: string;
  filename: string;
  pageNumber: number | null;
  chunkIndex: number;
  content: string;
  similarity: number;
}

export interface RankedKnowledgeCandidate extends KnowledgeRetrievalCandidate {
  rankScore: number;
  redundancy: number;
  reasons: string[];
}

export interface KnowledgeRerankResult {
  selected: RankedKnowledgeCandidate[];
  candidateCount: number;
  deduplicatedCount: number;
  duplicateCount: number;
  uniqueDocumentCount: number;
  perDocumentLimit: number;
}

const DEFAULT_SELECTION_LIMIT = 6;
const SAME_DOCUMENT_DUPLICATE_THRESHOLD = 0.82;
const CROSS_DOCUMENT_DUPLICATE_THRESHOLD = 0.94;
const NEW_DOCUMENT_BONUS = 0.035;
const REDUNDANCY_PENALTY_WEIGHT = 0.1;

const STOP_WORDS = new Set([
  "a",
  "an",
  "and",
  "are",
  "as",
  "at",
  "be",
  "by",
  "for",
  "from",
  "in",
  "is",
  "it",
  "of",
  "on",
  "or",
  "that",
  "the",
  "this",
  "to",
  "was",
  "with",
  "yang",
  "dan",
  "atau",
  "di",
  "ke",
  "dari",
  "pada",
  "untuk",
  "dengan",
  "adalah",
  "ini",
  "itu",
  "sebagai",
  "dalam",
  "oleh",
  "sebuah",
]);

function normalizeText(value: string) {
  return value
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function tokenize(value: string) {
  return new Set(
    normalizeText(value)
      .split(" ")
      .map((token) => token.trim())
      .filter((token) => token.length > 2 && !STOP_WORDS.has(token)),
  );
}

function jaccardSimilarity(left: string, right: string) {
  const leftTokens = tokenize(left);
  const rightTokens = tokenize(right);

  if (leftTokens.size === 0 || rightTokens.size === 0) {
    return normalizeText(left) === normalizeText(right) ? 1 : 0;
  }

  let intersection = 0;

  for (const token of leftTokens) {
    if (rightTokens.has(token)) {
      intersection += 1;
    }
  }

  const union = leftTokens.size + rightTokens.size - intersection;

  return union === 0 ? 0 : intersection / union;
}

function deduplicateCandidates(candidates: KnowledgeRetrievalCandidate[]) {
  const sorted = [...candidates].sort(
    (left, right) => right.similarity - left.similarity,
  );

  const accepted: KnowledgeRetrievalCandidate[] = [];

  for (const candidate of sorted) {
    const duplicate = accepted.some((existing) => {
      const overlap = jaccardSimilarity(candidate.content, existing.content);
      const threshold =
        candidate.documentId === existing.documentId
          ? SAME_DOCUMENT_DUPLICATE_THRESHOLD
          : CROSS_DOCUMENT_DUPLICATE_THRESHOLD;

      return overlap >= threshold;
    });

    if (!duplicate) {
      accepted.push(candidate);
    }
  }

  return accepted;
}

function getPerDocumentLimit(uniqueDocumentCount: number, limit: number) {
  if (uniqueDocumentCount <= 1) {
    return limit;
  }

  if (uniqueDocumentCount === 2) {
    return Math.min(3, limit);
  }

  return Math.min(2, limit);
}

function maxRedundancy(
  candidate: KnowledgeRetrievalCandidate,
  selected: RankedKnowledgeCandidate[],
) {
  if (selected.length === 0) {
    return 0;
  }

  return Math.max(
    ...selected.map((existing) =>
      jaccardSimilarity(candidate.content, existing.content),
    ),
  );
}

export function rerankKnowledgeCandidates(
  candidates: KnowledgeRetrievalCandidate[],
  limit = DEFAULT_SELECTION_LIMIT,
): KnowledgeRerankResult {
  const boundedLimit = Math.max(1, Math.min(limit, 12));
  const deduplicated = deduplicateCandidates(candidates);
  const uniqueDocumentCount = new Set(
    deduplicated.map((candidate) => candidate.documentId),
  ).size;
  const perDocumentLimit = getPerDocumentLimit(
    uniqueDocumentCount,
    boundedLimit,
  );

  const remaining = [...deduplicated];
  const selected: RankedKnowledgeCandidate[] = [];
  const selectedPerDocument = new Map<string, number>();

  while (remaining.length > 0 && selected.length < boundedLimit) {
    let bestIndex = -1;
    let bestCandidate: RankedKnowledgeCandidate | null = null;

    for (let index = 0; index < remaining.length; index += 1) {
      const candidate = remaining[index];
      const documentSelectionCount =
        selectedPerDocument.get(candidate.documentId) ?? 0;

      if (documentSelectionCount >= perDocumentLimit) {
        continue;
      }

      const redundancy = maxRedundancy(candidate, selected);
      const isNewDocument = documentSelectionCount === 0;
      const rankScore =
        candidate.similarity +
        (isNewDocument ? NEW_DOCUMENT_BONUS : 0) -
        redundancy * REDUNDANCY_PENALTY_WEIGHT;

      const reasons = ["semantic similarity"];

      if (isNewDocument && selected.length > 0) {
        reasons.push("source diversity bonus");
      }

      if (redundancy >= 0.35) {
        reasons.push("redundancy penalty");
      }

      const ranked: RankedKnowledgeCandidate = {
        ...candidate,
        rankScore,
        redundancy,
        reasons,
      };

      if (
        !bestCandidate ||
        ranked.rankScore > bestCandidate.rankScore ||
        (ranked.rankScore === bestCandidate.rankScore &&
          ranked.similarity > bestCandidate.similarity)
      ) {
        bestCandidate = ranked;
        bestIndex = index;
      }
    }

    if (!bestCandidate || bestIndex === -1) {
      break;
    }

    selected.push(bestCandidate);
    selectedPerDocument.set(
      bestCandidate.documentId,
      (selectedPerDocument.get(bestCandidate.documentId) ?? 0) + 1,
    );
    remaining.splice(bestIndex, 1);
  }

  return {
    selected,
    candidateCount: candidates.length,
    deduplicatedCount: deduplicated.length,
    duplicateCount: candidates.length - deduplicated.length,
    uniqueDocumentCount,
    perDocumentLimit,
  };
}
