import { Router } from 'express';
import { param, query } from 'express-validator';

import { getBlogBySlugPublicHandler, listBlogsPublicHandler } from '../controllers/blog.controller';
import validateRequest from '../middlewares/validation.middleware';

const router = Router();

// Public blog listing
router.get(
  '/',
  [
    query('search').optional().isString().trim().isLength({ min: 1, max: 120 }),
    query('tag').optional().isString().trim().isLength({ min: 1, max: 40 }),
    query('page').optional().isInt({ min: 1, max: 5000 }),
    query('limit').optional().isInt({ min: 1, max: 50 }),
  ],
  validateRequest,
  listBlogsPublicHandler,
);

// Public blog detail
router.get(
  '/:slug',
  [
    param('slug').isString().trim().notEmpty().isLength({ max: 160 }),
    query('trackView').optional().isIn(['0', '1', 'false', 'true']),
  ],
  validateRequest,
  getBlogBySlugPublicHandler,
);

export default router;


