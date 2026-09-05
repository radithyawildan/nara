import fs from "node:fs";

console.log("\n=== NARA Hardening Evaluator Repair ===\n");

const evalPath = "scripts/evaluate-hardening.ts";
let source = fs.readFileSync(evalPath, "utf8");

if (!source.includes("async function main()")) {
  const bodyAnchor = "let passed = 0;";
  const bodyIndex = source.indexOf(bodyAnchor);

  if (bodyIndex === -1) {
    throw new Error(
      "Could not find evaluate-hardening.ts executable body anchor.",
    );
  }

  const imports = source.slice(0, bodyIndex).trimEnd();
  const body = source.slice(bodyIndex).trim();

  source = `${imports}

async function main() {
${body}
}

void main().catch((error) => {
  console.error("❌ NARA hardening evaluator crashed:", error);
  process.exit(1);
});
`;

  fs.writeFileSync(evalPath, source, "utf8");

  console.log("✅ hardening evaluator wrapped in async main()");
} else {
  console.log("✅ hardening evaluator already uses async main()");
}

/* -------------------------------------------------------------------------- */
/* Rebuild master release gate                                                */
/* -------------------------------------------------------------------------- */

const packagePath = "package.json";
const packageJson = JSON.parse(fs.readFileSync(packagePath, "utf8"));

const preferredGates = [
  "format:check",
  "lint",
  "typecheck",
  "memory:eval",
  "knowledge:eval",
  "knowledge:citations",
  "personality:eval",
  "conversation:eval",
  "conversation:state",
  "ux:eval",
  "hardening:eval",
  "preflight",
  "build",
];

const availableGates = preferredGates.filter(
  (name) => packageJson.scripts?.[name],
);

packageJson.scripts["release:check"] = availableGates
  .map((name) => `pnpm ${name}`)
  .join(" && ");

fs.writeFileSync(
  packagePath,
  `${JSON.stringify(packageJson, null, 2)}\n`,
  "utf8",
);

console.log(`✅ release:check rebuilt with ${availableGates.length} gates`);
console.log(`   ${availableGates.join(" → ")}`);

console.log("\n✅ Hardening evaluator repair complete.\n");
