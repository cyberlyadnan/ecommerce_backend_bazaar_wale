import { NextFunction, Request, Response } from 'express';
import { validationResult } from 'express-validator';

export const validateRequest = (req: Request, res: Response, next: NextFunction) => {
  const errors = validationResult(req);
  if (errors.isEmpty()) {
    return next();
  }

  return res.status(422).json({
    errors: errors.array().map((error) => ({
      field: 'path' in error ? error.path : error.type,
      message: error.msg,
    })),
  });
};

export default validateRequest;

