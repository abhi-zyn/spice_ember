/* ============================================================
   SPICE & EMBER — DATA API
   Supabase-backed when configured (global SB), with an automatic
   localStorage fallback so the site always works offline.
   ============================================================ */
const API = {
  _enabled() { return typeof SB !== 'undefined' && SB.enabled; },
  _uid() {
    try { return (typeof Auth !== 'undefined' && Auth.userId) ? Auth.userId : null; }
    catch (_) { return null; }
  },
  // Only real UUIDs are valid for the Postgres user_id columns.
  // Demo/admin logins (e.g. 'admin') are NOT uuids, so we null them out
  // before sending to Supabase to avoid an invalid-uuid insert error.
  _uuid(v) {
    return (typeof v === 'string' &&
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(v)) ? v : null;
  },

  /* ---------------- PROFILES ---------------- */
  async getProfile() {
    const uid = this._uid();
    if (this._enabled() && uid) {
      const { data, error } = await SB.client.from('profiles').select('*').eq('id', uid).maybeSingle();
      if (!error && data) { Utils.saveToStorage('spice-ember-profile', data); return data; }
    }
    return Utils.getFromStorage('spice-ember-profile') || null;
  },
  async upsertProfile(patch) {
    const uid = this._uid();
    const current = (Utils.getFromStorage('spice-ember-profile')) || {};
    const merged = { ...current, ...patch };
    if (this._enabled() && uid) {
      const row = { id: uid, ...patch };
      const { data, error } = await SB.client.from('profiles').upsert(row).select().maybeSingle();
      if (!error && data) { Utils.saveToStorage('spice-ember-profile', data); return data; }
    }
    Utils.saveToStorage('spice-ember-profile', merged);
    return merged;
  },

  /* ---------------- ORDERS ---------------- */
  async createOrder(order) {
    const uid = this._uuid(this._uid());
    const payload = { ...order, user_id: this._uuid(order.user_id) || uid || null };
    if (this._enabled()) {
      try {
        const { data, error } = await SB.client.from('orders').insert(payload).select().maybeSingle();
        if (error) throw new Error(error.message);
        if (data) return data;
      } catch (e) {
        console.warn('[API] Supabase order insert failed — saving locally:', e.message);
      }
    }
    const orders = Utils.getOrders();
    const row = { id: Utils.generateId(), created_at: new Date().toISOString(), status: 'pending', ...payload };
    orders.unshift(row);
    Utils.saveOrders(orders);
    return row;
  },
  async getOrders(filter = 'all') {
    let list = [];
    if (this._enabled()) {
      const { data, error } = await SB.client.from('orders').select('*').order('created_at', { ascending: false });
      if (error) throw new Error(error.message);
      list = data || [];
    } else {
      list = Utils.getOrders();
    }
    return filter && filter !== 'all' ? list.filter(o => o.status === filter) : list;
  },
  async getMyOrders() {
    const uid = this._uid();
    if (this._enabled()) {
      let q = SB.client.from('orders').select('*').order('created_at', { ascending: false });
      if (uid) q = q.eq('user_id', uid);
      const { data, error } = await q;
      if (error) throw new Error(error.message);
      return data || [];
    }
    const list = Utils.getOrders();
    return uid ? list.filter(o => !o.user_id || o.user_id === uid) : list;
  },
  async updateOrderStatus(id, status) {
    if (this._enabled()) {
      const { error } = await SB.client.from('orders').update({ status }).eq('id', id);
      if (error) throw new Error(error.message);
      return true;
    }
    const orders = Utils.getOrders();
    const o = orders.find(x => String(x.id) === String(id));
    if (o) { o.status = status; Utils.saveOrders(orders); }
    return true;
  },

  /* ---------------- BOOKINGS ---------------- */
  async createBooking(booking) {
    const uid = this._uuid(this._uid());
    const payload = {
      ...booking,
      guests: parseInt(booking.guests, 10) || null,
      user_id: this._uuid(booking.user_id) || uid || null
    };
    if (this._enabled()) {
      try {
        const { data, error } = await SB.client.from('bookings').insert(payload).select().maybeSingle();
        if (error) throw new Error(error.message);
        if (data) return data;
      } catch (e) {
        console.warn('[API] Supabase booking insert failed — saving locally:', e.message);
      }
    }
    const bookings = Utils.getBookings();
    const row = { id: Utils.generateId(), created_at: new Date().toISOString(), status: 'pending', ...payload };
    bookings.unshift(row);
    Utils.saveBookings(bookings);
    return row;
  },
  async getBookings(filter = 'all') {
    let list = [];
    if (this._enabled()) {
      const { data, error } = await SB.client.from('bookings').select('*').order('created_at', { ascending: false });
      if (error) throw new Error(error.message);
      list = data || [];
    } else {
      list = Utils.getBookings();
    }
    return filter && filter !== 'all' ? list.filter(b => b.status === filter) : list;
  },
  async getMyBookings() {
    const uid = this._uid();
    if (this._enabled()) {
      let q = SB.client.from('bookings').select('*').order('created_at', { ascending: false });
      if (uid) q = q.eq('user_id', uid);
      const { data, error } = await q;
      if (error) throw new Error(error.message);
      return data || [];
    }
    const list = Utils.getBookings();
    return uid ? list.filter(b => !b.user_id || b.user_id === uid) : list;
  },
  async updateBookingStatus(id, action) {
    const map = { confirm: 'confirmed', complete: 'completed', cancel: 'cancelled' };
    const status = map[action] || action;
    if (this._enabled()) {
      const { error } = await SB.client.from('bookings').update({ status }).eq('id', id);
      if (error) throw new Error(error.message);
      return true;
    }
    const bookings = Utils.getBookings();
    const b = bookings.find(x => String(x.id) === String(id));
    if (b) { b.status = status; Utils.saveBookings(bookings); }
    return true;
  },

  /* ---------------- REVIEWS ---------------- */
  async getReviews() {
    if (this._enabled()) {
      const { data, error } = await SB.client.from('reviews').select('*').order('created_at', { ascending: false });
      if (!error) return data || [];
    }
    return Utils.getReviews();
  },
  async createReview(review) {
    const uid = this._uuid(this._uid());
    const payload = { ...review, user_id: uid || null };
    if (this._enabled()) {
      try {
        const { data, error } = await SB.client.from('reviews').insert(payload).select().maybeSingle();
        if (error) throw new Error(error.message);
        if (data) return data;
      } catch (e) {
        console.warn('[API] Supabase review insert failed — saving locally:', e.message);
      }
    }
    const reviews = Utils.getReviews();
    const row = { id: Utils.generateId(), created_at: new Date().toISOString(), ...payload };
    reviews.unshift(row);
    Utils.saveReviews(reviews);
    return row;
  },

  /* ---------------- MENU ITEMS (custom) ---------------- */
  async getMenuItems() {
    if (this._enabled()) {
      const { data, error } = await SB.client.from('menu_items').select('*').order('created_at', { ascending: true });
      if (!error) return data || [];
    }
    return Utils.getFromStorage(CONFIG.customMenuKey) || [];
  },
  async createMenuItem(item) {
    if (this._enabled()) {
      const { data, error } = await SB.client.from('menu_items').insert(item).select().maybeSingle();
      if (error) throw new Error(error.message);
      return data;
    }
    const list = Utils.getFromStorage(CONFIG.customMenuKey) || [];
    list.push(item);
    Utils.saveToStorage(CONFIG.customMenuKey, list);
    return item;
  },
  async deleteMenuItem(id) {
    if (this._enabled()) {
      const { error } = await SB.client.from('menu_items').delete().eq('id', id);
      if (error) throw new Error(error.message);
      return true;
    }
    let list = Utils.getFromStorage(CONFIG.customMenuKey) || [];
    list = list.filter(x => x.id !== id);
    Utils.saveToStorage(CONFIG.customMenuKey, list);
    return true;
  },

  /* ---------------- PAYMENT QR (admin) ----------------
     Generate a custom-price single-use UPI QR via the create-qr Edge
     Function, then poll qr_payments for the webhook-confirmed result. */
  _fnBase() {
    return (typeof CONFIG !== 'undefined' && CONFIG.supabaseUrl)
      ? CONFIG.supabaseUrl.replace(/\/$/, '') + '/functions/v1'
      : '';
  },
  async createQr(amount, description) {
    const base = this._fnBase();
    if (!base) throw new Error('Supabase is not configured.');
    const res = await fetch(base + '/create-qr', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': CONFIG.supabaseAnonKey,
        'Authorization': 'Bearer ' + CONFIG.supabaseAnonKey
      },
      body: JSON.stringify({ amount, description: description || '' })
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.error || 'Could not generate the QR code.');
    return data;
  },
  async getQrStatus(id) {
    if (this._enabled()) {
      const { data, error } = await SB.client.from('qr_payments').select('*').eq('id', id).maybeSingle();
      if (error) throw new Error(error.message);
      return data;
    }
    return null;
  },

  /* ---------------- DASHBOARD ---------------- */
  async getDashboardStats() {
    const [orders, bookings] = await Promise.all([this.getOrders('all'), this.getBookings('all')]);
    const revenue = orders.filter(o => o.status !== 'cancelled').reduce((s, o) => s + (parseFloat(o.total) || 0), 0);
    const activeBookings = bookings.filter(b => b.status === 'pending' || b.status === 'confirmed').length;
    const totalGuests = bookings.filter(b => b.status !== 'cancelled').reduce((s, b) => s + (parseInt(b.guests) || 0), 0);
    return { revenue, ordersCount: orders.length, activeBookings, totalGuests, recentOrders: orders.slice(0, 6) };
  }
};

/* ---------------- PAYMENT (mock gateway) ---------------- */
const RazorpayPayment = {
  async initiatePayment(amount, info = {}) {
    // Mock gateway — swap for the real Razorpay checkout in production.
    return new Promise(resolve => {
      setTimeout(() => resolve({ success: true, payment_id: 'pay_' + Utils.generateId() }), 900);
    });
  }
};
