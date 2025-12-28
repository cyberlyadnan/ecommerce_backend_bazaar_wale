import { FilterQuery, LeanDocument } from 'mongoose';

import Category from '../models/Category.model';
import ApiError from '../utils/apiError';
import slugify from '../utils/slugify';

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
      category.parent = null;
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

export const listCategories = async () => {
  const categories = await Category.find().sort({ name: 1 }).lean();

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
    })) as Array<
      LeanDocument<{
        _id: string;
        name: string;
        slug: string;
        parent: string | null;
        description?: string;
        isActive: boolean;
        createdAt: Date;
        updatedAt: Date;
      }>
    >,
    tree: roots,
  };
};


