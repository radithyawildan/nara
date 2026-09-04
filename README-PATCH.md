# NARA Account & Identity v1

Adds an optional permanent account layer on top of NARA's existing anonymous Supabase session.

## Included

- Upgrade the current anonymous user by linking an email identity.
- Verify the email with the email-change OTP.
- Add a password after verification.
- Existing user ID is preserved during upgrade, so existing conversations, memories, and knowledge remain attached.
- Sign in to an existing account from another device.
- Lightweight display-name profile stored in Supabase Auth user metadata.
- Sign out for permanent accounts.

## Supabase dashboard prerequisite

Enable manual identity linking for the project before testing anonymous-to-permanent upgrade.

No SQL migration is required.

## Important v1 limitation

Signing in to an already-existing account from an anonymous session switches identities; anonymous data is not merged into the existing account. Account merge is intentionally deferred.
