import mongoose from 'mongoose';

import ApiError from '../utils/apiError';
import Payout from '../models/Payout.model';
import Order from '../models/Order.model';
import User from '../models/User.model';
import { getCommissionPercent } from './commissionConfig.service';

type PayoutStatus = 'pending' | 'processing' | 'paid' | 'rejected';
type PaymentMode = 'bank' | 'upi' | 'cash' | 'other';

function roundMoney(n: number) {
  return Math.round(Number(n) || 0);
}

export async function adminListPayouts(options?: {
  status?: PayoutStatus | 'all';
  vendorId?: string;
  search?: string;
  limit?: number;
  skip?: number;
}) {
  const query: any = {};

  if (options?.status && options.status !== 'all') {
    query.status = options.status;
  }

  if (options?.vendorId && mongoose.Types.ObjectId.isValid(options.vendorId)) {
    query.vendorId = new mongoose.Types.ObjectId(options.vendorId);
  }

  const limit = Math.min(Math.max(Number(options?.limit) || 20, 1), 200);
  const skip = Math.max(Number(options?.skip) || 0, 0);

  let payouts = await Payout.find(query)
    .populate('vendorId', 'name businessName email phone')
    .sort({ createdAt: -1 })
    .lean();

  // simple client-side search on vendor/order reference
  const term = options?.search?.trim().toLowerCase();
  if (term) {
    payouts = payouts.filter((p: any) => {
      const vendorName = (p.vendorId?.businessName || p.vendorId?.name || '').toLowerCase();
      const ref = (p.paymentReference || '').toLowerCase();
      return vendorName.includes(term) || ref.includes(term);
    });
  }

  const total = payouts.length;
  const paginated = payouts.slice(skip, skip + limit);
  return { payouts: paginated, total };
}

export async function adminGetPayoutById(payoutId: string) {
  if (!mongoose.Types.ObjectId.isValid(payoutId)) {
    throw new ApiError(400, 'Invalid payout id');
  }
  const payout = await Payout.findById(payoutId)
    .populate('vendorId', 'name businessName email phone')
    .lean();
  if (!payout) {
    throw new ApiError(404, 'Payout not found');
  }
  return payout;
}

/**
 * When an order is marked as vendor_shipped_to_warehouse (received at admin warehouse),
 * auto-create one pending payout per vendor in that order (for paid orders only).
 * Skips if a payout for this order+vendor already exists.
 */
export async function createPayoutsForOrderShippedToWarehouse(orderId: string): Promise<void> {
  if (!mongoose.Types.ObjectId.isValid(orderId)) return;

  const order = await Order.findOne({
    _id: new mongoose.Types.ObjectId(orderId),
    isDeleted: false,
    status: 'vendor_shipped_to_warehouse',
    paymentStatus: 'paid',
  }).lean();

  if (!order || !(order as any).items?.length) return;

  const orderObj = order as any;
  const vendorIds = [...new Set(orderObj.items.map((it: any) => String(it.vendorId) as string))] as string[];

  const defaultCommission = await getCommissionPercent();

  for (const vid of vendorIds) {
    const existing = await Payout.findOne({
      vendorId: new mongoose.Types.ObjectId(vid),
      ordersIncluded: new mongoose.Types.ObjectId(orderId),
    });
    if (existing) continue;

    const vendorItems = orderObj.items.filter((it: any) => String(it.vendorId) === vid);
    const gross = roundMoney(vendorItems.reduce((sum: number, it: any) => sum + (it.totalPrice || 0), 0));
    if (gross <= 0) continue;

    const commissionPercent = Math.min(100, Math.max(0, defaultCommission));
    const commissionAmount = roundMoney((gross * commissionPercent) / 100);
    const netAmount = Math.max(0, roundMoney(gross - commissionAmount));

    await Payout.create({
      vendorId: new mongoose.Types.ObjectId(vid),
      grossAmount: gross,
      commissionPercent,
      commissionAmount,
      netAmount,
      amount: netAmount,
      ordersIncluded: [new mongoose.Types.ObjectId(orderId)],
      status: 'pending',
      paymentMode: 'bank',
    });
  }
}

export async function adminCreatePayout(input: {
  vendorId: string;
  ordersIncluded?: string[];
  grossAmount?: number;
  commissionPercent?: number;
  status?: PayoutStatus;
  paymentMode?: PaymentMode;
  adminNotes?: string;
  paymentReference?: string;
  scheduledAt?: string;
}, adminUserId: string) {
  if (!mongoose.Types.ObjectId.isValid(input.vendorId)) {
    throw new ApiError(400, 'Invalid vendorId');
  }

  const vendor = await User.findById(input.vendorId).lean();
  if (!vendor) {
    throw new ApiError(404, 'Vendor not found');
  }

  let gross = Number(input.grossAmount ?? 0);
  const ordersIncluded: mongoose.Types.ObjectId[] = [];

  if (input.ordersIncluded && input.ordersIncluded.length > 0) {
    for (const id of input.ordersIncluded) {
      if (!mongoose.Types.ObjectId.isValid(id)) {
        throw new ApiError(400, 'Invalid order id in ordersIncluded');
      }
      ordersIncluded.push(new mongoose.Types.ObjectId(id));
    }

    const orders = await Order.find({ _id: { $in: ordersIncluded }, isDeleted: false }).lean();

    gross = 0;
    for (const order of orders as any[]) {
      if (order.paymentStatus !== 'paid') continue;
      // sum vendor items only
      const vendorItems = (order.items || []).filter(
        (it: any) => it.vendorId?.toString?.() === input.vendorId,
      );
      gross += vendorItems.reduce((sum: number, it: any) => sum + (it.totalPrice || 0), 0);
    }
  }

  if (gross <= 0) {
    throw new ApiError(400, 'Gross amount must be greater than 0 (or include paid orders)');
  }

  const defaultCommission = await getCommissionPercent();
  const commissionPercent = Math.min(100, Math.max(0, Number(input.commissionPercent ?? defaultCommission)));
  const commissionAmount = roundMoney((gross * commissionPercent) / 100);
  const netAmount = Math.max(0, roundMoney(gross - commissionAmount));

  const createdBy = new mongoose.Types.ObjectId(adminUserId);
  const payout = await Payout.create({
    vendorId: new mongoose.Types.ObjectId(input.vendorId),
    grossAmount: roundMoney(gross),
    commissionPercent,
    commissionAmount,
    netAmount,
    amount: netAmount,
    ordersIncluded,
    status: input.status ?? 'pending',
    paymentMode: input.paymentMode ?? 'bank',
    adminNotes: input.adminNotes,
    paymentReference: input.paymentReference,
    scheduledAt: input.scheduledAt ? new Date(input.scheduledAt) : undefined,
    createdBy,
    updatedBy: createdBy,
    ...(input.status === 'paid' ? { paidAt: new Date() } : {}),
  });

  return payout.toObject();
}

export async function adminUpdatePayout(payoutId: string, patch: {
  status?: PayoutStatus;
  paymentMode?: PaymentMode;
  adminNotes?: string;
  paymentReference?: string;
  scheduledAt?: string | null;
  paidAt?: string | null;
}, adminUserId: string) {
  if (!mongoose.Types.ObjectId.isValid(payoutId)) {
    throw new ApiError(400, 'Invalid payout id');
  }

  const update: any = {};
  if (patch.status) update.status = patch.status;
  if (patch.paymentMode) update.paymentMode = patch.paymentMode;
  if (typeof patch.adminNotes === 'string') update.adminNotes = patch.adminNotes;
  if (typeof patch.paymentReference === 'string') update.paymentReference = patch.paymentReference;

  if (patch.scheduledAt === null) update.scheduledAt = undefined;
  if (typeof patch.scheduledAt === 'string') update.scheduledAt = new Date(patch.scheduledAt);

  if (patch.paidAt === null) update.paidAt = undefined;
  if (typeof patch.paidAt === 'string') update.paidAt = new Date(patch.paidAt);

  // auto set paidAt when status moves to paid
  if (patch.status === 'paid' && !patch.paidAt) {
    update.paidAt = new Date();
  }

  update.updatedBy = new mongoose.Types.ObjectId(adminUserId);

  const updated = await Payout.findByIdAndUpdate(payoutId, { $set: update }, { new: true }).lean();
  if (!updated) {
    throw new ApiError(404, 'Payout not found');
  }

  return updated;
}

export async function vendorListPayouts(
  vendorId: string,
  status?: PayoutStatus | 'all',
  options?: { limit?: number; skip?: number },
) {
  const query: any = { vendorId: new mongoose.Types.ObjectId(vendorId) };
  if (status && status !== 'all') query.status = status;

  const limit = Math.min(Math.max(Number(options?.limit) || 20, 1), 200);
  const skip = Math.max(Number(options?.skip) || 0, 0);

  const [payouts, total] = await Promise.all([
    Payout.find(query).sort({ createdAt: -1 }).skip(skip).limit(limit).lean(),
    Payout.countDocuments(query),
  ]);

  return { payouts, total };
}

export async function vendorPaymentsSummary(vendorId: string) {
  const payouts = await Payout.find({ vendorId: new mongoose.Types.ObjectId(vendorId) }).lean();

  const totalPaid = payouts
    .filter((p: any) => p.status === 'paid')
    .reduce((sum: number, p: any) => sum + (p.netAmount ?? p.amount ?? 0), 0);

  const totalPending = payouts
    .filter((p: any) => p.status !== 'paid')
    .reduce((sum: number, p: any) => sum + (p.netAmount ?? p.amount ?? 0), 0);

  const lifetimeGross = payouts.reduce((sum: number, p: any) => sum + (p.grossAmount ?? 0), 0);
  const lifetimeCommission = payouts.reduce((sum: number, p: any) => sum + (p.commissionAmount ?? 0), 0);

  return {
    totalPaid: roundMoney(totalPaid),
    totalPending: roundMoney(totalPending),
    lifetimeGross: roundMoney(lifetimeGross),
    lifetimeCommission: roundMoney(lifetimeCommission),
  };
}


