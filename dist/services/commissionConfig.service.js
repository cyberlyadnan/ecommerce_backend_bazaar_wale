"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getCommissionPercent = getCommissionPercent;
exports.setCommissionPercent = setCommissionPercent;
const mongoose_1 = __importDefault(require("mongoose"));
const CommissionConfig_model_1 = __importDefault(require("../models/CommissionConfig.model"));
async function getCommissionPercent() {
    const cfg = await CommissionConfig_model_1.default.findOneAndUpdate({ key: 'default' }, { $setOnInsert: { key: 'default' } }, { new: true, upsert: true }).lean();
    return Number(cfg?.commissionPercent ?? 0);
}
async function setCommissionPercent(commissionPercent, updatedBy) {
    const updatedByObjectId = updatedBy && mongoose_1.default.Types.ObjectId.isValid(updatedBy)
        ? new mongoose_1.default.Types.ObjectId(updatedBy)
        : undefined;
    const cfg = await CommissionConfig_model_1.default.findOneAndUpdate({ key: 'default' }, { $set: { commissionPercent, ...(updatedByObjectId ? { updatedBy: updatedByObjectId } : {}) } }, { new: true, upsert: true }).lean();
    return Number(cfg?.commissionPercent ?? 0);
}
