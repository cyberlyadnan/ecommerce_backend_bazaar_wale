import { NextFunction, Request, Response } from 'express';

import config from '../config';
import logger from '../config/logger';
import ApiError from '../utils/apiError';

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

  res.status(statusCode).json({
    message,
    ...(config.app.env !== 'production' && err instanceof Error
      ? { stack: err.stack }
      : {}),
  });
};

export default errorHandler;

