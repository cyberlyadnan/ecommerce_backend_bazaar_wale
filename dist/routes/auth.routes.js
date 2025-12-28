"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const express_validator_1 = require("express-validator");
const auth_controller_1 = require("../controllers/auth.controller");
const auth_middleware_1 = require("../middlewares/auth.middleware");
const validation_middleware_1 = __importDefault(require("../middlewares/validation.middleware"));
const router = (0, express_1.Router)();
router.post('/register/customer', [
    (0, express_validator_1.body)('name').isString().trim().notEmpty(),
    (0, express_validator_1.body)('email').optional().isEmail(),
    (0, express_validator_1.body)('phone').optional().isMobilePhone('any'),
    (0, express_validator_1.body)('password').optional().isLength({ min: 6 }),
], validation_middleware_1.default, auth_controller_1.registerCustomerHandler);
router.post('/register/vendor', (0, auth_middleware_1.optionalAuthenticate)(), // Optional auth - if user is logged in, use their account
[
    (0, express_validator_1.body)('name').optional().isString().trim().notEmpty(), // Optional if user is logged in
    (0, express_validator_1.body)('email').optional().isEmail(),
    (0, express_validator_1.body)('phone')
        .optional()
        .isString()
        .custom((value) => {
        const digits = String(value).replace(/[^\d]/g, '');
        // accept empty or 10-15 digits for international formats
        if (!digits)
            return true;
        return digits.length >= 10 && digits.length <= 15;
    })
        .withMessage('Invalid phone number'),
    (0, express_validator_1.body)('password')
        .optional({ values: 'falsy' }) // Field can be missing, null, undefined, or empty string
        .custom((value, { req }) => {
        // If user is authenticated, password is not required - skip validation completely
        if (req.user) {
            return true; // Skip password validation for authenticated users
        }
        // If user is not authenticated, password is required
        if (!value || typeof value !== 'string' || value.trim().length === 0) {
            throw new Error('Password is required when creating a new account');
        }
        // Password must be at least 6 characters
        if (value.length < 6) {
            throw new Error('Password must be at least 6 characters long');
        }
        return true;
    })
        .withMessage('Password validation failed'), // Required if user is not logged in, optional if logged in
    (0, express_validator_1.body)('businessName').isString().trim().notEmpty(),
    (0, express_validator_1.body)('gstNumber').isString().trim().notEmpty(),
    (0, express_validator_1.body)('aadharNumber').isString().trim().notEmpty(),
    (0, express_validator_1.body)('panNumber').isString().trim().notEmpty(),
    (0, express_validator_1.body)('documents').isArray({ min: 4 }),
    (0, express_validator_1.body)('documents.*.type').optional().isString(),
    (0, express_validator_1.body)('documents.*.url').optional().isString(),
    (0, express_validator_1.body)('documents.*.fileName').optional().isString(),
    (0, express_validator_1.body)('documents').custom((docs) => {
        const list = Array.isArray(docs) ? docs : [];
        const requiredTypes = ['aadhaarFront', 'aadhaarBack', 'gstCertificate', 'panCard'];
        for (const t of requiredTypes) {
            const found = list.find((d) => d?.type === t && typeof d?.url === 'string' && d.url.trim());
            if (!found)
                return false;
        }
        return true;
    }).withMessage('Required documents missing (aadhaarFront, aadhaarBack, gstCertificate, panCard)'),
], validation_middleware_1.default, auth_controller_1.registerVendorHandler);
router.post('/register/admin', [
    (0, express_validator_1.body)('name').isString().trim().notEmpty(),
    (0, express_validator_1.body)('email').isEmail(),
    (0, express_validator_1.body)('password').isLength({ min: 8 }),
], validation_middleware_1.default, auth_controller_1.registerAdminHandler);
router.post('/register/firebase', [
    (0, express_validator_1.body)('firebaseToken').isString().notEmpty(),
    (0, express_validator_1.body)('role').optional().isIn(['customer', 'vendor', 'admin']),
    (0, express_validator_1.body)('name').optional().isString().trim(),
    (0, express_validator_1.body)('profile.email').optional().isEmail(),
], validation_middleware_1.default, auth_controller_1.registerWithFirebaseHandler);
router.post('/login/password', [
    (0, express_validator_1.body)('identifier').isString().notEmpty(),
    (0, express_validator_1.body)('password').isString().notEmpty(),
    (0, express_validator_1.body)('role').optional().isIn(['customer', 'vendor', 'admin']),
], validation_middleware_1.default, auth_controller_1.passwordLoginHandler);
router.post('/login/firebase', [
    (0, express_validator_1.body)('firebaseToken').isString().notEmpty(),
    (0, express_validator_1.body)('role').optional().isIn(['customer', 'vendor', 'admin']),
    (0, express_validator_1.body)('name').optional().isString(),
], validation_middleware_1.default, auth_controller_1.firebaseLoginHandler);
router.post('/refresh', auth_controller_1.refreshHandler);
router.post('/logout', auth_controller_1.logoutHandler);
router.post('/password/forgot', [(0, express_validator_1.body)('email').isEmail()], validation_middleware_1.default, auth_controller_1.forgotPasswordHandler);
router.post('/password/reset', [
    (0, express_validator_1.body)('email').isEmail(),
    (0, express_validator_1.body)('token').isString().notEmpty(),
    (0, express_validator_1.body)('password').isLength({ min: 6 }),
], validation_middleware_1.default, auth_controller_1.resetPasswordHandler);
router.post('/password/reset/phone', [
    (0, express_validator_1.body)('firebaseToken').isString().notEmpty(),
    (0, express_validator_1.body)('password').isLength({ min: 6 }),
], validation_middleware_1.default, auth_controller_1.resetPasswordWithFirebaseHandler);
router.post('/password/change', (0, auth_middleware_1.authenticate)(), [
    (0, express_validator_1.body)('currentPassword').isString().notEmpty(),
    (0, express_validator_1.body)('newPassword').isLength({ min: 6 }),
], validation_middleware_1.default, auth_controller_1.changePasswordHandler);
router.get('/profile', (0, auth_middleware_1.authenticate)(), auth_controller_1.profileHandler);
router.get('/vendor-application/status', (0, auth_middleware_1.authenticate)(), auth_controller_1.getVendorApplicationStatusHandler);
router.post('/vendors/:vendorId/approve', auth_middleware_1.requireAdmin, validation_middleware_1.default, auth_controller_1.approveVendorHandler);
router.post('/vendors/:vendorId/reject', auth_middleware_1.requireAdmin, [(0, express_validator_1.body)('reason').optional().isString()], validation_middleware_1.default, auth_controller_1.rejectVendorHandler);
exports.default = router;
