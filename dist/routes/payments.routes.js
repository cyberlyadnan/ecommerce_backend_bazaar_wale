"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const express_validator_1 = require("express-validator");
const auth_middleware_1 = require("../middlewares/auth.middleware");
const validation_middleware_1 = __importDefault(require("../middlewares/validation.middleware"));
const payment_controller_1 = require("../controllers/payment.controller");
const router = express_1.default.Router();
// -------- Admin --------
router.get('/admin/commission', (0, auth_middleware_1.authenticate)(['admin']), payment_controller_1.getCommissionHandler);
router.put('/admin/commission', (0, auth_middleware_1.authenticate)(['admin']), [(0, express_validator_1.body)('commissionPercent').isNumeric().custom((v) => Number(v) >= 0 && Number(v) <= 100)], validation_middleware_1.default, payment_controller_1.updateCommissionHandler);
router.get('/admin/payouts', (0, auth_middleware_1.authenticate)(['admin']), [
    (0, express_validator_1.query)('status').optional().isIn(['all', 'pending', 'processing', 'paid', 'rejected']),
    (0, express_validator_1.query)('vendorId').optional().isString(),
    (0, express_validator_1.query)('search').optional().isString(),
], validation_middleware_1.default, payment_controller_1.adminListPayoutsHandler);
router.post('/admin/payouts', (0, auth_middleware_1.authenticate)(['admin']), [
    (0, express_validator_1.body)('vendorId').isMongoId(),
    (0, express_validator_1.body)('grossAmount').optional().isNumeric().custom((v) => Number(v) >= 0),
    (0, express_validator_1.body)('ordersIncluded').optional().isArray(),
    (0, express_validator_1.body)('ordersIncluded.*').optional().isMongoId(),
    (0, express_validator_1.body)('commissionPercent').optional().isNumeric().custom((v) => Number(v) >= 0 && Number(v) <= 100),
    (0, express_validator_1.body)('status').optional().isIn(['pending', 'processing', 'paid', 'rejected']),
    (0, express_validator_1.body)('paymentMode').optional().isIn(['bank', 'upi', 'cash', 'other']),
    (0, express_validator_1.body)('adminNotes').optional().isString().isLength({ max: 2000 }),
    (0, express_validator_1.body)('paymentReference').optional().isString().isLength({ max: 200 }),
    (0, express_validator_1.body)('scheduledAt').optional().isISO8601(),
], validation_middleware_1.default, payment_controller_1.adminCreatePayoutHandler);
router.patch('/admin/payouts/:payoutId', (0, auth_middleware_1.authenticate)(['admin']), [
    (0, express_validator_1.param)('payoutId').isMongoId(),
    (0, express_validator_1.body)('status').optional().isIn(['pending', 'processing', 'paid', 'rejected']),
    (0, express_validator_1.body)('paymentMode').optional().isIn(['bank', 'upi', 'cash', 'other']),
    (0, express_validator_1.body)('adminNotes').optional().isString().isLength({ max: 2000 }),
    (0, express_validator_1.body)('paymentReference').optional().isString().isLength({ max: 200 }),
    (0, express_validator_1.body)('scheduledAt').optional({ nullable: true }).custom((v) => v === null || typeof v === 'string'),
    (0, express_validator_1.body)('paidAt').optional({ nullable: true }).custom((v) => v === null || typeof v === 'string'),
], validation_middleware_1.default, payment_controller_1.adminUpdatePayoutHandler);
// -------- Vendor --------
router.get('/vendor/summary', (0, auth_middleware_1.authenticate)(['vendor']), payment_controller_1.vendorSummaryHandler);
router.get('/vendor/payouts', (0, auth_middleware_1.authenticate)(['vendor']), [(0, express_validator_1.query)('status').optional().isIn(['all', 'pending', 'processing', 'paid', 'rejected'])], validation_middleware_1.default, payment_controller_1.vendorListPayoutsHandler);
exports.default = router;
