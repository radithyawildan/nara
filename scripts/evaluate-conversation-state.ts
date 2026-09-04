import { buildFallbackConversationState } from "../lib/conversations/rolling-summary";

import type { ChatMessage } from "../types/conversation";

let passed = 0;
let total = 0;

function check(name: string, success: boolean, detail: string) {
  total += 1;

  if (success) {
    passed += 1;
  }

  console.log(`${success ? "✅" : "❌"} ${name}`);
  console.log(`   ${detail}\n`);
}

console.log("\n=== NARA PERSISTENT CONVERSATION STATE EVALUATION ===\n");

const messages: ChatMessage[] = [
  {
    role: "user",
    content:
      "Aku ingin menyelesaikan NARA lebih cepat dan targetnya punya long-term memory serta RAG.",
  },
  {
    role: "assistant",
    content: "Kita bisa kerjakan per milestone besar.",
  },
  {
    role: "user",
    content:
      "Keputusannya pakai Supabase untuk persistence dan Gemini untuk provider AI.",
  },
  {
    role: "assistant",
    content: "Baik, keputusan itu kita pertahankan.",
  },
  {
    role: "user",
    content:
      "Nanti lanjutkan rolling summary dan topic state setelah conversation compaction selesai.",
  },
  {
    role: "assistant",
    content: "Siap.",
  },
  {
    role: "user",
    content: "Sekarang gimana status conversation intelligence?",
  },
];

const state = buildFallbackConversationState(messages);

check(
  "Fallback summary preserves durable conversation content",
  state.summary.includes("Supabase") &&
    state.summary.includes("Gemini") &&
    state.summary.includes("conversation intelligence"),
  state.summary.slice(0, 220),
);

check(
  "Current topic follows latest user turn",
  state.topicState.currentTopic?.includes("status conversation intelligence") ??
    false,
  state.topicState.currentTopic ?? "null",
);

check(
  "Locked decisions are extracted",
  state.topicState.lockedDecisions.some(
    (item) => item.includes("Supabase") && item.includes("Gemini"),
  ),
  JSON.stringify(state.topicState.lockedDecisions),
);

check(
  "Open loops are retained",
  state.topicState.openLoops.some((item) =>
    item.toLowerCase().includes("rolling summary"),
  ),
  JSON.stringify(state.topicState.openLoops),
);

check(
  "User goals are retained",
  state.topicState.userGoals.some((item) =>
    item.toLowerCase().includes("menyelesaikan nara"),
  ),
  JSON.stringify(state.topicState.userGoals),
);

const percentage = Math.round((passed / total) * 100);

console.log("========================================");
console.log(`Result: ${passed}/${total} passed (${percentage}%)`);
console.log("========================================\n");

if (passed !== total) {
  console.error("❌ NARA persistent conversation state quality gate failed.");
  process.exit(1);
}

console.log("✅ NARA persistent conversation state passed the quality gate.");
