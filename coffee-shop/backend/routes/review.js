const express = require('express');
const { body } = require('express-validator');
const validate = require('../middleware/validate');
const { protect } = require('../middleware/auth');
const {
  createReview,
  getReviews,
  getAverageRating
} = require('../controllers/reviewController');

const router = express.Router();

router.get('/', getReviews);
router.get('/average', getAverageRating);
router.post(
  '/',
  protect,
  [
    body('product').optional({ nullable: true, checkFalsy: true }).isMongoId().withMessage('Product must be a valid id'),
    body('rating').isInt({ min: 1, max: 5 }).withMessage('Rating must be between 1 and 5'),
    body('comment').trim().isLength({ min: 5 }).withMessage('Comment must be at least 5 characters')
  ],
  validate,
  createReview
);

module.exports = router;
