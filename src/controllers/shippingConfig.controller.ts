import { NextFunction, Request, Response } from 'express';
import { validationResult } from 'express-validator';

import ApiError from '../utils/apiError';
import * as shippingConfigService from '../services/shippingConfig.service';

/**
 * GET /api/orders/admin/shipping-config
 */
export const getAdminShippingConfigHandler = async (req: Request, res: Response, next: NextFunction) => {
  try {
    if (!req.user || req.user.role !== 'admin') {
      throw new ApiError(403, 'Admin access required');
    }

    const config = await shippingConfigService.getShippingConfigDto();
    res.json({ success: true, config });
  } catch (error) {
    next(error);
  }
};

/**
 * PUT /api/orders/admin/shipping-config
 */
export const updateAdminShippingConfigHandler = async (req: Request, res: Response, next: NextFunction) => {
  try {
    if (!req.user || req.user.role !== 'admin') {
      throw new ApiError(403, 'Admin access required');
    }

    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      throw new ApiError(400, 'Validation failed', errors.array());
    }

    const { isEnabled, flatRate, freeShippingThreshold } = req.body;
    const updated = await shippingConfigService.updateShippingConfig(
      {
        isEnabled: Boolean(isEnabled),
        flatRate: Number(flatRate),
        freeShippingThreshold: Number(freeShippingThreshold),
      },
      req.user._id.toString(),
    );

    res.json({ success: true, config: updated, message: 'Shipping pricing updated' });
  } catch (error) {
    next(error);
  }
};


