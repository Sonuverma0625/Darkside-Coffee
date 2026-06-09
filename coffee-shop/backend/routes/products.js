const express = require('express');
const { body } = require('express-validator');
const validate = require('../middleware/validate');
const upload = require('../middleware/upload');
const { protect, authorize } = require('../middleware/auth');
const {
  PRODUCT_CATEGORIES,
  PRODUCT_DEPARTMENTS,
  AVAILABILITY_STATUSES
} = require('../config/productOptions');
const {
  getProducts,
  getProduct,
  createProduct,
  updateProduct,
  deleteProduct,
  getProductOptions
} = require('../controllers/productController');

const router = express.Router();

const productValidation = (isUpdate = false) => {
  const maybe = (chain) => (isUpdate ? chain.optional() : chain);

  return [
    maybe(body('title')).trim().isLength({ min: 2 }).withMessage('Title must be at least 2 characters'),
    maybe(body('description')).trim().isLength({ min: 10 }).withMessage('Description must be at least 10 characters'),
    maybe(body('price')).isFloat({ min: 0 }).withMessage('Price must be zero or higher'),
    body('discountPrice').optional({ checkFalsy: true }).isFloat({ min: 0 }).withMessage('Discount price must be zero or higher'),
    maybe(body('category')).isIn(PRODUCT_CATEGORIES).withMessage('Invalid category'),
    body('department').optional({ checkFalsy: true }).isIn(PRODUCT_DEPARTMENTS).withMessage('Invalid department'),
    maybe(body('sku')).trim().isLength({ min: 2, max: 60 }).withMessage('SKU must be between 2 and 60 characters'),
    body('stock').optional().isInt({ min: 0 }).withMessage('Stock must be zero or higher'),
    body('availability').optional({ checkFalsy: true }).isIn(AVAILABILITY_STATUSES).withMessage('Invalid availability'),
    body('calories').optional({ checkFalsy: true }).isInt({ min: 0 }).withMessage('Calories must be zero or higher'),
    body('preparationTime').optional({ checkFalsy: true }).isInt({ min: 0 }).withMessage('Preparation time must be zero or higher'),
    body('featured').optional().isBoolean().withMessage('Featured must be true or false'),
    body('popularBadge').optional().isBoolean().withMessage('Popular badge must be true or false'),
    body('bestsellerBadge').optional().isBoolean().withMessage('Bestseller badge must be true or false'),
    body('newArrivalBadge').optional().isBoolean().withMessage('New arrival badge must be true or false')
  ];
};

router.get('/', getProducts);
router.get('/meta/options', getProductOptions);
router.get('/:id', getProduct);
router.post('/', protect, authorize('admin'), upload.single('image'), productValidation(), validate, createProduct);
router.put('/:id', protect, authorize('admin'), upload.single('image'), productValidation(true), validate, updateProduct);
router.delete('/:id', protect, authorize('admin'), deleteProduct);

module.exports = router;
