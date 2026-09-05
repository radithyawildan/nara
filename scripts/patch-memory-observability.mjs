import fs from "node:fs";

const path = "features/chat/nara-shell.tsx";

let source = fs.readFileSync(path, "utf8");

console.log("\n=== NARA Memory v0.8 Shell Patch ===\n");

/*
 * Imports
 */
if (!source.includes('from "@/features/memory/memory-debug-inspector"')) {
  const anchor =
    'import { MemoryCenter } from "@/features/memory/memory-center";';

  if (!source.includes(anchor)) {
    console.error("❌ MemoryCenter import not found.");

    process.exit(1);
  }

  source = source.replace(
    anchor,
    `${anchor}
import { MemoryDebugInspector } from "@/features/memory/memory-debug-inspector";`,
  );

  console.log("✅ inspector component import");
}

if (!source.includes('from "@/types/memory-debug"')) {
  const importLocation = source.indexOf(
    "import type",
    source.indexOf('from "@/types/memory"') + 1,
  );

  const insertion = `import type {
  MemoryRetrievalDebug,
} from "@/types/memory-debug";

`;

  if (importLocation !== -1) {
    source =
      source.slice(0, importLocation) +
      insertion +
      source.slice(importLocation);
  } else {
    const componentIndex = source.indexOf("export function NaraShell");

    source =
      source.slice(0, componentIndex) +
      insertion +
      source.slice(componentIndex);
  }

  console.log("✅ memory debug type import");
}

/*
 * State
 */
if (!source.includes("setMemoryDebug")) {
  const stateAnchor = "  const [memories,";

  const start = source.indexOf(stateAnchor);

  if (start === -1) {
    console.error("❌ memories state not found.");

    process.exit(1);
  }

  const semicolon = source.indexOf(";", start);

  if (semicolon === -1) {
    console.error("❌ memories state terminator not found.");

    process.exit(1);
  }

  const state = `

  const [
    memoryDebug,
    setMemoryDebug,
  ] =
    useState<MemoryRetrievalDebug | null>(
      null,
    );`;

  source = source.slice(0, semicolon + 1) + state + source.slice(semicolon + 1);

  console.log("✅ memory debug state");
}

/*
 * Capture response header after
 * the /api/chat fetch.
 */
if (!source.includes("X-NARA-Memory-Debug")) {
  const chatIndex = source.indexOf('"/api/chat"');

  if (chatIndex === -1) {
    console.error("❌ /api/chat fetch not found.");

    process.exit(1);
  }

  const responseCheck = source.indexOf("if (!response.ok)", chatIndex);

  if (responseCheck === -1) {
    console.error("❌ response status check not found.");

    process.exit(1);
  }

  const capture = `const encodedMemoryDebug =
        response.headers.get(
          "X-NARA-Memory-Debug",
        );

      if (encodedMemoryDebug) {
        try {
          const parsedMemoryDebug =
            JSON.parse(
              decodeURIComponent(
                encodedMemoryDebug,
              ),
            ) as MemoryRetrievalDebug;

          setMemoryDebug(
            parsedMemoryDebug,
          );
        } catch (error) {
          console.warn(
            "[NARA] Could not parse memory debug metadata:",
            error,
          );

          setMemoryDebug(
            null,
          );
        }
      } else {
        setMemoryDebug(null);
      }

      `;

  source =
    source.slice(0, responseCheck) + capture + source.slice(responseCheck);

  console.log("✅ memory debug response capture");
}

/*
 * Clear debug on new chat.
 */
const newChatStart = source.indexOf("function handleNewChat()");

const selectConversationStart = source.indexOf(
  "async function handleSelectConversation",
  newChatStart,
);

if (newChatStart !== -1 && selectConversationStart !== -1) {
  let block = source.slice(newChatStart, selectConversationStart);

  if (!block.includes("setMemoryDebug(null)")) {
    const candidateAnchor = "setMemoryCandidate(null);";

    if (block.includes(candidateAnchor)) {
      block = block.replace(
        candidateAnchor,
        `${candidateAnchor}
    setMemoryDebug(null);`,
      );

      source =
        source.slice(0, newChatStart) +
        block +
        source.slice(selectConversationStart);

      console.log("✅ clear debug on new conversation");
    }
  }
}

/*
 * Render inspector before MemoryCenter.
 */
if (!source.includes("<MemoryDebugInspector")) {
  const renderAnchor = source.lastIndexOf("<MemoryCenter");

  if (renderAnchor === -1) {
    console.error("❌ MemoryCenter render not found.");

    process.exit(1);
  }

  const inspector = `<MemoryDebugInspector
        debug={memoryDebug}
      />

      `;

  source =
    source.slice(0, renderAnchor) + inspector + source.slice(renderAnchor);

  console.log("✅ memory inspector rendered");
}

fs.writeFileSync(path, source, "utf8");

console.log("\n✅ Memory v0.8 shell patch applied.\n");
