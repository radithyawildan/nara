import fs from "node:fs";

const path = "features/chat/nara-shell.tsx";
let source = fs.readFileSync(path, "utf8");

console.log("\n=== NARA Knowledge / RAG v1.1 Shell Patch ===\n");

function requireAnchor(anchor, label) {
  if (!source.includes(anchor)) {
    console.error(`❌ ${label} not found.`);
    process.exit(1);
  }
}

if (!source.includes('from "@/features/knowledge/knowledge-source-tray"')) {
  const anchor =
    'import { KnowledgeCenter } from "@/features/knowledge/knowledge-center";';
  requireAnchor(anchor, "KnowledgeCenter import");
  source = source.replace(
    anchor,
    `${anchor}\nimport { KnowledgeSourceTray } from "@/features/knowledge/knowledge-source-tray";`,
  );
  console.log("✅ KnowledgeSourceTray import");
}

if (!source.includes('from "@/types/knowledge"')) {
  const anchor =
    'import type { MemoryCategory, NaraMemory } from "@/types/memory";';
  requireAnchor(anchor, "memory type import");
  source = source.replace(
    anchor,
    `${anchor}\nimport type { KnowledgeCitation, KnowledgeRetrievalDebug } from "@/types/knowledge";`,
  );
  console.log("✅ knowledge types import");
}

if (!source.includes("setKnowledgeSources")) {
  const anchor = `  const [memoryDebug, setMemoryDebug] = useState<MemoryRetrievalDebug | null>(
    null,
  );`;
  requireAnchor(anchor, "memoryDebug state");

  source = source.replace(
    anchor,
    `${anchor}\n\n  const [knowledgeSources, setKnowledgeSources] = useState<KnowledgeCitation[]>([]);\n\n  const [knowledgeDebug, setKnowledgeDebug] = useState<KnowledgeRetrievalDebug | null>(null);`,
  );
  console.log("✅ knowledge retrieval state");
}

if (!source.includes("X-NARA-Knowledge-Sources")) {
  const anchor = `      const encodedMemoryDebug = response.headers.get("X-NARA-Memory-Debug");`;
  requireAnchor(anchor, "memory debug response header");

  const capture = `      const encodedKnowledgeSources = response.headers.get(
        "X-NARA-Knowledge-Sources",
      );

      if (encodedKnowledgeSources) {
        try {
          setKnowledgeSources(
            JSON.parse(
              decodeURIComponent(encodedKnowledgeSources),
            ) as KnowledgeCitation[],
          );
        } catch (error) {
          console.warn("[NARA] Could not parse knowledge citations:", error);
          setKnowledgeSources([]);
        }
      } else {
        setKnowledgeSources([]);
      }

      const encodedKnowledgeDebug = response.headers.get(
        "X-NARA-Knowledge-Debug",
      );

      if (encodedKnowledgeDebug) {
        try {
          setKnowledgeDebug(
            JSON.parse(
              decodeURIComponent(encodedKnowledgeDebug),
            ) as KnowledgeRetrievalDebug,
          );
        } catch (error) {
          console.warn("[NARA] Could not parse knowledge debug metadata:", error);
          setKnowledgeDebug(null);
        }
      } else {
        setKnowledgeDebug(null);
      }

`;

  source = source.replace(anchor, capture + anchor);
  console.log("✅ knowledge response headers captured");
}

function addClearToBlock(startAnchor, endAnchor, label) {
  const start = source.indexOf(startAnchor);
  if (start === -1) {
    console.error(`❌ ${label} start not found.`);
    process.exit(1);
  }

  const end = source.indexOf(endAnchor, start);
  if (end === -1) {
    console.error(`❌ ${label} end not found.`);
    process.exit(1);
  }

  let block = source.slice(start, end);
  if (block.includes("setKnowledgeSources([])")) {
    return;
  }

  const anchor = "    setMemoryDebug(null);";
  if (!block.includes(anchor)) {
    console.error(`❌ ${label} clear anchor not found.`);
    process.exit(1);
  }

  block = block.replace(
    anchor,
    `${anchor}\n    setKnowledgeSources([]);\n    setKnowledgeDebug(null);`,
  );

  source = source.slice(0, start) + block + source.slice(end);
  console.log(`✅ ${label} clears knowledge metadata`);
}

addClearToBlock(
  "  function handleNewChat() {",
  "  async function handleRenameConversation(",
  "new chat",
);

const selectStart = source.indexOf(
  "  async function handleSelectConversation(",
);
if (selectStart !== -1) {
  const busyAnchor = "    setErrorMessage(null);";
  const blockEnd = source.indexOf("  const isBusy =", selectStart);
  if (blockEnd !== -1) {
    let block = source.slice(selectStart, blockEnd);
    if (!block.includes("setKnowledgeSources([])")) {
      requireAnchor(busyAnchor, "select conversation reset anchor");
      block = block.replace(
        busyAnchor,
        `${busyAnchor}\n    setKnowledgeSources([]);\n    setKnowledgeDebug(null);`,
      );
      source = source.slice(0, selectStart) + block + source.slice(blockEnd);
      console.log("✅ conversation switch clears knowledge metadata");
    }
  }
}

if (!source.includes("<KnowledgeSourceTray")) {
  const anchor = `                <div className="shrink-0 border-t border-white/[0.06] pb-4 pt-4">`;
  requireAnchor(anchor, "composer container");

  source = source.replace(
    anchor,
    `                <KnowledgeSourceTray\n                  sources={knowledgeSources}\n                  debug={knowledgeDebug}\n                />\n\n${anchor}`,
  );
  console.log("✅ source tray rendered");
}

fs.writeFileSync(path, source, "utf8");
console.log("\n✅ Knowledge / RAG v1.1 shell patch applied.\n");
