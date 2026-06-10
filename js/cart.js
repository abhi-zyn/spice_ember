/* ============================================================
   SPICE & EMBER — CART
   ============================================================ */

const Cart = {
  get() { return Utils.getCart(); },

  save(cart) {
    Utils.saveCart(cart);
    this.renderCart();
    this.renderCartSummary();
  },

  add(item) {
    const cart = this.get();
    const existing = cart.find(i => i.id === item.id);
    if (existing) existing.quantity += item.quantity || 1;
    else cart.push({ id: item.id, name: item.name, price: item.price, image: item.image, type: item.type, quantity: item.quantity || 1 });
    this.save(cart);
    Utils.showToast(`${item.name} added to cart!`);
    this.animateBadge();
  },

  remove(id) {
    this.save(this.get().filter(i => i.id !== id));
    Utils.showToast('Item removed from cart', 'info');
  },

  updateQuantity(id, qty) {
    const cart = this.get();
    const item = cart.find(i => i.id === id);
    if (!item) return;
    if (qty <= 0) { this.remove(id); return; }
    item.quantity = qty;
    this.save(cart);
  },

  clear() { this.save([]); },

  getTotal() { return this.get().reduce((s, i) => s + i.price * i.quantity, 0); },
  getItemCount() { return this.get().reduce((s, i) => s + i.quantity, 0); },
  getTax() { return this.getTotal() * CONFIG.taxRate; },
  getDeliveryFee() { const t = this.getTotal(); return t === 0 ? 0 : (t >= CONFIG.freeDeliveryMin ? 0 : CONFIG.deliveryFee); },
  getGrandTotal() { return this.getTotal() + this.getTax() + this.getDeliveryFee(); },

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
      c.innerHTML = `<div class="empty-state"><div class="ico">\uD83D\uDED2</div><h3>Your cart is empty</h3><p>Looks like you haven't added anything yet.</p><a href="menu.html" class="btn btn-primary" style="margin-top:18px">Browse Menu</a></div>`;
      return;
    }
    c.innerHTML = cart.map(item => `
      <div class="cart-item">
        <div class="cart-item-img"><img src="${item.image}" alt="${item.name}" loading="lazy"><span class="cart-item-tag ${item.type === 'veg' ? 'veg' : 'nonveg'}">${item.type === 'veg' ? 'V' : 'N'}</span></div>
        <div class="cart-item-info">
          <h4>${item.name}</h4>
          <span class="cart-item-price">${Utils.formatPrice(item.price)}</span>
        </div>
        <div class="cart-item-qty">
          <button class="qty-btn qty-minus" data-id="${item.id}" aria-label="Decrease">\u2212</button>
          <span>${item.quantity}</span>
          <button class="qty-btn qty-plus" data-id="${item.id}" aria-label="Increase">+</button>
        </div>
        <div class="cart-item-total">${Utils.formatPrice(item.price * item.quantity)}</div>
        <button class="cart-item-remove" data-id="${item.id}" aria-label="Remove">&times;</button>
      </div>`).join('');

    c.querySelectorAll('.qty-minus').forEach(b => b.addEventListener('click', () => {
      const i = cart.find(x => x.id === b.dataset.id); if (i) this.updateQuantity(b.dataset.id, i.quantity - 1);
    }));
    c.querySelectorAll('.qty-plus').forEach(b => b.addEventListener('click', () => {
      const i = cart.find(x => x.id === b.dataset.id); if (i) this.updateQuantity(b.dataset.id, i.quantity + 1);
    }));
    c.querySelectorAll('.cart-item-remove').forEach(b => b.addEventListener('click', () => this.remove(b.dataset.id)));
  },

  renderCartSummary() {
    const c = document.querySelector('.cart-summary');
    if (!c) return;
    const cart = this.get();
    if (!cart.length) { c.innerHTML = ''; return; }
    const subtotal = this.getTotal(), tax = this.getTax(), delivery = this.getDeliveryFee(), total = this.getGrandTotal();
    c.innerHTML = `
      <h3 class="summary-title">Order Summary</h3>
      <div class="summary-row"><span>Subtotal (${this.getItemCount()} items)</span><span>${Utils.formatPrice(subtotal)}</span></div>
      <div class="summary-row"><span>Tax (${(CONFIG.taxRate * 100).toFixed(0)}%)</span><span>${Utils.formatPrice(tax)}</span></div>
      <div class="summary-row"><span>Delivery</span><span>${delivery === 0 ? '<strong style="color:var(--success)">FREE</strong>' : Utils.formatPrice(delivery)}</span></div>
      ${subtotal < CONFIG.freeDeliveryMin ? `<div class="summary-hint">Add ${Utils.formatPrice(CONFIG.freeDeliveryMin - subtotal)} more for free delivery</div>` : ''}
      <div class="summary-row summary-total"><span>Total</span><span>${Utils.formatPrice(total)}</span></div>
      <button class="btn btn-primary btn-block btn-lg checkout-btn">Proceed to Checkout</button>
      <button class="btn btn-ghost btn-block clear-cart-btn" style="margin-top:10px">Clear Cart</button>`;

    c.querySelector('.checkout-btn')?.addEventListener('click', async () => {
      if (typeof Auth !== 'undefined' && !Auth.requireLogin('check out')) return;
      const checkout = document.getElementById('checkoutSection');
      if (checkout) {
        checkout.style.display = 'block';
        checkout.scrollIntoView({ behavior: 'smooth' });
        const n = document.getElementById('checkoutName'); const em = document.getElementById('checkoutEmail');
        if (n) n.value = Auth.userName || ''; if (em) em.value = Auth.userEmail || '';
        try {
          const profile = await Auth.getProfile();
          if (profile) {
            const ph = document.getElementById('checkoutPhone'); const ad = document.getElementById('checkoutAddress');
            if (ph && profile.phone) ph.value = profile.phone;
            if (ad && profile.address) {
              ad.value = profile.address;
              const note = document.getElementById('savedAddressNote');
              if (note) note.style.display = 'block';
            }
          }
        } catch (e) {}
      }
    });
    c.querySelector('.clear-cart-btn')?.addEventListener('click', () => { if (confirm('Clear your entire cart?')) this.clear(); });
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
      const orderDetails = {
        customer_name: fd.get('name'), customer_email: fd.get('email'), customer_phone: fd.get('phone'),
        delivery_address: fd.get('address'), notes: fd.get('notes') || '',
        items: cart, subtotal: Cart.getTotal(), tax: Cart.getTax(),
        delivery_fee: Cart.getDeliveryFee(), total: Cart.getGrandTotal()
      };
      payBtn.disabled = true; payBtn.textContent = 'Processing\u2026';
      try {
        const payment = await RazorpayPayment.initiatePayment(orderDetails);
        await API.createOrder({ ...orderDetails, user_id: (typeof Auth !== 'undefined' && Auth.userId) || null, payment_id: payment.payment_id, payment_method: 'razorpay', status: 'pending' });
        if (typeof Auth !== 'undefined' && Auth.isLoggedIn) {
          Auth.saveProfile({ full_name: orderDetails.customer_name, email: orderDetails.customer_email, phone: orderDetails.customer_phone, address: orderDetails.delivery_address });
        }
        const checkout = document.getElementById('checkoutSection');
        const confirmation = document.getElementById('confirmationSection');
        if (checkout) checkout.style.display = 'none';
        if (confirmation) {
          confirmation.style.display = 'block';
          const d = document.getElementById('confirmationDetails');
          if (d) d.innerHTML = `<p><strong>Payment ID:</strong> ${payment.payment_id}</p><p><strong>Total Paid:</strong> ${Utils.formatPrice(orderDetails.total)}</p><p><strong>Delivery to:</strong> ${orderDetails.delivery_address}</p>`;
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
