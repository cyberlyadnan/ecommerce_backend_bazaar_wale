import cookieParser from 'cookie-parser';
import cors from 'cors';
import express from 'express';
import helmet from 'helmet';
import mongoSanitize from 'mongo-sanitize';
import morgan from 'morgan';
import path from 'path';
import rateLimit from 'express-rate-limit';
import config from './config';
import authRoutes from './routes/auth.routes';
import cartRoutes from './routes/cart.routes';
import catalogRoutes from './routes/catalog.routes';
import contactRoutes from './routes/contact.routes';
import fileRoutes from './routes/file.routes';
import orderRoutes from './routes/orders.routes';
import paymentRoutes from './routes/payments.routes';
import reviewRoutes from './routes/reviews.routes';
import vendorDashboardRoutes from './routes/vendorDashboard.routes';
import blogRoutes from './routes/blog.routes';
import adminBlogRoutes from './routes/adminBlog.routes';
import addressRoutes from './routes/address.routes';
import errorHandler from './middlewares/error.middleware';

const app = express();

// CORS configuration - restrict to known origins in production
const allowedOrigins = [
  process.env.FRONTEND_URL || 'https://bazaarwale.in',
  'https://bazaarwale.in',
  'https://www.bazaarwale.in',
];

const corsOptions: cors.CorsOptions = {
  origin: (origin, callback) => {
    // Allow non-browser requests (Postman, mobile apps, server-to-server)
    if (!origin) return callback(null, true);

    // Allow whitelisted domains
    if (allowedOrigins.includes(origin)) {
      return callback(null, true);
    }

    // IMPORTANT: do NOT throw error (breaks preflight)
    return callback(null, false);
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: [
    'Content-Type',
    'Authorization',
    'X-Requested-With',
    'Accept',
    'Origin',
  ],
  exposedHeaders: ['Content-Length', 'Content-Range'],
  optionsSuccessStatus: 204,
};



app.set('trust proxy', 1);
app.use(
  helmet({
    crossOriginResourcePolicy: { policy: 'cross-origin' },
    crossOriginEmbedderPolicy: false,
  }),
);
app.use(cors(corsOptions));
app.use(morgan(config.app.env === 'production' ? 'combined' : 'dev'));
app.use(express.json({ limit: '5mb' }));
app.use(express.urlencoded({ extended: true, limit: '5mb' }));
app.use(cookieParser());
app.use((_req, _res, next) => {
  if (_req.body) {
    // eslint-disable-next-line no-param-reassign
    _req.body = mongoSanitize(_req.body);
  }
  next();
});

// Global rate limit - stricter in production
const globalRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: config.app.env === 'production' ? 200 : 500, // Stricter in production
  message: 'Too many requests from this IP, please try again later.',
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req) => {
    // Skip rate limiting for health checks
    return req.path === '/health' || req.path === '/';
  },
});

app.use(globalRateLimit);

// CORS middleware for static files (uploads)
// This allows images to be loaded from any origin (needed when frontend and API are on different domains)
app.use('/uploads', (req, res, next) => {
  // Set CORS headers for image requests
  const origin = req.headers.origin;
  
  // Allow the requesting origin, or all origins if no origin header
  if (origin) {
    res.setHeader('Access-Control-Allow-Origin', origin);
  } else {
    res.setHeader('Access-Control-Allow-Origin', '*');
  }
  
  res.setHeader('Access-Control-Allow-Methods', 'GET, HEAD, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Range');
  res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin');
  res.setHeader('Access-Control-Expose-Headers', 'Content-Length, Content-Range, Content-Type');
  
  // Handle preflight requests
  if (req.method === 'OPTIONS') {
    return res.sendStatus(200);
  }
  next();
});

app.use('/uploads', express.static(path.resolve(process.cwd(), 'uploads')));

app.get('/', (_req, res) => {
  res.json({
    status: 'ok',
    message: 'B2B ecommerce backend is running',
    timestamp: new Date().toISOString(),
  });
});

app.get('/health', (_req, res) => {
  res.json({ status: 'ok', env: config.app.env });
});

app.use('/api/auth', authRoutes);
app.use('/api/cart', cartRoutes);
app.use('/api/catalog', catalogRoutes);
app.use('/api/contact', contactRoutes);
app.use('/api/files', fileRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/payments', paymentRoutes);
app.use('/api/reviews', reviewRoutes);
app.use('/api/vendor/dashboard', vendorDashboardRoutes);
app.use('/api/blog', blogRoutes);
app.use('/api/admin/blogs', adminBlogRoutes);
app.use('/api/addresses', addressRoutes);

app.use(errorHandler);

export default app;

