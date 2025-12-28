"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.deleteProduct = exports.listPublishedProducts = exports.getProductBySlugPublic = exports.listProducts = exports.getProductById = exports.updateProduct = exports.createProduct = void 0;
const mongoose_1 = __importDefault(require("mongoose"));
const Product_model_1 = __importDefault(require("../models/Product.model"));
const User_model_1 = __importDefault(require("../models/User.model"));
const apiError_1 = __importDefault(require("../utils/apiError"));
const slugify_1 = __importDefault(require("../utils/slugify"));
const resolveProductSlug = async (title, providedSlug, excludeId) => {
    const base = (0, slugify_1.default)(providedSlug ?? title);
    if (!base) {
        throw new apiError_1.default(400, 'Unable to derive product slug');
    }
    let candidate = base;
    let attempt = 1;
    const query = { slug: candidate };
    if (excludeId) {
        query._id = { $ne: excludeId };
    }
    while (await Product_model_1.default.exists(query)) {
        candidate = `${base}-${attempt++}`;
        query.slug = candidate;
    }
    return candidate;
};
const buildVendorSnapshot = (vendor) => ({
    vendorId: vendor._id,
    vendorName: vendor.name,
    vendorPhone: vendor.phone,
    vendorEmail: vendor.email,
    vendorBusinessName: vendor.businessName,
    vendorGstNumber: vendor.gstNumber,
});
const normaliseImages = (images) => (images ?? [])
    .filter((image) => image.url)
    .map((image, index) => ({
    url: image.url.trim(),
    alt: image.alt?.trim(),
    order: typeof image.order === 'number' ? image.order : index,
}));
const normalisePricing = (pricing) => (pricing ?? [])
    .filter((tier) => tier.minQty && tier.pricePerUnit)
    .map((tier) => ({
    minQty: Number(tier.minQty),
    pricePerUnit: Number(tier.pricePerUnit),
}));
const createProduct = async (input) => {
    const vendor = await User_model_1.default.findById(input.vendorId);
    if (!vendor || (vendor.role !== 'vendor' && vendor.role !== 'admin')) {
        throw new apiError_1.default(400, 'Vendor not found or invalid vendor');
    }
    const slug = await resolveProductSlug(input.title, input.slug);
    const tags = input.tags?.map((tag) => tag.trim()).filter(Boolean) ?? [];
    // Phase 1: Auto-approve vendor products
    // If vendor is creating, auto-approve and use isActive as public/draft toggle
    const isVendorProduct = vendor.role === 'vendor';
    const isActive = typeof input.isActive === 'boolean' ? input.isActive : true;
    // Auto-approve vendor products, but respect admin's approval setting for admin-created products
    const approvedByAdmin = isVendorProduct ? true : (typeof input.approvedByAdmin === 'boolean' ? input.approvedByAdmin : false);
    const product = await Product_model_1.default.create({
        title: input.title.trim(),
        slug,
        sku: input.sku?.trim(),
        description: input.description?.trim(),
        shortDescription: input.shortDescription?.trim(),
        category: input.category ? new mongoose_1.default.Types.ObjectId(input.category) : undefined,
        subcategory: input.subcategory ? new mongoose_1.default.Types.ObjectId(input.subcategory) : undefined,
        images: normaliseImages(input.images),
        attributes: input.attributes ?? {},
        stock: typeof input.stock === 'number' ? input.stock : 0,
        minOrderQty: typeof input.minOrderQty === 'number' ? input.minOrderQty : 1,
        weightKg: input.weightKg,
        vendor: vendor._id,
        vendorSnapshot: buildVendorSnapshot(vendor),
        price: Number(input.price),
        pricingTiers: normalisePricing(input.pricingTiers),
        isActive,
        approvedByAdmin,
        featured: typeof input.featured === 'boolean' ? input.featured : false,
        tags,
        meta: input.meta,
    });
    return product.toObject();
};
exports.createProduct = createProduct;
const updateProduct = async (productId, input) => {
    const product = await Product_model_1.default.findById(productId);
    if (!product) {
        throw new apiError_1.default(404, 'Product not found');
    }
    // Check if this is a vendor product (for auto-approval)
    const vendor = await User_model_1.default.findById(product.vendor);
    const isVendorProduct = vendor && vendor.role === 'vendor';
    if (input.vendorId && input.vendorId !== product.vendor.toString()) {
        const newVendor = await User_model_1.default.findById(input.vendorId);
        if (!newVendor || (newVendor.role !== 'vendor' && newVendor.role !== 'admin')) {
            throw new apiError_1.default(400, 'Vendor not found or invalid vendor');
        }
        product.vendor = newVendor._id;
        product.vendorSnapshot = buildVendorSnapshot(newVendor);
    }
    if (input.title) {
        product.title = input.title.trim();
    }
    if (input.slug || input.title) {
        product.slug = await resolveProductSlug(input.title ?? product.title, input.slug ?? product.slug, productId);
    }
    if (typeof input.sku !== 'undefined') {
        product.sku = input.sku?.trim();
    }
    if (typeof input.description !== 'undefined') {
        product.description = input.description?.trim();
    }
    if (typeof input.shortDescription !== 'undefined') {
        product.shortDescription = input.shortDescription?.trim();
    }
    if (typeof input.category !== 'undefined') {
        product.category = input.category ? new mongoose_1.default.Types.ObjectId(input.category) : undefined;
    }
    if (typeof input.subcategory !== 'undefined') {
        product.subcategory = input.subcategory ? new mongoose_1.default.Types.ObjectId(input.subcategory) : undefined;
    }
    if (typeof input.stock === 'number') {
        product.stock = input.stock;
    }
    if (typeof input.minOrderQty === 'number') {
        product.minOrderQty = input.minOrderQty;
    }
    if (typeof input.weightKg === 'number') {
        product.weightKg = input.weightKg;
    }
    if (typeof input.price === 'number') {
        product.price = input.price;
    }
    if (typeof input.isActive === 'boolean') {
        product.isActive = input.isActive;
    }
    // Phase 1: Auto-approve vendor products - always keep them approved
    if (isVendorProduct) {
        product.approvedByAdmin = true;
    }
    else if (typeof input.approvedByAdmin === 'boolean') {
        product.approvedByAdmin = input.approvedByAdmin;
    }
    // Only admins can set featured status
    if (typeof input.featured === 'boolean') {
        product.featured = input.featured;
    }
    if (input.tags) {
        const tags = input.tags.map((tag) => tag.trim()).filter(Boolean);
        product.tags = tags.length > 0 ? tags : [];
    }
    if (input.attributes) {
        product.attributes = new Map(Object.entries(input.attributes));
    }
    if (input.images) {
        product.images = normaliseImages(input.images);
        product.markModified('images');
    }
    if (input.pricingTiers) {
        product.pricingTiers = normalisePricing(input.pricingTiers);
        product.markModified('pricingTiers');
    }
    if (typeof input.meta !== 'undefined') {
        product.meta = input.meta;
    }
    await product.save();
    return product.toObject();
};
exports.updateProduct = updateProduct;
const getProductById = async (productId) => {
    if (!mongoose_1.default.Types.ObjectId.isValid(productId)) {
        throw new apiError_1.default(400, 'Invalid product id');
    }
    const product = await Product_model_1.default.findById(productId)
        .populate('category')
        .populate('subcategory')
        .populate({ path: 'vendor', select: 'name email phone businessName gstNumber' })
        .lean();
    if (!product) {
        throw new apiError_1.default(404, 'Product not found');
    }
    return {
        ...product,
        _id: product._id.toString(),
        category: product.category
            ? {
                ...product.category,
                _id: product.category._id.toString(),
            }
            : null,
        subcategory: product.subcategory
            ? {
                ...product.subcategory,
                _id: product.subcategory._id.toString(),
            }
            : null,
        vendor: product.vendor
            ? {
                ...product.vendor,
                _id: product.vendor._id.toString(),
            }
            : null,
    };
};
exports.getProductById = getProductById;
const mapProduct = (product) => ({
    ...product,
    _id: product._id.toString(),
    category: product.category
        ? {
            ...product.category,
            _id: product.category._id.toString(),
        }
        : null,
    subcategory: product.subcategory
        ? {
            ...product.subcategory,
            _id: product.subcategory._id.toString(),
        }
        : null,
    vendor: product.vendor
        ? {
            ...product.vendor,
            _id: product.vendor._id.toString(),
        }
        : null,
});
const listProducts = async ({ search, scope = 'all', adminId, limit = 200, publishedOnly = false, } = {}) => {
    const query = {};
    if (scope === 'mine' && adminId) {
        query.vendor = new mongoose_1.default.Types.ObjectId(adminId);
    }
    if (publishedOnly) {
        query.isActive = true;
    }
    if (search && search.trim().length > 0) {
        const term = search.trim();
        const regex = new RegExp(term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
        const matchingVendors = await User_model_1.default.find({
            $or: [{ name: regex }, { businessName: regex }, { gstNumber: regex }],
        }).select('_id');
        const vendorIds = matchingVendors.map((vendor) => vendor._id);
        const orConditions = [
            { title: regex },
            { slug: regex },
            { tags: regex },
            { tagsText: regex },
            { shortDescription: regex },
            { description: regex },
            { 'vendorSnapshot.vendorName': regex },
            { 'vendorSnapshot.vendorBusinessName': regex },
            { 'vendorSnapshot.vendorGstNumber': regex },
        ];
        if (vendorIds.length > 0) {
            orConditions.push({ vendor: { $in: vendorIds } });
        }
        query.$or = orConditions;
    }
    const limitValue = Math.min(Math.max(Number(limit) || 200, 1), 200);
    const products = await Product_model_1.default.find(query)
        .sort({ createdAt: -1 })
        .limit(limitValue)
        .populate('category')
        .populate('subcategory')
        .populate({ path: 'vendor', select: 'name email phone businessName gstNumber' })
        .lean();
    return products.map(mapProduct);
};
exports.listProducts = listProducts;
const getProductBySlugPublic = async (slug) => {
    if (!slug || !slug.trim()) {
        throw new apiError_1.default(400, 'Invalid product slug');
    }
    const product = await Product_model_1.default.findOne({
        slug,
        isActive: true,
    })
        .populate('category')
        .populate('subcategory')
        .populate({ path: 'vendor', select: 'name email phone businessName gstNumber' })
        .lean();
    if (!product) {
        throw new apiError_1.default(404, 'Product not found');
    }
    return mapProduct(product);
};
exports.getProductBySlugPublic = getProductBySlugPublic;
const listPublishedProducts = async ({ search, limit } = {}) => (0, exports.listProducts)({
    search,
    limit,
    scope: 'all',
    publishedOnly: true,
});
exports.listPublishedProducts = listPublishedProducts;
const deleteProduct = async (productId, userId, userRole) => {
    if (!mongoose_1.default.Types.ObjectId.isValid(productId)) {
        throw new apiError_1.default(400, 'Invalid product id');
    }
    const product = await Product_model_1.default.findById(productId).lean();
    if (!product) {
        throw new apiError_1.default(404, 'Product not found');
    }
    // Only admins or the product owner (vendor) can delete
    const productVendorId = product.vendor?.toString();
    const isOwner = productVendorId === userId;
    const isAdmin = userRole === 'admin';
    if (!isAdmin && !isOwner) {
        throw new apiError_1.default(403, 'You do not have permission to delete this product');
    }
    await Product_model_1.default.findByIdAndDelete(productId);
    return { message: 'Product deleted successfully' };
};
exports.deleteProduct = deleteProduct;
