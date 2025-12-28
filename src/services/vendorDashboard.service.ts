import mongoose from 'mongoose';
import Order from '../models/Order.model';
import Product from '../models/Product.model';
import ApiError from '../utils/apiError';

/**
 * Get vendor dashboard statistics
 */
export const getVendorDashboardStats = async (vendorId: string) => {
  const vendorObjectId = new mongoose.Types.ObjectId(vendorId);

  // Get all orders containing this vendor's products
  const allOrders = await Order.find({
    'items.vendorId': vendorObjectId,
    isDeleted: false,
  }).lean();

  // Calculate revenue from paid orders
  let totalRevenue = 0;
  const paidOrders = allOrders.filter((order) => order.paymentStatus === 'paid');
  
  for (const order of paidOrders) {
    // Calculate vendor's portion of the order
    const vendorItems = order.items.filter((item: any) => {
      const itemVendorId =
        item.vendorId instanceof mongoose.Types.ObjectId
          ? item.vendorId.toString()
          : item.vendorId?.toString() || item.vendorId;
      return itemVendorId === vendorId;
    });
    const vendorSubtotal = vendorItems.reduce(
      (sum: number, item: any) => sum + (item.totalPrice || 0),
      0,
    );
    // Calculate proportional tax and shipping (if applicable)
    const orderTotal = (order.subtotal || 0) + (order.tax || 0) + (order.shippingCost || 0);
    const vendorProportion = order.subtotal > 0 ? vendorSubtotal / order.subtotal : 0;
    const vendorTax = (order.tax || 0) * vendorProportion;
    const vendorShipping = (order.shippingCost || 0) * vendorProportion;
    totalRevenue += vendorSubtotal + vendorTax + vendorShipping;
  }

  // Count active products
  const activeProducts = await Product.countDocuments({
    vendor: vendorObjectId,
    isActive: true,
  });

  const totalProducts = await Product.countDocuments({
    vendor: vendorObjectId,
  });

  // Count open orders (created or vendor_shipped_to_warehouse)
  const openOrders = allOrders.filter(
    (order) =>
      order.status === 'created' ||
      order.status === 'vendor_shipped_to_warehouse',
  ).length;

  // Count orders requiring dispatch today (created status)
  const ordersRequiringDispatch = allOrders.filter(
    (order) => order.status === 'created' && order.paymentStatus === 'paid',
  ).length;

  // Calculate fulfilment rate (orders shipped to warehouse / total orders)
  const totalOrderCount = allOrders.length;
  const shippedOrders = allOrders.filter(
    (order) =>
      order.status === 'vendor_shipped_to_warehouse' ||
      order.status === 'received_in_warehouse' ||
      order.status === 'packed' ||
      order.status === 'shipped' ||
      order.status === 'delivered',
  ).length;
  const fulfilmentRate =
    totalOrderCount > 0 ? (shippedOrders / totalOrderCount) * 100 : 0;

  // Order fulfilment breakdown
  const packedReady = allOrders.filter(
    (order) => order.status === 'packed',
  ).length;
  const awaitingPickup = allOrders.filter(
    (order) => order.status === 'vendor_shipped_to_warehouse',
  ).length;
  const delayedDispatch = allOrders.filter(
    (order) =>
      order.status === 'created' &&
      order.paymentStatus === 'paid' &&
      new Date(order.placedAt).getTime() <
        new Date().getTime() - 24 * 60 * 60 * 1000, // More than 24 hours old
  ).length;

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

/**
 * Format currency to Indian Rupees
 */
function formatCurrency(amount: number): string {
  if (amount >= 100000) {
    return `₹${(amount / 100000).toFixed(1)}L`;
  } else if (amount >= 1000) {
    return `₹${(amount / 1000).toFixed(1)}k`;
  }
  return `₹${Math.round(amount).toLocaleString('en-IN')}`;
}

export default {
  getVendorDashboardStats,
};

