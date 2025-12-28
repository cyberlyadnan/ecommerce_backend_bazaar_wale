import express from 'express';

import { authenticate } from '../middlewares/auth.middleware';
import {
  calculateOrderTotalsHandler,
  createOrderHandler,
  getOrderByIdHandler,
  getUserOrdersHandler,
  getVendorOrdersHandler,
  getAdminOrdersHandler,
  getAdminOrderByIdHandler,
  updateOrderStatusHandler,
  updateExpectedDeliveryDateHandler,
  validateExpectedDeliveryDate,
  validateOrderStatus,
  validatePaymentVerification,
  validateShippingAddress,
  verifyPaymentHandler,
  webhookHandler,
} from '../controllers/order.controller';
import { getAdminShippingConfigHandler, updateAdminShippingConfigHandler } from '../controllers/shippingConfig.controller';
import { body } from 'express-validator';

const router = express.Router();

// Calculate order totals (pre-checkout)
router.get('/calculate', authenticate(), calculateOrderTotalsHandler);

// Create order and Razorpay order
router.post('/create', authenticate(), validateShippingAddress, createOrderHandler);

// Verify payment
router.post(
  '/:orderId/verify-payment',
  authenticate(),
  validatePaymentVerification,
  verifyPaymentHandler,
);

// Get user orders
router.get('/', authenticate(), getUserOrdersHandler);

// Vendor orders (without customer details) - must come before /:orderId
router.get('/vendor', authenticate(), getVendorOrdersHandler);

// Admin orders (with full details) - must come before /:orderId
router.get('/admin', authenticate(), getAdminOrdersHandler);

// Admin shipping pricing configuration
router.get('/admin/shipping-config', authenticate(['admin']), getAdminShippingConfigHandler);
router.put(
  '/admin/shipping-config',
  authenticate(['admin']),
  [
    body('isEnabled').isBoolean(),
    body('flatRate').isNumeric().custom((v) => Number(v) >= 0),
    body('freeShippingThreshold').isNumeric().custom((v) => Number(v) >= 0),
  ],
  updateAdminShippingConfigHandler,
);

router.get('/admin/:orderId', authenticate(), getAdminOrderByIdHandler);

// Get order by ID (must come after specific routes)
router.get('/:orderId', authenticate(), getOrderByIdHandler);

// Update order status
router.patch('/:orderId/status', authenticate(), validateOrderStatus, updateOrderStatusHandler);

// Update expected delivery date (admin only)
router.patch(
  '/:orderId/expected-delivery-date',
  authenticate(),
  validateExpectedDeliveryDate,
  updateExpectedDeliveryDateHandler,
);

// Webhook endpoint (no auth required, but should be secured with webhook secret in production)
router.post('/webhook', webhookHandler);

export default router;

