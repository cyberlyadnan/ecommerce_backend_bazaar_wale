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
import errorHandler from './middlewares/error.middleware';

const app = express();

const corsOptions: cors.CorsOptions = {
  origin: (origin, callback) => {
    if (!origin) {
      callback(null, true);
      return;
    }
    callback(null, true);
  },
  credentials: true,
};

app.set('trust proxy', 1);
app.use(helmet());
app.use(cors(corsOptions));
app.use(morgan(config.app.env === 'production' ? 'combined' : 'dev'));
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());
app.use((_req, _res, next) => {
  if (_req.body) {
    // eslint-disable-next-line no-param-reassign
    _req.body = mongoSanitize(_req.body);
  }
  next();
});

// Global rate limit - more lenient for development
app.use(
  rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 500, // Increased from 200 to 500 requests per 15 minutes
    message: 'Too many requests from this IP, please try again later.',
    standardHeaders: true,
    legacyHeaders: false,
  }),
);

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

app.use(errorHandler);

export default app;

