import { Router } from 'express';
import { body, param, query } from 'express-validator';

import {
  createContactHandler,
  deleteContactHandler,
  getContactHandler,
  listContactsHandler,
  updateContactHandler,
} from '../controllers/contact.controller';
import { requireAdmin } from '../middlewares/auth.middleware';
import validateRequest from '../middlewares/validation.middleware';

const router = Router();

// Public route - anyone can submit a contact form
const phoneValidator = (val: string) => {
  if (!val || !val.trim()) return true;
  const digits = val.replace(/\D/g, '');
  if (digits.length === 10 && /^[6-9]/.test(digits)) return true;
  if (digits.length === 12 && digits.startsWith('91') && /^91[6-9]/.test(digits)) return true;
  if (digits.length >= 10 && digits.length <= 15 && !digits.startsWith('0')) return true;
  throw new Error('Invalid phone number. Use 10-digit Indian (e.g. 9876543210) or international format.');
};

router.post(
  '/',
  [
    body('name').isString().trim().notEmpty().isLength({ min: 2, max: 100 }),
    body('email').isEmail().normalizeEmail(),
    body('phone').optional().custom(phoneValidator),
    body('subject').isString().trim().notEmpty().isLength({ min: 3, max: 200 }),
    body('message').isString().trim().notEmpty().isLength({ min: 10, max: 5000 }),
  ],
  validateRequest,
  createContactHandler,
);

// Admin routes - require authentication
router.get(
  '/',
  requireAdmin,
  [
    query('status').optional().isIn(['new', 'read', 'replied', 'closed']),
    query('limit').optional().isInt({ min: 1, max: 100 }),
    query('skip').optional().isInt({ min: 0 }),
  ],
  validateRequest,
  listContactsHandler,
);

router.get(
  '/:contactId',
  requireAdmin,
  [param('contactId').isMongoId()],
  validateRequest,
  getContactHandler,
);

router.patch(
  '/:contactId',
  requireAdmin,
  [
    param('contactId').isMongoId(),
    body('status').optional().isIn(['new', 'read', 'replied', 'closed']),
    body('adminResponse').optional().isString().trim().isLength({ min: 1, max: 5000 }),
  ],
  validateRequest,
  updateContactHandler,
);

router.delete(
  '/:contactId',
  requireAdmin,
  [param('contactId').isMongoId()],
  validateRequest,
  deleteContactHandler,
);

export default router;

