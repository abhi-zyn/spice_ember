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
    this.initBookings();
    this.initOrders();
    this.initPayments();
    this.initMenuManage();
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

  /* ---------- Login page ---------- */
  // (handled inline in admin/index.html)

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

  /* ---------- Bookings ---------- */
  initBookings() {
    if (!document.getElementById('bookingsTable')) return;
    this.renderBookings();
    const f = document.getElementById('bookingFilter');
    f?.addEventListener('change', () => this.renderBookings(f.value));
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
          <td class="td-actions">
            <button class="mini-btn ok booking-action" data-id="${b.id}" data-action="confirm">Confirm</button>
            <button class="mini-btn booking-action" data-id="${b.id}" data-action="complete">Complete</button>
            <button class="mini-btn danger booking-action" data-id="${b.id}" data-action="cancel">Cancel</button>
          </td>
        </tr>`).join('');
      tb.querySelectorAll('.booking-action').forEach(btn => btn.addEventListener('click', () => this.updateBooking(btn.dataset.id, btn.dataset.action)));
    } catch (e) { tb.innerHTML = `<tr><td colspan="8" class="td-empty">Error loading bookings</td></tr>`; }
  },
  async updateBooking(id, action) {
    await API.updateBookingStatus(id, action);
    Utils.showToast(`Booking ${action}ed`, 'success');
    this.renderBookings(document.getElementById('bookingFilter')?.value || 'all');
  },

  /* ---------- Orders ---------- */
  initOrders() {
    if (!document.getElementById('ordersTable')) return;
    this.renderOrders();
    const f = document.getElementById('orderFilter');
    f?.addEventListener('change', () => this.renderOrders(f.value));
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
          <td class="td-actions">
            <button class="mini-btn order-action" data-id="${o.id}" data-action="preparing">Prepare</button>
            <button class="mini-btn ok order-action" data-id="${o.id}" data-action="ready">Ready</button>
            <button class="mini-btn ok order-action" data-id="${o.id}" data-action="delivered">Deliver</button>
            <button class="mini-btn danger order-action" data-id="${o.id}" data-action="cancelled">Cancel</button>
          </td>
        </tr>`).join('');
      tb.querySelectorAll('.order-action').forEach(btn => btn.addEventListener('click', () => this.updateOrder(btn.dataset.id, btn.dataset.action)));
    } catch (e) { tb.innerHTML = `<tr><td colspan="8" class="td-empty">Error loading orders</td></tr>`; }
  },
  async updateOrder(id, status) {
    await API.updateOrderStatus(id, status);
    Utils.showToast(`Order set to ${status}`, 'success');
    this.renderOrders(document.getElementById('orderFilter')?.value || 'all');
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

  /* ---------- Menu management ---------- */
  initMenuManage() {
    const form = document.getElementById('addMenuItemForm');
    if (!form) return;
    this.renderMenuItems();
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
    const all = MenuData.getAll();
    c.innerHTML = all.map(item => {
      const isCustom = custom.some(x => x.id === item.id);
      return `
      <div class="admin-menu-item">
        <img src="${item.image}" alt="${item.name}" loading="lazy">
        <div class="admin-menu-item-info">
          <h4>${item.name}</h4>
          <span>${CATEGORY_LABELS[item.category] || item.category} · ${Utils.formatPrice(item.price)}</span>
        </div>
        <span class="tag ${item.type === 'veg' ? 'veg' : 'nonveg'}">${item.type}</span>
        ${isCustom ? `<button class="mini-btn danger del-item" data-id="${item.id}">Delete</button>` : ''}
      </div>`;
    }).join('');
    c.querySelectorAll('.del-item').forEach(b => b.addEventListener('click', async () => {
      await API.deleteMenuItem(b.dataset.id);
      Utils.showToast('Item removed', 'info');
      await this.renderMenuItems();
    }));
  }
};

document.addEventListener('DOMContentLoaded', () => Admin.init());
