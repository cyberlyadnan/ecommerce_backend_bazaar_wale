import { Router } from 'express';

import { uploadFileHandler } from '../controllers/file.controller';
import { authenticate } from '../middlewares/auth.middleware';
import { uploadMiddleware } from '../utils/upload';

const router = Router();

// Upload for vendor application documents (public - used during vendor registration)
// NOTE: This is intentionally unauthenticated to allow uploads before account approval.
// Keep size/type limits strict (handled in uploadMiddleware).
router.post(
  '/upload/vendor-application',
  uploadMiddleware.single('file'),
  uploadFileHandler,
);

// Upload for admin/vendor (product images, etc.)
router.post(
  '/upload',
  authenticate(['admin', 'vendor']),
  uploadMiddleware.single('file'),
  uploadFileHandler,
);

// Upload for review images (all authenticated users can review products)
router.post(
  '/upload/review',
  authenticate(), // Allow all authenticated users (customer, vendor, admin)
  uploadMiddleware.single('file'),
  uploadFileHandler,
);

export default router;


