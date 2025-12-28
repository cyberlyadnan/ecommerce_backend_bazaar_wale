"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const mongoose_1 = require("mongoose");
const VendorVerificationSchema = new mongoose_1.Schema({
    userId: { type: mongoose_1.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    submittedAt: { type: Date, default: Date.now },
    documents: [
        {
            type: {
                type: String,
            },
            url: { type: String },
            fileName: { type: String },
        },
    ],
    businessName: { type: String },
    gstNumber: { type: String },
    aadharNumber: { type: String },
    status: {
        type: String,
        enum: ['pending', 'approved', 'rejected'],
        default: 'pending',
        index: true,
    },
    adminNotes: { type: String },
    reviewedBy: { type: mongoose_1.Schema.Types.ObjectId, ref: 'User' },
    reviewedAt: { type: Date },
}, { timestamps: true });
const VendorVerification = (0, mongoose_1.model)('VendorVerification', VendorVerificationSchema);
exports.default = VendorVerification;
