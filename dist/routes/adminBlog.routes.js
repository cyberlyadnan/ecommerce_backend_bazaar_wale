"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const express_validator_1 = require("express-validator");
const blog_controller_1 = require("../controllers/blog.controller");
const auth_middleware_1 = require("../middlewares/auth.middleware");
const validation_middleware_1 = __importDefault(require("../middlewares/validation.middleware"));
const router = (0, express_1.Router)();
router.get('/', auth_middleware_1.requireAdmin, [
    (0, express_validator_1.query)('search').optional().isString().trim().isLength({ min: 1, max: 120 }),
    (0, express_validator_1.query)('status').optional().isIn(['draft', 'published', 'all']),
    (0, express_validator_1.query)('page').optional().isInt({ min: 1, max: 5000 }),
    (0, express_validator_1.query)('limit').optional().isInt({ min: 1, max: 100 }),
], validation_middleware_1.default, blog_controller_1.listBlogsAdminHandler);
router.get('/stats', auth_middleware_1.requireAdmin, blog_controller_1.blogStatsAdminHandler);
router.post('/', auth_middleware_1.requireAdmin, [
    (0, express_validator_1.body)('title').isString().trim().notEmpty().isLength({ max: 140 }),
    (0, express_validator_1.body)('slug').optional().isString().trim().isLength({ min: 2, max: 160 }),
    (0, express_validator_1.body)('excerpt').optional().isString().trim().isLength({ max: 400 }),
    (0, express_validator_1.body)('contentHtml').isString().notEmpty(),
    (0, express_validator_1.body)('featuredImage').optional({ nullable: true }).isObject(),
    (0, express_validator_1.body)('featuredImage.url').optional().isString().trim(),
    (0, express_validator_1.body)('featuredImage.alt').optional().isString().trim(),
    (0, express_validator_1.body)('tags').optional().isArray(),
    (0, express_validator_1.body)('tags.*').optional().isString(),
    (0, express_validator_1.body)('status').optional().isIn(['draft', 'published']),
    (0, express_validator_1.body)('publishedAt').optional({ nullable: true }).isISO8601(),
    (0, express_validator_1.body)('seo').optional().isObject(),
    (0, express_validator_1.body)('seo.metaTitle').optional().isString().trim().isLength({ max: 140 }),
    (0, express_validator_1.body)('seo.metaDescription').optional().isString().trim().isLength({ max: 400 }),
    (0, express_validator_1.body)('seo.keywords').optional().isArray(),
    (0, express_validator_1.body)('seo.keywords.*').optional().isString(),
    (0, express_validator_1.body)('seo.canonicalUrl').optional().isString().trim(),
    (0, express_validator_1.body)('seo.ogTitle').optional().isString().trim(),
    (0, express_validator_1.body)('seo.ogDescription').optional().isString().trim(),
    (0, express_validator_1.body)('seo.ogImage').optional().isObject(),
    (0, express_validator_1.body)('seo.ogImage.url').optional().isString().trim(),
    (0, express_validator_1.body)('seo.ogImage.alt').optional().isString().trim(),
    (0, express_validator_1.body)('seo.twitterTitle').optional().isString().trim(),
    (0, express_validator_1.body)('seo.twitterDescription').optional().isString().trim(),
    (0, express_validator_1.body)('seo.twitterImage').optional().isObject(),
    (0, express_validator_1.body)('seo.twitterImage.url').optional().isString().trim(),
    (0, express_validator_1.body)('seo.twitterImage.alt').optional().isString().trim(),
    (0, express_validator_1.body)('seo.robotsIndex').optional().isBoolean(),
    (0, express_validator_1.body)('seo.robotsFollow').optional().isBoolean(),
    (0, express_validator_1.body)('meta').optional().isObject(),
], validation_middleware_1.default, blog_controller_1.createBlogHandler);
router.get('/:blogId', auth_middleware_1.requireAdmin, [(0, express_validator_1.param)('blogId').isMongoId()], validation_middleware_1.default, blog_controller_1.getBlogHandler);
router.patch('/:blogId', auth_middleware_1.requireAdmin, [
    (0, express_validator_1.param)('blogId').isMongoId(),
    (0, express_validator_1.body)('title').optional().isString().trim().notEmpty().isLength({ max: 140 }),
    (0, express_validator_1.body)('slug').optional().isString().trim().isLength({ min: 2, max: 160 }),
    (0, express_validator_1.body)('excerpt').optional().isString().trim().isLength({ max: 400 }),
    (0, express_validator_1.body)('contentHtml').optional().isString(),
    (0, express_validator_1.body)('featuredImage').optional({ nullable: true }).isObject(),
    (0, express_validator_1.body)('featuredImage.url').optional().isString().trim(),
    (0, express_validator_1.body)('featuredImage.alt').optional().isString().trim(),
    (0, express_validator_1.body)('tags').optional().isArray(),
    (0, express_validator_1.body)('tags.*').optional().isString(),
    (0, express_validator_1.body)('status').optional().isIn(['draft', 'published']),
    (0, express_validator_1.body)('publishedAt').optional({ nullable: true }).isISO8601(),
    (0, express_validator_1.body)('seo').optional().isObject(),
    (0, express_validator_1.body)('seo.metaTitle').optional().isString().trim().isLength({ max: 140 }),
    (0, express_validator_1.body)('seo.metaDescription').optional().isString().trim().isLength({ max: 400 }),
    (0, express_validator_1.body)('seo.keywords').optional().isArray(),
    (0, express_validator_1.body)('seo.keywords.*').optional().isString(),
    (0, express_validator_1.body)('seo.canonicalUrl').optional().isString().trim(),
    (0, express_validator_1.body)('seo.ogTitle').optional().isString().trim(),
    (0, express_validator_1.body)('seo.ogDescription').optional().isString().trim(),
    (0, express_validator_1.body)('seo.ogImage').optional().isObject(),
    (0, express_validator_1.body)('seo.ogImage.url').optional().isString().trim(),
    (0, express_validator_1.body)('seo.ogImage.alt').optional().isString().trim(),
    (0, express_validator_1.body)('seo.twitterTitle').optional().isString().trim(),
    (0, express_validator_1.body)('seo.twitterDescription').optional().isString().trim(),
    (0, express_validator_1.body)('seo.twitterImage').optional().isObject(),
    (0, express_validator_1.body)('seo.twitterImage.url').optional().isString().trim(),
    (0, express_validator_1.body)('seo.twitterImage.alt').optional().isString().trim(),
    (0, express_validator_1.body)('seo.robotsIndex').optional().isBoolean(),
    (0, express_validator_1.body)('seo.robotsFollow').optional().isBoolean(),
    (0, express_validator_1.body)('meta').optional().isObject(),
], validation_middleware_1.default, blog_controller_1.updateBlogHandler);
router.delete('/:blogId', auth_middleware_1.requireAdmin, [(0, express_validator_1.param)('blogId').isMongoId()], validation_middleware_1.default, blog_controller_1.deleteBlogHandler);
exports.default = router;
