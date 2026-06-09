const express = require('express');
const { body } = require('express-validator');
const validate = require('../middleware/validate');
const { protect, authorize } = require('../middleware/auth');
const {
  subscribe,
  getSubscribers,
  deleteSubscriber
} = require('../controllers/newsletterController');

const router = express.Router();

router.post('/', [body('email').isEmail().withMessage('Valid email is required').normalizeEmail()], validate, subscribe);
router.get('/', protect, authorize('admin'), getSubscribers);
router.delete('/:id', protect, authorize('admin'), deleteSubscriber);

module.exports = router;
