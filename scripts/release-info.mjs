import fs from "node:fs";

const packageJson = JSON.parse(fs.readFileSync("package.json", "utf8"));

const version =
  process.env.NEXT_PUBLIC_NARA_VERSION || packageJson.version || "0.1.0";

const channel =
  process.env.NEXT_PUBLIC_NARA_RELEASE_CHANNEL || "release-candidate";

const sha =
  process.env.NEXT_PUBLIC_GIT_SHA ||
  process.env.VERCEL_GIT_COMMIT_SHA ||
  process.env.GITHUB_SHA ||
  "local";

console.log("\n=== NARA RELEASE INFO ===\n");
console.log(`Version : ${version}`);
console.log(`Channel : ${channel}`);
console.log(`Build   : ${String(sha).slice(0, 8)}`);
console.log(`Node    : ${process.version}`);
console.log("\n=========================\n");
