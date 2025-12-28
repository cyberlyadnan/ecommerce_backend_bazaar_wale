import { NextFunction, Request, Response } from 'express';

import ApiError from '../utils/apiError';
import { getVendorDashboardStats } from '../services/vendorDashboard.service';
import { getVendorProfileWithDocs, updateVendorBasicProfile } from '../services/vendorProfile.service';

/**
 * Get vendor dashboard statistics
 * GET /api/vendor/dashboard/stats
 */
export const getVendorDashboardStatsHandler = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    if (!req.user) {
      throw new ApiError(401, 'Authentication required');
    }

    if (req.user.role !== 'vendor') {
      throw new ApiError(403, 'Vendor access required');
    }

    const vendorId = req.user._id.toString();
    const stats = await getVendorDashboardStats(vendorId);

    res.json({
      success: true,
      stats,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get vendor settings/profile (includes verification documents)
 * GET /api/vendor/dashboard/profile
 */
export const getVendorProfileHandler = async (req: Request, res: Response, next: NextFunction) => {
  try {
    if (!req.user) throw new ApiError(401, 'Authentication required');
    if (req.user.role !== 'vendor') throw new ApiError(403, 'Vendor access required');

    const data = await getVendorProfileWithDocs(req.user._id.toString());
    res.json({ success: true, ...data });
  } catch (e) {
    next(e);
  }
};

/**
 * Update vendor basic profile (editable fields only)
 * PATCH /api/vendor/dashboard/profile
 */
export const updateVendorProfileHandler = async (req: Request, res: Response, next: NextFunction) => {
  try {
    if (!req.user) throw new ApiError(401, 'Authentication required');
    if (req.user.role !== 'vendor') throw new ApiError(403, 'Vendor access required');

    const vendor = await updateVendorBasicProfile(req.user._id.toString(), { name: req.body?.name });
    res.json({ success: true, vendor, message: 'Profile updated' });
  } catch (e) {
    next(e);
  }
};

