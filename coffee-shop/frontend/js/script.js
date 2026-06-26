(function appModule() {
  const qs = (selector, scope = document) => scope.querySelector(selector);
  const qsa = (selector, scope = document) => Array.from(scope.querySelectorAll(selector));
  const productStore = new Map();
  let revealObserver;

  // Product catalog metadata and safe rendering helpers.
  const categoryGroups = {
    Coffee: ['Espresso', 'Americano', 'Cappuccino', 'Latte', 'Mocha', 'Flat White', 'Macchiato', 'Affogato', 'Cold Brew', 'Nitro Cold Brew', 'Iced Coffee', 'Iced Latte', 'Iced Mocha', 'Frappuccino', 'Vanilla Latte', 'Caramel Latte', 'Hazelnut Latte', 'Pumpkin Spice Latte', 'Irish Coffee', 'Turkish Coffee', 'Black Coffee', 'Filter Coffee', 'South Indian Filter Coffee', 'Instant Coffee', 'Chocolate Coffee', 'Honey Coffee', 'Coconut Coffee', 'Cinnamon Coffee', 'Mint Coffee', 'Signature House Blend', 'Cortado', 'Ristretto', 'Doppio', 'Lungo', 'Cafe au Lait', 'Piccolo Latte', 'Spanish Latte', 'Vietnamese Iced Coffee', 'Cafe Bombon', 'Espresso Tonic'],
    'Non-Coffee Drinks': ['Hot Chocolate', 'Green Tea', 'Black Tea', 'Lemon Tea', 'Masala Tea', 'Matcha Latte', 'Milkshake', 'Smoothies', 'Fresh Juice'],
    Bakery: ['Croissant', 'Chocolate Croissant', 'Garlic Bread', 'Brownie', 'Muffin', 'Donut', 'Red Velvet Cake', 'Cheesecake', 'Chocolate Cake', 'Tiramisu', 'Cookies'],
    Snacks: ['French Fries', 'Veg Sandwich', 'Grilled Sandwich', 'Club Sandwich', 'Veg Burger', 'Chicken Burger', 'Pizza', 'Pasta', 'Wrap', 'Nachos']
  };

  const customizationDefaults = {
    sizes: ['Small', 'Medium', 'Large'],
    milkOptions: ['Regular Milk', 'Almond Milk', 'Oat Milk', 'Soy Milk'],
    sugarLevels: ['No Sugar', 'Less Sugar', 'Normal', 'Extra Sweet'],
    iceLevels: ['No Ice', 'Less Ice', 'Normal Ice', 'Extra Ice']
  };

  const allCategories = Object.values(categoryGroups).flat();
  const departmentForCategory = (category) =>
    Object.entries(categoryGroups).find(([, categories]) => categories.includes(category))?.[0] || 'Coffee';

  const fallbackProducts = allCategories.map((category, index) => {
    const department = departmentForCategory(category);
    const basePrice = department === 'Coffee' ? 149 : department === 'Non-Coffee Drinks' ? 129 : department === 'Bakery' ? 99 : 159;
    const price = basePrice + (index % 8) * 20;

    return {
      id: `sample-${category.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`,
      title: category,
      description: `${category} crafted with cafe-quality ingredients and a balanced, premium finish.`,
      department,
      category,
      price,
      discountPrice: index % 4 === 0 ? Number((price * 0.9).toFixed(2)) : undefined,
      image: 'images/header-bg.jpg',
      images: ['images/header-bg.jpg', 'images/header-bg.jpg'],
      stock: 35 + (index % 10) * 8,
      sku: `${department.split(/\s+/).map((part) => part[0]).join('')}-${String(index + 1).padStart(3, '0')}`,
      rating: Number((4.2 + (index % 8) * 0.1).toFixed(1)),
      numReviews: 12 + index * 3,
      availability: index % 17 === 0 ? 'Seasonal' : 'Available',
      ingredients: department === 'Coffee' ? ['Arabica coffee', 'Filtered water', 'Milk'] : ['Fresh ingredients', 'House recipe'],
      calories: department === 'Coffee' ? 80 + (index % 10) * 22 : department === 'Bakery' ? 220 + (index % 7) * 35 : 160 + (index % 8) * 35,
      preparationTime: department === 'Snacks' ? 12 + (index % 5) : 5 + (index % 4),
      popularBadge: index % 5 === 0,
      bestsellerBadge: index % 7 === 0,
      newArrivalBadge: index % 6 === 0,
      featured: index < 6 || index % 13 === 0,
      customization: department === 'Coffee' || department === 'Non-Coffee Drinks'
        ? customizationDefaults
        : { sizes: customizationDefaults.sizes, milkOptions: [], sugarLevels: [], iceLevels: [] }
    };
  });

  const fallbackReviews = [
    { user: { name: 'Aarav' }, rating: 5, comment: 'Rich espresso and a smooth checkout experience.' },
    { user: { name: 'Maya' }, rating: 5, comment: 'The cold brew is clean, chocolatey, and never harsh.' },
    { user: { name: 'Dev' }, rating: 4, comment: 'Great menu detail and fast ordering from mobile.' }
  ];

  const escapeHtml = (value = '') =>
    String(value).replace(/[&<>"']/g, (char) => ({
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#39;'
    }[char]));

  const formatCurrency = (amount) =>
    new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(Number(amount) || 0);

  const imageUrl = (image) => {
    if (!image) return 'images/header-bg.jpg';
    if (/^(https?:)?\/\//.test(image) || image.startsWith('data:')) return image;
    if (image.startsWith('/uploads')) return `${window.CoffeeAPI?.origin || ''}${image}`;
    return image;
  };

  const productId = (product) => product._id || product.id;
  const productPrice = (product) => Number(product.discountPrice || product.price || 0);

  const priceMarkup = (product) => `
    <span>
      <span class="price">${formatCurrency(productPrice(product))}</span>
      ${product.discountPrice ? `<span class="old-price">${formatCurrency(product.price)}</span>` : ''}
    </span>
  `;

  const badgeMarkup = (product) => {
    const badges = [];
    if (product.popularBadge) badges.push('<span class="badge sage">Popular</span>');
    if (product.bestsellerBadge) badges.push('<span class="badge gold">Bestseller</span>');
    if (product.newArrivalBadge) badges.push('<span class="badge">New</span>');
    if (product.availability && product.availability !== 'Available') badges.push(`<span class="badge">${escapeHtml(product.availability)}</span>`);
    return badges.length ? `<div class="badge-row">${badges.join('')}</div>` : '';
  };

  const optionsMarkup = (name, label, options = [], selected) => {
    if (!options.length) return '';
    return `
      <label>${label}
        <select name="${name}">
          ${options.map((option) => `<option value="${escapeHtml(option)}" ${option === selected ? 'selected' : ''}>${escapeHtml(option)}</option>`).join('')}
        </select>
      </label>
    `;
  };

  const rememberProducts = (products) => {
    products.forEach((product) => productStore.set(productId(product), product));
  };

  const getProducts = async () => {
    try {
      const data = await window.CoffeeAPI.request('/products?limit=100');
      const products = data.products || [];
      rememberProducts(products);
      return products.length ? products : fallbackProducts;
    } catch (error) {
      rememberProducts(fallbackProducts);
      return fallbackProducts;
    }
  };

  const productCard = (product) => {
    const id = productId(product);
    return `
      <article class="product-card reveal">
        <img src="${imageUrl(product.image)}" alt="${escapeHtml(product.title)}" loading="lazy" decoding="async" />
        <div class="product-body">
          <span class="category-pill">${escapeHtml(product.category)}</span>
          ${badgeMarkup(product)}
          <h3>${escapeHtml(product.title)}</h3>
          <p>${escapeHtml(product.description)}</p>
          <div class="product-specs">
            <span>SKU: ${escapeHtml(product.sku || 'Sample')}</span>
            <span>${Number(product.calories || 0)} cal · ${Number(product.preparationTime || 0)} min · ${Number(product.stock || 0)} in stock</span>
          </div>
          <div class="product-meta">
            ${priceMarkup(product)}
            <span class="rating">${Number(product.rating || 0).toFixed(1)} / 5</span>
          </div>
          <div class="product-actions">
            <button class="primary-button" type="button" data-add-cart data-product-id="${id}">Add to cart</button>
            <button class="text-button" type="button" data-product-detail="${id}">Details</button>
          </div>
        </div>
      </article>
    `;
  };

  const renderProducts = (container, products) => {
    if (!container) return;
    rememberProducts(products);
    container.innerHTML = products.map(productCard).join('');
    revealNow(container);
  };

  const showProductDetails = (product) => {
    const modal = qs('#productModal');
    const content = qs('#productModalContent');
    if (!modal || !content || !product) return;

    const id = productId(product);
    const customization = product.customization || customizationDefaults;
    content.innerHTML = `
      <button class="modal-close" type="button" data-close-product aria-label="Close details">&times;</button>
      <div class="product-modal-grid">
        <img src="${imageUrl(product.image)}" alt="${escapeHtml(product.title)}" loading="lazy" decoding="async" />
        <div>
          <span class="category-pill">${escapeHtml(product.category)}</span>
          ${badgeMarkup(product)}
          <h2>${escapeHtml(product.title)}</h2>
          <p>${escapeHtml(product.description)}</p>
          <div class="product-specs">
            <span>SKU: ${escapeHtml(product.sku || 'Sample')}</span>
            <span>Ingredients: ${escapeHtml((product.ingredients || []).join(', ') || 'House ingredients')}</span>
            <span>${Number(product.calories || 0)} calories · ${Number(product.preparationTime || 0)} min prep · ${escapeHtml(product.availability || 'Available')}</span>
          </div>
          <div class="product-meta">
            ${priceMarkup(product)}
            <span class="rating">${Number(product.rating || 0).toFixed(1)} / 5</span>
          </div>
          <p>Stock: ${Number(product.stock || 0)}</p>
          <form class="customization-form" data-customization-form>
            <div class="customization-grid">
              ${optionsMarkup('size', 'Size', customization.sizes || customizationDefaults.sizes, 'Medium')}
              ${optionsMarkup('milk', 'Milk', customization.milkOptions || [], 'Regular Milk')}
              ${optionsMarkup('sugar', 'Sugar', customization.sugarLevels || [], 'Normal')}
              ${optionsMarkup('ice', 'Ice', customization.iceLevels || [], 'Normal Ice')}
            </div>
            <button class="primary-button" type="button" data-add-cart data-product-id="${id}">Add to cart</button>
          </form>
        </div>
      </div>
    `;
    modal.classList.add('open');
    modal.setAttribute('aria-hidden', 'false');
    document.body.classList.add('no-scroll');
  };

  const closeProductDetails = () => {
    qs('#productModal')?.classList.remove('open');
    qs('#productModal')?.setAttribute('aria-hidden', 'true');
    document.body.classList.remove('no-scroll');
  };

  // Shared navigation, loading, and scroll motion.
  const initLoader = () => {
    window.setTimeout(() => qs('#pageLoader')?.classList.add('hidden'), 80);
  };

  const initNav = () => {
    const toggle = qs('.menu-toggle');
    const nav = qs('#primaryNav');
    const header = qs('.site-header');

    toggle?.addEventListener('click', () => {
      const open = nav?.classList.toggle('open');
      toggle.setAttribute('aria-expanded', String(Boolean(open)));
    });

    nav?.addEventListener('click', (event) => {
      if (!event.target.closest('a') || !nav.classList.contains('open')) return;
      nav.classList.remove('open');
      toggle?.setAttribute('aria-expanded', 'false');
    });

    const homeSectionLinks = document.body.dataset.page === 'home'
      ? [
          { element: qs('.hero-home'), href: 'index.html' },
          { element: qs('#featuredProducts')?.closest('section'), href: 'menu.html' },
          { element: qs('.contrast-section'), href: 'about.html' },
          { element: qs('.blog-grid')?.closest('section'), href: 'blog.html' }
        ].filter((item) => item.element)
      : [];

    let scrollFrame;
    const updateHeader = () => {
      header?.classList.toggle('scrolled', window.scrollY > 18);

      const scrollRange = Math.max(document.documentElement.scrollHeight - window.innerHeight, 1);
      header?.style.setProperty('--scroll-progress', String(Math.min(window.scrollY / scrollRange, 1)));

      if (homeSectionLinks.length && nav) {
        const marker = window.scrollY + window.innerHeight * 0.42;
        const current = homeSectionLinks.reduce(
          (active, item) => (item.element.offsetTop <= marker ? item : active),
          homeSectionLinks[0]
        );

        qsa('a', nav).forEach((link) => link.classList.toggle('active', link.getAttribute('href') === current.href));
      }

      scrollFrame = undefined;
    };

    window.addEventListener(
      'scroll',
      () => {
        if (scrollFrame) return;
        scrollFrame = window.requestAnimationFrame(updateHeader);
      },
      { passive: true }
    );
    window.addEventListener('resize', updateHeader, { passive: true });
    updateHeader();
  };

  const revealNow = (scope = document) => {
    const elements = scope.matches?.('.reveal') ? [scope] : qsa('.reveal', scope);
    elements.forEach((element, index) => {
      if (element.matches('.product-card, .blog-card, .value-card, .review-card, .stat-card, .metric-grid article, .feature-list article, .timeline article')) {
        element.classList.add('reveal-zoom');
      }

      if (!element.matches('.reveal-left, .reveal-right, .reveal-zoom') && element.parentElement?.matches('.split-layout, .review-layout, .contact-layout')) {
        const siblingIndex = Array.from(element.parentElement.children).indexOf(element);
        element.classList.add(siblingIndex % 2 === 0 ? 'reveal-left' : 'reveal-right');
      }

      element.style.setProperty('--reveal-delay', `${Math.min(index * 55, 180)}ms`);
      if (revealObserver) {
        revealObserver.observe(element);
      } else {
        element.classList.add('visible');
      }
    });
  };

  const prepareMotionElements = () => {
    const selectors = [
      '.split-layout > *',
      '.review-layout > *',
      '.contact-layout > *',
      '.metric-grid article',
      '.feature-list article',
      '.values-grid > *',
      '.timeline article',
      '.blog-card',
      '.review-card',
      '.stat-card',
      '.section-heading',
      '.menu-toolbar',
      '.newsletter-inner',
      '.footer-grid'
    ].join(', ');

    qsa(selectors).forEach((element) => element.classList.add('reveal'));
  };

  const initReveal = () => {
    if (!('IntersectionObserver' in window)) {
      revealNow();
      return;
    }

    revealObserver = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add('visible');
            revealObserver.unobserve(entry.target);
          }
        });
      },
      { rootMargin: '0px 0px -7% 0px', threshold: 0.1 }
    );

    revealNow();
  };

  const initHeroMotion = () => {
    const hero = qs('.hero-home');
    const product = qs('.hero-product', hero || document);
    if (!hero || !product || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

    let motionFrame;
    let lastProgress = -1;
    const updateMotion = () => {
      const heroHeight = hero.offsetHeight || 1;
      const progress = Math.min(Math.max(window.scrollY / (heroHeight * 0.82), 0), 1);
      if (Math.abs(progress - lastProgress) < 0.002) {
        motionFrame = undefined;
        return;
      }
      const cupTravel = Math.min(heroHeight * 0.64, 420);

      hero.style.setProperty('--cup-y', Math.round(progress * cupTravel) + 'px');
      hero.style.setProperty('--cup-rotate', (progress * 4.5).toFixed(2) + 'deg');
      hero.style.setProperty('--cup-scale', (1 - progress * 0.13).toFixed(3));
      hero.style.setProperty('--copy-y', Math.round(progress * -58) + 'px');
      hero.style.setProperty('--copy-opacity', Math.max(1 - progress * 1.28, 0).toFixed(3));
      lastProgress = progress;
      motionFrame = undefined;
    };

    const requestMotionUpdate = () => {
      if (motionFrame) return;
      motionFrame = window.requestAnimationFrame(updateMotion);
    };

    window.addEventListener('scroll', requestMotionUpdate, { passive: true });
    window.addEventListener('resize', requestMotionUpdate, { passive: true });
    updateMotion();
  };

  // Product browsing, filtering, and detail interactions.
  const initProductSections = async () => {
    const featuredContainer = qs('#featuredProducts');
    const menuContainer = qs('#menuProducts');
    if (!featuredContainer && !menuContainer) return;

    const products = await getProducts();

    if (featuredContainer) {
      const featured = products.filter((product) => product.featured).slice(0, 3);
      renderProducts(featuredContainer, featured.length ? featured : products.slice(0, 3));
    }

    if (menuContainer) {
      const search = qs('#productSearch');
      const department = qs('#departmentFilter');
      const category = qs('#categoryFilter');
      const badge = qs('#badgeFilter');
      const price = qs('#priceFilter');
      const priceValue = qs('#priceValue');
      const empty = qs('#menuEmpty');

      const populateCategories = () => {
        if (!category) return;
        const selectedDepartment = department?.value || 'all';
        const categories = selectedDepartment === 'all'
          ? allCategories
          : categoryGroups[selectedDepartment] || [];
        category.innerHTML = '<option value="all">All</option>' + categories.map((item) => `<option value="${escapeHtml(item)}">${escapeHtml(item)}</option>`).join('');
      };

      const applyFilters = () => {
        const term = (search?.value || '').toLowerCase();
        const selectedDepartment = department?.value || 'all';
        const selectedCategory = category?.value || 'all';
        const selectedBadge = badge?.value || 'all';
        const maxPrice = Number(price?.value || 350);
        if (priceValue) priceValue.textContent = formatCurrency(maxPrice);

        const filtered = products.filter((product) => {
          const matchesSearch = [product.title, product.description, product.category, product.department, product.sku]
            .join(' ')
            .toLowerCase()
            .includes(term);
          const matchesDepartment = selectedDepartment === 'all' || product.department === selectedDepartment;
          const matchesCategory = selectedCategory === 'all' || product.category === selectedCategory;
          const matchesPrice = productPrice(product) <= maxPrice;
          const matchesBadge =
            selectedBadge === 'all' ||
            (selectedBadge === 'popular' && product.popularBadge) ||
            (selectedBadge === 'bestseller' && product.bestsellerBadge) ||
            (selectedBadge === 'new' && product.newArrivalBadge);
          return matchesSearch && matchesDepartment && matchesCategory && matchesPrice && matchesBadge;
        });

        renderProducts(menuContainer, filtered);
        if (empty) empty.hidden = filtered.length !== 0;
      };

      department?.addEventListener('input', () => {
        populateCategories();
        applyFilters();
      });
      [search, category, badge, price].forEach((input) => input?.addEventListener('input', applyFilters));
      populateCategories();
      applyFilters();
    }
  };

  const initProductDetails = () => {
    document.addEventListener('click', (event) => {
      const detailsButton = event.target.closest('[data-product-detail]');
      if (detailsButton) {
        showProductDetails(productStore.get(detailsButton.dataset.productDetail));
      }

      if (event.target.closest('[data-close-product]') || event.target.id === 'productModal') {
        closeProductDetails();
      }
    });
  };

  // Reviews and customer-facing forms.
  const renderReviews = (reviews) => {
    const list = qs('#reviewList');
    if (!list) return;

    list.innerHTML = reviews
      .map(
        (review) => `
          <article class="review-card reveal">
            <strong>${escapeHtml(review.user?.name || 'Customer')}</strong>
            <span class="rating">${Number(review.rating || 0).toFixed(1)} / 5</span>
            <p>${escapeHtml(review.comment)}</p>
          </article>
        `
      )
      .join('');
    revealNow(list);
  };

  const loadReviews = async () => {
    if (!qs('#reviewList')) return;

    try {
      const [reviewData, averageData] = await Promise.all([
        window.CoffeeAPI.request('/review'),
        window.CoffeeAPI.request('/review/average')
      ]);
      qs('#averageRating').textContent = Number(averageData.averageRating || 0).toFixed(1);
      qs('#totalReviews').textContent = averageData.totalReviews || 0;
      renderReviews(reviewData.reviews || []);
    } catch (error) {
      qs('#averageRating').textContent = '4.7';
      qs('#totalReviews').textContent = fallbackReviews.length;
      renderReviews(fallbackReviews);
    }
  };

  const initReviewForm = () => {
    qs('#reviewForm')?.addEventListener('submit', async (event) => {
      event.preventDefault();
      const form = event.currentTarget;
      const message = qs('#reviewMessage');

      if (!window.CoffeeAuth?.getUser()) {
        window.CoffeeAPI.setMessage(message, 'Login before adding a review.', true);
        window.CoffeeAuth?.openAuth('login');
        return;
      }

      const formData = new FormData(form);

      try {
        window.CoffeeAPI.setMessage(message, 'Saving review...');
        await window.CoffeeAPI.request('/review', {
          method: 'POST',
          body: JSON.stringify({
            rating: Number(formData.get('rating')),
            comment: formData.get('comment')
          })
        });
        form.reset();
        window.CoffeeAPI.setMessage(message, 'Review added.');
        loadReviews();
      } catch (error) {
        window.CoffeeAPI.setMessage(message, error.message, true);
      }
    });
  };

  const initContactForm = () => {
    qs('#contactForm')?.addEventListener('submit', async (event) => {
      event.preventDefault();
      const form = event.currentTarget;
      const message = qs('#contactMessage');
      const payload = Object.fromEntries(new FormData(form).entries());

      try {
        window.CoffeeAPI.setMessage(message, 'Sending message...');
        const data = await window.CoffeeAPI.request('/contact', {
          method: 'POST',
          body: JSON.stringify(payload)
        });
        window.CoffeeAPI.setMessage(message, data.message || 'Message sent.');
        form.reset();
      } catch (error) {
        window.CoffeeAPI.setMessage(message, error.message, true);
      }
    });
  };

  const initNewsletter = () => {
    qsa('.newsletter-form').forEach((form) => {
      form.addEventListener('submit', async (event) => {
        event.preventDefault();
        const message = qs('[data-newsletter-message]', form);
        const email = new FormData(form).get('email');

        try {
          window.CoffeeAPI.setMessage(message, 'Subscribing...');
          const data = await window.CoffeeAPI.request('/newsletter', {
            method: 'POST',
            body: JSON.stringify({ email })
          });
          window.CoffeeAPI.setMessage(message, data.message || 'Subscribed.');
          form.reset();
        } catch (error) {
          window.CoffeeAPI.setMessage(message, error.message, true);
        }
      });
    });
  };

  // Admin dashboard rendering and actions.
  const formatDate = (value) => new Date(value).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });

  const renderAdminStats = (stats = {}) => {
    const container = qs('#adminStats');
    if (!container) return;
    const cards = [
      ['Revenue', formatCurrency(stats.revenue)],
      ['Orders', stats.orders || 0],
      ['Products', stats.products || 0],
      ['Users', stats.users || 0],
      ['Reviews', stats.reviews || 0],
      ['Subscribers', stats.subscribers || 0]
    ];
    container.innerHTML = cards.map(([label, value]) => `<article class="stat-card"><span>${label}</span><strong>${value}</strong></article>`).join('');
  };

  const renderAdminProducts = (products = []) => {
    const tbody = qs('#adminProducts');
    if (!tbody) return;
    rememberProducts(products);
    tbody.innerHTML = products
      .map(
        (product) => `
          <tr>
            <td><strong>${escapeHtml(product.title)}</strong><br /><small>${escapeHtml(product.sku || '')} · ${escapeHtml(product.category)}</small></td>
            <td>${priceMarkup(product)}</td>
            <td>${Number(product.stock || 0)}<br /><small>${escapeHtml(product.availability || 'Available')}</small></td>
            <td>
              <button class="text-button" type="button" data-admin-edit="${productId(product)}">Edit</button>
              <button class="text-button" type="button" data-admin-delete="${productId(product)}">Delete</button>
            </td>
          </tr>
        `
      )
      .join('');
  };

  const renderAdminOrders = (orders = []) => {
    const tbody = qs('#adminOrders');
    if (!tbody) return;
    tbody.innerHTML = orders
      .map(
        (order) => `
          <tr>
            <td><strong>${escapeHtml(order.user?.name || 'Customer')}</strong><br /><small>${formatDate(order.createdAt)}</small></td>
            <td>${formatCurrency(order.totalPrice)}</td>
            <td><strong>${escapeHtml(order.paymentMethod || 'COD')}</strong><br /><small>${escapeHtml(order.paymentStatus || 'Pending')}</small></td>
            <td>
              <select data-order-status="${order._id}">
                ${['pending', 'paid', 'preparing', 'shipped', 'delivered', 'cancelled']
                  .map((status) => `<option value="${status}" ${order.status === status ? 'selected' : ''}>${status}</option>`)
                  .join('')}
              </select>
            </td>
          </tr>
        `
      )
      .join('');
  };

  const renderAdminUsers = (users = []) => {
    const tbody = qs('#adminUsers');
    if (!tbody) return;
    tbody.innerHTML = users
      .map(
        (user) => `
          <tr>
            <td><strong>${escapeHtml(user.name)}</strong><br /><small>${escapeHtml(user.email)}</small></td>
            <td>
              <select data-user-role="${user._id}">
                <option value="customer" ${user.role === 'customer' ? 'selected' : ''}>customer</option>
                <option value="admin" ${user.role === 'admin' ? 'selected' : ''}>admin</option>
              </select>
            </td>
            <td><button class="text-button" type="button" data-user-delete="${user._id}">Delete</button></td>
          </tr>
        `
      )
      .join('');
  };

  const loadAdmin = async () => {
    const message = qs('#adminMessage');
    try {
      const [dashboardData, productData, orderData, userData] = await Promise.all([
        window.CoffeeAPI.request('/admin/dashboard'),
        window.CoffeeAPI.request('/products?limit=100'),
        window.CoffeeAPI.request('/orders'),
        window.CoffeeAPI.request('/admin/users')
      ]);

      renderAdminStats(dashboardData.stats);
      renderAdminProducts(productData.products || []);
      renderAdminOrders(orderData.orders || []);
      renderAdminUsers(userData.users || []);
      window.CoffeeAPI.setMessage(message, '');
    } catch (error) {
      window.CoffeeAPI.setMessage(message, error.message, true);
    }
  };

  const resetProductForm = () => {
    const form = qs('#productForm');
    if (!form) return;
    form.reset();
    form.elements.id.value = '';
    qs('#productFormTitle').textContent = 'Add product';
  };

  const populateAdminCategories = () => {
    const select = qs('#productForm select[name="category"]');
    if (!select || select.options.length > 0) return;
    select.innerHTML = Object.entries(categoryGroups)
      .map(([group, categories]) => `<optgroup label="${escapeHtml(group)}">${categories.map((category) => `<option value="${escapeHtml(category)}">${escapeHtml(category)}</option>`).join('')}</optgroup>`)
      .join('');
  };

  const fillProductForm = (product) => {
    const form = qs('#productForm');
    if (!form || !product) return;
    form.elements.id.value = productId(product);
    form.elements.title.value = product.title || '';
    form.elements.description.value = product.description || '';
    form.elements.price.value = product.price || 0;
    form.elements.discountPrice.value = product.discountPrice || '';
    form.elements.sku.value = product.sku || '';
    form.elements.category.value = product.category || 'Espresso';
    form.elements.stock.value = product.stock || 0;
    form.elements.availability.value = product.availability || 'Available';
    form.elements.ingredients.value = (product.ingredients || []).join(', ');
    form.elements.calories.value = product.calories || 0;
    form.elements.preparationTime.value = product.preparationTime || 5;
    form.elements.imageUrl.value = product.image || '';
    form.elements.images.value = (product.images || []).join(', ');
    form.elements.featured.checked = Boolean(product.featured);
    form.elements.popularBadge.checked = Boolean(product.popularBadge);
    form.elements.bestsellerBadge.checked = Boolean(product.bestsellerBadge);
    form.elements.newArrivalBadge.checked = Boolean(product.newArrivalBadge);
    qs('#productFormTitle').textContent = 'Edit product';
    form.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  const initAdmin = () => {
    if (document.body.dataset.page !== 'admin') return;

    populateAdminCategories();
    const guard = qs('#adminGuard');
    const dashboard = qs('#adminDashboard');
    const showDashboard = () => {
      const user = window.CoffeeAuth?.getUser();
      const isAdmin = user?.role === 'admin';
      if (guard) guard.hidden = isAdmin;
      if (dashboard) dashboard.hidden = !isAdmin;
      if (isAdmin) loadAdmin();
    };

    showDashboard();
    window.addEventListener('auth:changed', showDashboard);

    qs('#productForm')?.addEventListener('submit', async (event) => {
      event.preventDefault();
      const form = event.currentTarget;
      const message = qs('#adminMessage');
      const formData = new FormData(form);
      const id = formData.get('id');
      const imageFile = form.elements.image.files[0];
      formData.set('featured', form.elements.featured.checked ? 'true' : 'false');
      formData.set('popularBadge', form.elements.popularBadge.checked ? 'true' : 'false');
      formData.set('bestsellerBadge', form.elements.bestsellerBadge.checked ? 'true' : 'false');
      formData.set('newArrivalBadge', form.elements.newArrivalBadge.checked ? 'true' : 'false');

      ['discountPrice', 'calories', 'preparationTime'].forEach((field) => {
        if (!formData.get(field)) formData.delete(field);
      });

      if (!imageFile) {
        formData.delete('image');
      }

      if (!formData.get('imageUrl') && !imageFile) {
        formData.set('imageUrl', 'images/header-bg.jpg');
      }

      try {
        window.CoffeeAPI.setMessage(message, 'Saving product...');
        await window.CoffeeAPI.request(id ? `/products/${id}` : '/products', {
          method: id ? 'PUT' : 'POST',
          body: formData
        });
        window.CoffeeAPI.setMessage(message, 'Product saved.');
        resetProductForm();
        loadAdmin();
      } catch (error) {
        window.CoffeeAPI.setMessage(message, error.message, true);
      }
    });

    qs('.reset-product-form')?.addEventListener('click', resetProductForm);
    qs('[data-refresh-admin]')?.addEventListener('click', loadAdmin);

    qs('#adminProducts')?.addEventListener('click', async (event) => {
      const edit = event.target.closest('[data-admin-edit]');
      const remove = event.target.closest('[data-admin-delete]');

      if (edit) {
        fillProductForm(productStore.get(edit.dataset.adminEdit));
      }

      if (remove && window.confirm('Delete this product?')) {
        try {
          await window.CoffeeAPI.request(`/products/${remove.dataset.adminDelete}`, { method: 'DELETE' });
          loadAdmin();
        } catch (error) {
          window.CoffeeAPI.setMessage(qs('#adminMessage'), error.message, true);
        }
      }
    });

    qs('#adminOrders')?.addEventListener('change', async (event) => {
      const select = event.target.closest('[data-order-status]');
      if (!select) return;

      try {
        await window.CoffeeAPI.request(`/orders/${select.dataset.orderStatus}/status`, {
          method: 'PUT',
          body: JSON.stringify({ status: select.value })
        });
      } catch (error) {
        window.CoffeeAPI.setMessage(qs('#adminMessage'), error.message, true);
      }
    });

    qs('#adminUsers')?.addEventListener('change', async (event) => {
      const select = event.target.closest('[data-user-role]');
      if (!select) return;

      try {
        await window.CoffeeAPI.request(`/admin/users/${select.dataset.userRole}/role`, {
          method: 'PUT',
          body: JSON.stringify({ role: select.value })
        });
      } catch (error) {
        window.CoffeeAPI.setMessage(qs('#adminMessage'), error.message, true);
      }
    });

    qs('#adminUsers')?.addEventListener('click', async (event) => {
      const remove = event.target.closest('[data-user-delete]');
      if (!remove || !window.confirm('Delete this user?')) return;

      try {
        await window.CoffeeAPI.request(`/admin/users/${remove.dataset.userDelete}`, { method: 'DELETE' });
        loadAdmin();
      } catch (error) {
        window.CoffeeAPI.setMessage(qs('#adminMessage'), error.message, true);
      }
    });
  };

  const init = () => {
    initLoader();
    initNav();
    prepareMotionElements();
    initReveal();
    initHeroMotion();
    initProductSections();
    initProductDetails();
    initReviewForm();
    loadReviews();
    initContactForm();
    initNewsletter();
    initAdmin();
  };

  document.addEventListener('DOMContentLoaded', init);

  window.CoffeeStoreProducts = productStore;
  window.CoffeeUtils = { imageUrl, formatCurrency };
})();
