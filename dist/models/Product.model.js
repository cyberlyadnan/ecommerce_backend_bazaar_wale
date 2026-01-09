"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
// src/models/Product.model.js
const mongoose_1 = __importDefault(require("mongoose"));
const ProductImageSchema = new mongoose_1.default.Schema({
    url: { type: String, required: true },
    alt: { type: String },
    order: { type: Number, default: 0 }
}, { _id: false });
const VendorSnapshotSchema = new mongoose_1.default.Schema({
    vendorId: { type: mongoose_1.default.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    vendorName: { type: String, required: true },
    vendorPhone: { type: String },
    vendorEmail: { type: String },
    vendorBusinessName: { type: String },
    vendorGstNumber: { type: String },
}, { _id: false });
const PricingTierSchema = new mongoose_1.default.Schema({
    minQty: { type: Number, required: true }, // >=1
    pricePerUnit: { type: Number, required: true } // INR or currency cents
}, { _id: false });
const ProductSchema = new mongoose_1.default.Schema({
    title: { type: String, required: true, index: true },
    slug: { type: String, required: true, index: true, unique: true },
    sku: { type: String, index: true },
    description: { type: String },
    shortDescription: { type: String },
    category: { type: mongoose_1.default.Schema.Types.ObjectId, ref: 'Category', index: true },
    subcategory: { type: mongoose_1.default.Schema.Types.ObjectId, ref: 'Category' },
    images: [ProductImageSchema],
    attributes: { type: Map, of: String }, // e.g., { color: 'red', size: 'L' }
    stock: { type: Number, default: 0 }, // total stock available
    minOrderQty: { type: Number, default: 1 }, // vendor-defined minimum order qty
    weightKg: { type: Number },
    // vendor reference + snapshot for quick display / admin order lookups
    vendor: { type: mongoose_1.default.Schema.Types.ObjectId, ref: 'User', required: true },
    vendorSnapshot: VendorSnapshotSchema,
    price: { type: Number, required: true }, // base price
    pricingTiers: [PricingTierSchema], // optional bulk pricing tiers
    // Tax information
    taxCode: { type: String }, // e.g., "GST", "IGST", "CGST+SGST"
    taxPercentage: { type: Number, default: 18, min: 0, max: 100 }, // Tax percentage (0-100)
    isActive: { type: Boolean, default: true },
    approvedByAdmin: { type: Boolean, default: false },
    featured: { type: Boolean, default: false, index: true }, // Featured products for homepage
    // analytics
    totalSold: { type: Number, default: 0 },
    tags: { type: [String], default: [] },
    tagsText: { type: String, default: '' },
    meta: { type: mongoose_1.default.Schema.Types.Mixed }
}, { timestamps: true });
// Automatically mirror tags into a text-searchable string
ProductSchema.pre('save', function setTagsText(next) {
    if (Array.isArray(this.tags) && this.tags.length > 0) {
        this.tagsText = this.tags
            .map((tag) => tag.trim())
            .filter(Boolean)
            .join(' ');
    }
    else {
        this.tagsText = '';
    }
    next();
});
ProductSchema.pre('findOneAndUpdate', function setTagsText(next) {
    const updateRaw = this.getUpdate();
    const update = updateRaw && typeof updateRaw === 'object' && !Array.isArray(updateRaw) ? updateRaw : undefined;
    if (update) {
        const tags = update.tags ??
            update.$set?.tags;
        if (Array.isArray(tags)) {
            const tagsText = tags.map((tag) => String(tag).trim()).filter(Boolean).join(' ');
            if (!update.$set) {
                update.$set = {};
            }
            update.$set.tagsText = tagsText;
            this.setUpdate(update);
        }
    }
    next();
});
// Indexes for common queries
ProductSchema.index({ title: 'text', description: 'text', shortDescription: 'text', tagsText: 'text' });
ProductSchema.index({ vendor: 1, category: 1 });
exports.default = mongoose_1.default.model('Product', ProductSchema);
