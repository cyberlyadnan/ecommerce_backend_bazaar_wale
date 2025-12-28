"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.rejectVendorByAdmin = exports.approveVendorByAdmin = exports.listVendors = void 0;
const mongoose_1 = __importDefault(require("mongoose"));
const User_model_1 = __importDefault(require("../models/User.model"));
const VendorVerification_model_1 = __importDefault(require("../models/VendorVerification.model"));
const apiError_1 = __importDefault(require("../utils/apiError"));
const auth_service_1 = require("./auth.service");
const listVendors = async ({ status = 'all', search, limit = 100 } = {}) => {
    // Include users who are vendors OR have a vendorStatus (pending applications from customers)
    const baseConditions = [
        {
            $or: [
                { role: 'vendor' },
                { vendorStatus: { $exists: true, $ne: null } }, // Users with vendorStatus set (pending applications)
            ],
        },
        { isDeleted: false },
    ];
    if (status !== 'all') {
        baseConditions.push({ vendorStatus: status });
    }
    if (search && search.trim().length > 0) {
        const term = search.trim();
        const regex = new RegExp(term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
        baseConditions.push({
            $or: [
                { name: regex },
                { businessName: regex },
                { gstNumber: regex },
                { email: regex },
                { phone: regex },
            ],
        });
    }
    const query = baseConditions.length > 0 ? { $and: baseConditions } : {};
    const vendors = await User_model_1.default.find(query)
        .sort({ createdAt: -1 })
        .limit(limit)
        .select('name email phone businessName gstNumber aadharNumber panNumber vendorStatus createdAt updatedAt businessAddress meta')
        .lean();
    const ids = vendors.map((v) => v._id);
    const verifications = await VendorVerification_model_1.default.find({ userId: { $in: ids } })
        .select('userId status submittedAt documents reviewedAt adminNotes')
        .lean();
    const verificationMap = new Map(verifications.map((v) => [v.userId.toString(), v]));
    return vendors.map((vendor) => {
        const verification = verificationMap.get(vendor._id.toString());
        return {
            ...vendor,
            _id: vendor._id.toString(),
            verification: verification
                ? {
                    status: verification.status,
                    submittedAt: verification.submittedAt,
                    reviewedAt: verification.reviewedAt,
                    adminNotes: verification.adminNotes,
                    documents: verification.documents || [],
                }
                : null,
        };
    });
};
exports.listVendors = listVendors;
const approveVendorByAdmin = async (vendorId, adminId) => {
    if (!mongoose_1.default.Types.ObjectId.isValid(vendorId)) {
        throw new apiError_1.default(400, 'Invalid vendor identifier');
    }
    const vendor = await User_model_1.default.findById(vendorId);
    // Allow approval for users who are vendors OR have a vendorStatus (pending applications)
    if (!vendor || (vendor.role !== 'vendor' && !vendor.vendorStatus)) {
        throw new apiError_1.default(404, 'Vendor not found');
    }
    if (vendor.vendorStatus === 'active') {
        return vendor;
    }
    await (0, auth_service_1.approveVendor)(vendorId, adminId);
    return User_model_1.default.findById(vendorId)
        .select('name email phone businessName gstNumber vendorStatus createdAt updatedAt businessAddress meta documents')
        .lean();
};
exports.approveVendorByAdmin = approveVendorByAdmin;
const rejectVendorByAdmin = async (vendorId, adminId, reason) => {
    if (!mongoose_1.default.Types.ObjectId.isValid(vendorId)) {
        throw new apiError_1.default(400, 'Invalid vendor identifier');
    }
    const vendor = await User_model_1.default.findById(vendorId);
    // Allow rejection for users who are vendors OR have a vendorStatus (pending applications)
    if (!vendor || (vendor.role !== 'vendor' && !vendor.vendorStatus)) {
        throw new apiError_1.default(404, 'Vendor not found');
    }
    if (vendor.vendorStatus === 'rejected') {
        return vendor;
    }
    await (0, auth_service_1.rejectVendor)(vendorId, adminId, reason);
    return User_model_1.default.findById(vendorId)
        .select('name email phone businessName gstNumber vendorStatus createdAt updatedAt businessAddress meta documents')
        .lean();
};
exports.rejectVendorByAdmin = rejectVendorByAdmin;
