import { Request, Response, NextFunction } from 'express';
import { getAdminDashboardStats } from '../services/adminDashboard.service';

export const getAdminDashboardStatsHandler = async (
  _req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const stats = await getAdminDashboardStats();
    res.json({ stats });
  } catch (error) {
    next(error);
  }
};
