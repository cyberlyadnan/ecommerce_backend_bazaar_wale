"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
// src/models/Cart.model.js
const mongoose_1 = __importDefault(require("mongoose"));
const CartItemSchema = new mongoose_1.default.Schema({
    productId: { type: mongoose_1.default.Schema.Types.ObjectId, ref: 'Product', required: true },
    title: { type: String, required: true },
    vendorId: { type: mongoose_1.default.Schema.Types.ObjectId, ref: 'User', required: true },
    pricePerUnit: { type: Number, required: true },
    qty: { type: Number, required: true, min: 1 },
    minOrderQty: { type: Number, default: 1 },
    meta: { type: mongoose_1.default.Schema.Types.Mixed }
}, { _id: false });
const CartSchema = new mongoose_1.default.Schema({
    userId: { type: mongoose_1.default.Schema.Types.ObjectId, ref: 'User', required: true, unique: true },
    items: [CartItemSchema],
    updatedAt: { type: Date, default: Date.now }
}, { timestamps: true });
CartSchema.index({ userId: 1 });
exports.default = mongoose_1.default.model('Cart', CartSchema);
