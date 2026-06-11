-- Spice & Ember — FIX SCRIPT FOR EXISTING TABLES
-- Run this ONCE in the Supabase SQL editor if your tables were created
-- earlier (before the current schema). It is safe to re-run.
--
-- Fixes:
--   * "invalid input syntax for type integer: 83.1276" — money columns were
--     created as integer but the app sends decimals; retype them to numeric.
--   * "Could not find the 'currency' column ..." — add any missing columns.

/* ---------------- ORDERS ---------------- */
-- Make sure every column the app inserts exists.
alter table public.orders add column if not exists customer_name text;
alter table public.orders add column if not exists customer_email text;
alter table public.orders add column if not exists customer_phone text;
alter table public.orders add column if not exists delivery_address text;
alter table public.orders add column if not exists notes text;
alter table public.orders add column if not exists items jsonb;
alter table public.orders add column if not exists subtotal numeric;
alter table public.orders add column if not exists tax numeric;
alter table public.orders add column if not exists delivery_fee numeric;
alter table public.orders add column if not exists total numeric;
alter table public.orders add column if not exists user_id uuid;
alter table public.orders add column if not exists payment_id text;
alter table public.orders add column if not exists payment_method text;
alter table public.orders add column if not exists status text default 'pending';
alter table public.orders add column if not exists created_at timestamptz not null default now();

-- Retype money columns to numeric (no-op if they are already numeric).
alter table public.orders alter column subtotal type numeric using subtotal::numeric;
alter table public.orders alter column tax type numeric using tax::numeric;
alter table public.orders alter column delivery_fee type numeric using delivery_fee::numeric;
alter table public.orders alter column total type numeric using total::numeric;

/* ---------------- PAYMENTS ---------------- */
alter table public.payments add column if not exists amount numeric;
alter table public.payments add column if not exists currency text default 'INR';
alter table public.payments alter column amount type numeric using amount::numeric;
