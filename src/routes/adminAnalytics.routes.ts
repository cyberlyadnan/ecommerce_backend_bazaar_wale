import { Router } from 'express';
import {
  getOverviewHandler,
  getTopProductsHandler,
  getProductViewCountsHandler,
  getVisitsOverTimeHandler,
  getTopPagesHandler,
  getSalesInsightsHandler,
  getRevenueOverTimeHandler,
} from '../controllers/analytics.controller';
import { requireAdmin } from '../middlewares/auth.middleware';

const router = Router();

router.use(requireAdmin);

router.get('/overview', getOverviewHandler);
router.get('/top-products', getTopProductsHandler);
router.get('/product-view-counts', getProductViewCountsHandler);
router.get('/visits-over-time', getVisitsOverTimeHandler);
router.get('/top-pages', getTopPagesHandler);
router.get('/sales-insights', getSalesInsightsHandler);
router.get('/revenue-over-time', getRevenueOverTimeHandler);

export default router;
