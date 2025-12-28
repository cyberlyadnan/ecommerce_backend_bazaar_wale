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
exports.vendorListPayoutsHandler = exports.vendorSummaryHandler = exports.adminUpdatePayoutHandler = exports.adminCreatePayoutHandler = exports.adminListPayoutsHandler = exports.updateCommissionHandler = exports.getCommissionHandler = void 0;
const express_validator_1 = require("express-validator");
const apiError_1 = __importDefault(require("../utils/apiError"));
const commissionConfig_service_1 = require("../services/commissionConfig.service");
const payoutService = __importStar(require("../services/payout.service"));
// -------- Admin: Commission --------
const getCommissionHandler = async (req, res, next) => {
    try {
        if (!req.user || req.user.role !== 'admin')
            throw new apiError_1.default(403, 'Admin access required');
        const commissionPercent = await (0, commissionConfig_service_1.getCommissionPercent)();
        res.json({ success: true, commissionPercent });
    }
    catch (e) {
        next(e);
    }
};
exports.getCommissionHandler = getCommissionHandler;
const updateCommissionHandler = async (req, res, next) => {
    try {
        if (!req.user || req.user.role !== 'admin')
            throw new apiError_1.default(403, 'Admin access required');
        const errors = (0, express_validator_1.validationResult)(req);
        if (!errors.isEmpty())
            throw new apiError_1.default(400, 'Validation failed');
        const commissionPercent = Number(req.body.commissionPercent);
        const updated = await (0, commissionConfig_service_1.setCommissionPercent)(commissionPercent, req.user._id.toString());
        res.json({ success: true, commissionPercent: updated, message: 'Commission updated' });
    }
    catch (e) {
        next(e);
    }
};
exports.updateCommissionHandler = updateCommissionHandler;
// -------- Admin: Payouts --------
const adminListPayoutsHandler = async (req, res, next) => {
    try {
        if (!req.user || req.user.role !== 'admin')
            throw new apiError_1.default(403, 'Admin access required');
        const status = typeof req.query.status === 'string' ? req.query.status : undefined;
        const vendorId = typeof req.query.vendorId === 'string' ? req.query.vendorId : undefined;
        const search = typeof req.query.search === 'string' ? req.query.search : undefined;
        const payouts = await payoutService.adminListPayouts({
            status: status || 'all',
            vendorId,
            search,
        });
        res.json({ success: true, payouts });
    }
    catch (e) {
        next(e);
    }
};
exports.adminListPayoutsHandler = adminListPayoutsHandler;
const adminCreatePayoutHandler = async (req, res, next) => {
    try {
        if (!req.user || req.user.role !== 'admin')
            throw new apiError_1.default(403, 'Admin access required');
        const errors = (0, express_validator_1.validationResult)(req);
        if (!errors.isEmpty())
            throw new apiError_1.default(400, 'Validation failed');
        const payout = await payoutService.adminCreatePayout(req.body, req.user._id.toString());
        res.json({ success: true, payout, message: 'Payout created' });
    }
    catch (e) {
        next(e);
    }
};
exports.adminCreatePayoutHandler = adminCreatePayoutHandler;
const adminUpdatePayoutHandler = async (req, res, next) => {
    try {
        if (!req.user || req.user.role !== 'admin')
            throw new apiError_1.default(403, 'Admin access required');
        const errors = (0, express_validator_1.validationResult)(req);
        if (!errors.isEmpty())
            throw new apiError_1.default(400, 'Validation failed');
        const { payoutId } = req.params;
        const payout = await payoutService.adminUpdatePayout(payoutId, req.body, req.user._id.toString());
        res.json({ success: true, payout, message: 'Payout updated' });
    }
    catch (e) {
        next(e);
    }
};
exports.adminUpdatePayoutHandler = adminUpdatePayoutHandler;
// -------- Vendor --------
const vendorSummaryHandler = async (req, res, next) => {
    try {
        if (!req.user || req.user.role !== 'vendor')
            throw new apiError_1.default(403, 'Vendor access required');
        const summary = await payoutService.vendorPaymentsSummary(req.user._id.toString());
        res.json({ success: true, summary });
    }
    catch (e) {
        next(e);
    }
};
exports.vendorSummaryHandler = vendorSummaryHandler;
const vendorListPayoutsHandler = async (req, res, next) => {
    try {
        if (!req.user || req.user.role !== 'vendor')
            throw new apiError_1.default(403, 'Vendor access required');
        const status = typeof req.query.status === 'string' ? req.query.status : undefined;
        const payouts = await payoutService.vendorListPayouts(req.user._id.toString(), status || 'all');
        res.json({ success: true, payouts });
    }
    catch (e) {
        next(e);
    }
};
exports.vendorListPayoutsHandler = vendorListPayoutsHandler;
