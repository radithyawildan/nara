import fs from "node:fs";

const path = "features/chat/nara-shell.tsx";

let source = fs.readFileSync(path, "utf8");

console.log("\n=== NARA Memory v0.7.1 Patch ===\n");

/*
 * Add backfillMemoryEmbeddings
 * to the existing memory client import.
 */
const importPattern =
  /import\s*\{([\s\S]*?)\}\s*from\s*"@\/lib\/memory\/client";/;

const importMatch = source.match(importPattern);

if (!importMatch) {
  console.error("❌ Memory client import not found.");

  process.exit(1);
}

if (!importMatch[1].includes("backfillMemoryEmbeddings")) {
  const existingImports = importMatch[1].trim();

  const replacement = `import {
  backfillMemoryEmbeddings,
  ${existingImports}
} from "@/lib/memory/client";`;

  source = source.replace(importPattern, replacement);

  console.log("✅ backfill client import added");
} else {
  console.log("✅ backfill client import already present");
}

/*
 * Start a background migration after
 * the user's memories are initially loaded.
 */
if (!source.includes("[NARA] Automatic memory embedding backfill")) {
  const anchor = /setMemories\s*\(\s*storedMemories\s*\)\s*;/;

  if (!anchor.test(source)) {
    console.error("❌ Initial setMemories anchor not found.");

    process.exit(1);
  }

  source = source.replace(
    anchor,
    `setMemories(
          storedMemories,
        );

        void backfillMemoryEmbeddings()
          .then(
            async (result) => {
              if (
                cancelled ||
                result.processed === 0
              ) {
                return;
              }

              console.log(
                "[NARA] Automatic memory embedding backfill:",
                result,
              );

              const refreshedMemories =
                await listMemories();

              if (!cancelled) {
                setMemories(
                  refreshedMemories,
                );
              }
            },
          )
          .catch((error) => {
            console.warn(
              "[NARA] Automatic memory embedding backfill unavailable:",
              error,
            );
          });`,
  );

  console.log("✅ automatic embedding backfill activated");
} else {
  console.log("✅ automatic backfill already active");
}

fs.writeFileSync(path, source, "utf8");

console.log("\n✅ Memory v0.7.1 shell patch applied.\n");
