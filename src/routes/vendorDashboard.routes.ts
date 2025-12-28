import express from 'express';

import { authenticate } from '../middlewares/auth.middleware';
import { getVendorDashboardStatsHandler, getVendorProfileHandler, updateVendorProfileHandler } from '../controllers/vendorDashboard.controller';

const router = express.Router();

// Get vendor dashboard statistics
router.get('/stats', authenticate(['vendor']), getVendorDashboardStatsHandler);

// Vendor profile/settings
router.get('/profile', authenticate(['vendor']), getVendorProfileHandler);
router.patch('/profile', authenticate(['vendor']), updateVendorProfileHandler);

export default router;

