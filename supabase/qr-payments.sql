-- Spice & Ember — QR payments table
-- Stores admin-generated UPI QR codes and their payment status.
-- The create-qr function inserts pending rows (service role) and the
-- razorpay-webhook function flips them to 'paid'. The admin Dashboard polls
-- this table (anon key) to show "Payment received".

create table if not exists public.qr_payments (
  id           text primary key,                 -- Razorpay QR code id (qr_xxx)
  amount       numeric,                           -- amount in rupees
  description  text,
  status       text not null default 'pending',   -- pending | paid
  payment_id   text,                              -- Razorpay payment id once paid
  image_url    text,
  created_at   timestamptz not null default now(),
  paid_at      timestamptz
);

alter table public.qr_payments enable row level security;

-- The admin page reads with the anon key (admin login is enforced client-side),
-- so allow read access. Writes happen only via the service role (Edge Functions),
-- which bypasses RLS, so no insert/update policy is granted to anon.
drop policy if exists qr_payments_read on public.qr_payments;
create policy qr_payments_read on public.qr_payments
  for select to anon, authenticated using (true);
