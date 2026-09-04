# NARA Release / Security Hardening Mega Pack

This is the core-development closing pack.

## Included

- bounded `/api/chat` JSON request body (512 KiB)
- basic in-memory chat rate limit (30 req/min/client)
- 413 / 415 / 429 API responses
- safe runtime readiness endpoint
- baseline HTTP security headers
- focus-visible accessibility
- reduced-motion support
- improved runtime-status accessibility
- sanitized logger utility
- PWA manifest metadata route
- robots metadata route
- polished 404 surface
- `.env.local` / `.env.example` pre-release checks
- secret-name audit
- required-project-file audit
- `pnpm hardening:eval`
- generated `pnpm release:check`

The rate limiter is intentionally a baseline guard. In multi-instance/serverless
production, replace it with a distributed store such as Redis/Upstash or an
edge/platform rate-limit product.

## Apply

```powershell
Expand-Archive `
  -Path "$HOME\Downloads\nara-release-hardening-megapack.zip" `
  -DestinationPath . `
  -Force

node scripts\apply-release-hardening.mjs
```

## Environment

Recommended production variable:

```env
NEXT_PUBLIC_SITE_URL=https://your-nara-domain.example
```

Do not put Gemini, OpenAI, Supabase secret/service-role keys behind
`NEXT_PUBLIC_`.

## Validate

```powershell
pnpm format
pnpm lint
pnpm typecheck
pnpm hardening:eval
pnpm preflight
pnpm release:check
```

`release:check` is composed automatically from the quality gates available in
the current repository and ends with `pnpm build`.
