# NARA Knowledge / RAG v1.2

Adds two durability features on top of v1.1:

- **Original private document storage** in a Supabase Storage bucket (`knowledge-files`).
  - New uploads keep the original PDF/TXT/Markdown privately.
  - Source preview can create a short-lived signed URL and open the original document.
  - Deleting a knowledge document also attempts to remove the original file.
- **Persistent citations per assistant message** via `messages.knowledge_citations` JSONB.
  - Citation metadata survives refresh/history loading.
  - The latest sourced assistant response restores the source tray after opening a saved conversation.

Existing documents indexed before v1.2 do not have an original file. Re-upload them if you want the **Open original** action.

## Apply

1. Extract the ZIP into the NARA repository root with overwrite enabled.
2. Run:

```powershell
node scripts\apply-knowledge-rag-v12.mjs
```

3. Run migration:

`supabase/migrations/20260904163000_knowledge_storage_and_persistent_citations.sql`

4. Validate:

```powershell
pnpm format
pnpm lint
pnpm typecheck
pnpm memory:eval
pnpm build
```
