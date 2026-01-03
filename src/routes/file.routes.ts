import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import config from '../config';

import { uploadFileHandler } from '../controllers/file.controller';
import { authenticate } from '../middlewares/auth.middleware';
import { uploadMiddleware } from '../utils/upload';

const router = Router();

// Stricter rate limit for file uploads to prevent abuse
const uploadRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: config.app.env === 'production' ? 20 : 50, // Limit uploads to prevent abuse
  message: 'Too many upload requests from this IP, please try again later.',
  standardHeaders: true,
  legacyHeaders: false,
});

// Upload for vendor application documents (public - used during vendor registration)
// NOTE: This is intentionally unauthenticated to allow uploads before account approval.
// Keep size/type limits strict (handled in uploadMiddleware).
// Rate limited to prevent abuse
router.post(
  '/upload/vendor-application',
  uploadRateLimit,
  uploadMiddleware.single('file'),
  uploadFileHandler,
);

// Upload for admin/vendor (product images, etc.)
router.post(
  '/upload',
  uploadRateLimit,
  authenticate(['admin', 'vendor']),
  uploadMiddleware.single('file'),
  uploadFileHandler,
);

// Upload for review images (all authenticated users can review products)
router.post(
  '/upload/review',
  uploadRateLimit,
  authenticate(), // Allow all authenticated users (customer, vendor, admin)
  uploadMiddleware.single('file'),
  uploadFileHandler,
);

export default router;


