import { Request, Response, NextFunction } from 'express';
import { validationResult } from 'express-validator';
import { body } from 'express-validator';

import * as addressService from '../services/address.service';
import ApiError from '../utils/apiError';
import { Address } from '../models/User.model';

/**
 * Validation middleware for address creation/update
 */
export const validateAddress = [
  body('name').trim().notEmpty().withMessage('Name is required').isLength({ min: 2, max: 100 }),
  body('phone')
    .trim()
    .notEmpty()
    .withMessage('Phone is required')
    .matches(/^[6-9]\d{9}$/)
    .withMessage('Invalid phone number (must be 10 digits starting with 6-9)'),
  body('email').optional().trim().isEmail().withMessage('Invalid email address'),
  body('line1').trim().notEmpty().withMessage('Address line 1 is required').isLength({ max: 200 }),
  body('line2').optional().trim().isLength({ max: 200 }),
  body('city').trim().notEmpty().withMessage('City is required').isLength({ min: 2, max: 100 }),
  body('state').trim().notEmpty().withMessage('State is required').isLength({ min: 2, max: 100 }),
  body('country').optional().trim().isLength({ max: 100 }),
  body('postalCode')
    .trim()
    .notEmpty()
    .withMessage('Postal code is required')
    .matches(/^\d{6}$/)
    .withMessage('Invalid postal code (must be 6 digits)'),
  body('label').optional().trim().isLength({ max: 50 }),
  body('isDefault').optional().isBoolean(),
];

/**
 * Get all addresses for the authenticated user
 * GET /api/addresses
 */
export const getUserAddressesHandler = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    if (!req.user) {
      throw new ApiError(401, 'Authentication required');
    }

    const addresses = await addressService.getUserAddresses(req.user._id.toString());

    res.json({
      success: true,
      addresses,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Add a new address for the authenticated user
 * POST /api/addresses
 */
export const addAddressHandler = async (req: Request, res: Response, next: NextFunction) => {
  try {
    if (!req.user) {
      throw new ApiError(401, 'Authentication required');
    }

    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      throw new ApiError(400, 'Validation failed', errors.array());
    }

    const addressData: Omit<Address, 'isDefault'> & { isDefault?: boolean } = {
      label: req.body.label,
      name: req.body.name,
      phone: req.body.phone,
      email: req.body.email,
      line1: req.body.line1,
      line2: req.body.line2,
      city: req.body.city,
      state: req.body.state,
      country: req.body.country || 'India',
      postalCode: req.body.postalCode,
      isDefault: req.body.isDefault,
    };

    const addresses = await addressService.addUserAddress(req.user._id.toString(), addressData);

    res.status(201).json({
      success: true,
      addresses,
      message: 'Address added successfully',
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Update an address by index
 * PUT /api/addresses/:index
 */
export const updateAddressHandler = async (req: Request, res: Response, next: NextFunction) => {
  try {
    if (!req.user) {
      throw new ApiError(401, 'Authentication required');
    }

    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      throw new ApiError(400, 'Validation failed', errors.array());
    }

    const addressIndex = parseInt(req.params.index, 10);
    if (isNaN(addressIndex) || addressIndex < 0) {
      throw new ApiError(400, 'Invalid address index');
    }

    const updates: Partial<Address> = {};
    if (req.body.label !== undefined) updates.label = req.body.label;
    if (req.body.name !== undefined) updates.name = req.body.name;
    if (req.body.phone !== undefined) updates.phone = req.body.phone;
    if (req.body.email !== undefined) updates.email = req.body.email;
    if (req.body.line1 !== undefined) updates.line1 = req.body.line1;
    if (req.body.line2 !== undefined) updates.line2 = req.body.line2;
    if (req.body.city !== undefined) updates.city = req.body.city;
    if (req.body.state !== undefined) updates.state = req.body.state;
    if (req.body.country !== undefined) updates.country = req.body.country;
    if (req.body.postalCode !== undefined) updates.postalCode = req.body.postalCode;
    if (req.body.isDefault !== undefined) updates.isDefault = req.body.isDefault;

    const addresses = await addressService.updateUserAddress(
      req.user._id.toString(),
      addressIndex,
      updates,
    );

    res.json({
      success: true,
      addresses,
      message: 'Address updated successfully',
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Delete an address by index
 * DELETE /api/addresses/:index
 */
export const deleteAddressHandler = async (req: Request, res: Response, next: NextFunction) => {
  try {
    if (!req.user) {
      throw new ApiError(401, 'Authentication required');
    }

    const addressIndex = parseInt(req.params.index, 10);
    if (isNaN(addressIndex) || addressIndex < 0) {
      throw new ApiError(400, 'Invalid address index');
    }

    const addresses = await addressService.deleteUserAddress(req.user._id.toString(), addressIndex);

    res.json({
      success: true,
      addresses,
      message: 'Address deleted successfully',
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Set an address as default
 * PATCH /api/addresses/:index/default
 */
export const setDefaultAddressHandler = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    if (!req.user) {
      throw new ApiError(401, 'Authentication required');
    }

    const addressIndex = parseInt(req.params.index, 10);
    if (isNaN(addressIndex) || addressIndex < 0) {
      throw new ApiError(400, 'Invalid address index');
    }

    const addresses = await addressService.setDefaultAddress(req.user._id.toString(), addressIndex);

    res.json({
      success: true,
      addresses,
      message: 'Default address updated successfully',
    });
  } catch (error) {
    next(error);
  }
};
