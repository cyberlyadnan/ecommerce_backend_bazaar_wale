"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getOrCreateShippingConfig = getOrCreateShippingConfig;
exports.getShippingConfigDto = getShippingConfigDto;
exports.updateShippingConfig = updateShippingConfig;
const ShippingConfig_model_1 = __importDefault(require("../models/ShippingConfig.model"));
const mongoose_1 = __importDefault(require("mongoose"));
async function getOrCreateShippingConfig() {
    const config = await ShippingConfig_model_1.default.findOneAndUpdate({ key: 'default' }, { $setOnInsert: { key: 'default' } }, { new: true, upsert: true }).lean();
    return config;
}
async function getShippingConfigDto() {
    const cfg = await getOrCreateShippingConfig();
    return {
        isEnabled: Boolean(cfg.isEnabled),
        flatRate: Number(cfg.flatRate ?? 0),
        freeShippingThreshold: Number(cfg.freeShippingThreshold ?? 0),
        updatedAt: cfg.updatedAt,
    };
}
async function updateShippingConfig(input, updatedBy) {
    const updatedByObjectId = updatedBy && mongoose_1.default.Types.ObjectId.isValid(updatedBy)
        ? new mongoose_1.default.Types.ObjectId(updatedBy)
        : undefined;
    const updated = await ShippingConfig_model_1.default.findOneAndUpdate({ key: 'default' }, {
        $set: {
            isEnabled: input.isEnabled,
            flatRate: input.flatRate,
            freeShippingThreshold: input.freeShippingThreshold,
            ...(updatedByObjectId ? { updatedBy: updatedByObjectId } : {}),
        },
    }, { new: true, upsert: true }).lean();
    return {
        isEnabled: Boolean(updated?.isEnabled),
        flatRate: Number(updated?.flatRate ?? 0),
        freeShippingThreshold: Number(updated?.freeShippingThreshold ?? 0),
        updatedAt: updated?.updatedAt,
    };
}
