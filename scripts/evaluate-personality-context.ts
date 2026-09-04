import {
  ADAPTIVE_CONTEXT_PRIORITY,
  buildPersonalityInstructions,
} from "../lib/personality/server";
import { PERSONALITY_PRESETS } from "../lib/personality/presets";

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

console.log("\n=== NARA ADAPTIVE PERSONALITY EVALUATION ===\n");

const quick = PERSONALITY_PRESETS.find((preset) => preset.id === "quick");
const technical = PERSONALITY_PRESETS.find(
  (preset) => preset.id === "deep-technical",
);

check(
  "Quick preset remains concise",
  Boolean(
    quick &&
    quick.profile.verbosity === 1 &&
    quick.profile.tone === "concise" &&
    quick.profile.codeStyle === "minimal",
  ),
  quick ? JSON.stringify(quick.profile) : "preset missing",
);

check(
  "Deep Technical preset remains production-oriented",
  Boolean(
    technical &&
    technical.profile.verbosity === 5 &&
    technical.profile.initiative === 5 &&
    technical.profile.tone === "technical" &&
    technical.profile.codeStyle === "production",
  ),
  technical ? JSON.stringify(technical.profile) : "preset missing",
);

if (technical) {
  const instructions = buildPersonalityInstructions(technical.profile);

  check(
    "Prompt contains conflict resolution hierarchy",
    instructions.includes("current explicit user request always wins") &&
      instructions.includes("saved response-style memory may override") &&
      instructions.includes("Knowledge / RAG sources ground factual claims"),
    "explicit request > response-style memory > personality > general memory > knowledge",
  );

  check(
    "Technical profile produces detailed instructions",
    instructions.includes("technically precise language") &&
      instructions.includes("thorough answers") &&
      instructions.includes("production-oriented structure"),
    "technical + verbosity 5 + production code style",
  );
}

check(
  "Priority model remains stable",
  ADAPTIVE_CONTEXT_PRIORITY.length === 5 &&
    ADAPTIVE_CONTEXT_PRIORITY[0] === "Current explicit user request" &&
    ADAPTIVE_CONTEXT_PRIORITY[4] === "Knowledge / RAG grounding",
  ADAPTIVE_CONTEXT_PRIORITY.join(" > "),
);

const percentage = Math.round((passed / total) * 100);

console.log("========================================");
console.log(`Result: ${passed}/${total} passed (${percentage}%)`);
console.log("========================================\n");

if (passed !== total) {
  console.error("❌ NARA adaptive personality quality gate failed.");
  process.exit(1);
}

console.log("✅ NARA adaptive personality passed the quality gate.");
