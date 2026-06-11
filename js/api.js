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
    const uid = this._uid();
    const payload = { ...order, user_id: order.user_id || uid || null };
    if (this._enabled()) {
      const { data, error } = await SB.client.from('orders').insert(payload).select().maybeSingle();
      if (!error && data) return data;
      // The DB insert failed (e.g. RLS or a missing column). Do NOT lose the
      // order — log the exact reason and keep a local backup instead.
      console.error('[createOrder] Supabase insert failed — saving order locally as a backup. Reason:', error && error.message, error);
      Utils.showToast && Utils.showToast('Saved your order locally (database sync issue) — see console.', 'info');
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
    const patch = { status };
    // Stamp the delivery time when an order is marked delivered.
    if (status === 'delivered') patch.delivered_at = new Date().toISOString();
    if (this._enabled()) {
      const { error } = await SB.client.from('orders').update(patch).eq('id', id);
      if (error) throw new Error(error.message);
      return true;
    }
    const orders = Utils.getOrders();
    const o = orders.find(x => String(x.id) === String(id));
    if (o) { o.status = status; if (status === 'delivered') o.delivered_at = new Date().toISOString(); Utils.saveOrders(orders); }
    return true;
  },

  /* ---------------- PAYMENTS ---------------- */
  async getPayments() {
    if (this._enabled()) {
      const { data, error } = await SB.client.from('payments').select('*').order('created_at', { ascending: false });
      if (error) throw new Error(error.message);
      return data || [];
    }
    return Utils.getFromStorage('spice-ember-payments') || [];
  },
  // Secure admin view: fetches ALL payments via the admin-payments Edge
  // Function using a server-side dashboard key (never stored in the client).
  async getAdminPayments(adminKey) {
    let base = (typeof CONFIG !== 'undefined' && CONFIG.supabaseUrl) ? CONFIG.supabaseUrl : '';
    if (base.endsWith('/')) base = base.slice(0, -1);
    if (!base) throw new Error('Supabase is not configured.');
    const res = await fetch(base + '/functions/v1/admin-payments', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': (CONFIG.supabaseAnonKey || ''),
        'Authorization': 'Bearer ' + (CONFIG.supabaseAnonKey || ''),
        'x-admin-key': adminKey || ''
      },
      body: '{}'
    });
    const json = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(json.error || 'Could not load payments.');
    return json.payments || [];
  },

  /* ---------------- BOOKINGS ---------------- */
  async createBooking(booking) {
    const uid = this._uid();
    const payload = { ...booking, user_id: booking.user_id || uid || null };
    if (this._enabled()) {
      const { data, error } = await SB.client.from('bookings').insert(payload).select().maybeSingle();
      if (error) throw new Error(error.message);
      return data;
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
    const uid = this._uid();
    const payload = { ...review, user_id: uid || null };
    if (this._enabled()) {
      const { data, error } = await SB.client.from('reviews').insert(payload).select().maybeSingle();
      if (error) throw new Error(error.message);
      return data;
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

  /* ---------------- DASHBOARD ---------------- */
  async getDashboardStats() {
    const [orders, bookings] = await Promise.all([this.getOrders('all'), this.getBookings('all')]);
    const revenue = orders.filter(o => o.status !== 'cancelled').reduce((s, o) => s + (parseFloat(o.total) || 0), 0);
    const activeBookings = bookings.filter(b => b.status === 'pending' || b.status === 'confirmed').length;
    const totalGuests = bookings.filter(b => b.status !== 'cancelled').reduce((s, b) => s + (parseInt(b.guests) || 0), 0);
    return { revenue, ordersCount: orders.length, activeBookings, totalGuests, recentOrders: orders.slice(0, 6) };
  }
};

/* ---------------- PAYMENT (Razorpay) ----------------
   Three modes, chosen automatically:
   1) SERVER-VERIFIED (recommended): when Supabase is configured, calls the
      `create-order` Edge Function for a tamper-proof order_id, opens Checkout,
      then calls `verify-payment` to verify the signature server-side and log
      the payment to the `payments` table. See SETUP_PAYMENTS.md.
   2) CLIENT-ONLY: a Razorpay Key ID is set in config but the functions aren't
      reachable — opens Checkout without server verification.
   3) SIMULATED: nothing configured — resolves a fake success so the site works.
   The Key SECRET never lives in this client code.
   ---------------------------------------------------- */
const RazorpayPayment = {
  _fnBase() {
    let base = (typeof CONFIG !== 'undefined' && CONFIG.supabaseUrl) ? CONFIG.supabaseUrl : '';
    if (base.endsWith('/')) base = base.slice(0, -1);
    return base ? base + '/functions/v1' : '';
  },
  _serverEnabled() {
    return typeof SB !== 'undefined' && SB.enabled && !!this._fnBase();
  },
  async _callFn(name, payload) {
    const headers = { 'Content-Type': 'application/json' };
    if (typeof CONFIG !== 'undefined' && CONFIG.supabaseAnonKey) {
      headers['apikey'] = CONFIG.supabaseAnonKey;
      headers['Authorization'] = 'Bearer ' + CONFIG.supabaseAnonKey;
    }
    try {
      const { data } = await SB.client.auth.getSession();
      if (data && data.session && data.session.access_token) {
        headers['Authorization'] = 'Bearer ' + data.session.access_token;
      }
    } catch (_) {}
    const res = await fetch(this._fnBase() + '/' + name, {
      method: 'POST', headers, body: JSON.stringify(payload || {})
    });
    const json = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(json.error || ('Request failed: ' + name));
    return json;
  },

  // Opens Razorpay Checkout and resolves with the success response, or rejects
  // on dismiss/failure.
  _openCheckout(options) {
    return new Promise((resolve, reject) => {
      const opts = { ...options };
      opts.handler = (response) => resolve(response);
      opts.modal = { ondismiss() { reject(new Error('Payment cancelled.')); } };
      try {
        const rzp = new window.Razorpay(opts);
        rzp.on('payment.failed', resp => {
          reject(new Error((resp && resp.error && resp.error.description) || 'Payment failed. Please try again.'));
        });
        rzp.open();
      } catch (e) {
        reject(new Error('Could not open Razorpay Checkout.'));
      }
    });
  },

  async initiatePayment(orderDetails = {}) {
    const amount = Number((orderDetails && (orderDetails.total ?? orderDetails.amount)) || 0);
    const hasSdk = typeof window !== 'undefined' && typeof window.Razorpay !== 'undefined';

    /* ---- Mode 1: server-verified flow ---- */
    if (this._serverEnabled() && hasSdk) {
      let created = null;
      try {
        created = await this._callFn('create-order', {
          amount,
          currency: 'INR',
          receipt: 'order_' + Utils.generateId(),
          notes: {
            customer_email: orderDetails.customer_email || '',
            customer_phone: orderDetails.customer_phone || ''
          }
        });
      } catch (e) {
        console.warn('[Razorpay] create-order unavailable, falling back:', e.message);
      }
      if (created && created.id) {
        const response = await this._openCheckout({
          key: created.key_id || CONFIG.razorpayKeyId,
          order_id: created.id,
          amount: created.amount,
          currency: created.currency || 'INR',
          name: CONFIG.appName || 'Spice & Ember',
          description: 'Food order payment',
          prefill: {
            name: orderDetails.customer_name || orderDetails.name || '',
            email: orderDetails.customer_email || orderDetails.email || '',
            contact: orderDetails.customer_phone || orderDetails.phone || ''
          },
          notes: { order_type: orderDetails.order_type || '' },
          theme: { color: '#ff5722' }
        });

        // Verify + log on the server before resolving success.
        const result = await this._callFn('verify-payment', {
          razorpay_order_id: response.razorpay_order_id,
          razorpay_payment_id: response.razorpay_payment_id,
          razorpay_signature: response.razorpay_signature,
          order: orderDetails
        });
        if (!result || !result.verified) throw new Error('Payment could not be verified.');
        return {
          success: true, verified: true,
          payment_id: response.razorpay_payment_id,
          razorpay_order_id: response.razorpay_order_id,
          payment: result.payment, raw: response
        };
      }
    }

    /* ---- Mode 2: client-only flow ---- */
    const keyId = (typeof CONFIG !== 'undefined' && CONFIG.razorpayKeyId) ? CONFIG.razorpayKeyId : '';
    if (keyId && hasSdk) {
      const response = await this._openCheckout({
        key: keyId,
        amount: Math.round(amount * 100),
        currency: 'INR',
        name: CONFIG.appName || 'Spice & Ember',
        description: 'Food order payment',
        prefill: {
          name: orderDetails.customer_name || orderDetails.name || '',
          email: orderDetails.customer_email || orderDetails.email || '',
          contact: orderDetails.customer_phone || orderDetails.phone || ''
        },
        notes: { order_type: orderDetails.order_type || '' },
        theme: { color: '#ff5722' }
      });
      return { success: true, verified: false, payment_id: response.razorpay_payment_id, raw: response };
    }

    /* ---- Mode 3: simulated fallback ---- */
    console.info('[Razorpay] No key/SDK/server — using a simulated payment.');
    return new Promise(resolve => {
      setTimeout(() => resolve({ success: true, simulated: true, verified: false, payment_id: 'pay_sim_' + Utils.generateId() }), 900);
    });
  }
};
