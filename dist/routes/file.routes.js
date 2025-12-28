"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const file_controller_1 = require("../controllers/file.controller");
const auth_middleware_1 = require("../middlewares/auth.middleware");
const upload_1 = require("../utils/upload");
const router = (0, express_1.Router)();
// Upload for vendor application documents (public - used during vendor registration)
// NOTE: This is intentionally unauthenticated to allow uploads before account approval.
// Keep size/type limits strict (handled in uploadMiddleware).
router.post('/upload/vendor-application', upload_1.uploadMiddleware.single('file'), file_controller_1.uploadFileHandler);
// Upload for admin/vendor (product images, etc.)
router.post('/upload', (0, auth_middleware_1.authenticate)(['admin', 'vendor']), upload_1.uploadMiddleware.single('file'), file_controller_1.uploadFileHandler);
// Upload for review images (all authenticated users can review products)
router.post('/upload/review', (0, auth_middleware_1.authenticate)(), // Allow all authenticated users (customer, vendor, admin)
upload_1.uploadMiddleware.single('file'), file_controller_1.uploadFileHandler);
exports.default = router;
