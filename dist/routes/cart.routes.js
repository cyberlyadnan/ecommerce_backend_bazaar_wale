"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const express_validator_1 = require("express-validator");
const cart_controller_1 = require("../controllers/cart.controller");
const auth_middleware_1 = require("../middlewares/auth.middleware");
const validation_middleware_1 = __importDefault(require("../middlewares/validation.middleware"));
const router = (0, express_1.Router)();
// All cart routes require authentication (any logged-in user can use cart)
router.use((0, auth_middleware_1.authenticate)());
// Get cart
router.get('/', cart_controller_1.getCartHandler);
// Add to cart
router.post('/add', [
    (0, express_validator_1.body)('productId').isString().trim().notEmpty().withMessage('Product ID is required'),
    (0, express_validator_1.body)('qty').isInt({ min: 1 }).withMessage('Quantity must be at least 1'),
], validation_middleware_1.default, cart_controller_1.addToCartHandler);
// Update cart item
router.patch('/update', [
    (0, express_validator_1.body)('productId').isString().trim().notEmpty().withMessage('Product ID is required'),
    (0, express_validator_1.body)('qty').isInt({ min: 1 }).withMessage('Quantity must be at least 1'),
], validation_middleware_1.default, cart_controller_1.updateCartItemHandler);
// Remove from cart
router.delete('/remove/:productId', [(0, express_validator_1.param)('productId').isString().trim().notEmpty().withMessage('Product ID is required')], validation_middleware_1.default, cart_controller_1.removeFromCartHandler);
// Clear cart
router.delete('/clear', cart_controller_1.clearCartHandler);
exports.default = router;
