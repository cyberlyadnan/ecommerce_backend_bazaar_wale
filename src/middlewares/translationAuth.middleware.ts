import { NextFunction, Request, Response } from 'express';
import config from '../config';
import ApiError from '../utils/apiError';

/**
 * Middleware to authenticate translation API requests using API token
 * Token should be sent in the Authorization header as: Bearer <token>
 * or in the X-API-Token header
 */
export const authenticateTranslationAPI = (req: Request, _res: Response, next: NextFunction) => {
  try {
    // Get token from Authorization header or X-API-Token header
    const authHeader = req.headers.authorization;
    const apiTokenHeader = req.headers['x-api-token'];
    
    const token =
      (authHeader && authHeader.startsWith('Bearer ') && authHeader.slice(7)) ||
      (typeof apiTokenHeader === 'string' ? apiTokenHeader : null);

    if (!token) {
      throw new ApiError(401, 'Translation API token is required. Please provide token in Authorization header (Bearer <token>) or X-API-Token header');
    }

    // Compare with configured translation API token
    if (token !== config.translation.apiToken) {
      throw new ApiError(401, 'Invalid translation API token');
    }

    next();
  } catch (error) {
    next(error);
  }
};

export default authenticateTranslationAPI;
