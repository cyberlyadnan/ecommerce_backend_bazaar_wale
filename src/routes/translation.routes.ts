import { Router } from 'express';
import { body } from 'express-validator';
import {
  translateEnglishToHindiHandler,
  translateHindiToEnglishHandler,
} from '../controllers/translation.controller';
// import { authenticateTranslationAPI } from '../middlewares/translationAuth.middleware'; // Temporarily disabled
import validateRequest from '../middlewares/validation.middleware';

const router = Router();

/**
 * English to Hindi Transliteration (Roman script to Devanagari script)
 * POST /api/translation/en-to-hi
 * Note: Authentication temporarily disabled
 */
router.post(
  '/en-to-hi',
  // authenticateTranslationAPI, // Temporarily disabled
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
 * POST /api/translation/hi-to-en
 * Note: Authentication temporarily disabled
 */
router.post(
  '/hi-to-en',
  // authenticateTranslationAPI, // Temporarily disabled
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
