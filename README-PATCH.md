# NARA Adaptive Context v1.1

Adds:

- Personality quick presets
- Explicit context conflict-resolution hierarchy
- Development-only Adaptive Context Inspector
- `pnpm personality:eval` regression gate
- No database migration

Apply:

```powershell
Expand-Archive `
  -Path "$HOME\Downloads\nara-personality-v1.1-patch.zip" `
  -DestinationPath . `
  -Force

node scripts\apply-personality-v11.mjs
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
pnpm build
```
