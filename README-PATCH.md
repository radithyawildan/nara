# NARA Conversation Intelligence Mega Pack v1.1–v1.3

This combines several planned patches into one milestone.

## Included

### v1.1 — Persistent Rolling Summary

- `conversations.context_summary`
- refreshes automatically after enough new messages
- survives reload/device changes
- Gemini-generated state when available
- deterministic fallback if Gemini summarization fails

### v1.2 — Topic State

- current topic
- locked decisions
- open loops
- durable user goals

### v1.3 — Conversation Context Inspector

- development-only inspector
- rolling-summary preview
- topic state
- summary message count
- automatic refresh event

### Integration

- `/api/chat` now receives `conversationId`
- persistent context joins Personality + Memory + Knowledge context
- existing Conversation Intelligence v1 compaction remains active
- no service-role key needed

## Apply

```powershell
Expand-Archive `
  -Path "$HOME\Downloads\nara-conversation-megapack-v1.1-v1.3.zip" `
  -DestinationPath . `
  -Force

node scripts\apply-conversation-megapack.mjs
```

## Migration

Copy and run:

```powershell
Get-Content `
  supabase\migrations\20260904222000_conversation_rolling_context.sql `
  -Raw | Set-Clipboard
```

## Validate

```powershell
pnpm format
pnpm lint
pnpm typecheck
pnpm memory:eval
pnpm knowledge:eval
pnpm knowledge:citations
pnpm personality:eval
pnpm conversation:eval
pnpm conversation:state
pnpm build
```

## Runtime

On a saved thread, the rolling state refreshes every 8 new persisted messages.
In development, use **Context debug** to inspect the state.

No extra database table is required; the state lives on `public.conversations`.
