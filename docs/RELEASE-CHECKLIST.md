# NARA Release Candidate Checklist

## Code quality

- [ ] `pnpm release:check` passes.
- [ ] No lint warnings/errors.
- [ ] TypeScript passes.
- [ ] Production build succeeds.
- [ ] No secrets exist in tracked files.

## Runtime

- [ ] Text streaming works.
- [ ] Speech recognition works in a supported browser.
- [ ] Speech synthesis works.
- [ ] Conversation persistence survives reload.
- [ ] Mobile history drawer works.
- [ ] Command palette shortcuts work.
- [ ] Runtime health reports Online.
- [ ] Error/retry surface behaves correctly.

## Intelligence

- [ ] Memory retrieval behaves as expected.
- [ ] Knowledge upload/reindex/delete works.
- [ ] RAG citations open the correct source.
- [ ] Personality settings change response behavior.
- [ ] Long-thread compaction preserves recent messages.
- [ ] Rolling summary/topic state persists across reload.

## Identity

- [ ] Anonymous session works.
- [ ] Anonymous account upgrade preserves data.
- [ ] Persistent login works from a second browser.
- [ ] Password recovery works with production redirect URL.
- [ ] Sign-out scopes work.
- [ ] Merge/discard behavior has been tested.
- [ ] Permanent deletion has been tested with a disposable account.

## Deployment

- [ ] `NEXT_PUBLIC_SITE_URL` points at the final deployment.
- [ ] Supabase production redirect URLs are configured.
- [ ] Server-only admin credential is set in deployment environment.
- [ ] AI provider credentials are set.
- [ ] Build/release metadata is set.
- [ ] `/api/health` responds.
- [ ] `/api/version` responds.
- [ ] `/api/diagnostics` contains no secrets.
