"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.adminListPayouts = adminListPayouts;
exports.adminCreatePayout = adminCreatePayout;
exports.adminUpdatePayout = adminUpdatePayout;
exports.vendorListPayouts = vendorListPayouts;
exports.vendorPaymentsSummary = vendorPaymentsSummary;
const mongoose_1 = __importDefault(require("mongoose"));
const apiError_1 = __importDefault(require("../utils/apiError"));
const Payout_model_1 = __importDefault(require("../models/Payout.model"));
const Order_model_1 = __importDefault(require("../models/Order.model"));
const User_model_1 = __importDefault(require("../models/User.model"));
const commissionConfig_service_1 = require("./commissionConfig.service");
function roundMoney(n) {
    return Math.round(Number(n) || 0);
}
async function adminListPayouts(options) {
    const query = {};
    if (options?.status && options.status !== 'all') {
        query.status = options.status;
    }
    if (options?.vendorId && mongoose_1.default.Types.ObjectId.isValid(options.vendorId)) {
        query.vendorId = new mongoose_1.default.Types.ObjectId(options.vendorId);
    }
    const payouts = await Payout_model_1.default.find(query)
        .populate('vendorId', 'name businessName email phone')
        .sort({ createdAt: -1 })
        .lean();
    // simple client-side search on vendor/order reference
    const term = options?.search?.trim().toLowerCase();
    if (term) {
        return payouts.filter((p) => {
            const vendorName = (p.vendorId?.businessName || p.vendorId?.name || '').toLowerCase();
            const ref = (p.paymentReference || '').toLowerCase();
            return vendorName.includes(term) || ref.includes(term);
        });
    }
    return payouts;
}
async function adminCreatePayout(input, adminUserId) {
    if (!mongoose_1.default.Types.ObjectId.isValid(input.vendorId)) {
        throw new apiError_1.default(400, 'Invalid vendorId');
    }
    const vendor = await User_model_1.default.findById(input.vendorId).lean();
    if (!vendor) {
        throw new apiError_1.default(404, 'Vendor not found');
    }
    let gross = Number(input.grossAmount ?? 0);
    const ordersIncluded = [];
    if (input.ordersIncluded && input.ordersIncluded.length > 0) {
        for (const id of input.ordersIncluded) {
            if (!mongoose_1.default.Types.ObjectId.isValid(id)) {
                throw new apiError_1.default(400, 'Invalid order id in ordersIncluded');
            }
            ordersIncluded.push(new mongoose_1.default.Types.ObjectId(id));
        }
        const orders = await Order_model_1.default.find({ _id: { $in: ordersIncluded }, isDeleted: false }).lean();
        gross = 0;
        for (const order of orders) {
            if (order.paymentStatus !== 'paid')
                continue;
            // sum vendor items only
            const vendorItems = (order.items || []).filter((it) => it.vendorId?.toString?.() === input.vendorId);
            gross += vendorItems.reduce((sum, it) => sum + (it.totalPrice || 0), 0);
        }
    }
    if (gross <= 0) {
        throw new apiError_1.default(400, 'Gross amount must be greater than 0 (or include paid orders)');
    }
    const defaultCommission = await (0, commissionConfig_service_1.getCommissionPercent)();
    const commissionPercent = Math.min(100, Math.max(0, Number(input.commissionPercent ?? defaultCommission)));
    const commissionAmount = roundMoney((gross * commissionPercent) / 100);
    const netAmount = Math.max(0, roundMoney(gross - commissionAmount));
    const createdBy = new mongoose_1.default.Types.ObjectId(adminUserId);
    const payout = await Payout_model_1.default.create({
        vendorId: new mongoose_1.default.Types.ObjectId(input.vendorId),
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
async function adminUpdatePayout(payoutId, patch, adminUserId) {
    if (!mongoose_1.default.Types.ObjectId.isValid(payoutId)) {
        throw new apiError_1.default(400, 'Invalid payout id');
    }
    const update = {};
    if (patch.status)
        update.status = patch.status;
    if (patch.paymentMode)
        update.paymentMode = patch.paymentMode;
    if (typeof patch.adminNotes === 'string')
        update.adminNotes = patch.adminNotes;
    if (typeof patch.paymentReference === 'string')
        update.paymentReference = patch.paymentReference;
    if (patch.scheduledAt === null)
        update.scheduledAt = undefined;
    if (typeof patch.scheduledAt === 'string')
        update.scheduledAt = new Date(patch.scheduledAt);
    if (patch.paidAt === null)
        update.paidAt = undefined;
    if (typeof patch.paidAt === 'string')
        update.paidAt = new Date(patch.paidAt);
    // auto set paidAt when status moves to paid
    if (patch.status === 'paid' && !patch.paidAt) {
        update.paidAt = new Date();
    }
    update.updatedBy = new mongoose_1.default.Types.ObjectId(adminUserId);
    const updated = await Payout_model_1.default.findByIdAndUpdate(payoutId, { $set: update }, { new: true }).lean();
    if (!updated) {
        throw new apiError_1.default(404, 'Payout not found');
    }
    return updated;
}
async function vendorListPayouts(vendorId, status) {
    const query = { vendorId: new mongoose_1.default.Types.ObjectId(vendorId) };
    if (status && status !== 'all')
        query.status = status;
    return Payout_model_1.default.find(query).sort({ createdAt: -1 }).lean();
}
async function vendorPaymentsSummary(vendorId) {
    const payouts = await Payout_model_1.default.find({ vendorId: new mongoose_1.default.Types.ObjectId(vendorId) }).lean();
    const totalPaid = payouts
        .filter((p) => p.status === 'paid')
        .reduce((sum, p) => sum + (p.netAmount ?? p.amount ?? 0), 0);
    const totalPending = payouts
        .filter((p) => p.status !== 'paid')
        .reduce((sum, p) => sum + (p.netAmount ?? p.amount ?? 0), 0);
    const lifetimeGross = payouts.reduce((sum, p) => sum + (p.grossAmount ?? 0), 0);
    const lifetimeCommission = payouts.reduce((sum, p) => sum + (p.commissionAmount ?? 0), 0);
    return {
        totalPaid: roundMoney(totalPaid),
        totalPending: roundMoney(totalPending),
        lifetimeGross: roundMoney(lifetimeGross),
        lifetimeCommission: roundMoney(lifetimeCommission),
    };
}
