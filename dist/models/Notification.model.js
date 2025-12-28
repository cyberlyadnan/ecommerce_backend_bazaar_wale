"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
// src/models/Notification.model.js
const mongoose_1 = __importDefault(require("mongoose"));
const NotificationSchema = new mongoose_1.default.Schema({
    userId: { type: mongoose_1.default.Schema.Types.ObjectId, ref: 'User', index: true },
    channel: { type: String, enum: ['email', 'sms', 'inapp'], default: 'inapp' },
    title: { type: String },
    body: { type: String },
    meta: { type: mongoose_1.default.Schema.Types.Mixed },
    read: { type: Boolean, default: false }
}, { timestamps: true });
exports.default = mongoose_1.default.model('Notification', NotificationSchema);
