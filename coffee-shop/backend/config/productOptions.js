const COFFEE_CATEGORIES = [
  'Espresso',
  'Americano',
  'Cappuccino',
  'Latte',
  'Mocha',
  'Flat White',
  'Macchiato',
  'Affogato',
  'Cold Brew',
  'Nitro Cold Brew',
  'Iced Coffee',
  'Iced Latte',
  'Iced Mocha',
  'Frappuccino',
  'Vanilla Latte',
  'Caramel Latte',
  'Hazelnut Latte',
  'Pumpkin Spice Latte',
  'Irish Coffee',
  'Turkish Coffee',
  'Black Coffee',
  'Filter Coffee',
  'South Indian Filter Coffee',
  'Instant Coffee',
  'Chocolate Coffee',
  'Honey Coffee',
  'Coconut Coffee',
  'Cinnamon Coffee',
  'Mint Coffee',
  'Signature House Blend',
  'Cortado',
  'Ristretto',
  'Doppio',
  'Lungo',
  'Cafe au Lait',
  'Piccolo Latte',
  'Spanish Latte',
  'Vietnamese Iced Coffee',
  'Cafe Bombon',
  'Espresso Tonic'
];

const NON_COFFEE_CATEGORIES = [
  'Hot Chocolate',
  'Green Tea',
  'Black Tea',
  'Lemon Tea',
  'Masala Tea',
  'Matcha Latte',
  'Milkshake',
  'Smoothies',
  'Fresh Juice'
];

const BAKERY_CATEGORIES = [
  'Croissant',
  'Chocolate Croissant',
  'Garlic Bread',
  'Brownie',
  'Muffin',
  'Donut',
  'Red Velvet Cake',
  'Cheesecake',
  'Chocolate Cake',
  'Tiramisu',
  'Cookies'
];

const SNACK_CATEGORIES = [
  'French Fries',
  'Veg Sandwich',
  'Grilled Sandwich',
  'Club Sandwich',
  'Veg Burger',
  'Chicken Burger',
  'Pizza',
  'Pasta',
  'Wrap',
  'Nachos'
];

const PRODUCT_DEPARTMENTS = ['Coffee', 'Non-Coffee Drinks', 'Bakery', 'Snacks'];
const PRODUCT_CATEGORIES = [
  ...COFFEE_CATEGORIES,
  ...NON_COFFEE_CATEGORIES,
  ...BAKERY_CATEGORIES,
  ...SNACK_CATEGORIES
];

const AVAILABILITY_STATUSES = ['Available', 'Out of Stock', 'Seasonal', 'Coming Soon'];

const CUSTOMIZATION_OPTIONS = {
  sizes: ['Small', 'Medium', 'Large'],
  milkOptions: ['Regular Milk', 'Almond Milk', 'Oat Milk', 'Soy Milk'],
  sugarLevels: ['No Sugar', 'Less Sugar', 'Normal', 'Extra Sweet'],
  iceLevels: ['No Ice', 'Less Ice', 'Normal Ice', 'Extra Ice']
};

const categoryDepartmentMap = new Map([
  ...COFFEE_CATEGORIES.map((category) => [category, 'Coffee']),
  ...NON_COFFEE_CATEGORIES.map((category) => [category, 'Non-Coffee Drinks']),
  ...BAKERY_CATEGORIES.map((category) => [category, 'Bakery']),
  ...SNACK_CATEGORIES.map((category) => [category, 'Snacks'])
]);

const getDepartmentForCategory = (category) => categoryDepartmentMap.get(category) || 'Coffee';

module.exports = {
  COFFEE_CATEGORIES,
  NON_COFFEE_CATEGORIES,
  BAKERY_CATEGORIES,
  SNACK_CATEGORIES,
  PRODUCT_DEPARTMENTS,
  PRODUCT_CATEGORIES,
  AVAILABILITY_STATUSES,
  CUSTOMIZATION_OPTIONS,
  getDepartmentForCategory
};
