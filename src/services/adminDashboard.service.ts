import mongoose from 'mongoose';

import Order from '../models/Order.model';
import Product from '../models/Product.model';
import User from '../models/User.model';
import Contact from '../models/Contact.model';
import Subscriber from '../models/Subscriber.model';

function formatCurrency(amount: number): string {
  if (amount >= 10000000) {
    return `₹${(amount / 10000000).toFixed(1)}Cr`;
  }
  if (amount >= 100000) {
    return `₹${(amount / 100000).toFixed(1)}L`;
  }
  if (amount >= 1000) {
    return `₹${(amount / 1000).toFixed(1)}k`;
  }
  return `₹${Math.round(amount).toLocaleString('en-IN')}`;
}

export interface AdminDashboardStats {
  revenue: {
    total: number;
    formatted: string;
    paidOrdersCount: number;
  };
  vendors: {
    active: number;
    pending: number;
    total: number;
    rejected: number;
    suspended: number;
  };
  orders: {
    total: number;
    open: number;
    paidPendingFulfilment: number;
    cancelled: number;
  };
  products: {
    total: number;
    active: number;
    pendingApproval: number;
    featured: number;
  };
  pipeline: {
    submittedApplications: number;
    approvedVendors: number;
    kycInReview: number;
  };
  support: {
    unreadQueries: number;
    totalSubscribers: number;
  };
}

/**
 * Get admin dashboard statistics (real data from DB).
 */
export const getAdminDashboardStats = async (): Promise<AdminDashboardStats> => {
  const baseOrderQuery: mongoose.FilterQuery<typeof Order> = { isDeleted: false };

  const [
    paidOrdersAgg,
    ordersCount,
    openOrdersCount,
    cancelledCount,
    activeVendorsCount,
    pendingVendorsCount,
    totalVendorsCount,
    rejectedVendorsCount,
    suspendedVendorsCount,
    productsTotal,
    productsActive,
    productsPendingApproval,
    productsFeatured,
    unreadQueriesCount,
    subscribersCount,
  ] = await Promise.all([
    Order.aggregate([
      { $match: { ...baseOrderQuery, paymentStatus: 'paid', status: { $ne: 'cancelled' } } },
      { $group: { _id: null, total: { $sum: '$total' }, count: { $sum: 1 } } },
    ]),
    Order.countDocuments(baseOrderQuery),
    Order.countDocuments({
      ...baseOrderQuery,
      status: { $in: ['created', 'vendor_shipped_to_warehouse'] },
    }),
    Order.countDocuments({ ...baseOrderQuery, status: 'cancelled' }),
    User.countDocuments({ role: 'vendor', vendorStatus: 'active', isDeleted: false }),
    User.countDocuments({ role: 'vendor', vendorStatus: 'pending', isDeleted: false }),
    User.countDocuments({ role: 'vendor', isDeleted: false }),
    User.countDocuments({ role: 'vendor', vendorStatus: 'rejected', isDeleted: false }),
    User.countDocuments({ role: 'vendor', vendorStatus: 'suspended', isDeleted: false }),
    Product.countDocuments({}),
    Product.countDocuments({ isActive: true }),
    Product.countDocuments({ approvedByAdmin: false }),
    Product.countDocuments({ featured: true }),
    Contact.countDocuments({ status: 'new' }).catch(() => 0),
    Subscriber.countDocuments({}).catch(() => 0),
  ]);

  const revenueTotal = paidOrdersAgg[0]?.total ?? 0;
  const paidOrdersCount = paidOrdersAgg[0]?.count ?? 0;

  const paidPendingFulfilment = await Order.countDocuments({
    ...baseOrderQuery,
    paymentStatus: 'paid',
    status: 'created',
  });

  return {
    revenue: {
      total: revenueTotal,
      formatted: formatCurrency(revenueTotal),
      paidOrdersCount,
    },
    vendors: {
      active: activeVendorsCount,
      pending: pendingVendorsCount,
      total: totalVendorsCount,
      rejected: rejectedVendorsCount,
      suspended: suspendedVendorsCount,
    },
    orders: {
      total: ordersCount,
      open: openOrdersCount,
      paidPendingFulfilment,
      cancelled: cancelledCount,
    },
    products: {
      total: productsTotal,
      active: productsActive,
      pendingApproval: productsPendingApproval,
      featured: productsFeatured,
    },
    pipeline: {
      submittedApplications: pendingVendorsCount,
      approvedVendors: activeVendorsCount,
      kycInReview: pendingVendorsCount,
    },
    support: {
      unreadQueries: unreadQueriesCount,
      totalSubscribers: subscribersCount,
    },
  };
};
