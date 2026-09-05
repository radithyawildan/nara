import type { MemoryCategory } from "@/types/memory";

export interface MemoryCandidate {
  category: MemoryCategory;
  content: string;
  reason: string;
}

interface MemoryRule {
  category: MemoryCategory;
  reason: string;
  patterns: RegExp[];
}

const RULES: MemoryRule[] = [
  {
    category: "identity",
    reason: "This looks like a stable identity preference.",
    patterns: [
      /\bpanggil\s+(?:aku|saya)\b/i,
      /\bnama(?:ku|\s+saya)\b/i,
      /\bcall\s+me\b/i,
      /\bmy\s+name\s+is\b/i,
    ],
  },
  {
    category: "response_style",
    reason: "This looks like a response style preference.",
    patterns: [
      /\b(?:jawab|balas|gunakan|pakai)\b.*\b(?:singkat|ringkas|detail|panjang|formal|santai|bahasa|english|indonesia)\b/i,
      /\b(?:jawaban|response)\b.*\b(?:singkat|ringkas|detail|formal|santai)\b/i,
      /\b(?:respond|reply|answer)\b.*\b(?:brief|short|detailed|formal|casual|english|indonesian)\b/i,
    ],
  },
  {
    category: "preference",
    reason: "This looks like a personal preference.",
    patterns: [
      /\b(?:aku|saya)\s+(?:lebih\s+)?(?:suka|menyukai|prefer)\b/i,
      /\b(?:preferensi(?:ku|\s+saya))\b/i,
      /\bi\s+(?:prefer|like)\b/i,
    ],
  },
  {
    category: "interest",
    reason: "This looks like a long-term interest.",
    patterns: [
      /\b(?:aku|saya)\s+(?:tertarik|berminat)\b/i,
      /\b(?:minat(?:ku|\s+saya))\b/i,
      /\bi(?:'m|\s+am)?\s+interested\s+in\b/i,
    ],
  },
];

const TEMPORARY_SIGNALS = [
  /\bhari\s+ini\b/i,
  /\bsekarang\b/i,
  /\blagi\b/i,
  /\bbesok\b/i,
  /\bkemarin\b/i,
  /\bnanti\b/i,
  /\btoday\b/i,
  /\bright\s+now\b/i,
  /\bcurrently\b/i,
  /\btonight\b/i,
  /\btomorrow\b/i,
  /\byesterday\b/i,
];

const EXPLICIT_MEMORY_PATTERN = /^(?:ingat|remember)(?:lah)?\s*:?/i;

function normalizeContent(content: string) {
  return content.replace(/\s+/g, " ").trim();
}

export function detectMemoryCandidate(input: string): MemoryCandidate | null {
  const content = normalizeContent(input);

  if (content.length < 8 || content.length > 280) {
    return null;
  }

  if (EXPLICIT_MEMORY_PATTERN.test(content)) {
    return null;
  }

  if (content.includes("?")) {
    return null;
  }

  if (TEMPORARY_SIGNALS.some((pattern) => pattern.test(content))) {
    return null;
  }

  for (const rule of RULES) {
    if (rule.patterns.some((pattern) => pattern.test(content))) {
      return {
        category: rule.category,
        content,
        reason: rule.reason,
      };
    }
  }

  return null;
}
