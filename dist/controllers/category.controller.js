"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.listCategoriesHandler = exports.updateCategoryHandler = exports.createCategoryHandler = void 0;
const category_service_1 = require("../services/category.service");
const createCategoryHandler = async (req, res, next) => {
    try {
        const category = await (0, category_service_1.createCategory)(req.body);
        res.status(201).json({ category });
    }
    catch (error) {
        next(error);
    }
};
exports.createCategoryHandler = createCategoryHandler;
const updateCategoryHandler = async (req, res, next) => {
    try {
        const category = await (0, category_service_1.updateCategory)(req.params.categoryId, req.body);
        res.json({ category });
    }
    catch (error) {
        next(error);
    }
};
exports.updateCategoryHandler = updateCategoryHandler;
const listCategoriesHandler = async (_req, res, next) => {
    try {
        const data = await (0, category_service_1.listCategories)();
        res.json(data);
    }
    catch (error) {
        next(error);
    }
};
exports.listCategoriesHandler = listCategoriesHandler;
