const Contact = require('../models/Contact');

const createContact = async (req, res, next) => {
  try {
    const contact = await Contact.create(req.body);

    res.status(201).json({
      success: true,
      message: 'Thank you. We will get back to you soon.',
      contact
    });
  } catch (error) {
    next(error);
  }
};

const getContacts = async (req, res, next) => {
  try {
    const contacts = await Contact.find().sort('-createdAt');

    res.json({ success: true, count: contacts.length, contacts });
  } catch (error) {
    next(error);
  }
};

const updateContactStatus = async (req, res, next) => {
  try {
    const contact = await Contact.findByIdAndUpdate(
      req.params.id,
      { status: req.body.status },
      { new: true, runValidators: true }
    );

    if (!contact) {
      return res.status(404).json({ success: false, message: 'Contact message not found' });
    }

    res.json({ success: true, contact });
  } catch (error) {
    next(error);
  }
};

module.exports = { createContact, getContacts, updateContactStatus };
