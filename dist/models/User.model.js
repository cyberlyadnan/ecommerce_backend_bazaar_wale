"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const mongoose_1 = require("mongoose");
const AddressSchema = new mongoose_1.Schema({
    label: { type: String },
    name: { type: String, required: true },
    phone: { type: String, required: true },
    email: { type: String },
    line1: { type: String, required: true },
    line2: { type: String },
    city: { type: String, required: true },
    state: { type: String, required: true },
    country: { type: String, default: 'India' },
    postalCode: { type: String, required: true },
    isDefault: { type: Boolean, default: false },
}, { _id: false });
const UserSchema = new mongoose_1.Schema({
    role: { type: String, enum: ['customer', 'vendor', 'admin'], required: true, index: true },
    name: { type: String, required: true },
    email: { type: String },
    phone: { type: String },
    passwordHash: { type: String },
    isPhoneVerified: { type: Boolean, default: false },
    isEmailVerified: { type: Boolean, default: false },
    businessName: { type: String, index: true },
    gstNumber: { type: String },
    aadharNumber: { type: String },
    panNumber: { type: String },
    businessAddress: { type: AddressSchema },
    vendorStatus: {
        type: String,
        enum: ['pending', 'active', 'rejected', 'suspended'],
        default: 'pending',
        index: true,
    },
    addresses: { type: [AddressSchema], default: [] },
    meta: { type: mongoose_1.Schema.Types.Mixed },
    lastLoginAt: { type: Date },
    isDeleted: { type: Boolean, default: false },
}, { timestamps: true });
UserSchema.index({ email: 1 }, { sparse: true });
UserSchema.index({ phone: 1 }, { sparse: true });
UserSchema.statics.softDelete = async function softDelete(id) {
    await this.updateOne({ _id: id }, { $set: { isDeleted: true } });
};
const User = (0, mongoose_1.model)('User', UserSchema);
exports.default = User;
