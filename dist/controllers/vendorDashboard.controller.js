"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.updateVendorProfileHandler = exports.getVendorProfileHandler = exports.getVendorDashboardStatsHandler = void 0;
const apiError_1 = __importDefault(require("../utils/apiError"));
const vendorDashboard_service_1 = require("../services/vendorDashboard.service");
const vendorProfile_service_1 = require("../services/vendorProfile.service");
/**
 * Get vendor dashboard statistics
 * GET /api/vendor/dashboard/stats
 */
const getVendorDashboardStatsHandler = async (req, res, next) => {
    try {
        if (!req.user) {
            throw new apiError_1.default(401, 'Authentication required');
        }
        if (req.user.role !== 'vendor') {
            throw new apiError_1.default(403, 'Vendor access required');
        }
        const vendorId = req.user._id.toString();
        const stats = await (0, vendorDashboard_service_1.getVendorDashboardStats)(vendorId);
        res.json({
            success: true,
            stats,
        });
    }
    catch (error) {
        next(error);
    }
};
exports.getVendorDashboardStatsHandler = getVendorDashboardStatsHandler;
/**
 * Get vendor settings/profile (includes verification documents)
 * GET /api/vendor/dashboard/profile
 */
const getVendorProfileHandler = async (req, res, next) => {
    try {
        if (!req.user)
            throw new apiError_1.default(401, 'Authentication required');
        if (req.user.role !== 'vendor')
            throw new apiError_1.default(403, 'Vendor access required');
        const data = await (0, vendorProfile_service_1.getVendorProfileWithDocs)(req.user._id.toString());
        res.json({ success: true, ...data });
    }
    catch (e) {
        next(e);
    }
};
exports.getVendorProfileHandler = getVendorProfileHandler;
/**
 * Update vendor basic profile (editable fields only)
 * PATCH /api/vendor/dashboard/profile
 */
const updateVendorProfileHandler = async (req, res, next) => {
    try {
        if (!req.user)
            throw new apiError_1.default(401, 'Authentication required');
        if (req.user.role !== 'vendor')
            throw new apiError_1.default(403, 'Vendor access required');
        const vendor = await (0, vendorProfile_service_1.updateVendorBasicProfile)(req.user._id.toString(), { name: req.body?.name });
        res.json({ success: true, vendor, message: 'Profile updated' });
    }
    catch (e) {
        next(e);
    }
};
exports.updateVendorProfileHandler = updateVendorProfileHandler;
