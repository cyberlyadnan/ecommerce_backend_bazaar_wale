"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const mongoose_1 = require("mongoose");
const PasswordResetTokenSchema = new mongoose_1.Schema({
    user: { type: mongoose_1.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    tokenHash: { type: String, required: true },
    expiresAt: { type: Date, required: true, index: true },
    usedAt: { type: Date },
}, { timestamps: true });
PasswordResetTokenSchema.index({ user: 1, tokenHash: 1 });
const PasswordResetToken = (0, mongoose_1.model)('PasswordResetToken', PasswordResetTokenSchema);
exports.default = PasswordResetToken;
