-- ============================================================
-- SPICE & EMBER — Supabase schema
-- Run this in Supabase Studio -> SQL Editor (whole file).
-- ============================================================

-- 1) PROFILES (linked to auth.users) -------------------------
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text,
  email text,
  phone text,
  address text,
  updated_at timestamptz default now(),
  created_at timestamptz default now()
);
alter table public.profiles enable row level security;
drop policy if exists "profiles_select_own" on public.profiles;
create policy "profiles_select_own" on public.profiles for select using (auth.uid() = id);
drop policy if exists "profiles_insert_own" on public.profiles;
create policy "profiles_insert_own" on public.profiles for insert with check (auth.uid() = id);
drop policy if exists "profiles_update_own" on public.profiles;
create policy "profiles_update_own" on public.profiles for update using (auth.uid() = id);

-- 2) ORDERS --------------------------------------------------
create table if not exists public.orders (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete set null,
  customer_name text,
  customer_email text,
  customer_phone text,
  delivery_address text,
  notes text,
  items jsonb default '[]'::jsonb,
  subtotal numeric default 0,
  tax numeric default 0,
  delivery_fee numeric default 0,
  total numeric default 0,
  payment_id text,
  payment_method text,
  status text default 'pending',
  created_at timestamptz default now()
);
alter table public.orders enable row level security;
-- Anyone can place an order; signed-in users own theirs.
drop policy if exists "orders_insert_any" on public.orders;
create policy "orders_insert_any" on public.orders for insert with check (true);
-- Demo: open read/update so the admin panel works with the anon key.
-- TIGHTEN THESE FOR PRODUCTION (e.g. gate on an is_admin claim).
drop policy if exists "orders_select_any" on public.orders;
create policy "orders_select_any" on public.orders for select using (true);
drop policy if exists "orders_update_any" on public.orders;
create policy "orders_update_any" on public.orders for update using (true);

-- 3) BOOKINGS ------------------------------------------------
create table if not exists public.bookings (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete set null,
  name text, email text, phone text,
  date text, time text, guests int,
  occasion text, notes text,
  status text default 'pending',
  created_at timestamptz default now()
);
alter table public.bookings enable row level security;
drop policy if exists "bookings_insert_any" on public.bookings;
create policy "bookings_insert_any" on public.bookings for insert with check (true);
drop policy if exists "bookings_select_any" on public.bookings;
create policy "bookings_select_any" on public.bookings for select using (true);
drop policy if exists "bookings_update_any" on public.bookings;
create policy "bookings_update_any" on public.bookings for update using (true);

-- 4) REVIEWS -------------------------------------------------
create table if not exists public.reviews (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete set null,
  name text,
  rating int default 5,
  comment text,
  created_at timestamptz default now()
);
alter table public.reviews enable row level security;
drop policy if exists "reviews_insert_any" on public.reviews;
create policy "reviews_insert_any" on public.reviews for insert with check (true);
drop policy if exists "reviews_select_any" on public.reviews;
create policy "reviews_select_any" on public.reviews for select using (true);

-- 5) MENU ITEMS (admin-added custom dishes) ------------------
create table if not exists public.menu_items (
  id text primary key,
  name text not null,
  description text,
  price numeric default 0,
  category text,
  type text,
  image text,
  spicy int default 0,
  rating numeric default 0,
  reviews int default 0,
  featured boolean default false,
  popular boolean default false,
  created_at timestamptz default now()
);
alter table public.menu_items enable row level security;
drop policy if exists "menu_select_any" on public.menu_items;
create policy "menu_select_any" on public.menu_items for select using (true);
drop policy if exists "menu_insert_any" on public.menu_items;
create policy "menu_insert_any" on public.menu_items for insert with check (true);
drop policy if exists "menu_delete_any" on public.menu_items;
create policy "menu_delete_any" on public.menu_items for delete using (true);

-- 6) Auto-create a profile row on signup --------------------
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, full_name, email)
  values (new.id, coalesce(new.raw_user_meta_data->>'full_name', ''), new.email)
  on conflict (id) do nothing;
  return new;
end; $$;
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ============================================================
-- GOOGLE LOGIN (no SQL — configure in the dashboard):
--   1. Supabase -> Authentication -> Providers -> Google -> Enable.
--   2. Create OAuth credentials in Google Cloud Console; paste the
--      Client ID + Secret into Supabase.
--   3. Add your site URL + Supabase callback URL to Google's
--      "Authorized redirect URIs" and to Supabase -> Auth -> URL config.
-- ============================================================
