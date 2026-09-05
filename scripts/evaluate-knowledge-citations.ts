import { reconcileKnowledgeCitations } from "../lib/knowledge/citations";
import type { KnowledgeCitation } from "../types/knowledge";

function citation(id: string, documentId: string): KnowledgeCitation {
  return {
    id,
    chunkId: `${documentId}-${id}`,
    documentId,
    filename: `${documentId}.txt`,
    pageNumber: 1,
    chunkIndex: 0,
    similarity: 0.8,
  };
}

interface EvaluationCase {
  name: string;
  run: () => boolean;
  detail: () => string;
}

let detail = "";

const sources = [citation("K1", "alpha"), citation("K2", "beta")];

const cases: EvaluationCase[] = [
  {
    name: "Persists only citations actually used",
    run() {
      const result = reconcileKnowledgeCitations(
        "Alpha is supported [K1].",
        sources,
      );

      detail = `used=${result.usedCitationIds.join(",")}, persisted=${result.citations.length}`;
      return (
        result.citations.length === 1 &&
        result.citations[0]?.id === "K1" &&
        result.unusedRetrievedIds.includes("K2")
      );
    },
    detail: () => detail,
  },
  {
    name: "Removes hallucinated citation markers",
    run() {
      const result = reconcileKnowledgeCitations(
        "Alpha [K1] and fabricated [K99].",
        sources,
      );

      detail = `invalid=${result.invalidCitationIds.join(",")}, content=${result.content}`;
      return (
        result.invalidCitationIds.includes("K99") &&
        !result.content.includes("[K99]") &&
        result.content.includes("[K1]")
      );
    },
    detail: () => detail,
  },
  {
    name: "Normalizes marker casing",
    run() {
      const result = reconcileKnowledgeCitations("Alpha [k1].", sources);

      detail = `content=${result.content}`;
      return result.content.includes("[K1]") && result.citations.length === 1;
    },
    detail: () => detail,
  },
  {
    name: "Deduplicates repeated markers",
    run() {
      const result = reconcileKnowledgeCitations(
        "Alpha [K1]. Again [K1].",
        sources,
      );

      detail = `markers=${result.usedCitationIds.length}, persisted=${result.citations.length}`;
      return (
        result.usedCitationIds.length === 1 && result.citations.length === 1
      );
    },
    detail: () => detail,
  },
  {
    name: "Detects retrieved-but-uncited response",
    run() {
      const result = reconcileKnowledgeCitations(
        "This answer contains no source marker.",
        sources,
      );

      detail = `retrievedButUncited=${result.retrievedButUncited}`;
      return result.retrievedButUncited && result.citations.length === 0;
    },
    detail: () => detail,
  },
];

console.log("\n=== NARA KNOWLEDGE CITATION INTEGRITY EVALUATION ===\n");

let passed = 0;

for (const test of cases) {
  const success = test.run();

  if (success) {
    passed += 1;
  }

  console.log(`${success ? "✅" : "❌"} ${test.name}`);
  console.log(`   ${test.detail()}\n`);
}

const percentage = Math.round((passed / cases.length) * 100);

console.log("========================================");
console.log(`Result: ${passed}/${cases.length} passed (${percentage}%)`);
console.log("========================================\n");

if (passed !== cases.length) {
  console.error("❌ Knowledge citation integrity regression gate failed.");
  process.exit(1);
}

console.log("✅ NARA knowledge citation integrity passed the quality gate.");
