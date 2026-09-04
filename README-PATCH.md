# NARA Account & Identity v1.1

Adds:

- Forgot-password flow using Supabase password recovery email
- Recovery deep-link: `/?account=recovery`
- Password reset UI after recovery link
- Change-password form with current password confirmation
- Sign out current device (`scope: local`)
- Sign out other devices while keeping current session (`scope: others`)
- Sign out everywhere (`scope: global`)
- Keeps Identity v1 anonymous -> permanent upgrade flow

No SQL migration is required.

## Apply

```powershell
Expand-Archive `
  -Path "$HOME\Downloads\nara-account-v1.1-patch.zip" `
  -DestinationPath . `
  -Force

node scripts\apply-account-v11.mjs
```

Then run the normal quality gates.

## Supabase configuration

Add your local and deployed recovery URLs to Supabase Auth Redirect URLs, for example:

- `http://localhost:3000/?account=recovery`
- `https://your-domain.example/?account=recovery`

## Not included

Account deletion is deliberately not implemented in browser code. Supabase `auth.admin.deleteUser()` requires a `service_role` credential and must only run on a trusted server. Account merge is also deferred because ownership transfer needs a transactional merge strategy.
