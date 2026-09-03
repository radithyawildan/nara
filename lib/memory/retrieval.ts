import type { MemoryCategory } from "@/types/memory";

export interface RetrievalMemory {
  id: string;
  category: MemoryCategory;
  content: string;
  updatedAt?: string;
}

export interface RankedMemory extends RetrievalMemory {
  score: number;
  reasons: string[];
}

const STOP_WORDS = new Set([
  "aku",
  "saya",
  "gue",
  "gw",
  "yang",
  "dan",
  "atau",
  "dengan",
  "untuk",
  "dari",
  "di",
  "ke",
  "ini",
  "itu",
  "adalah",
  "jadi",
  "the",
  "a",
  "an",
  "and",
  "or",
  "to",
  "of",
  "for",
  "with",
  "is",
  "are",
  "am",
  "i",
  "me",
  "my",
  "you",
  "your",
]);

const GLOBAL_CATEGORY_PRIORITY: Record<MemoryCategory, number> = {
  identity: 1.25,
  response_style: 2,
  preference: 0.75,
  interest: 0.25,
  custom: 0.15,
};

function normalize(value: string) {
  return value
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[^\p{L}\p{N}\s]/gu, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function tokenize(value: string) {
  return new Set(
    normalize(value)
      .split(" ")
      .filter((token) => token.length > 1 && !STOP_WORDS.has(token)),
  );
}

function getOverlapScore(query: string, memory: string) {
  const queryTokens = tokenize(query);

  const memoryTokens = tokenize(memory);

  if (queryTokens.size === 0 || memoryTokens.size === 0) {
    return 0;
  }

  let overlap = 0;

  for (const token of queryTokens) {
    if (memoryTokens.has(token)) {
      overlap += 1;
    }
  }

  return overlap / Math.min(queryTokens.size, memoryTokens.size);
}

function getCategoryCueScore(query: string, category: MemoryCategory) {
  const normalized = normalize(query);

  if (
    category === "identity" &&
    /\b(nama|namaku|panggil|siapa aku|call me|my name|name)\b/i.test(normalized)
  ) {
    return 5;
  }

  if (
    category === "response_style" &&
    /\b(jawab|jawaban|balas|bahasa|singkat|ringkas|detail|formal|santai|answer|reply|respond|response|short|brief|detailed|language|casual)\b/i.test(
      normalized,
    )
  ) {
    return 4;
  }

  if (
    category === "preference" &&
    /\b(suka|menyukai|prefer|preferensi|pilih|like|preference)\b/i.test(
      normalized,
    )
  ) {
    return 3;
  }

  if (
    category === "interest" &&
    /\b(tertarik|minat|interest|interested)\b/i.test(normalized)
  ) {
    return 3;
  }

  return 0;
}

function getRecencyScore(updatedAt?: string) {
  if (!updatedAt) {
    return 0;
  }

  const timestamp = new Date(updatedAt).getTime();

  if (Number.isNaN(timestamp)) {
    return 0;
  }

  const ageInDays = (Date.now() - timestamp) / 86_400_000;

  if (ageInDays <= 7) {
    return 0.5;
  }

  if (ageInDays <= 30) {
    return 0.25;
  }

  return 0;
}

function getPhraseScore(query: string, memory: string) {
  const normalizedQuery = normalize(query);

  const normalizedMemory = normalize(memory);

  if (normalizedQuery.length < 4 || normalizedMemory.length < 4) {
    return 0;
  }

  if (
    normalizedQuery.includes(normalizedMemory) ||
    normalizedMemory.includes(normalizedQuery)
  ) {
    return 2;
  }

  return 0;
}

export function rankRelevantMemories(
  query: string,
  memories: RetrievalMemory[],
  limit = 6,
) {
  const seen = new Set<string>();

  const ranked = memories
    .filter((memory) => {
      const key = normalize(memory.content);

      if (!key || seen.has(key)) {
        return false;
      }

      seen.add(key);
      return true;
    })
    .map((memory) => {
      const reasons: string[] = [];

      const categoryPriority = GLOBAL_CATEGORY_PRIORITY[memory.category];

      const lexicalOverlap = getOverlapScore(query, memory.content);

      const lexicalScore = lexicalOverlap * 5;

      const cueScore = getCategoryCueScore(query, memory.category);

      const phraseScore = getPhraseScore(query, memory.content);

      const recencyScore = getRecencyScore(memory.updatedAt);

      if (categoryPriority >= 1) {
        reasons.push("global preference");
      }

      if (lexicalScore >= 1) {
        reasons.push("topic overlap");
      }

      if (cueScore > 0) {
        reasons.push("category cue");
      }

      if (phraseScore > 0) {
        reasons.push("phrase match");
      }

      if (recencyScore > 0) {
        reasons.push("recent memory");
      }

      const score =
        categoryPriority + lexicalScore + cueScore + phraseScore + recencyScore;

      return {
        ...memory,
        score,
        reasons,
      };
    })
    .filter((memory) => memory.score >= 1)
    .sort((left, right) => right.score - left.score)
    .slice(0, limit);

  return ranked;
}
