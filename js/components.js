/* ============================================================
   SPICE & EMBER — SHARED COMPONENTS
   Injects a consistent navbar, mobile menu and footer into
   every page so the design never drifts. Set data-page on the
   <body> (e.g. data-page="menu") to mark the active link.
   ============================================================ */

const Components = {
  // Path prefix so the same markup works at root and in /admin
  base() { return window.location.pathname.includes('/admin/') ? '../' : ''; },

  icon(name) {
    const i = {
      cart: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="9" cy="21" r="1"/><circle cx="20" cy="21" r="1"/><path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"/></svg>',
      user: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>',
      sun: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/><line x1="4.2" y1="4.2" x2="5.6" y2="5.6"/><line x1="18.4" y1="18.4" x2="19.8" y2="19.8"/><line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/><line x1="4.2" y1="19.8" x2="5.6" y2="18.4"/><line x1="18.4" y1="5.6" x2="19.8" y2="4.2"/></svg>',
      moon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg>',
      menu: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><line x1="3" y1="7" x2="21" y2="7"/><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="17" x2="21" y2="17"/></svg>',
      insta: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="2" width="20" height="20" rx="5"/><circle cx="12" cy="12" r="4"/><line x1="17.5" y1="6.5" x2="17.5" y2="6.5"/></svg>',
      fb: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z"/></svg>',
      tw: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M23 3a10.9 10.9 0 0 1-3.14 1.53 4.48 4.48 0 0 0-7.86 3v1A10.66 10.66 0 0 1 3 4s-4 9 5 13a11.64 11.64 0 0 1-7 2c9 5 20 0 20-11.5a4.5 4.5 0 0 0-.08-.83A7.72 7.72 0 0 0 23 3z"/></svg>',
      pin: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>',
      phone: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.13.96.36 1.9.7 2.81a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.91.34 1.85.57 2.81.7A2 2 0 0 1 22 16.92z"/></svg>',
      mail: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="2" y="4" width="20" height="16" rx="2"/><path d="m22 6-10 7L2 6"/></svg>',
      search: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>'
    };
    return i[name] || '';
  },

  navLinks(active) {
    const b = this.base();
    const links = [
      { id: 'home', label: 'Home', href: b + 'index.html' },
      { id: 'menu', label: 'Menu', href: b + 'menu.html' },
      { id: 'book', label: 'Reserve', href: b + 'book-table.html' },
      { id: 'order', label: 'Order', href: b + 'order.html' },
      { id: 'orders', label: 'My Orders', href: b + 'my-orders.html' },
      { id: 'about', label: 'About', href: b + 'about.html' }
    ];
    return links.map(l => `<a href="${l.href}" class="${active === l.id ? 'active' : ''}">${l.label}</a>`).join('');
  },

  renderNavbar(active) {
    const b = this.base();
    return `
    <nav class="navbar" id="navbar">
      <div class="nav-inner">
        <a href="${b}index.html" class="nav-logo"><span class="flame-ico">\uD83D\uDD25</span>Spice <span>&amp; Ember</span></a>
        <div class="nav-links">${this.navLinks(active)}</div>
        <div class="nav-actions">
          <button class="icon-btn theme-toggle" aria-label="Toggle theme">
            <span class="sun-icon">${this.icon('sun')}</span>
            <span class="moon-icon" style="display:none">${this.icon('moon')}</span>
          </button>
          <button class="icon-btn" data-auth-open aria-label="Account">${this.icon('user')}<span class="auth-label" style="display:none"></span></button>
          <a href="${b}order.html" class="icon-btn" aria-label="Cart">${this.icon('cart')}<span class="cart-badge">0</span></a>
          <button class="icon-btn nav-menu-btn" aria-label="Menu">${this.icon('menu')}</button>
        </div>
      </div>
    </nav>
    <div class="mobile-menu-overlay"></div>
    <aside class="mobile-menu">
      <div class="mobile-menu-head">
        <span class="nav-logo" style="font-size:1.3rem"><span class="flame-ico">\uD83D\uDD25</span>Spice <span>&amp; Ember</span></span>
        <button class="icon-btn mobile-menu-close" aria-label="Close">&times;</button>
      </div>
      ${this.navLinks(active)}
      <button class="btn btn-primary" data-auth-open>Login / Sign Up</button>
    </aside>`;
  },

  renderFooter() {
    const b = this.base();
    return `
    <footer class="footer">
      <div class="container">
        <div class="footer-grid">
          <div class="footer-brand">
            <a href="${b}index.html" class="nav-logo"><span class="flame-ico">\uD83D\uDD25</span>Spice <span>&amp; Ember</span></a>
            <p>Where fire meets flavor. Wood-fired cooking, smoked specialties and craft cocktails in the heart of the culinary district.</p>
            <div class="footer-social">
              <a href="${CONFIG.social.instagram}" target="_blank" rel="noopener" aria-label="Instagram">${this.icon('insta')}</a>
              <a href="${CONFIG.social.facebook}" target="_blank" rel="noopener" aria-label="Facebook">${this.icon('fb')}</a>
              <a href="${CONFIG.social.twitter}" target="_blank" rel="noopener" aria-label="Twitter">${this.icon('tw')}</a>
            </div>
          </div>
          <div class="footer-col">
            <h5>Explore</h5>
            <ul>
              <li><a href="${b}index.html">Home</a></li>
              <li><a href="${b}menu.html">Menu</a></li>
              <li><a href="${b}book-table.html">Reserve a Table</a></li>
              <li><a href="${b}order.html">Order Online</a></li>
              <li><a href="${b}about.html">About Us</a></li>
            </ul>
          </div>
          <div class="footer-col">
            <h5>Hours</h5>
            <ul>
              ${Object.entries(CONFIG.hours).map(([d, h]) => `<li style="color:var(--text-muted)">${d}<br><span style="color:var(--text-soft)">${h}</span></li>`).join('')}
            </ul>
          </div>
          <div class="footer-col">
            <h5>Get in Touch</h5>
            <ul class="footer-contact">
              <li>${this.icon('pin')}<span>${CONFIG.address}</span></li>
              <li>${this.icon('phone')}<span>${CONFIG.phone}</span></li>
              <li>${this.icon('mail')}<span>${CONFIG.email}</span></li>
            </ul>
          </div>
        </div>
        <div class="footer-bottom">
          <span>&copy; ${new Date().getFullYear()} Spice &amp; Ember. All rights reserved.</span>
          <span>Crafted with fire \uD83D\uDD25</span>
        </div>
      </div>
    </footer>`;
  },

  mount(active) {
    const navMount = document.getElementById('nav-mount');
    const footMount = document.getElementById('footer-mount');
    if (navMount) navMount.innerHTML = this.renderNavbar(active);
    if (footMount) footMount.innerHTML = this.renderFooter();
    this.bindNav();
  },

  bindNav() {
    // Theme
    Utils.initTheme();
    document.querySelectorAll('.theme-toggle').forEach(t => t.addEventListener('click', () => Utils.toggleTheme()));

    // Navbar scroll state
    const nav = document.getElementById('navbar');
    const onScroll = () => nav && nav.classList.toggle('scrolled', window.scrollY > 40);
    onScroll(); window.addEventListener('scroll', onScroll, { passive: true });

    // Mobile menu
    const btn = document.querySelector('.nav-menu-btn');
    const menu = document.querySelector('.mobile-menu');
    const overlay = document.querySelector('.mobile-menu-overlay');
    const close = document.querySelector('.mobile-menu-close');
    const toggle = () => { menu.classList.toggle('open'); overlay.classList.toggle('open'); };
    btn?.addEventListener('click', toggle);
    overlay?.addEventListener('click', toggle);
    close?.addEventListener('click', toggle);
    menu?.querySelectorAll('a').forEach(a => a.addEventListener('click', () => toggle()));

    Utils.updateCartBadge();
    Utils.initRipples();
  }
};
