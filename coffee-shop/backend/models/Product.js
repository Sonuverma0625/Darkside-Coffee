const mongoose = require('mongoose');
const {
  PRODUCT_CATEGORIES,
  PRODUCT_DEPARTMENTS,
  AVAILABILITY_STATUSES,
  CUSTOMIZATION_OPTIONS,
  getDepartmentForCategory
} = require('../config/productOptions');

const productSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: [true, 'Product title is required'],
      trim: true,
      maxlength: [120, 'Product title cannot exceed 120 characters']
    },
    description: {
      type: String,
      required: [true, 'Description is required'],
      trim: true,
      maxlength: [1000, 'Description cannot exceed 1000 characters']
    },
    price: {
      type: Number,
      required: [true, 'Price is required'],
      min: [0, 'Price cannot be negative']
    },
    discountPrice: {
      type: Number,
      min: [0, 'Discount price cannot be negative'],
      validate: {
        validator(value) {
          return value === undefined || this.price === undefined || value <= this.price;
        },
        message: 'Discount price cannot be greater than price'
      }
    },
    image: {
      type: String,
      default: ''
    },
    images: {
      type: [String],
      default: []
    },
    category: {
      type: String,
      required: [true, 'Category is required'],
      trim: true,
      enum: PRODUCT_CATEGORIES
    },
    department: {
      type: String,
      enum: PRODUCT_DEPARTMENTS,
      default() {
        return getDepartmentForCategory(this.category);
      }
    },
    sku: {
      type: String,
      required: [true, 'SKU is required'],
      unique: true,
      uppercase: true,
      trim: true,
      maxlength: [60, 'SKU cannot exceed 60 characters']
    },
    rating: {
      type: Number,
      default: 0,
      min: 0,
      max: 5
    },
    numReviews: {
      type: Number,
      default: 0
    },
    stock: {
      type: Number,
      default: 50,
      min: 0
    },
    availability: {
      type: String,
      enum: AVAILABILITY_STATUSES,
      default: 'Available'
    },
    ingredients: {
      type: [String],
      default: []
    },
    calories: {
      type: Number,
      default: 0,
      min: 0
    },
    preparationTime: {
      type: Number,
      default: 5,
      min: 0
    },
    popularBadge: {
      type: Boolean,
      default: false
    },
    bestsellerBadge: {
      type: Boolean,
      default: false
    },
    newArrivalBadge: {
      type: Boolean,
      default: false
    },
    customization: {
      sizes: {
        type: [String],
        enum: CUSTOMIZATION_OPTIONS.sizes,
        default: () => CUSTOMIZATION_OPTIONS.sizes
      },
      milkOptions: {
        type: [String],
        enum: CUSTOMIZATION_OPTIONS.milkOptions,
        default: () => CUSTOMIZATION_OPTIONS.milkOptions
      },
      sugarLevels: {
        type: [String],
        enum: CUSTOMIZATION_OPTIONS.sugarLevels,
        default: () => CUSTOMIZATION_OPTIONS.sugarLevels
      },
      iceLevels: {
        type: [String],
        enum: CUSTOMIZATION_OPTIONS.iceLevels,
        default: () => CUSTOMIZATION_OPTIONS.iceLevels
      }
    },
    featured: {
      type: Boolean,
      default: false
    },
    isActive: {
      type: Boolean,
      default: true
    }
  },
  { timestamps: true }
);

productSchema.index({ title: 'text', description: 'text', category: 'text' });

productSchema.pre('validate', function setDepartment(next) {
  if (this.category && !this.department) {
    this.department = getDepartmentForCategory(this.category);
  }

  if (!this.image && this.images.length > 0) {
    this.image = this.images[0];
  }

  if (this.image && !this.images.includes(this.image)) {
    this.images.unshift(this.image);
  }

  next();
});

module.exports = mongoose.model('Product', productSchema);
