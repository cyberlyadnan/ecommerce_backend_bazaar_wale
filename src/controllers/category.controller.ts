import { NextFunction, Request, Response } from 'express';

import { createCategory, listCategories, updateCategory, deleteCategory } from '../services/category.service';

export const createCategoryHandler = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const category = await createCategory(req.body);
    res.status(201).json({ category });
  } catch (error) {
    next(error);
  }
};

export const updateCategoryHandler = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const category = await updateCategory(req.params.categoryId, req.body);
    res.json({ category });
  } catch (error) {
    next(error);
  }
};

export const listCategoriesHandler = async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const data = await listCategories();
    res.json(data);
  } catch (error) {
    next(error);
  }
};

export const deleteCategoryHandler = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const result = await deleteCategory(req.params.categoryId);
    res.json(result);
  } catch (error) {
    next(error);
  }
};


