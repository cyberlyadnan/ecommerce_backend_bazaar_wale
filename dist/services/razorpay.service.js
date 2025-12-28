"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getOrderDetails = exports.getPaymentDetails = exports.verifyPaymentSignature = exports.createRazorpayOrder = void 0;
const razorpay_1 = __importDefault(require("razorpay"));
const crypto_1 = __importDefault(require("crypto"));
const config_1 = __importDefault(require("../config"));
const apiError_1 = __importDefault(require("../utils/apiError"));
// Initialize Razorpay instance
const razorpay = new razorpay_1.default({
    key_id: config_1.default.razorpay.keyId,
    key_secret: config_1.default.razorpay.keySecret,
});
/**
 * Create a Razorpay order
 * Amount should be in paise (INR * 100)
 */
const createRazorpayOrder = async (options) => {
    if (!config_1.default.razorpay.keyId || !config_1.default.razorpay.keySecret) {
        throw new apiError_1.default(500, 'Razorpay configuration is missing');
    }
    if (options.amount < 100) {
        throw new apiError_1.default(400, 'Minimum order amount is ₹1.00 (100 paise)');
    }
    try {
        const orderOptions = {
            amount: options.amount, // Amount in paise
            currency: options.currency || 'INR',
            receipt: options.receipt || `receipt_${Date.now()}`,
            notes: options.notes || {},
        };
        const order = await razorpay.orders.create(orderOptions);
        return order;
    }
    catch (error) {
        console.error('Razorpay order creation error:', error);
        throw new apiError_1.default(500, error?.error?.description || 'Failed to create Razorpay order');
    }
};
exports.createRazorpayOrder = createRazorpayOrder;
/**
 * Verify Razorpay payment signature
 * This is critical for security - always verify on backend
 */
const verifyPaymentSignature = (params) => {
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = params;
    if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
        return false;
    }
    // Create the signature string
    const signatureString = `${razorpay_order_id}|${razorpay_payment_id}`;
    // Generate expected signature using HMAC SHA256
    const expectedSignature = crypto_1.default
        .createHmac('sha256', config_1.default.razorpay.keySecret)
        .update(signatureString)
        .digest('hex');
    // Use constant-time comparison to prevent timing attacks
    return crypto_1.default.timingSafeEqual(Buffer.from(razorpay_signature), Buffer.from(expectedSignature));
};
exports.verifyPaymentSignature = verifyPaymentSignature;
/**
 * Fetch payment details from Razorpay
 */
const getPaymentDetails = async (paymentId) => {
    try {
        const payment = await razorpay.payments.fetch(paymentId);
        return payment;
    }
    catch (error) {
        console.error('Razorpay fetch payment error:', error);
        throw new apiError_1.default(500, error?.error?.description || 'Failed to fetch payment details');
    }
};
exports.getPaymentDetails = getPaymentDetails;
/**
 * Fetch order details from Razorpay
 */
const getOrderDetails = async (orderId) => {
    try {
        const order = await razorpay.orders.fetch(orderId);
        return order;
    }
    catch (error) {
        console.error('Razorpay fetch order error:', error);
        throw new apiError_1.default(500, error?.error?.description || 'Failed to fetch order details');
    }
};
exports.getOrderDetails = getOrderDetails;
exports.default = {
    createRazorpayOrder: exports.createRazorpayOrder,
    verifyPaymentSignature: exports.verifyPaymentSignature,
    getPaymentDetails: exports.getPaymentDetails,
    getOrderDetails: exports.getOrderDetails,
};
