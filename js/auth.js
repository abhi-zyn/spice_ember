/* ============================================================
   SPICE & EMBER — AUTH + LOGIN POPUP
   Supabase Auth (email/password + Google + magic link) with an
   automatic localStorage fallback, login gating, account menu,
   and optional Cloudflare Turnstile captcha.
   ============================================================ */
const Auth = {
  isLoggedIn: false,
  userName: '',
  userEmail: '',
  userId: null,
  isAdmin: false,
  _profile: null,
  _captcha: { login: null, signup: null },

  async init() {
    this.injectModal();
    this.bindDelegation();
    this._initCaptcha();
    this.isAdmin = localStorage.getItem(CONFIG.adminKey) === 'true';
    if (typeof SB !== 'undefined' && SB.enabled) {
      try {
        const { data } = await SB.client.auth.getSession();
        this._applySession(data && data.session);
        SB.client.auth.onAuthStateChange((_evt, session) => {
          const was = this.isLoggedIn;
          this._applySession(session);
          this.syncUI();
          if (!was && this.isLoggedIn) this.close();
        });
      } catch (e) { console.warn('Auth session error', e); }
    } else {
      const saved = Utils.getFromStorage(CONFIG.authKey);
      if (saved && saved.email) {
        this.isLoggedIn = true;
        this.userName = saved.name || saved.email.split('@')[0];
        this.userEmail = saved.email;
        this.userId = saved.id || ('local_' + saved.email);
      }
    }
    this.syncUI();
  },

  _applySession(session) {
    if (session && session.user) {
      const u = session.user;
      const meta = u.user_metadata || {};
      this.isLoggedIn = true;
      this.userId = u.id;
      this.userEmail = u.email || '';
      this.userName = meta.full_name || meta.name || (u.email ? u.email.split('@')[0] : 'Guest');
    } else {
      this.isLoggedIn = false; this.userId = null; this.userEmail = ''; this.userName = '';
    }
  },

  getUsers() { return Utils.getFromStorage('spice-ember-users') || []; },
  saveUsers(u) { Utils.saveToStorage('spice-ember-users', u); },

  /* ---------- Cloudflare Turnstile captcha ---------- */
  _captchaKey() {
    return (typeof CONFIG !== 'undefined' && CONFIG.turnstileSiteKey) ? CONFIG.turnstileSiteKey : '';
  },
  _initCaptcha() {
    const siteKey = this._captchaKey();
    if (!siteKey) return; // captcha disabled until a site key is set in config.js
    const render = () => {
      if (!(window.turnstile && window.turnstile.render)) return;
      const loginEl = document.getElementById('loginCaptcha');
      const signupEl = document.getElementById('signupCaptcha');
      if (loginEl && this._captcha.login === null) {
        this._captcha.login = window.turnstile.render(loginEl, { sitekey: siteKey, theme: 'auto' });
      }
      if (signupEl && this._captcha.signup === null) {
        this._captcha.signup = window.turnstile.render(signupEl, { sitekey: siteKey, theme: 'auto' });
      }
    };
    if (window.turnstile && window.turnstile.render) { render(); return; }
    if (!document.getElementById('cf-turnstile-script')) {
      const s = document.createElement('script');
      s.id = 'cf-turnstile-script';
      s.src = 'https://challenges.cloudflare.com/turnstile/v0/api.js';
      s.async = true; s.defer = true;
      document.head.appendChild(s);
    }
    let tries = 0;
    const t = setInterval(() => {
      tries++;
      if (window.turnstile && window.turnstile.render) { clearInterval(t); render(); }
      else if (tries > 50) clearInterval(t);
    }, 150);
  },
  _getCaptchaToken(mode) {
    try {
      const id = this._captcha[mode];
      if (window.turnstile && id !== null && id !== undefined) return window.turnstile.getResponse(id) || '';
    } catch (_) {}
    return '';
  },
  _resetCaptcha(mode) {
    try {
      const id = this._captcha[mode];
      if (window.turnstile && id !== null && id !== undefined) window.turnstile.reset(id);
    } catch (_) {}
  },
  // Returns { ok, token }. When captcha is disabled, ok:true and token:undefined.
  _requireCaptcha(mode) {
    if (!this._captchaKey()) return { ok: true, token: undefined };
    const token = this._getCaptchaToken(mode);
    if (!token) { this.showError('Please complete the captcha verification.'); return { ok: false }; }
    return { ok: true, token };
  },

  /* ---------- Modal markup ---------- */
  injectModal() {
    if (document.getElementById('loginModal')) return;
    const googleSvg = '<svg viewBox="0 0 48 48" width="18" height="18" aria-hidden="true"><path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3C33.7 32.9 29.3 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.9 1.2 8 3.1l5.7-5.7C34.5 6.5 29.5 4.5 24 4.5 13.2 4.5 4.5 13.2 4.5 24S13.2 43.5 24 43.5 43.5 34.8 43.5 24c0-1.2-.1-2.3-.4-3.5z"/><path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.7 15.1 18.9 12 24 12c3.1 0 5.9 1.2 8 3.1l5.7-5.7C34.5 6.5 29.5 4.5 24 4.5 16.3 4.5 9.7 8.8 6.3 14.7z"/><path fill="#4CAF50" d="M24 43.5c5.4 0 10.3-2.1 14-5.4l-6.5-5.5C29.6 34.5 26.9 35.5 24 35.5c-5.3 0-9.7-3.1-11.3-7.6l-6.6 5.1C9.6 39.1 16.2 43.5 24 43.5z"/><path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.2-2.2 4.1-4.1 5.5l6.5 5.5C41.4 35.9 43.5 30.5 43.5 24c0-1.2-.1-2.3-.4-3.5z"/></svg>';
    const html =
      '<div class="modal-overlay" id="loginModal" role="dialog" aria-modal="true" aria-labelledby="loginModalTitle">' +
        '<div class="modal">' +
          '<button class="modal-close" data-auth-close aria-label="Close">&times;</button>' +
          '<div class="modal-logo" id="loginModalTitle">Spice <span>&amp; Ember</span></div>' +
          '<p class="modal-sub">Welcome back to the fire</p>' +
          '<button type="button" class="btn-google" id="googleLoginBtn">' + googleSvg + '<span>Continue with Google</span></button>' +
          '<div class="modal-or"><span>or</span></div>' +
          '<div class="modal-tabs">' +
            '<button class="modal-tab active" data-auth-tab="login">Login</button>' +
            '<button class="modal-tab" data-auth-tab="signup">Sign Up</button>' +
          '</div>' +
          '<div class="modal-error" id="authError"></div>' +
          '<form class="modal-form-section active" id="loginForm" data-auth-section="login">' +
            '<div class="form-group"><label for="loginEmail">Email</label><input type="email" id="loginEmail" class="form-control" placeholder="you@email.com" required autocomplete="email"></div>' +
            '<div class="form-group"><label for="loginPassword">Password</label><input type="password" id="loginPassword" class="form-control" placeholder="Your password" required autocomplete="current-password"></div>' +
            '<div id="loginCaptcha" class="cf-turnstile" style="margin:4px 0 12px;"></div>' +
            '<button type="submit" class="btn btn-primary btn-block btn-lg">Sign In</button>' +
            '<button type="button" class="btn btn-ghost btn-block" id="magicLoginBtn" style="margin-top:10px;">Email me a login link</button>' +
            '<p class="modal-hint">Admin? Use <strong>admin</strong> / <strong>admin123</strong></p>' +
          '</form>' +
          '<form class="modal-form-section" id="signupForm" data-auth-section="signup">' +
            '<div class="form-group"><label for="signupName">Full Name</label><input type="text" id="signupName" class="form-control" placeholder="Your name" required autocomplete="name"></div>' +
            '<div class="form-group"><label for="signupEmail">Email</label><input type="email" id="signupEmail" class="form-control" placeholder="you@email.com" required autocomplete="email"></div>' +
            '<div class="form-group"><label for="signupPassword">Password</label><input type="password" id="signupPassword" class="form-control" placeholder="Create a password" required minlength="6" autocomplete="new-password"></div>' +
            '<div id="signupCaptcha" class="cf-turnstile" style="margin:4px 0 12px;"></div>' +
            '<button type="submit" class="btn btn-gold btn-block btn-lg">Create Account</button>' +
            '<button type="button" class="btn btn-ghost btn-block" id="magicSignupBtn" style="margin-top:10px;">Verify with a magic link instead</button>' +
            '<p class="modal-hint">By signing up you agree to our terms of service.</p>' +
          '</form>' +
          '<div class="modal-confirm" id="magicSentConfirm">' +
            '<div class="modal-confirm-icon">✉️</div>' +
            '<h3 class="modal-confirm-title">Check your email</h3>' +
            '<p class="modal-confirm-text">We sent a secure login link to <strong id="magicSentEmail"></strong>. Open it on this device to finish signing in.</p>' +
            '<button type="button" class="btn btn-primary btn-block btn-lg" id="magicConfirmOk">OK</button>' +
          '</div>' +
        '</div>' +
      '</div>';
    document.body.insertAdjacentHTML('beforeend', html);

    const modal = document.getElementById('loginModal');
    modal.addEventListener('click', e => { if (e.target === modal) this.close(); });
    modal.querySelectorAll('[data-auth-close]').forEach(b => b.addEventListener('click', () => this.close()));
    modal.querySelectorAll('[data-auth-tab]').forEach(tab => tab.addEventListener('click', () => this.switchTab(tab.dataset.authTab)));
    document.getElementById('loginForm').addEventListener('submit', e => this.handleLogin(e));
    document.getElementById('signupForm').addEventListener('submit', e => this.handleSignup(e));
    document.getElementById('googleLoginBtn').addEventListener('click', () => this.loginWithGoogle());
    const mlBtn = document.getElementById('magicLoginBtn');
    if (mlBtn) mlBtn.addEventListener('click', () => this.sendMagicLink('login'));
    const msBtn = document.getElementById('magicSignupBtn');
    if (msBtn) msBtn.addEventListener('click', () => this.sendMagicLink('signup'));
    const okBtn = document.getElementById('magicConfirmOk');
    if (okBtn) okBtn.addEventListener('click', () => this.hideMagicSent());
  },

  switchTab(name) {
    const modal = document.getElementById('loginModal');
    if (!modal) return;
    this.hideMagicSent();
    modal.querySelectorAll('[data-auth-tab]').forEach(t => t.classList.toggle('active', t.dataset.authTab === name));
    modal.querySelectorAll('[data-auth-section]').forEach(s => s.classList.toggle('active', s.dataset.authSection === name));
    this.hideError();
    this._initCaptcha();
    const sub = modal.querySelector('.modal-sub');
    if (sub) sub.textContent = name === 'login' ? 'Welcome back to the fire' : 'Join the Spice & Ember family';
  },

  open(tab = 'login', contextLabel = '') {
    if (this.isLoggedIn) { this.openAccountMenu(); return; }
    const modal = document.getElementById('loginModal');
    if (!modal) return;
    this.switchTab(tab);
    if (contextLabel) {
      const sub = modal.querySelector('.modal-sub');
      if (sub) sub.textContent = 'Please log in to ' + contextLabel;
    }
    modal.classList.add('open');
    document.body.style.overflow = 'hidden';
    setTimeout(() => { const el = document.getElementById(tab === 'login' ? 'loginEmail' : 'signupName'); if (el) el.focus(); }, 350);
  },
  close() {
    const modal = document.getElementById('loginModal');
    if (!modal) return;
    modal.classList.remove('open');
    document.body.style.overflow = '';
    this.hideError();
    this.hideMagicSent();
  },

  /* ---------- Magic-link sent confirmation (in-modal) ---------- */
  showMagicSent(email) {
    const modal = document.getElementById('loginModal');
    if (!modal) return;
    const card = modal.querySelector('.modal');
    const em = modal.querySelector('#magicSentEmail');
    if (em) em.textContent = email || '';
    this.hideError();
    if (card) card.classList.add('show-confirm');
  },
  hideMagicSent() {
    const modal = document.getElementById('loginModal');
    if (!modal) return;
    const card = modal.querySelector('.modal');
    if (card) card.classList.remove('show-confirm');
  },

  /* ---------- Login gating ---------- */
  requireLogin(contextLabel = 'continue') {
    if (this.isLoggedIn) return true;
    this.open('login', contextLabel);
    return false;
  },

  showError(msg) { const e = document.getElementById('authError'); if (e) { e.textContent = msg; e.classList.add('show'); } },
  hideError() { const e = document.getElementById('authError'); if (e) e.classList.remove('show'); },

  /* ---------- Google ---------- */
  async loginWithGoogle() {
    if (!(typeof SB !== 'undefined' && SB.enabled)) {
      Utils.showToast('Google login needs Supabase configured — see README.', 'error', 4500);
      return;
    }
    try {
      const { error } = await SB.client.auth.signInWithOAuth({ provider: 'google', options: { redirectTo: window.location.href } });
      if (error) this.showError(error.message);
    } catch (e) { this.showError('Could not start Google sign-in.'); }
  },

  /* ---------- Magic link (passwordless email verification) ---------- */
  async sendMagicLink(mode = 'login') {
    if (!(typeof SB !== 'undefined' && SB.enabled)) {
      Utils.showToast('Magic links need Supabase configured — see SETUP_PAYMENTS.md.', 'error', 4500);
      return;
    }
    const emailEl = document.getElementById(mode === 'signup' ? 'signupEmail' : 'loginEmail');
    const email = (emailEl && emailEl.value.trim()) || '';
    if (!email) { this.showError('Enter your email address first.'); return; }
    const cap = this._requireCaptcha(mode);
    if (!cap.ok) return;
    const name = mode === 'signup' ? (document.getElementById('signupName').value.trim() || '') : '';
    const options = {
      shouldCreateUser: true,
      emailRedirectTo: window.location.origin + window.location.pathname
    };
    if (name) options.data = { full_name: name };
    if (cap.token !== undefined) options.captchaToken = cap.token;
    try {
      const { error } = await SB.client.auth.signInWithOtp({ email, options });
      this._resetCaptcha(mode);
      if (error) { this.showError(error.message); return; }
      this.hideError();
      this.showMagicSent(email);
    } catch (e) { this._resetCaptcha(mode); this.showError('Could not send the magic link. Please try again.'); }
  },

  /* ---------- Email / password ---------- */
  async handleLogin(e) {
    e.preventDefault();
    const email = document.getElementById('loginEmail').value.trim();
    const password = document.getElementById('loginPassword').value;

    if (email.toLowerCase() === CONFIG.adminUser && password === CONFIG.adminPass) {
      localStorage.setItem(CONFIG.adminKey, 'true');
      this.isAdmin = true;
      Utils.showToast('Admin login successful', 'success');
      this.close();
      setTimeout(() => { window.location.href = this._adminPath(); }, 500);
      return;
    }

    if (typeof SB !== 'undefined' && SB.enabled) {
      const cap = this._requireCaptcha('login');
      if (!cap.ok) return;
      const options = {};
      if (cap.token !== undefined) options.captchaToken = cap.token;
      const { error } = await SB.client.auth.signInWithPassword({ email, password, options });
      this._resetCaptcha('login');
      if (error) { this.showError(error.message || 'Invalid email or password.'); return; }
      this._profile = null;
      Utils.showToast('Welcome back!', 'success');
      this.close();
      return;
    }

    const user = this.getUsers().find(u => u.email.toLowerCase() === email.toLowerCase());
    if (!user || user.password !== password) { this.showError('Invalid email or password. Please try again.'); return; }
    this._setSession(user.name, user.email);
    Utils.showToast('Welcome back, ' + user.name + '!', 'success');
    this.close();
  },

  async handleSignup(e) {
    e.preventDefault();
    const name = document.getElementById('signupName').value.trim();
    const email = document.getElementById('signupEmail').value.trim();
    const password = document.getElementById('signupPassword').value;
    if (password.length < 6) { this.showError('Password must be at least 6 characters.'); return; }

    if (typeof SB !== 'undefined' && SB.enabled) {
      const cap = this._requireCaptcha('signup');
      if (!cap.ok) return;
      const options = { data: { full_name: name }, emailRedirectTo: window.location.origin + window.location.pathname };
      if (cap.token !== undefined) options.captchaToken = cap.token;
      const { data, error } = await SB.client.auth.signUp({ email, password, options });
      this._resetCaptcha('signup');
      if (error) { this.showError(error.message); return; }
      if (data.user) { try { await SB.client.from('profiles').upsert({ id: data.user.id, full_name: name, email }); } catch (_) {} }
      if (data.session) { Utils.showToast('Welcome, ' + name + '!', 'success'); this.close(); }
      else { this.showMagicSent(email); }
      return;
    }

    const users = this.getUsers();
    if (users.some(u => u.email.toLowerCase() === email.toLowerCase())) { this.showError('An account with this email already exists.'); return; }
    users.push({ name, email, password });
    this.saveUsers(users);
    this._setSession(name, email);
    Utils.showToast('Welcome to Spice & Ember, ' + name + '!', 'success');
    this.close();
  },

  _setSession(name, email) {
    this.isLoggedIn = true; this.userName = name; this.userEmail = email; this.userId = 'local_' + email;
    Utils.saveToStorage(CONFIG.authKey, { name, email, id: this.userId });
    this.syncUI();
  },

  async logout() {
    if (typeof SB !== 'undefined' && SB.enabled) { try { await SB.client.auth.signOut(); } catch (_) {} }
    localStorage.removeItem(CONFIG.authKey);
    localStorage.removeItem(CONFIG.adminKey);
    this.isAdmin = false; this._profile = null;
    this._applySession(null);
    this.syncUI();
    Utils.showToast('You have been logged out', 'info');
  },

  /* ---------- Profile (address etc.) ---------- */
  async getProfile() {
    if (this._profile) return this._profile;
    try { this._profile = await API.getProfile(); } catch (_) { this._profile = null; }
    return this._profile;
  },
  async saveProfile(patch) {
    try { this._profile = await API.upsertProfile(patch); } catch (e) { console.warn('saveProfile', e); }
    return this._profile;
  },

  /* ---------- Account menu ---------- */
  openAccountMenu() {
    const existing = document.getElementById('accountPop');
    if (existing) { existing.remove(); return; }
    const btn = document.querySelector('[data-auth-open]');
    const base = window.location.pathname.includes('/admin/') ? '../' : '';
    const pop = document.createElement('div');
    pop.id = 'accountPop';
    pop.style.cssText = 'position:absolute;top:calc(var(--nav-h) - 8px);right:28px;z-index:1500;background:var(--surface);border:1px solid var(--border-strong);border-radius:16px;padding:18px;min-width:230px;box-shadow:var(--shadow-lg);';
    pop.innerHTML =
      '<div style="font-weight:600;">' + this.userName + '</div>' +
      '<div style="font-size:.82rem;color:var(--text-muted);margin-bottom:14px;">' + this.userEmail + '</div>' +
      '<a href="' + base + 'my-orders.html" class="btn btn-ghost btn-block" style="margin-bottom:8px;">My Orders</a>' +
      (this.isAdmin ? '<a href="' + this._adminPath() + '" class="btn btn-ghost btn-block" style="margin-bottom:8px;">Admin Dashboard</a>' : '') +
      '<button class="btn btn-primary btn-block" id="logoutBtn">Log Out</button>';
    document.body.appendChild(pop);
    document.getElementById('logoutBtn').addEventListener('click', () => { this.logout(); pop.remove(); });
    setTimeout(() => {
      const off = e => { if (!pop.contains(e.target) && e.target !== btn && !(btn && btn.contains(e.target))) { pop.remove(); document.removeEventListener('click', off); } };
      document.addEventListener('click', off);
    }, 0);
  },

  syncUI() {
    document.querySelectorAll('[data-auth-open]').forEach(btn => {
      const label = btn.querySelector('.auth-label');
      if (this.isLoggedIn) {
        if (label) label.textContent = (this.userName || 'Account').split(' ')[0];
        btn.classList.add('logged-in');
      } else {
        if (label) label.textContent = 'Login';
        btn.classList.remove('logged-in');
      }
    });
    // Mobile menu: swap the "Login / Sign Up" button for an account area.
    document.querySelectorAll('[data-auth-mobile-login]').forEach(b => { b.style.display = this.isLoggedIn ? 'none' : ''; });
    document.querySelectorAll('[data-auth-mobile-account]').forEach(a => { a.style.display = this.isLoggedIn ? '' : 'none'; });
    document.querySelectorAll('[data-auth-mobile-name]').forEach(n => { n.textContent = this.isLoggedIn ? (this.userName || 'My Account') : ''; });
  },

  bindDelegation() {
    document.addEventListener('click', e => {
      const logoutEl = e.target.closest('[data-auth-logout]');
      if (logoutEl) { e.preventDefault(); this.logout(); return; }
      const opener = e.target.closest('[data-auth-open]');
      if (opener) { e.preventDefault(); this.open('login'); }
    });
    document.addEventListener('keydown', e => { if (e.key === 'Escape') this.close(); });
  },

  _adminPath() {
    return window.location.pathname.includes('/admin/') ? 'dashboard.html' : 'admin/dashboard.html';
  }
};

document.addEventListener('DOMContentLoaded', () => Auth.init());
