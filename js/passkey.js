/* ============================================================
   SPICE & EMBER — PASSKEY (WebAuthn) CLIENT
   True passwordless login. Talks to the `passkey` Supabase Edge
   Function, which verifies the WebAuthn response server-side and
   returns a real session that we apply with setSession().

   Loaded automatically on every page (bootstrapped from
   supabase.js). It injects its own UI:
     - "Sign in with a passkey" button in the login popup
     - "+ Add a passkey" in the account menu
     - a one-time "Set up a passkey?" prompt on first sign-in
   ============================================================ */
const Passkey = {
  _libUrl: 'https://cdn.jsdelivr.net/npm/@simplewebauthn/browser@13/dist/bundle/index.umd.min.js',
  _libPromise: null,
  _justLoggedInWithPasskey: false,
  _subscribedAt: 0,

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
      return false;
    }
    const token = await this._accessToken();
    if (!token) {
      Utils.showToast('Please sign in first, then add a passkey.', 'error', 4000);
      if (window.Auth && Auth.open) Auth.open('login', 'add a passkey');
      return false;
    }
    try {
      await this._loadLib();
      const options = await this._post('register-options', {}, token);
      const attResp = await window.SimpleWebAuthnBrowser.startRegistration({ optionsJSON: options });
      await this._post('register-verify', { response: attResp }, token);
      Utils.showToast('Passkey added — you can now sign in with it.', 'success');
      return true;
    } catch (e) {
      if (e && (e.name === 'NotAllowedError' || e.name === 'AbortError')) return false; // user cancelled
      Utils.showToast(e.message || 'Could not add the passkey.', 'error', 4500);
      return false;
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
      // Don't offer the "set up a passkey" prompt right after a passkey login.
      this._justLoggedInWithPasskey = true;
      const { error } = await SB.client.auth.setSession({
        access_token: out.session.access_token,
        refresh_token: out.session.refresh_token
      });
      if (error) { this._justLoggedInWithPasskey = false; throw new Error(error.message); }
      Utils.showToast('Signed in with your passkey.', 'success');
      if (window.Auth && Auth.close) Auth.close();
    } catch (e) {
      if (e && (e.name === 'NotAllowedError' || e.name === 'AbortError')) return; // user cancelled
      Utils.showToast(e.message || 'Passkey sign-in failed.', 'error', 4500);
    }
  },

  /* ---------- Login-popup button ---------- */
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

  /* ---------- Account-menu button ---------- */
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

  /* ---------- First-login "set up a passkey?" prompt ---------- */
  _promptKey(uid) { return 'spice-ember-passkey-prompted:' + uid; },

  _watchFirstLogin() {
    if (typeof SB === 'undefined' || !SB.enabled || !SB.client || !SB.client.auth) return;
    this._subscribedAt = Date.now();
    try {
      SB.client.auth.onAuthStateChange((evt, session) => {
        if (evt !== 'SIGNED_IN' || !session || !session.user) return;
        // Ignore the initial/restored-session callback that fires right after subscribing.
        if (Date.now() - this._subscribedAt < 1200) return;
        // Don't prompt immediately after a passkey sign-in.
        if (this._justLoggedInWithPasskey) { this._justLoggedInWithPasskey = false; return; }
        if (!this.available()) return;
        const uid = session.user.id;
        try { if (localStorage.getItem(this._promptKey(uid)) === 'done') return; } catch (_) {}
        // Let the login modal close + welcome toast settle first.
        setTimeout(() => this._offerPasskey(uid), 900);
      });
    } catch (_) {}
  },

  _offerPasskey(uid) {
    if (document.getElementById('passkeyOfferOverlay')) return;
    if (!this.available()) return;
    const ov = document.createElement('div');
    ov.id = 'passkeyOfferOverlay';
    ov.style.cssText = 'position:fixed;inset:0;z-index:3000;display:flex;align-items:center;justify-content:center;background:rgba(0,0,0,.55);padding:20px;';
    ov.innerHTML =
      '<div role="dialog" aria-modal="true" aria-label="Set up a passkey" style="background:var(--surface,#1b1b1f);color:var(--text,inherit);border:1px solid var(--border-strong,rgba(255,255,255,.15));border-radius:18px;max-width:380px;width:100%;padding:26px;box-shadow:var(--shadow-lg,0 20px 60px rgba(0,0,0,.45));text-align:center;">' +
        '<div style="font-size:2.4rem;line-height:1;margin-bottom:10px;">\uD83D\uDD11</div>' +
        '<h3 style="margin:0 0 6px;font-size:1.25rem;">Set up a passkey?</h3>' +
        '<p style="margin:0 0 18px;color:var(--text-muted,#9a9aa2);font-size:.92rem;">Sign in next time with Face ID, Touch ID, or your device PIN — no password to remember.</p>' +
        '<button class="btn btn-primary btn-block btn-lg" id="passkeyOfferAdd">Add a passkey</button>' +
        '<button class="btn btn-ghost btn-block" id="passkeyOfferLater" style="margin-top:10px;">Maybe later</button>' +
      '</div>';
    document.body.appendChild(ov);
    const dismiss = () => {
      try { localStorage.setItem(this._promptKey(uid), 'done'); } catch (_) {}
      ov.remove();
    };
    ov.addEventListener('click', (e) => { if (e.target === ov) dismiss(); });
    const laterBtn = document.getElementById('passkeyOfferLater');
    if (laterBtn) laterBtn.addEventListener('click', dismiss);
    const addBtn = document.getElementById('passkeyOfferAdd');
    if (addBtn) addBtn.addEventListener('click', () => { dismiss(); this.register(); });
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

    // Offer to set up a passkey the first time a user signs in on this device.
    this._watchFirstLogin();
  }
};

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => Passkey._initUI());
} else {
  Passkey._initUI();
}
