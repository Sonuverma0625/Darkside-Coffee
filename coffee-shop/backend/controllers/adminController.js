const User = require('../models/User');
const Product = require('../models/Product');
const Order = require('../models/Order');
const Contact = require('../models/Contact');
const Review = require('../models/Review');
const Newsletter = require('../models/Newsletter');

const dashboardStats = async (req, res, next) => {
  try {
    const [
      users,
      products,
      orders,
      contacts,
      reviews,
      subscribers,
      revenueAgg,
      recentOrders
    ] = await Promise.all([
      User.countDocuments(),
      Product.countDocuments(),
      Order.countDocuments(),
      Contact.countDocuments(),
      Review.countDocuments(),
      Newsletter.countDocuments(),
      Order.aggregate([{ $group: { _id: null, revenue: { $sum: '$totalPrice' } } }]),
      Order.find().populate('user', 'name email').sort('-createdAt').limit(5)
    ]);

    res.json({
      success: true,
      stats: {
        users,
        products,
        orders,
        contacts,
        reviews,
        subscribers,
        revenue: revenueAgg[0]?.revenue || 0
      },
      recentOrders
    });
  } catch (error) {
    next(error);
  }
};

const getUsers = async (req, res, next) => {
  try {
    const users = await User.find().select('-password').sort('-createdAt');

    res.json({ success: true, count: users.length, users });
  } catch (error) {
    next(error);
  }
};

const updateUserRole = async (req, res, next) => {
  try {
    const user = await User.findByIdAndUpdate(
      req.params.id,
      { role: req.body.role },
      { new: true, runValidators: true }
    ).select('-password');

    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    res.json({ success: true, user });
  } catch (error) {
    next(error);
  }
};

const deleteUser = async (req, res, next) => {
  try {
    if (String(req.user._id) === String(req.params.id)) {
      return res.status(400).json({ success: false, message: 'You cannot delete your own admin account' });
    }

    const user = await User.findByIdAndDelete(req.params.id);

    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    res.json({ success: true, message: 'User deleted' });
  } catch (error) {
    next(error);
  }
};

module.exports = { dashboardStats, getUsers, updateUserRole, deleteUser };
