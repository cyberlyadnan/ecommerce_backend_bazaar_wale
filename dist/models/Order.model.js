"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
// src/models/Order.model.js
const mongoose_1 = __importDefault(require("mongoose"));
const OrderItemSchema = new mongoose_1.default.Schema({
    productId: { type: mongoose_1.default.Schema.Types.ObjectId, ref: 'Product', required: true },
    title: { type: String, required: true },
    sku: { type: String },
    vendorId: { type: mongoose_1.default.Schema.Types.ObjectId, ref: 'User', required: true },
    vendorSnapshot: {
        vendorName: String,
        vendorPhone: String
    },
    qty: { type: Number, required: true },
    pricePerUnit: { type: Number, required: true },
    totalPrice: { type: Number, required: true }
}, { _id: false });
const ShippingAddressSchema = new mongoose_1.default.Schema({
    name: String, phone: String, line1: String, line2: String, city: String, state: String, country: String, postalCode: String
}, { _id: false });
const OrderSchema = new mongoose_1.default.Schema({
    orderNumber: { type: String, required: true, unique: true, index: true }, // e.g. ORD-20251109-0001
    userId: { type: mongoose_1.default.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    items: [OrderItemSchema],
    subtotal: { type: Number, required: true },
    shippingCost: { type: Number, default: 0 },
    tax: { type: Number, default: 0 },
    total: { type: Number, required: true },
    paymentStatus: { type: String, enum: ['pending', 'paid', 'failed', 'refunded'], default: 'pending', index: true },
    paymentMethod: { type: String, enum: ['razorpay', 'cod', 'other'], default: 'razorpay' },
    razorpayOrderId: { type: String }, // store gateway identifiers
    razorpayPaymentId: { type: String },
    status: { type: String, enum: ['created', 'vendor_shipped_to_warehouse', 'received_in_warehouse', 'packed', 'shipped', 'delivered', 'cancelled'], default: 'created', index: true },
    shippingAddress: ShippingAddressSchema,
    expectedDeliveryDate: { type: Date },
    shippedDate: { type: Date }, // Date when order was shipped to customer
    placedAt: { type: Date, default: Date.now },
    adminNotes: { type: String },
    isDeleted: { type: Boolean, default: false }
}, { timestamps: true });
OrderSchema.index({ userId: 1, orderNumber: 1, status: 1 });
exports.default = mongoose_1.default.model('Order', OrderSchema);
