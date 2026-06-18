const mongoose = require('mongoose');
const { CUSTOMIZATION_OPTIONS } = require('../config/productOptions');

const orderItemSchema = new mongoose.Schema(
  {
    product: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Product',
      required: true
    },
    title: {
      type: String,
      required: true
    },
    quantity: {
      type: Number,
      required: true,
      min: [1, 'Quantity must be at least 1']
    },
    price: {
      type: Number,
      required: true,
      min: 0
    },
    image: {
      type: String,
      default: ''
    },
    customization: {
      size: {
        type: String,
        enum: CUSTOMIZATION_OPTIONS.sizes,
        default: 'Medium'
      },
      milk: {
        type: String,
        enum: CUSTOMIZATION_OPTIONS.milkOptions
      },
      sugar: {
        type: String,
        enum: CUSTOMIZATION_OPTIONS.sugarLevels
      },
      ice: {
        type: String,
        enum: CUSTOMIZATION_OPTIONS.iceLevels
      }
    }
  },
  { _id: false }
);

const orderSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    products: {
      type: [orderItemSchema],
      validate: [(items) => items.length > 0, 'Order must contain at least one product']
    },
    totalPrice: {
      type: Number,
      required: true,
      min: 0
    },
    status: {
      type: String,
      enum: ['pending', 'paid', 'preparing', 'shipped', 'delivered', 'cancelled'],
      default: 'pending'
    },
    paymentMethod: {
      type: String,
      enum: ['COD', 'Card', 'UPI', 'QR', 'Wallet'],
      default: 'COD'
    },
    paymentStatus: {
      type: String,
      enum: ['Pending', 'Verification Pending', 'Paid', 'Failed', 'Refunded'],
      default: 'Pending'
    },
    transactionId: {
      type: String,
      trim: true,
      maxlength: 100,
      default: ''
    },
    paymentConfirmedAt: {
      type: Date
    },
    currency: {
      type: String,
      enum: ['INR'],
      default: 'INR'
    },
    customer: {
      name: { type: String, trim: true, default: '' },
      email: { type: String, trim: true, lowercase: true, default: '' },
      phone: { type: String, trim: true, default: '' }
    },
    shippingAddress: {
      street: { type: String, trim: true, default: '' },
      city: { type: String, trim: true, default: '' },
      state: { type: String, trim: true, default: '' },
      zip: { type: String, trim: true, default: '' },
      country: { type: String, trim: true, default: '' }
    },
    contactPhone: {
      type: String,
      trim: true,
      default: ''
    }
  },
  { timestamps: true }
);

module.exports = mongoose.model('Order', orderSchema);
