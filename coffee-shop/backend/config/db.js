const mongoose = require('mongoose');

const stripWrappingQuotes = (value) => value.replace(/^['"]|['"]$/g, '');

const normalizeMongoUri = (value = '') => {
  const trimmed = stripWrappingQuotes(value.trim());
  const prefixedValue = trimmed.match(/^(?:MONGODB_URI|MONGO_URI)\s*=\s*(.+)$/i);
  return stripWrappingQuotes((prefixedValue ? prefixedValue[1] : trimmed).trim());
};

const createMongoUriError = (message, code) => {
  const error = new Error(message);
  error.code = code;
  return error;
};

const connectDB = async () => {
  try {
    const mongoUri = normalizeMongoUri(process.env.MONGODB_URI || process.env.MONGO_URI);

    if (!mongoUri) {
      throw createMongoUriError('MONGODB_URI is missing from environment variables', 'MONGODB_URI_MISSING');
    }

    if (!/^mongodb(\+srv)?:\/\/[^/\s]+/i.test(mongoUri)) {
      throw createMongoUriError(
        'MONGODB_URI must be a complete MongoDB URL like mongodb+srv://user:password@cluster.mongodb.net/coffee_shop',
        'MONGODB_URI_INVALID'
      );
    }

    const conn = await mongoose.connect(mongoUri, {
      serverSelectionTimeoutMS: 8000
    });
    console.log(`MongoDB connected: ${conn.connection.host}`);
  } catch (error) {
    console.error(`MongoDB connection failed: ${error.message}`);
    throw error;
  }
};

module.exports = connectDB;
module.exports.normalizeMongoUri = normalizeMongoUri;
