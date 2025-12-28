import { NextFunction, Request, Response } from 'express';
import { validationResult } from 'express-validator';

import ApiError from '../utils/apiError';
import { getCommissionPercent, setCommissionPercent } from '../services/commissionConfig.service';
import * as payoutService from '../services/payout.service';

// -------- Admin: Commission --------
export const getCommissionHandler = async (req: Request, res: Response, next: NextFunction) => {
  try {
    if (!req.user || req.user.role !== 'admin') throw new ApiError(403, 'Admin access required');
    const commissionPercent = await getCommissionPercent();
    res.json({ success: true, commissionPercent });
  } catch (e) {
    next(e);
  }
};

export const updateCommissionHandler = async (req: Request, res: Response, next: NextFunction) => {
  try {
    if (!req.user || req.user.role !== 'admin') throw new ApiError(403, 'Admin access required');
    const errors = validationResult(req);
    if (!errors.isEmpty()) throw new ApiError(400, 'Validation failed');

    const commissionPercent = Number(req.body.commissionPercent);
    const updated = await setCommissionPercent(commissionPercent, req.user._id.toString());
    res.json({ success: true, commissionPercent: updated, message: 'Commission updated' });
  } catch (e) {
    next(e);
  }
};

// -------- Admin: Payouts --------
export const adminListPayoutsHandler = async (req: Request, res: Response, next: NextFunction) => {
  try {
    if (!req.user || req.user.role !== 'admin') throw new ApiError(403, 'Admin access required');
    const status = typeof req.query.status === 'string' ? req.query.status : undefined;
    const vendorId = typeof req.query.vendorId === 'string' ? req.query.vendorId : undefined;
    const search = typeof req.query.search === 'string' ? req.query.search : undefined;

    const payouts = await payoutService.adminListPayouts({
      status: (status as any) || 'all',
      vendorId,
      search,
    });

    res.json({ success: true, payouts });
  } catch (e) {
    next(e);
  }
};

export const adminCreatePayoutHandler = async (req: Request, res: Response, next: NextFunction) => {
  try {
    if (!req.user || req.user.role !== 'admin') throw new ApiError(403, 'Admin access required');
    const errors = validationResult(req);
    if (!errors.isEmpty()) throw new ApiError(400, 'Validation failed');

    const payout = await payoutService.adminCreatePayout(req.body, req.user._id.toString());
    res.json({ success: true, payout, message: 'Payout created' });
  } catch (e) {
    next(e);
  }
};

export const adminUpdatePayoutHandler = async (req: Request, res: Response, next: NextFunction) => {
  try {
    if (!req.user || req.user.role !== 'admin') throw new ApiError(403, 'Admin access required');
    const errors = validationResult(req);
    if (!errors.isEmpty()) throw new ApiError(400, 'Validation failed');

    const { payoutId } = req.params;
    const payout = await payoutService.adminUpdatePayout(payoutId, req.body, req.user._id.toString());
    res.json({ success: true, payout, message: 'Payout updated' });
  } catch (e) {
    next(e);
  }
};

// -------- Vendor --------
export const vendorSummaryHandler = async (req: Request, res: Response, next: NextFunction) => {
  try {
    if (!req.user || req.user.role !== 'vendor') throw new ApiError(403, 'Vendor access required');
    const summary = await payoutService.vendorPaymentsSummary(req.user._id.toString());
    res.json({ success: true, summary });
  } catch (e) {
    next(e);
  }
};

export const vendorListPayoutsHandler = async (req: Request, res: Response, next: NextFunction) => {
  try {
    if (!req.user || req.user.role !== 'vendor') throw new ApiError(403, 'Vendor access required');
    const status = typeof req.query.status === 'string' ? req.query.status : undefined;
    const payouts = await payoutService.vendorListPayouts(req.user._id.toString(), (status as any) || 'all');
    res.json({ success: true, payouts });
  } catch (e) {
    next(e);
  }
};


