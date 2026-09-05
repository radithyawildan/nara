# NARA Deployment Guide

## Required environment variables

```env
NARA_AI_PROVIDER=gemini
GEMINI_API_KEY=
GEMINI_MODEL=gemini-3.5-flash-lite
GEMINI_EMBEDDING_MODEL=gemini-embedding-2

NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=

SUPABASE_SECRET_KEY=

NEXT_PUBLIC_SITE_URL=https://your-domain.example
NEXT_PUBLIC_NARA_VERSION=0.1.0-rc.1
NEXT_PUBLIC_NARA_RELEASE_CHANNEL=release-candidate
NEXT_PUBLIC_GIT_SHA=
NEXT_PUBLIC_BUILD_TIME=
```

Never expose Gemini/OpenAI keys or Supabase admin credentials with a
`NEXT_PUBLIC_` prefix.

## Supabase production audit

- Confirm Anonymous Sign-Ins match the intended onboarding flow.
- Confirm email provider and redirect URLs contain the production domain.
- Confirm Manual Identity Linking is enabled when anonymous account upgrade is used.
- Confirm RLS is enabled on conversations, messages, memories, knowledge documents,
  and knowledge chunks.
- Confirm the `knowledge-files` bucket is private.
- Confirm vector extensions/RPC functions exist.
- Confirm account merge/delete RPC permissions are server-only.
- Test anonymous → persistent upgrade.
- Test existing-account login from another browser.
- Test account recovery.
- Test account merge and permanent deletion using a disposable account.

## Build

```powershell
pnpm release:check
```

Release only after the complete master gate succeeds.
