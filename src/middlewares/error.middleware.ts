import { NextFunction, Request, Response } from 'express';

import config from '../config';
import logger from '../config/logger';
import ApiError from '../utils/apiError';

/**
 * Helper function to determine if origin is allowed (same logic as CORS config)
 * This must match the CORS configuration in app.ts exactly
 */
const isOriginAllowed = (origin: string | undefined): boolean => {
  // Allow requests with no origin (mobile apps, Postman, etc.)
  if (!origin) {
    return true;
  }

  if (config.app.env === 'production') {
    const allowedOrigins = [
      process.env.FRONTEND_URL || 'https://bazaarwale.in',
      'https://www.bazaarwale.in',
      'https://bazaarwale.in', // Explicitly include both with and without www
    ];
    return allowedOrigins.includes(origin);
  }

  // In development, allow all origins
  return true;
};

/**
 * Helper function to set CORS headers on response
 */
const setCorsHeaders = (req: Request, res: Response) => {
  const origin = req.headers.origin;
  
  if (isOriginAllowed(origin)) {
    if (origin) {
      res.setHeader('Access-Control-Allow-Origin', origin);
    } else {
      res.setHeader('Access-Control-Allow-Origin', '*');
    }
    res.setHeader('Access-Control-Allow-Credentials', 'true');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, PATCH, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With, Accept, Origin');
  }
};

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export const errorHandler = (err: unknown, req: Request, res: Response, _next: NextFunction) => {
  let statusCode = 500;
  let message = 'Internal server error';

  if (err instanceof ApiError) {
    statusCode = err.statusCode;
    message = err.message;
  } else if (err instanceof Error) {
    message = err.message;
  }

  if (statusCode >= 500 || config.app.env !== 'production') {
    logger.error('Request failed', {
      err,
      path: req.path,
      method: req.method,
    });
  }

  // Set CORS headers before sending error response
  // This ensures 401 and other error responses are not blocked by CORS
  setCorsHeaders(req, res);

  res.status(statusCode).json({
    message,
    ...(config.app.env !== 'production' && err instanceof Error
      ? { stack: err.stack }
      : {}),
  });
};

export default errorHandler;

