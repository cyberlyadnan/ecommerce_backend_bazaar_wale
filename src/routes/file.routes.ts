import { Router, Request, Response, NextFunction } from 'express';
import { MulterError } from 'multer';
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

// Multer error handling middleware - must be after multer middleware
const handleMulterError = (err: any, req: Request, res: Response, next: NextFunction) => {
  if (err) {
    if (err instanceof MulterError) {
      if (err.code === 'LIMIT_FILE_SIZE') {
        return res.status(400).json({ message: 'File size exceeds the 5MB limit' });
      }
      if (err.code === 'LIMIT_UNEXPECTED_FILE') {
        return res.status(400).json({ message: 'Invalid file type. Only images and PDFs are allowed' });
      }
      if (err.code === 'LIMIT_FILE_COUNT') {
        return res.status(400).json({ message: 'Too many files. Only one file allowed per request' });
      }
      return res.status(400).json({ message: err.message || 'File upload error' });
    }
    // Handle other upload errors
    return res.status(400).json({ message: err.message || 'File upload error' });
  }
  next();
};

// Handle preflight OPTIONS request for vendor application upload endpoint
router.options('/upload/vendor-application', (_req, res) => {
  res.setHeader('Access-Control-Allow-Origin', _req.headers.origin || '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.status(200).end();
});

// Upload for vendor application documents (public - used during vendor registration)
// NOTE: This is intentionally unauthenticated to allow uploads before account approval.
// Keep size/type limits strict (handled in uploadMiddleware).
// Rate limited to prevent abuse
router.post(
  '/upload/vendor-application',
  uploadRateLimit,
  uploadMiddleware.single('file'),
  handleMulterError,
  uploadFileHandler,
);

// Handle preflight OPTIONS request for upload endpoints
router.options('/upload', (_req, res) => {
  res.setHeader('Access-Control-Allow-Origin', _req.headers.origin || '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.status(200).end();
});

// Upload for admin/vendor (product images, etc.)
router.post(
  '/upload',
  uploadRateLimit,
  authenticate(['admin', 'vendor']),
  uploadMiddleware.single('file'),
  handleMulterError,
  uploadFileHandler,
);

// Handle preflight OPTIONS request for review upload endpoint
router.options('/upload/review', (_req, res) => {
  res.setHeader('Access-Control-Allow-Origin', _req.headers.origin || '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.status(200).end();
});

// Upload for review images (all authenticated users can review products)
router.post(
  '/upload/review',
  uploadRateLimit,
  authenticate(), // Allow all authenticated users (customer, vendor, admin)
  uploadMiddleware.single('file'),
  handleMulterError,
  uploadFileHandler,
);

export default router;


