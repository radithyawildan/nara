# NARA Post-Deploy Verification

Run this checklist immediately after the first production deployment.

## Public routes

- Open `/`.
- Open `/api/health`.
- Open `/api/version`.
- Open `/api/diagnostics`.
- Open `/manifest.webmanifest`.
- Open `/robots.txt`.

No diagnostic endpoint should expose API keys, cookies, access tokens, service-role
credentials, passwords, or full Supabase secrets.

## Authentication

- Start as an anonymous user.
- Create a temporary conversation.
- Upgrade the same identity to a permanent account.
- Verify the conversation remains available.
- Sign in from a second browser/device.
- Test recovery using the production redirect URL.
- Test sign-out scopes.
- Test merge/delete only with disposable accounts first.

## AI and memory

- Send a normal text prompt.
- Verify streaming response.
- Save an explicit memory.
- Confirm the memory is retrieved later.
- Confirm semantic embedding status reaches ready.
- Test a long conversation and verify continuity.

## Knowledge / RAG

- Upload a TXT or PDF.
- Ask a question that is only answerable from that document.
- Verify citation chips.
- Open the cited source.
- Reload the conversation and confirm citations persist.
- Re-index and delete the test document.

## Voice

Browser speech APIs depend on browser/platform support.

- Test microphone permission.
- Test speech recognition.
- Test TTS.
- Test auto-speak.
- Test interruption/retry behavior.

## Mobile

- Open at phone width.
- Test conversation history drawer.
- Test composer above mobile browser chrome.
- Test all modal dialogs.
- Test onboarding in a clean/private browser profile.

## Release metadata

Set deployment environment variables:

```env
NEXT_PUBLIC_SITE_URL=https://your-production-domain.example
NEXT_PUBLIC_NARA_VERSION=0.1.0-rc.1
NEXT_PUBLIC_NARA_RELEASE_CHANNEL=release-candidate
```

Run locally before promoting a release:

```powershell
pnpm deployment:doctor
pnpm release:check
```
