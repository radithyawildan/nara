import fs from "node:fs";

const path = "features/chat/nara-shell.tsx";

let source = fs.readFileSync(path, "utf8");

console.log("\n=== NARA Memory v0.4.1 Patch ===\n");

function replaceRegex(pattern, replacement, label) {
  if (!pattern.test(source)) {
    console.error(`❌ Could not find: ${label}`);

    process.exit(1);
  }

  source = source.replace(pattern, replacement);

  console.log(`✅ ${label}`);
}

/*
 * 1. Replace the entire old
 * handleAcceptMemoryCandidate()
 * regardless of Prettier formatting.
 */
replaceRegex(
  /  async function handleAcceptMemoryCandidate\([\s\S]*?\n  }\n\n  async function handleSubmit\(/,
  `  async function handleAcceptMemoryCandidate(
    content: string,
    category: MemoryCategory,
  ) {
    const normalizedContent =
      content.trim();

    if (
      !memoryCandidate ||
      !normalizedContent
    ) {
      return;
    }

    const duplicate =
      memories.some(
        (memory) =>
          memory.content
            .trim()
            .toLowerCase() ===
          normalizedContent.toLowerCase(),
      );

    if (duplicate) {
      setMemoryCandidate(null);
      return;
    }

    setIsSavingMemoryCandidate(
      true,
    );

    try {
      await handleCreateMemory(
        normalizedContent,
        category,
      );

      setMemoryCandidate(null);
    } finally {
      setIsSavingMemoryCandidate(
        false,
      );
    }
  }

  async function handleSubmit(`,
  "editable candidate save handler",
);

/*
 * 2. Replace old zero-argument
 * onSave callback.
 */
replaceRegex(
  /onSave=\{\(\) => \{\s*void handleAcceptMemoryCandidate\(\);\s*\}\}/,
  `onSave={(
                      content,
                      category,
                    ) => {
                      void handleAcceptMemoryCandidate(
                        content,
                        category,
                      );
                    }}`,
  "editable suggestion callback",
);

/*
 * 3. Add React key so local editor
 * resets whenever candidate changes.
 *
 * Only add it if it does not
 * already exist.
 */
if (
  !source.includes(
    "key={`${memoryCandidate.category}:${memoryCandidate.content}`}",
  )
) {
  replaceRegex(
    /<MemorySuggestionCard\s+candidate=/,
    `<MemorySuggestionCard
                    key={\`\${memoryCandidate.category}:\${memoryCandidate.content}\`}
                    candidate=`,
    "candidate editor reset key",
  );
} else {
  console.log("✅ candidate editor reset key already present");
}

fs.writeFileSync(path, source, "utf8");

console.log("\n✅ Memory Intelligence v0.4.1 patch applied.\n");
