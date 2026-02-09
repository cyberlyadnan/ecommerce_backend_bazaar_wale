import { Router } from 'express';
import { getAdminDashboardStatsHandler } from '../controllers/adminDashboard.controller';
import { requireAdmin } from '../middlewares/auth.middleware';

const router = Router();

router.get('/stats', requireAdmin, getAdminDashboardStatsHandler);

export default router;
