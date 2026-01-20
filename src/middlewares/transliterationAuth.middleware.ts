import { NextFunction, Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import config from '../config';
import ApiError from '../utils/apiError';

/**
 * ISOLATED transliteration authentication middleware
 * This is completely separate from the e-commerce JWT system
 * Uses TRANSLITERATION_JWT_SECRET (not JWT_ACCESS_SECRET)
 */
interface TransliterationJwtPayload {
  deviceId: string;
  scope: string;
  iat?: number;
  exp?: number;
}

declare module 'express-serve-static-core' {
  interface Request {
    transliterationDeviceId?: string;
  }
}

export const transliterationAuthMiddleware = (
  req: Request,
  _res: Response,
  next: NextFunction,
) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new ApiError(401, 'Transliteration authentication required');
    }

    const token = authHeader.slice(7);

    if (!token) {
      throw new ApiError(401, 'Transliteration token is required');
    }

    let payload: TransliterationJwtPayload;
    try {
      // Use TRANSLITERATION_JWT_SECRET (isolated from ecommerce JWT)
      payload = jwt.verify(token, config.transliteration.jwtSecret) as TransliterationJwtPayload;
    } catch (error) {
      throw new ApiError(401, 'Invalid or expired transliteration token');
    }

    // Verify scope is for transliteration
    if (payload.scope !== 'transliteration') {
      throw new ApiError(403, 'Invalid token scope for transliteration API');
    }

    // Attach deviceId to request (isolated namespace, won't conflict with req.user)
    req.transliterationDeviceId = payload.deviceId;

    next();
  } catch (error) {
    next(error);
  }
};

export default transliterationAuthMiddleware;
