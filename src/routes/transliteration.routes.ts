import { Router } from 'express';
import { body } from 'express-validator';
import rateLimit from 'express-rate-limit';
import {
  translateEnglishToHindiHandler,
  translateHindiToEnglishHandler,
} from '../controllers/translation.controller';
import { transliterationAuthMiddleware } from '../middlewares/transliterationAuth.middleware';
import validateRequest from '../middlewares/validation.middleware';

/**
 * ISOLATED transliteration API routes
 * Secured with transliterationAuthMiddleware (separate from e-commerce JWT)
 * Rate limited to 20 requests per minute per IP
 */
const router = Router();

// Rate limiting: 20 requests per minute per IP
// Isolated to transliteration routes only
const transliterationRateLimit = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 20, // 20 requests per minute
  message: 'Too many transliteration requests. Please try again later.',
  standardHeaders: true,
  legacyHeaders: false,
  // Use IP address for rate limiting
  keyGenerator: (req) => {
    // Try to get IP from various sources
    return (
      (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() ||
      (req.headers['x-real-ip'] as string) ||
      req.socket.remoteAddress ||
      'unknown'
    );
  },
});

// Apply rate limiting to all transliteration routes
router.use(transliterationRateLimit);

/**
 * English to Hindi Transliteration (Roman script to Devanagari script)
 * POST /api/transliteration/en-hi
 * Requires: Authorization: Bearer <transliteration-token>
 */
router.post(
  '/en-hi',
  transliterationAuthMiddleware,
  [
    body('text')
      .isString()
      .trim()
      .notEmpty()
      .withMessage('Text is required and must be a non-empty string')
      .isLength({ min: 1, max: 5000 })
      .withMessage('Text must be between 1 and 5000 characters'),
  ],
  validateRequest,
  translateEnglishToHindiHandler,
);

/**
 * Hindi to English Transliteration (Devanagari script to Roman script)
 * POST /api/transliteration/hi-en
 * Requires: Authorization: Bearer <transliteration-token>
 */
router.post(
  '/hi-en',
  transliterationAuthMiddleware,
  [
    body('text')
      .isString()
      .trim()
      .notEmpty()
      .withMessage('Text is required and must be a non-empty string')
      .isLength({ min: 1, max: 5000 })
      .withMessage('Text must be between 1 and 5000 characters'),
  ],
  validateRequest,
  translateHindiToEnglishHandler,
);

export default router;
