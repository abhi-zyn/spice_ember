// Spice & Ember — admin-payments Edge Function
// Returns ALL payment records for the admin dashboard, secured by a
// server-side dashboard key. Deploy with Verify JWT = OFF (or --no-verify-jwt).
//
//   supabase secrets set ADMIN_DASHBOARD_KEY=your-long-random-key
//   supabase functions deploy admin-payments --no-verify-jwt
//
// The browser sends the key in the `x-admin-key` header. The SERVICE ROLE key
// is used to bypass RLS and read every payment row; it never reaches the client.

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const ADMIN_KEY = Deno.env.get('ADMIN_DASHBOARD_KEY') || ''
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
    if (!ADMIN_KEY) return json({ error: 'Server not configured: set ADMIN_DASHBOARD_KEY.' }, 500)
    const key = req.headers.get('x-admin-key') || ''
    if (key !== ADMIN_KEY) return json({ error: 'Unauthorized — invalid dashboard key.' }, 401)

    const supabase = createClient(SUPABASE_URL, SERVICE_ROLE)
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
