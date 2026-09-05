import fs from "node:fs";

const path = "features/chat/nara-shell.tsx";

let source = fs.readFileSync(path, "utf8");

console.log("\n=== NARA Conversation Management v1 ===\n");

/*
 * Conversation persistence import.
 */
const importPattern =
  /import\s*\{([^}]*)\}\s*from\s*"@\/lib\/conversations\/persistence";/;

const importMatch = source.match(importPattern);

if (!importMatch) {
  console.error("❌ Conversation persistence import not found.");

  process.exit(1);
}

const imports = importMatch[1]
  .split(",")
  .map((item) => item.trim())
  .filter(Boolean);

for (const name of ["deleteConversation", "renameConversation"]) {
  if (!imports.includes(name)) {
    imports.push(name);
  }
}

source = source.replace(
  importPattern,
  `import {
  ${imports.join(",\n  ")},
} from "@/lib/conversations/persistence";`,
);

console.log("✅ persistence actions imported");

/*
 * Management handlers.
 */
if (!source.includes("async function handleRenameConversation(")) {
  const anchor =
    "  async function handleSelectConversation(conversationId: string) {";

  const index = source.indexOf(anchor);

  if (index === -1) {
    console.error("❌ handleSelectConversation anchor not found.");

    process.exit(1);
  }

  const handlers = `  async function handleRenameConversation(
    conversationId: string,
    title: string,
  ) {
    setErrorMessage(null);

    try {
      const updatedConversation =
        await renameConversation(
          conversationId,
          title,
        );

      if (!updatedConversation) {
        return;
      }

      setConversations(
        (current) => [
          updatedConversation,
          ...current.filter(
            (conversation) =>
              conversation.id !==
              conversationId,
          ),
        ],
      );
    } catch (error) {
      console.error(
        "[NARA] Failed to rename conversation:",
        error,
      );

      throw error;
    }
  }

  async function handleDeleteConversation(
    conversationId: string,
  ) {
    setErrorMessage(null);

    try {
      await deleteConversation(
        conversationId,
      );

      const remainingConversations =
        conversations.filter(
          (conversation) =>
            conversation.id !==
            conversationId,
        );

      setConversations(
        remainingConversations,
      );

      if (
        conversationId !==
        activeConversationId
      ) {
        return;
      }

      setActiveConversationId(null);
      setMessages([]);
      setMemoryCandidate(null);
      setMemoryDebug(null);

      dispatch({
        type: "RESET",
      });

      const fallbackConversation =
        remainingConversations[0];

      if (!fallbackConversation) {
        return;
      }

      setIsConversationLoading(true);

      try {
        const storedMessages =
          await loadConversationMessages(
            fallbackConversation.id,
          );

        setActiveConversationId(
          fallbackConversation.id,
        );

        setMessages(storedMessages);
      } catch (loadError) {
        console.error(
          "[NARA] Failed to load fallback conversation:",
          loadError,
        );

        setErrorMessage(
          "Conversation deleted, but the next conversation could not be loaded.",
        );
      } finally {
        setIsConversationLoading(
          false,
        );
      }
    } catch (error) {
      console.error(
        "[NARA] Failed to delete conversation:",
        error,
      );

      throw error;
    }
  }

`;

  source = source.slice(0, index) + handlers + source.slice(index);

  console.log("✅ rename/delete handlers added");
}

/*
 * NaraSidebar props.
 */
const sidebarStart = source.indexOf("<NaraSidebar");

if (sidebarStart === -1) {
  console.error("❌ NaraSidebar render not found.");

  process.exit(1);
}

const sidebarEnd = source.indexOf("/>", sidebarStart);

if (sidebarEnd === -1) {
  console.error("❌ NaraSidebar closing tag not found.");

  process.exit(1);
}

let sidebarBlock = source.slice(sidebarStart, sidebarEnd + 2);

if (!sidebarBlock.includes("onRenameConversation=")) {
  const selectionAnchor =
    "              onSelectConversation={(conversationId) => {";

  if (!sidebarBlock.includes(selectionAnchor)) {
    console.error("❌ Sidebar selection prop anchor not found.");

    process.exit(1);
  }

  sidebarBlock = sidebarBlock.replace(
    selectionAnchor,
    `              onRenameConversation={
                handleRenameConversation
              }
              onDeleteConversation={
                handleDeleteConversation
              }
${selectionAnchor}`,
  );

  source =
    source.slice(0, sidebarStart) + sidebarBlock + source.slice(sidebarEnd + 2);

  console.log("✅ sidebar management props connected");
}

fs.writeFileSync(path, source, "utf8");

console.log("\n✅ Conversation Management v1 patch applied.\n");
