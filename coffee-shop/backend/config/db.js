const mongoose = require('mongoose');

const stripWrappingQuotes = (value) => value.replace(/^['"]|['"]$/g, '');

const normalizeMongoUri = (value = '') => {
  const trimmed = stripWrappingQuotes(value.trim());
  const prefixedValue = trimmed.match(/^(?:MONGODB_URI|MONGO_URI)\s*=\s*(.+)$/i);
  return stripWrappingQuotes((prefixedValue ? prefixedValue[1] : trimmed).trim());
};

const connectDB = async () => {
  try {
    const mongoUri = normalizeMongoUri(process.env.MONGODB_URI || process.env.MONGO_URI);

    if (!mongoUri) {
      throw new Error('MONGODB_URI is missing from environment variables');
    }

    if (!/^mongodb(\+srv)?:\/\//i.test(mongoUri)) {
      throw new Error('MONGODB_URI must start with mongodb:// or mongodb+srv://. Check the value in Render Environment Variables.');
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
