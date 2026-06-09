const express = require('express');
const { body } = require('express-validator');
const validate = require('../middleware/validate');
const { protect, authorize } = require('../middleware/auth');
const { CUSTOMIZATION_OPTIONS } = require('../config/productOptions');
const {
  createOrder,
  getOrders,
  getOrderById,
  updateOrderStatus
} = require('../controllers/orderController');

const router = express.Router();

router.use(protect);

router.post(
  '/',
  [
    body('products').isArray({ min: 1 }).withMessage('At least one product is required'),
    body('products.*.product').isMongoId().withMessage('Valid product id is required'),
    body('products.*.quantity').isInt({ min: 1 }).withMessage('Quantity must be at least 1'),
    body('products.*.customization.size').optional().isIn(CUSTOMIZATION_OPTIONS.sizes).withMessage('Invalid size option'),
    body('products.*.customization.milk').optional().isIn(CUSTOMIZATION_OPTIONS.milkOptions).withMessage('Invalid milk option'),
    body('products.*.customization.sugar').optional().isIn(CUSTOMIZATION_OPTIONS.sugarLevels).withMessage('Invalid sugar level'),
    body('products.*.customization.ice').optional().isIn(CUSTOMIZATION_OPTIONS.iceLevels).withMessage('Invalid ice level'),
    body('paymentMethod').optional().isIn(['COD', 'Card', 'UPI', 'Wallet']).withMessage('Invalid payment method')
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
