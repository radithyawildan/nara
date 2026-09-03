import fs from "node:fs";

const path = "features/chat/nara-shell.tsx";

let source = fs.readFileSync(path, "utf8");

function replaceOnce(search, replacement, label) {
  if (!source.includes(search)) {
    console.error(`❌ Patch anchor not found: ${label}`);

    process.exit(1);
  }

  source = source.replace(search, replacement);

  console.log(`✅ ${label}`);
}

replaceOnce(
  'import { MemoryCenter } from "@/features/memory/memory-center";',
  `import { MemoryCenter } from "@/features/memory/memory-center";
import { MemorySuggestionCard } from "@/features/memory/memory-suggestion-card";`,
  "Memory suggestion component import",
);

replaceOnce(
  '} from "@/lib/memory/client";',
  `} from "@/lib/memory/client";
import {
  detectMemoryCandidate,
  type MemoryCandidate,
} from "@/lib/memory/candidate";`,
  "Memory candidate detector import",
);

replaceOnce(
  "  const [memories, setMemories] = useState<NaraMemory[]>([]);",
  `  const [memories, setMemories] = useState<NaraMemory[]>([]);

  const [memoryCandidate, setMemoryCandidate] =
    useState<MemoryCandidate | null>(null);

  const [
    isSavingMemoryCandidate,
    setIsSavingMemoryCandidate,
  ] = useState(false);`,
  "Memory candidate state",
);

replaceOnce(
  "  async function handleSubmit(",
  `  async function handleAcceptMemoryCandidate() {
    const candidate =
      memoryCandidate;

    if (!candidate) {
      return;
    }

    const duplicate =
      memories.some(
        (memory) =>
          memory.content
            .trim()
            .toLowerCase() ===
          candidate.content
            .trim()
            .toLowerCase(),
      );

    if (duplicate) {
      setMemoryCandidate(null);
      return;
    }

    setIsSavingMemoryCandidate(
      true,
    );

    try {
      await handleCreateMemory(
        candidate.content,
        candidate.category,
      );

      setMemoryCandidate(null);
    } finally {
      setIsSavingMemoryCandidate(
        false,
      );
    }
  }

  async function handleSubmit(`,
  "Memory candidate save handler",
);

replaceOnce(
  "    const userMessage: ConversationMessage =",
  `    const candidate =
      explicitMemory
        ? null
        : detectMemoryCandidate(
            normalizedContent,
          );

    setMemoryCandidate(
      candidate,
    );

    const userMessage: ConversationMessage =`,
  "Memory detection on user message",
);

replaceOnce(
  '                <div className="shrink-0 border-t border-white/[0.06] pb-4 pt-4">',
  `                {memoryCandidate && (
                  <MemorySuggestionCard
                    candidate={
                      memoryCandidate
                    }
                    saving={
                      isSavingMemoryCandidate
                    }
                    disabled={
                      isGenerating ||
                      isConversationLoading
                    }
                    onSave={() => {
                      void handleAcceptMemoryCandidate();
                    }}
                    onDismiss={() =>
                      setMemoryCandidate(
                        null,
                      )
                    }
                  />
                )}

                <div className="shrink-0 border-t border-white/[0.06] pb-4 pt-4">`,
  "Memory suggestion UI",
);

const newChatStart = source.indexOf("  function handleNewChat() {");

const newChatEnd = source.indexOf(
  "  async function handleSelectConversation",
  newChatStart,
);

if (newChatStart === -1 || newChatEnd === -1) {
  console.error("❌ Could not locate handleNewChat.");

  process.exit(1);
}

let newChatBlock = source.slice(newChatStart, newChatEnd);

if (!newChatBlock.includes("    setMemoryCenterOpen(false);")) {
  console.error("❌ New chat memory anchor not found.");

  process.exit(1);
}

newChatBlock = newChatBlock.replace(
  "    setMemoryCenterOpen(false);",
  `    setMemoryCenterOpen(false);
    setMemoryCandidate(null);`,
);

source =
  source.slice(0, newChatStart) + newChatBlock + source.slice(newChatEnd);

console.log("✅ Clear suggestion on new conversation");

fs.writeFileSync(path, source, "utf8");

console.log("\\n✅ Memory Intelligence v0.4 patch applied.");
