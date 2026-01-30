import { NextFunction, Request, Response } from 'express';
import * as subscriberService from '../services/subscriber.service';

export const subscribeHandler = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const metadata = {
      ipAddress: req.ip || req.socket.remoteAddress,
      userAgent: req.get('user-agent'),
      source: req.body.source || 'newsletter',
    };

    const subscriber = await subscriberService.subscribeEmail({
      email: req.body.email,
      metadata,
    });

    res.status(201).json({
      message: 'Thank you for subscribing! You will receive our latest updates.',
      subscriber: { email: subscriber.email, status: subscriber.status },
    });
  } catch (error) {
    next(error);
  }
};

export const listSubscribersHandler = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const status = typeof req.query.status === 'string' &&
      ['active', 'unsubscribed'].includes(req.query.status)
      ? (req.query.status as 'active' | 'unsubscribed')
      : undefined;
    const limit =
      typeof req.query.limit === 'string' && !Number.isNaN(Number.parseInt(req.query.limit, 10))
        ? Number.parseInt(req.query.limit, 10)
        : 50;
    const skip =
      typeof req.query.skip === 'string' && !Number.isNaN(Number.parseInt(req.query.skip, 10))
        ? Number.parseInt(req.query.skip, 10)
        : 0;

    const result = await subscriberService.listSubscribers({ status, limit, skip });
    res.json(result);
  } catch (error) {
    next(error);
  }
};
