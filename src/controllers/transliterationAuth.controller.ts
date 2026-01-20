import { NextFunction, Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import config from '../config';
import ApiError from '../utils/apiError';

/**
 * ISOLATED transliteration auth controller
 * Generates anonymous JWT tokens for transliteration API access
 * Completely separate from e-commerce authentication
 */

interface AnonymousAuthRequest {
  deviceId: string;
}

export const anonymousAuthHandler = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const { deviceId } = req.body as AnonymousAuthRequest;

    if (!deviceId || typeof deviceId !== 'string' || deviceId.trim().length === 0) {
      throw new ApiError(400, 'deviceId is required and must be a non-empty string');
    }

    // Validate deviceId format (basic validation)
    if (deviceId.length < 8 || deviceId.length > 128) {
      throw new ApiError(400, 'deviceId must be between 8 and 128 characters');
    }

    // Generate JWT token with 24 hour expiry
    // Uses TRANSLITERATION_JWT_SECRET (isolated from ecommerce)
    const payload = {
      deviceId: deviceId.trim(),
      scope: 'transliteration',
    };

    const token = jwt.sign(payload, config.transliteration.jwtSecret, {
      expiresIn: '24h',
    });

    res.json({
      success: true,
      token,
      expiresIn: '24h',
    });
  } catch (error) {
    next(error);
  }
};
