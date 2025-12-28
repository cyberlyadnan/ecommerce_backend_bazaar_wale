"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ensureBlogIndexes = exports.ensureProductIndexes = void 0;
const Product_model_1 = __importDefault(require("../models/Product.model"));
const Blog_model_1 = __importDefault(require("../models/Blog.model"));
const logger_1 = __importDefault(require("../config/logger"));
const ensureProductIndexes = async () => {
    try {
        const indexes = await Product_model_1.default.collection.indexes();
        const legacyIndexes = indexes.filter((index) => {
            if (!index.key || typeof index.key !== 'object') {
                return false;
            }
            const key = index.key;
            const values = Object.values(key);
            const hasLegacyTagText = ('tags' in key && key.tags === 'text') || ('tagsText' in key && key.tagsText !== 'text');
            const missingTagsText = values.includes('text') && !('tagsText' in key);
            return hasLegacyTagText || missingTagsText;
        });
        for (const legacy of legacyIndexes) {
            if (legacy.name) {
                logger_1.default.warn(`Dropping legacy product index '${legacy.name}' to rebuild text search support.`);
                await Product_model_1.default.collection.dropIndex(legacy.name);
            }
        }
        await Product_model_1.default.createIndexes();
    }
    catch (error) {
        logger_1.default.error('Failed to ensure product indexes', error);
    }
};
exports.ensureProductIndexes = ensureProductIndexes;
const ensureBlogIndexes = async () => {
    try {
        await Blog_model_1.default.createIndexes();
    }
    catch (error) {
        logger_1.default.error('Failed to ensure blog indexes', error);
    }
};
exports.ensureBlogIndexes = ensureBlogIndexes;
