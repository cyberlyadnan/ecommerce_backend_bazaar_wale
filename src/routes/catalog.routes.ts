import { Router } from 'express';
import { body, param, query } from 'express-validator';

import {
  createCategoryHandler,
  listCategoriesHandler,
  updateCategoryHandler,
} from '../controllers/category.controller';
import {
  createProductHandler,
  deleteProductHandler,
  getProductHandler,
  getProductBySlugHandler,
  listProductsHandler,
  listPublicProductsHandler,
  updateProductHandler,
} from '../controllers/product.controller';
import {
  listVendorsHandler,
  approveVendorHandler,
  rejectVendorHandler,
} from '../controllers/vendor.controller';
import { authenticate, requireAdmin } from '../middlewares/auth.middleware';
import validateRequest from '../middlewares/validation.middleware';

const router = Router();

router.get('/categories', listCategoriesHandler);

router.post(
  '/categories',
  authenticate(['admin', 'vendor']),
  [
    body('name').isString().trim().notEmpty(),
    body('slug')
      .optional({ values: 'falsy' })
      .isString()
      .trim()
      .isLength({ min: 2 })
      .withMessage('Slug must be at least 2 characters'),
    body('description').optional({ values: 'falsy' }).isString(),
    body('image')
      .optional({ values: 'falsy' })
      .custom((value) => {
        if (!value || typeof value !== 'string') {
          return true; // Optional field, skip validation if empty
        }
        // Check if it's a valid URL - accept http://, https://, or data: URLs
        const urlPattern = /^(https?:\/\/|\/|data:image\/)/i;
        return urlPattern.test(value);
      })
      .withMessage('Image must be a valid URL'),
    body('parent').optional({ nullable: true }).isMongoId(),
    body('isActive').optional().isBoolean(),
  ],
  validateRequest,
  createCategoryHandler,
);

router.patch(
  '/categories/:categoryId',
  authenticate(['admin', 'vendor']),
  [
    param('categoryId').isMongoId(),
    body('name').optional({ values: 'falsy' }).isString().trim().notEmpty(),
    body('slug')
      .optional({ values: 'falsy' })
      .isString()
      .trim()
      .isLength({ min: 2 })
      .withMessage('Slug must be at least 2 characters'),
    body('description').optional({ values: 'falsy' }).isString(),
    body('image')
      .optional({ values: 'falsy' })
      .custom((value) => {
        if (!value || typeof value !== 'string') {
          return true; // Optional field, skip validation if empty
        }
        // Check if it's a valid URL - accept http://, https://, or data: URLs
        const urlPattern = /^(https?:\/\/|\/|data:image\/)/i;
        return urlPattern.test(value);
      })
      .withMessage('Image must be a valid URL'),
    body('parent').optional({ nullable: true }).custom((value) => {
      if (value === null || value === '') {
        return true;
      }
      if (typeof value !== 'string') {
        throw new Error('parent must be a string');
      }
      if (!value.match(/^[a-f\d]{24}$/i)) {
        throw new Error('parent must be a valid id');
      }
      return true;
    }),
    body('isActive').optional().isBoolean(),
  ],
  validateRequest,
  updateCategoryHandler,
);

// List products - allow vendors and admins (vendors only see their own)
router.get(
  '/products',
  authenticate(['admin', 'vendor']),
  [
    query('search').optional().isString().trim().isLength({ min: 1, max: 120 }).withMessage('Search must be a string'),
    query('scope').optional().isIn(['all', 'mine']),
    query('limit').optional().isInt({ min: 1, max: 200 }),
  ],
  validateRequest,
  listProductsHandler,
);

router.get(
  '/products/slug/:slug',
  [param('slug').isString().trim().notEmpty()],
  validateRequest,
  getProductBySlugHandler,
);

router.get(
  '/products/public',
  [
    query('search').optional().isString().trim().isLength({ min: 1, max: 120 }),
    query('limit').optional().isInt({ min: 1, max: 200 }),
  ],
  validateRequest,
  listPublicProductsHandler,
);

// Create product - allow vendors and admins
router.post(
  '/products',
  authenticate(['admin', 'vendor']),
  [
    body('title').isString().trim().notEmpty(),
    body('slug').optional().isString().trim(),
    body('sku').optional().isString().trim(),
    body('description').optional().isString(),
    body('shortDescription').optional().isString(),
    body('category').optional({ nullable: true }).isMongoId(),
    body('subcategory').optional({ nullable: true }).isMongoId(),
    body('images').optional().isArray(),
    body('images.*.url').isString().trim().notEmpty(),
    body('images.*.alt').optional().isString(),
    body('images.*.order').optional().isNumeric(),
    body('attributes').optional().isObject(),
    body('stock').optional().isNumeric(),
    body('minOrderQty').optional().isNumeric(),
    body('weightKg').optional().isNumeric(),
    body('vendorId').optional().isMongoId(), // Optional - will be set to current user if vendor
    body('price').isNumeric(),
    body('pricingTiers').optional().isArray(),
    body('pricingTiers.*.minQty').isNumeric(),
    body('pricingTiers.*.pricePerUnit').isNumeric(),
    body('isActive').optional().isBoolean(),
    body('approvedByAdmin').optional().isBoolean(),
    body('featured').optional().isBoolean(),
    body('tags').optional().isArray(),
    body('tags.*').isString(),
    body('meta').optional().isObject(),
  ],
  validateRequest,
  createProductHandler,
);

// Get product - allow vendors and admins (vendors can only see their own)
router.get(
  '/products/:productId',
  authenticate(['admin', 'vendor']),
  [param('productId').isMongoId()],
  validateRequest,
  getProductHandler,
);

// Update product - allow vendors and admins (vendors can only update their own)
router.patch(
  '/products/:productId',
  authenticate(['admin', 'vendor']),
  [
    param('productId').isMongoId(),
    body('title').optional().isString().trim().notEmpty(),
    body('slug').optional().isString().trim(),
    body('sku').optional().isString().trim(),
    body('description').optional().isString(),
    body('shortDescription').optional().isString(),
    body('category').optional({ nullable: true }).isMongoId(),
    body('subcategory').optional({ nullable: true }).isMongoId(),
    body('images').optional().isArray(),
    body('images.*.url').isString().trim().notEmpty(),
    body('images.*.alt').optional().isString(),
    body('images.*.order').optional().isNumeric(),
    body('attributes').optional().isObject(),
    body('stock').optional().isNumeric(),
    body('minOrderQty').optional().isNumeric(),
    body('weightKg').optional().isNumeric(),
    body('vendorId').optional().isMongoId(), // Vendors cannot change vendorId
    body('price').optional().isNumeric(),
    body('pricingTiers').optional().isArray(),
    body('pricingTiers.*.minQty').isNumeric(),
    body('pricingTiers.*.pricePerUnit').isNumeric(),
    body('isActive').optional().isBoolean(),
    body('approvedByAdmin').optional().isBoolean(), // Vendors cannot set this
    body('featured').optional().isBoolean(), // Only admins can set this
    body('tags').optional().isArray(),
    body('tags.*').isString(),
    body('meta').optional().isObject(),
  ],
  validateRequest,
  updateProductHandler,
);

// Delete product - allow vendors and admins (vendors can only delete their own)
router.delete(
  '/products/:productId',
  authenticate(['admin', 'vendor']),
  [param('productId').isMongoId()],
  validateRequest,
  deleteProductHandler,
);

router.get(
  '/vendors',
  requireAdmin,
  [
    query('status').optional().isIn(['all', 'pending', 'active', 'rejected', 'suspended']),
    query('search').optional().isString().trim().isLength({ min: 1, max: 120 }),
  ],
  validateRequest,
  listVendorsHandler,
);

router.post(
  '/vendors/:vendorId/approve',
  requireAdmin,
  [param('vendorId').isMongoId()],
  validateRequest,
  approveVendorHandler,
);

router.post(
  '/vendors/:vendorId/reject',
  requireAdmin,
  [
    param('vendorId').isMongoId(),
    body('reason').optional().isString().trim().isLength({ max: 500 }),
  ],
  validateRequest,
  rejectVendorHandler,
);

export default router;


