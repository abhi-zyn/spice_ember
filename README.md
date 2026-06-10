# 🔥 Spice & Ember

**Where Fire Meets Flavor** — a complete, professional restaurant website with online ordering, table reservations, customer reviews and a full admin panel. Pure HTML, CSS and vanilla JavaScript. No build step. No backend required (runs entirely on `localStorage`).

---

## ✨ What's included

### Customer site
- **Home** (`index.html`) — cinematic hero, philosophy, featured dishes, animated stats, testimonials, CTA.
- **Menu** (`menu.html`) — live category filtering, search, sorting, add-to-cart.
- **Reserve** (`book-table.html`) — full reservation form saved for admin review.
- **Order** (`order.html`) — cart, quantity controls, checkout, mock payment, order confirmation.
- **About** (`about.html`) — story, values, team, and a working review form.
- **404** (`404.html`) — on-brand not-found page.

### Admin panel (`/admin`)
- **Login** (`admin/index.html`) — credentials: **admin / admin123**
- **Dashboard** — revenue, orders, bookings and guest stats + recent orders.
- **Orders** — view and update order status.
- **Bookings** — confirm / complete / cancel reservations.
- **Menu** — add and remove custom menu items.

---

## 🐛 Bugs fixed from the original project

1. **No login popup** — added a polished login/sign-up **modal** that opens from the navbar "Login" button on every page (`js/auth.js`).
2. **`API is not defined`** — the admin dashboard, orders and bookings crashed because no data layer existed. Added `js/api.js`, a complete localStorage-backed API.
3. **`RazorpayPayment is not defined`** — checkout crashed. Added a mock payment handler so orders complete end-to-end (swap in real Razorpay keys when ready).
4. **Inconsistent page design** — every page now shares one injected navbar + footer (`js/components.js`) and a single design system (`css/style.css`), so nothing drifts.
5. **Not responsive** — fully rebuilt responsive layout for desktop, tablet and mobile, including a slide-in mobile menu and responsive admin sidebar.

---

## 🎨 Design & animation highlights

- Professional dark theme (default) **and** light theme with a toggle (saved per visitor).
- Ember/gold brand palette, glassmorphism navbar, custom cursor.
- Click **ripple** animation on every button, scroll-reveal, animated counters, Ken Burns hero, hover motion, shake-on-add cart badge.
- Respects `prefers-reduced-motion`.

---

## 🚀 Run it

It's a static site — just open `index.html`, or serve the folder:

```bash
# any static server works
python3 -m http.server 8000
# then visit http://localhost:8000
```

Admin panel: `http://localhost:8000/admin/` — log in with **admin / admin123**.

---

## 🔌 Going live with a real backend (optional)

The site works fully offline. To connect a real backend later:
- Set `supabaseUrl` / `supabaseAnonKey` in `js/config.js`.
- Replace the localStorage methods in `js/api.js` with network calls.
- Replace `RazorpayPayment.initiatePayment()` in `js/api.js` with the real Razorpay flow.

---

## 📁 Structure

```
spice-ember/
├─ index.html  menu.html  book-table.html  order.html  about.html  404.html
├─ manifest.json  robots.txt  README.md
├─ css/   style.css   admin.css
├─ js/    config.js  menu-data.js  api.js  auth.js  components.js  cart.js  main.js  admin.js
└─ admin/ index.html  dashboard.html  orders.html  bookings.html  menu-manage.html
```

© Spice & Ember. Crafted with fire.


---

## Backend setup (Supabase + Google login)

The site works fully offline on `localStorage`, but for real accounts, saved
orders/bookings, and Google login you should connect Supabase.

### 1. Database
1. Open your Supabase project → **SQL Editor**.
2. Paste the entire contents of `SUPABASE_SCHEMA.sql` and **Run**.
   This creates `profiles`, `orders`, `bookings`, `reviews`, and `menu_items`,
   enables Row Level Security, and adds a trigger that auto-creates a profile
   row on sign-up.

### 2. Credentials
The project URL and **publishable (anon)** key are already wired up in
`js/config.js`. The anon key is safe to ship in client code. To point at a
different project, edit `supabaseUrl` and `supabaseAnonKey` there. Setting both
to `''` forces fully-offline localStorage mode.

### 3. Google login
1. Supabase → **Authentication → Providers → Google → Enable**.
2. In the **Google Cloud Console**, create OAuth credentials and copy the
   Client ID + Secret into Supabase.
3. Add your site URL and the Supabase callback URL to Google's *Authorized
   redirect URIs* and to Supabase → **Authentication → URL Configuration**.

Until the Google provider is enabled, the “Continue with Google” button shows a
friendly notice instead of failing silently.

### Login gating
Adding to cart, checking out, and reserving a table all require login — the
login popup opens automatically when a signed-out visitor tries them. After the
first order/booking, the customer's address and details are saved to their
profile and auto-filled next time.

### What still uses localStorage
Only client-side essentials: the shopping cart, the theme preference, and a
sign-in fallback used when Supabase is unreachable. All orders, bookings,
reviews, profiles, and admin menu items go to Supabase when it is configured.
