import fs from "node:fs";

const shellPath = "features/chat/nara-shell.tsx";
const packagePath = "package.json";

let shell = fs.readFileSync(shellPath, "utf8");
const packageJson = JSON.parse(fs.readFileSync(packagePath, "utf8"));

console.log("\n=== NARA Adaptive Context v1.1 ===\n");

if (!shell.includes("@/features/debug/adaptive-context-inspector")) {
  const anchors = [
    'import { PersonalityCenter } from "@/features/personality/personality-center";',
    'import { MemoryDebugInspector } from "@/features/memory/memory-debug-inspector";',
  ];

  const anchor = anchors.find((candidate) => shell.includes(candidate));

  if (!anchor) {
    throw new Error("Could not find a safe inspector import anchor.");
  }

  shell = shell.replace(
    anchor,
    `${anchor}\nimport { AdaptiveContextInspector } from "@/features/debug/adaptive-context-inspector";`,
  );

  console.log("✅ AdaptiveContextInspector import");
}

if (!shell.includes("<AdaptiveContextInspector")) {
  const renderAnchors = [
    "<MemoryDebugInspector",
    "<PersonalityCenter",
    "</main>",
  ];

  const anchor = renderAnchors.find((candidate) => shell.includes(candidate));

  if (!anchor) {
    throw new Error("Could not find a safe render anchor.");
  }

  shell = shell.replace(
    anchor,
    `<AdaptiveContextInspector />\n\n      ${anchor}`,
  );

  console.log("✅ Adaptive debug inspector rendered");
}

packageJson.scripts = {
  ...packageJson.scripts,
  "personality:eval": "tsx scripts/evaluate-personality-context.ts",
};

fs.writeFileSync(shellPath, shell, "utf8");
fs.writeFileSync(
  packagePath,
  `${JSON.stringify(packageJson, null, 2)}\n`,
  "utf8",
);

console.log("✅ personality:eval quality gate registered");
console.log("\n✅ Adaptive Context v1.1 patch applied.\n");
