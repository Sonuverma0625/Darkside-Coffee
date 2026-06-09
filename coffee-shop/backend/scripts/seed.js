const dotenv = require('dotenv');
const connectDB = require('../config/db');
const User = require('../models/User');
const Product = require('../models/Product');
const {
  COFFEE_CATEGORIES,
  NON_COFFEE_CATEGORIES,
  BAKERY_CATEGORIES,
  SNACK_CATEGORIES,
  CUSTOMIZATION_OPTIONS,
  getDepartmentForCategory
} = require('../config/productOptions');

dotenv.config();

const slug = (value) =>
  value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');

const sku = (category, index) =>
  `${getDepartmentForCategory(category)
    .split(/\s+/)
    .map((part) => part[0])
    .join('')}-${slug(category).slice(0, 18).toUpperCase()}-${String(index + 1).padStart(3, '0')}`;

const coffeeIngredients = (name) => {
  const base = ['Arabica coffee', 'Filtered water'];
  if (/latte|cappuccino|flat white|macchiato|mocha|frappuccino|affogato/i.test(name)) base.push('Steamed milk');
  if (/mocha|chocolate/i.test(name)) base.push('Cocoa');
  if (/vanilla/i.test(name)) base.push('Vanilla syrup');
  if (/caramel/i.test(name)) base.push('Caramel syrup');
  if (/hazelnut/i.test(name)) base.push('Hazelnut syrup');
  if (/pumpkin/i.test(name)) base.push('Pumpkin spice');
  if (/honey/i.test(name)) base.push('Honey');
  if (/coconut/i.test(name)) base.push('Coconut milk');
  if (/cinnamon/i.test(name)) base.push('Cinnamon');
  if (/mint/i.test(name)) base.push('Mint');
  if (/irish/i.test(name)) base.push('Irish cream flavor');
  if (/affogato/i.test(name)) base.push('Vanilla ice cream');
  if (/iced|cold|nitro|frappuccino/i.test(name)) base.push('Ice');
  return Array.from(new Set(base));
};

const nonCoffeeIngredients = (name) => {
  if (/tea/i.test(name)) return ['Tea leaves', 'Filtered water', 'Natural flavor'];
  if (/chocolate/i.test(name)) return ['Cocoa', 'Milk', 'Cane sugar'];
  if (/matcha/i.test(name)) return ['Matcha', 'Milk', 'Cane sugar'];
  if (/milkshake/i.test(name)) return ['Milk', 'Ice cream', 'Natural flavor'];
  if (/smooth/i.test(name)) return ['Seasonal fruit', 'Yogurt', 'Honey'];
  if (/juice/i.test(name)) return ['Fresh fruit', 'Filtered water'];
  return ['Filtered water', 'Natural flavor'];
};

const bakeryIngredients = (name) => {
  if (/cake|tiramisu|cheesecake/i.test(name)) return ['Flour', 'Cream', 'Sugar', 'Butter'];
  if (/brownie|cookies/i.test(name)) return ['Cocoa', 'Flour', 'Butter', 'Sugar'];
  if (/croissant/i.test(name)) return ['Flour', 'Butter', 'Yeast'];
  if (/garlic/i.test(name)) return ['Bread', 'Garlic butter', 'Herbs'];
  return ['Flour', 'Butter', 'Sugar'];
};

const snackIngredients = (name) => {
  if (/burger/i.test(name)) return ['Bun', 'Patty', 'Lettuce', 'Sauce'];
  if (/sandwich/i.test(name)) return ['Bread', 'Vegetables', 'Cheese', 'Sauce'];
  if (/pizza/i.test(name)) return ['Pizza base', 'Cheese', 'Tomato sauce', 'Vegetables'];
  if (/pasta/i.test(name)) return ['Pasta', 'Sauce', 'Cheese', 'Herbs'];
  if (/fries/i.test(name)) return ['Potatoes', 'Salt', 'Seasoning'];
  if (/nachos/i.test(name)) return ['Corn chips', 'Cheese sauce', 'Salsa'];
  if (/wrap/i.test(name)) return ['Tortilla', 'Vegetables', 'Sauce'];
  return ['Fresh ingredients', 'House seasoning'];
};

const descriptionFor = (name, department) => {
  if (department === 'Coffee') {
    return `${name} prepared with our house roast, balanced for aroma, body, and a polished cafe finish.`;
  }
  if (department === 'Non-Coffee Drinks') {
    return `${name} crafted fresh with quality ingredients for a smooth, refreshing cafe drink.`;
  }
  if (department === 'Bakery') {
    return `${name} baked for a tender bite, rich flavor, and an easy pairing with coffee.`;
  }
  return `${name} made to order with a satisfying cafe-style flavor and generous texture.`;
};

const customizationFor = (department, name) => {
  if (department === 'Coffee' || /chocolate|matcha|milkshake|smooth/i.test(name)) {
    return CUSTOMIZATION_OPTIONS;
  }

  return {
    sizes: CUSTOMIZATION_OPTIONS.sizes,
    milkOptions: [],
    sugarLevels: [],
    iceLevels: []
  };
};

const priceFor = (department, index) => {
  const base = {
    Coffee: 4.25,
    'Non-Coffee Drinks': 3.75,
    Bakery: 3.5,
    Snacks: 4.75
  }[department];

  return Number((base + (index % 8) * 0.45).toFixed(2));
};

const buildProducts = () => {
  const allCategories = [
    ...COFFEE_CATEGORIES,
    ...NON_COFFEE_CATEGORIES,
    ...BAKERY_CATEGORIES,
    ...SNACK_CATEGORIES
  ];

  return allCategories.map((category, index) => {
    const department = getDepartmentForCategory(category);
    const price = priceFor(department, index);
    const hasDiscount = index % 4 === 0;
    const image = 'images/header-bg.jpg';

    return {
      title: category,
      description: descriptionFor(category, department),
      department,
      category,
      price,
      discountPrice: hasDiscount ? Number((price * 0.9).toFixed(2)) : undefined,
      image,
      images: [image, image, image],
      stock: 35 + (index % 10) * 8,
      sku: sku(category, index),
      rating: Number((4.2 + (index % 8) * 0.1).toFixed(1)),
      numReviews: 12 + index * 3,
      availability: index % 17 === 0 ? 'Seasonal' : 'Available',
      ingredients:
        department === 'Coffee'
          ? coffeeIngredients(category)
          : department === 'Non-Coffee Drinks'
            ? nonCoffeeIngredients(category)
            : department === 'Bakery'
              ? bakeryIngredients(category)
              : snackIngredients(category),
      calories: department === 'Coffee' ? 80 + (index % 10) * 22 : department === 'Non-Coffee Drinks' ? 110 + (index % 8) * 28 : department === 'Bakery' ? 220 + (index % 7) * 35 : 280 + (index % 8) * 45,
      preparationTime: department === 'Bakery' ? 4 : department === 'Snacks' ? 12 + (index % 5) : 5 + (index % 4),
      popularBadge: index % 5 === 0,
      bestsellerBadge: index % 7 === 0,
      newArrivalBadge: index % 6 === 0,
      featured: index < 6 || index % 13 === 0,
      customization: customizationFor(department, category)
    };
  });
};

const seed = async () => {
  await connectDB();

  const adminEmail = process.env.ADMIN_EMAIL || 'admin@coffee.test';
  const adminExists = await User.findOne({ email: adminEmail });

  if (!adminExists) {
    await User.create({
      name: process.env.ADMIN_NAME || 'Coffee Admin',
      email: adminEmail,
      password: process.env.ADMIN_PASSWORD || 'Admin@12345',
      role: 'admin'
    });
    console.log(`Admin user created: ${adminEmail}`);
  }

  const products = buildProducts();
  await Product.bulkWrite(
    products.map((product) => ({
      updateOne: {
        filter: { sku: product.sku },
        update: { $set: product },
        upsert: true
      }
    }))
  );
  console.log(`${products.length} products upserted`);

  process.exit(0);
};

seed().catch((error) => {
  if (['MONGODB_URI_MISSING', 'MONGODB_URI_INVALID'].includes(error.code)) {
    console.warn(`Skipping MongoDB seed: ${error.message}`);
    process.exit(0);
  }

  console.error(error);
  process.exit(1);
});
