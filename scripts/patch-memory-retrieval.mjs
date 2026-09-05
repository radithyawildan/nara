import fs from "node:fs";

const path = "app/api/chat/route.ts";

let source = fs.readFileSync(path, "utf8");

console.log("\n=== NARA Memory v0.6 Route Patch ===\n");

if (
  source.includes("getMemoryContext(latestUserMessage)") ||
  /getMemoryContext\s*\(\s*latestUserMessage\s*\)/.test(source)
) {
  console.log("✅ Memory retrieval already uses latestUserMessage.");

  process.exit(0);
}

const pattern =
  /const\s+memoryContext\s*=\s*await\s+getMemoryContext\s*\(\s*\)\s*;/;

if (!pattern.test(source)) {
  console.error("❌ Zero-argument getMemoryContext() call not found.");

  const matches = source.match(/getMemoryContext\s*\([^)]*\)/g);

  console.log("\nExisting calls:", matches ?? "none");

  process.exit(1);
}

source = source.replace(
  pattern,
  `const latestUserMessage =
      [...result.data.messages]
        .reverse()
        .find(
          (message) =>
            message.role === "user",
        )?.content ?? "";

    const memoryContext =
      await getMemoryContext(
        latestUserMessage,
      );`,
);

fs.writeFileSync(path, source, "utf8");

console.log("✅ latest user message connected to memory retrieval");

console.log("\n✅ Memory v0.6 route patch applied.\n");
