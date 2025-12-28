"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const express_validator_1 = require("express-validator");
const contact_controller_1 = require("../controllers/contact.controller");
const auth_middleware_1 = require("../middlewares/auth.middleware");
const validation_middleware_1 = __importDefault(require("../middlewares/validation.middleware"));
const router = (0, express_1.Router)();
// Public route - anyone can submit a contact form
router.post('/', [
    (0, express_validator_1.body)('name').isString().trim().notEmpty().isLength({ min: 2, max: 100 }),
    (0, express_validator_1.body)('email').isEmail().normalizeEmail(),
    (0, express_validator_1.body)('phone').optional().isString().trim().isLength({ max: 20 }),
    (0, express_validator_1.body)('subject').isString().trim().notEmpty().isLength({ min: 3, max: 200 }),
    (0, express_validator_1.body)('message').isString().trim().notEmpty().isLength({ min: 10, max: 5000 }),
], validation_middleware_1.default, contact_controller_1.createContactHandler);
// Admin routes - require authentication
router.get('/', auth_middleware_1.requireAdmin, [
    (0, express_validator_1.query)('status').optional().isIn(['new', 'read', 'replied', 'closed']),
    (0, express_validator_1.query)('limit').optional().isInt({ min: 1, max: 100 }),
    (0, express_validator_1.query)('skip').optional().isInt({ min: 0 }),
], validation_middleware_1.default, contact_controller_1.listContactsHandler);
router.get('/:contactId', auth_middleware_1.requireAdmin, [(0, express_validator_1.param)('contactId').isMongoId()], validation_middleware_1.default, contact_controller_1.getContactHandler);
router.patch('/:contactId', auth_middleware_1.requireAdmin, [
    (0, express_validator_1.param)('contactId').isMongoId(),
    (0, express_validator_1.body)('status').optional().isIn(['new', 'read', 'replied', 'closed']),
    (0, express_validator_1.body)('adminResponse').optional().isString().trim().isLength({ min: 1, max: 5000 }),
], validation_middleware_1.default, contact_controller_1.updateContactHandler);
router.delete('/:contactId', auth_middleware_1.requireAdmin, [(0, express_validator_1.param)('contactId').isMongoId()], validation_middleware_1.default, contact_controller_1.deleteContactHandler);
exports.default = router;
