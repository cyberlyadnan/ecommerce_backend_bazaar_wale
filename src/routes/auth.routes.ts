import { Router } from 'express';
import { body } from 'express-validator';

import {
  approveVendorHandler,
  changePasswordHandler,
  firebaseLoginHandler,
  forgotPasswordHandler,
  getVendorApplicationStatusHandler,
  logoutHandler,
  passwordLoginHandler,
  profileHandler,
  refreshHandler,
  registerCustomerHandler,
  registerVendorHandler,
  registerWithFirebaseHandler,
  rejectVendorHandler,
  resetPasswordHandler,
  resetPasswordWithFirebaseHandler,
} from '../controllers/auth.controller';
import { authenticate, optionalAuthenticate, requireAdmin } from '../middlewares/auth.middleware';
import validateRequest from '../middlewares/validation.middleware';

const router = Router();

router.post(
  '/register/customer',
  [
    body('name').isString().trim().notEmpty(),
    body('email').optional().isEmail(),
    body('phone').optional().isMobilePhone('any'),
    body('password').optional().isLength({ min: 6 }),
  ],
  validateRequest,
  registerCustomerHandler,
);

router.post(
  '/register/vendor',
  optionalAuthenticate(), // Optional auth - if user is logged in, use their account
  [
    body('name').optional().isString().trim().notEmpty(), // Optional if user is logged in
    body('email').optional().isEmail(),
    body('phone')
      .optional()
      .isString()
      .custom((value) => {
        const digits = String(value).replace(/[^\d]/g, '');
        // accept empty or 10-15 digits for international formats
        if (!digits) return true;
        return digits.length >= 10 && digits.length <= 15;
      })
      .withMessage('Invalid phone number'),
    body('password')
      .optional({ values: 'falsy' }) // Field can be missing, null, undefined, or empty string
      .custom((value, { req }) => {
        // If user is authenticated, password is not required - skip validation completely
        if (req.user) {
          return true; // Skip password validation for authenticated users
        }
        // If user is not authenticated, password is required
        if (!value || typeof value !== 'string' || value.trim().length === 0) {
          throw new Error('Password is required when creating a new account');
        }
        // Password must be at least 6 characters
        if (value.length < 6) {
          throw new Error('Password must be at least 6 characters long');
        }
        return true;
      })
      .withMessage('Password validation failed'), // Required if user is not logged in, optional if logged in
    body('businessName').isString().trim().notEmpty(),
    body('gstNumber').isString().trim().notEmpty(),
    body('aadharNumber').isString().trim().notEmpty(),
    body('panNumber').isString().trim().notEmpty(),
    body('documents').isArray({ min: 4 }),
    body('documents.*.type').optional().isString(),
    body('documents.*.url').optional().isString(),
    body('documents.*.fileName').optional().isString(),
    body('documents').custom((docs) => {
      const list = Array.isArray(docs) ? docs : [];
      const requiredTypes = ['aadhaarFront', 'aadhaarBack', 'gstCertificate', 'panCard'];
      for (const t of requiredTypes) {
        const found = list.find((d: any) => d?.type === t && typeof d?.url === 'string' && d.url.trim());
        if (!found) return false;
      }
      return true;
    }).withMessage('Required documents missing (aadhaarFront, aadhaarBack, gstCertificate, panCard)'),
  ],
  validateRequest,
  registerVendorHandler,
);

router.post(
  '/register/firebase',
  [
    body('firebaseToken').isString().notEmpty(),
    body('role').optional().isIn(['customer', 'vendor']),
    body('name').optional().isString().trim(),
    body('profile.email').optional().isEmail(),
  ],
  validateRequest,
  registerWithFirebaseHandler,
);

router.post(
  '/login/password',
  [
    body('identifier').isString().notEmpty(),
    body('password').isString().notEmpty(),
    body('role').optional().isIn(['customer', 'vendor', 'admin']),
  ],
  validateRequest,
  passwordLoginHandler,
);

router.post(
  '/login/firebase',
  [
    body('firebaseToken').isString().notEmpty(),
    body('role').optional().isIn(['customer', 'vendor', 'admin']),
    body('name').optional().isString(),
  ],
  validateRequest,
  firebaseLoginHandler,
);

router.post('/refresh', refreshHandler);
router.post('/logout', logoutHandler);

router.post(
  '/password/forgot',
  [body('email').isEmail()],
  validateRequest,
  forgotPasswordHandler,
);

router.post(
  '/password/reset',
  [
    body('email').isEmail(),
    body('token').isString().notEmpty(),
    body('password').isLength({ min: 6 }),
  ],
  validateRequest,
  resetPasswordHandler,
);

router.post(
  '/password/reset/phone',
  [
    body('firebaseToken').isString().notEmpty(),
    body('password').isLength({ min: 6 }),
  ],
  validateRequest,
  resetPasswordWithFirebaseHandler,
);

router.post(
  '/password/change',
  authenticate(),
  [
    body('currentPassword').isString().notEmpty(),
    body('newPassword').isLength({ min: 6 }),
  ],
  validateRequest,
  changePasswordHandler,
);

router.get('/profile', authenticate(), profileHandler);
router.get('/vendor-application/status', authenticate(), getVendorApplicationStatusHandler);

router.post(
  '/vendors/:vendorId/approve',
  requireAdmin,
  validateRequest,
  approveVendorHandler,
);

router.post(
  '/vendors/:vendorId/reject',
  requireAdmin,
  [body('reason').optional().isString()],
  validateRequest,
  rejectVendorHandler,
);

export default router;

