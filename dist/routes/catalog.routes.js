"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const express_validator_1 = require("express-validator");
const category_controller_1 = require("../controllers/category.controller");
const product_controller_1 = require("../controllers/product.controller");
const vendor_controller_1 = require("../controllers/vendor.controller");
const auth_middleware_1 = require("../middlewares/auth.middleware");
const validation_middleware_1 = __importDefault(require("../middlewares/validation.middleware"));
const router = (0, express_1.Router)();
router.get('/categories', category_controller_1.listCategoriesHandler);
router.post('/categories', (0, auth_middleware_1.authenticate)(['admin', 'vendor']), [
    (0, express_validator_1.body)('name').isString().trim().notEmpty(),
    (0, express_validator_1.body)('slug')
        .optional({ values: 'falsy' })
        .isString()
        .trim()
        .isLength({ min: 2 })
        .withMessage('Slug must be at least 2 characters'),
    (0, express_validator_1.body)('description').optional({ values: 'falsy' }).isString(),
    (0, express_validator_1.body)('image')
        .optional({ values: 'falsy' })
        .custom((value) => {
        if (!value || typeof value !== 'string') {
            return true; // Optional field, skip validation if empty
        }
        // Check if it's a valid URL - accept http://, https://, or data: URLs
        const urlPattern = /^(https?:\/\/|\/|data:image\/)/i;
        return urlPattern.test(value);
    })
        .withMessage('Image must be a valid URL'),
    (0, express_validator_1.body)('parent').optional({ nullable: true }).isMongoId(),
    (0, express_validator_1.body)('isActive').optional().isBoolean(),
], validation_middleware_1.default, category_controller_1.createCategoryHandler);
router.patch('/categories/:categoryId', (0, auth_middleware_1.authenticate)(['admin', 'vendor']), [
    (0, express_validator_1.param)('categoryId').isMongoId(),
    (0, express_validator_1.body)('name').optional({ values: 'falsy' }).isString().trim().notEmpty(),
    (0, express_validator_1.body)('slug')
        .optional({ values: 'falsy' })
        .isString()
        .trim()
        .isLength({ min: 2 })
        .withMessage('Slug must be at least 2 characters'),
    (0, express_validator_1.body)('description').optional({ values: 'falsy' }).isString(),
    (0, express_validator_1.body)('image')
        .optional({ values: 'falsy' })
        .custom((value) => {
        if (!value || typeof value !== 'string') {
            return true; // Optional field, skip validation if empty
        }
        // Check if it's a valid URL - accept http://, https://, or data: URLs
        const urlPattern = /^(https?:\/\/|\/|data:image\/)/i;
        return urlPattern.test(value);
    })
        .withMessage('Image must be a valid URL'),
    (0, express_validator_1.body)('parent').optional({ nullable: true }).custom((value) => {
        if (value === null || value === '') {
            return true;
        }
        if (typeof value !== 'string') {
            throw new Error('parent must be a string');
        }
        if (!value.match(/^[a-f\d]{24}$/i)) {
            throw new Error('parent must be a valid id');
        }
        return true;
    }),
    (0, express_validator_1.body)('isActive').optional().isBoolean(),
], validation_middleware_1.default, category_controller_1.updateCategoryHandler);
router.delete('/categories/:categoryId', (0, auth_middleware_1.authenticate)(['admin']), [(0, express_validator_1.param)('categoryId').isMongoId()], validation_middleware_1.default, category_controller_1.deleteCategoryHandler);
// List products - allow vendors and admins (vendors only see their own)
router.get('/products', (0, auth_middleware_1.authenticate)(['admin', 'vendor']), [
    (0, express_validator_1.query)('search').optional().isString().trim().isLength({ min: 1, max: 120 }).withMessage('Search must be a string'),
    (0, express_validator_1.query)('scope').optional().isIn(['all', 'mine']),
    (0, express_validator_1.query)('limit').optional().isInt({ min: 1, max: 200 }),
], validation_middleware_1.default, product_controller_1.listProductsHandler);
router.get('/products/slug/:slug', [(0, express_validator_1.param)('slug').isString().trim().notEmpty()], validation_middleware_1.default, product_controller_1.getProductBySlugHandler);
router.get('/products/public', [
    (0, express_validator_1.query)('search').optional().isString().trim().isLength({ min: 1, max: 120 }),
    (0, express_validator_1.query)('limit').optional().isInt({ min: 1, max: 200 }),
], validation_middleware_1.default, product_controller_1.listPublicProductsHandler);
// Create product - allow vendors and admins
router.post('/products', (0, auth_middleware_1.authenticate)(['admin', 'vendor']), [
    (0, express_validator_1.body)('title').isString().trim().notEmpty(),
    (0, express_validator_1.body)('slug').optional().isString().trim(),
    (0, express_validator_1.body)('sku').optional().isString().trim(),
    (0, express_validator_1.body)('description').optional().isString(),
    (0, express_validator_1.body)('shortDescription').optional().isString(),
    (0, express_validator_1.body)('category').optional({ nullable: true }).isMongoId(),
    (0, express_validator_1.body)('subcategory').optional({ nullable: true }).isMongoId(),
    (0, express_validator_1.body)('images').optional().isArray(),
    (0, express_validator_1.body)('images.*.url').isString().trim().notEmpty(),
    (0, express_validator_1.body)('images.*.alt').optional().isString(),
    (0, express_validator_1.body)('images.*.order').optional().isNumeric(),
    (0, express_validator_1.body)('attributes').optional().isObject(),
    (0, express_validator_1.body)('stock').optional().isNumeric(),
    (0, express_validator_1.body)('minOrderQty').optional().isNumeric(),
    (0, express_validator_1.body)('weightKg').optional().isNumeric(),
    (0, express_validator_1.body)('vendorId').optional().isMongoId(), // Optional - will be set to current user if vendor
    (0, express_validator_1.body)('price').isNumeric(),
    (0, express_validator_1.body)('pricingTiers').optional().isArray(),
    (0, express_validator_1.body)('pricingTiers.*.minQty').isNumeric(),
    (0, express_validator_1.body)('pricingTiers.*.pricePerUnit').isNumeric(),
    (0, express_validator_1.body)('isActive').optional().isBoolean(),
    (0, express_validator_1.body)('approvedByAdmin').optional().isBoolean(),
    (0, express_validator_1.body)('featured').optional().isBoolean(),
    (0, express_validator_1.body)('tags').optional().isArray(),
    (0, express_validator_1.body)('tags.*').isString(),
    (0, express_validator_1.body)('meta').optional().isObject(),
], validation_middleware_1.default, product_controller_1.createProductHandler);
// Get product - allow vendors and admins (vendors can only see their own)
router.get('/products/:productId', (0, auth_middleware_1.authenticate)(['admin', 'vendor']), [(0, express_validator_1.param)('productId').isMongoId()], validation_middleware_1.default, product_controller_1.getProductHandler);
// Update product - allow vendors and admins (vendors can only update their own)
router.patch('/products/:productId', (0, auth_middleware_1.authenticate)(['admin', 'vendor']), [
    (0, express_validator_1.param)('productId').isMongoId(),
    (0, express_validator_1.body)('title').optional().isString().trim().notEmpty(),
    (0, express_validator_1.body)('slug').optional().isString().trim(),
    (0, express_validator_1.body)('sku').optional().isString().trim(),
    (0, express_validator_1.body)('description').optional().isString(),
    (0, express_validator_1.body)('shortDescription').optional().isString(),
    (0, express_validator_1.body)('category').optional({ nullable: true }).isMongoId(),
    (0, express_validator_1.body)('subcategory').optional({ nullable: true }).isMongoId(),
    (0, express_validator_1.body)('images').optional().isArray(),
    (0, express_validator_1.body)('images.*.url').isString().trim().notEmpty(),
    (0, express_validator_1.body)('images.*.alt').optional().isString(),
    (0, express_validator_1.body)('images.*.order').optional().isNumeric(),
    (0, express_validator_1.body)('attributes').optional().isObject(),
    (0, express_validator_1.body)('stock').optional().isNumeric(),
    (0, express_validator_1.body)('minOrderQty').optional().isNumeric(),
    (0, express_validator_1.body)('weightKg').optional().isNumeric(),
    (0, express_validator_1.body)('vendorId').optional().isMongoId(), // Vendors cannot change vendorId
    (0, express_validator_1.body)('price').optional().isNumeric(),
    (0, express_validator_1.body)('pricingTiers').optional().isArray(),
    (0, express_validator_1.body)('pricingTiers.*.minQty').isNumeric(),
    (0, express_validator_1.body)('pricingTiers.*.pricePerUnit').isNumeric(),
    (0, express_validator_1.body)('isActive').optional().isBoolean(),
    (0, express_validator_1.body)('approvedByAdmin').optional().isBoolean(), // Vendors cannot set this
    (0, express_validator_1.body)('featured').optional().isBoolean(), // Only admins can set this
    (0, express_validator_1.body)('tags').optional().isArray(),
    (0, express_validator_1.body)('tags.*').isString(),
    (0, express_validator_1.body)('meta').optional().isObject(),
], validation_middleware_1.default, product_controller_1.updateProductHandler);
// Delete product - allow vendors and admins (vendors can only delete their own)
router.delete('/products/:productId', (0, auth_middleware_1.authenticate)(['admin', 'vendor']), [(0, express_validator_1.param)('productId').isMongoId()], validation_middleware_1.default, product_controller_1.deleteProductHandler);
router.get('/vendors', auth_middleware_1.requireAdmin, [
    (0, express_validator_1.query)('status').optional().isIn(['all', 'pending', 'active', 'rejected', 'suspended']),
    (0, express_validator_1.query)('search').optional().isString().trim().isLength({ min: 1, max: 120 }),
], validation_middleware_1.default, vendor_controller_1.listVendorsHandler);
router.post('/vendors/:vendorId/approve', auth_middleware_1.requireAdmin, [(0, express_validator_1.param)('vendorId').isMongoId()], validation_middleware_1.default, vendor_controller_1.approveVendorHandler);
router.post('/vendors/:vendorId/reject', auth_middleware_1.requireAdmin, [
    (0, express_validator_1.param)('vendorId').isMongoId(),
    (0, express_validator_1.body)('reason').optional().isString().trim().isLength({ max: 500 }),
], validation_middleware_1.default, vendor_controller_1.rejectVendorHandler);
exports.default = router;
