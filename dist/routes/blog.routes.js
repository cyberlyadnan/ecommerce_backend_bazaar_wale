"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const express_validator_1 = require("express-validator");
const blog_controller_1 = require("../controllers/blog.controller");
const validation_middleware_1 = __importDefault(require("../middlewares/validation.middleware"));
const router = (0, express_1.Router)();
// Public blog listing
router.get('/', [
    (0, express_validator_1.query)('search').optional().isString().trim().isLength({ min: 1, max: 120 }),
    (0, express_validator_1.query)('tag').optional().isString().trim().isLength({ min: 1, max: 40 }),
    (0, express_validator_1.query)('page').optional().isInt({ min: 1, max: 5000 }),
    (0, express_validator_1.query)('limit').optional().isInt({ min: 1, max: 50 }),
], validation_middleware_1.default, blog_controller_1.listBlogsPublicHandler);
// Public blog detail
router.get('/:slug', [
    (0, express_validator_1.param)('slug').isString().trim().notEmpty().isLength({ max: 160 }),
    (0, express_validator_1.query)('trackView').optional().isIn(['0', '1', 'false', 'true']),
], validation_middleware_1.default, blog_controller_1.getBlogBySlugPublicHandler);
exports.default = router;
