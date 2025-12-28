"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getVendorDashboardStats = void 0;
const mongoose_1 = __importDefault(require("mongoose"));
const Order_model_1 = __importDefault(require("../models/Order.model"));
const Product_model_1 = __importDefault(require("../models/Product.model"));
/**
 * Get vendor dashboard statistics
 */
const getVendorDashboardStats = async (vendorId) => {
    const vendorObjectId = new mongoose_1.default.Types.ObjectId(vendorId);
    // Get all orders containing this vendor's products
    const allOrders = await Order_model_1.default.find({
        'items.vendorId': vendorObjectId,
        isDeleted: false,
    }).lean();
    // Calculate revenue from paid orders
    let totalRevenue = 0;
    const paidOrders = allOrders.filter((order) => order.paymentStatus === 'paid');
    for (const order of paidOrders) {
        // Calculate vendor's portion of the order
        const vendorItems = order.items.filter((item) => {
            const itemVendorId = item.vendorId instanceof mongoose_1.default.Types.ObjectId
                ? item.vendorId.toString()
                : item.vendorId?.toString() || item.vendorId;
            return itemVendorId === vendorId;
        });
        const vendorSubtotal = vendorItems.reduce((sum, item) => sum + (item.totalPrice || 0), 0);
        // Calculate proportional tax and shipping (if applicable)
        const orderTotal = (order.subtotal || 0) + (order.tax || 0) + (order.shippingCost || 0);
        const vendorProportion = order.subtotal > 0 ? vendorSubtotal / order.subtotal : 0;
        const vendorTax = (order.tax || 0) * vendorProportion;
        const vendorShipping = (order.shippingCost || 0) * vendorProportion;
        totalRevenue += vendorSubtotal + vendorTax + vendorShipping;
    }
    // Count active products
    const activeProducts = await Product_model_1.default.countDocuments({
        vendor: vendorObjectId,
        isActive: true,
    });
    const totalProducts = await Product_model_1.default.countDocuments({
        vendor: vendorObjectId,
    });
    // Count open orders (created or vendor_shipped_to_warehouse)
    const openOrders = allOrders.filter((order) => order.status === 'created' ||
        order.status === 'vendor_shipped_to_warehouse').length;
    // Count orders requiring dispatch today (created status)
    const ordersRequiringDispatch = allOrders.filter((order) => order.status === 'created' && order.paymentStatus === 'paid').length;
    // Calculate fulfilment rate (orders shipped to warehouse / total orders)
    const totalOrderCount = allOrders.length;
    const shippedOrders = allOrders.filter((order) => order.status === 'vendor_shipped_to_warehouse' ||
        order.status === 'received_in_warehouse' ||
        order.status === 'packed' ||
        order.status === 'shipped' ||
        order.status === 'delivered').length;
    const fulfilmentRate = totalOrderCount > 0 ? (shippedOrders / totalOrderCount) * 100 : 0;
    // Order fulfilment breakdown
    const packedReady = allOrders.filter((order) => order.status === 'packed').length;
    const awaitingPickup = allOrders.filter((order) => order.status === 'vendor_shipped_to_warehouse').length;
    const delayedDispatch = allOrders.filter((order) => order.status === 'created' &&
        order.paymentStatus === 'paid' &&
        new Date(order.placedAt).getTime() <
            new Date().getTime() - 24 * 60 * 60 * 1000).length;
    return {
        revenue: {
            total: totalRevenue,
            formatted: formatCurrency(totalRevenue),
        },
        products: {
            active: activeProducts,
            total: totalProducts,
            pending: totalProducts - activeProducts,
        },
        orders: {
            open: openOrders,
            requiringDispatch: ordersRequiringDispatch,
            total: totalOrderCount,
        },
        fulfilment: {
            rate: Math.round(fulfilmentRate * 10) / 10, // Round to 1 decimal
            packedReady,
            awaitingPickup,
            delayedDispatch,
        },
    };
};
exports.getVendorDashboardStats = getVendorDashboardStats;
/**
 * Format currency to Indian Rupees
 */
function formatCurrency(amount) {
    if (amount >= 100000) {
        return `₹${(amount / 100000).toFixed(1)}L`;
    }
    else if (amount >= 1000) {
        return `₹${(amount / 1000).toFixed(1)}k`;
    }
    return `₹${Math.round(amount).toLocaleString('en-IN')}`;
}
exports.default = {
    getVendorDashboardStats: exports.getVendorDashboardStats,
};
