"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
// src/models/Category.model.js
const mongoose_1 = __importDefault(require("mongoose"));
const CategorySchema = new mongoose_1.default.Schema({
    name: { type: String, required: true, unique: true },
    slug: { type: String, required: true, unique: true },
    parent: { type: mongoose_1.default.Schema.Types.ObjectId, ref: 'Category', default: null }, // for subcategories
    description: { type: String },
    isActive: { type: Boolean, default: true }
}, { timestamps: true });
exports.default = mongoose_1.default.model('Category', CategorySchema);
