import fs from "node:fs";

const path = "features/chat/nara-shell.tsx";

let source = fs.readFileSync(path, "utf8");

console.log("\n=== Fix NARA Backfill Import ===\n");

/*
 * Remove accidental React import.
 */
source = source.replace(
  /(\bimport\s*\{[\s\S]*?)\s*backfillMemoryEmbeddings,\s*([\s\S]*?\}\s*from\s*"react";)/,
  "$1$2",
);

/*
 * Find the actual memory client import.
 */
const memoryImportPattern =
  /import\s*\{([\s\S]*?)\}\s*from\s*"@\/lib\/memory\/client";/;

const match = source.match(memoryImportPattern);

if (!match) {
  console.error("❌ Memory client import not found.");
  process.exit(1);
}

if (!match[1].includes("backfillMemoryEmbeddings")) {
  const imports = match[1]
    .split(",")
    .map((value) => value.trim())
    .filter(Boolean);

  imports.unshift("backfillMemoryEmbeddings");

  const replacement = `import {
  ${imports.join(",\n  ")},
} from "@/lib/memory/client";`;

  source = source.replace(memoryImportPattern, replacement);

  console.log("✅ backfillMemoryEmbeddings moved to memory client import");
} else {
  console.log(
    "✅ backfillMemoryEmbeddings already exists in memory client import",
  );
}

fs.writeFileSync(path, source, "utf8");

console.log("\n✅ Import repair complete.\n");
