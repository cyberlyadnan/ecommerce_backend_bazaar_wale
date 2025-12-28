import mongoose from 'mongoose';

import Product from '../models/Product.model';
import User from '../models/User.model';
import ApiError from '../utils/apiError';
import slugify from '../utils/slugify';

interface ProductImageInput {
  url: string;
  alt?: string;
  order?: number;
}

interface PricingTierInput {
  minQty: number;
  pricePerUnit: number;
}

export interface ProductInput {
  title: string;
  slug?: string;
  sku?: string;
  description?: string;
  shortDescription?: string;
  category?: string | null;
  subcategory?: string | null;
  images?: ProductImageInput[];
  attributes?: Record<string, string>;
  stock?: number;
  minOrderQty?: number;
  weightKg?: number;
  vendorId: string;
  price: number;
  pricingTiers?: PricingTierInput[];
  isActive?: boolean;
  approvedByAdmin?: boolean;
  featured?: boolean;
  tags?: string[];
  meta?: Record<string, unknown>;
}

export interface ProductUpdateInput extends Partial<ProductInput> {
  vendorId?: string;
}

const resolveProductSlug = async (title: string, providedSlug?: string, excludeId?: string) => {
  const base = slugify(providedSlug ?? title);
  if (!base) {
    throw new ApiError(400, 'Unable to derive product slug');
  }

  let candidate = base;
  let attempt = 1;
  const query: mongoose.FilterQuery<typeof Product> = { slug: candidate };
  if (excludeId) {
    query._id = { $ne: excludeId };
  }

  while (await Product.exists(query)) {
    candidate = `${base}-${attempt++}`;
    query.slug = candidate;
  }

  return candidate;
};

const buildVendorSnapshot = (vendor: typeof User.prototype) => ({
  vendorId: vendor._id,
  vendorName: vendor.name,
  vendorPhone: vendor.phone,
  vendorEmail: vendor.email,
  vendorBusinessName: vendor.businessName,
  vendorGstNumber: vendor.gstNumber,
});

const normaliseImages = (images?: ProductImageInput[]) =>
  (images ?? [])
    .filter((image) => image.url)
    .map((image, index) => ({
      url: image.url.trim(),
      alt: image.alt?.trim(),
      order: typeof image.order === 'number' ? image.order : index,
    }));

const normalisePricing = (pricing?: PricingTierInput[]) =>
  (pricing ?? [])
    .filter((tier) => tier.minQty && tier.pricePerUnit)
    .map((tier) => ({
      minQty: Number(tier.minQty),
      pricePerUnit: Number(tier.pricePerUnit),
    }));

export const createProduct = async (input: ProductInput) => {
  const vendor = await User.findById(input.vendorId);
  if (!vendor || (vendor.role !== 'vendor' && vendor.role !== 'admin')) {
    throw new ApiError(400, 'Vendor not found or invalid vendor');
  }

  const slug = await resolveProductSlug(input.title, input.slug);

  const tags = input.tags?.map((tag) => tag.trim()).filter(Boolean) ?? [];

  // Phase 1: Auto-approve vendor products
  // If vendor is creating, auto-approve and use isActive as public/draft toggle
  const isVendorProduct = vendor.role === 'vendor';
  const isActive = typeof input.isActive === 'boolean' ? input.isActive : true;
  // Auto-approve vendor products, but respect admin's approval setting for admin-created products
  const approvedByAdmin = isVendorProduct ? true : (typeof input.approvedByAdmin === 'boolean' ? input.approvedByAdmin : false);

  const product = await Product.create({
    title: input.title.trim(),
    slug,
    sku: input.sku?.trim(),
    description: input.description?.trim(),
    shortDescription: input.shortDescription?.trim(),
    category: input.category ? new mongoose.Types.ObjectId(input.category) : undefined,
    subcategory: input.subcategory ? new mongoose.Types.ObjectId(input.subcategory) : undefined,
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

export const updateProduct = async (productId: string, input: ProductUpdateInput) => {
  const product = await Product.findById(productId);
  if (!product) {
    throw new ApiError(404, 'Product not found');
  }

  // Check if this is a vendor product (for auto-approval)
  const vendor = await User.findById(product.vendor);
  const isVendorProduct = vendor && vendor.role === 'vendor';

  if (input.vendorId && input.vendorId !== product.vendor.toString()) {
    const newVendor = await User.findById(input.vendorId);
    if (!newVendor || (newVendor.role !== 'vendor' && newVendor.role !== 'admin')) {
      throw new ApiError(400, 'Vendor not found or invalid vendor');
    }
    product.vendor = newVendor._id;
    product.vendorSnapshot = buildVendorSnapshot(newVendor);
  }

  if (input.title) {
    product.title = input.title.trim();
  }
  if (input.slug || input.title) {
    product.slug = await resolveProductSlug(
      input.title ?? product.title,
      input.slug ?? product.slug,
      productId,
    );
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
    product.category = input.category ? new mongoose.Types.ObjectId(input.category) : undefined;
  }
  if (typeof input.subcategory !== 'undefined') {
    product.subcategory = input.subcategory ? new mongoose.Types.ObjectId(input.subcategory) : undefined;
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
  } else if (typeof input.approvedByAdmin === 'boolean') {
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
    product.attributes = input.attributes;
  }
  if (input.images) {
    product.images = normaliseImages(input.images);
  }
  if (input.pricingTiers) {
    product.pricingTiers = normalisePricing(input.pricingTiers);
  }
  if (typeof input.meta !== 'undefined') {
    product.meta = input.meta;
  }

  await product.save();
  return product.toObject();
};

export const getProductById = async (productId: string) => {
  if (!mongoose.Types.ObjectId.isValid(productId)) {
    throw new ApiError(400, 'Invalid product id');
  }

  const product = await Product.findById(productId)
    .populate('category')
    .populate('subcategory')
    .populate({ path: 'vendor', select: 'name email phone businessName gstNumber' })
    .lean();

  if (!product) {
    throw new ApiError(404, 'Product not found');
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

interface ListProductsOptions {
  search?: string;
  scope?: 'all' | 'mine';
  adminId?: string;
  limit?: number;
  publishedOnly?: boolean;
}

const mapProduct = (product: any) => ({
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

export const listProducts = async ({
  search,
  scope = 'all',
  adminId,
  limit = 200,
  publishedOnly = false,
}: ListProductsOptions = {}) => {
  const query: mongoose.FilterQuery<typeof Product> = {};

  if (scope === 'mine' && adminId) {
    query.vendor = new mongoose.Types.ObjectId(adminId);
  }

  if (publishedOnly) {
    query.isActive = true;
  }

  if (search && search.trim().length > 0) {
    const term = search.trim();
    const regex = new RegExp(term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');

    const matchingVendors = await User.find({
      $or: [{ name: regex }, { businessName: regex }, { gstNumber: regex }],
    }).select('_id');
    const vendorIds = matchingVendors.map((vendor) => vendor._id);

    const orConditions: mongoose.FilterQuery<typeof Product>[] = [
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

  const products = await Product.find(query)
    .sort({ createdAt: -1 })
    .limit(limitValue)
    .populate('category')
    .populate('subcategory')
    .populate({ path: 'vendor', select: 'name email phone businessName gstNumber' })
    .lean();

  return products.map(mapProduct);
};

export const getProductBySlugPublic = async (slug: string) => {
  if (!slug || !slug.trim()) {
    throw new ApiError(400, 'Invalid product slug');
  }

  const product = await Product.findOne({
    slug,
    isActive: true,
  })
    .populate('category')
    .populate('subcategory')
    .populate({ path: 'vendor', select: 'name email phone businessName gstNumber' })
    .lean();

  if (!product) {
    throw new ApiError(404, 'Product not found');
  }

  return mapProduct(product);
};

export const listPublishedProducts = async ({ search, limit }: { search?: string; limit?: number } = {}) =>
  listProducts({
    search,
    limit,
    scope: 'all',
    publishedOnly: true,
  });

export const deleteProduct = async (productId: string, userId: string, userRole: string) => {
  if (!mongoose.Types.ObjectId.isValid(productId)) {
    throw new ApiError(400, 'Invalid product id');
  }

  const product = await Product.findById(productId).lean();

  if (!product) {
    throw new ApiError(404, 'Product not found');
  }

  // Only admins or the product owner (vendor) can delete
  const productVendorId = product.vendor?.toString();
  const isOwner = productVendorId === userId;
  const isAdmin = userRole === 'admin';

  if (!isAdmin && !isOwner) {
    throw new ApiError(403, 'You do not have permission to delete this product');
  }

  await Product.findByIdAndDelete(productId);

  return { message: 'Product deleted successfully' };
};


