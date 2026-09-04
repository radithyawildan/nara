import fs from "node:fs";

console.log("\n=== NARA Knowledge / RAG v1.4 ===\n");

const required = [
  "lib/knowledge/retrieval.ts",
  "lib/knowledge/server.ts",
  "features/knowledge/knowledge-source-tray.tsx",
  "types/knowledge.ts",
  "scripts/evaluate-knowledge-retrieval.ts",
];

for (const path of required) {
  if (!fs.existsSync(path)) {
    console.error(`❌ Missing patch file: ${path}`);
    process.exit(1);
  }
}

const packagePath = "package.json";
const packageJson = JSON.parse(fs.readFileSync(packagePath, "utf8"));
packageJson.scripts ??= {};
packageJson.scripts["knowledge:eval"] =
  "tsx scripts/evaluate-knowledge-retrieval.ts";
fs.writeFileSync(
  packagePath,
  `${JSON.stringify(packageJson, null, 2)}\n`,
  "utf8",
);

console.log("✅ multi-document reranker installed");
console.log("✅ retrieval debug upgraded");
console.log("✅ knowledge:eval quality gate registered");
console.log("\n✅ Knowledge / RAG v1.4 patch applied.\n");
