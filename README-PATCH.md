# NARA Deployment + Visual Polish Mega Pack

This pack moves NARA from release-candidate foundation into deployable product
polish.

Included:

- offline connectivity banner
- visible release/version watermark
- dynamic Open Graph image
- app icon
- PWA manifest icons
- global visual polish
- mobile safe-area handling
- refined scrollbars and selection
- GitHub Actions CI
- deployment doctor
- post-deploy verification checklist
- deployment doctor included in `release:check`

No Supabase migration is required.

## Apply

```powershell
Expand-Archive `
  -Path "$HOME\Downloads\nara-deployment-visual-polish-megapack.zip" `
  -DestinationPath . `
  -Force

node scripts\apply-deployment-visual-polish.mjs
```

## Validate

```powershell
pnpm format
pnpm lint
pnpm typecheck
pnpm deployment:doctor
pnpm release:check
```

`deployment:doctor` may warn about `NEXT_PUBLIC_SITE_URL` until a real deployment
domain is configured.
