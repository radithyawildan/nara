# NARA Knowledge / RAG v1.1

Adds:

- richer Knowledge Center document management
- document search
- delete confirmation
- Processing / Ready / Failed status
- chunk/page/character metadata
- source passage preview
- re-index embeddings from stored chunks
- per-response clickable [K1] source chips
- development RAG retrieval inspector with threshold/similarity

## Apply

1. Extract this ZIP into the NARA repo root with overwrite enabled.
2. Run:

```powershell
node scripts\apply-knowledge-rag-v11.mjs
```

3. Run migration `supabase/migrations/20260904161000_knowledge_rag_v11.sql` in Supabase SQL Editor.
4. Validate:

```powershell
pnpm format
pnpm lint
pnpm typecheck
pnpm memory:eval
pnpm build
```

No new npm dependency is required for v1.1.
