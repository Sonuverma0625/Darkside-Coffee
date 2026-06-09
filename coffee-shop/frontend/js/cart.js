(function cartModule() {
  const CART_KEY = 'coffeeShopCart';
  const qs = (selector, scope = document) => scope.querySelector(selector);
  const qsa = (selector, scope = document) => Array.from(scope.querySelectorAll(selector));

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
    new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(Number(amount) || 0);

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
    saveItems(items);
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

  const remove = (id) => {
    saveItems(getItems().filter((item) => item.id !== id));
  };

  const updateQuantity = (id, quantity) => {
    const items = getItems()
      .map((item) => (item.id === id ? { ...item, quantity: Math.max(1, quantity) } : item))
      .filter((item) => item.quantity > 0);
    saveItems(items);
  };

  const clear = () => saveItems([]);

  const getTotal = () => getItems().reduce((sum, item) => sum + item.price * item.quantity, 0);
  const customizationText = (customization = {}) =>
    [customization.size, customization.milk, customization.sugar, customization.ice].filter(Boolean).join(' · ');

  const renderCart = () => {
    const items = getItems();
    const cartItems = qs('#cartItems');
    const cartTotal = qs('#cartTotal');
    const cartCount = qs('#cartCount');

    if (cartCount) {
      cartCount.textContent = items.reduce((sum, item) => sum + item.quantity, 0);
    }

    if (cartTotal) {
      cartTotal.textContent = formatCurrency(getTotal());
    }

    if (!cartItems) return;

    if (items.length === 0) {
      cartItems.innerHTML = '<p class="empty-state">Your cart is empty.</p>';
      return;
    }

    cartItems.innerHTML = items
      .map(
        (item) => `
          <article class="cart-item">
            <img src="${imageUrl(item.image)}" alt="${item.title}" />
            <div>
              <h3>${item.title}</h3>
              <p>${formatCurrency(item.price)}</p>
              <small>${customizationText(item.customization)}</small>
              <div class="quantity-row">
                <button type="button" data-cart-decrease="${item.id}">-</button>
                <span>${item.quantity}</span>
                <button type="button" data-cart-increase="${item.id}">+</button>
                <button type="button" class="text-button" data-cart-remove="${item.id}">Remove</button>
              </div>
            </div>
          </article>
        `
      )
      .join('');
  };

  const openCart = () => {
    qs('#cartDrawer')?.classList.add('open');
    qs('#cartBackdrop')?.classList.add('open');
    qs('#cartDrawer')?.setAttribute('aria-hidden', 'false');
    document.body.classList.add('no-scroll');
  };

  const closeCart = () => {
    qs('#cartDrawer')?.classList.remove('open');
    qs('#cartBackdrop')?.classList.remove('open');
    qs('#cartDrawer')?.setAttribute('aria-hidden', 'true');
    document.body.classList.remove('no-scroll');
  };

  const checkout = async (form) => {
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

    const formData = new FormData(form);

    try {
      window.CoffeeAPI?.setMessage(message, 'Placing your order...');
      await window.CoffeeAPI.request('/orders', {
        method: 'POST',
        body: JSON.stringify({
          products: items.map((item) => ({
            product: item.productId || item.id,
            quantity: item.quantity,
            customization: item.customization || {}
          })),
          shippingAddress: {
            street: formData.get('street'),
            city: formData.get('city'),
            country: 'India'
          },
          contactPhone: formData.get('phone') || '',
          paymentMethod: 'COD'
        })
      });
      clear();
      form.reset();
      window.CoffeeAPI?.setMessage(message, 'Order placed successfully.');
    } catch (error) {
      window.CoffeeAPI?.setMessage(message, error.message, true);
    }
  };

  const initCart = () => {
    renderCart();

    qsa('.js-cart-button').forEach((button) => button.addEventListener('click', openCart));
    qsa('.js-cart-close').forEach((button) => button.addEventListener('click', closeCart));
    qs('#cartBackdrop')?.addEventListener('click', closeCart);

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
      if (removeButton) {
        remove(removeButton.dataset.cartRemove);
      }

      const increaseButton = event.target.closest('[data-cart-increase]');
      if (increaseButton) {
        const item = getItems().find((cartItem) => cartItem.id === increaseButton.dataset.cartIncrease);
        updateQuantity(increaseButton.dataset.cartIncrease, (item?.quantity || 1) + 1);
      }

      const decreaseButton = event.target.closest('[data-cart-decrease]');
      if (decreaseButton) {
        const item = getItems().find((cartItem) => cartItem.id === decreaseButton.dataset.cartDecrease);
        if ((item?.quantity || 1) <= 1) {
          remove(decreaseButton.dataset.cartDecrease);
        } else {
          updateQuantity(decreaseButton.dataset.cartDecrease, item.quantity - 1);
        }
      }
    });

    qs('#checkoutForm')?.addEventListener('submit', (event) => {
      event.preventDefault();
      checkout(event.currentTarget);
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
