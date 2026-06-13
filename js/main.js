/* ============================================================
   SPICE & EMBER — MAIN APP LOGIC
   ============================================================ */

const App = {
  currentCategory: 'all',
  currentSort: 'popular',
  searchQuery: '',

  init() {
    this.renderFeatured();
    this.renderCategoryPills();
    this.renderMenuGrid();
    this.renderMyOrders();
    this.renderMyBookings();
    this.initSearch();
    this.initSort();
    this.initBookingForm();
    this.initReviewForm();
    this.initContactForm();
    this.initNewsletter();
    this.initStatsCounter();
    this.initScrollReveal();
    this.initCustomCursor();
    this.initParallax();
  },

  /* ---------- Item card markup ---------- */
  cardHtml(item) {
    const hasAddons = Array.isArray(item.addons) && item.addons.length;
    return `
    <article class="menu-card reveal">
      <div class="menu-card-img">
        <img src="${item.image}" alt="${item.name}" loading="lazy">
        <span class="menu-card-badge ${item.type === 'veg' ? 'badge-veg' : 'badge-nonveg'}">${item.type === 'veg' ? 'Veg' : 'Non-Veg'}</span>
      </div>
      <div class="menu-card-body">
        <h3 class="menu-card-title">${item.name}</h3>
        <p class="menu-card-desc">${Utils.truncateText(item.description, 84)}</p>
        <div class="menu-card-rating">${Utils.getStarsHtml(item.rating)} <span>${item.rating} (${item.reviews})</span></div>
        <div class="menu-card-foot">
          <span class="menu-card-price">${Utils.formatPrice(item.price)}${hasAddons ? '<span style="font-size:.72rem;color:var(--text-muted);font-weight:500"> + extras</span>' : ''}</span>
          <button class="add-btn" aria-label="Add ${item.name} to cart" data-add="${item.id}">+</button>
        </div>
      </div>
    </article>`;
  },

  bindAddButtons(container) {
    container.querySelectorAll('[data-add]').forEach(btn => {
      btn.addEventListener('click', () => {
        if (typeof Auth !== 'undefined' && !Auth.requireLogin('add items to your cart')) return;
        const item = MenuData.getById(btn.dataset.add);
        if (item) this.addToCartWithAddons(item);
      });
    });
  },

  // If the dish has add-ons, ask first via a popup; otherwise add directly.
  addToCartWithAddons(item) {
    const addons = Array.isArray(item.addons) ? item.addons : [];
    if (!addons.length) {
      Cart.add({ id: item.id, name: item.name, price: item.price, image: item.image, type: item.type, quantity: 1 });
      return;
    }
    this.openAddonModal(item, addons);
  },

  openAddonModal(item, addons) {
    document.querySelector('.addon-overlay')?.remove();
    const overlay = document.createElement('div');
    overlay.className = 'addon-overlay';
    overlay.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,.6);backdrop-filter:blur(3px);z-index:4000;display:flex;align-items:center;justify-content:center;padding:18px';
    overlay.innerHTML = `
      <div class="addon-modal" style="background:var(--surface,#1b1714);color:var(--text,#fff);max-width:430px;width:100%;border-radius:18px;padding:26px;box-shadow:0 20px 60px rgba(0,0,0,.5);max-height:90vh;overflow:auto">
        <h3 style="margin:0 0 4px;font-size:1.3rem">Add extras to ${item.name}?</h3>
        <p style="margin:0 0 18px;color:var(--text-muted,#aaa);font-size:.9rem">Pick any add-ons you'd like with this dish.</p>
        <div class="addon-list" style="display:flex;flex-direction:column;gap:10px">
          ${addons.map((a, i) => `
            <label style="display:flex;align-items:center;gap:12px;padding:12px 14px;border:1px solid var(--border-strong,#3a322c);border-radius:12px;cursor:pointer">
              <input type="checkbox" data-addon="${i}" style="width:18px;height:18px;accent-color:#ff5722">
              <span style="flex:1">${a.name}</span>
              <span style="color:var(--text-muted,#aaa)">+${Utils.formatPrice(a.price)}</span>
            </label>`).join('')}
        </div>
        <div style="display:flex;gap:12px;margin-top:22px">
          <button class="btn btn-ghost addon-skip" style="flex:1">No, thanks</button>
          <button class="btn btn-primary addon-confirm" style="flex:1">Add to Cart</button>
        </div>
      </div>`;
    document.body.appendChild(overlay);

    const close = () => overlay.remove();
    const addWith = (selected) => {
      Cart.add({ id: item.id, name: item.name, price: item.price, image: item.image, type: item.type, addons: selected, quantity: 1 });
      close();
    };
    overlay.addEventListener('click', e => { if (e.target === overlay) close(); });
    overlay.querySelector('.addon-skip').addEventListener('click', () => addWith([]));
    overlay.querySelector('.addon-confirm').addEventListener('click', () => {
      const selected = [...overlay.querySelectorAll('[data-addon]:checked')].map(cb => addons[parseInt(cb.dataset.addon, 10)]);
      addWith(selected);
    });
  },

  renderFeatured() {
    const c = document.querySelector('.featured-grid');
    if (!c) return;
    const items = MenuData.getFeatured().slice(0, 6);
    c.innerHTML = items.map(i => this.cardHtml(i)).join('');
    this.bindAddButtons(c);
  },

  renderCategoryPills() {
    const c = document.querySelector('.category-pills');
    if (!c) return;
    c.innerHTML = MenuData.getCategories()
      .map(cat => `<button class="category-pill ${cat === this.currentCategory ? 'active' : ''}" data-cat="${cat}">${CATEGORY_LABELS[cat] || cat}</button>`)
      .join('');
    c.querySelectorAll('.category-pill').forEach(p => p.addEventListener('click', () => {
      this.currentCategory = p.dataset.cat;
      c.querySelectorAll('.category-pill').forEach(x => x.classList.toggle('active', x === p));
      this.renderMenuGrid();
    }));
  },

  renderMenuGrid() {
    const c = document.querySelector('.menu-grid-dynamic');
    if (!c) return;
    const items = MenuData.filter({ category: this.currentCategory, sortBy: this.currentSort, search: this.searchQuery });
    if (!items.length) {
      c.innerHTML = `<div class="empty-state"><div class="ico">🔍</div><h3>No items found</h3><p>Try adjusting your search or filters.</p></div>`;
      return;
    }
    c.innerHTML = items.map(i => this.cardHtml(i)).join('');
    this.bindAddButtons(c);
    this.observeReveals(c);
  },

  initSearch() {
    const input = document.querySelector('.search-box input');
    if (!input) return;
    input.addEventListener('input', Utils.debounce(e => {
      this.searchQuery = e.target.value;
      this.renderMenuGrid();
    }, 220));
  },

  initSort() {
    const sel = document.querySelector('.sort-select');
    if (!sel) return;
    sel.addEventListener('change', e => { this.currentSort = e.target.value; this.renderMenuGrid(); });
  },

  /* ---------- Booking ---------- */
  initBookingForm() {
    const form = document.getElementById('bookingForm');
    if (!form) return;
    const dateInput = form.querySelector('[name="date"]');
    if (dateInput) dateInput.min = new Date().toISOString().split('T')[0];
    form.addEventListener('submit', async e => {
      e.preventDefault();
      if (typeof Auth !== 'undefined' && !Auth.requireLogin('make a reservation')) return;
      const fd = new FormData(form);
      const btn = form.querySelector('button[type="submit"]');
      btn.disabled = true; btn.textContent = 'Reserving…';
      try {
        await API.createBooking({
          name: fd.get('name'), email: fd.get('email'), phone: fd.get('phone'),
          date: fd.get('date'), time: fd.get('time'), guests: fd.get('guests'),
          occasion: fd.get('occasion') || '', notes: fd.get('notes') || '',
          user_id: (typeof Auth !== 'undefined' && Auth.userId) || null
        });
        if (typeof Auth !== 'undefined' && Auth.isLoggedIn) {
          Auth.saveProfile({ full_name: fd.get('name'), email: fd.get('email'), phone: fd.get('phone') });
        }
        form.reset();
        const success = document.getElementById('bookingSuccess');
        if (success) { success.style.display = 'block'; success.scrollIntoView({ behavior: 'smooth' }); }
        Utils.showToast('Table reserved! We’ll confirm shortly.', 'success');
        this.renderMyBookings();
      } catch { Utils.showToast('Could not reserve. Try again.', 'error'); }
      finally { btn.disabled = false; btn.textContent = 'Reserve Table'; }
    });
  },

  /* ---------- Reviews ---------- */
  initReviewForm() {
    const form = document.getElementById('reviewForm');
    if (!form) return;
    let selected = 0;
    const stars = form.querySelectorAll('.rating-input span');
    stars.forEach((s, idx) => {
      s.addEventListener('click', () => { selected = idx + 1; stars.forEach((x, i) => x.classList.toggle('on', i < selected)); });
      s.addEventListener('mouseenter', () => stars.forEach((x, i) => x.classList.toggle('hover', i <= idx)));
      s.addEventListener('mouseleave', () => stars.forEach(x => x.classList.remove('hover')));
    });
    form.addEventListener('submit', async e => {
      e.preventDefault();
      const fd = new FormData(form);
      if (!selected) { Utils.showToast('Please select a rating', 'error'); return; }
      await API.createReview({ name: fd.get('name'), rating: selected, comment: fd.get('comment') });
      form.reset(); selected = 0; stars.forEach(x => x.classList.remove('on'));
      this.renderReviews();
      Utils.showToast('Thanks for your review!', 'success');
    });
    this.renderReviews();
  },

  async renderReviews() {
    const c = document.getElementById('reviewsList');
    if (!c) return;
    const reviews = await API.getReviews();
    if (!reviews.length) { c.innerHTML = '<p style="color:var(--text-muted);text-align:center">Be the first to leave a review!</p>'; return; }
    c.innerHTML = reviews.slice(0, 6).map(r => `
      <div class="testimonial-card reveal">
        <div class="quote-mark">“</div>
        <p>${r.comment}</p>
        <div class="testimonial-author">
          <div class="avatar-fallback">${(r.name || 'G')[0].toUpperCase()}</div>
          <div><div class="name">${r.name}</div><div class="stars">${'★'.repeat(r.rating)}${'☆'.repeat(5 - r.rating)}</div></div>
        </div>
      </div>`).join('');
    this.observeReveals(c);
  },

  /* ---------- My Orders ---------- */
  async renderMyOrders() {
    const c = document.getElementById('myOrdersList');
    if (!c) return;
    if (typeof Auth !== 'undefined' && !Auth.isLoggedIn) {
      c.innerHTML = '<div class="empty-state"><div class="ico">🔒</div><h3>Please log in</h3><p>Log in to view and track your orders.</p><button class="btn btn-primary" data-auth-open style="margin-top:18px">Log In</button></div>';
      return;
    }
    let orders = [];
    try { orders = await API.getMyOrders(); } catch (e) { orders = []; }
    if (!orders.length) {
      c.innerHTML = '<div class="empty-state"><div class="ico">📦</div><h3>No orders yet</h3><p>When you place an order it will appear here.</p><a href="menu.html" class="btn btn-primary" style="margin-top:18px">Browse Menu</a></div>';
      return;
    }
    const steps = ['pending', 'preparing', 'ready', 'delivered'];
    const labels = { pending: 'Confirmed', preparing: 'Preparing', ready: 'Ready', delivered: 'Delivered' };
    c.innerHTML = orders.map(o => {
      const status = (o.status || 'pending').toLowerCase();
      const items = Array.isArray(o.items) ? o.items : [];
      const itemText = items.map(i => (i.quantity || 1) + '× ' + i.name).join(', ') || 'Order items';
      const idShort = (o.id || '').toString().slice(-6).toUpperCase();
      const when = o.created_at ? new Date(o.created_at).toLocaleString('en-IN') : '';
      let tracker;
      if (status === 'cancelled') {
        tracker = '<div class="track-cancelled">✕ This order was cancelled.</div>';
      } else {
        const idx = steps.indexOf(status) < 0 ? 0 : steps.indexOf(status);
        tracker = '<div class="track">' + steps.map((s, i) =>
          '<div class="track-step ' + (i < idx ? 'done' : i === idx ? 'done current' : '') + '">' +
          '<span class="dot"></span><span class="lbl">' + labels[s] + '</span></div>').join('') + '</div>';
      }
      const color = Utils.getStatusColor ? Utils.getStatusColor(status) : '#888';
      return '<div class="order-card">' +
        '<div class="order-card-head"><span class="order-id">#' + idShort + '</span>' +
        '<span class="order-pill" style="background:' + color + '">' + status + '</span></div>' +
        '<div class="order-card-items">' + itemText + '</div>' +
        (when ? '<div class="order-date" style="color:var(--text-muted);font-size:.82rem">' + when + '</div>' : '') +
        tracker +
        '<div class="order-card-foot"><span style="color:var(--text-muted);font-size:.85rem">' +
        (o.order_type ? o.order_type : '') + '</span><strong>' +
        Utils.formatPrice(parseFloat(o.total) || 0) + '</strong></div>' +
      '</div>';
    }).join('');
  },

  /* ---------- My Table Reservations ---------- */
  async renderMyBookings() {
    const c = document.getElementById('myBookingsList');
    if (!c) return;
    if (typeof Auth !== 'undefined' && !Auth.isLoggedIn) {
      c.innerHTML = '<div class="empty-state"><div class="ico">🔒</div><h3>Please log in</h3><p>Log in to view your table reservations.</p><button class="btn btn-primary" data-auth-open style="margin-top:18px">Log In</button></div>';
      return;
    }
    let bookings = [];
    try { bookings = await API.getMyBookings(); } catch (e) { bookings = []; }
    if (!bookings.length) {
      c.innerHTML = '<div class="empty-state"><div class="ico">📅</div><h3>No reservations yet</h3><p>When you book a table it will appear here.</p><a href="book-table.html" class="btn btn-primary" style="margin-top:18px">Book a Table</a></div>';
      return;
    }
    const labels = { pending: 'Pending confirmation', confirmed: 'Confirmed', completed: 'Completed', cancelled: 'Cancelled' };
    c.innerHTML = bookings.map(b => {
      const status = (b.status || 'pending').toLowerCase();
      const color = Utils.getStatusColor ? Utils.getStatusColor(status) : '#888';
      let dateStr = b.date || '';
      try { if (b.date) dateStr = new Date(b.date + 'T00:00:00').toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' }); } catch (_) {}
      const guests = parseInt(b.guests, 10) || 1;
      const meta = (b.time ? '🕐 ' + b.time + ' · ' : '') + guests + ' guest' + (guests > 1 ? 's' : '') + (b.occasion ? ' · ' + b.occasion : '');
      let note;
      if (status === 'cancelled') note = '<div class="track-cancelled">✕ This reservation was cancelled.</div>';
      else if (status === 'confirmed') note = '<div style="color:#34d399;font-weight:600;margin-top:10px">✓ Your table is confirmed — see you soon!</div>';
      else if (status === 'completed') note = '<div style="color:var(--text-muted);margin-top:10px">Visit completed — thanks for dining with us!</div>';
      else note = '<div style="color:#fbbf24;font-weight:600;margin-top:10px">⏳ Awaiting confirmation from the restaurant.</div>';
      return '<div class="order-card">' +
        '<div class="order-card-head"><span class="order-id">📅 ' + dateStr + '</span>' +
        '<span class="order-pill" style="background:' + color + '">' + (labels[status] || status) + '</span></div>' +
        '<div class="order-card-items">' + meta + '</div>' +
        (b.notes ? '<div class="order-date" style="color:var(--text-muted);font-size:.82rem">“' + b.notes + '”</div>' : '') +
        note +
      '</div>';
    }).join('');
  },

  /* ---------- Contact + Newsletter ---------- */
  initContactForm() {
    const form = document.getElementById('contactForm');
    if (!form) return;
    form.addEventListener('submit', e => {
      e.preventDefault(); form.reset();
      Utils.showToast('Message sent! We’ll be in touch.', 'success');
    });
  },
  initNewsletter() {
    document.querySelectorAll('.newsletter-form').forEach(form => {
      form.addEventListener('submit', e => {
        e.preventDefault(); form.reset();
        Utils.showToast('Subscribed! Welcome to the fire.', 'success');
      });
    });
  },

  /* ---------- Animated stats ---------- */
  initStatsCounter() {
    const nums = document.querySelectorAll('[data-count]');
    if (!nums.length) return;
    const obs = new IntersectionObserver(entries => {
      entries.forEach(en => {
        if (!en.isIntersecting) return;
        const el = en.target;
        const target = parseFloat(el.dataset.count);
        const suffix = el.dataset.suffix || '';
        const dur = 1600; const start = performance.now();
        const step = now => {
          const p = Math.min((now - start) / dur, 1);
          const eased = 1 - Math.pow(1 - p, 3);
          el.textContent = (target % 1 === 0 ? Math.floor(eased * target) : (eased * target).toFixed(1)) + suffix;
          if (p < 1) requestAnimationFrame(step);
        };
        requestAnimationFrame(step);
        obs.unobserve(el);
      });
    }, { threshold: 0.5 });
    nums.forEach(n => obs.observe(n));
  },

  /* ---------- Scroll reveal ---------- */
  observeReveals(scope = document) {
    const reveals = scope.querySelectorAll('.reveal:not(.visible)');
    const obs = new IntersectionObserver((entries, o) => {
      entries.forEach((en, i) => {
        if (en.isIntersecting) {
          const delay = en.target.closest('.menu-grid, .featured-grid, .testimonials-grid, .values-grid, .team-grid, .stats-grid') ? (i % 4) * 90 : 0;
          setTimeout(() => en.target.classList.add('visible'), delay);
          o.unobserve(en.target);
        }
      });
    }, { threshold: 0.12, rootMargin: '0px 0px -40px 0px' });
    reveals.forEach(el => obs.observe(el));
  },
  initScrollReveal() {
    document.querySelectorAll('.section-header, .section-tag, .section-title, .section-desc, .split > *, .exp-feature, .testimonial-card, .value-card, .team-card, .stat-card, .cta-banner, .booking-info, .booking-form-wrap')
      .forEach(el => el.classList.add('reveal'));
    this.observeReveals(document);
  },

  /* ---------- Custom cursor ---------- */
  initCustomCursor() {
    if ('ontouchstart' in window || window.innerWidth < 900) return;
    const cursor = document.createElement('div');
    cursor.className = 'custom-cursor';
    document.body.appendChild(cursor);
    let mx = 0, my = 0, cx = 0, cy = 0;
    document.addEventListener('mousemove', e => { mx = e.clientX; my = e.clientY; });
    const loop = () => { cx += (mx - cx) * 0.18; cy += (my - cy) * 0.18; cursor.style.transform = `translate(${cx}px,${cy}px) translate(-50%,-50%)`; requestAnimationFrame(loop); };
    loop();
    const sel = 'a, button, .menu-card, .testimonial-card, .value-card, .team-card, input, select, .category-pill';
    document.addEventListener('mouseover', e => { if (e.target.closest(sel)) cursor.classList.add('hover'); });
    document.addEventListener('mouseout', e => { if (e.target.closest(sel)) cursor.classList.remove('hover'); });
  },

  /* ---------- Subtle hero parallax ---------- */
  initParallax() {
    const bg = document.querySelector('.hero-bg img');
    if (!bg) return;
    window.addEventListener('scroll', () => {
      const y = window.scrollY;
      if (y < window.innerHeight) bg.style.transform = `scale(1.1) translateY(${y * 0.18}px)`;
    }, { passive: true });
  }
};

document.addEventListener('DOMContentLoaded', async () => {
  const active = document.body.dataset.page || '';
  Components.mount(active);
  await MenuData.loadCustom();
  App.init();
});
