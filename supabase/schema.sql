-- Spice & Ember — payments table
-- Run this in the Supabase SQL editor (or via the CLI) once.
create extension if not exists "pgcrypto";

create table if not exists public.payments (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  user_id uuid references auth.users(id) on delete set null,
  razorpay_order_id text,
  razorpay_payment_id text unique,
  razorpay_signature text,
  amount numeric,
  currency text default 'INR',
  status text default 'paid',
  customer_name text,
  customer_email text,
  customer_phone text,
  order_payload jsonb
);

-- If the payments table was created EARLIER with fewer columns, add any that
-- are missing. These are no-ops on a fresh install. This is what fixes the
-- "Could not find the 'currency' column of 'payments'" error after payment.
alter table public.payments add column if not exists created_at timestamptz not null default now();
alter table public.payments add column if not exists user_id uuid;
alter table public.payments add column if not exists razorpay_order_id text;
alter table public.payments add column if not exists razorpay_payment_id text;
alter table public.payments add column if not exists razorpay_signature text;
alter table public.payments add column if not exists amount numeric;
alter table public.payments add column if not exists currency text default 'INR';
alter table public.payments add column if not exists status text default 'paid';
alter table public.payments add column if not exists customer_name text;
alter table public.payments add column if not exists customer_email text;
alter table public.payments add column if not exists customer_phone text;
alter table public.payments add column if not exists order_payload jsonb;

alter table public.payments enable row level security;

-- Logged-in users can read only their own payments.
-- We compare BOTH sides as text so the policy works whether user_id was
-- created as uuid or text. Comparing uuid = text directly raises:
--   operator does not exist: uuid = text
drop policy if exists "payments_select_own" on public.payments;
create policy "payments_select_own" on public.payments
  for select to authenticated
  using ((select auth.uid())::text = user_id::text);

-- Inserts are performed only by the verify-payment Edge Function using the
-- service-role key, which bypasses RLS. No client INSERT policy is granted,
-- so a payment row can never be forged from the browser.
