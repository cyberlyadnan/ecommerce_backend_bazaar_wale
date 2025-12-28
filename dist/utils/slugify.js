"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const slugify = (value) => value
    .toLowerCase()
    .trim()
    .replace(/[\s/]+/g, '-')
    .replace(/[^a-z0-9-]/g, '')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
exports.default = slugify;
