import { NextFunction, Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import multer from 'multer';

import config from '../config';
import User, { UserDocument, UserRole } from '../models/User.model';
import ApiError from '../utils/apiError';

interface JwtPayload {
  sub: string;
  role: UserRole;
  sessionId?: string;
}

declare module 'express-serve-static-core' {
  // eslint-disable-next-line @typescript-eslint/no-empty-interface
  interface Request {
    user?: UserDocument;
    tokenPayload?: JwtPayload;
    file?: Express.Multer.File;
  }
}

export const authenticate =
  (allowedRoles?: UserRole[]) => async (req: Request, _res: Response, next: NextFunction) => {
    try {
      const authHeader = req.headers.authorization;
      const token =
        (authHeader && authHeader.startsWith('Bearer ') && authHeader.slice(7)) ||
        req.cookies.accessToken;

      if (!token) {
        throw new ApiError(401, 'Authentication required');
      }

      let payload: JwtPayload;
      try {
        payload = jwt.verify(token, config.jwt.accessSecret) as JwtPayload;
      } catch {
        throw new ApiError(401, 'Invalid or expired token');
      }
      const user = await User.findById(payload.sub);

      if (!user || user.isDeleted) {
        throw new ApiError(401, 'User not found');
      }

      if (allowedRoles && !allowedRoles.includes(user.role)) {
        throw new ApiError(403, 'You do not have permission to perform this action');
      }

      req.user = user;
      req.tokenPayload = payload;
      next();
    } catch (error) {
      next(error);
    }
  };

export const requireAdmin = authenticate(['admin']);
export const requireVendor = authenticate(['vendor']);
export const requireCustomer = authenticate(['customer']);

/**
 * Optional authentication middleware - doesn't throw if no token is provided
 * Sets req.user if token is valid, otherwise continues without setting it
 */
export const optionalAuthenticate =
  () => async (req: Request, _res: Response, next: NextFunction) => {
    try {
      const authHeader = req.headers.authorization;
      const token =
        (authHeader && authHeader.startsWith('Bearer ') && authHeader.slice(7)) ||
        req.cookies.accessToken;

      if (!token) {
        if (process.env.NODE_ENV === 'development') {
          console.log('[optionalAuthenticate] No token found', {
            hasAuthHeader: !!authHeader,
            authHeaderValue: authHeader ? authHeader.substring(0, 20) + '...' : null,
            hasCookie: !!req.cookies.accessToken,
          });
        }
        return next();
      }

      let payload: JwtPayload;
      try {
        payload = jwt.verify(token, config.jwt.accessSecret) as JwtPayload;
      } catch (error) {
        if (process.env.NODE_ENV === 'development') {
          console.log('[optionalAuthenticate] Token verification failed', {
            error: error instanceof Error ? error.message : 'Unknown error',
          });
        }
        return next();
      }

      const user = await User.findById(payload.sub);

      if (user && !user.isDeleted) {
        req.user = user;
        req.tokenPayload = payload;
        if (process.env.NODE_ENV === 'development') {
          console.log('[optionalAuthenticate] User authenticated', {
            userId: user._id.toString(),
            email: user.email,
            role: user.role,
          });
        }
      } else {
        if (process.env.NODE_ENV === 'development') {
          console.log('[optionalAuthenticate] User not found or deleted', {
            userId: payload.sub,
            userFound: !!user,
            isDeleted: user?.isDeleted,
          });
        }
      }

      next();
    } catch (error) {
      next(error);
    }
  };

export default {
  authenticate,
  optionalAuthenticate,
  requireAdmin,
  requireVendor,
  requireCustomer,
};

