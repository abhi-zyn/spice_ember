/* ============================================================
   SPICE & EMBER — CART
   Cart lines are identified by `key` (item id + chosen add-ons) so the
   same dish with different add-ons stays on separate lines.
   ============================================================ */

const Cart = {
  get() { return Utils.getCart(); },

  save(cart) {
    Utils.saveCart(cart);
    this.renderCart();
    this.renderCartSummary();
  },

  // Unit price including any chosen add-ons.
  unitPrice(item) {
    return (item.price || 0) + ((item.addons || []).reduce((s, a) => s + (a.price || 0), 0));
  },
  // Stable line key for an item + its add-ons.
  lineKey(item) {
    const addons = item.addons || [];
    return item.key || (item.id + (addons.length ? '|' + addons.map(a => a.name).slice().sort().join(',') : ''));
  },

  add(item) {
    const cart = this.get();
    const key = this.lineKey(item);
    const existing = cart.find(i => (i.key || i.id) === key);
    if (existing) existing.quantity += item.quantity || 1;
    else cart.push({ id: item.id, key, name: item.name, price: item.price, image: item.image, type: item.type, addons: item.addons || [], quantity: item.quantity || 1 });
    this.save(cart);
    Utils.showToast(`${item.name} added to cart!`);
    this.animateBadge();
  },

  remove(key) {
    this.save(this.get().filter(i => (i.key || i.id) !== key));
    Utils.showToast('Item removed from cart', 'info');
  },

  updateQuantity(key, qty) {
    const cart = this.get();
    const item = cart.find(i => (i.key || i.id) === key);
    if (!item) return;
    if (qty <= 0) { this.remove(key); return; }
    item.quantity = qty;
    this.save(cart);
  },

  clear() { this.save([]); },

  getTotal() { return this.get().reduce((s, i) => s + this.unitPrice(i) * i.quantity, 0); },
  getItemCount() { return this.get().reduce((s, i) => s + i.quantity, 0); },
  getTax() { return this.getTotal() * CONFIG.taxRate; },
  // No home delivery — dine in / take away only, so there is no delivery fee.
  getDeliveryFee() { return 0; },
  getGrandTotal() { return this.getTotal() + this.getTax(); },

  animateBadge() {
    document.querySelectorAll('.cart-badge').forEach(b => {
      b.classList.remove('shake'); void b.offsetWidth; b.classList.add('shake');
      setTimeout(() => b.classList.remove('shake'), 420);
    });
  },

  renderCart() {
    const c = document.querySelector('.cart-items');
    if (!c) return;
    const cart = this.get();
    if (!cart.length) {
      c.innerHTML = `<div class="empty-state"><div class="ico">🛒</div><h3>Your cart is empty</h3><p>Looks like you haven't added anything yet.</p><a href="menu.html" class="btn btn-primary" style="margin-top:18px">Browse Menu</a></div>`;
      return;
    }
    c.innerHTML = cart.map(item => {
      const k = item.key || item.id;
      const addonsHtml = (item.addons && item.addons.length)
        ? `<div class="cart-item-addons" style="color:var(--text-muted);font-size:.8rem;margin-top:3px;line-height:1.5">${item.addons.map(a => '+ ' + a.name + ' (' + Utils.formatPrice(a.price) + ')').join('<br>')}</div>`
        : '';
      return `
      <div class="cart-item">
        <div class="cart-item-img"><img src="${item.image}" alt="${item.name}" loading="lazy"><span class="cart-item-tag ${item.type === 'veg' ? 'veg' : 'nonveg'}">${item.type === 'veg' ? 'V' : 'N'}</span></div>
        <div class="cart-item-info">
          <h4>${item.name}</h4>
          ${addonsHtml}
          <span class="cart-item-price">${Utils.formatPrice(this.unitPrice(item))}</span>
        </div>
        <div class="cart-item-qty">
          <button class="qty-btn qty-minus" data-key="${k}" aria-label="Decrease">−</button>
          <span>${item.quantity}</span>
          <button class="qty-btn qty-plus" data-key="${k}" aria-label="Increase">+</button>
        </div>
        <div class="cart-item-total">${Utils.formatPrice(this.unitPrice(item) * item.quantity)}</div>
        <button class="cart-item-remove" data-key="${k}" aria-label="Remove">&times;</button>
      </div>`;
    }).join('');

    c.querySelectorAll('.qty-minus').forEach(b => b.addEventListener('click', () => {
      const i = cart.find(x => (x.key || x.id) === b.dataset.key); if (i) this.updateQuantity(b.dataset.key, i.quantity - 1);
    }));
    c.querySelectorAll('.qty-plus').forEach(b => b.addEventListener('click', () => {
      const i = cart.find(x => (x.key || x.id) === b.dataset.key); if (i) this.updateQuantity(b.dataset.key, i.quantity + 1);
    }));
    c.querySelectorAll('.cart-item-remove').forEach(b => b.addEventListener('click', () => this.remove(b.dataset.key)));
  },

  renderCartSummary() {
    const c = document.querySelector('.cart-summary');
    if (!c) return;
    const cart = this.get();
    if (!cart.length) { c.innerHTML = ''; return; }
    const subtotal = this.getTotal(), tax = this.getTax(), total = this.getGrandTotal();
    c.innerHTML = `
      <h3 class="summary-title">Order Summary</h3>
      <div class="summary-row"><span>Subtotal (${this.getItemCount()} items)</span><span>${Utils.formatPrice(subtotal)}</span></div>
      <div class="summary-row"><span>Tax (${(CONFIG.taxRate * 100).toFixed(0)}%)</span><span>${Utils.formatPrice(tax)}</span></div>
      <div class="summary-row summary-total"><span>Total</span><span>${Utils.formatPrice(total)}</span></div>
      <button class="btn btn-primary btn-block btn-lg checkout-btn">Proceed to Checkout</button>
      <button class="btn btn-ghost btn-block clear-cart-btn" style="margin-top:10px">Clear Cart</button>`;

    c.querySelector('.checkout-btn')?.addEventListener('click', () => {
      if (typeof Auth !== 'undefined' && !Auth.requireLogin('check out')) return;
      const checkout = document.getElementById('checkoutSection');
      if (checkout) {
        checkout.style.display = 'block';
        checkout.scrollIntoView({ behavior: 'smooth' });
        Cart.prefillCheckout();
      }
    });
    c.querySelector('.clear-cart-btn')?.addEventListener('click', () => { if (confirm('Clear your entire cart?')) this.clear(); });
  },

  // Prefill the checkout form from saved customer details (and the logged-in
  // account) so returning customers don't have to retype everything.
  prefillCheckout() {
    const saved = Utils.getFromStorage('spice-ember-customer') || {};
    const n = document.getElementById('checkoutName');
    const em = document.getElementById('checkoutEmail');
    const ph = document.getElementById('checkoutPhone');
    const name = saved.name || (typeof Auth !== 'undefined' ? Auth.userName : '') || '';
    const email = saved.email || (typeof Auth !== 'undefined' ? Auth.userEmail : '') || '';
    const phone = saved.phone || '';
    if (n) n.value = name;
    if (em) em.value = email;
    if (ph) ph.value = phone;
    const note = document.getElementById('savedDetailsNote');
    if (note && (saved.name || saved.phone)) note.style.display = 'block';
  }
};

document.addEventListener('DOMContentLoaded', () => {
  Cart.renderCart();
  Cart.renderCartSummary();

  const form = document.getElementById('checkoutForm');
  if (form) {
    form.addEventListener('submit', async e => {
      e.preventDefault();
      const payBtn = document.getElementById('payBtn');
      const cart = Cart.get();
      if (!cart.length) { Utils.showToast('Your cart is empty', 'error'); return; }
      const fd = new FormData(form);
      const orderType = fd.get('order_type') || 'Dine In';
      const orderDetails = {
        customer_name: fd.get('name'), customer_email: fd.get('email'), customer_phone: fd.get('phone'),
        order_type: orderType, notes: fd.get('notes') || '',
        items: cart, subtotal: Cart.getTotal(), tax: Cart.getTax(),
        delivery_fee: 0, total: Cart.getGrandTotal()
      };
      // Remember details for next time (works for guests and logged-in users).
      Utils.saveToStorage('spice-ember-customer', {
        name: orderDetails.customer_name, email: orderDetails.customer_email, phone: orderDetails.customer_phone
      });
      payBtn.disabled = true; payBtn.textContent = 'Processing…';
      try {
        const payment = await RazorpayPayment.initiatePayment(orderDetails);
        await API.createOrder({ ...orderDetails, user_id: (typeof Auth !== 'undefined' && Auth.userId) || null, payment_id: payment.payment_id, payment_method: 'razorpay', status: 'pending' });
        if (typeof Auth !== 'undefined' && Auth.isLoggedIn) {
          Auth.saveProfile({ full_name: orderDetails.customer_name, email: orderDetails.customer_email, phone: orderDetails.customer_phone });
        }
        const checkout = document.getElementById('checkoutSection');
        const confirmation = document.getElementById('confirmationSection');
        if (checkout) checkout.style.display = 'none';
        if (confirmation) {
          confirmation.style.display = 'block';
          const d = document.getElementById('confirmationDetails');
          if (d) d.innerHTML = `<p><strong>Payment ID:</strong> ${payment.payment_id}</p><p><strong>Total Paid:</strong> ${Utils.formatPrice(orderDetails.total)}</p><p><strong>Order Type:</strong> ${orderDetails.order_type}</p>`;
          confirmation.scrollIntoView({ behavior: 'smooth' });
        }
        Cart.clear();
        Utils.showToast('Order placed successfully!', 'success');
      } catch (err) {
        Utils.showToast(err.message || 'Payment failed. Please try again.', 'error');
      } finally {
        payBtn.disabled = false; payBtn.textContent = 'Pay Now';
      }
    });
  }
  document.getElementById('backToCartBtn')?.addEventListener('click', () => {
    const c = document.getElementById('checkoutSection'); if (c) c.style.display = 'none';
    document.querySelector('.cart-layout')?.scrollIntoView({ behavior: 'smooth' });
  });
});
