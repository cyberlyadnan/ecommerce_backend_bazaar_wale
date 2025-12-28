"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const auth_middleware_1 = require("../middlewares/auth.middleware");
const order_controller_1 = require("../controllers/order.controller");
const shippingConfig_controller_1 = require("../controllers/shippingConfig.controller");
const express_validator_1 = require("express-validator");
const router = express_1.default.Router();
// Calculate order totals (pre-checkout)
router.get('/calculate', (0, auth_middleware_1.authenticate)(), order_controller_1.calculateOrderTotalsHandler);
// Create order and Razorpay order
router.post('/create', (0, auth_middleware_1.authenticate)(), order_controller_1.validateShippingAddress, order_controller_1.createOrderHandler);
// Verify payment
router.post('/:orderId/verify-payment', (0, auth_middleware_1.authenticate)(), order_controller_1.validatePaymentVerification, order_controller_1.verifyPaymentHandler);
// Get user orders
router.get('/', (0, auth_middleware_1.authenticate)(), order_controller_1.getUserOrdersHandler);
// Vendor orders (without customer details) - must come before /:orderId
router.get('/vendor', (0, auth_middleware_1.authenticate)(), order_controller_1.getVendorOrdersHandler);
// Admin orders (with full details) - must come before /:orderId
router.get('/admin', (0, auth_middleware_1.authenticate)(), order_controller_1.getAdminOrdersHandler);
// Admin shipping pricing configuration
router.get('/admin/shipping-config', (0, auth_middleware_1.authenticate)(['admin']), shippingConfig_controller_1.getAdminShippingConfigHandler);
router.put('/admin/shipping-config', (0, auth_middleware_1.authenticate)(['admin']), [
    (0, express_validator_1.body)('isEnabled').isBoolean(),
    (0, express_validator_1.body)('flatRate').isNumeric().custom((v) => Number(v) >= 0),
    (0, express_validator_1.body)('freeShippingThreshold').isNumeric().custom((v) => Number(v) >= 0),
], shippingConfig_controller_1.updateAdminShippingConfigHandler);
router.get('/admin/:orderId', (0, auth_middleware_1.authenticate)(), order_controller_1.getAdminOrderByIdHandler);
// Get order by ID (must come after specific routes)
router.get('/:orderId', (0, auth_middleware_1.authenticate)(), order_controller_1.getOrderByIdHandler);
// Update order status
router.patch('/:orderId/status', (0, auth_middleware_1.authenticate)(), order_controller_1.validateOrderStatus, order_controller_1.updateOrderStatusHandler);
// Update expected delivery date (admin only)
router.patch('/:orderId/expected-delivery-date', (0, auth_middleware_1.authenticate)(), order_controller_1.validateExpectedDeliveryDate, order_controller_1.updateExpectedDeliveryDateHandler);
// Webhook endpoint (no auth required, but should be secured with webhook secret in production)
router.post('/webhook', order_controller_1.webhookHandler);
exports.default = router;
