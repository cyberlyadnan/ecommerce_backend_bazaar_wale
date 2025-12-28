"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const mongoose_1 = __importDefault(require("mongoose"));
const CommissionConfigSchema = new mongoose_1.default.Schema({
    key: { type: String, required: true, unique: true, index: true, default: 'default' },
    commissionPercent: { type: Number, default: 5, min: 0, max: 100 },
    updatedBy: { type: mongoose_1.default.Schema.Types.ObjectId, ref: 'User' },
}, { timestamps: true });
exports.default = mongoose_1.default.model('CommissionConfig', CommissionConfigSchema);
