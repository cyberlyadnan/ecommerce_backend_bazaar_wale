import { Router } from 'express';
import { param } from 'express-validator';

import {
  getVendorDocumentsHandler,
  getVendorDocumentHandler,
  streamVendorDocumentHandler,
} from '../controllers/vendorDocument.controller';
import { authenticate, requireAdmin } from '../middlewares/auth.middleware';
import validateRequest from '../middlewares/validation.middleware';

const router = Router();

/**
 * Admin Routes
 * All admin routes require admin authentication
 */

// Get all documents for a vendor (Admin)
// GET /api/admin/vendors/:vendorId/documents
router.get(
  '/admin/vendors/:vendorId/documents',
  requireAdmin,
  [param('vendorId').isMongoId()],
  validateRequest,
  getVendorDocumentsHandler,
);

// Stream a specific vendor document (Admin)
// GET /api/admin/vendors/:vendorId/documents/:documentId/file
router.get(
  '/admin/vendors/:vendorId/documents/:documentId/file',
  requireAdmin,
  [
    param('vendorId').isMongoId(),
    param('documentId').isMongoId(),
  ],
  validateRequest,
  streamVendorDocumentHandler,
);

/**
 * Vendor Routes
 * All vendor routes require vendor authentication and ownership verification
 */

// Get a specific document by ID (Vendor)
// GET /api/vendor/documents/:documentId
router.get(
  '/vendor/documents/:documentId',
  authenticate(['vendor']),
  [param('documentId').isMongoId()],
  validateRequest,
  getVendorDocumentHandler,
);

// Stream a document file (Vendor)
// GET /api/vendor/documents/:documentId/file
router.get(
  '/vendor/documents/:documentId/file',
  authenticate(['vendor']),
  [param('documentId').isMongoId()],
  validateRequest,
  streamVendorDocumentHandler,
);

export default router;
