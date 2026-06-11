-- ============================================================
-- SPICE & EMBER — PASSKEY (WebAuthn) TABLES
-- Run in the Supabase SQL editor AFTER SUPABASE_SCHEMA.sql.
-- These tables are written ONLY by the `passkey` Edge Function
-- (service role), so they are locked down with RLS and no
-- public policies.
-- ============================================================

create table if not exists public.passkey_credentials (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null references auth.users(id) on delete cascade,
  email         text,
  credential_id text not null unique,   -- base64url
  public_key    text not null,         -- base64url
  counter       bigint not null default 0,
  transports    text[],
  created_at    timestamptz not null default now()
);
create index if not exists passkey_credentials_user_idx  on public.passkey_credentials(user_id);
create index if not exists passkey_credentials_email_idx on public.passkey_credentials(email);

create table if not exists public.passkey_challenges (
  id         uuid primary key default gen_random_uuid(),
  email      text,
  user_id    uuid,
  challenge  text not null,
  type       text not null check (type in ('registration','authentication')),
  created_at timestamptz not null default now()
);
create index if not exists passkey_challenges_email_idx on public.passkey_challenges(email);

-- Lock both tables: only the Edge Function (service role, which bypasses RLS)
-- may read/write them. No policies => anon/authenticated clients are denied.
alter table public.passkey_credentials enable row level security;
alter table public.passkey_challenges  enable row level security;

-- Optional housekeeping: purge stale challenges (older than 10 minutes).
-- Run manually, or schedule with pg_cron.
-- delete from public.passkey_challenges where created_at < now() - interval '10 minutes';
