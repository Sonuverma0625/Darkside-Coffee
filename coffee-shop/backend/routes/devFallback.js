const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const express = require('express');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const upload = require('../middleware/upload');
const { PAYMENT_METHODS, createUpiPayment } = require('../config/payment');
const {
  COFFEE_CATEGORIES,
  NON_COFFEE_CATEGORIES,
  BAKERY_CATEGORIES,
  SNACK_CATEGORIES,
  PRODUCT_DEPARTMENTS,
  PRODUCT_CATEGORIES,
  AVAILABILITY_STATUSES,
  CUSTOMIZATION_OPTIONS,
  getDepartmentForCategory
} = require('../config/productOptions');

const dataDir = path.join(__dirname, '..', 'data');
const dataFile = path.join(dataDir, 'dev-db.json');

const now = () => new Date().toISOString();
const newId = () => crypto.randomBytes(12).toString('hex');
const seededId = (index) => String(index + 1).padStart(24, '0');
const slug = (value) => value.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
const signToken = (id) => jwt.sign({ id }, process.env.JWT_SECRET || 'mysecretkey', { expiresIn: process.env.JWT_EXPIRES_IN || '7d' });

const safeUser = (user) => ({
  id: user._id,
  _id: user._id,
  name: user.name,
  email: user.email,
  role: user.role,
  phone: user.phone || '',
  address: user.address || {},
  createdAt: user.createdAt
});

const parseList = (value) => {
  if (!value) return [];
  if (Array.isArray(value)) return value.flatMap(parseList).filter(Boolean);
  return String(value).split(',').map((item) => item.trim()).filter(Boolean);
};

const bool = (value) => value === true || value === 'true' || value === 'on' || value === '1';

const buildProducts = () => {
  const categories = [...COFFEE_CATEGORIES, ...NON_COFFEE_CATEGORIES, ...BAKERY_CATEGORIES, ...SNACK_CATEGORIES];

  return categories.map((category, index) => {
    const department = getDepartmentForCategory(category);
    const basePrice = department === 'Coffee' ? 149 : department === 'Non-Coffee Drinks' ? 129 : department === 'Bakery' ? 99 : 159;
    const price = basePrice + (index % 8) * 20;
    const image = 'images/header-bg.jpg';

    return {
      _id: seededId(index),
      title: category,
      description: `${category} crafted with cafe-quality ingredients and a balanced premium finish.`,
      category,
      department,
      price,
      discountPrice: index % 4 === 0 ? Number((price * 0.9).toFixed(2)) : undefined,
      image,
      images: [image],
      stock: 35 + (index % 10) * 8,
      sku: `${department.split(/\s+/).map((part) => part[0]).join('')}-${slug(category).slice(0, 18).toUpperCase()}-${String(index + 1).padStart(3, '0')}`,
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
      isActive: true,
      customization: department === 'Coffee' || department === 'Non-Coffee Drinks'
        ? CUSTOMIZATION_OPTIONS
        : { sizes: CUSTOMIZATION_OPTIONS.sizes, milkOptions: [], sugarLevels: [], iceLevels: [] },
      createdAt: now(),
      updatedAt: now()
    };
  });
};

const loadDb = () => {
  fs.mkdirSync(dataDir, { recursive: true });
  if (fs.existsSync(dataFile)) {
    return JSON.parse(fs.readFileSync(dataFile, 'utf8'));
  }

  const db = {
    users: [],
    products: buildProducts(),
    orders: [],
    contacts: [],
    reviews: [],
    newsletter: []
  };
  saveDb(db);
  return db;
};

const saveDb = (db) => {
  fs.mkdirSync(dataDir, { recursive: true });
  fs.writeFileSync(dataFile, JSON.stringify(db, null, 2));
};

const ensureAdmin = (db) => {
  const email = (process.env.ADMIN_EMAIL || 'admin@coffee.test').toLowerCase();
  if (db.users.some((user) => user.email === email)) return;

  db.users.push({
    _id: newId(),
    name: process.env.ADMIN_NAME || 'Coffee Admin',
    email,
    password: bcrypt.hashSync(process.env.ADMIN_PASSWORD || 'Admin@12345', 12),
    role: 'admin',
    phone: '',
    address: {},
    createdAt: now(),
    updatedAt: now()
  });
  saveDb(db);
};

const checkoutError = (message, statusCode = 422) => {
  const error = new Error(message);
  error.statusCode = statusCode;
  return error;
};

const buildFallbackOrderPreview = (db, body, user) => {
  const items = body.products || [];
  const customerName = String(body.customerName || '').trim();
  const customerEmail = String(body.customerEmail || '').trim().toLowerCase();
  const contactPhone = String(body.contactPhone || '').trim();
  const address = body.shippingAddress || {};

  if (!Array.isArray(items) || items.length === 0) throw checkoutError('Order products are required');
  if (customerName.length < 2) throw checkoutError('Customer name is required');
  if (customerEmail !== String(user.email).toLowerCase()) throw checkoutError('Customer email must match the signed-in account');
  if (!/^[+]?[\d\s()-]{7,20}$/.test(contactPhone)) throw checkoutError('Valid phone number is required');
  if (String(address.street || '').trim().length < 5) throw checkoutError('Street address is required');
  if (String(address.city || '').trim().length < 2) throw checkoutError('City is required');
  if (String(address.state || '').trim().length < 2) throw checkoutError('State is required');
  if (!/^\d{6}$/.test(String(address.zip || '').trim())) throw checkoutError('Valid 6 digit PIN code is required');

  const products = items.map((item) => {
    const product = db.products.find((entry) => entry._id === item.product && entry.isActive !== false);
    const quantity = Number(item.quantity);
    if (!product) throw checkoutError('One or more products are unavailable');
    if (!Number.isInteger(quantity) || quantity < 1) throw checkoutError('Quantity must be at least 1');
    if (product.stock < quantity) throw checkoutError(`${product.title} does not have enough stock`);
    return {
      product: product._id,
      title: product.title,
      quantity,
      price: product.discountPrice || product.price,
      image: product.image,
      customization: item.customization || {}
    };
  });

  return {
    customer: { name: customerName, email: user.email, phone: contactPhone },
    shippingAddress: {
      street: String(address.street || '').trim(),
      city: String(address.city || '').trim(),
      state: String(address.state || '').trim(),
      zip: String(address.zip || '').trim(),
      country: String(address.country || 'India').trim()
    },
    products,
    totalPrice: Number(products.reduce((sum, item) => sum + item.price * item.quantity, 0).toFixed(2)),
    currency: 'INR'
  };
};

const createDevFallbackRouter = () => {
  const router = express.Router();
  const db = loadDb();
  const catalogProducts = buildProducts();
  const existingCatalogKeys = new Set(
    (db.products || []).map((product) => `${product.department}:${product.category}`)
  );
  const missingProducts = catalogProducts.filter(
    (product) => !existingCatalogKeys.has(`${product.department}:${product.category}`)
  );

  if (!db.products?.length) {
    db.products = catalogProducts;
  } else if (missingProducts.length) {
    db.products.push(...missingProducts.map((product) => ({ ...product, _id: newId() })));
  }
  ensureAdmin(db);
  if (missingProducts.length) saveDb(db);

  const protect = (req, res, next) => {
    try {
      const header = req.headers.authorization || '';
      const token = header.startsWith('Bearer ') ? header.split(' ')[1] : null;
      if (!token) return res.status(401).json({ success: false, message: 'Authentication required' });

      const decoded = jwt.verify(token, process.env.JWT_SECRET || 'mysecretkey');
      const user = db.users.find((item) => item._id === decoded.id);
      if (!user) return res.status(401).json({ success: false, message: 'User no longer exists' });

      req.user = user;
      return next();
    } catch (error) {
      return res.status(401).json({ success: false, message: 'Invalid or expired token' });
    }
  };

  const adminOnly = (req, res, next) => {
    if (req.user?.role !== 'admin') return res.status(403).json({ success: false, message: 'Admin access required' });
    return next();
  };

  router.get('/health', (req, res) => {
    res.json({ success: true, message: 'Coffee Shop API is running in development fallback mode', database: 'file-fallback' });
  });

  router.post('/auth/register', async (req, res) => {
    const { name, email, password } = req.body;
    if (!name || !email || !password || password.length < 8) {
      return res.status(422).json({ success: false, message: 'Name, valid email, and 8 character password are required' });
    }

    const normalizedEmail = email.toLowerCase();
    if (db.users.some((user) => user.email === normalizedEmail)) {
      return res.status(409).json({ success: false, message: 'email already exists' });
    }

    const user = {
      _id: newId(),
      name,
      email: normalizedEmail,
      password: await bcrypt.hash(password, 12),
      role: 'customer',
      phone: '',
      address: {},
      createdAt: now(),
      updatedAt: now()
    };
    db.users.push(user);
    saveDb(db);
    res.status(201).json({ success: true, token: signToken(user._id), user: safeUser(user) });
  });

  router.post('/auth/login', async (req, res) => {
    const user = db.users.find((item) => item.email === String(req.body.email || '').toLowerCase());
    if (!user || !(await bcrypt.compare(req.body.password || '', user.password))) {
      return res.status(401).json({ success: false, message: 'Invalid email or password' });
    }
    res.json({ success: true, token: signToken(user._id), user: safeUser(user) });
  });

  router.post('/auth/logout', protect, (req, res) => res.json({ success: true, message: 'Logged out successfully' }));
  router.get('/auth/me', protect, (req, res) => res.json({ success: true, user: safeUser(req.user) }));
  router.put('/auth/profile', protect, (req, res) => {
    Object.assign(req.user, {
      name: req.body.name || req.user.name,
      phone: req.body.phone ?? req.user.phone,
      address: req.body.address || req.user.address,
      updatedAt: now()
    });
    saveDb(db);
    res.json({ success: true, user: safeUser(req.user) });
  });
  router.put('/auth/change-password', protect, async (req, res) => {
    if (!(await bcrypt.compare(req.body.currentPassword || '', req.user.password))) {
      return res.status(401).json({ success: false, message: 'Current password is incorrect' });
    }
    req.user.password = await bcrypt.hash(req.body.newPassword || '', 12);
    req.user.updatedAt = now();
    saveDb(db);
    res.json({ success: true, token: signToken(req.user._id), user: safeUser(req.user) });
  });
  router.post('/auth/forgot-password', (req, res) => res.json({ success: true, message: 'Password reset token generated', resetToken: newId() }));
  router.post('/auth/reset-password/:token', (req, res) => res.status(400).json({ success: false, message: 'Reset tokens are not persisted in fallback mode' }));

  router.get('/products/meta/options', (req, res) => {
    res.json({
      success: true,
      options: {
        departments: PRODUCT_DEPARTMENTS,
        categories: PRODUCT_CATEGORIES,
        categoryGroups: {
          Coffee: COFFEE_CATEGORIES,
          'Non-Coffee Drinks': NON_COFFEE_CATEGORIES,
          Bakery: BAKERY_CATEGORIES,
          Snacks: SNACK_CATEGORIES
        },
        availability: AVAILABILITY_STATUSES,
        customization: CUSTOMIZATION_OPTIONS
      }
    });
  });

  router.get('/products', (req, res) => {
    const page = Math.max(Number(req.query.page) || 1, 1);
    const limit = Math.min(Math.max(Number(req.query.limit) || 12, 1), 100);
    const search = String(req.query.search || '').toLowerCase();
    const products = db.products.filter((product) => {
      const text = [product.title, product.description, product.category, product.department, product.sku].join(' ').toLowerCase();
      return product.isActive !== false &&
        (!search || text.includes(search)) &&
        (!req.query.department || req.query.department === 'all' || product.department === req.query.department) &&
        (!req.query.category || req.query.category === 'all' || product.category === req.query.category) &&
        (!req.query.badge || req.query.badge === 'all' ||
          (req.query.badge === 'popular' && product.popularBadge) ||
          (req.query.badge === 'bestseller' && product.bestsellerBadge) ||
          (req.query.badge === 'new' && product.newArrivalBadge));
    });
    const start = (page - 1) * limit;
    res.json({ success: true, count: products.slice(start, start + limit).length, total: products.length, page, pages: Math.ceil(products.length / limit), products: products.slice(start, start + limit) });
  });

  router.get('/products/:id', (req, res) => {
    const product = db.products.find((item) => item._id === req.params.id && item.isActive !== false);
    if (!product) return res.status(404).json({ success: false, message: 'Product not found' });
    res.json({ success: true, product });
  });

  router.post('/products', protect, adminOnly, upload.single('image'), (req, res) => {
    const image = req.file ? `/uploads/${req.file.filename}` : req.body.imageUrl || req.body.image || 'images/header-bg.jpg';
    const product = {
      _id: newId(),
      title: req.body.title,
      description: req.body.description,
      category: req.body.category,
      department: getDepartmentForCategory(req.body.category),
      price: Number(req.body.price),
      discountPrice: req.body.discountPrice ? Number(req.body.discountPrice) : undefined,
      image,
      images: [image, ...parseList(req.body.images)],
      stock: Number(req.body.stock || 0),
      sku: String(req.body.sku || `SKU-${newId()}`).toUpperCase(),
      rating: 0,
      numReviews: 0,
      availability: req.body.availability || 'Available',
      ingredients: parseList(req.body.ingredients),
      calories: Number(req.body.calories || 0),
      preparationTime: Number(req.body.preparationTime || 5),
      popularBadge: bool(req.body.popularBadge),
      bestsellerBadge: bool(req.body.bestsellerBadge),
      newArrivalBadge: bool(req.body.newArrivalBadge),
      featured: bool(req.body.featured),
      isActive: true,
      customization: CUSTOMIZATION_OPTIONS,
      createdAt: now(),
      updatedAt: now()
    };
    db.products.unshift(product);
    saveDb(db);
    res.status(201).json({ success: true, product });
  });

  router.put('/products/:id', protect, adminOnly, upload.single('image'), (req, res) => {
    const product = db.products.find((item) => item._id === req.params.id);
    if (!product) return res.status(404).json({ success: false, message: 'Product not found' });
    const image = req.file ? `/uploads/${req.file.filename}` : req.body.imageUrl || product.image;
    Object.assign(product, {
      title: req.body.title || product.title,
      description: req.body.description || product.description,
      category: req.body.category || product.category,
      department: req.body.category ? getDepartmentForCategory(req.body.category) : product.department,
      price: req.body.price ? Number(req.body.price) : product.price,
      discountPrice: req.body.discountPrice ? Number(req.body.discountPrice) : undefined,
      image,
      images: [image, ...parseList(req.body.images)],
      stock: req.body.stock ? Number(req.body.stock) : product.stock,
      sku: req.body.sku ? String(req.body.sku).toUpperCase() : product.sku,
      availability: req.body.availability || product.availability,
      ingredients: parseList(req.body.ingredients).length ? parseList(req.body.ingredients) : product.ingredients,
      calories: req.body.calories ? Number(req.body.calories) : product.calories,
      preparationTime: req.body.preparationTime ? Number(req.body.preparationTime) : product.preparationTime,
      popularBadge: bool(req.body.popularBadge),
      bestsellerBadge: bool(req.body.bestsellerBadge),
      newArrivalBadge: bool(req.body.newArrivalBadge),
      featured: bool(req.body.featured),
      updatedAt: now()
    });
    saveDb(db);
    res.json({ success: true, product });
  });

  router.delete('/products/:id', protect, adminOnly, (req, res) => {
    db.products = db.products.filter((product) => product._id !== req.params.id);
    saveDb(db);
    res.json({ success: true, message: 'Product deleted successfully' });
  });

  router.post('/orders/preview', protect, async (req, res) => {
    try {
      const preview = buildFallbackOrderPreview(db, req.body, req.user);
      const payment = await createUpiPayment(preview.totalPrice);
      res.json({ success: true, preview, payment });
    } catch (error) {
      res.status(error.statusCode || 500).json({ success: false, message: error.message });
    }
  });

  router.post('/orders', protect, (req, res) => {
    try {
      const preview = buildFallbackOrderPreview(db, req.body, req.user);
      const paymentMethod = req.body.paymentMethod;
      const isDigitalPayment = paymentMethod === 'UPI' || paymentMethod === 'QR';

      if (!PAYMENT_METHODS.includes(paymentMethod)) throw checkoutError('Select a valid payment method');
      if (isDigitalPayment && req.body.paymentConfirmed !== true) {
        throw checkoutError('Confirm the UPI or QR payment before placing the order');
      }

      const transactionId = String(req.body.transactionId || '').trim();
      if (transactionId.length > 100) throw checkoutError('Reference ID is too long');

      const order = {
        _id: newId(),
        user: req.user._id,
        ...preview,
        status: 'pending',
        paymentMethod,
        paymentStatus: isDigitalPayment ? 'Verification Pending' : 'Pending',
        transactionId: isDigitalPayment ? transactionId : '',
        paymentConfirmedAt: isDigitalPayment ? now() : undefined,
        contactPhone: preview.customer.phone,
        createdAt: now(),
        updatedAt: now()
      };

      preview.products.forEach((item) => {
        const product = db.products.find((entry) => entry._id === item.product);
        product.stock -= item.quantity;
      });
      db.orders.unshift(order);
      saveDb(db);
      res.status(201).json({ success: true, order });
    } catch (error) {
      res.status(error.statusCode || 500).json({ success: false, message: error.message });
    }
  });

  router.get('/orders', protect, (req, res) => {
    const orders = (req.user.role === 'admin' ? db.orders : db.orders.filter((order) => order.user === req.user._id))
      .map((order) => ({ ...order, user: safeUser(db.users.find((user) => user._id === order.user) || req.user) }));
    res.json({ success: true, count: orders.length, orders });
  });
  router.get('/orders/:id', protect, (req, res) => {
    const order = db.orders.find((item) => item._id === req.params.id && (req.user.role === 'admin' || item.user === req.user._id));
    if (!order) return res.status(404).json({ success: false, message: 'Order not found' });
    res.json({ success: true, order });
  });
  router.put('/orders/:id/status', protect, adminOnly, (req, res) => {
    const order = db.orders.find((item) => item._id === req.params.id);
    if (!order) return res.status(404).json({ success: false, message: 'Order not found' });
    order.status = req.body.status || order.status;
    order.updatedAt = now();
    saveDb(db);
    res.json({ success: true, order });
  });

  router.post('/contact', (req, res) => {
    const contact = { _id: newId(), ...req.body, status: 'new', createdAt: now(), updatedAt: now() };
    db.contacts.unshift(contact);
    saveDb(db);
    res.status(201).json({ success: true, message: 'Thank you. We will get back to you soon.', contact });
  });
  router.get('/contact', protect, adminOnly, (req, res) => res.json({ success: true, count: db.contacts.length, contacts: db.contacts }));
  router.put('/contact/:id/status', protect, adminOnly, (req, res) => {
    const contact = db.contacts.find((item) => item._id === req.params.id);
    if (!contact) return res.status(404).json({ success: false, message: 'Contact message not found' });
    contact.status = req.body.status || contact.status;
    saveDb(db);
    res.json({ success: true, contact });
  });

  router.get('/review', (req, res) => {
    const reviews = db.reviews.map((review) => ({ ...review, user: safeUser(db.users.find((user) => user._id === review.user) || { name: 'Customer' }) }));
    res.json({ success: true, count: reviews.length, reviews });
  });
  router.get('/review/average', (req, res) => {
    const totalReviews = db.reviews.length;
    const averageRating = totalReviews ? db.reviews.reduce((sum, review) => sum + Number(review.rating), 0) / totalReviews : 0;
    res.json({ success: true, averageRating: Number(averageRating.toFixed(1)), totalReviews });
  });
  router.post('/review', protect, (req, res) => {
    const review = { _id: newId(), user: req.user._id, product: req.body.product, rating: Number(req.body.rating), comment: req.body.comment, createdAt: now(), updatedAt: now() };
    db.reviews.unshift(review);
    saveDb(db);
    res.status(201).json({ success: true, review: { ...review, user: safeUser(req.user) } });
  });

  router.post('/newsletter', (req, res) => {
    const email = String(req.body.email || '').toLowerCase();
    if (!email) return res.status(422).json({ success: false, message: 'Valid email is required' });
    if (!db.newsletter.some((item) => item.email === email)) db.newsletter.unshift({ _id: newId(), email, createdAt: now() });
    saveDb(db);
    res.status(201).json({ success: true, message: 'You are subscribed to the newsletter' });
  });
  router.get('/newsletter', protect, adminOnly, (req, res) => res.json({ success: true, count: db.newsletter.length, subscribers: db.newsletter }));
  router.delete('/newsletter/:id', protect, adminOnly, (req, res) => {
    db.newsletter = db.newsletter.filter((item) => item._id !== req.params.id);
    saveDb(db);
    res.json({ success: true, message: 'Subscriber removed' });
  });

  router.get('/admin/dashboard', protect, adminOnly, (req, res) => {
    res.json({
      success: true,
      stats: {
        users: db.users.length,
        products: db.products.length,
        orders: db.orders.length,
        contacts: db.contacts.length,
        reviews: db.reviews.length,
        subscribers: db.newsletter.length,
        revenue: db.orders.reduce((sum, order) => sum + Number(order.totalPrice || 0), 0)
      },
      recentOrders: db.orders.slice(0, 5)
    });
  });
  router.get('/admin/users', protect, adminOnly, (req, res) => res.json({ success: true, count: db.users.length, users: db.users.map(safeUser) }));
  router.put('/admin/users/:id/role', protect, adminOnly, (req, res) => {
    const user = db.users.find((item) => item._id === req.params.id);
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });
    user.role = req.body.role;
    saveDb(db);
    res.json({ success: true, user: safeUser(user) });
  });
  router.delete('/admin/users/:id', protect, adminOnly, (req, res) => {
    if (req.params.id === req.user._id) return res.status(400).json({ success: false, message: 'You cannot delete your own admin account' });
    db.users = db.users.filter((user) => user._id !== req.params.id);
    saveDb(db);
    res.json({ success: true, message: 'User deleted' });
  });

  return router;
};

module.exports = createDevFallbackRouter;
