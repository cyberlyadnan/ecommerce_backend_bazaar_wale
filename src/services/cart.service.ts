import mongoose from 'mongoose';

import Cart from '../models/Cart.model';
import Product from '../models/Product.model';
import ApiError from '../utils/apiError';

export interface AddToCartInput {
  productId: string;
  qty: number;
}

export interface UpdateCartItemInput {
  productId: string;
  qty: number;
}

/**
 * Get or create cart for a user
 */
export const getOrCreateCart = async (userId: string) => {
  let cart = await Cart.findOne({ userId: new mongoose.Types.ObjectId(userId) }).lean();

  if (!cart) {
    cart = await Cart.create({
      userId: new mongoose.Types.ObjectId(userId),
      items: [],
    });
    return cart.toObject();
  }

  return {
    ...cart,
    _id: cart._id.toString(),
    userId: cart.userId.toString(),
    items: cart.items.map((item) => ({
      ...item,
      productId: item.productId.toString(),
      vendorId: item.vendorId.toString(),
    })),
  };
};

/**
 * Get cart for a user
 */
export const getCart = async (userId: string) => {
  const cart = await Cart.findOne({ userId: new mongoose.Types.ObjectId(userId) })
    .populate('items.productId', 'title slug images price minOrderQty stock isActive')
    .lean();

  if (!cart) {
    return null;
  }

  return {
    ...cart,
    _id: cart._id.toString(),
    userId: cart.userId.toString(),
    items: cart.items.map((item: any) => ({
      ...item,
      productId: item.productId
        ? {
            ...item.productId,
            _id: item.productId._id.toString(),
          }
        : null,
      vendorId: item.vendorId.toString(),
    })),
  };
};

/**
 * Add item to cart
 */
export const addToCart = async (userId: string, input: AddToCartInput) => {
  if (!mongoose.Types.ObjectId.isValid(input.productId)) {
    throw new ApiError(400, 'Invalid product ID');
  }

  const product = await Product.findById(input.productId).lean();
  if (!product) {
    throw new ApiError(404, 'Product not found');
  }

  if (!product.isActive) {
    throw new ApiError(400, 'Product is not available');
  }

  if (product.stock < input.qty) {
    throw new ApiError(400, 'Insufficient stock available');
  }

  if (input.qty < product.minOrderQty) {
    throw new ApiError(400, `Minimum order quantity is ${product.minOrderQty}`);
  }

  let cart = await Cart.findOne({ userId: new mongoose.Types.ObjectId(userId) });

  if (!cart) {
    cart = await Cart.create({
      userId: new mongoose.Types.ObjectId(userId),
      items: [],
    });
  }

  // Check if item already exists in cart
  const existingItemIndex = cart.items.findIndex(
    (item) => item.productId.toString() === input.productId,
  );

  if (existingItemIndex >= 0) {
    // Update quantity
    cart.items[existingItemIndex].qty += input.qty;
    
    // Check stock again
    if (product.stock < cart.items[existingItemIndex].qty) {
      throw new ApiError(400, 'Insufficient stock available');
    }
  } else {
    // Add new item
    cart.items.push({
      productId: new mongoose.Types.ObjectId(input.productId),
      title: product.title,
      vendorId: product.vendor as mongoose.Types.ObjectId,
      pricePerUnit: product.price,
      qty: input.qty,
      minOrderQty: product.minOrderQty,
      meta: {
        image: product.images?.[0]?.url,
        slug: product.slug,
      },
    });
  }

  cart.updatedAt = new Date();
  await cart.save();

  return getCart(userId);
};

/**
 * Update cart item quantity
 */
export const updateCartItem = async (userId: string, input: UpdateCartItemInput) => {
  if (!mongoose.Types.ObjectId.isValid(input.productId)) {
    throw new ApiError(400, 'Invalid product ID');
  }

  if (input.qty < 1) {
    throw new ApiError(400, 'Quantity must be at least 1');
  }

  const product = await Product.findById(input.productId).lean();
  if (!product) {
    throw new ApiError(404, 'Product not found');
  }

  if (input.qty < product.minOrderQty) {
    throw new ApiError(400, `Minimum order quantity is ${product.minOrderQty}`);
  }

  if (product.stock < input.qty) {
    throw new ApiError(400, 'Insufficient stock available');
  }

  const cart = await Cart.findOne({ userId: new mongoose.Types.ObjectId(userId) });
  if (!cart) {
    throw new ApiError(404, 'Cart not found');
  }

  const itemIndex = cart.items.findIndex((item) => item.productId.toString() === input.productId);
  if (itemIndex === -1) {
    throw new ApiError(404, 'Item not found in cart');
  }

  cart.items[itemIndex].qty = input.qty;
  cart.updatedAt = new Date();
  await cart.save();

  return getCart(userId);
};

/**
 * Remove item from cart
 */
export const removeFromCart = async (userId: string, productId: string) => {
  if (!mongoose.Types.ObjectId.isValid(productId)) {
    throw new ApiError(400, 'Invalid product ID');
  }

  const cart = await Cart.findOne({ userId: new mongoose.Types.ObjectId(userId) });
  if (!cart) {
    throw new ApiError(404, 'Cart not found');
  }

  cart.items = cart.items.filter((item) => item.productId.toString() !== productId);
  cart.updatedAt = new Date();
  await cart.save();

  return getCart(userId);
};

/**
 * Clear cart
 */
export const clearCart = async (userId: string) => {
  const cart = await Cart.findOne({ userId: new mongoose.Types.ObjectId(userId) });
  if (!cart) {
    return null;
  }

  cart.items = [];
  cart.updatedAt = new Date();
  await cart.save();

  return getCart(userId);
};

