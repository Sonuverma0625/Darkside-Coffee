const path = require('path');
const express = require('express');
const dotenv = require('dotenv');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const compression = require('compression');
const rateLimit = require('express-rate-limit');
const connectDB = require('./config/db');
const createDevFallbackRouter = require('./routes/devFallback');
const { notFound, errorHandler } = require('./middleware/errorHandler');

dotenv.config();

const app = express();
app.set('trust proxy', 1);

const allowedOrigins = process.env.CLIENT_URL
  ? process.env.CLIENT_URL.split(',').map((origin) => origin.trim())
  : ['http://localhost:5000'];
const isRenderOrigin = (origin) => /^https:\/\/[a-z0-9-]+\.onrender\.com$/i.test(origin || '');

app.use(
  helmet({
    crossOriginResourcePolicy: { policy: 'cross-origin' },
    contentSecurityPolicy: false
  })
);
app.use(compression());
app.use(
  cors({
    origin(origin, callback) {
      if (!origin || origin === 'null' || allowedOrigins.includes(origin) || isRenderOrigin(origin)) {
        return callback(null, true);
      }
      return callback(new Error('Not allowed by CORS'));
    },
    credentials: true
  })
);
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

if (process.env.NODE_ENV !== 'test') {
  app.use(morgan(process.env.NODE_ENV === 'production' ? 'combined' : 'dev'));
}

app.use(
  '/api',
  rateLimit({
    windowMs: 15 * 60 * 1000,
    limit: 300,
    standardHeaders: true,
    legacyHeaders: false
  })
);

app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

const port = process.env.PORT || 5000;
let server;

const mountMongoRoutes = () => {
  app.get('/api/health', (req, res) => {
    res.json({
      success: true,
      message: 'Coffee Shop API is running',
      database: 'mongodb',
      environment: process.env.NODE_ENV || 'development'
    });
  });
  app.use('/api/auth', require('./routes/auth'));
  app.use('/api/products', require('./routes/products'));
  app.use('/api/orders', require('./routes/orders'));
  app.use('/api/contact', require('./routes/contact'));
  app.use('/api/review', require('./routes/review'));
  app.use('/api/newsletter', require('./routes/newsletter'));
  app.use('/api/admin', require('./routes/admin'));
};

const mountStaticAndErrors = () => {
  const frontendPath = path.join(__dirname, '..', 'frontend');
  app.use(express.static(frontendPath));
  app.use(notFound);
  app.use(errorHandler);
};

const startServer = async () => {
  try {
    await connectDB();
    mountMongoRoutes();
  } catch (error) {
    if (process.env.NODE_ENV === 'production' || process.env.DISABLE_DEV_FALLBACK === 'true') {
      throw error;
    }

    console.warn('MongoDB unavailable. Starting development fallback API.');
    app.use('/api', createDevFallbackRouter());
  }

  mountStaticAndErrors();
  server = app.listen(port, () => {
    console.log(`Coffee Shop API running on port ${port}`);
  });
};

startServer();

process.on('unhandledRejection', (err) => {
  console.error(`Unhandled rejection: ${err.message}`);
  if (server) {
    server.close(() => process.exit(1));
  } else {
    process.exit(1);
  }
});
