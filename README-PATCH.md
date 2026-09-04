# NARA UX / Product Completion Mega Pack

Combines several product-facing milestones:

- first-run onboarding
- mobile conversation history drawer
- searchable mobile history
- Control Center for Voice / Personality / Memory / Knowledge / Account
- Ctrl/⌘ K quick actions
- keyboard shortcuts
- actual runtime online/offline status
- `/api/health`
- route loading state
- route error recovery UI
- UX regression gate (`pnpm ux:eval`)
- no database migration

## Apply

```powershell
Expand-Archive `
  -Path "$HOME\Downloads\nara-ux-product-completion-megapack.zip" `
  -DestinationPath . `
  -Force

node scripts\apply-ux-product-completion.mjs
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
pnpm ux:eval
pnpm build
```

## Runtime checks

- first clean browser profile shows onboarding once
- mobile/tablet shows history button
- Ctrl/⌘ K opens quick actions
- Ctrl/⌘ Shift N creates a new conversation
- Ctrl/⌘ Shift H opens history
- Ctrl/⌘ , opens Control Center
- runtime badge reflects `/api/health`
