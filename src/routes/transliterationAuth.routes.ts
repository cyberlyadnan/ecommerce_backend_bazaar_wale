import { Router } from 'express';
import { body } from 'express-validator';
import { anonymousAuthHandler } from '../controllers/transliterationAuth.controller';
import validateRequest from '../middlewares/validation.middleware';

/**
 * ISOLATED transliteration authentication routes
 * Completely separate from /api/auth (e-commerce routes)
 */
const router = Router();

/**
 * Anonymous authentication endpoint for transliteration API
 * POST /api/transliteration/auth/anonymous
 * Body: { deviceId: string }
 * Returns: { success: true, token: string, expiresIn: '24h' }
 */
router.post(
  '/anonymous',
  [
    body('deviceId')
      .isString()
      .trim()
      .notEmpty()
      .withMessage('deviceId is required and must be a non-empty string')
      .isLength({ min: 8, max: 128 })
      .withMessage('deviceId must be between 8 and 128 characters'),
  ],
  validateRequest,
  anonymousAuthHandler,
);

export default router;
