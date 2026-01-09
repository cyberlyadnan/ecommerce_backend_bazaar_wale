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
exports.updateExpectedDeliveryDate = exports.updateOrderStatus = exports.getAdminOrderById = exports.getAdminOrders = exports.getVendorOrders = exports.getOrderById = exports.getUserOrders = exports.verifyAndCompletePayment = exports.createOrder = exports.calculateOrderTotals = void 0;
const mongoose_1 = __importDefault(require("mongoose"));
const Cart_model_1 = __importDefault(require("../models/Cart.model"));
const Order_model_1 = __importDefault(require("../models/Order.model"));
const Product_model_1 = __importDefault(require("../models/Product.model"));
const User_model_1 = __importDefault(require("../models/User.model"));
const apiError_1 = __importDefault(require("../utils/apiError"));
const razorpayService = __importStar(require("./razorpay.service"));
const shippingConfig_service_1 = require("./shippingConfig.service");
/**
 * Calculate order totals from cart items
 * All calculations happen on backend for security
 */
const calculateOrderTotals = async (userId) => {
    const cart = await Cart_model_1.default.findOne({ userId: new mongoose_1.default.Types.ObjectId(userId) })
        .populate('items.productId')
        .lean();
    if (!cart || !cart.items || cart.items.length === 0) {
        throw new apiError_1.default(400, 'Cart is empty');
    }
    const items = [];
    let subtotal = 0;
    let totalTax = 0;
    // Process each cart item
    for (const cartItem of cart.items) {
        const product = cartItem.productId;
        if (!product) {
            throw new apiError_1.default(404, `Product not found for item: ${cartItem.title}`);
        }
        // Verify product is active and in stock
        if (!product.isActive) {
            throw new apiError_1.default(400, `Product "${product.title}" is not available`);
        }
        if (product.stock < cartItem.qty) {
            throw new apiError_1.default(400, `Insufficient stock for "${product.title}". Available: ${product.stock}, Requested: ${cartItem.qty}`);
        }
        // Get vendor information
        const vendor = await User_model_1.default.findById(cartItem.vendorId).lean();
        if (!vendor) {
            throw new apiError_1.default(404, `Vendor not found for product: ${product.title}`);
        }
        // Calculate item total (before tax)
        const itemTotal = cartItem.pricePerUnit * cartItem.qty;
        subtotal += itemTotal;
        // Get tax information from product (default to 18% if not set)
        const taxPercentage = product.taxPercentage ?? 18;
        const taxCode = product.taxCode || 'GST';
        // Calculate tax for this specific item
        const itemTaxAmount = Math.round((itemTotal * taxPercentage) / 100);
        totalTax += itemTaxAmount;
        items.push({
            productId: new mongoose_1.default.Types.ObjectId((typeof cartItem.productId === 'object' && cartItem.productId && '_id' in cartItem.productId)
                ? cartItem.productId._id.toString()
                : cartItem.productId.toString()),
            title: cartItem.title,
            sku: product.sku,
            vendorId: new mongoose_1.default.Types.ObjectId(cartItem.vendorId),
            vendorSnapshot: {
                vendorName: vendor.businessName || vendor.name,
                vendorPhone: vendor.phone,
            },
            qty: cartItem.qty,
            pricePerUnit: cartItem.pricePerUnit,
            totalPrice: itemTotal,
            taxCode,
            taxPercentage,
            taxAmount: itemTaxAmount,
        });
    }
    // Calculate shipping cost (admin-configurable global pricing)
    const shippingConfig = await (0, shippingConfig_service_1.getShippingConfigDto)();
    const shippingCost = shippingConfig.isEnabled
        ? subtotal >= shippingConfig.freeShippingThreshold
            ? 0
            : Math.max(0, shippingConfig.flatRate)
        : 0;
    // Total tax is sum of all item taxes
    const tax = totalTax;
    // Total amount
    const total = subtotal + shippingCost + tax;
    return {
        subtotal,
        shippingCost,
        tax,
        total,
        items,
    };
};
exports.calculateOrderTotals = calculateOrderTotals;
/**
 * Generate unique order number
 */
const generateOrderNumber = async () => {
    const date = new Date();
    const dateStr = date.toISOString().slice(0, 10).replace(/-/g, '');
    const random = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
    const orderNumber = `ORD-${dateStr}-${random}`;
    // Check if order number already exists
    const existing = await Order_model_1.default.findOne({ orderNumber });
    if (existing) {
        // Retry with new random number
        return generateOrderNumber();
    }
    return orderNumber;
};
/**
 * Create order from cart
 */
const createOrder = async (userId, input) => {
    // Calculate order totals (validates cart and products)
    const calculation = await (0, exports.calculateOrderTotals)(userId);
    // Generate order number
    const orderNumber = await generateOrderNumber();
    // Create Razorpay order if not provided
    let razorpayOrder;
    if (!input.razorpayOrderId) {
        razorpayOrder = await razorpayService.createRazorpayOrder({
            amount: calculation.total * 100, // Convert to paise
            currency: 'INR',
            receipt: orderNumber,
            notes: {
                userId: userId,
                orderNumber: orderNumber,
            },
        });
    }
    else {
        // Verify the provided Razorpay order exists and matches amount
        const existingOrder = await razorpayService.getOrderDetails(input.razorpayOrderId);
        const expectedAmount = calculation.total * 100;
        if (existingOrder.amount !== expectedAmount) {
            throw new apiError_1.default(400, 'Razorpay order amount does not match calculated order total');
        }
    }
    // Calculate default expected delivery date (1 week from now)
    const defaultExpectedDeliveryDate = new Date();
    defaultExpectedDeliveryDate.setDate(defaultExpectedDeliveryDate.getDate() + 7);
    // SECURITY: Double-check calculation totals before creating order
    // Verify all calculations are correct
    const calculatedTotal = calculation.subtotal + calculation.shippingCost + calculation.tax;
    if (Math.abs(calculatedTotal - calculation.total) > 0.01) {
        throw new apiError_1.default(500, 'Order calculation error - totals do not match');
    }
    // Verify tax calculation matches sum of item taxes
    const sumOfItemTaxes = calculation.items.reduce((sum, item) => sum + item.taxAmount, 0);
    if (Math.abs(sumOfItemTaxes - calculation.tax) > 0.01) {
        throw new apiError_1.default(500, 'Tax calculation error - item taxes do not match total tax');
    }
    // Create order in database with tax information per item
    const order = await Order_model_1.default.create({
        orderNumber,
        userId: new mongoose_1.default.Types.ObjectId(userId),
        items: calculation.items.map((item) => ({
            productId: item.productId,
            title: item.title,
            sku: item.sku,
            vendorId: item.vendorId,
            vendorSnapshot: item.vendorSnapshot,
            qty: item.qty,
            pricePerUnit: item.pricePerUnit,
            totalPrice: item.totalPrice,
            taxCode: item.taxCode,
            taxPercentage: item.taxPercentage,
            taxAmount: item.taxAmount,
        })),
        subtotal: calculation.subtotal,
        shippingCost: calculation.shippingCost,
        tax: calculation.tax,
        total: calculation.total,
        paymentStatus: 'pending',
        paymentMethod: 'razorpay',
        razorpayOrderId: razorpayOrder?.id || input.razorpayOrderId,
        status: 'created',
        shippingAddress: input.shippingAddress,
        placedAt: new Date(),
        expectedDeliveryDate: defaultExpectedDeliveryDate,
    });
    // Clear cart after successful order creation
    await Cart_model_1.default.findOneAndUpdate({ userId: new mongoose_1.default.Types.ObjectId(userId) }, { $set: { items: [], updatedAt: new Date() } });
    return {
        order: order.toObject(),
        razorpayOrder,
    };
};
exports.createOrder = createOrder;
/**
 * Verify and complete payment
 */
const verifyAndCompletePayment = async (userId, orderId, paymentData) => {
    // Find order
    const order = await Order_model_1.default.findOne({
        _id: new mongoose_1.default.Types.ObjectId(orderId),
        userId: new mongoose_1.default.Types.ObjectId(userId),
    });
    if (!order) {
        throw new apiError_1.default(404, 'Order not found');
    }
    // Verify order belongs to user
    if (order.userId.toString() !== userId) {
        throw new apiError_1.default(403, 'Unauthorized access to order');
    }
    // Verify Razorpay order ID matches
    if (order.razorpayOrderId !== paymentData.razorpay_order_id) {
        throw new apiError_1.default(400, 'Razorpay order ID mismatch');
    }
    // Verify payment signature (CRITICAL for security)
    const isValidSignature = razorpayService.verifyPaymentSignature(paymentData);
    if (!isValidSignature) {
        throw new apiError_1.default(400, 'Invalid payment signature');
    }
    // Fetch payment details from Razorpay to double-check
    const paymentDetails = await razorpayService.getPaymentDetails(paymentData.razorpay_payment_id);
    // SECURITY: Recalculate order totals to prevent manipulation
    // This ensures the order totals haven't been tampered with
    const recalculatedTotals = await (0, exports.calculateOrderTotals)(userId);
    // Verify recalculated totals match stored order totals
    const tolerance = 0.01; // Allow 1 paisa tolerance for rounding
    if (Math.abs(recalculatedTotals.subtotal - order.subtotal) > tolerance) {
        throw new apiError_1.default(400, 'Order subtotal mismatch - possible tampering detected');
    }
    if (Math.abs(recalculatedTotals.tax - order.tax) > tolerance) {
        throw new apiError_1.default(400, 'Order tax mismatch - possible tampering detected');
    }
    if (Math.abs(recalculatedTotals.shippingCost - order.shippingCost) > tolerance) {
        throw new apiError_1.default(400, 'Order shipping cost mismatch - possible tampering detected');
    }
    if (Math.abs(recalculatedTotals.total - order.total) > tolerance) {
        throw new apiError_1.default(400, 'Order total mismatch - possible tampering detected');
    }
    // Verify payment amount matches order total
    const expectedAmount = order.total * 100; // Convert to paise
    if (paymentDetails.amount !== expectedAmount) {
        throw new apiError_1.default(400, 'Payment amount mismatch');
    }
    // Verify payment status
    if (paymentDetails.status !== 'captured' && paymentDetails.status !== 'authorized') {
        throw new apiError_1.default(400, `Payment not successful. Status: ${paymentDetails.status}`);
    }
    // Update order with payment information
    order.paymentStatus = 'paid';
    order.razorpayPaymentId = paymentData.razorpay_payment_id;
    order.status = 'vendor_shipped_to_warehouse'; // Move to next status
    await order.save();
    // Send confirmation emails (don't await to avoid blocking response)
    sendOrderConfirmationEmails(order).catch((error) => {
        console.error('Failed to send order confirmation emails:', error);
        // Don't throw - email failure shouldn't fail the payment
    });
    return order.toObject();
};
exports.verifyAndCompletePayment = verifyAndCompletePayment;
/**
 * Send order confirmation emails to customer and vendors
 */
const sendOrderConfirmationEmails = async (order) => {
    const { sendMail } = await Promise.resolve().then(() => __importStar(require('../utils/email')));
    const { generateCustomerOrderEmail, generateVendorOrderEmail, } = await Promise.resolve().then(() => __importStar(require('../utils/emailTemplates')));
    // Get customer details
    const customer = await User_model_1.default.findById(order.userId).lean();
    if (!customer) {
        console.error('Customer not found for order:', order.orderNumber);
        return;
    }
    // Send email to customer if email exists
    if (customer.email) {
        try {
            await sendMail({
                to: customer.email,
                subject: `Order Confirmation - ${order.orderNumber}`,
                html: generateCustomerOrderEmail(order, customer.name),
            });
            console.log('Customer order confirmation email sent:', customer.email);
        }
        catch (error) {
            console.error('Failed to send customer email:', error);
        }
    }
    // Group order items by vendor
    const vendorItemsMap = new Map();
    for (const item of order.items) {
        const vendorId = item.vendorId.toString();
        if (!vendorItemsMap.has(vendorId)) {
            vendorItemsMap.set(vendorId, []);
        }
        vendorItemsMap.get(vendorId).push(item);
    }
    // Send email to each vendor
    for (const [vendorId, vendorItems] of vendorItemsMap.entries()) {
        try {
            const vendor = await User_model_1.default.findById(vendorId).lean();
            if (!vendor || !vendor.email) {
                console.log(`Vendor ${vendorId} not found or has no email`);
                continue;
            }
            await sendMail({
                to: vendor.email,
                subject: `New Order Received - ${order.orderNumber}`,
                html: generateVendorOrderEmail(order, vendor.businessName || vendor.name, vendorItems),
            });
            console.log('Vendor order notification email sent:', vendor.email);
        }
        catch (error) {
            console.error(`Failed to send email to vendor ${vendorId}:`, error);
        }
    }
};
/**
 * Get user orders
 */
const getUserOrders = async (userId) => {
    const orders = await Order_model_1.default.find({
        userId: new mongoose_1.default.Types.ObjectId(userId),
        isDeleted: false,
    })
        .sort({ createdAt: -1 })
        .lean();
    return orders.map((order) => ({
        ...order,
        _id: order._id.toString(),
        userId: order.userId.toString(),
        items: order.items.map((item) => ({
            ...item,
            productId: item.productId.toString(),
            vendorId: item.vendorId.toString(),
        })),
    }));
};
exports.getUserOrders = getUserOrders;
/**
 * Get order by ID
 */
const getOrderById = async (orderId, userId) => {
    const order = await Order_model_1.default.findOne({
        _id: new mongoose_1.default.Types.ObjectId(orderId),
        userId: new mongoose_1.default.Types.ObjectId(userId),
        isDeleted: false,
    }).lean();
    if (!order) {
        throw new apiError_1.default(404, 'Order not found');
    }
    return {
        ...order,
        _id: order._id.toString(),
        userId: order.userId.toString(),
        items: order.items.map((item) => ({
            ...item,
            productId: item.productId.toString(),
            vendorId: item.vendorId.toString(),
        })),
    };
};
exports.getOrderById = getOrderById;
/**
 * Get vendor orders (without customer details)
 */
const getVendorOrders = async (vendorId) => {
    // Find all orders that contain items from this vendor
    const orders = await Order_model_1.default.find({
        'items.vendorId': new mongoose_1.default.Types.ObjectId(vendorId),
        isDeleted: false,
    })
        .sort({ createdAt: -1 })
        .lean();
    // Filter and format orders to only include vendor's items
    const vendorOrders = orders.map((order) => {
        const vendorItems = order.items.filter((item) => item.vendorId.toString() === vendorId);
        if (vendorItems.length === 0) {
            return null;
        }
        // Calculate totals for vendor's items only (using per-item tax)
        const vendorSubtotal = vendorItems.reduce((sum, item) => sum + item.totalPrice, 0);
        const vendorTax = vendorItems.reduce((sum, item) => sum + (item.taxAmount || 0), 0);
        const vendorTotal = vendorSubtotal + vendorTax;
        return {
            _id: order._id.toString(),
            orderNumber: order.orderNumber,
            items: vendorItems.map((item) => ({
                ...item,
                productId: item.productId.toString(),
                vendorId: item.vendorId.toString(),
            })),
            subtotal: vendorSubtotal,
            tax: vendorTax,
            total: vendorTotal,
            paymentStatus: order.paymentStatus,
            status: order.status,
            placedAt: order.placedAt,
            createdAt: order.createdAt,
            updatedAt: order.updatedAt,
            // NO customer details included
        };
    }).filter(Boolean);
    return vendorOrders;
};
exports.getVendorOrders = getVendorOrders;
/**
 * Get all orders for admin (with full details)
 */
const getAdminOrders = async (filter, statusFilter, search) => {
    let query = {
        isDeleted: false,
    };
    // If filtering for admin orders only, find orders where at least one item has an admin vendor
    if (filter === 'admin_only') {
        // Get all admin user IDs
        const adminUsers = await User_model_1.default.find({ role: 'admin' })
            .select('_id')
            .lean();
        const adminIds = adminUsers.map((admin) => admin._id);
        // Find orders where at least one item has an admin vendor
        query = {
            ...query,
            'items.vendorId': { $in: adminIds },
        };
    }
    // Status filter
    if (statusFilter && statusFilter !== 'all') {
        const validStatuses = [
            'created',
            'vendor_shipped_to_warehouse',
            'received_in_warehouse',
            'packed',
            'shipped',
            'delivered',
            'cancelled',
        ];
        if (validStatuses.includes(statusFilter)) {
            query.status = statusFilter;
        }
    }
    // Search filter
    if (search && search.trim().length > 0) {
        const searchTerm = search.trim();
        const searchRegex = new RegExp(searchTerm.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
        // Search in order number
        const orderNumberMatch = { orderNumber: searchRegex };
        // Search in vendor names/business names
        const matchingVendors = await User_model_1.default.find({
            $or: [
                { name: searchRegex },
                { businessName: searchRegex },
                { gstNumber: searchRegex },
            ],
        })
            .select('_id')
            .lean();
        const vendorIds = matchingVendors.map((vendor) => vendor._id);
        // Search in product titles
        const matchingProducts = await Product_model_1.default.find({
            title: searchRegex,
        })
            .select('_id')
            .lean();
        const productIds = matchingProducts.map((product) => product._id);
        // Combine search conditions
        const searchConditions = [orderNumberMatch];
        if (vendorIds.length > 0) {
            searchConditions.push({ 'items.vendorId': { $in: vendorIds } });
        }
        if (productIds.length > 0) {
            searchConditions.push({ 'items.productId': { $in: productIds } });
        }
        if (searchConditions.length > 1) {
            query.$or = searchConditions;
        }
        else if (searchConditions.length === 1) {
            Object.assign(query, searchConditions[0]);
        }
    }
    const orders = await Order_model_1.default.find(query)
        .populate('userId', 'name email phone')
        .sort({ createdAt: -1 })
        .lean();
    // Get unique vendor IDs from all orders
    const allVendorIds = new Set();
    orders.forEach((order) => {
        order.items.forEach((item) => {
            allVendorIds.add(item.vendorId.toString());
        });
    });
    // Populate vendor details
    const vendors = await User_model_1.default.find({
        _id: { $in: Array.from(allVendorIds).map((id) => new mongoose_1.default.Types.ObjectId(id)) },
    })
        .select('_id name email phone businessName gstNumber role')
        .lean();
    const vendorMap = new Map(vendors.map((vendor) => [vendor._id.toString(), vendor]));
    return orders.map((order) => {
        // Get unique vendors for this order
        const orderVendorIds = [
            ...new Set(order.items.map((item) => item.vendorId.toString())),
        ];
        const orderVendors = orderVendorIds
            .map((vendorId) => vendorMap.get(vendorId))
            .filter(Boolean)
            .map((vendor) => ({
            _id: vendor._id.toString(),
            name: vendor.name,
            businessName: vendor.businessName,
            gstNumber: vendor.gstNumber,
            role: vendor.role,
        }));
        return {
            ...order,
            _id: order._id.toString(),
            userId: order.userId.toString(),
            customer: order.userId
                ? {
                    name: order.userId.name,
                    email: order.userId.email,
                    phone: order.userId.phone,
                }
                : null,
            vendors: orderVendors,
            items: order.items.map((item) => ({
                ...item,
                productId: item.productId.toString(),
                vendorId: item.vendorId.toString(),
            })),
        };
    });
};
exports.getAdminOrders = getAdminOrders;
/**
 * Get order by ID for admin (with full details)
 */
const getAdminOrderById = async (orderId) => {
    const order = await Order_model_1.default.findOne({
        _id: new mongoose_1.default.Types.ObjectId(orderId),
        isDeleted: false,
    })
        .populate('userId', 'name email phone')
        .lean();
    if (!order) {
        throw new apiError_1.default(404, 'Order not found');
    }
    // Get unique vendor IDs from order items
    const vendorIds = [
        ...new Set(order.items.map((item) => item.vendorId.toString())),
    ];
    // Populate vendor details
    const vendors = await User_model_1.default.find({
        _id: { $in: vendorIds.map((id) => new mongoose_1.default.Types.ObjectId(id)) },
    })
        .select('_id name email phone businessName gstNumber role')
        .lean();
    const vendorMap = new Map(vendors.map((vendor) => [vendor._id.toString(), vendor]));
    return {
        ...order,
        _id: order._id.toString(),
        userId: order.userId.toString(),
        customer: order.userId
            ? {
                name: order.userId.name,
                email: order.userId.email,
                phone: order.userId.phone,
            }
            : null,
        items: order.items.map((item) => ({
            ...item,
            productId: item.productId.toString(),
            vendorId: item.vendorId.toString(),
        })),
        vendors: vendors.map((vendor) => ({
            _id: vendor._id.toString(),
            name: vendor.name,
            email: vendor.email,
            phone: vendor.phone,
            businessName: vendor.businessName,
            gstNumber: vendor.gstNumber,
            role: vendor.role,
        })),
    };
};
exports.getAdminOrderById = getAdminOrderById;
/**
 * Update order status
 */
const updateOrderStatus = async (orderId, newStatus, updatedBy, role) => {
    const validStatuses = [
        'created',
        'vendor_shipped_to_warehouse',
        'received_in_warehouse',
        'packed',
        'shipped',
        'delivered',
        'cancelled',
    ];
    if (!validStatuses.includes(newStatus)) {
        throw new apiError_1.default(400, 'Invalid order status');
    }
    const order = await Order_model_1.default.findById(new mongoose_1.default.Types.ObjectId(orderId));
    if (!order) {
        throw new apiError_1.default(404, 'Order not found');
    }
    // Role-based status update restrictions
    if (role === 'vendor') {
        // Vendors can mark as shipped to warehouse or cancel
        if (newStatus !== 'vendor_shipped_to_warehouse' &&
            newStatus !== 'cancelled') {
            throw new apiError_1.default(403, 'Vendors can only mark orders as shipped to warehouse or cancel them');
        }
        // Check if order contains items from this vendor
        const hasVendorItems = order.items.some((item) => item.vendorId.toString() === updatedBy);
        if (!hasVendorItems) {
            throw new apiError_1.default(403, 'You can only update orders containing your products');
        }
        // Can only cancel if order is still in created status
        if (newStatus === 'cancelled' && order.status !== 'created') {
            throw new apiError_1.default(400, 'Can only cancel orders that are still in created status');
        }
        // When vendor marks as shipped to warehouse, auto-set expected delivery date (1 week from now)
        if (newStatus === 'vendor_shipped_to_warehouse') {
            const expectedDeliveryDate = new Date();
            expectedDeliveryDate.setDate(expectedDeliveryDate.getDate() + 7);
            order.expectedDeliveryDate = expectedDeliveryDate;
        }
    }
    if (role === 'admin') {
        // Admin can update to any status except 'vendor_shipped_to_warehouse' (that's vendor only)
        if (newStatus === 'vendor_shipped_to_warehouse') {
            throw new apiError_1.default(403, 'Only vendors can mark orders as shipped to warehouse');
        }
        // When admin marks as shipped, store the shipped date
        if (newStatus === 'shipped') {
            order.shippedDate = new Date();
        }
    }
    order.status = newStatus;
    await order.save();
    return order.toObject();
};
exports.updateOrderStatus = updateOrderStatus;
/**
 * Update expected delivery date (admin only)
 */
const updateExpectedDeliveryDate = async (orderId, expectedDeliveryDate) => {
    const order = await Order_model_1.default.findById(new mongoose_1.default.Types.ObjectId(orderId));
    if (!order) {
        throw new apiError_1.default(404, 'Order not found');
    }
    order.expectedDeliveryDate = expectedDeliveryDate;
    await order.save();
    return order.toObject();
};
exports.updateExpectedDeliveryDate = updateExpectedDeliveryDate;
exports.default = {
    calculateOrderTotals: exports.calculateOrderTotals,
    createOrder: exports.createOrder,
    verifyAndCompletePayment: exports.verifyAndCompletePayment,
    getUserOrders: exports.getUserOrders,
    getOrderById: exports.getOrderById,
    getVendorOrders: exports.getVendorOrders,
    getAdminOrders: exports.getAdminOrders,
    getAdminOrderById: exports.getAdminOrderById,
    updateOrderStatus: exports.updateOrderStatus,
    updateExpectedDeliveryDate: exports.updateExpectedDeliveryDate,
};
