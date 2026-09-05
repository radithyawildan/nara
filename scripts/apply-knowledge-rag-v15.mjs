import fs from "node:fs";

function fail(message) {
  console.error(`❌ ${message}`);
  process.exit(1);
}

console.log("\n=== NARA Knowledge / RAG v1.5 Citation Integrity ===\n");

for (const path of [
  "lib/knowledge/citations.ts",
  "scripts/evaluate-knowledge-citations.ts",
]) {
  if (!fs.existsSync(path)) {
    fail(`Missing patch file: ${path}`);
  }
}

// 1) Register regression gate.
{
  const path = "package.json";
  const packageJson = JSON.parse(fs.readFileSync(path, "utf8"));
  packageJson.scripts ??= {};
  packageJson.scripts["knowledge:citations"] =
    "tsx scripts/evaluate-knowledge-citations.ts";
  fs.writeFileSync(path, `${JSON.stringify(packageJson, null, 2)}\n`, "utf8");
  console.log("✅ knowledge:citations quality gate registered");
}

// 2) Reconcile the final streamed answer before state/persistence/TTS.
{
  const path = "features/chat/nara-shell.tsx";
  let source = fs.readFileSync(path, "utf8");

  if (!source.includes('from "@/lib/knowledge/citations"')) {
    const anchor = 'from "@/lib/conversations/persistence";';
    const index = source.indexOf(anchor);

    if (index === -1) {
      fail(
        "Conversation persistence import anchor not found in nara-shell.tsx.",
      );
    }

    const insertAt = index + anchor.length;
    source =
      source.slice(0, insertAt) +
      '\nimport { reconcileKnowledgeCitations } from "@/lib/knowledge/citations";' +
      source.slice(insertAt);
  }

  if (
    !source.includes("const citationIntegrity = reconcileKnowledgeCitations(")
  ) {
    const assistantObjectPattern =
      /\s+const assistantMessage: ConversationMessage = \{\s+id: assistantId,\s+role: "assistant",\s+content: assistantContent,\s+createdAt: assistantCreatedAt,\s+knowledgeCitations: responseKnowledgeSources,\s+\};/m;
    const match = source.match(assistantObjectPattern);

    if (!match) {
      fail("Final assistantMessage with knowledge citations was not found.");
    }

    const replacement = `
      const citationIntegrity = reconcileKnowledgeCitations(
        assistantContent,
        responseKnowledgeSources,
      );

      assistantContent = citationIntegrity.content;
      responseKnowledgeSources = citationIntegrity.citations;

      setKnowledgeSources(citationIntegrity.citations);

      setMessages((current) =>
        current.map((message) =>
          message.id === assistantId
            ? {
                ...message,
                content: citationIntegrity.content,
                knowledgeCitations: citationIntegrity.citations,
              }
            : message,
        ),
      );

      if (process.env.NODE_ENV === "development") {
        if (citationIntegrity.invalidCitationIds.length > 0) {
          console.warn(
            "[NARA] Removed invalid knowledge citation markers:",
            citationIntegrity.invalidCitationIds,
          );
        }

        if (citationIntegrity.retrievedButUncited) {
          console.warn(
            "[NARA] Knowledge sources were retrieved but the final response did not cite them.",
            citationIntegrity.unusedRetrievedIds,
          );
        }
      }

      const assistantMessage: ConversationMessage = {
        id: assistantId,
        role: "assistant",
        content: citationIntegrity.content,
        createdAt: assistantCreatedAt,
        knowledgeCitations: citationIntegrity.citations,
      };`;

    source = source.replace(match[0], replacement);
  }

  fs.writeFileSync(path, source, "utf8");
  console.log(
    "✅ final responses reconcile citation markers before persistence",
  );
  console.log(
    "✅ assistant bubbles receive validated citation metadata immediately",
  );
  console.log(
    "✅ invalid citation markers are removed before TTS/history save",
  );
}

console.log("\n✅ Knowledge / RAG v1.5 citation integrity patch applied.\n");
