"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const mongoose_1 = __importDefault(require("mongoose"));
const ReviewImageSchema = new mongoose_1.default.Schema({
    url: { type: String, required: true },
    alt: { type: String, default: 'Review image' },
}, { _id: false });
const ReviewSchema = new mongoose_1.default.Schema({
    product: {
        type: mongoose_1.default.Schema.Types.ObjectId,
        ref: 'Product',
        required: true,
        index: true
    },
    user: {
        type: mongoose_1.default.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
        index: true
    },
    rating: {
        type: Number,
        required: true,
        min: 1,
        max: 5,
        index: true
    },
    title: { type: String, trim: true },
    comment: { type: String, trim: true },
    images: [ReviewImageSchema],
    isVerifiedPurchase: { type: Boolean, default: false },
    helpfulCount: { type: Number, default: 0 },
    isApproved: { type: Boolean, default: true }, // Admin can moderate if needed
    isDeleted: { type: Boolean, default: false },
}, { timestamps: true });
// Compound index to ensure one review per user per product
ReviewSchema.index({ product: 1, user: 1 }, { unique: true });
// Index for product reviews query
ReviewSchema.index({ product: 1, isApproved: 1, isDeleted: 1 });
// Index for user reviews query
ReviewSchema.index({ user: 1, isDeleted: 1 });
exports.default = mongoose_1.default.model('Review', ReviewSchema);
