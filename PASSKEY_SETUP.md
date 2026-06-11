# Passkey (WebAuthn) — Setup

True passwordless login: register a passkey while signed in, then sign in with
Face ID / Touch ID / Windows Hello / a security key. WebAuthn responses are
verified server-side in a Supabase **Edge Function**, which then mints a real
Supabase session.

## 1. Create the tables
Run [`PASSKEY_SCHEMA.sql`](PASSKEY_SCHEMA.sql) in the Supabase SQL editor
(after `SUPABASE_SCHEMA.sql`).

## 2. Deploy the Edge Function
Requires the [Supabase CLI](https://supabase.com/docs/guides/cli) and a linked project.

```bash
supabase functions deploy passkey --no-verify-jwt
```

`--no-verify-jwt` is required because passkey **sign-in** happens *before* a
session exists. (The function still verifies the user's access token itself for
registration.)

## 3. Set the function secrets

```bash
supabase secrets set \
  RP_ID=abhi-zyn.github.io \
  RP_NAME="Spice & Ember" \
  RP_ORIGIN=https://abhi-zyn.github.io
```

- **`RP_ID`** — your site's domain only (no `https://`, no path). For a GitHub
  Pages project site this is the host, e.g. `abhi-zyn.github.io`.
- **`RP_ORIGIN`** — the full origin, e.g. `https://abhi-zyn.github.io`.
- For local testing use `RP_ID=localhost` and `RP_ORIGIN=http://localhost:5500`
  (match your dev server's port).
- `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY` are injected
  automatically — **do not** set them.

> A passkey is bound to one RP ID (domain). A passkey registered on `localhost`
> will not work on `abhi-zyn.github.io`, and vice-versa.

## 4. Use it
The client helper (`js/passkey.js`) loads automatically on every page.

- **Register:** sign in (email / Google / magic link), open the account menu
  (the user icon) → **“+ Add a passkey”**.
- **Sign in:** on the login popup tap **“🔑 Sign in with a passkey”**.
  Optionally type your email first to narrow the passkey list; leave it blank to
  use a discoverable passkey.

## How it works
1. `register-options` / `register-verify` create and store the credential
   (public key) against your user.
2. `login-options` / `login-verify` verify the WebAuthn assertion, then
   `generateLink` + `verifyOtp` mint a real session, which the browser applies
   via `supabase.auth.setSession()`.

## Limitations / notes
- Requires HTTPS (or `localhost`).
- Registration requires an existing account (the session is keyed to that
  user's email), so a brand-new visitor signs up once first, then adds a passkey.
- The challenge store matches the most recent challenge; under heavy concurrent
  use this is best-effort. Purge stale rows periodically (see the commented
  query in `PASSKEY_SCHEMA.sql`).
- The two passkey tables are locked by RLS; only the Edge Function (service
  role) can read or write them.
