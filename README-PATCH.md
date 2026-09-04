# NARA Personality & Adaptive Context v1

Adds:

- user-configurable NARA personality profile
- tone, language, verbosity, initiative, code style, emoji preference
- Supabase Auth user_metadata persistence
- server-side adaptive personality prompt
- Personality Center UI
- no database migration required

Apply from repository root:

```powershell
Expand-Archive `
  -Path "$HOME\Downloads\nara-personality-v1-patch.zip" `
  -DestinationPath . `
  -Force

node scripts\apply-personality-v1.mjs
```

Then:

```powershell
pnpm format
pnpm lint
pnpm typecheck
pnpm memory:eval
pnpm knowledge:eval
pnpm knowledge:citations
pnpm build
```
