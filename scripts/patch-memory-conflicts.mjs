import fs from "node:fs";

const path = "features/chat/nara-shell.tsx";

let source = fs.readFileSync(path, "utf8");

console.log("\n=== NARA Memory v0.5 Patch ===\n");

function insertBefore(marker, content, label) {
  const index = source.indexOf(marker);

  if (index === -1) {
    console.error(`❌ Could not find: ${label}`);

    process.exit(1);
  }

  source = source.slice(0, index) + content + source.slice(index);

  console.log(`✅ ${label}`);
}

if (!source.includes("handleReplaceMemoryCandidate")) {
  insertBefore(
    "  async function handleSubmit(",
    `  async function handleReplaceMemoryCandidate(
    existingMemoryId: string,
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

    setIsSavingMemoryCandidate(
      true,
    );

    try {
      await handleUpdateMemory(
        existingMemoryId,
        normalizedContent,
        category,
      );

      const replacedMemory =
        memories.find(
          (memory) =>
            memory.id ===
            existingMemoryId,
        );

      if (
        replacedMemory &&
        !replacedMemory.isEnabled
      ) {
        await handleToggleMemory(
          existingMemoryId,
          true,
        );
      }

      setMemoryCandidate(null);
    } finally {
      setIsSavingMemoryCandidate(
        false,
      );
    }
  }

`,
    "replace candidate handler",
  );
} else {
  console.log("✅ replace candidate handler already present");
}

if (!source.includes("memories={memories}")) {
  source = source.replace(
    /(<MemorySuggestionCard[\s\S]*?candidate=\{\s*memoryCandidate\s*\})/,
    `$1
                    memories={memories}`,
  );

  if (!source.includes("memories={memories}")) {
    console.error("❌ Could not add memories prop.");

    process.exit(1);
  }

  console.log("✅ memories supplied to suggestion card");
} else {
  console.log("✅ memories prop already present");
}

if (
  !source.includes(
    "handleReplaceMemoryCandidate(",
    source.indexOf("<MemorySuggestionCard"),
  )
) {
  const suggestionIndex = source.indexOf("<MemorySuggestionCard");

  const closeIndex = source.indexOf("/>", suggestionIndex);

  if (suggestionIndex === -1 || closeIndex === -1) {
    console.error("❌ Could not locate suggestion component.");

    process.exit(1);
  }

  const insertion = `
                    onReplace={(
                      existingMemoryId,
                      content,
                      category,
                    ) => {
                      void handleReplaceMemoryCandidate(
                        existingMemoryId,
                        content,
                        category,
                      );
                    }}
`;

  source = source.slice(0, closeIndex) + insertion + source.slice(closeIndex);

  console.log("✅ replace callback supplied to suggestion card");
} else {
  console.log("✅ replace callback already present");
}

fs.writeFileSync(path, source, "utf8");

console.log("\n✅ Memory Intelligence v0.5 patch applied.\n");
