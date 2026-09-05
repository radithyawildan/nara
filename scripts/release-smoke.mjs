import fs from "node:fs";

const requiredRoutes = [
  "app/api/chat/route.ts",
  "app/api/health/route.ts",
  "app/api/version/route.ts",
  "app/api/diagnostics/route.ts",
  "app/api/knowledge/upload/route.ts",
  "app/api/memory/embed/route.ts",
];

const requiredFeatures = [
  "features/chat/nara-shell.tsx",
  "features/account/account-center.tsx",
  "features/memory/memory-center.tsx",
  "features/knowledge/knowledge-center.tsx",
  "features/personality/personality-center.tsx",
  "features/system/about-nara.tsx",
];

let failed = 0;

console.log("\n=== NARA RELEASE CANDIDATE SMOKE CHECK ===\n");

for (const file of [...requiredRoutes, ...requiredFeatures]) {
  if (fs.existsSync(file)) {
    console.log(`✅ ${file}`);
  } else {
    failed += 1;
    console.log(`❌ ${file}`);
  }
}

console.log("\n========================================");
console.log(`Missing: ${failed}`);
console.log("========================================\n");

if (failed > 0) {
  process.exit(1);
}

console.log("✅ NARA release candidate smoke check passed.");
