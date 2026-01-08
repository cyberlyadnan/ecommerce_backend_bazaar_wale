"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const express_rate_limit_1 = __importDefault(require("express-rate-limit"));
const config_1 = __importDefault(require("../config"));
const file_controller_1 = require("../controllers/file.controller");
const auth_middleware_1 = require("../middlewares/auth.middleware");
const upload_1 = require("../utils/upload");
const router = (0, express_1.Router)();
// Stricter rate limit for file uploads to prevent abuse
const uploadRateLimit = (0, express_rate_limit_1.default)({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: config_1.default.app.env === 'production' ? 20 : 50, // Limit uploads to prevent abuse
    message: 'Too many upload requests from this IP, please try again later.',
    standardHeaders: true,
    legacyHeaders: false,
});
// Upload for vendor application documents (public - used during vendor registration)
// NOTE: This is intentionally unauthenticated to allow uploads before account approval.
// Keep size/type limits strict (handled in uploadMiddleware).
// Rate limited to prevent abuse
router.post('/upload/vendor-application', uploadRateLimit, upload_1.uploadMiddleware.single('file'), file_controller_1.uploadFileHandler);
// Upload for admin/vendor (product images, etc.)
router.post('/upload', uploadRateLimit, (0, auth_middleware_1.authenticate)(['admin', 'vendor']), upload_1.uploadMiddleware.single('file'), file_controller_1.uploadFileHandler);
// Upload for review images (all authenticated users can review products)
router.post('/upload/review', uploadRateLimit, (0, auth_middleware_1.authenticate)(), // Allow all authenticated users (customer, vendor, admin)
upload_1.uploadMiddleware.single('file'), file_controller_1.uploadFileHandler);
exports.default = router;
