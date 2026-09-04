# NARA

**Neural Adaptive Responsive Avatar**

NARA is a voice-first adaptive conversational AI web application focused on
persistent personal context, grounded document knowledge, responsive interaction,
and production-oriented architecture.

## Core capabilities

- Streaming AI conversation
- Browser STT + TTS
- Responsive avatar state machine
- Persistent conversation history
- Semantic long-term memory
- Document RAG with source citations
- Adaptive personality preferences
- Persistent rolling conversation summaries
- Supabase account identity and cross-device persistence
- Account recovery, session security, merge, and deletion
- Mobile history, onboarding, command palette, and error recovery
- Release preflight, diagnostics, and hardening gates

## Stack

- Next.js 16
- React / TypeScript
- Tailwind CSS
- Supabase Auth / Postgres / Storage / pgvector
- Gemini generation + embeddings
- Web Speech APIs

## Quality gate

```powershell
pnpm release:check
```

See:

- `docs/ARCHITECTURE.md`
- `docs/DEPLOYMENT.md`
- `docs/RELEASE-CHECKLIST.md`
