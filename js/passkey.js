/* ============================================================
   SPICE & EMBER — PASSKEY (WebAuthn) CLIENT
   True passwordless login. Talks to the `passkey` Supabase Edge
   Function, which verifies the WebAuthn response server-side and
   returns a real session that we apply with setSession().

   This file is loaded automatically on every page (bootstrapped
   from supabase.js) and injects its own buttons:
     - "Sign in with a passkey" in the login popup
     - "+ Add a passkey" in the account menu
   ============================================================ */
const Passkey = {
  _libUrl: 'https://cdn.jsdelivr.net/npm/@simplewebauthn/browser@13/dist/bundle/index.umd.min.js',
  _libPromise: null,

  endpoint() {
    return (CONFIG.supabaseUrl || '').replace(/\/$/, '') + '/functions/v1/passkey';
  },

  // WebAuthn needs a secure context (https or localhost) + Supabase configured.
  available() {
    return typeof window !== 'undefined'
      && !!window.PublicKeyCredential
      && window.isSecureContext
      && typeof SB !== 'undefined' && SB.enabled;
  },

  _loadLib() {
    if (window.SimpleWebAuthnBrowser) return Promise.resolve();
    if (this._libPromise) return this._libPromise;
    this._libPromise = new Promise((resolve, reject) => {
      const s = document.createElement('script');
      s.src = this._libUrl;
      s.async = true;
      s.onload = () => resolve();
      s.onerror = () => reject(new Error('Could not load the passkey library.'));
      document.head.appendChild(s);
    });
    return this._libPromise;
  },

  async _accessToken() {
    try {
      const { data } = await SB.client.auth.getSession();
      return (data && data.session && data.session.access_token) || null;
    } catch (_) { return null; }
  },

  async _post(action, payload, accessToken) {
    const res = await fetch(this.endpoint(), {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': CONFIG.supabaseAnonKey,
        'Authorization': 'Bearer ' + (accessToken || CONFIG.supabaseAnonKey)
      },
      body: JSON.stringify(Object.assign({ action: action }, payload || {}))
    });
    let data = {};
    try { data = await res.json(); } catch (_) {}
    if (!res.ok) throw new Error(data.error || ('Request failed (' + res.status + ')'));
    return data;
  },

  /* Register a passkey for the currently signed-in user. */
  async register() {
    if (!this.available()) {
      Utils.showToast('Passkeys need Supabase configured and a secure (https) connection.', 'error', 4500);
      return;
    }
    const token = await this._accessToken();
    if (!token) {
      Utils.showToast('Please sign in first, then add a passkey.', 'error', 4000);
      if (window.Auth && Auth.open) Auth.open('login', 'add a passkey');
      return;
    }
    try {
      await this._loadLib();
      const options = await this._post('register-options', {}, token);
      const attResp = await window.SimpleWebAuthnBrowser.startRegistration({ optionsJSON: options });
      await this._post('register-verify', { response: attResp }, token);
      Utils.showToast('Passkey added — you can now sign in with it.', 'success');
    } catch (e) {
      if (e && (e.name === 'NotAllowedError' || e.name === 'AbortError')) return; // user cancelled
      Utils.showToast(e.message || 'Could not add the passkey.', 'error', 4500);
    }
  },

  /* Sign in with a passkey. Optional email narrows the credential list. */
  async login(email) {
    if (!this.available()) {
      Utils.showToast('Passkeys need Supabase configured and a secure (https) connection.', 'error', 4500);
      return;
    }
    try {
      await this._loadLib();
      const emailEl = document.getElementById('loginEmail');
      const hint = (email || (emailEl && emailEl.value.trim()) || '').toLowerCase();
      const options = await this._post('login-options', { email: hint });
      const authResp = await window.SimpleWebAuthnBrowser.startAuthentication({ optionsJSON: options });
      const out = await this._post('login-verify', { response: authResp, email: hint });
      if (!out.session) throw new Error('No session was returned.');
      const { error } = await SB.client.auth.setSession({
        access_token: out.session.access_token,
        refresh_token: out.session.refresh_token
      });
      if (error) throw new Error(error.message);
      Utils.showToast('Signed in with your passkey.', 'success');
      if (window.Auth && Auth.close) Auth.close();
    } catch (e) {
      if (e && (e.name === 'NotAllowedError' || e.name === 'AbortError')) return; // user cancelled
      Utils.showToast(e.message || 'Passkey sign-in failed.', 'error', 4500);
    }
  },

  /* ---------- Self-injected UI ---------- */
  _injectLoginButton() {
    const form = document.getElementById('loginForm');
    if (!form || document.getElementById('passkeyLoginBtn')) return;
    const anchor = document.getElementById('magicLoginBtn');
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.id = 'passkeyLoginBtn';
    btn.className = 'btn btn-ghost btn-block';
    btn.style.marginTop = '10px';
    btn.innerHTML = '\uD83D\uDD11 Sign in with a passkey';
    btn.addEventListener('click', () => this.login());
    if (anchor && anchor.parentNode === form) anchor.insertAdjacentElement('afterend', btn);
    else form.appendChild(btn);
  },

  _injectAccountButton(pop) {
    if (!pop || pop.querySelector('#passkeySetupBtn')) return;
    const logout = pop.querySelector('#logoutBtn');
    const btn = document.createElement('button');
    btn.id = 'passkeySetupBtn';
    btn.className = 'btn btn-ghost btn-block';
    btn.style.marginBottom = '8px';
    btn.textContent = '+ Add a passkey';
    btn.addEventListener('click', () => { pop.remove(); this.register(); });
    if (logout) logout.insertAdjacentElement('beforebegin', btn);
    else pop.appendChild(btn);
  },

  _initUI() {
    // The login modal is injected by Auth.init() on DOMContentLoaded; poll briefly for it.
    let tries = 0;
    const t = setInterval(() => {
      tries++;
      if (document.getElementById('loginForm')) { this._injectLoginButton(); clearInterval(t); }
      else if (tries > 60) clearInterval(t);
    }, 200);

    // The account popover is created on demand — watch for it.
    try {
      const mo = new MutationObserver((muts) => {
        for (const m of muts) {
          for (const n of m.addedNodes) {
            if (n.nodeType !== 1) continue;
            if (n.id === 'accountPop') this._injectAccountButton(n);
            else if (n.querySelector) {
              const pop = n.querySelector('#accountPop');
              if (pop) this._injectAccountButton(pop);
            }
          }
        }
      });
      mo.observe(document.body, { childList: true, subtree: true });
    } catch (_) {}
  }
};

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => Passkey._initUI());
} else {
  Passkey._initUI();
}
