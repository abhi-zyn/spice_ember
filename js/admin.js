/* ============================================================
   SPICE & EMBER — ADMIN PANEL
   ============================================================ */

const Admin = {
  init() {
    Utils.initTheme();
    Utils.initRipples();
    this.bindShell();
    this.checkAuth();
    this.initDashboard();
    this.initQrGenerator();
    this.initBookings();
    this.initOrders();
    this.initPayments();
    this.initMenuManage();
    this.initOrderAlerts();
  },

  page() { return window.location.pathname.split('/').pop() || 'index.html'; },

  checkAuth() {
    const isAdmin = localStorage.getItem(CONFIG.adminKey) === 'true';
    if (this.page() !== 'index.html' && !isAdmin) {
      window.location.href = 'index.html';
    }
  },

  bindShell() {
    // Sidebar toggle (mobile)
    const toggle = document.querySelector('.admin-menu-toggle');
    const sidebar = document.querySelector('.admin-sidebar');
    toggle?.addEventListener('click', () => sidebar?.classList.toggle('open'));
    document.querySelector('.admin-overlay')?.addEventListener('click', () => sidebar?.classList.remove('open'));

    // Theme + logout
    document.querySelectorAll('.theme-toggle').forEach(t => t.addEventListener('click', () => Utils.toggleTheme()));
    document.querySelector('.admin-logout')?.addEventListener('click', () => {
      localStorage.removeItem(CONFIG.adminKey);
      Utils.showToast('Logged out', 'info');
      setTimeout(() => window.location.href = 'index.html', 400);
    });
  },

  /* ---------- Dashboard ---------- */
  async initDashboard() {
    if (!document.getElementById('dashboardCards')) return;
    try {
      const s = await API.getDashboardStats();
      const set = (id, v) => { const el = document.getElementById(id); if (el) el.textContent = v; };
      set('totalRevenue', Utils.formatPrice(s.revenue));
      set('totalOrders', s.ordersCount);
      set('activeBookings', s.activeBookings);
      set('totalGuests', s.totalGuests);
      this.renderRecentOrders(s.recentOrders);
    } catch (e) { console.error('Dashboard error', e); }
  },

  renderRecentOrders(orders) {
    const tb = document.getElementById('recentOrdersTable');
    if (!tb) return;
    if (!orders || !orders.length) { tb.innerHTML = `<tr><td colspan="5" class="td-empty">No orders yet</td></tr>`; return; }
    tb.innerHTML = orders.map(o => `
      <tr>
        <td>#${(o.id || '').toString().slice(-6)}</td>
        <td>${Array.isArray(o.items) ? o.items.length + ' items' : '1 item'}</td>
        <td>${Utils.formatPrice(parseFloat(o.total) || 0)}</td>
        <td><span class="status-pill" style="--c:${Utils.getStatusColor(o.status)}">${o.status || 'pending'}</span></td>
        <td>${Utils.formatDate(o.created_at)}<br><span class="td-sub">${Utils.formatTime(o.created_at)}</span></td>
      </tr>`).join('');
  },

  /* ---------- Payment QR terminal (any admin) ----------
     POS-style page: punch in an amount on the keypad, generate a custom-price
     UPI QR via the create-qr Edge Function, then poll qr_payments for the
     webhook-confirmed 'paid' status. */
  initQrGenerator() {
    const wrap = document.getElementById('qrGen');
    if (!wrap) return;
    const display = document.getElementById('qrAmount');
    const keypad = document.getElementById('qrKeypad');
    const noteEl = document.getElementById('qrNote');
    const genBtn = document.getElementById('qrGenerateBtn');
    const terminal = document.getElementById('qrTerminal');
    const result = document.getElementById('qrResult');
    const img = document.getElementById('qrImage');
    const amtLabel = document.getElementById('qrAmountLabel');
    const statusEl = document.getElementById('qrStatus');
    const resetBtn = document.getElementById('qrResetBtn');
    let digits = '';
    let pollTimer = null;

    const amountValue = () => parseInt(digits || '0', 10) / 100;
    const renderDisplay = () => { if (display) display.textContent = Utils.formatPrice(amountValue()); };
    const stopPoll = () => { if (pollTimer) { clearInterval(pollTimer); pollTimer = null; } };

    keypad?.addEventListener('click', (e) => {
      const btn = e.target.closest('[data-key]');
      if (!btn) return;
      const k = btn.dataset.key;
      if (k === 'clear') digits = '';
      else if (k === 'back') digits = digits.slice(0, -1);
      else digits = (digits + k).replace(/^0+/, '');
      if (digits.length > 9) digits = digits.slice(0, 9);
      renderDisplay();
    });

    const reset = () => {
      stopPoll();
      digits = '';
      renderDisplay();
      if (noteEl) noteEl.value = '';
      if (result) result.style.display = 'none';
      if (terminal) terminal.style.display = '';
      if (genBtn) { genBtn.disabled = false; genBtn.textContent = 'Generate QR'; }
    };
    resetBtn?.addEventListener('click', reset);

    genBtn?.addEventListener('click', async () => {
      const amount = amountValue();
      if (!amount || amount < 1) { Utils.showToast('Enter an amount of at least ₹1', 'error'); return; }
      genBtn.disabled = true;
      genBtn.textContent = 'Generating…';
      try {
        const qr = await API.createQr(amount, (noteEl?.value || '').trim());
        if (img) img.src = qr.image_url;
        if (amtLabel) amtLabel.textContent = Utils.formatPrice(amount);
        if (statusEl) { statusEl.className = 'qr-status-lbl waiting'; statusEl.innerHTML = '<span class="qr-dot"></span> Waiting for payment…'; }
        if (terminal) terminal.style.display = 'none';
        if (result) result.style.display = '';
        genBtn.disabled = false;
        genBtn.textContent = 'Generate QR';
        stopPoll();
        pollTimer = setInterval(async () => {
          try {
            const row = await API.getQrStatus(qr.id);
            if (row && row.status === 'paid') {
              stopPoll();
              if (statusEl) { statusEl.className = 'qr-status-lbl paid'; statusEl.textContent = '✓ Payment received — ' + Utils.formatPrice(row.amount || amount); }
              Utils.showToast('Payment received!', 'success');
            }
          } catch (_) { /* keep polling */ }
        }, 4000);
      } catch (e) {
        genBtn.disabled = false;
        genBtn.textContent = 'Generate QR';
        Utils.showToast(e.message || 'Could not generate QR', 'error');
      }
    });

    renderDisplay();
  },

  /* ---------- Bookings ----------
     Reservation flow: pending → confirmed → completed. Cancelled is terminal.
     Confirm/Complete/Cancel each ask for confirmation; confirmed, completed
     and cancelled bookings are locked from further changes. */
  initBookings() {
    if (!document.getElementById('bookingsTable')) return;
    this.renderBookings();
    const f = document.getElementById('bookingFilter');
    f?.addEventListener('change', () => this.renderBookings(f.value));
  },
  bookingActions(b) {
    const s = (b.status || 'pending').toLowerCase();
    if (s === 'cancelled') return `<span class="order-locked" style="color:#f87171;font-weight:600">✕ Cancelled</span>`;
    if (s === 'completed') return `<span class="order-locked" style="color:#34d399;font-weight:600">✓ Completed</span>`;
    let html = '';
    if (s === 'pending')   html += `<button class="mini-btn ok booking-action" data-id="${b.id}" data-action="confirm" data-label="Confirm">Confirm</button>`;
    if (s === 'confirmed') html += `<button class="mini-btn booking-action" data-id="${b.id}" data-action="complete" data-label="Complete">Complete</button>`;
    html += `<button class="mini-btn danger booking-action" data-id="${b.id}" data-action="cancel" data-label="Cancel">Cancel</button>`;
    return html;
  },
  async renderBookings(filter = 'all') {
    const tb = document.getElementById('bookingsTable');
    if (!tb) return;
    try {
      const list = await API.getBookings(filter);
      if (!list.length) { tb.innerHTML = `<tr><td colspan="8" class="td-empty">No bookings found</td></tr>`; return; }
      tb.innerHTML = list.map(b => `
        <tr>
          <td><strong>${b.name}</strong><br><span class="td-sub">${b.email}</span></td>
          <td>${Utils.formatDate(b.date)}</td>
          <td>${b.time}</td>
          <td>${b.guests}</td>
          <td>${b.occasion || '—'}</td>
          <td><span class="status-pill" style="--c:${Utils.getStatusColor(b.status)}">${b.status}</span></td>
          <td class="td-actions">${this.bookingActions(b)}</td>
        </tr>`).join('');
      tb.querySelectorAll('.booking-action').forEach(btn => btn.addEventListener('click', () => this.updateBooking(btn.dataset.id, btn.dataset.action, btn.dataset.label)));
    } catch (e) { tb.innerHTML = `<tr><td colspan="8" class="td-empty">Error loading bookings</td></tr>`; }
  },
  async updateBooking(id, action, label) {
    const prompts = {
      confirm:  'Confirm this reservation? The customer will see it as confirmed.',
      complete: 'Mark this reservation as completed?',
      cancel:   'Cancel this reservation? This cannot be undone.'
    };
    if (!window.confirm(prompts[action] || `${label || 'Update reservation'} — confirm?`)) return;
    try {
      await API.updateBookingStatus(id, action);
      const said = { confirm: 'confirmed', complete: 'completed', cancel: 'cancelled' }[action] || action;
      Utils.showToast(`Reservation ${said}`, 'success');
    } catch (e) {
      Utils.showToast(e.message || 'Could not update reservation', 'error');
    }
    this.renderBookings(document.getElementById('bookingFilter')?.value || 'all');
  },

  /* ---------- Orders ---------- */
  initOrders() {
    if (!document.getElementById('ordersTable')) return;
    this.renderOrders();
    const f = document.getElementById('orderFilter');
    f?.addEventListener('change', () => this.renderOrders(f.value));
  },

  // Status flow: pending → preparing → ready → delivered.
  // Delivered and cancelled are TERMINAL — no further actions, no cancel.
  orderActions(o) {
    const s = (o.status || 'pending').toLowerCase();
    if (s === 'delivered') return `<span class="order-locked" style="color:#34d399;font-weight:600">✓ Delivered</span>`;
    if (s === 'cancelled') return `<span class="order-locked" style="color:#f87171;font-weight:600">✕ Cancelled</span>`;
    const flow = {
      pending:   { action: 'preparing', label: 'Accept' },
      confirmed: { action: 'preparing', label: 'Accept' },
      preparing: { action: 'ready',     label: 'Mark Prepared' },
      ready:     { action: 'delivered', label: 'Mark Delivered' }
    };
    const step = flow[s];
    let html = '';
    if (step) html += `<button class="mini-btn ok order-action" data-id="${o.id}" data-action="${step.action}" data-label="${step.label}">${step.label}</button>`;
    // Cancel is only available before the order is delivered/cancelled.
    html += `<button class="mini-btn danger order-action" data-id="${o.id}" data-action="cancelled" data-label="Cancel">Cancel</button>`;
    return html;
  },

  async renderOrders(filter = 'all') {
    const tb = document.getElementById('ordersTable');
    if (!tb) return;
    try {
      const list = await API.getOrders(filter);
      if (!list.length) { tb.innerHTML = `<tr><td colspan="8" class="td-empty">No orders found</td></tr>`; return; }
      tb.innerHTML = list.map(o => `
        <tr>
          <td>#${(o.id || '').toString().slice(-6)}</td>
          <td>${o.customer_name || '—'}${o.order_type ? `<br><span class="td-sub">${o.order_type}</span>` : ''}</td>
          <td>${Array.isArray(o.items) ? o.items.map(i => `${i.quantity}× ${i.name}`).join(', ') : '—'}</td>
          <td>${Utils.formatPrice(parseFloat(o.total) || 0)}</td>
          <td><span class="status-pill" style="--c:${Utils.getStatusColor(o.status)}">${o.status}</span></td>
          <td>${Utils.formatDate(o.created_at)}<br><span class="td-sub">${Utils.formatTime(o.created_at)}</span></td>
          <td>${o.delivered_at ? `${Utils.formatDate(o.delivered_at)}<br><span class="td-sub">${Utils.formatTime(o.delivered_at)}</span>` : '—'}</td>
          <td class="td-actions">${this.orderActions(o)}</td>
        </tr>`).join('');
      tb.querySelectorAll('.order-action').forEach(btn => btn.addEventListener('click', () => this.updateOrder(btn.dataset.id, btn.dataset.action, btn.dataset.label)));
    } catch (e) { tb.innerHTML = `<tr><td colspan="8" class="td-empty">Error loading orders</td></tr>`; }
  },

  async updateOrder(id, status, label) {
    // Confirm before every status change; warn clearly on terminal actions.
    const prompts = {
      cancelled: 'Cancel this order? This cannot be undone.',
      delivered: 'Mark this order as Delivered? Once delivered it can no longer be changed or cancelled.'
    };
    const msg = prompts[status] || `${label || 'Update this order'} — confirm?`;
    if (!window.confirm(msg)) return;
    try {
      await API.updateOrderStatus(id, status);
      const said = status === 'preparing' ? 'accepted' : status;
      Utils.showToast(`Order ${said}`, 'success');
    } catch (e) {
      Utils.showToast(e.message || 'Could not update order', 'error');
    }
    this.renderOrders(document.getElementById('orderFilter')?.value || 'all');
  },

  /* ---------- New-order alerts (badge + sound) ----------
     Polls for orders still awaiting action (status 'pending') and shows a live
     count on the sidebar Orders link. When a brand-new pending order appears,
     it chimes and pops a toast. The count clears as soon as each order is
     accepted (confirmed) or cancelled. */
  _seenPendingIds: null,
  _audioCtx: null,
  _orderBaseTitle: '',
  primeAudio() {
    try {
      const Ctx = window.AudioContext || window.webkitAudioContext;
      if (!Ctx) return;
      this._audioCtx = this._audioCtx || new Ctx();
      if (this._audioCtx.state === 'suspended') this._audioCtx.resume();
    } catch (_) {}
  },
  playChime() {
    this.primeAudio();
    const ctx = this._audioCtx;
    if (!ctx) return;
    const now = ctx.currentTime;
    [[880, 0], [1175, 0.16]].forEach(([freq, t]) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.value = freq;
      gain.gain.setValueAtTime(0.0001, now + t);
      gain.gain.exponentialRampToValueAtTime(0.3, now + t + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + t + 0.15);
      osc.connect(gain); gain.connect(ctx.destination);
      osc.start(now + t); osc.stop(now + t + 0.16);
    });
  },
  orderBadge() {
    const link = document.querySelector('.admin-nav a[href="orders.html"]');
    if (!link) return null;
    let badge = link.querySelector('.nav-count');
    if (!badge) {
      badge = document.createElement('span');
      badge.className = 'nav-count';
      badge.style.cssText = 'display:none;min-width:18px;padding:1px 7px;margin-left:7px;border-radius:11px;background:#ef4444;color:#fff;font-size:.72rem;font-weight:800;line-height:1.5;text-align:center;vertical-align:middle';
      link.appendChild(badge);
    }
    return badge;
  },
  async pollNewOrders() {
    let pending = [];
    try { pending = await API.getOrders('pending'); } catch (_) { return; }
    const ids = pending.map(o => String(o.id));
    const badge = this.orderBadge();
    if (badge) {
      badge.textContent = ids.length;
      badge.style.display = ids.length ? 'inline-block' : 'none';
    }
    document.title = (ids.length ? `(${ids.length}) ` : '') + this._orderBaseTitle;
    if (this._seenPendingIds === null) {
      this._seenPendingIds = new Set(ids);   // baseline — no chime on first load
      return;
    }
    const fresh = ids.filter(id => !this._seenPendingIds.has(id));
    if (fresh.length) {
      this.playChime();
      Utils.showToast(`${fresh.length} new order${fresh.length > 1 ? 's' : ''} received!`, 'success');
      if (document.getElementById('ordersTable')) {
        this.renderOrders(document.getElementById('orderFilter')?.value || 'all');
      }
    }
    this._seenPendingIds = new Set(ids);
  },
  initOrderAlerts() {
    if (!document.querySelector('.admin-nav')) return;
    this._orderBaseTitle = document.title;
    // Resume audio on first interaction (browsers block autoplay until a gesture).
    const prime = () => this.primeAudio();
    window.addEventListener('pointerdown', prime);
    window.addEventListener('keydown', prime);
    this.pollNewOrders();
    setInterval(() => this.pollNewOrders(), 15000);
  },

  /* ---------- Payments (secure super-admin view) ----------
     Reads ALL payments via the admin-payments Edge Function using a
     server-side dashboard key. The key is entered once per session and
     stored only in sessionStorage. */
  initPayments() {
    const tb = document.getElementById('paymentsTable');
    if (!tb) return;
    const KEY = 'spice-ember-admin-pk';
    const gate = document.getElementById('paymentsGate');
    const unlock = document.getElementById('paymentsUnlock');
    const keyInput = document.getElementById('paymentsKey');

    const load = async (adminKey) => {
      tb.innerHTML = `<tr><td colspan="8" class="td-empty">Loading…</td></tr>`;
      try {
        const list = await API.getAdminPayments(adminKey);
        sessionStorage.setItem(KEY, adminKey);
        if (gate) gate.style.display = 'none';
        if (!list.length) { tb.innerHTML = `<tr><td colspan="8" class="td-empty">No payments recorded yet</td></tr>`; return; }
        tb.innerHTML = list.map(p => `
          <tr>
            <td>${Utils.formatDate(p.created_at)}<br><span class="td-sub">${Utils.formatTime(p.created_at)}</span></td>
            <td>${p.customer_name || '—'}<br><span class="td-sub">${p.customer_email || ''}</span></td>
            <td>${p.customer_phone || '—'}</td>
            <td>${Utils.formatPrice(parseFloat(p.amount) || 0)} ${p.currency || ''}</td>
            <td><span class="status-pill" style="--c:${Utils.getStatusColor(p.status)}">${p.status || '—'}</span></td>
            <td class="td-mono" title="${p.razorpay_order_id || ''}">${p.razorpay_order_id || '—'}</td>
            <td class="td-mono" title="${p.razorpay_payment_id || ''}">${p.razorpay_payment_id || '—'}</td>
            <td class="td-mono" title="${p.razorpay_signature || ''}">${p.razorpay_signature ? (p.razorpay_signature.slice(0, 14) + '…') : '—'}</td>
          </tr>`).join('');
      } catch (e) {
        sessionStorage.removeItem(KEY);
        if (gate) gate.style.display = '';
        tb.innerHTML = `<tr><td colspan="8" class="td-empty">${e.message || 'Could not load payments'}</td></tr>`;
      }
    };

    unlock?.addEventListener('click', () => {
      const v = (keyInput && keyInput.value || '').trim();
      if (v) load(v); else Utils.showToast('Enter the dashboard key', 'error');
    });
    keyInput?.addEventListener('keydown', e => { if (e.key === 'Enter') { e.preventDefault(); unlock?.click(); } });

    const saved = sessionStorage.getItem(KEY);
    if (saved) load(saved);
  },

  /* ---------- Menu management ----------
     Every dish is editable. Editing a built-in dish upserts an override row
     into menu_items (same id) which the storefront merges over the default.
     “Import Default Menu” bulk-loads all built-in dishes into the database. */
  initMenuManage() {
    const form = document.getElementById('addMenuItemForm');
    if (!form) return;
    this.renderMenuItems();
    const seedBtn = document.getElementById('seedMenuBtn');
    seedBtn?.addEventListener('click', async () => {
      if (!window.confirm('Import all default menu items into the database? Existing items are kept and nothing is overwritten.')) return;
      seedBtn.disabled = true; seedBtn.textContent = 'Importing…';
      try {
        const r = await API.seedDefaultMenu();
        Utils.showToast(r.inserted ? `${r.inserted} item(s) imported to the database` : 'All default items are already in the database', 'success');
        await this.renderMenuItems();
      } catch (e) {
        Utils.showToast(e.message || 'Could not import the menu', 'error');
      } finally { seedBtn.disabled = false; seedBtn.textContent = 'Import Default Menu'; }
    });
    form.addEventListener('submit', async e => {
      e.preventDefault();
      const fd = new FormData(form);
      const item = {
        id: 'cust-' + Utils.generateId(),
        name: fd.get('name'), description: fd.get('description'),
        price: parseFloat(fd.get('price')), category: fd.get('category'), type: fd.get('type'),
        image: fd.get('image') || 'https://images.unsplash.com/photo-1544025162-d76694265947?w=600&h=450&fit=crop',
        spicy: parseInt(fd.get('spicy')) || 0, rating: 0, reviews: 0, featured: false, popular: false
      };
      const submitBtn = form.querySelector('button[type="submit"]');
      if (submitBtn) submitBtn.disabled = true;
      try {
        await API.createMenuItem(item);
        Utils.showToast(`${item.name} added to menu!`, 'success');
        form.reset();
        await this.renderMenuItems();
      } catch (err) {
        Utils.showToast(err.message || 'Could not add item', 'error');
      } finally { if (submitBtn) submitBtn.disabled = false; }
    });
  },
  async renderMenuItems() {
    const c = document.getElementById('menuItemsList');
    if (!c) return;
    const custom = await API.getMenuItems();
    MenuData._custom = custom;
    const inDb = new Set(custom.map(x => x.id));
    const all = MenuData.getAll();
    c.innerHTML = all.map(item => {
      const isCustom = String(item.id).startsWith('cust-');
      return `
      <div class="admin-menu-item">
        <img src="${item.image}" alt="${item.name}" loading="lazy">
        <div class="admin-menu-item-info">
          <h4>${item.name}</h4>
          <span>${CATEGORY_LABELS[item.category] || item.category} · ${Utils.formatPrice(item.price)}${inDb.has(item.id) ? '' : ' · <em style="color:var(--text-muted)">default</em>'}</span>
        </div>
        <span class="tag ${item.type === 'veg' ? 'veg' : 'nonveg'}">${item.type}</span>
        <button class="mini-btn ok edit-item" data-id="${item.id}">Edit</button>
        ${isCustom ? `<button class="mini-btn danger del-item" data-id="${item.id}">Delete</button>` : ''}
      </div>`;
    }).join('');
    c.querySelectorAll('.edit-item').forEach(b => b.addEventListener('click', () => {
      const item = MenuData.getById(b.dataset.id);
      if (item) this.openEditModal(item);
    }));
    c.querySelectorAll('.del-item').forEach(b => b.addEventListener('click', async () => {
      if (!window.confirm('Remove this item from the menu?')) return;
      await API.deleteMenuItem(b.dataset.id);
      Utils.showToast('Item removed', 'info');
      await this.renderMenuItems();
    }));
  },
  // Edit any dish (built-in or custom). Saving upserts a row into menu_items;
  // for built-in dishes this creates an override the storefront merges by id.
  openEditModal(item) {
    const esc = s => (s == null ? '' : String(s)).replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;');
    document.querySelector('.mi-edit-overlay')?.remove();
    const cats = ['starters', 'mains', 'grills', 'sides', 'desserts', 'beverages'];
    const ov = document.createElement('div');
    ov.className = 'mi-edit-overlay';
    ov.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,.6);backdrop-filter:blur(3px);z-index:4000;display:flex;align-items:center;justify-content:center;padding:18px';
    ov.innerHTML = `
      <div style="background:var(--surface,#1b1714);color:var(--text,#fff);max-width:480px;width:100%;border-radius:16px;padding:24px;max-height:90vh;overflow:auto;box-shadow:0 20px 60px rgba(0,0,0,.5)">
        <h3 style="margin:0 0 16px;font-size:1.25rem">Edit ${esc(item.name)}</h3>
        <div class="form-group"><label>Name</label><input class="form-control" data-f="name" value="${esc(item.name)}"></div>
        <div class="form-group"><label>Description</label><textarea class="form-control" data-f="description" rows="3">${esc(item.description)}</textarea></div>
        <div class="admin-form-grid">
          <div class="form-group"><label>Price (₹)</label><input class="form-control" type="number" step="0.01" min="0" data-f="price" value="${esc(item.price)}"></div>
          <div class="form-group"><label>Category</label><select class="form-control" data-f="category">${cats.map(cat => `<option value="${cat}" ${item.category === cat ? 'selected' : ''}>${CATEGORY_LABELS[cat] || cat}</option>`).join('')}</select></div>
        </div>
        <div class="admin-form-grid">
          <div class="form-group"><label>Type</label><select class="form-control" data-f="type"><option value="veg" ${item.type === 'veg' ? 'selected' : ''}>Veg</option><option value="non-veg" ${item.type !== 'veg' ? 'selected' : ''}>Non-Veg</option></select></div>
          <div class="form-group"><label>Spice (0–3)</label><input class="form-control" type="number" min="0" max="3" data-f="spicy" value="${esc(item.spicy || 0)}"></div>
        </div>
        <div class="form-group"><label>Image URL</label><input class="form-control" data-f="image" value="${esc(item.image)}"></div>
        <div style="display:flex;gap:20px;margin-bottom:18px">
          <label style="display:flex;align-items:center;gap:8px"><input type="checkbox" data-f="featured" ${item.featured ? 'checked' : ''}> Featured</label>
          <label style="display:flex;align-items:center;gap:8px"><input type="checkbox" data-f="popular" ${item.popular ? 'checked' : ''}> Popular</label>
        </div>
        <div style="display:flex;gap:12px">
          <button class="btn btn-ghost mi-cancel" style="flex:1">Cancel</button>
          <button class="btn btn-primary mi-save" style="flex:1">Save Changes</button>
        </div>
      </div>`;
    document.body.appendChild(ov);
    const close = () => ov.remove();
    const val = f => ov.querySelector(`[data-f="${f}"]`);
    ov.addEventListener('click', e => { if (e.target === ov) close(); });
    ov.querySelector('.mi-cancel').addEventListener('click', close);
    ov.querySelector('.mi-save').addEventListener('click', async () => {
      const updated = {
        ...item,
        name: val('name').value.trim(),
        description: val('description').value.trim(),
        price: parseFloat(val('price').value) || 0,
        category: val('category').value,
        type: val('type').value,
        spicy: parseInt(val('spicy').value) || 0,
        image: val('image').value.trim() || item.image,
        featured: val('featured').checked,
        popular: val('popular').checked
      };
      if (!updated.name) { Utils.showToast('Name is required', 'error'); return; }
      const saveBtn = ov.querySelector('.mi-save');
      saveBtn.disabled = true; saveBtn.textContent = 'Saving…';
      try {
        await API.upsertMenuItem(updated);
        Utils.showToast('Menu item updated', 'success');
        close();
        await this.renderMenuItems();
      } catch (e) {
        saveBtn.disabled = false; saveBtn.textContent = 'Save Changes';
        Utils.showToast(e.message || 'Could not save changes', 'error');
      }
    });
  }
};

document.addEventListener('DOMContentLoaded', () => Admin.init());
