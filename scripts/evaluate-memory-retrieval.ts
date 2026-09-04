import {
  rankRelevantMemories,
  type RetrievalMemory,
} from "../lib/memory/retrieval";

interface EvaluationCase {
  name: string;
  query: string;
  expectedCategories: string[];
  expectedContentTerms?: string[];
}

const memories = [
  {
    id: "identity-name",
    category: "identity",
    content: "Panggil aku Dithya.",
  },
  {
    id: "style-short",
    category: "response_style",
    content: "Jawab secara singkat dan langsung.",
  },
  {
    id: "style-language",
    category: "response_style",
    content: "Gunakan Bahasa Indonesia.",
  },
  {
    id: "interest-ai",
    category: "interest",
    content: "Aku tertarik dengan AI dan intelligent systems.",
  },
  {
    id: "interest-hiking",
    category: "interest",
    content: "Aku suka hiking dan camping.",
  },
  {
    id: "preference-theme",
    category: "preference",
    content: "Aku lebih suka dark mode.",
  },
] satisfies RetrievalMemory[];

const cases: EvaluationCase[] = [
  {
    name: "Preferred name",
    query: "Kamu sebaiknya memanggil aku apa?",
    expectedCategories: ["identity"],
    expectedContentTerms: ["Dithya"],
  },
  {
    name: "Short response",
    query: "Jawab pertanyaan ini secara singkat.",
    expectedCategories: ["response_style"],
    expectedContentTerms: ["singkat"],
  },
  {
    name: "Language preference",
    query: "Gunakan bahasa yang biasa aku pilih.",
    expectedCategories: ["response_style"],
    expectedContentTerms: ["Indonesia"],
  },
  {
    name: "AI interest",
    query: "Apa yang kamu ingat tentang minat AI-ku?",
    expectedCategories: ["interest"],
    expectedContentTerms: ["AI"],
  },
  {
    name: "Hiking interest",
    query: "Apa yang kamu tahu tentang kesukaanku pada hiking?",
    expectedCategories: ["interest"],
    expectedContentTerms: ["hiking"],
  },
  {
    name: "Theme preference",
    query: "Mode tampilan apa yang aku suka?",
    expectedCategories: ["preference"],
    expectedContentTerms: ["dark"],
  },
];

let passed = 0;

console.log("\n=== NARA MEMORY RETRIEVAL EVALUATION ===\n");

for (const test of cases) {
  const results = rankRelevantMemories(test.query, memories, 3);

  const categories = results.map((memory) => memory.category);

  const combinedContent = results
    .map((memory) => memory.content)
    .join(" ")
    .toLowerCase();

  const categoryPassed = test.expectedCategories.some((category) =>
    categories.includes(category as never),
  );

  const contentPassed =
    !test.expectedContentTerms ||
    test.expectedContentTerms.every((term) =>
      combinedContent.includes(term.toLowerCase()),
    );

  const success = categoryPassed && contentPassed;

  if (success) {
    passed += 1;
  }

  console.log(success ? `✅ ${test.name}` : `❌ ${test.name}`);

  console.log(`   Query: ${test.query}`);

  console.log(`   Top results:`);

  for (const memory of results) {
    console.log(
      `   - ${memory.category} | ${memory.score.toFixed(2)} | ${memory.content}`,
    );
  }

  console.log();
}

const percentage = Math.round((passed / cases.length) * 100);

console.log("========================================");

console.log(`Result: ${passed}/${cases.length} passed (${percentage}%)`);

console.log("========================================\n");

if (percentage < 80) {
  console.error("❌ Retrieval quality is below the 80% regression threshold.");

  process.exit(1);
}

console.log("✅ NARA memory retrieval passed the quality gate.");
