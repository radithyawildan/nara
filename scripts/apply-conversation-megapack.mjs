import fs from "node:fs";

const shellPath = "features/chat/nara-shell.tsx";
const routePath = "app/api/chat/route.ts";
const packagePath = "package.json";

let shell = fs.readFileSync(shellPath, "utf8");
let route = fs.readFileSync(routePath, "utf8");
const packageJson = JSON.parse(fs.readFileSync(packagePath, "utf8"));

console.log("\n=== NARA Conversation Intelligence Mega Pack v1.1-v1.3 ===\n");

/* -------------------------------------------------------------------------- */
/* Chat route: import persistent context                                      */
/* -------------------------------------------------------------------------- */

if (!route.includes("@/lib/conversations/context-server")) {
  const importAnchor =
    'import { getPersonalityInstructions } from "@/lib/personality/server";';

  if (route.includes(importAnchor)) {
    route = route.replace(
      importAnchor,
      `${importAnchor}\nimport { getPersistentConversationContext } from "@/lib/conversations/context-server";`,
    );
  } else {
    const firstImportEnd = route.indexOf("\n", route.indexOf("from "));
    route =
      route.slice(0, firstImportEnd + 1) +
      'import { getPersistentConversationContext } from "@/lib/conversations/context-server";\n' +
      route.slice(firstImportEnd + 1);
  }

  console.log("✅ persistent conversation context import");
}

/* -------------------------------------------------------------------------- */
/* Chat route: optional conversation id                                       */
/* -------------------------------------------------------------------------- */

if (!route.includes("conversationId: z.string().uuid().optional()")) {
  const maxPatterns = [".max(160),", ".max(40),"];

  const anchor = maxPatterns.find((candidate) => route.includes(candidate));

  if (!anchor) {
    throw new Error(
      "Could not find message-array max() guard in /api/chat route.",
    );
  }

  route = route.replace(
    anchor,
    `${anchor}\n    conversationId: z.string().uuid().optional(),`,
  );

  console.log("✅ /api/chat accepts optional conversationId");
}

/* -------------------------------------------------------------------------- */
/* Chat route: load durable context                                           */
/* -------------------------------------------------------------------------- */

if (!route.includes("const persistentConversationInstructions =")) {
  const anchor =
    "const personalityInstructions =\n      await getPersonalityInstructions();";

  const compactAnchor =
    "const personalityInstructions = await getPersonalityInstructions();";

  const selectedAnchor = route.includes(anchor)
    ? anchor
    : route.includes(compactAnchor)
      ? compactAnchor
      : null;

  if (!selectedAnchor) {
    throw new Error(
      "Personality instruction anchor not found in /api/chat route.",
    );
  }

  route = route.replace(
    selectedAnchor,
    `${selectedAnchor}

    const persistentConversationInstructions =
      result.data.conversationId
        ? await getPersistentConversationContext(
            result.data.conversationId,
          )
        : undefined;`,
  );

  console.log("✅ durable conversation context loaded");
}

if (
  !route.includes(
    "personalityInstructions,\n              persistentConversationInstructions,",
  )
) {
  const personalityArrayEntry = /personalityInstructions,\s*\n/;

  if (!personalityArrayEntry.test(route)) {
    throw new Error(
      "Could not find personalityInstructions inside additionalInstructions array.",
    );
  }

  route = route.replace(
    personalityArrayEntry,
    "personalityInstructions,\n              persistentConversationInstructions,\n",
  );

  console.log("✅ durable context merged into adaptive prompt");
}

/* -------------------------------------------------------------------------- */
/* Shell: inspector import                                                    */
/* -------------------------------------------------------------------------- */

if (!shell.includes("@/features/debug/conversation-context-inspector")) {
  const candidates = [
    'import { AdaptiveContextInspector } from "@/features/debug/adaptive-context-inspector";',
    'import { MemoryDebugInspector } from "@/features/memory/memory-debug-inspector";',
  ];

  const anchor = candidates.find((candidate) => shell.includes(candidate));

  if (!anchor) {
    throw new Error("Could not find a safe debug-inspector import anchor.");
  }

  shell = shell.replace(
    anchor,
    `${anchor}\nimport { ConversationContextInspector } from "@/features/debug/conversation-context-inspector";`,
  );

  console.log("✅ ConversationContextInspector import");
}

/* -------------------------------------------------------------------------- */
/* Shell: send conversation id to /api/chat                                   */
/* -------------------------------------------------------------------------- */

if (!shell.includes("messages: requestMessages,\n          conversationId,")) {
  const bodyPattern = /messages:\s*requestMessages,\s*\n(\s*)\}\),/;

  if (!bodyPattern.test(shell)) {
    throw new Error("Could not find /api/chat JSON body in NaraShell.");
  }

  shell = shell.replace(
    bodyPattern,
    (match, indent) =>
      `messages: requestMessages,\n          conversationId,\n${indent}}),`,
  );

  console.log("✅ active conversation id sent to /api/chat");
}

/* -------------------------------------------------------------------------- */
/* Shell: background rolling-context refresh                                  */
/* -------------------------------------------------------------------------- */

if (!shell.includes("/api/conversations/refresh-context")) {
  const refreshAnchor = "await refreshConversationHistory();";

  if (!shell.includes(refreshAnchor)) {
    throw new Error(
      "Could not find conversation-history refresh anchor in NaraShell.",
    );
  }

  const refreshBlock = `${refreshAnchor}

        void fetch("/api/conversations/refresh-context", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            conversationId,
          }),
        })
          .then(async (contextResponse) => {
            if (!contextResponse.ok) {
              return;
            }

            const contextPayload = (await contextResponse.json()) as {
              refreshed?: boolean;
            };

            if (contextPayload.refreshed) {
              window.dispatchEvent(
                new CustomEvent(
                  "nara:conversation-context-updated",
                ),
              );
            }
          })
          .catch((contextError) => {
            console.warn(
              "[NARA] Background conversation context refresh unavailable:",
              contextError,
            );
          });`;

  shell = shell.replace(refreshAnchor, refreshBlock);

  console.log("✅ automatic rolling-context refresh connected");
}

/* -------------------------------------------------------------------------- */
/* Shell: render inspector                                                    */
/* -------------------------------------------------------------------------- */

if (!shell.includes("<ConversationContextInspector")) {
  const renderCandidates = [
    "<AdaptiveContextInspector",
    "<MemoryDebugInspector",
    "<PersonalityCenter",
  ];

  const anchor = renderCandidates.find((candidate) =>
    shell.includes(candidate),
  );

  if (!anchor) {
    throw new Error("Could not find a safe inspector render anchor.");
  }

  shell = shell.replace(
    anchor,
    `<ConversationContextInspector
        conversationId={activeConversationId}
      />

      ${anchor}`,
  );

  console.log("✅ conversation context inspector rendered");
}

packageJson.scripts = {
  ...packageJson.scripts,
  "conversation:state": "tsx scripts/evaluate-conversation-state.ts",
};

fs.writeFileSync(shellPath, shell, "utf8");
fs.writeFileSync(routePath, route, "utf8");
fs.writeFileSync(
  packagePath,
  `${JSON.stringify(packageJson, null, 2)}\n`,
  "utf8",
);

console.log("✅ conversation:state quality gate registered");

console.log("\n✅ Conversation Intelligence Mega Pack v1.1-v1.3 applied.\n");
