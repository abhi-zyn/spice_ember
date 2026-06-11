// Spice & Ember — admin-payments Edge Function
// Returns ALL payment records for the admin dashboard, secured by a
// dashboard key that is stored ENCRYPTED (bcrypt hash) in the database.
// Deploy with Verify JWT = OFF (or --no-verify-jwt).
//
//   supabase functions deploy admin-payments --no-verify-jwt
//
// Set / rotate the key by running supabase/admin-key.sql (stores only a
// bcrypt hash — the plain text key is never saved anywhere).
//
// The browser sends the typed key in the `x-admin-key` header. The key is
// verified against the stored hash via the verify_admin_key() SQL function.
// The SERVICE ROLE key is used to bypass RLS and read payments; it never
// reaches the client.

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const SUPABASE_URL = Deno.env.get('SUPABASE_URL') || ''
const SERVICE_ROLE = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || ''

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-admin-key',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...cors, 'Content-Type': 'application/json' },
  })
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors })
  try {
    const key = req.headers.get('x-admin-key') || ''
    if (!key) return json({ error: 'Unauthorized — dashboard key required.' }, 401)

    const supabase = createClient(SUPABASE_URL, SERVICE_ROLE)

    // Verify the typed key against the encrypted (bcrypt) hash in the DB.
    const { data: ok, error: vErr } = await supabase.rpc('verify_admin_key', { input_key: key })
    if (vErr) return json({ error: 'Key verification failed: ' + vErr.message }, 500)
    if (!ok) return json({ error: 'Unauthorized — invalid dashboard key.' }, 401)

    const { data, error } = await supabase
      .from('payments')
      .select('*')
      .order('created_at', { ascending: false })
    if (error) return json({ error: error.message }, 500)
    return json({ payments: data || [] })
  } catch (e) {
    return json({ error: String((e && (e as Error).message) || e) }, 500)
  }
})
