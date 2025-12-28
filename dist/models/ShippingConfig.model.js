"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const mongoose_1 = __importDefault(require("mongoose"));
const ShippingConfigSchema = new mongoose_1.default.Schema({
    key: { type: String, required: true, unique: true, index: true, default: 'default' },
    isEnabled: { type: Boolean, default: true },
    flatRate: { type: Number, default: 100, min: 0 },
    freeShippingThreshold: { type: Number, default: 5000, min: 0 },
    updatedBy: { type: mongoose_1.default.Schema.Types.ObjectId, ref: 'User' },
}, { timestamps: true });
exports.default = mongoose_1.default.model('ShippingConfig', ShippingConfigSchema);
