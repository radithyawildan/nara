# NARA Architecture

NARA (Neural Adaptive Responsive Avatar) is a voice-first conversational AI web
application designed around persistent personal context and grounded knowledge.

## Runtime flow

```text
Text / Voice
    ↓
Conversation UI
    ↓
/api/chat
    ├─ request validation / rate limit
    ├─ personality context
    ├─ conversation rolling state
    ├─ semantic memory retrieval
    ├─ knowledge retrieval
    └─ long-thread compaction
            ↓
       AI provider
            ↓
      streamed answer
            ↓
 citations / TTS / persistence
```

## Main domains

### Conversation

Conversation history is stored in Supabase. Long threads are compacted so recent
turns stay verbatim while older context can be represented by a rolling summary
and topic state.

### Memory

NARA stores explicit and suggested durable user memories. Retrieval combines
lexical and semantic ranking using Gemini embeddings and pgvector.

### Knowledge / RAG

Uploaded PDF, TXT, and Markdown documents are extracted, chunked, embedded, and
stored in Supabase. Retrieved chunks are exposed to the model with stable source
markers. Citation integrity is reconciled before persistence and TTS.

### Identity

Anonymous Supabase sessions allow immediate use. Users can upgrade the same
identity to a persistent account, recover/change passwords, revoke sessions,
merge temporary data into an existing account, or delete the account securely.

### Personality

Personality metadata controls communication defaults such as tone, verbosity,
initiative, language, and coding style. Current explicit user instructions
always outrank saved defaults.

## Security boundaries

Browser clients use only public Supabase credentials. Administrative account
operations require a server-only Supabase secret/service-role credential.
Request bodies are bounded and chat has a baseline per-process rate limit.

The current rate limiter is not distributed. Multi-instance production should
move rate-limit state to a shared service.
