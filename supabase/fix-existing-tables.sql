-- Spice & Ember — COMPLETE FIX SCRIPT FOR EXISTING TABLES
-- Run this ONCE in the Supabase SQL editor. It is idempotent (safe to re-run).
--
-- It reconciles older tables with what the app actually inserts, fixing every
-- error class you can hit on checkout / payment / booking:
--   * "Could not find the 'currency' column ..."        -> adds missing columns
--   * "invalid input syntax for type integer: 83.1276"  -> retypes money columns
--   * "null value in column ... violates not-null ..."  -> relaxes legacy NOT NULLs
--   * "operator does not exist: uuid = text"            -> fixes RLS policy casts
--   * bookings silently not saving                       -> adds columns + open RLS

create extension if not exists "pgcrypto";

/* ===================== ORDERS ===================== */
-- Every column the app inserts must exist.
alter table public.orders add column if not exists customer_name    text;
alter table public.orders add column if not exists customer_email   text;
alter table public.orders add column if not exists customer_phone   text;
alter table public.orders add column if not exists delivery_address text;
alter table public.orders add column if not exists order_type       text;
alter table public.orders add column if not exists notes            text;
alter table public.orders add column if not exists items            jsonb;
alter table public.orders add column if not exists subtotal         numeric;
alter table public.orders add column if not exists tax              numeric;
alter table public.orders add column if not exists delivery_fee     numeric;
alter table public.orders add column if not exists total            numeric;
alter table public.orders add column if not exists user_id          uuid;
alter table public.orders add column if not exists payment_id       text;
alter table public.orders add column if not exists payment_method   text;
alter table public.orders add column if not exists status           text default 'pending';
alter table public.orders add column if not exists created_at       timestamptz not null default now();
alter table public.orders add column if not exists delivered_at     timestamptz;

-- Money columns must be numeric, not integer (decimals like 83.1276).
alter table public.orders alter column subtotal     type numeric using subtotal::numeric;
alter table public.orders alter column tax          type numeric using tax::numeric;
alter table public.orders alter column delivery_fee type numeric using delivery_fee::numeric;
alter table public.orders alter column total        type numeric using total::numeric;

/* ===================== PAYMENTS ===================== */
alter table public.payments add column if not exists created_at          timestamptz not null default now();
alter table public.payments add column if not exists user_id             uuid;
alter table public.payments add column if not exists razorpay_order_id   text;
alter table public.payments add column if not exists razorpay_payment_id text;
alter table public.payments add column if not exists razorpay_signature  text;
alter table public.payments add column if not exists amount              numeric;
alter table public.payments add column if not exists currency            text default 'INR';
alter table public.payments add column if not exists status              text default 'paid';
alter table public.payments add column if not exists customer_name       text;
alter table public.payments add column if not exists customer_email      text;
alter table public.payments add column if not exists customer_phone      text;
alter table public.payments add column if not exists order_payload       jsonb;

alter table public.payments alter column amount type numeric using amount::numeric;

/* ===================== BOOKINGS =====================
   Reservations were silently failing to save: any insert error fell back to
   localStorage, so the form showed success but nothing reached the database.
   Reconcile columns + open RLS so reservations persist and both the customer
   and the admin panel can read them. */
alter table public.bookings add column if not exists user_id    uuid;
alter table public.bookings add column if not exists name       text;
alter table public.bookings add column if not exists email      text;
alter table public.bookings add column if not exists phone      text;
alter table public.bookings add column if not exists date       text;
alter table public.bookings add column if not exists "time"     text;
alter table public.bookings add column if not exists guests     int;
alter table public.bookings add column if not exists occasion   text;
alter table public.bookings add column if not exists notes      text;
alter table public.bookings add column if not exists status     text default 'pending';
alter table public.bookings add column if not exists created_at timestamptz not null default now();

-- guests must be an integer (older tables may have stored it as text).
alter table public.bookings
  alter column guests type int
  using nullif(regexp_replace(guests::text, '[^0-9]', '', 'g'), '')::int;

/* ===== Relax leftover NOT NULL constraints on legacy columns =====
   Older versions of these tables can have NOT NULL columns the current app
   does not populate. Drop NOT NULL on any column that has no default —
   except the primary key — so inserts never fail. */
do $$
declare r record;
begin
  for r in
    select table_name, column_name
    from information_schema.columns
    where table_schema = 'public'
      and table_name in ('orders','payments','bookings')
      and is_nullable = 'NO'
      and column_default is null
      and column_name <> 'id'
  loop
    execute format('alter table public.%I alter column %I drop not null',
                   r.table_name, r.column_name);
  end loop;
end $$;

/* ===================== ROW LEVEL SECURITY =====================
   Payments are inserted only by the verify-payment Edge Function (service
   role, bypasses RLS). Logged-in users may read their own rows. Comparing
   both sides as text avoids "operator does not exist: uuid = text". */
alter table public.payments enable row level security;
drop policy if exists "payments_select_own" on public.payments;
create policy "payments_select_own" on public.payments
  for select to authenticated
  using ((select auth.uid())::text = user_id::text);

-- Bookings: anyone can create a reservation; customer + admin can read/update.
-- (Customer history is filtered client-side by user_id.)
alter table public.bookings enable row level security;
drop policy if exists "bookings_insert_any" on public.bookings;
create policy "bookings_insert_any" on public.bookings for insert with check (true);
drop policy if exists "bookings_select_any" on public.bookings;
create policy "bookings_select_any" on public.bookings for select using (true);
drop policy if exists "bookings_update_any" on public.bookings;
create policy "bookings_update_any" on public.bookings for update using (true);

-- Profiles (only if the table exists): fix the same uuid = text comparison
-- without breaking inserts/reads.
do $$
begin
  if exists (select 1 from information_schema.tables
             where table_schema = 'public' and table_name = 'profiles') then
    execute 'alter table public.profiles enable row level security';
    execute 'drop policy if exists "profiles_select_own" on public.profiles';
    execute 'create policy "profiles_select_own" on public.profiles for select to authenticated using ((select auth.uid())::text = id::text)';
    execute 'drop policy if exists "profiles_update_own" on public.profiles';
    execute 'create policy "profiles_update_own" on public.profiles for update to authenticated using ((select auth.uid())::text = id::text)';
    execute 'drop policy if exists "profiles_insert_self" on public.profiles';
    execute 'create policy "profiles_insert_self" on public.profiles for insert to authenticated with check ((select auth.uid())::text = id::text)';
  end if;
end $$;

-- NOTE: orders RLS is intentionally left unchanged so guest/browser order
-- inserts keep working. If you later want per-user order privacy, add an
-- explicit INSERT policy before enabling RLS on public.orders.
