"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.deleteProductHandler = exports.listPublicProductsHandler = exports.getProductBySlugHandler = exports.listProductsHandler = exports.getProductHandler = exports.updateProductHandler = exports.createProductHandler = void 0;
const product_service_1 = require("../services/product.service");
const createProductHandler = async (req, res, next) => {
    try {
        if (!req.user) {
            throw new Error('Authentication required');
        }
        // If vendor is creating, automatically set vendorId to their own ID
        const body = { ...req.body };
        if (req.user.role === 'vendor' && !body.vendorId) {
            body.vendorId = req.user._id.toString();
        }
        const product = await (0, product_service_1.createProduct)(body);
        res.status(201).json({ product });
    }
    catch (error) {
        next(error);
    }
};
exports.createProductHandler = createProductHandler;
const updateProductHandler = async (req, res, next) => {
    try {
        if (!req.user) {
            throw new Error('Authentication required');
        }
        const userId = req.user._id.toString();
        const userRole = req.user.role;
        // Check if vendor owns the product
        if (userRole === 'vendor') {
            const existingProduct = await (0, product_service_1.getProductById)(req.params.productId);
            const productVendorId = typeof existingProduct.vendor === 'string'
                ? existingProduct.vendor
                : existingProduct.vendor?._id;
            if (productVendorId !== userId) {
                throw new Error('You do not have permission to update this product');
            }
            // Vendors cannot change vendorId or approvedByAdmin
            const body = { ...req.body };
            delete body.vendorId;
            delete body.approvedByAdmin;
            const product = await (0, product_service_1.updateProduct)(req.params.productId, body);
            res.json({ product });
        }
        else {
            // Admin can update any product
            const product = await (0, product_service_1.updateProduct)(req.params.productId, req.body);
            res.json({ product });
        }
    }
    catch (error) {
        next(error);
    }
};
exports.updateProductHandler = updateProductHandler;
const getProductHandler = async (req, res, next) => {
    try {
        if (!req.user) {
            throw new Error('Authentication required');
        }
        const userId = req.user._id.toString();
        const userRole = req.user.role;
        const product = await (0, product_service_1.getProductById)(req.params.productId);
        // If vendor, check if they own the product
        if (userRole === 'vendor') {
            const productVendorId = typeof product.vendor === 'string' ? product.vendor : product.vendor?._id;
            if (productVendorId !== userId) {
                throw new Error('You do not have permission to view this product');
            }
        }
        res.json({ product });
    }
    catch (error) {
        next(error);
    }
};
exports.getProductHandler = getProductHandler;
const listProductsHandler = async (req, res, next) => {
    try {
        if (!req.user) {
            throw new Error('Authentication required');
        }
        const searchParam = typeof req.query.search === 'string' ? req.query.search : undefined;
        const userRole = req.user.role;
        const userId = req.user._id.toString();
        // Vendors can only see their own products (scope is always 'mine')
        const scopeParam = userRole === 'vendor'
            ? 'mine'
            : req.query.scope === 'mine' || req.query.scope === 'all'
                ? req.query.scope
                : 'all';
        const limitParam = typeof req.query.limit === 'string' && !Number.isNaN(Number.parseInt(req.query.limit, 10))
            ? Number.parseInt(req.query.limit, 10)
            : undefined;
        // For vendors, use their ID; for admins, use adminId for 'mine' scope
        const adminId = userRole === 'admin' ? userId : userRole === 'vendor' ? userId : undefined;
        const products = await (0, product_service_1.listProducts)({
            search: searchParam,
            scope: scopeParam,
            adminId,
            limit: limitParam,
        });
        res.json({ products });
    }
    catch (error) {
        next(error);
    }
};
exports.listProductsHandler = listProductsHandler;
const getProductBySlugHandler = async (req, res, next) => {
    try {
        const product = await (0, product_service_1.getProductBySlugPublic)(req.params.slug);
        res.json({ product });
    }
    catch (error) {
        next(error);
    }
};
exports.getProductBySlugHandler = getProductBySlugHandler;
const listPublicProductsHandler = async (req, res, next) => {
    try {
        const search = typeof req.query.search === 'string' ? req.query.search : undefined;
        const limit = typeof req.query.limit === 'string' && !Number.isNaN(Number.parseInt(req.query.limit, 10))
            ? Number.parseInt(req.query.limit, 10)
            : undefined;
        const products = await (0, product_service_1.listPublishedProducts)({ search, limit });
        res.json({ products });
    }
    catch (error) {
        next(error);
    }
};
exports.listPublicProductsHandler = listPublicProductsHandler;
const deleteProductHandler = async (req, res, next) => {
    try {
        if (!req.user) {
            throw new Error('Authentication required');
        }
        const userId = req.user._id.toString();
        const userRole = req.user.role;
        const result = await (0, product_service_1.deleteProduct)(req.params.productId, userId, userRole);
        res.json(result);
    }
    catch (error) {
        next(error);
    }
};
exports.deleteProductHandler = deleteProductHandler;
