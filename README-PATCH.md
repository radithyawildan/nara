# NARA Account & Identity v1.2

Adds server-side account administration without exposing Supabase admin credentials to the browser.

## Features

- Anonymous → existing-account merge
- Explicit "discard temporary data" alternative
- Ownership transfer for conversations, messages, memories, knowledge documents/chunks
- Private knowledge file path migration
- Persistent citation IDs remain valid because document/chunk IDs are preserved
- Password-confirmed permanent account deletion
- Private knowledge file cleanup before deletion
- Server-only Supabase secret/service-role client

## Required environment

Add **one** of these to `.env.local` and never expose it through a `NEXT_PUBLIC_` variable:

```env
SUPABASE_SECRET_KEY=
# or legacy:
SUPABASE_SERVICE_ROLE_KEY=
```

Do not paste this key into chat, source control, browser code, or `.env.example` with a real value.

## Required migration

Run:

`supabase/migrations/20260904214500_account_merge_and_deletion.sql`

The RPC functions are revoked from browser roles and executable only by `service_role`.
