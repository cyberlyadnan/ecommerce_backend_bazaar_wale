"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
// src/models/Payout.model.js
const mongoose_1 = __importDefault(require("mongoose"));
const PayoutSchema = new mongoose_1.default.Schema({
    vendorId: { type: mongoose_1.default.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    amount: { type: Number, required: true },
    currency: { type: String, default: 'INR' },
    ordersIncluded: [{ type: mongoose_1.default.Schema.Types.ObjectId, ref: 'Order' }],
    status: { type: String, enum: ['pending', 'processing', 'paid', 'rejected'], default: 'pending', index: true },
    scheduledAt: { type: Date }, // when admin scheduled payout
    paidAt: { type: Date },
    adminNotes: { type: String },
    paymentReference: { type: String } // bank reference / remarks
}, { timestamps: true });
exports.default = mongoose_1.default.model('Payout', PayoutSchema);
