const Order = require('../models/Order');
const Product = require('../models/Product');

const createOrder = async (req, res, next) => {
  try {
    const { products, shippingAddress, paymentMethod, contactPhone } = req.body;

    if (!Array.isArray(products) || products.length === 0) {
      return res.status(422).json({ success: false, message: 'Order products are required' });
    }

    const productIds = products.map((item) => item.product);
    const dbProducts = await Product.find({ _id: { $in: productIds }, isActive: true });
    const productMap = new Map(dbProducts.map((product) => [product._id.toString(), product]));

    const orderProducts = products.map((item) => {
      const dbProduct = productMap.get(String(item.product));
      const quantity = Number(item.quantity) || 1;

      if (!dbProduct) {
        const error = new Error('One or more products are unavailable');
        error.statusCode = 422;
        throw error;
      }

      if (dbProduct.stock < quantity) {
        const error = new Error(`${dbProduct.title} does not have enough stock`);
        error.statusCode = 422;
        throw error;
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

    const totalPrice = orderProducts.reduce((sum, item) => sum + item.price * item.quantity, 0);

    const order = await Order.create({
      user: req.user._id,
      products: orderProducts,
      totalPrice,
      shippingAddress,
      paymentMethod,
      contactPhone
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
  getOrders,
  getOrderById,
  updateOrderStatus
};
