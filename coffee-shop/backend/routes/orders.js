const express = require('express');
const { body } = require('express-validator');
const validate = require('../middleware/validate');
const { protect, authorize } = require('../middleware/auth');
const { CUSTOMIZATION_OPTIONS } = require('../config/productOptions');
const { PAYMENT_METHODS } = require('../config/payment');
const {
  createOrder,
  previewOrder,
  getOrders,
  getOrderById,
  updateOrderStatus
} = require('../controllers/orderController');

const router = express.Router();

router.use(protect);

const orderDetailsValidation = () => [
  body('products').isArray({ min: 1 }).withMessage('At least one product is required'),
  body('products.*.product').isMongoId().withMessage('Valid product id is required'),
  body('products.*.quantity').isInt({ min: 1 }).withMessage('Quantity must be at least 1'),
  body('products.*.customization.size').optional().isIn(CUSTOMIZATION_OPTIONS.sizes).withMessage('Invalid size option'),
  body('products.*.customization.milk').optional().isIn(CUSTOMIZATION_OPTIONS.milkOptions).withMessage('Invalid milk option'),
  body('products.*.customization.sugar').optional().isIn(CUSTOMIZATION_OPTIONS.sugarLevels).withMessage('Invalid sugar level'),
  body('products.*.customization.ice').optional().isIn(CUSTOMIZATION_OPTIONS.iceLevels).withMessage('Invalid ice level'),
  body('customerName').trim().isLength({ min: 2, max: 80 }).withMessage('Customer name is required'),
  body('customerEmail')
    .trim()
    .isEmail()
    .withMessage('Valid customer email is required')
    .custom((value, { req }) => value.toLowerCase() === String(req.user.email).toLowerCase())
    .withMessage('Customer email must match the signed-in account'),
  body('contactPhone').trim().matches(/^[+]?[\d\s()-]{7,20}$/).withMessage('Valid phone number is required'),
  body('shippingAddress.street').trim().isLength({ min: 5, max: 160 }).withMessage('Street address is required'),
  body('shippingAddress.city').trim().isLength({ min: 2, max: 80 }).withMessage('City is required'),
  body('shippingAddress.state').trim().isLength({ min: 2, max: 80 }).withMessage('State is required'),
  body('shippingAddress.zip').trim().matches(/^\d{6}$/).withMessage('Valid 6 digit PIN code is required'),
  body('shippingAddress.country').optional().trim().isLength({ min: 2, max: 80 }).withMessage('Invalid country')
];

router.post('/preview', orderDetailsValidation(), validate, previewOrder);

router.post(
  '/',
  [
    ...orderDetailsValidation(),
    body('paymentMethod').isIn(PAYMENT_METHODS).withMessage('Select a valid payment method'),
    body('paymentConfirmed').optional().isBoolean().withMessage('Invalid payment confirmation'),
    body('transactionId').optional().trim().isLength({ max: 100 }).withMessage('Reference ID is too long')
  ],
  validate,
  createOrder
);

router.get('/', getOrders);
router.get('/:id', getOrderById);
router.put(
  '/:id/status',
  authorize('admin'),
  [body('status').isIn(['pending', 'paid', 'preparing', 'shipped', 'delivered', 'cancelled']).withMessage('Invalid order status')],
  validate,
  updateOrderStatus
);

module.exports = router;
