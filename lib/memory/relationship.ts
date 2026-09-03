import type { MemoryCategory, NaraMemory } from "@/types/memory";

export interface MemoryRelationshipInput {
  content: string;
  category: MemoryCategory;
}

export type MemoryRelationship =
  | {
      kind: "duplicate";
      memory: NaraMemory;
      slots: string[];
    }
  | {
      kind: "conflict";
      memory: NaraMemory;
      slots: string[];
    };

function normalize(value: string) {
  return value
    .toLowerCase()
    .replace(/[.,!?;:'"]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function getMemorySlots(input: MemoryRelationshipInput) {
  const content = normalize(input.content);

  const slots = new Set<string>();

  if (input.category === "identity") {
    if (
      /\b(?:panggil|call)\b/.test(content) ||
      /\b(?:namaku|nama saya|my name is)\b/.test(content)
    ) {
      slots.add("identity.preferred_name");
    }
  }

  if (input.category === "response_style" || input.category === "preference") {
    if (
      /\b(?:singkat|ringkas|pendek|short|brief|concise|detail|detailed|panjang)\b/.test(
        content,
      )
    ) {
      slots.add("response.length");
    }

    if (
      /\b(?:bahasa indonesia|indonesian|english|bahasa inggris)\b/.test(content)
    ) {
      slots.add("response.language");
    }

    if (/\b(?:formal|santai|casual|professional|profesional)\b/.test(content)) {
      slots.add("response.tone");
    }
  }

  return [...slots];
}

function intersect(left: string[], right: string[]) {
  return left.filter((value) => right.includes(value));
}

export function analyzeMemoryRelationship(
  candidate: MemoryRelationshipInput,
  memories: NaraMemory[],
): MemoryRelationship | null {
  const normalizedCandidate = normalize(candidate.content);

  for (const memory of memories) {
    if (normalize(memory.content) === normalizedCandidate) {
      return {
        kind: "duplicate",
        memory,
        slots: [],
      };
    }
  }

  const candidateSlots = getMemorySlots(candidate);

  if (candidateSlots.length === 0) {
    return null;
  }

  for (const memory of memories) {
    const existingSlots = getMemorySlots({
      content: memory.content,
      category: memory.category,
    });

    const overlappingSlots = intersect(candidateSlots, existingSlots);

    if (overlappingSlots.length > 0) {
      return {
        kind: "conflict",
        memory,
        slots: overlappingSlots,
      };
    }
  }

  return null;
}
