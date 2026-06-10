/* ============================================================
   SPICE & EMBER — SUPABASE CLIENT
   Creates the Supabase client when credentials + the SDK are
   present. Falls back to localStorage automatically otherwise.
   ============================================================ */
const SB = (() => {
  let client = null;
  try {
    if (CONFIG.supabaseUrl && CONFIG.supabaseAnonKey && window.supabase && window.supabase.createClient) {
      client = window.supabase.createClient(CONFIG.supabaseUrl, CONFIG.supabaseAnonKey, {
        auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true }
      });
      console.info('Spice & Ember: Supabase connected.');
    } else {
      console.info('Spice & Ember: offline mode (localStorage).');
    }
  } catch (e) {
    console.warn('Spice & Ember: Supabase init failed, using offline mode.', e);
  }
  return { client, get enabled() { return !!client; } };
})();
