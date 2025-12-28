"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getVendorProfileWithDocs = getVendorProfileWithDocs;
exports.updateVendorBasicProfile = updateVendorBasicProfile;
const mongoose_1 = __importDefault(require("mongoose"));
const apiError_1 = __importDefault(require("../utils/apiError"));
const User_model_1 = __importDefault(require("../models/User.model"));
const VendorVerification_model_1 = __importDefault(require("../models/VendorVerification.model"));
async function getVendorProfileWithDocs(vendorId) {
    if (!mongoose_1.default.Types.ObjectId.isValid(vendorId)) {
        throw new apiError_1.default(400, 'Invalid vendor id');
    }
    const user = await User_model_1.default.findById(vendorId)
        .select('role name email phone businessName gstNumber aadharNumber panNumber vendorStatus createdAt updatedAt isDeleted meta')
        .lean();
    if (!user || user.isDeleted || user.role !== 'vendor') {
        throw new apiError_1.default(404, 'Vendor not found');
    }
    const verification = await VendorVerification_model_1.default.findOne({ userId: user._id })
        .select('status submittedAt reviewedAt adminNotes documents')
        .lean();
    return {
        vendor: {
            _id: user._id.toString(),
            name: user.name,
            email: user.email,
            phone: user.phone,
            businessName: user.businessName,
            gstNumber: user.gstNumber,
            aadharNumber: user.aadharNumber,
            panNumber: user.panNumber || (typeof user?.meta?.panNumber === 'string' ? user.meta.panNumber : undefined),
            vendorStatus: user.vendorStatus,
            createdAt: user.createdAt,
            updatedAt: user.updatedAt,
        },
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
}
async function updateVendorBasicProfile(vendorId, input) {
    if (!mongoose_1.default.Types.ObjectId.isValid(vendorId)) {
        throw new apiError_1.default(400, 'Invalid vendor id');
    }
    const update = {};
    if (typeof input.name === 'string') {
        const trimmed = input.name.trim();
        if (trimmed.length < 2)
            throw new apiError_1.default(400, 'Name must be at least 2 characters');
        update.name = trimmed;
    }
    const updated = await User_model_1.default.findOneAndUpdate({ _id: new mongoose_1.default.Types.ObjectId(vendorId), role: 'vendor', isDeleted: false }, { $set: update }, { new: true })
        .select('name email phone businessName gstNumber aadharNumber panNumber vendorStatus createdAt updatedAt meta')
        .lean();
    if (!updated) {
        throw new apiError_1.default(404, 'Vendor not found');
    }
    return {
        _id: updated._id.toString(),
        name: updated.name,
        email: updated.email,
        phone: updated.phone,
        businessName: updated.businessName,
        gstNumber: updated.gstNumber,
        aadharNumber: updated.aadharNumber,
        panNumber: updated.panNumber ||
            (typeof updated?.meta?.panNumber === 'string' ? updated.meta.panNumber : undefined),
        vendorStatus: updated.vendorStatus,
        createdAt: updated.createdAt,
        updatedAt: updated.updatedAt,
    };
}
