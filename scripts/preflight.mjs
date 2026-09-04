/* eslint-disable @typescript-eslint/no-unused-expressions */
import fs from "node:fs";
import path from "node:path";

const cwd = process.cwd();

function parseEnvFile(filePath) {
  if (!fs.existsSync(filePath)) {
    return {};
  }

  const output = {};

  for (const rawLine of fs.readFileSync(filePath, "utf8").split(/\r?\n/)) {
    const line = rawLine.trim();

    if (!line || line.startsWith("#")) {
      continue;
    }

    const equalIndex = line.indexOf("=");

    if (equalIndex === -1) {
      continue;
    }

    const key = line.slice(0, equalIndex).trim();
    let value = line.slice(equalIndex + 1).trim();

    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }

    output[key] = value;
  }

  return output;
}

const local = parseEnvFile(path.join(cwd, ".env.local"));
const example = parseEnvFile(path.join(cwd, ".env.example"));
const env = {
  ...process.env,
  ...local,
};

let failures = 0;
let warnings = 0;

function pass(message) {
  console.log(`✅ ${message}`);
}

function warn(message) {
  warnings += 1;
  console.log(`⚠️  ${message}`);
}

function fail(message) {
  failures += 1;
  console.log(`❌ ${message}`);
}

function has(name) {
  return Boolean(String(env[name] ?? "").trim());
}

function placeholder(value) {
  const normalized = String(value ?? "")
    .trim()
    .toLowerCase();

  return (
    !normalized ||
    normalized.includes("<") ||
    normalized.includes("your_") ||
    normalized.includes("example") ||
    normalized === "changeme"
  );
}

console.log("\n=== NARA PRE-RELEASE PREFLIGHT ===\n");

const provider = String(env.NARA_AI_PROVIDER || "gemini").toLowerCase();

if (provider === "mock") {
  warn("NARA_AI_PROVIDER is mock; use a production provider before release.");
} else if (provider === "openai") {
  has("OPENAI_API_KEY")
    ? pass("OpenAI provider credential configured")
    : fail("OPENAI_API_KEY is missing");
} else {
  has("GEMINI_API_KEY")
    ? pass("Gemini provider credential configured")
    : fail("GEMINI_API_KEY is missing");
}

has("NEXT_PUBLIC_SUPABASE_URL")
  ? pass("Supabase URL configured")
  : fail("NEXT_PUBLIC_SUPABASE_URL is missing");

has("NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY") ||
has("NEXT_PUBLIC_SUPABASE_ANON_KEY")
  ? pass("Supabase browser key configured")
  : fail(
      "NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY or NEXT_PUBLIC_SUPABASE_ANON_KEY is missing",
    );

if (
  fs.existsSync(path.join(cwd, "app/api/account/delete/route.ts")) ||
  fs.existsSync(path.join(cwd, "app/api/account/merge/route.ts"))
) {
  has("SUPABASE_SECRET_KEY") || has("SUPABASE_SERVICE_ROLE_KEY")
    ? pass("Server-only Supabase admin credential configured")
    : fail(
        "Account admin routes exist but SUPABASE_SECRET_KEY / SUPABASE_SERVICE_ROLE_KEY is missing",
      );
}

has("NEXT_PUBLIC_SITE_URL")
  ? pass("NEXT_PUBLIC_SITE_URL configured")
  : warn("NEXT_PUBLIC_SITE_URL is not configured yet");

const forbiddenPublicSecrets = Object.keys(env).filter(
  (key) =>
    key.startsWith("NEXT_PUBLIC_") &&
    /(secret|service_role|private|api_key)/i.test(key),
);

forbiddenPublicSecrets.length === 0
  ? pass("No obviously server-only secret names are exposed as NEXT_PUBLIC_*")
  : fail(
      `Potential public secret variable(s): ${forbiddenPublicSecrets.join(", ")}`,
    );

const sensitiveExampleKeys = Object.entries(example).filter(
  ([key, value]) =>
    /(secret|service_role|api_key|password)/i.test(key) && !placeholder(value),
);

sensitiveExampleKeys.length === 0
  ? pass(".env.example does not appear to contain live secret values")
  : fail(
      `.env.example may contain non-placeholder secret value(s): ${sensitiveExampleKeys
        .map(([key]) => key)
        .join(", ")}`,
    );

for (const requiredFile of [
  "app/api/chat/route.ts",
  "lib/ai/provider-factory.ts",
  "lib/memory/server.ts",
  "lib/knowledge/server.ts",
  "features/chat/nara-shell.tsx",
]) {
  fs.existsSync(path.join(cwd, requiredFile))
    ? pass(`${requiredFile} present`)
    : fail(`${requiredFile} missing`);
}

console.log("\n========================================");
console.log(`Failures: ${failures}`);
console.log(`Warnings: ${warnings}`);
console.log("========================================\n");

if (failures > 0) {
  process.exit(1);
}

console.log("✅ NARA pre-release preflight passed.");
