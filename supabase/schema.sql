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

alter table public.payments enable row level security;

-- Logged-in users can read only their own payments.
-- Note: auth.uid() must be cast to uuid to match the uuid user_id column,
-- otherwise Postgres raises: operator does not exist: uuid = text
drop policy if exists "payments_select_own" on public.payments;
create policy "payments_select_own" on public.payments
  for select to authenticated
  using ((select auth.uid())::uuid = user_id);

-- Inserts are performed only by the verify-payment Edge Function using the
-- service-role key, which bypasses RLS. No client INSERT policy is granted,
-- so a payment row can never be forged from the browser.
