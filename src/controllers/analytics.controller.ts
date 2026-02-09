import { Request, Response, NextFunction } from 'express';
import {
  recordAnalyticsEvent,
  getAnalyticsOverview,
  getTopViewedProducts,
  getProductViewCounts,
  getVisitsOverTime,
  getTopPages,
  getSalesInsights,
  getRevenueOverTime,
  type AnalyticsEventInput,
} from '../services/analytics.service';

export const recordEventHandler = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const body = req.body as Record<string, unknown>;
    const type = body?.type as string | undefined;
    if (!type || !['page_view', 'product_view', 'session_start'].includes(type)) {
      res.status(400).json({ message: 'Invalid or missing event type' });
      return;
    }
    const input: AnalyticsEventInput = {
      type: type as AnalyticsEventInput['type'],
      visitorId: typeof body.visitorId === 'string' ? body.visitorId : undefined,
      sessionId: typeof body.sessionId === 'string' ? body.sessionId : undefined,
      productId: typeof body.productId === 'string' ? body.productId : undefined,
      path: typeof body.path === 'string' ? body.path : undefined,
      referrer: typeof body.referrer === 'string' ? body.referrer : undefined,
      title: typeof body.title === 'string' ? body.title : undefined,
      userAgent: typeof req.headers['user-agent'] === 'string' ? req.headers['user-agent'] : undefined,
      metadata: typeof body.metadata === 'object' && body.metadata !== null ? (body.metadata as Record<string, unknown>) : undefined,
    };
    await recordAnalyticsEvent(input);
    res.status(204).send();
  } catch (error) {
    next(error);
  }
};

export const getOverviewHandler = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const periodDays = Math.min(365, Math.max(1, Number(req.query.days) || 30));
    const overview = await getAnalyticsOverview(periodDays);
    res.json(overview);
  } catch (error) {
    next(error);
  }
};

export const getTopProductsHandler = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const limit = Math.min(100, Math.max(1, Number(req.query.limit) || 20));
    const days = req.query.days != null ? Number(req.query.days) : undefined;
    const data = await getTopViewedProducts(limit, days);
    res.json({ products: data });
  } catch (error) {
    next(error);
  }
};

export const getProductViewCountsHandler = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const limit = Math.min(200, Math.max(1, Number(req.query.limit) || 50));
    const data = await getProductViewCounts(limit);
    res.json({ products: data });
  } catch (error) {
    next(error);
  }
};

export const getVisitsOverTimeHandler = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const days = Math.min(365, Math.max(1, Number(req.query.days) || 30));
    const data = await getVisitsOverTime(days);
    res.json({ data });
  } catch (error) {
    next(error);
  }
};

export const getTopPagesHandler = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const limit = Math.min(50, Math.max(1, Number(req.query.limit) || 15));
    const periodDays = Math.min(365, Math.max(1, Number(req.query.days) || 30));
    const data = await getTopPages(limit, periodDays);
    res.json({ pages: data });
  } catch (error) {
    next(error);
  }
};

export const getSalesInsightsHandler = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const limit = Math.min(100, Math.max(1, Number(req.query.limit) || 20));
    const data = await getSalesInsights(limit);
    res.json({ insights: data });
  } catch (error) {
    next(error);
  }
};

export const getRevenueOverTimeHandler = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const days = Math.min(365, Math.max(1, Number(req.query.days) || 30));
    const data = await getRevenueOverTime(days);
    res.json({ data });
  } catch (error) {
    next(error);
  }
};
