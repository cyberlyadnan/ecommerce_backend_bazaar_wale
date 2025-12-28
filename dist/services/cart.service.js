"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.clearCart = exports.removeFromCart = exports.updateCartItem = exports.addToCart = exports.getCart = exports.getOrCreateCart = void 0;
const mongoose_1 = __importDefault(require("mongoose"));
const Cart_model_1 = __importDefault(require("../models/Cart.model"));
const Product_model_1 = __importDefault(require("../models/Product.model"));
const apiError_1 = __importDefault(require("../utils/apiError"));
/**
 * Get or create cart for a user
 */
const getOrCreateCart = async (userId) => {
    let cart = await Cart_model_1.default.findOne({ userId: new mongoose_1.default.Types.ObjectId(userId) }).lean();
    if (!cart) {
        const newCart = await Cart_model_1.default.create({
            userId: new mongoose_1.default.Types.ObjectId(userId),
            items: [],
        });
        return newCart.toObject();
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
exports.getOrCreateCart = getOrCreateCart;
/**
 * Get cart for a user
 */
const getCart = async (userId) => {
    const cart = await Cart_model_1.default.findOne({ userId: new mongoose_1.default.Types.ObjectId(userId) })
        .populate('items.productId', 'title slug images price minOrderQty stock isActive')
        .lean();
    if (!cart) {
        return null;
    }
    return {
        ...cart,
        _id: cart._id.toString(),
        userId: cart.userId.toString(),
        items: cart.items.map((item) => ({
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
exports.getCart = getCart;
/**
 * Add item to cart
 */
const addToCart = async (userId, input) => {
    if (!mongoose_1.default.Types.ObjectId.isValid(input.productId)) {
        throw new apiError_1.default(400, 'Invalid product ID');
    }
    const product = await Product_model_1.default.findById(input.productId).lean();
    if (!product) {
        throw new apiError_1.default(404, 'Product not found');
    }
    if (!product.isActive) {
        throw new apiError_1.default(400, 'Product is not available');
    }
    if (product.stock < input.qty) {
        throw new apiError_1.default(400, 'Insufficient stock available');
    }
    if (input.qty < product.minOrderQty) {
        throw new apiError_1.default(400, `Minimum order quantity is ${product.minOrderQty}`);
    }
    let cart = await Cart_model_1.default.findOne({ userId: new mongoose_1.default.Types.ObjectId(userId) });
    if (!cart) {
        cart = await Cart_model_1.default.create({
            userId: new mongoose_1.default.Types.ObjectId(userId),
            items: [],
        });
    }
    // Check if item already exists in cart
    const existingItemIndex = cart.items.findIndex((item) => item.productId.toString() === input.productId);
    if (existingItemIndex >= 0) {
        // Update quantity
        cart.items[existingItemIndex].qty += input.qty;
        // Check stock again
        if (product.stock < cart.items[existingItemIndex].qty) {
            throw new apiError_1.default(400, 'Insufficient stock available');
        }
    }
    else {
        // Add new item
        cart.items.push({
            productId: new mongoose_1.default.Types.ObjectId(input.productId),
            title: product.title,
            vendorId: product.vendor,
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
    return (0, exports.getCart)(userId);
};
exports.addToCart = addToCart;
/**
 * Update cart item quantity
 */
const updateCartItem = async (userId, input) => {
    if (!mongoose_1.default.Types.ObjectId.isValid(input.productId)) {
        throw new apiError_1.default(400, 'Invalid product ID');
    }
    if (input.qty < 1) {
        throw new apiError_1.default(400, 'Quantity must be at least 1');
    }
    const product = await Product_model_1.default.findById(input.productId).lean();
    if (!product) {
        throw new apiError_1.default(404, 'Product not found');
    }
    if (input.qty < product.minOrderQty) {
        throw new apiError_1.default(400, `Minimum order quantity is ${product.minOrderQty}`);
    }
    if (product.stock < input.qty) {
        throw new apiError_1.default(400, 'Insufficient stock available');
    }
    const cart = await Cart_model_1.default.findOne({ userId: new mongoose_1.default.Types.ObjectId(userId) });
    if (!cart) {
        throw new apiError_1.default(404, 'Cart not found');
    }
    const itemIndex = cart.items.findIndex((item) => item.productId.toString() === input.productId);
    if (itemIndex === -1) {
        throw new apiError_1.default(404, 'Item not found in cart');
    }
    cart.items[itemIndex].qty = input.qty;
    cart.updatedAt = new Date();
    await cart.save();
    return (0, exports.getCart)(userId);
};
exports.updateCartItem = updateCartItem;
/**
 * Remove item from cart
 */
const removeFromCart = async (userId, productId) => {
    if (!mongoose_1.default.Types.ObjectId.isValid(productId)) {
        throw new apiError_1.default(400, 'Invalid product ID');
    }
    const cart = await Cart_model_1.default.findOne({ userId: new mongoose_1.default.Types.ObjectId(userId) });
    if (!cart) {
        throw new apiError_1.default(404, 'Cart not found');
    }
    cart.items = cart.items.filter((item) => item.productId.toString() !== productId);
    cart.updatedAt = new Date();
    cart.markModified('items');
    await cart.save();
    return (0, exports.getCart)(userId);
};
exports.removeFromCart = removeFromCart;
/**
 * Clear cart
 */
const clearCart = async (userId) => {
    const cart = await Cart_model_1.default.findOne({ userId: new mongoose_1.default.Types.ObjectId(userId) });
    if (!cart) {
        return null;
    }
    cart.items.length = 0;
    cart.updatedAt = new Date();
    cart.markModified('items');
    await cart.save();
    return (0, exports.getCart)(userId);
};
exports.clearCart = clearCart;
