"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.clearCartHandler = exports.removeFromCartHandler = exports.updateCartItemHandler = exports.addToCartHandler = exports.getCartHandler = void 0;
const cartService = __importStar(require("../services/cart.service"));
const apiError_1 = __importDefault(require("../utils/apiError"));
const getCartHandler = async (req, res, next) => {
    try {
        if (!req.user) {
            throw new apiError_1.default(401, 'Authentication required');
        }
        const cart = await cartService.getCart(req.user._id.toString());
        if (!cart) {
            return res.json({ cart: null, items: [] });
        }
        res.json({ cart, items: cart.items });
    }
    catch (error) {
        next(error);
    }
};
exports.getCartHandler = getCartHandler;
const addToCartHandler = async (req, res, next) => {
    try {
        if (!req.user) {
            throw new apiError_1.default(401, 'Authentication required');
        }
        const { productId, qty } = req.body;
        if (!productId || typeof qty !== 'number' || qty < 1) {
            throw new apiError_1.default(400, 'Invalid request. productId and qty (>= 1) are required.');
        }
        const result = await cartService.addToCart(req.user._id.toString(), { productId, qty });
        res.json({
            message: 'Item added to cart',
            cart: result,
            items: result?.items || [],
        });
    }
    catch (error) {
        next(error);
    }
};
exports.addToCartHandler = addToCartHandler;
const updateCartItemHandler = async (req, res, next) => {
    try {
        if (!req.user) {
            throw new apiError_1.default(401, 'Authentication required');
        }
        const { productId, qty } = req.body;
        if (!productId || typeof qty !== 'number' || qty < 1) {
            throw new apiError_1.default(400, 'Invalid request. productId and qty (>= 1) are required.');
        }
        const result = await cartService.updateCartItem(req.user._id.toString(), { productId, qty });
        res.json({
            message: 'Cart item updated',
            cart: result,
            items: result?.items || [],
        });
    }
    catch (error) {
        next(error);
    }
};
exports.updateCartItemHandler = updateCartItemHandler;
const removeFromCartHandler = async (req, res, next) => {
    try {
        if (!req.user) {
            throw new apiError_1.default(401, 'Authentication required');
        }
        const { productId } = req.params;
        if (!productId) {
            throw new apiError_1.default(400, 'Product ID is required');
        }
        const result = await cartService.removeFromCart(req.user._id.toString(), productId);
        res.json({
            message: 'Item removed from cart',
            cart: result,
            items: result?.items || [],
        });
    }
    catch (error) {
        next(error);
    }
};
exports.removeFromCartHandler = removeFromCartHandler;
const clearCartHandler = async (req, res, next) => {
    try {
        if (!req.user) {
            throw new apiError_1.default(401, 'Authentication required');
        }
        const result = await cartService.clearCart(req.user._id.toString());
        res.json({
            message: 'Cart cleared',
            cart: result,
            items: result?.items || [],
        });
    }
    catch (error) {
        next(error);
    }
};
exports.clearCartHandler = clearCartHandler;
