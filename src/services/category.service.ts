import mongoose, { FilterQuery } from 'mongoose';

import Category from '../models/Category.model';
import Product from '../models/Product.model';
import ApiError from '../utils/apiError';
import slugify from '../utils/slugify';

/** Slug for the fallback category used when a category is deleted or product has none */
export const DEFAULT_CATEGORY_SLUG = 'uncategorized';

interface CategoryInput {
  name: string;
  slug?: string;
  description?: string;
  parent?: string | null;
  image?: string;
  isActive?: boolean;
}

export interface CategoryNode {
  _id: string;
  name: string;
  slug: string;
  description?: string;
  image?: string;
  parent?: string | null;
  isActive: boolean;
  children: CategoryNode[];
}

const ensureUniqueSlug = async (slug: string, excludeId?: string) => {
  const query: FilterQuery<typeof Category> = { slug };
  if (excludeId) {
    query._id = { $ne: excludeId };
  }
  const existing = await Category.findOne(query);
  if (existing) {
    throw new ApiError(409, 'Category slug already exists');
  }
};

const resolveSlug = async (name: string, providedSlug?: string, excludeId?: string) => {
  let baseSlug = providedSlug ? slugify(providedSlug) : slugify(name);
  if (!baseSlug) {
    throw new ApiError(400, 'Unable to generate slug for category');
  }

  let attempt = 1;
  let candidate = baseSlug;

  while (await Category.exists({ slug: candidate, ...(excludeId ? { _id: { $ne: excludeId } } : {}) })) {
    candidate = `${baseSlug}-${attempt++}`;
  }

  return candidate;
};

export const createCategory = async (input: CategoryInput) => {
  const slug = await resolveSlug(input.name, input.slug);

  if (input.parent) {
    const parent = await Category.findById(input.parent);
    if (!parent) {
      throw new ApiError(404, 'Parent category not found');
    }
  }

  const category = await Category.create({
    name: input.name.trim(),
    slug,
    description: input.description?.trim(),
    image: input.image,
    parent: input.parent ?? null,
    isActive: input.isActive ?? true,
  });

  return category.toObject();
};

export const updateCategory = async (categoryId: string, input: Partial<CategoryInput>) => {
  const category = await Category.findById(categoryId);
  if (!category) {
    throw new ApiError(404, 'Category not found');
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
      (category as any).parent = null;
    } else {
      if (categoryId === input.parent) {
        throw new ApiError(400, 'Category cannot be its own parent');
      }
      const parent = await Category.findById(input.parent);
      if (!parent) {
        throw new ApiError(404, 'Parent category not found');
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

/** Get or create the default "Uncategorized" category (used when a category is deleted or product has no category). */
export const getOrCreateDefaultCategory = async () => {
  let category = await Category.findOne({ slug: DEFAULT_CATEGORY_SLUG }).lean();
  if (category) {
    return category._id.toString();
  }
  const slug = await resolveSlug('Uncategorized', DEFAULT_CATEGORY_SLUG);
  const created = await Category.create({
    name: 'Uncategorized',
    slug,
    description: 'Products without a specific category',
    parent: null,
    isActive: true,
  });
  // Create a default subcategory so products can satisfy "category + subcategory" requirement
  await Category.create({
    name: 'General',
    slug: await resolveSlug('General', 'uncategorized-general'),
    description: 'Default subcategory for uncategorized products',
    parent: created._id,
    isActive: true,
  });
  return created._id.toString();
};

export interface ListCategoriesOptions {
  /** If true, only return categories with isActive: true (for public/customer-facing). */
  activeOnly?: boolean;
}

export const listCategories = async (options?: ListCategoriesOptions) => {
  const filter: FilterQuery<typeof Category> = {};
  if (options?.activeOnly === true) {
    filter.isActive = true;
  }
  const categories = await Category.find(filter).sort({ name: 1 }).lean();

  const treeMap = new Map<string, CategoryNode>();

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

  const roots: CategoryNode[] = [];

  categories.forEach((category) => {
    const id = category._id.toString();
    const node = treeMap.get(id);
    if (!node) {
      return;
    }
    const parentId = category.parent ? category.parent.toString() : null;
    if (parentId && treeMap.has(parentId)) {
      treeMap.get(parentId)!.children.push(node);
    } else {
      roots.push(node);
    }
  });

  return {
    categories: categories.map((category) => ({
      ...category,
      _id: category._id.toString(),
      parent: category.parent ? category.parent.toString() : null,
    })) as Array<{
      _id: string;
      name: string;
      slug: string;
      parent: string | null;
      description?: string;
      isActive: boolean;
      createdAt: Date;
      updatedAt: Date;
    }>,
    tree: roots,
  };
};

export const deleteCategory = async (categoryId: string) => {
  const category = await Category.findById(categoryId);
  if (!category) {
    throw new ApiError(404, 'Category not found');
  }

  // Do not allow deleting the default category
  if (category.slug === DEFAULT_CATEGORY_SLUG) {
    throw new ApiError(400, 'Cannot delete the default Uncategorized category.');
  }

  const defaultCategoryId = await getOrCreateDefaultCategory();
  const defaultSub = await Category.findOne({ parent: defaultCategoryId }).lean();
  const defaultSubcategoryId = defaultSub?._id ?? null;

  const setToDefault = defaultSubcategoryId
    ? { category: new mongoose.Types.ObjectId(defaultCategoryId), subcategory: defaultSubcategoryId }
    : { category: new mongoose.Types.ObjectId(defaultCategoryId), subcategory: null };

  // 1. Reassign all products that use this category (or its subcategories) to default category
  await Product.updateMany(
    { $or: [{ category: categoryId }, { subcategory: categoryId }] },
    { $set: setToDefault },
  );

  // 2. Delete subcategories first (and reassign any products in them to default)
  const children = await Category.find({ parent: categoryId }).lean();
  for (const child of children) {
    await Product.updateMany(
      { $or: [{ category: child._id }, { subcategory: child._id }] },
      { $set: setToDefault },
    );
    await Category.findByIdAndDelete(child._id);
  }

  // 3. Delete the category
  await Category.findByIdAndDelete(categoryId);
  return { message: 'Category deleted successfully. Products using it were moved to Uncategorized.' };
};


