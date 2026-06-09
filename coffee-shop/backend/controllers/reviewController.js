const mongoose = require('mongoose');
const Review = require('../models/Review');
const Product = require('../models/Product');

const updateProductRating = async (productId) => {
  if (!productId) return;

  const stats = await Review.aggregate([
    { $match: { product: productId } },
    { $group: { _id: '$product', rating: { $avg: '$rating' }, numReviews: { $sum: 1 } } }
  ]);

  const rating = stats[0]?.rating || 0;
  const numReviews = stats[0]?.numReviews || 0;

  await Product.findByIdAndUpdate(productId, {
    rating: Number(rating.toFixed(1)),
    numReviews
  });
};

const createReview = async (req, res, next) => {
  try {
    const review = await Review.create({
      user: req.user._id,
      product: req.body.product || undefined,
      rating: req.body.rating,
      comment: req.body.comment
    });

    await updateProductRating(review.product);
    await review.populate('user', 'name');

    res.status(201).json({ success: true, review });
  } catch (error) {
    next(error);
  }
};

const getReviews = async (req, res, next) => {
  try {
    const query = req.query.product ? { product: req.query.product } : {};
    const reviews = await Review.find(query)
      .populate('user', 'name')
      .populate('product', 'title')
      .sort('-createdAt')
      .limit(50);

    res.json({ success: true, count: reviews.length, reviews });
  } catch (error) {
    next(error);
  }
};

const getAverageRating = async (req, res, next) => {
  try {
    const productId =
      req.query.product && mongoose.Types.ObjectId.isValid(req.query.product)
        ? new mongoose.Types.ObjectId(req.query.product)
        : null;
    const match = productId ? { product: productId } : {};
    const stats = await Review.aggregate([
      { $match: match },
      { $group: { _id: null, averageRating: { $avg: '$rating' }, totalReviews: { $sum: 1 } } }
    ]);

    res.json({
      success: true,
      averageRating: Number((stats[0]?.averageRating || 0).toFixed(1)),
      totalReviews: stats[0]?.totalReviews || 0
    });
  } catch (error) {
    next(error);
  }
};

module.exports = { createReview, getReviews, getAverageRating };
