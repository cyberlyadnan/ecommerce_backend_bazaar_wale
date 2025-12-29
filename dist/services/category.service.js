"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.deleteCategory = exports.listCategories = exports.updateCategory = exports.createCategory = void 0;
const Category_model_1 = __importDefault(require("../models/Category.model"));
const Product_model_1 = __importDefault(require("../models/Product.model"));
const apiError_1 = __importDefault(require("../utils/apiError"));
const slugify_1 = __importDefault(require("../utils/slugify"));
const ensureUniqueSlug = async (slug, excludeId) => {
    const query = { slug };
    if (excludeId) {
        query._id = { $ne: excludeId };
    }
    const existing = await Category_model_1.default.findOne(query);
    if (existing) {
        throw new apiError_1.default(409, 'Category slug already exists');
    }
};
const resolveSlug = async (name, providedSlug, excludeId) => {
    let baseSlug = providedSlug ? (0, slugify_1.default)(providedSlug) : (0, slugify_1.default)(name);
    if (!baseSlug) {
        throw new apiError_1.default(400, 'Unable to generate slug for category');
    }
    let attempt = 1;
    let candidate = baseSlug;
    while (await Category_model_1.default.exists({ slug: candidate, ...(excludeId ? { _id: { $ne: excludeId } } : {}) })) {
        candidate = `${baseSlug}-${attempt++}`;
    }
    return candidate;
};
const createCategory = async (input) => {
    const slug = await resolveSlug(input.name, input.slug);
    if (input.parent) {
        const parent = await Category_model_1.default.findById(input.parent);
        if (!parent) {
            throw new apiError_1.default(404, 'Parent category not found');
        }
    }
    const category = await Category_model_1.default.create({
        name: input.name.trim(),
        slug,
        description: input.description?.trim(),
        image: input.image,
        parent: input.parent ?? null,
        isActive: input.isActive ?? true,
    });
    return category.toObject();
};
exports.createCategory = createCategory;
const updateCategory = async (categoryId, input) => {
    const category = await Category_model_1.default.findById(categoryId);
    if (!category) {
        throw new apiError_1.default(404, 'Category not found');
    }
    if (input.name) {
        category.name = input.name.trim();
    }
    if (typeof input.isActive === 'boolean') {
        category.isActive = input.isActive;
    }
    if (typeof input.description !== 'undefined') {
        category.description = input.description?.trim();
    }
    if (typeof input.image !== 'undefined') {
        category.image = input.image;
    }
    if (typeof input.parent !== 'undefined') {
        if (input.parent === null || input.parent === '') {
            category.parent = null;
        }
        else {
            if (categoryId === input.parent) {
                throw new apiError_1.default(400, 'Category cannot be its own parent');
            }
            const parent = await Category_model_1.default.findById(input.parent);
            if (!parent) {
                throw new apiError_1.default(404, 'Parent category not found');
            }
            category.parent = parent._id;
        }
    }
    if (input.slug || input.name) {
        category.slug = await resolveSlug(category.name, input.slug ?? category.slug, categoryId);
    }
    await category.save();
    return category.toObject();
};
exports.updateCategory = updateCategory;
const listCategories = async () => {
    const categories = await Category_model_1.default.find().sort({ name: 1 }).lean();
    const treeMap = new Map();
    categories.forEach((category) => {
        treeMap.set(category._id.toString(), {
            _id: category._id.toString(),
            name: category.name,
            slug: category.slug,
            description: category.description ?? undefined,
            image: category.image ?? undefined,
            parent: category.parent ? category.parent.toString() : null,
            isActive: category.isActive,
            children: [],
        });
    });
    const roots = [];
    categories.forEach((category) => {
        const id = category._id.toString();
        const node = treeMap.get(id);
        if (!node) {
            return;
        }
        const parentId = category.parent ? category.parent.toString() : null;
        if (parentId && treeMap.has(parentId)) {
            treeMap.get(parentId).children.push(node);
        }
        else {
            roots.push(node);
        }
    });
    return {
        categories: categories.map((category) => ({
            ...category,
            _id: category._id.toString(),
            parent: category.parent ? category.parent.toString() : null,
        })),
        tree: roots,
    };
};
exports.listCategories = listCategories;
const deleteCategory = async (categoryId) => {
    const category = await Category_model_1.default.findById(categoryId);
    if (!category) {
        throw new apiError_1.default(404, 'Category not found');
    }
    // Check if category has children (subcategories)
    const hasChildren = await Category_model_1.default.exists({ parent: categoryId });
    if (hasChildren) {
        throw new apiError_1.default(400, 'Cannot delete category with subcategories. Please delete or move subcategories first.');
    }
    // Check if category is used by any products
    const productsUsingCategory = await Product_model_1.default.exists({
        $or: [{ category: categoryId }, { subcategory: categoryId }],
    });
    if (productsUsingCategory) {
        throw new apiError_1.default(400, 'Cannot delete category that is assigned to products. Please reassign products first.');
    }
    await Category_model_1.default.findByIdAndDelete(categoryId);
    return { message: 'Category deleted successfully' };
};
exports.deleteCategory = deleteCategory;
