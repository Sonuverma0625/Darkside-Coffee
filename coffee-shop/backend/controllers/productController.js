const Product = require('../models/Product');
const { getDepartmentForCategory } = require('../config/productOptions');

const normalizeList = (value) => {
  if (value === undefined || value === null || value === '') return undefined;
  if (Array.isArray(value)) return value.flatMap(normalizeList).filter(Boolean);

  if (typeof value === 'string') {
    try {
      const parsed = JSON.parse(value);
      if (Array.isArray(parsed)) return parsed.map((item) => String(item).trim()).filter(Boolean);
    } catch (error) {
      return value.split(',').map((item) => item.trim()).filter(Boolean);
    }
  }

  return [String(value).trim()].filter(Boolean);
};

const normalizeBoolean = (value) => value === true || value === 'true' || value === 'on' || value === '1';

const buildProductPayload = (body, file) => {
  const payload = { ...body };
  const image = file ? `/uploads/${file.filename}` : payload.image || payload.imageUrl || '';
  const images = normalizeList(payload.images) || [];
  const ingredients = normalizeList(payload.ingredients);

  if (image) {
    payload.image = image;
  }

  if (images.length || image) {
    payload.images = Array.from(new Set([image, ...images].filter(Boolean)));
  }

  if (ingredients) {
    payload.ingredients = ingredients;
  }

  if (payload.category && !payload.department) {
    payload.department = getDepartmentForCategory(payload.category);
  }

  ['featured', 'popularBadge', 'bestsellerBadge', 'newArrivalBadge'].forEach((field) => {
    if (payload[field] !== undefined) {
      payload[field] = normalizeBoolean(payload[field]);
    }
  });

  const customization = {};
  const customizationFields = {
    sizes: 'sizes',
    milkOptions: 'milkOptions',
    sugarLevels: 'sugarLevels',
    iceLevels: 'iceLevels'
  };

  Object.entries(customizationFields).forEach(([bodyField, customizationField]) => {
    const list = normalizeList(payload[bodyField]);
    if (list) {
      customization[customizationField] = list;
    }
    delete payload[bodyField];
  });

  if (Object.keys(customization).length > 0) {
    payload.customization = customization;
  }

  delete payload.imageUrl;

  return payload;
};

const buildProductQuery = (queryString) => {
  const query = { isActive: true };
  const { search, category, department, availability, minPrice, maxPrice, badge } = queryString;

  if (search) {
    query.$or = [
      { title: { $regex: search, $options: 'i' } },
      { description: { $regex: search, $options: 'i' } },
      { category: { $regex: search, $options: 'i' } }
    ];
  }

  if (category && category !== 'all') {
    query.category = category;
  }

  if (department && department !== 'all') {
    query.department = department;
  }

  if (availability && availability !== 'all') {
    query.availability = availability;
  }

  if (minPrice || maxPrice) {
    query.price = {};
    if (minPrice) query.price.$gte = Number(minPrice);
    if (maxPrice) query.price.$lte = Number(maxPrice);
  }

  if (badge === 'popular') query.popularBadge = true;
  if (badge === 'bestseller') query.bestsellerBadge = true;
  if (badge === 'new') query.newArrivalBadge = true;

  return query;
};

const getProducts = async (req, res, next) => {
  try {
    const page = Math.max(Number(req.query.page) || 1, 1);
    const limit = Math.min(Math.max(Number(req.query.limit) || 12, 1), 100);
    const skip = (page - 1) * limit;
    const query = buildProductQuery(req.query);
    const sort = req.query.sort || '-featured -createdAt';

    const [products, total] = await Promise.all([
      Product.find(query).sort(sort).skip(skip).limit(limit),
      Product.countDocuments(query)
    ]);

    res.json({
      success: true,
      count: products.length,
      total,
      page,
      pages: Math.ceil(total / limit),
      products
    });
  } catch (error) {
    next(error);
  }
};

const getProduct = async (req, res, next) => {
  try {
    const product = await Product.findOne({ _id: req.params.id, isActive: true });

    if (!product) {
      return res.status(404).json({ success: false, message: 'Product not found' });
    }

    res.json({ success: true, product });
  } catch (error) {
    next(error);
  }
};

const createProduct = async (req, res, next) => {
  try {
    const product = await Product.create(buildProductPayload(req.body, req.file));

    res.status(201).json({ success: true, product });
  } catch (error) {
    next(error);
  }
};

const updateProduct = async (req, res, next) => {
  try {
    const updates = buildProductPayload(req.body, req.file);

    const product = await Product.findByIdAndUpdate(req.params.id, updates, {
      new: true,
      runValidators: true
    });

    if (!product) {
      return res.status(404).json({ success: false, message: 'Product not found' });
    }

    res.json({ success: true, product });
  } catch (error) {
    next(error);
  }
};

const deleteProduct = async (req, res, next) => {
  try {
    const product = await Product.findByIdAndDelete(req.params.id);

    if (!product) {
      return res.status(404).json({ success: false, message: 'Product not found' });
    }

    res.json({ success: true, message: 'Product deleted successfully' });
  } catch (error) {
    next(error);
  }
};

const getProductOptions = async (req, res) => {
  const {
    COFFEE_CATEGORIES,
    NON_COFFEE_CATEGORIES,
    BAKERY_CATEGORIES,
    SNACK_CATEGORIES,
    PRODUCT_DEPARTMENTS,
    PRODUCT_CATEGORIES,
    AVAILABILITY_STATUSES,
    CUSTOMIZATION_OPTIONS
  } = require('../config/productOptions');

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
};

module.exports = {
  getProducts,
  getProduct,
  createProduct,
  updateProduct,
  deleteProduct,
  getProductOptions
};
