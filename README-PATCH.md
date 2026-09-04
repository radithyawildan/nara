# NARA Knowledge / RAG v1.5 — Citation Integrity

This patch adds a deterministic citation guard after the streamed assistant answer completes.

## What changes

- Only source markers actually used in the final answer are persisted with the assistant message.
- Hallucinated markers such as `[K99]` are removed when they were not part of retrieval.
- Citation IDs are normalized (`[k1]` → `[K1]`).
- Repeated source markers keep one citation metadata record.
- Assistant bubble citation chips are updated immediately after streaming, not only after history reload.
- Development logs flag cases where sources were retrieved but the model cited none of them.
- Adds `pnpm knowledge:citations` regression tests.

No Supabase migration is required.

## Apply

```powershell
Expand-Archive `
  -Path "$HOME\Downloads\nara-rag-v1.5-patch.zip" `
  -DestinationPath . `
  -Force

node scripts\apply-knowledge-rag-v15.mjs
```

## Validate

```powershell
pnpm format
pnpm lint
pnpm typecheck
pnpm memory:eval
pnpm knowledge:eval
pnpm knowledge:citations
pnpm build
```
