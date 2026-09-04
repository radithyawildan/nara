import fs from "node:fs";

function parseEnv(file) {
  if (!fs.existsSync(file)) {
    return {};
  }

  const result = {};

  for (const rawLine of fs.readFileSync(file, "utf8").split(/\r?\n/)) {
    const line = rawLine.trim();

    if (!line || line.startsWith("#")) {
      continue;
    }

    const index = line.indexOf("=");

    if (index === -1) {
      continue;
    }

    const key = line.slice(0, index).trim();
    let value = line.slice(index + 1).trim();

    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }

    result[key] = value;
  }

  return result;
}

const env = {
  ...process.env,
  ...parseEnv(".env.local"),
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

console.log("\n=== NARA DEPLOYMENT DOCTOR ===\n");

const siteUrl = String(env.NEXT_PUBLIC_SITE_URL || "").trim();

if (!siteUrl) {
  warn("NEXT_PUBLIC_SITE_URL is not set.");
} else {
  try {
    const parsed = new URL(siteUrl);

    if (parsed.protocol !== "https:") {
      warn("NEXT_PUBLIC_SITE_URL is not HTTPS.");
    } else {
      pass("Site URL uses HTTPS");
    }

    if (parsed.hostname === "localhost" || parsed.hostname === "127.0.0.1") {
      warn("Site URL still points to localhost.");
    } else {
      pass(`Deployment hostname: ${parsed.hostname}`);
    }
  } catch {
    fail("NEXT_PUBLIC_SITE_URL is not a valid absolute URL.");
  }
}

const releaseChannel = String(
  env.NEXT_PUBLIC_NARA_RELEASE_CHANNEL || "",
).trim();

if (releaseChannel) {
  pass(`Release channel: ${releaseChannel}`);
} else {
  warn("NEXT_PUBLIC_NARA_RELEASE_CHANNEL is not set.");
}

const releaseVersion = String(env.NEXT_PUBLIC_NARA_VERSION || "").trim();

if (releaseVersion) {
  pass(`Release version: ${releaseVersion}`);
} else {
  warn("NEXT_PUBLIC_NARA_VERSION is not set.");
}

const requiredRoutes = [
  "app/api/health/route.ts",
  "app/api/version/route.ts",
  "app/api/diagnostics/route.ts",
  "app/opengraph-image.tsx",
  "app/manifest.ts",
  "app/robots.ts",
];

for (const file of requiredRoutes) {
  if (fs.existsSync(file)) {
    pass(`${file} present`);
  } else {
    fail(`${file} missing`);
  }
}

if (fs.existsSync("supabase/migrations")) {
  const migrations = fs
    .readdirSync("supabase/migrations")
    .filter((file) => file.endsWith(".sql"));

  if (migrations.length > 0) {
    pass(`${migrations.length} Supabase migration(s) present`);
  } else {
    warn("No Supabase SQL migrations found in repository.");
  }
} else {
  warn("supabase/migrations directory is missing.");
}

console.log("\n========================================");
console.log(`Failures: ${failures}`);
console.log(`Warnings: ${warnings}`);
console.log("========================================\n");

if (failures > 0) {
  process.exit(1);
}

console.log("✅ NARA deployment doctor passed.");
