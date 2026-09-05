import fs from "node:fs";

const path = "features/chat/nara-shell.tsx";
let source = fs.readFileSync(path, "utf8");

console.log("\n=== NARA Knowledge / RAG v1 Shell Patch ===\n");

function requireAnchor(anchor, label) {
  if (!source.includes(anchor)) {
    console.error(`❌ ${label} not found.`);
    process.exit(1);
  }
}

if (!source.includes('from "@/features/knowledge/knowledge-center"')) {
  const anchor =
    'import { MemoryCenter } from "@/features/memory/memory-center";';
  requireAnchor(anchor, "MemoryCenter import");
  source = source.replace(
    anchor,
    `${anchor}\nimport { KnowledgeCenter } from "@/features/knowledge/knowledge-center";`,
  );
  console.log("✅ KnowledgeCenter import");
}

if (!source.includes("function KnowledgeIcon()")) {
  const anchor = "function MemoryIcon() {";
  requireAnchor(anchor, "MemoryIcon function");

  const knowledgeIcon = `function KnowledgeIcon() {
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
      <path d="M5 4.5A2.5 2.5 0 0 1 7.5 2H19v17H7.5A2.5 2.5 0 0 0 5 21.5V4.5Z" />
      <path d="M5 4.5A2.5 2.5 0 0 0 2.5 7v12A2.5 2.5 0 0 0 5 21.5" />
      <path d="M9 7h6M9 11h6" />
    </svg>
  );
}

`;

  source = source.replace(anchor, knowledgeIcon + anchor);
  console.log("✅ Knowledge icon");
}

if (!source.includes("setKnowledgeCenterOpen")) {
  const anchor =
    "  const [memoryCenterOpen, setMemoryCenterOpen] = useState(false);";
  requireAnchor(anchor, "memoryCenterOpen state");
  source = source.replace(
    anchor,
    `${anchor}\n\n  const [knowledgeCenterOpen, setKnowledgeCenterOpen] = useState(false);`,
  );
  console.log("✅ Knowledge Center state");
}

function addCloseAfter(anchor) {
  const replacement = `${anchor}\n    setKnowledgeCenterOpen(false);`;
  if (source.includes(replacement)) {
    return;
  }
  requireAnchor(anchor, `close anchor: ${anchor.trim()}`);
  source = source.replace(anchor, replacement);
}

addCloseAfter("    setMemoryCenterOpen(false);");

const headerMemoryAnchor = `            <button
              type="button"
              disabled={!persistenceAvailable}
              onClick={() => {
                setSettingsOpen(false);

                setMemoryCenterOpen(true);
              }}
              aria-label="Open Memory Center"`;

if (!source.includes('aria-label="Open Knowledge Center"')) {
  requireAnchor(headerMemoryAnchor, "header Memory button");

  const knowledgeButton = `            <button
              type="button"
              disabled={!persistenceAvailable}
              onClick={() => {
                setSettingsOpen(false);
                setMemoryCenterOpen(false);
                setKnowledgeCenterOpen(true);
              }}
              aria-label="Open Knowledge Center"
              className="grid h-9 w-9 place-items-center rounded-full border border-white/[0.08] bg-white/[0.035] text-slate-400 transition hover:border-cyan-400/20 hover:bg-cyan-400/[0.08] hover:text-white disabled:opacity-30"
            >
              <KnowledgeIcon />
            </button>

`;

  source = source.replace(
    headerMemoryAnchor,
    knowledgeButton + headerMemoryAnchor,
  );
  console.log("✅ Knowledge header button");
}

const memoryOpenSnippet = `                setSettingsOpen(false);

                setMemoryCenterOpen(true);`;

if (
  source.includes(memoryOpenSnippet) &&
  !source.includes(
    `setKnowledgeCenterOpen(false);\n\n                setMemoryCenterOpen(true);`,
  )
) {
  source = source.replaceAll(
    memoryOpenSnippet,
    `                setSettingsOpen(false);\n                setKnowledgeCenterOpen(false);\n\n                setMemoryCenterOpen(true);`,
  );
}

const settingsOpenSnippet = `                setMemoryCenterOpen(false);

                setSettingsOpen((current) => !current);`;

if (source.includes(settingsOpenSnippet)) {
  source = source.replace(
    settingsOpenSnippet,
    `                setMemoryCenterOpen(false);\n                setKnowledgeCenterOpen(false);\n\n                setSettingsOpen((current) => !current);`,
  );
}

if (!source.includes("<KnowledgeCenter")) {
  const anchor = "      <MemoryDebugInspector debug={memoryDebug} />";
  requireAnchor(anchor, "MemoryDebugInspector render");

  source = source.replace(
    anchor,
    `      <KnowledgeCenter
        open={knowledgeCenterOpen}
        onClose={() => setKnowledgeCenterOpen(false)}
      />

${anchor}`,
  );
  console.log("✅ Knowledge Center rendered");
}

fs.writeFileSync(path, source, "utf8");
console.log("\n✅ Knowledge / RAG v1 shell patch applied.\n");
