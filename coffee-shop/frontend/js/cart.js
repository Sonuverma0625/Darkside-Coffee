(function cartModule() {
  const CART_KEY = 'coffeeShopCart';
  const qs = (selector, scope = document) => scope.querySelector(selector);
  const qsa = (selector, scope = document) => Array.from(scope.querySelectorAll(selector));
  let pendingCheckout = null;
  let submittingOrder = false;

  const escapeHtml = (value = '') =>
    String(value)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');

  const getItems = () => {
    try {
      return JSON.parse(localStorage.getItem(CART_KEY) || '[]');
    } catch (error) {
      return [];
    }
  };

  const saveItems = (items) => {
    localStorage.setItem(CART_KEY, JSON.stringify(items));
    renderCart();
  };

  const formatCurrency = (amount) =>
    new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(Number(amount) || 0);

  const imageUrl = (image) => {
    if (!image) return 'images/header-bg.jpg';
    if (/^(https?:)?\/\//.test(image) || image.startsWith('data:')) return image;
    if (image.startsWith('/uploads')) return `${window.CoffeeAPI?.origin || ''}${image}`;
    return image;
  };

  const isMongoId = (value) => /^[a-f\d]{24}$/i.test(String(value));
  const customizationKey = (customization = {}) =>
    ['size', 'milk', 'sugar', 'ice'].map((key) => customization[key] || '').join('|');
  const slug = (value = '') => String(value).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

  const resolveCartItem = (item) => {
    const products = Array.from(window.CoffeeStoreProducts?.values?.() || []);
    const rawProductId = item.productId || String(item.id || '').split(':')[0];

    if (isMongoId(rawProductId)) {
      return { ...item, productId: rawProductId };
    }

    const sampleSlug = slug(String(rawProductId).replace(/^sample-/, ''));
    const titleSlug = slug(item.title);
    const product = products.find((entry) => {
      const entrySlug = slug(entry.title);
      return entrySlug === sampleSlug || entrySlug === titleSlug;
    });

    if (!product) return item;

    const productId = product._id || product.id;
    return {
      ...item,
      id: `${productId}:${customizationKey(item.customization || {})}`,
      productId,
      title: product.title,
      price: Number(product.discountPrice || product.price) || item.price,
      image: product.image || item.image
    };
  };

  const add = (product, quantity = 1, customization = {}) => {
    if (!product) return;

    const productId = product._id || product.id;
    const id = `${productId}:${customizationKey(customization)}`;
    const items = getItems().map(resolveCartItem);
    const existing = items.find((item) => item.id === id);

    if (existing) {
      existing.quantity += quantity;
    } else {
      items.push({
        id,
        productId,
        title: product.title,
        price: Number(product.discountPrice || product.price) || 0,
        image: product.image || 'images/header-bg.jpg',
        customization,
        quantity
      });
    }

    saveItems(items);
    openCart();
  };

  const remove = (id) => saveItems(getItems().filter((item) => item.id !== id));

  const updateQuantity = (id, quantity) => {
    const items = getItems()
      .map((item) => (item.id === id ? { ...item, quantity: Math.max(1, quantity) } : item))
      .filter((item) => item.quantity > 0);
    saveItems(items);
  };

  const clear = () => saveItems([]);
  const getTotal = () => getItems().reduce((sum, item) => sum + item.price * item.quantity, 0);
  const customizationText = (customization = {}) =>
    [customization.size, customization.milk, customization.sugar, customization.ice].filter(Boolean).join(' / ');

  const renderCart = () => {
    const items = getItems();
    const cartItems = qs('#cartItems');
    const cartTotal = qs('#cartTotal');
    const cartCount = qs('#cartCount');

    if (cartCount) cartCount.textContent = items.reduce((sum, item) => sum + item.quantity, 0);
    if (cartTotal) cartTotal.textContent = formatCurrency(getTotal());
    if (!cartItems) return;

    if (items.length === 0) {
      cartItems.innerHTML = '<p class="empty-state">Your cart is empty.</p>';
      return;
    }

    cartItems.innerHTML = items
      .map(
        (item) => `
          <article class="cart-item">
            <img src="${escapeHtml(imageUrl(item.image))}" alt="${escapeHtml(item.title)}" />
            <div>
              <h3>${escapeHtml(item.title)}</h3>
              <p>${formatCurrency(item.price)}</p>
              <small>${escapeHtml(customizationText(item.customization))}</small>
              <div class="quantity-row">
                <button type="button" data-cart-decrease="${escapeHtml(item.id)}" aria-label="Decrease quantity">-</button>
                <span>${Number(item.quantity) || 1}</span>
                <button type="button" data-cart-increase="${escapeHtml(item.id)}" aria-label="Increase quantity">+</button>
                <button type="button" class="text-button" data-cart-remove="${escapeHtml(item.id)}">Remove</button>
              </div>
            </div>
          </article>
        `
      )
      .join('');
  };

  const openCart = () => {
    syncCheckoutUser();
    qs('#cartDrawer')?.classList.add('open');
    qs('#cartBackdrop')?.classList.add('open');
    qs('#cartDrawer')?.setAttribute('aria-hidden', 'false');
    document.body.classList.add('no-scroll');
  };

  const closeCart = () => {
    qs('#cartDrawer')?.classList.remove('open');
    qs('#cartBackdrop')?.classList.remove('open');
    qs('#cartDrawer')?.setAttribute('aria-hidden', 'true');
    if (!qs('#checkoutModal')?.classList.contains('open')) document.body.classList.remove('no-scroll');
  };

  const injectCheckoutUI = () => {
    const form = qs('#checkoutForm');
    if (form) {
      form.className = 'checkout-form';
      form.innerHTML = `
        <label>Customer name<input type="text" name="customerName" required minlength="2" maxlength="80" autocomplete="name" /></label>
        <label>Email<input type="email" name="customerEmail" required readonly autocomplete="email" /></label>
        <label>Phone<input type="tel" name="contactPhone" required pattern="[+0-9 ()-]{7,20}" autocomplete="tel" /></label>
        <label>Street address<textarea name="street" required minlength="5" maxlength="160" rows="2" autocomplete="street-address"></textarea></label>
        <div class="checkout-field-grid">
          <label>City<input type="text" name="city" required minlength="2" maxlength="80" autocomplete="address-level2" /></label>
          <label>State<input type="text" name="state" required minlength="2" maxlength="80" autocomplete="address-level1" /></label>
          <label>PIN code<input type="text" name="zip" required pattern="[0-9]{6}" inputmode="numeric" autocomplete="postal-code" /></label>
        </div>
        <button class="primary-button" type="submit">Place order</button>
      `;
    }

    if (qs('#checkoutModal')) return;
    document.body.insertAdjacentHTML(
      'beforeend',
      `
        <div class="modal checkout-modal" id="checkoutModal" aria-hidden="true">
          <div class="modal-panel checkout-panel" role="dialog" aria-modal="true" aria-labelledby="checkoutTitle">
            <div class="checkout-heading">
              <div><p class="eyebrow">Checkout</p><h2 id="checkoutTitle">Review your order</h2></div>
              <button class="modal-close" type="button" data-close-checkout aria-label="Close checkout">&times;</button>
            </div>
            <div id="checkoutReview"></div>
            <p class="form-message" id="checkoutMessage" aria-live="polite"></p>
          </div>
        </div>
      `
    );
  };

  const syncCheckoutUser = () => {
    const form = qs('#checkoutForm');
    const user = window.CoffeeAuth?.getUser();
    if (!form || !user) return;
    if (!form.elements.customerName.value) form.elements.customerName.value = user.name || '';
    form.elements.customerEmail.value = user.email || '';
    if (!form.elements.contactPhone.value) form.elements.contactPhone.value = user.phone || '';
    const address = user.address || {};
    ['street', 'city', 'state', 'zip'].forEach((field) => {
      if (!form.elements[field].value) form.elements[field].value = address[field] || '';
    });
  };

  const buildCheckoutPayload = (form) => {
    const formData = new FormData(form);
    return {
      products: getItems().map((item) => ({
        product: item.productId || item.id,
        quantity: item.quantity,
        customization: item.customization || {}
      })),
      customerName: formData.get('customerName'),
      customerEmail: formData.get('customerEmail'),
      contactPhone: formData.get('contactPhone'),
      shippingAddress: {
        street: formData.get('street'),
        city: formData.get('city'),
        state: formData.get('state'),
        zip: formData.get('zip'),
        country: 'India'
      }
    };
  };

  const addressText = (address = {}) =>
    [address.street, address.city, address.state, address.zip, address.country].filter(Boolean).join(', ');

  const renderOrderReview = ({ preview, payment }) => {
    const review = qs('#checkoutReview');
    if (!review) return;
    const qrCode = String(payment.qrCode || '').startsWith('data:image/png;base64,') ? payment.qrCode : '';

    review.innerHTML = `
      <div class="checkout-layout">
        <div class="checkout-review-column">
          <section class="checkout-section">
            <h3>Customer</h3>
            <dl class="checkout-details">
              <div><dt>Name</dt><dd>${escapeHtml(preview.customer.name)}</dd></div>
              <div><dt>Email</dt><dd>${escapeHtml(preview.customer.email)}</dd></div>
              <div><dt>Phone</dt><dd>${escapeHtml(preview.customer.phone)}</dd></div>
              <div><dt>Address</dt><dd>${escapeHtml(addressText(preview.shippingAddress))}</dd></div>
            </dl>
          </section>
          <section class="checkout-section">
            <h3>Items</h3>
            <div class="order-review-items">
              ${preview.products
                .map(
                  (item) => `
                    <div class="order-review-item">
                      <div><strong>${escapeHtml(item.title)}</strong><small>${escapeHtml(customizationText(item.customization))}</small></div>
                      <span>${item.quantity} x ${formatCurrency(item.price)}</span>
                    </div>
                  `
                )
                .join('')}
            </div>
            <div class="order-review-total"><span>Total</span><strong>${formatCurrency(preview.totalPrice)}</strong></div>
          </section>
        </div>
        <section class="checkout-section payment-section">
          <h3>Payment</h3>
          <div class="payment-options" role="radiogroup" aria-label="Payment method">
            <label><input type="radio" name="paymentMethod" value="UPI" /><span><strong>UPI payment</strong><small>UPI app</small></span></label>
            <label><input type="radio" name="paymentMethod" value="QR" /><span><strong>QR code</strong><small>Scan and pay</small></span></label>
            <label><input type="radio" name="paymentMethod" value="COD" /><span><strong>Cash on Delivery</strong><small>Pay on arrival</small></span></label>
          </div>
          <div class="digital-payment" id="digitalPayment" hidden>
            ${qrCode ? `<img class="payment-qr" src="${qrCode}" alt="UPI QR code for ${formatCurrency(payment.amount)}" />` : ''}
            <div class="upi-payment-meta">
              <span>UPI ID</span><strong>${escapeHtml(payment.upiId)}</strong>
              <span>Amount</span><strong>${formatCurrency(payment.amount)}</strong>
            </div>
            <a class="secondary-button upi-link" id="upiPaymentLink" href="${escapeHtml(payment.upiUri)}">Open UPI app</a>
            <label>Transaction / reference ID (optional)<input type="text" id="transactionId" maxlength="100" autocomplete="off" /></label>
          </div>
          <div class="cod-payment" id="codPayment" hidden>
            <p>Payment status will remain pending until delivery.</p>
          </div>
          <button class="primary-button checkout-confirm" id="confirmOrderButton" type="button" disabled>Select payment method</button>
        </section>
      </div>
    `;
  };

  const openCheckout = () => {
    const modal = qs('#checkoutModal');
    closeCart();
    modal?.classList.add('open');
    modal?.setAttribute('aria-hidden', 'false');
    document.body.classList.add('no-scroll');
  };

  const closeCheckout = () => {
    const modal = qs('#checkoutModal');
    modal?.classList.remove('open');
    modal?.setAttribute('aria-hidden', 'true');
    document.body.classList.remove('no-scroll');
  };

  const reviewCheckout = async (form) => {
    const message = qs('#cartMessage');
    const items = getItems();

    if (items.length === 0) {
      window.CoffeeAPI?.setMessage(message, 'Add at least one coffee before checkout.', true);
      return;
    }

    if (!window.CoffeeAuth?.getUser()) {
      window.CoffeeAPI?.setMessage(message, 'Login before checkout.', true);
      window.CoffeeAuth?.openAuth('login');
      return;
    }

    if (items.some((item) => !isMongoId(item.productId || item.id))) {
      window.CoffeeAPI?.setMessage(message, 'Your cart has old sample items. Remove them and add products again from the menu.', true);
      return;
    }

    if (!form.reportValidity()) return;

    try {
      window.CoffeeAPI?.setMessage(message, 'Preparing your order...');
      const payload = buildCheckoutPayload(form);
      const data = await window.CoffeeAPI.request('/orders/preview', {
        method: 'POST',
        body: JSON.stringify(payload)
      });
      pendingCheckout = { payload, preview: data.preview, payment: data.payment };
      renderOrderReview(data);
      window.CoffeeAPI?.setMessage(message, '');
      window.CoffeeAPI?.setMessage(qs('#checkoutMessage'), '');
      openCheckout();
    } catch (error) {
      window.CoffeeAPI?.setMessage(message, error.message, true);
    }
  };

  const selectPaymentMethod = (method) => {
    const digital = method === 'UPI' || method === 'QR';
    const confirmButton = qs('#confirmOrderButton');
    qs('#digitalPayment').hidden = !digital;
    qs('#codPayment').hidden = method !== 'COD';
    qs('#upiPaymentLink').hidden = method !== 'UPI';
    confirmButton.disabled = false;
    confirmButton.textContent = digital ? 'I have paid' : 'Place COD order';
    window.CoffeeAPI?.setMessage(qs('#checkoutMessage'), '');
  };

  const showOrderSuccess = (order) => {
    const review = qs('#checkoutReview');
    if (!review) return;
    review.innerHTML = `
      <div class="order-success" role="status">
        <p class="eyebrow">Confirmed</p>
        <h2>Order placed successfully</h2>
        <p>Order ID</p>
        <code>${escapeHtml(order._id || order.id)}</code>
        <p>${escapeHtml(order.paymentMethod)} payment status: ${escapeHtml(order.paymentStatus || 'Pending')}</p>
        <button class="primary-button" type="button" data-close-checkout>Continue shopping</button>
      </div>
    `;
  };

  const submitOrder = async () => {
    if (!pendingCheckout || submittingOrder) return;
    const selected = qs('input[name="paymentMethod"]:checked', qs('#checkoutModal'));
    const message = qs('#checkoutMessage');

    if (!selected) {
      window.CoffeeAPI?.setMessage(message, 'Select a payment method.', true);
      return;
    }

    const paymentMethod = selected.value;
    const digital = paymentMethod === 'UPI' || paymentMethod === 'QR';
    const button = qs('#confirmOrderButton');
    submittingOrder = true;
    button.disabled = true;
    button.textContent = 'Saving order...';

    try {
      const data = await window.CoffeeAPI.request('/orders', {
        method: 'POST',
        body: JSON.stringify({
          ...pendingCheckout.payload,
          paymentMethod,
          paymentConfirmed: digital,
          transactionId: digital ? qs('#transactionId')?.value.trim() || '' : ''
        })
      });
      clear();
      qs('#checkoutForm')?.reset();
      syncCheckoutUser();
      pendingCheckout = null;
      showOrderSuccess(data.order);
    } catch (error) {
      window.CoffeeAPI?.setMessage(message, error.message, true);
      button.disabled = false;
      button.textContent = digital ? 'I have paid' : 'Place COD order';
    } finally {
      submittingOrder = false;
    }
  };

  const initCart = () => {
    injectCheckoutUI();
    syncCheckoutUser();
    renderCart();

    qsa('.js-cart-button').forEach((button) => button.addEventListener('click', openCart));
    qsa('.js-cart-close').forEach((button) => button.addEventListener('click', closeCart));
    qs('#cartBackdrop')?.addEventListener('click', closeCart);
    window.addEventListener('auth:changed', syncCheckoutUser);

    document.addEventListener('click', (event) => {
      const addButton = event.target.closest('[data-add-cart]');
      if (addButton) {
        const product = window.CoffeeStoreProducts?.get(addButton.dataset.productId);
        const options = product?.customization || {};
        const form = addButton.closest('[data-customization-form]');
        const customization = form
          ? Object.fromEntries(Array.from(new FormData(form).entries()).filter(([, value]) => value))
          : {
              size: options.sizes?.includes('Medium') ? 'Medium' : options.sizes?.[0],
              milk: options.milkOptions?.includes('Regular Milk') ? 'Regular Milk' : options.milkOptions?.[0],
              sugar: options.sugarLevels?.includes('Normal') ? 'Normal' : options.sugarLevels?.[0],
              ice: options.iceLevels?.includes('Normal Ice') ? 'Normal Ice' : options.iceLevels?.[0]
            };
        add(product, 1, customization);
      }

      const removeButton = event.target.closest('[data-cart-remove]');
      if (removeButton) remove(removeButton.dataset.cartRemove);

      const increaseButton = event.target.closest('[data-cart-increase]');
      if (increaseButton) {
        const item = getItems().find((cartItem) => cartItem.id === increaseButton.dataset.cartIncrease);
        updateQuantity(increaseButton.dataset.cartIncrease, (item?.quantity || 1) + 1);
      }

      const decreaseButton = event.target.closest('[data-cart-decrease]');
      if (decreaseButton) {
        const item = getItems().find((cartItem) => cartItem.id === decreaseButton.dataset.cartDecrease);
        if ((item?.quantity || 1) <= 1) remove(decreaseButton.dataset.cartDecrease);
        else updateQuantity(decreaseButton.dataset.cartDecrease, item.quantity - 1);
      }

      if (event.target.closest('[data-close-checkout]')) closeCheckout();
      if (event.target.closest('#confirmOrderButton')) submitOrder();
    });

    document.addEventListener('change', (event) => {
      if (event.target.matches('input[name="paymentMethod"]')) selectPaymentMethod(event.target.value);
    });

    qs('#checkoutModal')?.addEventListener('click', (event) => {
      if (event.target.id === 'checkoutModal') closeCheckout();
    });

    qs('#checkoutForm')?.addEventListener('submit', (event) => {
      event.preventDefault();
      reviewCheckout(event.currentTarget);
    });
  };

  document.addEventListener('DOMContentLoaded', initCart);

  window.CoffeeCart = {
    add,
    remove,
    updateQuantity,
    clear,
    getItems,
    getTotal,
    openCart,
    closeCart,
    renderCart
  };
})();
