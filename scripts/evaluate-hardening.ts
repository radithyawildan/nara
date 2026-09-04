import { getRequestClientKey, takeRateLimit } from "../lib/security/rate-limit";
import {
  CHAT_MAX_BODY_BYTES,
  readJsonWithLimit,
  RequestBodyTooLargeError,
} from "../lib/security/request";

async function main() {
  let passed = 0;
  let total = 0;

  function check(name: string, success: boolean, detail: string) {
    total += 1;

    if (success) {
      passed += 1;
    }

    console.log(`${success ? "✅" : "❌"} ${name}`);
    console.log(`   ${detail}\n`);
  }

  console.log("\n=== NARA RELEASE HARDENING EVALUATION ===\n");

  const request = new Request("https://nara.local/api/chat", {
    headers: {
      "x-forwarded-for": "203.0.113.10, 10.0.0.2",
    },
  });

  check(
    "Client fingerprint uses first forwarded address",
    getRequestClientKey(request) === "203.0.113.10",
    getRequestClientKey(request),
  );

  const first = takeRateLimit("eval-client", {
    limit: 2,
    windowMs: 60_000,
  });
  const second = takeRateLimit("eval-client", {
    limit: 2,
    windowMs: 60_000,
  });
  const third = takeRateLimit("eval-client", {
    limit: 2,
    windowMs: 60_000,
  });

  check(
    "Rate limiter blocks requests after configured limit",
    first.allowed && second.allowed && !third.allowed,
    `first=${first.allowed}, second=${second.allowed}, third=${third.allowed}`,
  );

  const validRequest = new Request("https://nara.local/api/chat", {
    method: "POST",
    headers: {
      "content-type": "application/json",
    },
    body: JSON.stringify({
      messages: [{ role: "user", content: "hello" }],
    }),
  });

  const validBody = await readJsonWithLimit(validRequest, CHAT_MAX_BODY_BYTES);

  check(
    "Bounded JSON reader accepts normal chat payload",
    Boolean(validBody && typeof validBody === "object"),
    "normal JSON parsed",
  );

  let oversizedBlocked = false;

  try {
    const oversizedRequest = new Request("https://nara.local/api/chat", {
      method: "POST",
      headers: {
        "content-type": "application/json",
      },
      body: JSON.stringify({
        data: "x".repeat(8_000),
      }),
    });

    await readJsonWithLimit(oversizedRequest, 1_000);
  } catch (error) {
    oversizedBlocked = error instanceof RequestBodyTooLargeError;
  }

  check(
    "Bounded JSON reader rejects oversized payload",
    oversizedBlocked,
    `blocked=${oversizedBlocked}`,
  );

  const percentage = Math.round((passed / total) * 100);

  console.log("========================================");
  console.log(`Result: ${passed}/${total} passed (${percentage}%)`);
  console.log("========================================\n");

  if (passed !== total) {
    console.error("❌ NARA release hardening quality gate failed.");
    process.exit(1);
  }

  console.log("✅ NARA release hardening passed the quality gate.");
}

void main().catch((error) => {
  console.error("❌ NARA hardening evaluator crashed:", error);
  process.exit(1);
});
