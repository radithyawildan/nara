# NARA Conversation Intelligence v1

Adds:

- long-thread context compaction
- lightweight token-budget estimation
- deterministic earlier-conversation continuity summary
- recent-message preservation
- larger API history envelope (up to 160 messages)
- development compaction logs
- `pnpm conversation:eval` regression gate
- no database migration

The first version intentionally does not call an extra LLM just to summarize
history. That keeps latency/cost predictable. A later version can persist a
model-generated rolling summary if needed.

Apply:

```powershell
Expand-Archive `
  -Path "$HOME\Downloads\nara-conversation-intelligence-v1-patch.zip" `
  -DestinationPath . `
  -Force

node scripts\apply-conversation-intelligence-v1.mjs
```

Validate:

```powershell
pnpm format
pnpm lint
pnpm typecheck
pnpm memory:eval
pnpm knowledge:eval
pnpm knowledge:citations
pnpm personality:eval
pnpm conversation:eval
pnpm build
```
