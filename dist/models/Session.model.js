"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const mongoose_1 = require("mongoose");
const SessionSchema = new mongoose_1.Schema({
    user: { type: mongoose_1.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    role: { type: String, enum: ['customer', 'vendor', 'admin'], required: true },
    refreshTokenHash: { type: String, required: true },
    userAgent: { type: String },
    ipAddress: { type: String },
    expiresAt: { type: Date, required: true, index: true },
}, { timestamps: true });
SessionSchema.index({ user: 1, refreshTokenHash: 1 });
const Session = (0, mongoose_1.model)('Session', SessionSchema);
exports.default = Session;
