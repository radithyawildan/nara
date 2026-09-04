import fs from "node:fs";

const chatPath = "app/api/chat/route.ts";
const configPath = "next.config.ts";
const cssPath = "app/globals.css";
const packagePath = "package.json";

let chat = fs.readFileSync(chatPath, "utf8");
let config = fs.readFileSync(configPath, "utf8");
let css = fs.readFileSync(cssPath, "utf8");
const packageJson = JSON.parse(fs.readFileSync(packagePath, "utf8"));

console.log("\n=== NARA Release / Security Hardening Mega Pack ===\n");

/* -------------------------------------------------------------------------- */
/* Chat security imports                                                      */
/* -------------------------------------------------------------------------- */

if (!chat.includes("@/lib/security/rate-limit")) {
  const anchorCandidates = [
    'import { getPersonalityInstructions } from "@/lib/personality/server";',
    'import { getPersistentConversationContext } from "@/lib/conversations/context-server";',
  ];

  const anchor = anchorCandidates.find((candidate) => chat.includes(candidate));

  if (!anchor) {
    throw new Error("Could not find a safe /api/chat import anchor.");
  }

  chat = chat.replace(
    anchor,
    `${anchor}
import {
  getRequestClientKey,
  rateLimitHeaders,
  takeRateLimit,
} from "@/lib/security/rate-limit";
import {
  CHAT_MAX_BODY_BYTES,
  readJsonWithLimit,
  RequestBodyTooLargeError,
  UnsupportedMediaTypeError,
} from "@/lib/security/request";`,
  );

  console.log("✅ chat security imports");
}

/* -------------------------------------------------------------------------- */
/* Chat request rate limit                                                    */
/* -------------------------------------------------------------------------- */

if (!chat.includes("const chatRateLimit = takeRateLimit(")) {
  const postPattern = /export async function POST\(request: Request\) \{\s*/;

  if (!postPattern.test(chat)) {
    throw new Error("POST(request: Request) anchor not found in /api/chat.");
  }

  chat = chat.replace(
    postPattern,
    `export async function POST(request: Request) {
  const chatRateLimit = takeRateLimit(
    \`chat:\${getRequestClientKey(request)}\`,
    {
      limit: 30,
      windowMs: 60_000,
    },
  );

  if (!chatRateLimit.allowed) {
    return Response.json(
      {
        error: "Too many chat requests. Please retry shortly.",
      },
      {
        status: 429,
        headers: rateLimitHeaders(chatRateLimit),
      },
    );
  }

  `,
  );

  console.log("✅ basic chat rate limiting");
}

/* -------------------------------------------------------------------------- */
/* Bounded JSON parsing                                                       */
/* -------------------------------------------------------------------------- */

if (!chat.includes("readJsonWithLimit(request, CHAT_MAX_BODY_BYTES)")) {
  const parsePattern =
    /try \{\s*body = await request\.json\(\);\s*\} catch \{\s*return Response\.json\(\s*\{\s*error: "Invalid JSON body\.",\s*\},\s*\{\s*status: 400,\s*\},\s*\);\s*\}/;

  if (!parsePattern.test(chat)) {
    throw new Error(
      "The JSON parsing block in /api/chat differs from the expected shape.",
    );
  }

  chat = chat.replace(
    parsePattern,
    `try {
    body = await readJsonWithLimit(
      request,
      CHAT_MAX_BODY_BYTES,
    );
  } catch (error) {
    if (error instanceof RequestBodyTooLargeError) {
      return Response.json(
        {
          error: "Chat request body is too large.",
        },
        {
          status: 413,
        },
      );
    }

    if (error instanceof UnsupportedMediaTypeError) {
      return Response.json(
        {
          error: "Expected application/json.",
        },
        {
          status: 415,
        },
      );
    }

    return Response.json(
      {
        error: "Invalid JSON body.",
      },
      {
        status: 400,
      },
    );
  }`,
  );

  console.log("✅ bounded chat JSON request parsing");
}

/* -------------------------------------------------------------------------- */
/* Next security headers                                                      */
/* -------------------------------------------------------------------------- */

if (
  !config.includes("X-Content-Type-Options") &&
  !config.includes("async headers()")
) {
  const objectPattern = /(const\s+nextConfig(?::\s*NextConfig)?\s*=\s*\{\s*)/;

  if (!objectPattern.test(config)) {
    console.log(
      "⚠️ next.config.ts shape is custom; automatic security-header insertion skipped.",
    );
  } else {
    config = config.replace(
      objectPattern,
      `$1
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          {
            key: "X-Content-Type-Options",
            value: "nosniff",
          },
          {
            key: "X-Frame-Options",
            value: "DENY",
          },
          {
            key: "Referrer-Policy",
            value: "strict-origin-when-cross-origin",
          },
          {
            key: "Permissions-Policy",
            value:
              "camera=(self), microphone=(self), geolocation=()",
          },
          {
            key: "X-DNS-Prefetch-Control",
            value: "off",
          },
        ],
      },
    ];
  },

`,
    );

    console.log("✅ baseline HTTP security headers");
  }
} else if (config.includes("X-Content-Type-Options")) {
  console.log("✅ baseline HTTP security headers already present");
} else {
  console.log(
    "⚠️ next.config.ts already defines headers(); merge the NARA security headers manually if needed.",
  );
}

/* -------------------------------------------------------------------------- */
/* Accessibility / motion safety                                              */
/* -------------------------------------------------------------------------- */

const cssMarker = "/* NARA release accessibility hardening */";

if (!css.includes(cssMarker)) {
  css += `

${cssMarker}
:where(button, a, input, textarea, select, [tabindex]):focus-visible {
  outline: 2px solid currentColor;
  outline-offset: 3px;
}

@media (prefers-reduced-motion: reduce) {
  html {
    scroll-behavior: auto !important;
  }

  *,
  *::before,
  *::after {
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.01ms !important;
    scroll-behavior: auto !important;
  }
}
`;

  console.log("✅ focus visibility + reduced-motion safety");
}

/* -------------------------------------------------------------------------- */
/* Scripts                                                                    */
/* -------------------------------------------------------------------------- */

packageJson.scripts = {
  ...packageJson.scripts,
  preflight: "node scripts/preflight.mjs",
  "hardening:eval": "tsx scripts/evaluate-hardening.ts",
};

const preferredQualityGates = [
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

const available = preferredQualityGates.filter(
  (script) => packageJson.scripts[script],
);

packageJson.scripts["release:check"] = available
  .map((script) => `pnpm ${script}`)
  .join(" && ");

fs.writeFileSync(chatPath, chat, "utf8");
fs.writeFileSync(configPath, config, "utf8");
fs.writeFileSync(cssPath, css, "utf8");
fs.writeFileSync(
  packagePath,
  `${JSON.stringify(packageJson, null, 2)}\n`,
  "utf8",
);

console.log("✅ preflight + hardening quality gates");
console.log(
  `✅ release:check composed from ${available.length} available gates`,
);

console.log("\n✅ Release / Security Hardening Mega Pack applied.\n");
