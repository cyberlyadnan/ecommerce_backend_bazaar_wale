import express from 'express';
import { body, param, query } from 'express-validator';

import { authenticate } from '../middlewares/auth.middleware';
import validateRequest from '../middlewares/validation.middleware';
import {
  adminCreatePayoutHandler,
  adminListPayoutsHandler,
  adminUpdatePayoutHandler,
  getCommissionHandler,
  updateCommissionHandler,
  vendorListPayoutsHandler,
  vendorSummaryHandler,
} from '../controllers/payment.controller';

const router = express.Router();

// -------- Admin --------
router.get('/admin/commission', authenticate(['admin']), getCommissionHandler);
router.put(
  '/admin/commission',
  authenticate(['admin']),
  [body('commissionPercent').isNumeric().custom((v) => Number(v) >= 0 && Number(v) <= 100)],
  validateRequest,
  updateCommissionHandler,
);

router.get(
  '/admin/payouts',
  authenticate(['admin']),
  [
    query('status').optional().isIn(['all', 'pending', 'processing', 'paid', 'rejected']),
    query('vendorId').optional().isString(),
    query('search').optional().isString(),
  ],
  validateRequest,
  adminListPayoutsHandler,
);

router.post(
  '/admin/payouts',
  authenticate(['admin']),
  [
    body('vendorId').isMongoId(),
    body('grossAmount').optional().isNumeric().custom((v) => Number(v) >= 0),
    body('ordersIncluded').optional().isArray(),
    body('ordersIncluded.*').optional().isMongoId(),
    body('commissionPercent').optional().isNumeric().custom((v) => Number(v) >= 0 && Number(v) <= 100),
    body('status').optional().isIn(['pending', 'processing', 'paid', 'rejected']),
    body('paymentMode').optional().isIn(['bank', 'upi', 'cash', 'other']),
    body('adminNotes').optional().isString().isLength({ max: 2000 }),
    body('paymentReference').optional().isString().isLength({ max: 200 }),
    body('scheduledAt').optional().isISO8601(),
  ],
  validateRequest,
  adminCreatePayoutHandler,
);

router.patch(
  '/admin/payouts/:payoutId',
  authenticate(['admin']),
  [
    param('payoutId').isMongoId(),
    body('status').optional().isIn(['pending', 'processing', 'paid', 'rejected']),
    body('paymentMode').optional().isIn(['bank', 'upi', 'cash', 'other']),
    body('adminNotes').optional().isString().isLength({ max: 2000 }),
    body('paymentReference').optional().isString().isLength({ max: 200 }),
    body('scheduledAt').optional({ nullable: true }).custom((v) => v === null || typeof v === 'string'),
    body('paidAt').optional({ nullable: true }).custom((v) => v === null || typeof v === 'string'),
  ],
  validateRequest,
  adminUpdatePayoutHandler,
);

// -------- Vendor --------
router.get('/vendor/summary', authenticate(['vendor']), vendorSummaryHandler);
router.get(
  '/vendor/payouts',
  authenticate(['vendor']),
  [query('status').optional().isIn(['all', 'pending', 'processing', 'paid', 'rejected'])],
  validateRequest,
  vendorListPayoutsHandler,
);

export default router;


