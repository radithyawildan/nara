# NARA Knowledge / RAG v1 patch

This patch adds:

- PDF/TXT/Markdown upload
- text extraction and chunking
- Gemini embeddings at 768 dimensions
- Supabase pgvector storage
- authenticated/RLS-protected knowledge documents
- semantic chunk retrieval
- source-grounded chat context using inline markers such as [K1]
- Knowledge Center UI for upload/list/delete

## Apply

From the NARA repository root:

```powershell
pnpm add unpdf
Expand-Archive -Path "$HOME\Downloads\nara-rag-v1-patch.zip" -DestinationPath . -Force
node scripts\apply-knowledge-rag-v1.mjs
pnpm format
pnpm lint
pnpm typecheck
pnpm memory:eval
pnpm build
```

Before runtime testing, apply this SQL migration to the same Supabase project used by NARA:

`supabase/migrations/20260904150000_create_knowledge_rag.sql`

Quick clipboard command:

```powershell
Get-Content supabase\migrations\20260904150000_create_knowledge_rag.sql -Raw | Set-Clipboard
```

Then run:

```powershell
pnpm dev
```

Open Knowledge in the NARA header, upload a PDF/TXT/MD document, wait for Ready, then ask a question that can only be answered from the file. The response should cite retrieved passages with markers such as `[K1]`.
