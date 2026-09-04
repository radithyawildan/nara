import {
  compactConversationContext,
  estimateMessagesTokens,
} from "../lib/conversations/intelligence";
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

console.log("\n=== NARA CONVERSATION INTELLIGENCE EVALUATION ===\n");

const shortConversation: ChatMessage[] = [
  { role: "user", content: "Halo NARA." },
  { role: "assistant", content: "Halo. Ada yang bisa kubantu?" },
  { role: "user", content: "Jelaskan embedding secara singkat." },
];

const shortResult = compactConversationContext(shortConversation);

check(
  "Short conversations remain untouched",
  !shortResult.stats.compacted &&
    shortResult.messages.length === shortConversation.length &&
    !shortResult.summaryInstructions,
  `messages=${shortResult.messages.length}, tokens=${shortResult.stats.estimatedDeliveredTokens}`,
);

const longConversation: ChatMessage[] = [];

for (let index = 0; index < 30; index += 1) {
  longConversation.push({
    role: index % 2 === 0 ? "user" : "assistant",
    content:
      index === 0
        ? "Nama proyek ini NARA dan keputusan utama adalah memakai Supabase untuk persistence."
        : `Message ${index}: ${"context ".repeat(120)} detail-${index}.`,
  });
}

const longResult = compactConversationContext(longConversation);

check(
  "Long threads are compacted",
  longResult.stats.compacted &&
    longResult.stats.summarizedMessages > 0 &&
    longResult.messages.length <= 16,
  `original=${longResult.stats.originalMessages}, delivered=${longResult.stats.deliveredMessages}, summarized=${longResult.stats.summarizedMessages}`,
);

check(
  "Recent messages are preserved",
  longResult.messages.at(-1)?.content === longConversation.at(-1)?.content &&
    longResult.messages.at(-2)?.content === longConversation.at(-2)?.content,
  `latest=${longResult.messages.at(-1)?.content.slice(0, 32)}...`,
);

check(
  "Earlier topic continuity enters compact summary",
  Boolean(
    longResult.summaryInstructions?.includes("Nama proyek ini NARA") &&
    longResult.summaryInstructions.includes("Supabase"),
  ),
  "early project decision retained in summary",
);

check(
  "Compaction reduces estimated context size",
  longResult.stats.estimatedDeliveredTokens <
    longResult.stats.estimatedOriginalTokens,
  `before=${longResult.stats.estimatedOriginalTokens}, after=${longResult.stats.estimatedDeliveredTokens}`,
);

const giantMessage: ChatMessage[] = [
  {
    role: "user",
    content: "x".repeat(18_000),
  },
  {
    role: "assistant",
    content: "y".repeat(18_000),
  },
  {
    role: "user",
    content: "latest request",
  },
];

check(
  "Token estimator scales with content length",
  estimateMessagesTokens(giantMessage) > 9_000,
  `estimated=${estimateMessagesTokens(giantMessage)}`,
);

const percentage = Math.round((passed / total) * 100);

console.log("========================================");
console.log(`Result: ${passed}/${total} passed (${percentage}%)`);
console.log("========================================\n");

if (passed !== total) {
  console.error("❌ NARA conversation intelligence quality gate failed.");
  process.exit(1);
}

console.log("✅ NARA conversation intelligence passed the quality gate.");
