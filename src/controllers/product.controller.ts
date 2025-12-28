import { NextFunction, Request, Response } from 'express';

import {
  createProduct,
  deleteProduct,
  getProductById,
  getProductBySlugPublic,
  listProducts,
  listPublishedProducts,
  updateProduct,
} from '../services/product.service';

export const createProductHandler = async (req: Request, res: Response, next: NextFunction) => {
  try {
    if (!req.user) {
      throw new Error('Authentication required');
    }

    // If vendor is creating, automatically set vendorId to their own ID
    const body = { ...req.body };
    if (req.user.role === 'vendor' && !body.vendorId) {
      body.vendorId = req.user._id.toString();
    }

    const product = await createProduct(body);
    res.status(201).json({ product });
  } catch (error) {
    next(error);
  }
};

export const updateProductHandler = async (req: Request, res: Response, next: NextFunction) => {
  try {
    if (!req.user) {
      throw new Error('Authentication required');
    }

    const userId = req.user._id.toString();
    const userRole = req.user.role;

    // Check if vendor owns the product
    if (userRole === 'vendor') {
      const existingProduct = await getProductById(req.params.productId);
      const productVendorId =
        typeof existingProduct.vendor === 'string'
          ? existingProduct.vendor
          : existingProduct.vendor?._id;

      if (productVendorId !== userId) {
        throw new Error('You do not have permission to update this product');
      }

      // Vendors cannot change vendorId or approvedByAdmin
      const body = { ...req.body };
      delete body.vendorId;
      delete body.approvedByAdmin;

      const product = await updateProduct(req.params.productId, body);
      res.json({ product });
    } else {
      // Admin can update any product
      const product = await updateProduct(req.params.productId, req.body);
      res.json({ product });
    }
  } catch (error) {
    next(error);
  }
};

export const getProductHandler = async (req: Request, res: Response, next: NextFunction) => {
  try {
    if (!req.user) {
      throw new Error('Authentication required');
    }

    const userId = req.user._id.toString();
    const userRole = req.user.role;

    const product = await getProductById(req.params.productId);

    // If vendor, check if they own the product
    if (userRole === 'vendor') {
      const productVendorId =
        typeof product.vendor === 'string' ? product.vendor : product.vendor?._id;

      if (productVendorId !== userId) {
        throw new Error('You do not have permission to view this product');
      }
    }

    res.json({ product });
  } catch (error) {
    next(error);
  }
};

export const listProductsHandler = async (req: Request, res: Response, next: NextFunction) => {
  try {
    if (!req.user) {
      throw new Error('Authentication required');
    }

    const searchParam = typeof req.query.search === 'string' ? req.query.search : undefined;
    const userRole = req.user.role;
    const userId = req.user._id.toString();

    // Vendors can only see their own products (scope is always 'mine')
    const scopeParam =
      userRole === 'vendor'
        ? 'mine'
        : req.query.scope === 'mine' || req.query.scope === 'all'
          ? (req.query.scope as 'mine' | 'all')
          : 'all';

    const limitParam =
      typeof req.query.limit === 'string' && !Number.isNaN(Number.parseInt(req.query.limit, 10))
        ? Number.parseInt(req.query.limit, 10)
        : undefined;

    // For vendors, use their ID; for admins, use adminId for 'mine' scope
    const adminId = userRole === 'admin' ? userId : userRole === 'vendor' ? userId : undefined;

    const products = await listProducts({
      search: searchParam,
      scope: scopeParam,
      adminId,
      limit: limitParam,
    });
    res.json({ products });
  } catch (error) {
    next(error);
  }
};

export const getProductBySlugHandler = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const product = await getProductBySlugPublic(req.params.slug);
    res.json({ product });
  } catch (error) {
    next(error);
  }
};

export const listPublicProductsHandler = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const search = typeof req.query.search === 'string' ? req.query.search : undefined;
    const limit =
      typeof req.query.limit === 'string' && !Number.isNaN(Number.parseInt(req.query.limit, 10))
        ? Number.parseInt(req.query.limit, 10)
        : undefined;

    const products = await listPublishedProducts({ search, limit });
    res.json({ products });
  } catch (error) {
    next(error);
  }
};

export const deleteProductHandler = async (req: Request, res: Response, next: NextFunction) => {
  try {
    if (!req.user) {
      throw new Error('Authentication required');
    }

    const userId = req.user._id.toString();
    const userRole = req.user.role;

    const result = await deleteProduct(req.params.productId, userId, userRole);
    res.json(result);
  } catch (error) {
    next(error);
  }
};


