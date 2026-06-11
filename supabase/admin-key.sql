-- ============================================================
-- SPICE & EMBER — ADMIN DASHBOARD KEY (encrypted in database)
-- ============================================================
-- The payments dashboard key is stored as a ONE-WAY bcrypt hash
-- (via pgcrypto). The plain text is never saved — only the hash.
-- The admin-payments Edge Function verifies the typed key against
-- this hash using the verify_admin_key() function below.
--
-- HOW TO USE:
--   1. Run this whole file once in the Supabase SQL editor.
--   2. Change 'change-me-now' below to your own simple text key,
--      then run the UPSERT again to set/rotate the key.
-- ============================================================

create extension if not exists pgcrypto;

-- Table holds a single row with the hashed key.
create table if not exists admin_keys (
  id         text primary key default 'dashboard',
  key_hash   text not null,
  updated_at timestamptz default now()
);

-- Lock the table down: enable RLS with NO policies, so it is only
-- ever readable/writable by the service role (used by the Edge Function).
alter table admin_keys enable row level security;

-- Verification helper. SECURITY DEFINER lets the Edge Function call it
-- via RPC to check a typed key against the stored bcrypt hash.
-- Returns true only when the key matches.
create or replace function verify_admin_key(input_key text)
returns boolean
language sql
security definer
set search_path = public, extensions
as $$
  select exists (
    select 1 from admin_keys
    where id = 'dashboard'
      and key_hash = crypt(input_key, key_hash)
  );
$$;

-- Allow the function to be executed (service role always can; this is harmless).
grant execute on function verify_admin_key(text) to anon, authenticated, service_role;

-- ------------------------------------------------------------
-- SET / ROTATE THE KEY
-- Replace 'change-me-now' with the simple text key you want to type
-- on the admin Payments page, then run just this statement.
-- ------------------------------------------------------------
insert into admin_keys (id, key_hash)
values ('dashboard', crypt('change-me-now', gen_salt('bf')))
on conflict (id) do update
  set key_hash = excluded.key_hash,
      updated_at = now();
