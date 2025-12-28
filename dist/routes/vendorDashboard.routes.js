"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const auth_middleware_1 = require("../middlewares/auth.middleware");
const vendorDashboard_controller_1 = require("../controllers/vendorDashboard.controller");
const router = express_1.default.Router();
// Get vendor dashboard statistics
router.get('/stats', (0, auth_middleware_1.authenticate)(['vendor']), vendorDashboard_controller_1.getVendorDashboardStatsHandler);
// Vendor profile/settings
router.get('/profile', (0, auth_middleware_1.authenticate)(['vendor']), vendorDashboard_controller_1.getVendorProfileHandler);
router.patch('/profile', (0, auth_middleware_1.authenticate)(['vendor']), vendorDashboard_controller_1.updateVendorProfileHandler);
exports.default = router;
