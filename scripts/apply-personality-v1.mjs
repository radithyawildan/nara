import fs from "node:fs";

const shellPath = "features/chat/nara-shell.tsx";
const chatRoutePath = "app/api/chat/route.ts";

let shell = fs.readFileSync(shellPath, "utf8");
let route = fs.readFileSync(chatRoutePath, "utf8");

console.log("\n=== NARA Personality & Adaptive Context v1 ===\n");

/* -------------------------------------------------------------------------- */
/* Shell import                                                               */
/* -------------------------------------------------------------------------- */

if (!shell.includes("@/features/personality/personality-center")) {
  const candidates = [
    'import { AccountCenter } from "@/features/account/account-center";',
    'import { MemoryCenter } from "@/features/memory/memory-center";',
  ];

  const anchor = candidates.find((candidate) => shell.includes(candidate));

  if (!anchor) {
    throw new Error(
      "Could not find a safe component import anchor in NaraShell.",
    );
  }

  shell = shell.replace(
    anchor,
    `${anchor}\nimport { PersonalityCenter } from "@/features/personality/personality-center";`,
  );

  console.log("✅ PersonalityCenter import");
}

/* -------------------------------------------------------------------------- */
/* Shell state                                                                */
/* -------------------------------------------------------------------------- */

if (!shell.includes("personalityCenterOpen")) {
  const candidates = [
    "const [accountCenterOpen, setAccountCenterOpen] = useState(false);",
    "const [memoryCenterOpen, setMemoryCenterOpen] = useState(false);",
  ];

  const anchor = candidates.find((candidate) => shell.includes(candidate));

  if (!anchor) {
    throw new Error("Could not find modal state anchor in NaraShell.");
  }

  shell = shell.replace(
    anchor,
    `${anchor}\n\n  const [personalityCenterOpen, setPersonalityCenterOpen] = useState(false);`,
  );

  console.log("✅ Personality Center state");
}

/* -------------------------------------------------------------------------- */
/* Icon                                                                       */
/* -------------------------------------------------------------------------- */

if (!shell.includes("function PersonalityIcon()")) {
  const componentIndex = shell.indexOf("export function NaraShell()");

  if (componentIndex === -1) {
    throw new Error("NaraShell component declaration not found.");
  }

  const icon = `function PersonalityIcon() {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      className="h-4 w-4"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <circle cx="12" cy="12" r="8" />
      <path d="M8.5 10h.01" />
      <path d="M15.5 10h.01" />
      <path d="M8.5 15c1.1 1 2.25 1.5 3.5 1.5s2.4-.5 3.5-1.5" />
      <path d="M12 4V2" />
      <path d="m18 6 1.4-1.4" />
    </svg>
  );
}

`;

  shell = shell.slice(0, componentIndex) + icon + shell.slice(componentIndex);

  console.log("✅ Personality icon");
}

/* -------------------------------------------------------------------------- */
/* Header button                                                              */
/* -------------------------------------------------------------------------- */

if (!shell.includes('aria-label="Open Personality Center"')) {
  const settingsAnchor =
    '<button\n              type="button"\n              aria-label="Open voice settings"';

  const settingsIndex = shell.indexOf(settingsAnchor);

  if (settingsIndex === -1) {
    throw new Error("Voice settings button anchor not found.");
  }

  const button = `            <button
              type="button"
              aria-label="Open Personality Center"
              aria-expanded={personalityCenterOpen}
              onClick={() => {
                setSettingsOpen(false);
                setMemoryCenterOpen(false);

                if (typeof setKnowledgeCenterOpen === "function") {
                  setKnowledgeCenterOpen(false);
                }

                if (typeof setAccountCenterOpen === "function") {
                  setAccountCenterOpen(false);
                }

                setPersonalityCenterOpen(true);
              }}
              className="grid h-9 w-9 place-items-center rounded-full border border-white/[0.08] bg-white/[0.035] text-slate-400 transition hover:border-violet-400/20 hover:bg-violet-400/[0.08] hover:text-white"
            >
              <PersonalityIcon />
            </button>

`;

  /*
   * Avoid typeof checks on lexical variables if they don't exist:
   * strip unavailable setter calls based on source presence.
   */
  let safeButton = button;

  if (!shell.includes("setKnowledgeCenterOpen")) {
    safeButton = safeButton.replace(
      /\n\s*if \(typeof setKnowledgeCenterOpen === "function"\) \{\s*setKnowledgeCenterOpen\(false\);\s*\}/,
      "",
    );
  } else {
    safeButton = safeButton.replace(
      `                if (typeof setKnowledgeCenterOpen === "function") {
                  setKnowledgeCenterOpen(false);
                }
`,
      `                setKnowledgeCenterOpen(false);
`,
    );
  }

  if (!shell.includes("setAccountCenterOpen")) {
    safeButton = safeButton.replace(
      /\n\s*if \(typeof setAccountCenterOpen === "function"\) \{\s*setAccountCenterOpen\(false\);\s*\}/,
      "",
    );
  } else {
    safeButton = safeButton.replace(
      `                if (typeof setAccountCenterOpen === "function") {
                  setAccountCenterOpen(false);
                }
`,
      `                setAccountCenterOpen(false);
`,
    );
  }

  shell =
    shell.slice(0, settingsIndex) + safeButton + shell.slice(settingsIndex);

  console.log("✅ Personality header button");
}

/* -------------------------------------------------------------------------- */
/* Render modal                                                               */
/* -------------------------------------------------------------------------- */

if (!shell.includes("<PersonalityCenter")) {
  const closingMainIndex = shell.lastIndexOf("</main>");

  if (closingMainIndex === -1) {
    throw new Error("</main> not found in NaraShell.");
  }

  const modal = `      <PersonalityCenter
        open={personalityCenterOpen}
        onClose={() => setPersonalityCenterOpen(false)}
      />

`;

  shell =
    shell.slice(0, closingMainIndex) + modal + shell.slice(closingMainIndex);

  console.log("✅ Personality Center rendered");
}

/* -------------------------------------------------------------------------- */
/* Chat route import                                                          */
/* -------------------------------------------------------------------------- */

if (!route.includes("@/lib/personality/server")) {
  const importAnchor = route.lastIndexOf('from "@/');

  if (importAnchor === -1) {
    throw new Error("Could not find import section in /api/chat route.");
  }

  const lineEnd = route.indexOf("\n", importAnchor);

  route =
    route.slice(0, lineEnd + 1) +
    'import { getPersonalityInstructions } from "@/lib/personality/server";\n' +
    route.slice(lineEnd + 1);

  console.log("✅ personality server import");
}

/* -------------------------------------------------------------------------- */
/* Chat route personality instructions                                        */
/* -------------------------------------------------------------------------- */

if (!route.includes("const personalityInstructions =")) {
  const conversationPatterns = [
    "const conversation =",
    "const stream = streamConversation(",
  ];

  const candidatePositions = conversationPatterns
    .map((pattern) => ({
      pattern,
      index: route.indexOf(pattern),
    }))
    .filter((item) => item.index !== -1)
    .sort((a, b) => a.index - b.index);

  const candidate = candidatePositions[0];

  if (!candidate) {
    throw new Error(
      "Could not find streamConversation preparation in chat route.",
    );
  }

  route =
    route.slice(0, candidate.index) +
    `const personalityInstructions =
      await getPersonalityInstructions();

    ` +
    route.slice(candidate.index);

  console.log("✅ personality instructions loaded");
}

/*
 * Inject personality into existing additionalInstructions expression.
 * Handles the common one-expression property produced by Prettier.
 */
if (!route.includes("personalityInstructions,\n")) {
  const propertyPattern = /additionalInstructions:\s*([^,\n]+),/;

  const match = route.match(propertyPattern);

  if (!match) {
    throw new Error(
      "additionalInstructions property shape was not recognized. No route changes were written.",
    );
  }

  const existing = match[1].trim();

  route = route.replace(
    propertyPattern,
    `additionalInstructions:
            [
              personalityInstructions,
              ${existing},
            ]
              .filter(
                (value): value is string =>
                  Boolean(value),
              )
              .join("\\n\\n") ||
            undefined,`,
  );

  console.log("✅ personality merged into adaptive instructions");
}

fs.writeFileSync(shellPath, shell, "utf8");
fs.writeFileSync(chatRoutePath, route, "utf8");

console.log("\n✅ Personality & Adaptive Context v1 patch applied.\n");
