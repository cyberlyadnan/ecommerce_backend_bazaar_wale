import { Router } from 'express';
import { body, param, query } from 'express-validator';

import {
  blogStatsAdminHandler,
  createBlogHandler,
  deleteBlogHandler,
  getBlogHandler,
  listBlogsAdminHandler,
  updateBlogHandler,
} from '../controllers/blog.controller';
import { requireAdmin } from '../middlewares/auth.middleware';
import validateRequest from '../middlewares/validation.middleware';

const router = Router();

router.get(
  '/',
  requireAdmin,
  [
    query('search').optional().isString().trim().isLength({ min: 1, max: 120 }),
    query('status').optional().isIn(['draft', 'published', 'all']),
    query('page').optional().isInt({ min: 1, max: 5000 }),
    query('limit').optional().isInt({ min: 1, max: 100 }),
  ],
  validateRequest,
  listBlogsAdminHandler,
);

router.get('/stats', requireAdmin, blogStatsAdminHandler);

router.post(
  '/',
  requireAdmin,
  [
    body('title').isString().trim().notEmpty().isLength({ max: 140 }),
    body('slug').optional().isString().trim().isLength({ min: 2, max: 160 }),
    body('excerpt').optional().isString().trim().isLength({ max: 400 }),
    body('contentHtml').isString().notEmpty(),
    body('featuredImage').optional({ nullable: true }).isObject(),
    body('featuredImage.url').optional().isString().trim(),
    body('featuredImage.alt').optional().isString().trim(),
    body('tags').optional().isArray(),
    body('tags.*').optional().isString(),
    body('status').optional().isIn(['draft', 'published']),
    body('publishedAt').optional({ nullable: true }).isISO8601(),
    body('seo').optional().isObject(),
    body('seo.metaTitle').optional().isString().trim().isLength({ max: 140 }),
    body('seo.metaDescription').optional().isString().trim().isLength({ max: 400 }),
    body('seo.keywords').optional().isArray(),
    body('seo.keywords.*').optional().isString(),
    body('seo.canonicalUrl').optional().isString().trim(),
    body('seo.ogTitle').optional().isString().trim(),
    body('seo.ogDescription').optional().isString().trim(),
    body('seo.ogImage').optional().isObject(),
    body('seo.ogImage.url').optional().isString().trim(),
    body('seo.ogImage.alt').optional().isString().trim(),
    body('seo.twitterTitle').optional().isString().trim(),
    body('seo.twitterDescription').optional().isString().trim(),
    body('seo.twitterImage').optional().isObject(),
    body('seo.twitterImage.url').optional().isString().trim(),
    body('seo.twitterImage.alt').optional().isString().trim(),
    body('seo.robotsIndex').optional().isBoolean(),
    body('seo.robotsFollow').optional().isBoolean(),
    body('meta').optional().isObject(),
  ],
  validateRequest,
  createBlogHandler,
);

router.get(
  '/:blogId',
  requireAdmin,
  [param('blogId').isMongoId()],
  validateRequest,
  getBlogHandler,
);

router.patch(
  '/:blogId',
  requireAdmin,
  [
    param('blogId').isMongoId(),
    body('title').optional().isString().trim().notEmpty().isLength({ max: 140 }),
    body('slug').optional().isString().trim().isLength({ min: 2, max: 160 }),
    body('excerpt').optional().isString().trim().isLength({ max: 400 }),
    body('contentHtml').optional().isString(),
    body('featuredImage').optional({ nullable: true }).isObject(),
    body('featuredImage.url').optional().isString().trim(),
    body('featuredImage.alt').optional().isString().trim(),
    body('tags').optional().isArray(),
    body('tags.*').optional().isString(),
    body('status').optional().isIn(['draft', 'published']),
    body('publishedAt').optional({ nullable: true }).isISO8601(),
    body('seo').optional().isObject(),
    body('seo.metaTitle').optional().isString().trim().isLength({ max: 140 }),
    body('seo.metaDescription').optional().isString().trim().isLength({ max: 400 }),
    body('seo.keywords').optional().isArray(),
    body('seo.keywords.*').optional().isString(),
    body('seo.canonicalUrl').optional().isString().trim(),
    body('seo.ogTitle').optional().isString().trim(),
    body('seo.ogDescription').optional().isString().trim(),
    body('seo.ogImage').optional().isObject(),
    body('seo.ogImage.url').optional().isString().trim(),
    body('seo.ogImage.alt').optional().isString().trim(),
    body('seo.twitterTitle').optional().isString().trim(),
    body('seo.twitterDescription').optional().isString().trim(),
    body('seo.twitterImage').optional().isObject(),
    body('seo.twitterImage.url').optional().isString().trim(),
    body('seo.twitterImage.alt').optional().isString().trim(),
    body('seo.robotsIndex').optional().isBoolean(),
    body('seo.robotsFollow').optional().isBoolean(),
    body('meta').optional().isObject(),
  ],
  validateRequest,
  updateBlogHandler,
);

router.delete(
  '/:blogId',
  requireAdmin,
  [param('blogId').isMongoId()],
  validateRequest,
  deleteBlogHandler,
);

export default router;


