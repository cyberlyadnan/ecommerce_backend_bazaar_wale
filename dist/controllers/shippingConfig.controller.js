"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.updateAdminShippingConfigHandler = exports.getAdminShippingConfigHandler = void 0;
const express_validator_1 = require("express-validator");
const apiError_1 = __importDefault(require("../utils/apiError"));
const shippingConfigService = __importStar(require("../services/shippingConfig.service"));
/**
 * GET /api/orders/admin/shipping-config
 */
const getAdminShippingConfigHandler = async (req, res, next) => {
    try {
        if (!req.user || req.user.role !== 'admin') {
            throw new apiError_1.default(403, 'Admin access required');
        }
        const config = await shippingConfigService.getShippingConfigDto();
        res.json({ success: true, config });
    }
    catch (error) {
        next(error);
    }
};
exports.getAdminShippingConfigHandler = getAdminShippingConfigHandler;
/**
 * PUT /api/orders/admin/shipping-config
 */
const updateAdminShippingConfigHandler = async (req, res, next) => {
    try {
        if (!req.user || req.user.role !== 'admin') {
            throw new apiError_1.default(403, 'Admin access required');
        }
        const errors = (0, express_validator_1.validationResult)(req);
        if (!errors.isEmpty()) {
            throw new apiError_1.default(400, 'Validation failed');
        }
        const { isEnabled, flatRate, freeShippingThreshold } = req.body;
        const updated = await shippingConfigService.updateShippingConfig({
            isEnabled: Boolean(isEnabled),
            flatRate: Number(flatRate),
            freeShippingThreshold: Number(freeShippingThreshold),
        }, req.user._id.toString());
        res.json({ success: true, config: updated, message: 'Shipping pricing updated' });
    }
    catch (error) {
        next(error);
    }
};
exports.updateAdminShippingConfigHandler = updateAdminShippingConfigHandler;
