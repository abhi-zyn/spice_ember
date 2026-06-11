# Server-side payments & email verification — setup

This adds **server-verified Razorpay payments** (logged to a `payments` table) and
**magic-link email verification** on signup.

## 1. Create the payments table
Open Supabase → **SQL Editor** and run the contents of [`supabase/schema.sql`](supabase/schema.sql).

## 2. Store your Razorpay keys as server secrets
Get your keys from Razorpay Dashboard → Settings → **API Keys**.
Never put the **Key Secret** in client code — only in Supabase secrets:

```bash
supabase secrets set RAZORPAY_KEY_ID=rzp_test_xxxxxxxx RAZORPAY_KEY_SECRET=your_secret_here
```

(`SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` are injected automatically.)

## 3. Deploy the Edge Functions
```bash
supabase functions deploy create-order   --no-verify-jwt
supabase functions deploy verify-payment --no-verify-jwt
```

The client calls them at `<SUPABASE_URL>/functions/v1/create-order` and `/verify-payment`.

## 4. (Optional) public Key ID in the client
Set `razorpayKeyId` in `js/config.js` to your **public** `rzp_test_...` / `rzp_live_...` key.
This is only used as a fallback — the secure flow gets the key id from the server.

## 5. Email verification (magic link)
In Supabase → **Authentication → Providers → Email**:
- Turn **Confirm email** ON (so password signups must verify), and/or
- Use the new **“Verify with a magic link”** button in the signup modal (passwordless).

In **Authentication → URL Configuration**, add your site URL + the page URLs to
**Redirect URLs** (e.g. `https://your-site/index.html`). The magic link returns the
user to the page they started from.

## How the payment flow works now
1. Browser calls **create-order** → Razorpay order created server-side (tamper-proof amount).
2. Razorpay Checkout opens with that `order_id`.
3. On success, the browser calls **verify-payment** with the signature.
4. The function recomputes the HMAC-SHA256 signature with the Key Secret. If it matches,
   the payment is written to the `payments` table and the order is confirmed.
5. If the functions aren’t deployed yet, the client automatically falls back to the
   client-only flow, then to a simulated payment — so the site never breaks.
