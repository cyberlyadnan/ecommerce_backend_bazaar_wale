import { Router } from 'express';
import { body, query } from 'express-validator';
import {
  subscribeHandler,
  listSubscribersHandler,
} from '../controllers/subscriber.controller';
import { requireAdmin } from '../middlewares/auth.middleware';
import validateRequest from '../middlewares/validation.middleware';

const router = Router();

router.post(
  '/',
  [body('email').isEmail().normalizeEmail()],
  validateRequest,
  subscribeHandler,
);

router.get(
  '/',
  requireAdmin,
  [
    query('status').optional().isIn(['active', 'unsubscribed']),
    query('limit').optional().isInt({ min: 1, max: 200 }),
    query('skip').optional().isInt({ min: 0 }),
  ],
  validateRequest,
  listSubscribersHandler,
);

export default router;
