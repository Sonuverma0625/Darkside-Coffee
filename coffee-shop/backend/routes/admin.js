const express = require('express');
const { body } = require('express-validator');
const validate = require('../middleware/validate');
const { protect, authorize } = require('../middleware/auth');
const {
  dashboardStats,
  getUsers,
  updateUserRole,
  deleteUser
} = require('../controllers/adminController');

const router = express.Router();

router.use(protect, authorize('admin'));

router.get('/dashboard', dashboardStats);
router.get('/users', getUsers);
router.put('/users/:id/role', [body('role').isIn(['customer', 'admin']).withMessage('Invalid role')], validate, updateUserRole);
router.delete('/users/:id', deleteUser);

module.exports = router;
