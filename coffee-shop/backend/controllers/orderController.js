const Order = require('../models/Order');
const Product = require('../models/Product');
const { createUpiPayment } = require('../config/payment');

const orderError = (message, statusCode = 422) => {
  const error = new Error(message);
  error.statusCode = statusCode;
  return error;
};

const buildOrderProducts = async (products) => {
  if (!Array.isArray(products) || products.length === 0) {
    throw orderError('Order products are required');
  }

  const productIds = products.map((item) => item.product);
  const dbProducts = await Product.find({ _id: { $in: productIds }, isActive: true });
  const productMap = new Map(dbProducts.map((product) => [product._id.toString(), product]));

  return products.map((item) => {
    const dbProduct = productMap.get(String(item.product));
    const quantity = Number(item.quantity);

    if (!dbProduct) {
      throw orderError('One or more products are unavailable');
    }

    if (!Number.isInteger(quantity) || quantity < 1) {
      throw orderError('Quantity must be at least 1');
    }

    if (dbProduct.stock < quantity) {
      throw orderError(`${dbProduct.title} does not have enough stock`);
    }

    return {
      product: dbProduct._id,
      title: dbProduct.title,
      quantity,
      price: dbProduct.discountPrice || dbProduct.price,
      image: dbProduct.image,
      customization: item.customization || {}
    };
  });
};

const getTotal = (products) =>
  Number(products.reduce((sum, item) => sum + item.price * item.quantity, 0).toFixed(2));

const getCustomer = (req) => ({
  name: String(req.body.customerName || '').trim(),
  email: String(req.user.email || '').trim().toLowerCase(),
  phone: String(req.body.contactPhone || '').trim()
});

const getShippingAddress = (body = {}) => ({
  street: String(body.street || '').trim(),
  city: String(body.city || '').trim(),
  state: String(body.state || '').trim(),
  zip: String(body.zip || '').trim(),
  country: String(body.country || 'India').trim()
});

const previewOrder = async (req, res, next) => {
  try {
    const orderProducts = await buildOrderProducts(req.body.products);
    const totalPrice = getTotal(orderProducts);
    const payment = await createUpiPayment(totalPrice);

    res.json({
      success: true,
      preview: {
        customer: getCustomer(req),
        shippingAddress: getShippingAddress(req.body.shippingAddress),
        products: orderProducts,
        totalPrice,
        currency: 'INR'
      },
      payment
    });
  } catch (error) {
    next(error);
  }
};

const createOrder = async (req, res, next) => {
  try {
    const {
      products,
      shippingAddress,
      paymentMethod,
      paymentConfirmed,
      transactionId
    } = req.body;
    const isDigitalPayment = paymentMethod === 'UPI' || paymentMethod === 'QR';

    if (isDigitalPayment && paymentConfirmed !== true) {
      throw orderError('Confirm the UPI or QR payment before placing the order');
    }

    const orderProducts = await buildOrderProducts(products);
    const totalPrice = getTotal(orderProducts);
    const customer = getCustomer(req);
    const order = await Order.create({
      user: req.user._id,
      customer,
      products: orderProducts,
      totalPrice,
      currency: 'INR',
      shippingAddress: getShippingAddress(shippingAddress),
      paymentMethod,
      paymentStatus: isDigitalPayment ? 'Verification Pending' : 'Pending',
      transactionId: isDigitalPayment ? String(transactionId || '').trim() : '',
      paymentConfirmedAt: isDigitalPayment ? new Date() : undefined,
      contactPhone: customer.phone
    });

    await Promise.all(
      orderProducts.map((item) =>
        Product.findByIdAndUpdate(item.product, { $inc: { stock: -item.quantity } })
      )
    );

    res.status(201).json({ success: true, order });
  } catch (error) {
    next(error);
  }
};

const getOrders = async (req, res, next) => {
  try {
    const query = req.user.role === 'admin' ? {} : { user: req.user._id };
    const orders = await Order.find(query)
      .populate('user', 'name email')
      .sort('-createdAt');

    res.json({ success: true, count: orders.length, orders });
  } catch (error) {
    next(error);
  }
};

const getOrderById = async (req, res, next) => {
  try {
    const query = { _id: req.params.id };

    if (req.user.role !== 'admin') {
      query.user = req.user._id;
    }

    const order = await Order.findOne(query).populate('user', 'name email');

    if (!order) {
      return res.status(404).json({ success: false, message: 'Order not found' });
    }

    res.json({ success: true, order });
  } catch (error) {
    next(error);
  }
};

const updateOrderStatus = async (req, res, next) => {
  try {
    const order = await Order.findByIdAndUpdate(
      req.params.id,
      { status: req.body.status },
      { new: true, runValidators: true }
    ).populate('user', 'name email');

    if (!order) {
      return res.status(404).json({ success: false, message: 'Order not found' });
    }

    res.json({ success: true, order });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  createOrder,
  previewOrder,
  getOrders,
  getOrderById,
  updateOrderStatus
};
