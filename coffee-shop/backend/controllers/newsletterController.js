const Newsletter = require('../models/Newsletter');

const subscribe = async (req, res, next) => {
  try {
    const subscriber = await Newsletter.create({ email: req.body.email });

    res.status(201).json({
      success: true,
      message: 'You are subscribed to the newsletter',
      subscriber
    });
  } catch (error) {
    next(error);
  }
};

const getSubscribers = async (req, res, next) => {
  try {
    const subscribers = await Newsletter.find().sort('-createdAt');

    res.json({ success: true, count: subscribers.length, subscribers });
  } catch (error) {
    next(error);
  }
};

const deleteSubscriber = async (req, res, next) => {
  try {
    const subscriber = await Newsletter.findByIdAndDelete(req.params.id);

    if (!subscriber) {
      return res.status(404).json({ success: false, message: 'Subscriber not found' });
    }

    res.json({ success: true, message: 'Subscriber removed' });
  } catch (error) {
    next(error);
  }
};

module.exports = { subscribe, getSubscribers, deleteSubscriber };
