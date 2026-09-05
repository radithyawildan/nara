import {
  rerankKnowledgeCandidates,
  type KnowledgeRetrievalCandidate,
} from "../lib/knowledge/retrieval";

function candidate(
  chunkId: string,
  documentId: string,
  similarity: number,
  content: string,
): KnowledgeRetrievalCandidate {
  return {
    chunkId,
    documentId,
    filename: `${documentId}.txt`,
    pageNumber: 1,
    chunkIndex: Number(chunkId.replace(/\D/g, "")) || 0,
    content,
    similarity,
  };
}

interface EvaluationCase {
  name: string;
  run: () => boolean;
  detail: () => string;
}

let lastDetail = "";

const cases: EvaluationCase[] = [
  {
    name: "Near-duplicate suppression",
    run() {
      const result = rerankKnowledgeCandidates([
        candidate(
          "a1",
          "doc-a",
          0.91,
          "Project Helios uses LumaBridge for secure edge communication.",
        ),
        candidate(
          "a2",
          "doc-a",
          0.9,
          "Project Helios uses the LumaBridge protocol for secure edge communication.",
        ),
        candidate(
          "b1",
          "doc-b",
          0.86,
          "Helios deployment began during the August prototype milestone.",
        ),
      ]);

      lastDetail = `duplicates=${result.duplicateCount}, selected=${result.selected.length}`;
      return result.duplicateCount >= 1;
    },
    detail: () => lastDetail,
  },
  {
    name: "Multi-document diversity",
    run() {
      const result = rerankKnowledgeCandidates([
        candidate("a1", "doc-a", 0.93, "Architecture and system overview."),
        candidate(
          "a2",
          "doc-a",
          0.91,
          "Hardware interface and deployment notes.",
        ),
        candidate(
          "a3",
          "doc-a",
          0.9,
          "Runtime scheduling and component lifecycle.",
        ),
        candidate(
          "b1",
          "doc-b",
          0.895,
          "Security model and authentication design.",
        ),
        candidate(
          "c1",
          "doc-c",
          0.885,
          "Evaluation results and benchmark methodology.",
        ),
      ]);

      const documents = new Set(
        result.selected.slice(0, 4).map((item) => item.documentId),
      );

      lastDetail = `documents=${[...documents].join(",")}, perSource=${result.perDocumentLimit}`;
      return documents.size >= 3 && result.perDocumentLimit === 2;
    },
    detail: () => lastDetail,
  },
  {
    name: "Single-document depth remains available",
    run() {
      const result = rerankKnowledgeCandidates(
        Array.from({ length: 6 }, (_, index) =>
          candidate(
            `a${index + 1}`,
            "doc-a",
            0.92 - index * 0.01,
            `Distinct technical section ${index + 1} with unique topic token${index + 10}.`,
          ),
        ),
      );

      lastDetail = `selected=${result.selected.length}, perSource=${result.perDocumentLimit}`;
      return result.selected.length === 6 && result.perDocumentLimit === 6;
    },
    detail: () => lastDetail,
  },
  {
    name: "Two-document source cap",
    run() {
      const result = rerankKnowledgeCandidates([
        ...Array.from({ length: 5 }, (_, index) =>
          candidate(
            `a${index + 1}`,
            "doc-a",
            0.94 - index * 0.01,
            `Alpha document section ${index + 1} uniquealpha${index + 10}.`,
          ),
        ),
        ...Array.from({ length: 5 }, (_, index) =>
          candidate(
            `b${index + 1}`,
            "doc-b",
            0.89 - index * 0.01,
            `Beta document section ${index + 1} uniquebeta${index + 20}.`,
          ),
        ),
      ]);

      const counts = new Map<string, number>();

      for (const item of result.selected) {
        counts.set(item.documentId, (counts.get(item.documentId) ?? 0) + 1);
      }

      const maxCount = Math.max(...counts.values());
      lastDetail = `counts=${JSON.stringify(Object.fromEntries(counts))}, perSource=${result.perDocumentLimit}`;
      return result.perDocumentLimit === 3 && maxCount <= 3;
    },
    detail: () => lastDetail,
  },
];

console.log("\n=== NARA KNOWLEDGE RETRIEVAL EVALUATION ===\n");

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
  console.error("❌ Knowledge retrieval regression gate failed.");
  process.exit(1);
}

console.log("✅ NARA knowledge retrieval passed the diversity quality gate.");
