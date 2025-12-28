"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.validateExpectedDeliveryDate = exports.updateExpectedDeliveryDateHandler = exports.validateOrderStatus = exports.updateOrderStatusHandler = exports.getAdminOrderByIdHandler = exports.getAdminOrdersHandler = exports.getVendorOrdersHandler = exports.validatePaymentVerification = exports.validateShippingAddress = exports.getOrderByIdHandler = exports.getUserOrdersHandler = exports.webhookHandler = exports.verifyPaymentHandler = exports.createOrderHandler = exports.calculateOrderTotalsHandler = void 0;
const express_validator_1 = require("express-validator");
const orderService = __importStar(require("../services/order.service"));
const apiError_1 = __importDefault(require("../utils/apiError"));
/**
 * Calculate order totals (pre-checkout)
 * GET /api/orders/calculate
 */
const calculateOrderTotalsHandler = async (req, res, next) => {
    try {
        if (!req.user) {
            throw new apiError_1.default(401, 'Authentication required');
        }
        const calculation = await orderService.calculateOrderTotals(req.user._id.toString());
        res.json({
            success: true,
            calculation,
        });
    }
    catch (error) {
        next(error);
    }
};
exports.calculateOrderTotalsHandler = calculateOrderTotalsHandler;
/**
 * Create order and Razorpay order
 * POST /api/orders/create
 */
const createOrderHandler = async (req, res, next) => {
    try {
        if (!req.user) {
            throw new apiError_1.default(401, 'Authentication required');
        }
        const errors = (0, express_validator_1.validationResult)(req);
        if (!errors.isEmpty()) {
            throw new apiError_1.default(400, 'Validation failed');
        }
        const { shippingAddress } = req.body;
        // Validate shipping address
        if (!shippingAddress ||
            !shippingAddress.name ||
            !shippingAddress.phone ||
            !shippingAddress.line1 ||
            !shippingAddress.city ||
            !shippingAddress.state ||
            !shippingAddress.postalCode) {
            throw new apiError_1.default(400, 'Invalid shipping address');
        }
        const result = await orderService.createOrder(req.user._id.toString(), {
            shippingAddress,
        });
        res.json({
            success: true,
            order: result.order,
            razorpayOrder: result.razorpayOrder,
            message: 'Order created successfully',
        });
    }
    catch (error) {
        next(error);
    }
};
exports.createOrderHandler = createOrderHandler;
/**
 * Verify payment and complete order
 * POST /api/orders/:orderId/verify-payment
 */
const verifyPaymentHandler = async (req, res, next) => {
    try {
        if (!req.user) {
            throw new apiError_1.default(401, 'Authentication required');
        }
        const errors = (0, express_validator_1.validationResult)(req);
        if (!errors.isEmpty()) {
            throw new apiError_1.default(400, 'Validation failed');
        }
        const { orderId } = req.params;
        const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = req.body;
        if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
            throw new apiError_1.default(400, 'Missing payment verification data');
        }
        const order = await orderService.verifyAndCompletePayment(req.user._id.toString(), orderId, {
            razorpay_order_id,
            razorpay_payment_id,
            razorpay_signature,
        });
        res.json({
            success: true,
            order,
            message: 'Payment verified and order confirmed',
        });
    }
    catch (error) {
        next(error);
    }
};
exports.verifyPaymentHandler = verifyPaymentHandler;
/**
 * Razorpay webhook handler
 * POST /api/orders/webhook
 * This endpoint should be publicly accessible (no auth) but secured with webhook secret
 */
const webhookHandler = async (req, res, next) => {
    try {
        // Razorpay sends webhook events for payment status changes
        // In production, verify webhook signature using RAZORPAY_WEBHOOK_SECRET
        const event = req.body;
        // Handle different event types
        if (event.event === 'payment.captured') {
            const paymentId = event.payload.payment.entity.id;
            const orderId = event.payload.payment.entity.order_id;
            // Find order by Razorpay order ID
            const Order = (await Promise.resolve().then(() => __importStar(require('../models/Order.model')))).default;
            const order = await Order.findOne({ razorpayOrderId: orderId });
            if (order && order.paymentStatus === 'pending') {
                order.paymentStatus = 'paid';
                order.razorpayPaymentId = paymentId;
                if (order.status === 'created') {
                    order.status = 'vendor_shipped_to_warehouse';
                }
                await order.save();
            }
        }
        else if (event.event === 'payment.failed') {
            const orderId = event.payload.payment.entity.order_id;
            const Order = (await Promise.resolve().then(() => __importStar(require('../models/Order.model')))).default;
            const order = await Order.findOne({ razorpayOrderId: orderId });
            if (order) {
                order.paymentStatus = 'failed';
                await order.save();
            }
        }
        // Always return 200 to acknowledge webhook receipt
        res.status(200).json({ received: true });
    }
    catch (error) {
        // Log error but still return 200 to prevent Razorpay from retrying
        console.error('Webhook error:', error);
        res.status(200).json({ received: true, error: 'Processing failed' });
    }
};
exports.webhookHandler = webhookHandler;
/**
 * Get user orders
 * GET /api/orders
 */
const getUserOrdersHandler = async (req, res, next) => {
    try {
        if (!req.user) {
            throw new apiError_1.default(401, 'Authentication required');
        }
        const orders = await orderService.getUserOrders(req.user._id.toString());
        res.json({
            success: true,
            orders,
        });
    }
    catch (error) {
        next(error);
    }
};
exports.getUserOrdersHandler = getUserOrdersHandler;
/**
 * Get order by ID
 * GET /api/orders/:orderId
 */
const getOrderByIdHandler = async (req, res, next) => {
    try {
        if (!req.user) {
            throw new apiError_1.default(401, 'Authentication required');
        }
        const { orderId } = req.params;
        const order = await orderService.getOrderById(orderId, req.user._id.toString());
        res.json({
            success: true,
            order,
        });
    }
    catch (error) {
        next(error);
    }
};
exports.getOrderByIdHandler = getOrderByIdHandler;
// Validation middleware
exports.validateShippingAddress = [
    (0, express_validator_1.body)('shippingAddress.name')
        .trim()
        .notEmpty()
        .withMessage('Name is required')
        .isLength({ min: 2, max: 100 })
        .withMessage('Name must be between 2 and 100 characters'),
    (0, express_validator_1.body)('shippingAddress.phone')
        .trim()
        .notEmpty()
        .withMessage('Phone is required')
        .matches(/^[6-9]\d{9}$/)
        .withMessage('Invalid phone number'),
    (0, express_validator_1.body)('shippingAddress.line1')
        .trim()
        .notEmpty()
        .withMessage('Address line 1 is required')
        .isLength({ max: 200 })
        .withMessage('Address line 1 must be less than 200 characters'),
    (0, express_validator_1.body)('shippingAddress.city')
        .trim()
        .notEmpty()
        .withMessage('City is required')
        .isLength({ max: 100 })
        .withMessage('City must be less than 100 characters'),
    (0, express_validator_1.body)('shippingAddress.state')
        .trim()
        .notEmpty()
        .withMessage('State is required')
        .isLength({ max: 100 })
        .withMessage('State must be less than 100 characters'),
    (0, express_validator_1.body)('shippingAddress.postalCode')
        .trim()
        .notEmpty()
        .withMessage('Postal code is required')
        .matches(/^\d{6}$/)
        .withMessage('Invalid postal code (must be 6 digits)'),
    (0, express_validator_1.body)('shippingAddress.country')
        .optional()
        .trim()
        .isLength({ max: 100 })
        .withMessage('Country must be less than 100 characters'),
    (0, express_validator_1.body)('shippingAddress.line2')
        .optional()
        .trim()
        .isLength({ max: 200 })
        .withMessage('Address line 2 must be less than 200 characters'),
];
exports.validatePaymentVerification = [
    (0, express_validator_1.body)('razorpay_order_id')
        .trim()
        .notEmpty()
        .withMessage('Razorpay order ID is required'),
    (0, express_validator_1.body)('razorpay_payment_id')
        .trim()
        .notEmpty()
        .withMessage('Razorpay payment ID is required'),
    (0, express_validator_1.body)('razorpay_signature')
        .trim()
        .notEmpty()
        .withMessage('Razorpay signature is required'),
];
/**
 * Get vendor orders (without customer details)
 * GET /api/orders/vendor
 */
const getVendorOrdersHandler = async (req, res, next) => {
    try {
        if (!req.user || req.user.role !== 'vendor') {
            throw new apiError_1.default(403, 'Vendor access required');
        }
        const orders = await orderService.getVendorOrders(req.user._id.toString());
        res.json({
            success: true,
            orders,
        });
    }
    catch (error) {
        next(error);
    }
};
exports.getVendorOrdersHandler = getVendorOrdersHandler;
/**
 * Get all orders for admin (with full details)
 * GET /api/orders/admin?filter=all|admin_only&status=created|packed|shipped|...&search=term
 */
const getAdminOrdersHandler = async (req, res, next) => {
    try {
        if (!req.user || req.user.role !== 'admin') {
            throw new apiError_1.default(403, 'Admin access required');
        }
        const filter = req.query.filter === 'admin_only' ? 'admin_only' : 'all';
        const statusFilter = typeof req.query.status === 'string' ? req.query.status : undefined;
        const search = typeof req.query.search === 'string' ? req.query.search : undefined;
        const orders = await orderService.getAdminOrders(filter, statusFilter, search);
        res.json({
            success: true,
            orders,
        });
    }
    catch (error) {
        next(error);
    }
};
exports.getAdminOrdersHandler = getAdminOrdersHandler;
/**
 * Get order by ID for admin (with full details)
 * GET /api/orders/admin/:orderId
 */
const getAdminOrderByIdHandler = async (req, res, next) => {
    try {
        if (!req.user || req.user.role !== 'admin') {
            throw new apiError_1.default(403, 'Admin access required');
        }
        const { orderId } = req.params;
        const order = await orderService.getAdminOrderById(orderId);
        res.json({
            success: true,
            order,
        });
    }
    catch (error) {
        next(error);
    }
};
exports.getAdminOrderByIdHandler = getAdminOrderByIdHandler;
/**
 * Update order status
 * PATCH /api/orders/:orderId/status
 */
const updateOrderStatusHandler = async (req, res, next) => {
    try {
        if (!req.user) {
            throw new apiError_1.default(401, 'Authentication required');
        }
        const errors = (0, express_validator_1.validationResult)(req);
        if (!errors.isEmpty()) {
            throw new apiError_1.default(400, 'Validation failed');
        }
        const { orderId } = req.params;
        const { status } = req.body;
        if (!status) {
            throw new apiError_1.default(400, 'Status is required');
        }
        const role = req.user.role === 'admin' ? 'admin' : 'vendor';
        const order = await orderService.updateOrderStatus(orderId, status, req.user._id.toString(), role);
        res.json({
            success: true,
            order,
            message: 'Order status updated successfully',
        });
    }
    catch (error) {
        next(error);
    }
};
exports.updateOrderStatusHandler = updateOrderStatusHandler;
exports.validateOrderStatus = [
    (0, express_validator_1.body)('status')
        .trim()
        .notEmpty()
        .withMessage('Status is required')
        .isIn([
        'created',
        'vendor_shipped_to_warehouse',
        'received_in_warehouse',
        'packed',
        'shipped',
        'delivered',
        'cancelled',
    ])
        .withMessage('Invalid order status'),
];
/**
 * Update expected delivery date (admin only)
 * PATCH /api/orders/:orderId/expected-delivery-date
 */
const updateExpectedDeliveryDateHandler = async (req, res, next) => {
    try {
        if (!req.user || req.user.role !== 'admin') {
            throw new apiError_1.default(403, 'Admin access required');
        }
        const errors = (0, express_validator_1.validationResult)(req);
        if (!errors.isEmpty()) {
            throw new apiError_1.default(400, 'Validation failed');
        }
        const { orderId } = req.params;
        const { expectedDeliveryDate } = req.body;
        if (!expectedDeliveryDate) {
            throw new apiError_1.default(400, 'Expected delivery date is required');
        }
        const date = new Date(expectedDeliveryDate);
        if (isNaN(date.getTime())) {
            throw new apiError_1.default(400, 'Invalid date format');
        }
        const order = await orderService.updateExpectedDeliveryDate(orderId, date);
        res.json({
            success: true,
            order,
            message: 'Expected delivery date updated successfully',
        });
    }
    catch (error) {
        next(error);
    }
};
exports.updateExpectedDeliveryDateHandler = updateExpectedDeliveryDateHandler;
exports.validateExpectedDeliveryDate = [
    (0, express_validator_1.body)('expectedDeliveryDate')
        .notEmpty()
        .withMessage('Expected delivery date is required')
        .isISO8601()
        .withMessage('Invalid date format'),
];
