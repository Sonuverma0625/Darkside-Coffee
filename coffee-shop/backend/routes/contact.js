const express = require('express');
const { body } = require('express-validator');
const validate = require('../middleware/validate');
const { protect, authorize } = require('../middleware/auth');
const {
  createContact,
  getContacts,
  updateContactStatus
} = require('../controllers/contactController');

const router = express.Router();

router.post(
  '/',
  [
    body('name').trim().isLength({ min: 2 }).withMessage('Name must be at least 2 characters'),
    body('email').isEmail().withMessage('Valid email is required').normalizeEmail(),
    body('phone').optional().trim().isLength({ max: 30 }).withMessage('Phone number is too long'),
    body('message').trim().isLength({ min: 10 }).withMessage('Message must be at least 10 characters')
  ],
  validate,
  createContact
);

router.get('/', protect, authorize('admin'), getContacts);
router.put('/:id/status', protect, authorize('admin'), [body('status').isIn(['new', 'read', 'resolved']).withMessage('Invalid status')], validate, updateContactStatus);

module.exports = router;
