import fs from "node:fs";

function fail(message) {
  console.error(`❌ ${message}`);
  process.exit(1);
}

console.log("\n=== NARA Knowledge / RAG v1.2 Patch ===\n");

// 1) Conversation message type: persist knowledge citations per assistant message.
{
  const path = "types/conversation.ts";
  let source = fs.readFileSync(path, "utf8");

  if (!source.includes('from "@/types/knowledge"')) {
    source = `import type { KnowledgeCitation } from "@/types/knowledge";\n\n${source}`;
  }

  if (!source.includes("knowledgeCitations?: KnowledgeCitation[]")) {
    const anchor = "  createdAt: string;\n}";
    if (!source.includes(anchor))
      fail("ConversationMessage type anchor not found.");
    source = source.replace(
      anchor,
      "  createdAt: string;\n  knowledgeCitations?: KnowledgeCitation[];\n}",
    );
  }

  fs.writeFileSync(path, source, "utf8");
  console.log("✅ conversation messages can persist citations");
}

// 2) Conversation persistence: read/write citation JSONB.
{
  const path = "lib/conversations/persistence.ts";
  let source = fs.readFileSync(path, "utf8");

  if (!source.includes('from "@/types/knowledge"')) {
    const anchor = 'from "@/types/conversation";';
    const idx = source.indexOf(anchor);
    if (idx === -1) fail("Conversation type import not found in persistence.");
    const end = idx + anchor.length;
    source = `${source.slice(0, end)}\nimport type { KnowledgeCitation } from "@/types/knowledge";${source.slice(end)}`;
  }

  if (!source.includes("knowledge_citations:")) {
    const messageInterface = /interface MessageRow \{([\s\S]*?)\n\}/;
    const match = source.match(messageInterface);
    if (!match) fail("MessageRow interface not found.");

    const replacement = match[0].replace(
      /\n\}/,
      "\n  knowledge_citations: KnowledgeCitation[] | null;\n}",
    );
    source = source.replace(match[0], replacement);
  }

  source = source.replaceAll(
    'select("id,role,content,created_at")',
    'select("id,role,content,created_at,knowledge_citations")',
  );

  if (!source.includes("knowledgeCitations: row.knowledge_citations")) {
    const anchor = "    createdAt: row.created_at,\n  }));";
    if (!source.includes(anchor))
      fail("Loaded message mapping anchor not found.");
    source = source.replace(
      anchor,
      "    createdAt: row.created_at,\n    knowledgeCitations: row.knowledge_citations ?? [],\n  }));",
    );
  }

  if (!source.includes("knowledge_citations: message.knowledgeCitations")) {
    const anchor = "    created_at: message.createdAt,\n  });";
    if (!source.includes(anchor)) fail("Message upsert anchor not found.");
    source = source.replace(
      anchor,
      "    created_at: message.createdAt,\n    knowledge_citations: message.knowledgeCitations ?? [],\n  });",
    );
  }

  fs.writeFileSync(path, source, "utf8");
  console.log("✅ persistence reads/writes citation metadata");
}

// 3) Shell: capture citations locally, attach to assistant message, restore on history load.
{
  const path = "features/chat/nara-shell.tsx";
  let source = fs.readFileSync(path, "utf8");

  if (!source.includes("function getLatestKnowledgeCitations(")) {
    const anchor = "function extractExplicitMemory(content: string) {";
    const idx = source.indexOf(anchor);
    if (idx === -1) fail("extractExplicitMemory helper not found.");

    const helper = `function getLatestKnowledgeCitations(\n  messages: ConversationMessage[],\n) {\n  return (\n    [...messages]\n      .reverse()\n      .find(\n        (message) =>\n          message.role === "assistant" &&\n          (message.knowledgeCitations?.length ?? 0) > 0,\n      )?.knowledgeCitations ?? []\n  );\n}\n\n`;

    source = source.slice(0, idx) + helper + source.slice(idx);
  }

  // Restore source tray whenever stored messages are loaded.
  source = source.replace(
    /^(\s*)setMessages\(storedMessages\);(?![\s\S]{0,160}getLatestKnowledgeCitations\(storedMessages\))/gm,
    (_match, indent) =>
      `${indent}setMessages(storedMessages);\n${indent}setKnowledgeSources(getLatestKnowledgeCitations(storedMessages));\n${indent}setKnowledgeDebug(null);`,
  );

  // Introduce a local citation snapshot for this specific streamed response.
  const responseAnchor =
    '      const encodedKnowledgeSources = response.headers.get(\n        "X-NARA-Knowledge-Sources",\n      );';
  if (
    source.includes(responseAnchor) &&
    !source.includes("let responseKnowledgeSources")
  ) {
    source = source.replace(
      responseAnchor,
      `      let responseKnowledgeSources: KnowledgeCitation[] = [];\n\n${responseAnchor}`,
    );
  }

  // Replace v1.1 parse block so state and local snapshot stay in sync.
  const oldParse = `          setKnowledgeSources(\n            JSON.parse(\n              decodeURIComponent(encodedKnowledgeSources),\n            ) as KnowledgeCitation[],\n          );`;
  if (source.includes(oldParse)) {
    source = source.replace(
      oldParse,
      `          const parsedKnowledgeSources = JSON.parse(\n            decodeURIComponent(encodedKnowledgeSources),\n          ) as KnowledgeCitation[];\n\n          responseKnowledgeSources = parsedKnowledgeSources;\n          setKnowledgeSources(parsedKnowledgeSources);`,
    );
  }

  // Attach citations to the final assistant message that is persisted.
  if (!source.includes("knowledgeCitations: responseKnowledgeSources")) {
    const anchor = `      const assistantMessage: ConversationMessage = {\n        id: assistantId,\n        role: "assistant",\n        content: assistantContent,\n        createdAt: assistantCreatedAt,\n      };`;
    if (!source.includes(anchor))
      fail("Final assistantMessage object not found.");
    source = source.replace(
      anchor,
      `      const assistantMessage: ConversationMessage = {\n        id: assistantId,\n        role: "assistant",\n        content: assistantContent,\n        createdAt: assistantCreatedAt,\n        knowledgeCitations: responseKnowledgeSources,\n      };`,
    );
  }

  fs.writeFileSync(path, source, "utf8");
  console.log("✅ shell persists and restores knowledge citations");
}

console.log("\n✅ Knowledge / RAG v1.2 dynamic patch applied.\n");
