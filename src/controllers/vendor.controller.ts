import { NextFunction, Request, Response } from 'express';

import {
  approveVendorByAdmin,
  listVendors,
  rejectVendorByAdmin,
} from '../services/vendor.service';

export const listVendorsHandler = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const statusParam = req.query.status === 'all' ? 'all' : req.query.status;
    const status =
      statusParam === 'pending' ||
      statusParam === 'active' ||
      statusParam === 'rejected' ||
      statusParam === 'suspended'
        ? statusParam
        : 'all';

    const search = typeof req.query.search === 'string' ? req.query.search : undefined;
    const limit =
      typeof req.query.limit === 'string' && !Number.isNaN(Number.parseInt(req.query.limit, 10))
        ? Number.parseInt(req.query.limit, 10)
        : 20;
    const skip =
      typeof req.query.skip === 'string' && !Number.isNaN(Number.parseInt(req.query.skip, 10))
        ? Number.parseInt(req.query.skip, 10)
        : 0;

    const result = await listVendors({ status, search, limit, skip });
    res.json(result);
  } catch (error) {
    next(error);
  }
};

export const approveVendorHandler = async (req: Request, res: Response, next: NextFunction) => {
  try {
    if (!req.user) {
      throw new Error('Authentication required');
    }
    const vendor = await approveVendorByAdmin(req.params.vendorId, req.user._id.toString());
    res.json({ vendor });
  } catch (error) {
    next(error);
  }
};

export const rejectVendorHandler = async (req: Request, res: Response, next: NextFunction) => {
  try {
    if (!req.user) {
      throw new Error('Authentication required');
    }
    const vendor = await rejectVendorByAdmin(req.params.vendorId, req.user._id.toString(), req.body.reason);
    res.json({ vendor });
  } catch (error) {
    next(error);
  }
};


