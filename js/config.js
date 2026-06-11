/* ============================================================
   SPICE & EMBER — CONFIG + UTILITIES
   ============================================================ */

const CONFIG = {
  appName: 'Spice & Ember',
  tagline: 'Where Fire Meets Flavor',
  phone: '+91 98765 43210',
  email: 'hello@spiceandember.com',
  address: '42 Flame Street, Culinary District, Mumbai 400001',
  hours: {
    'Mon - Thu': '11:00 AM – 10:00 PM',
    'Fri - Sat': '11:00 AM – 11:00 PM',
    'Sunday': '12:00 PM – 9:00 PM'
  },
  social: {
    instagram: 'https://instagram.com',
    facebook: 'https://facebook.com',
    twitter: 'https://twitter.com'
  },
  currency: '\u20B9',
  taxRate: 0.08,
  deliveryFee: 3.99,
  freeDeliveryMin: 30,
  // Backend — Supabase. The anon/publishable key is safe to expose in client code.
  // Set both to '' to force fully-offline localStorage mode.
  supabaseUrl: 'https://rbwrvrwuxndzcstzurdk.supabase.co',
  supabaseAnonKey: 'sb_publishable_g5FYsXUwt1GTzSIq2_ZnZw_DgAEbkKt',
  googleAuthEnabled: true,
  // Razorpay — paste your PUBLIC Key ID here (starts with rzp_test_ or rzp_live_).
  // Leave blank ('') to use simulated payments. NEVER put your Key SECRET in client code.
  razorpayKeyId: '',
  // Storage keys
  storageKey: 'spice-ember-cart',
  bookingsKey: 'spice-ember-bookings',
  ordersKey: 'spice-ember-orders',
  reviewsKey: 'spice-ember-reviews',
  customMenuKey: 'spice-ember-custom-menu',
  authKey: 'spice-ember-auth',
  adminKey: 'spice-ember-admin',
  themeKey: 'spice-ember-theme',
  // Default admin credentials (demo)
  adminUser: 'admin',
  adminPass: 'admin123'
};

/* ============================================================
   UTILITIES
   ============================================================ */
const Utils = {
  formatPrice(amount) {
    const n = Number(amount) || 0;
    return CONFIG.currency + n.toFixed(2);
  },

  generateId() {
    return Date.now().toString(36) + Math.random().toString(36).substring(2, 7);
  },

  getFromStorage(key) {
    try { const d = localStorage.getItem(key); return d ? JSON.parse(d) : null; }
    catch { return null; }
  },

  saveToStorage(key, data) {
    try { localStorage.setItem(key, JSON.stringify(data)); return true; }
    catch { return false; }
  },

  getCart() { return this.getFromStorage(CONFIG.storageKey) || []; },
  saveCart(cart) { this.saveToStorage(CONFIG.storageKey, cart); this.updateCartBadge(); },
  getCartCount() { return this.getCart().reduce((s, i) => s + i.quantity, 0); },

  updateCartBadge() {
    const count = this.getCartCount();
    document.querySelectorAll('.cart-badge').forEach(b => {
      b.textContent = count;
      b.style.display = count > 0 ? 'flex' : 'none';
    });
  },

  getBookings() { return this.getFromStorage(CONFIG.bookingsKey) || []; },
  saveBookings(b) { this.saveToStorage(CONFIG.bookingsKey, b); },
  getOrders() { return this.getFromStorage(CONFIG.ordersKey) || []; },
  saveOrders(o) { this.saveToStorage(CONFIG.ordersKey, o); },
  getReviews() { return this.getFromStorage(CONFIG.reviewsKey) || []; },
  saveReviews(r) { this.saveToStorage(CONFIG.reviewsKey, r); },

  /* ----- Theme ----- */
  getTheme() { return localStorage.getItem(CONFIG.themeKey) || 'dark'; },
  setTheme(theme) {
    localStorage.setItem(CONFIG.themeKey, theme);
    document.body.classList.toggle('light-mode', theme === 'light');
    this.syncThemeIcon();
  },
  toggleTheme() { this.setTheme(this.getTheme() === 'dark' ? 'light' : 'dark'); },
  syncThemeIcon() {
    const isLight = this.getTheme() === 'light';
    document.querySelectorAll('.theme-toggle').forEach(t => {
      const sun = t.querySelector('.sun-icon');
      const moon = t.querySelector('.moon-icon');
      if (sun) sun.style.display = isLight ? 'none' : 'block';
      if (moon) moon.style.display = isLight ? 'block' : 'none';
    });
  },

  /* ----- Toast ----- */
  showToast(message, type = 'success', duration = 3000) {
    document.querySelector('.toast-container')?.remove();
    const icon = type === 'success' ? '\u2713' : type === 'error' ? '\u2715' : 'i';
    const c = document.createElement('div');
    c.className = 'toast-container';
    c.innerHTML = `<div class="toast toast-${type}"><span class="toast-icon">${icon}</span><span>${message}</span></div>`;
    document.body.appendChild(c);
    requestAnimationFrame(() => c.classList.add('show'));
    setTimeout(() => { c.classList.remove('show'); setTimeout(() => c.remove(), 400); }, duration);
  },

  debounce(fn, delay = 300) {
    let t; return function (...a) { clearTimeout(t); t = setTimeout(() => fn.apply(this, a), delay); };
  },

  getStarsHtml(rating) {
    const full = Math.floor(rating);
    const half = rating % 1 >= 0.5;
    let html = '';
    for (let i = 0; i < 5; i++) {
      if (i < full) html += '\u2605';
      else if (i === full && half) html += '\u2605';
      else html += '\u2606';
    }
    return `<span class="stars">${html}</span>`;
  },

  truncateText(t, max = 80) { return t && t.length > max ? t.substring(0, max).trim() + '\u2026' : (t || ''); },

  formatDate(d) {
    if (!d) return '\u2014';
    return new Date(d).toLocaleDateString('en-IN', { year: 'numeric', month: 'short', day: 'numeric' });
  },
  formatTime(d) {
    if (!d) return '';
    return new Date(d).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });
  },

  getStatusColor(status) {
    const c = { pending:'#fbbf24', confirmed:'#60a5fa', preparing:'#a78bfa', ready:'#34d399',
      delivered:'#34d399', completed:'#34d399', cancelled:'#f87171', 'in-progress':'#a78bfa' };
    return c[status] || '#8c8175';
  },

  /* ----- Ripple click animation ----- */
  initRipples() {
    document.addEventListener('click', e => {
      const el = e.target.closest('.btn, .add-btn, .icon-btn, .category-pill, .modal-tab');
      if (!el) return;
      const r = el.getBoundingClientRect();
      const size = Math.max(r.width, r.height);
      const span = document.createElement('span');
      span.className = 'ripple';
      span.style.width = span.style.height = size + 'px';
      span.style.left = (e.clientX - r.left - size / 2) + 'px';
      span.style.top = (e.clientY - r.top - size / 2) + 'px';
      el.appendChild(span);
      setTimeout(() => span.remove(), 650);
    });
  },

  initTheme() {
    document.body.classList.toggle('light-mode', this.getTheme() === 'light');
    this.syncThemeIcon();
  }
};
