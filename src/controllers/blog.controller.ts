import { NextFunction, Request, Response } from 'express';

import {
  createBlog,
  deleteBlog,
  getBlogById,
  getBlogBySlugPublic,
  getBlogStatsAdmin,
  listBlogsAdmin,
  listBlogsPublic,
  updateBlog,
} from '../services/blog.service';

export const createBlogHandler = async (req: Request, res: Response, next: NextFunction) => {
  try {
    if (!req.user) throw new Error('Authentication required');
    const blog = await createBlog(req.body, req.user._id.toString());
    res.status(201).json({ blog });
  } catch (error) {
    next(error);
  }
};

export const updateBlogHandler = async (req: Request, res: Response, next: NextFunction) => {
  try {
    if (!req.user) throw new Error('Authentication required');
    const blog = await updateBlog(req.params.blogId, req.body);
    res.json({ blog });
  } catch (error) {
    next(error);
  }
};

export const deleteBlogHandler = async (req: Request, res: Response, next: NextFunction) => {
  try {
    if (!req.user) throw new Error('Authentication required');
    const result = await deleteBlog(req.params.blogId);
    res.json(result);
  } catch (error) {
    next(error);
  }
};

export const getBlogHandler = async (req: Request, res: Response, next: NextFunction) => {
  try {
    if (!req.user) throw new Error('Authentication required');
    const blog = await getBlogById(req.params.blogId);
    res.json({ blog });
  } catch (error) {
    next(error);
  }
};

export const listBlogsAdminHandler = async (req: Request, res: Response, next: NextFunction) => {
  try {
    if (!req.user) throw new Error('Authentication required');
    const search = typeof req.query.search === 'string' ? req.query.search : undefined;
    const status =
      req.query.status === 'draft' || req.query.status === 'published' || req.query.status === 'all'
        ? (req.query.status as 'draft' | 'published' | 'all')
        : undefined;
    const page = typeof req.query.page === 'string' ? Number.parseInt(req.query.page, 10) : undefined;
    const limit = typeof req.query.limit === 'string' ? Number.parseInt(req.query.limit, 10) : undefined;

    const result = await listBlogsAdmin({ search, status, page, limit });
    res.json(result);
  } catch (error) {
    next(error);
  }
};

export const listBlogsPublicHandler = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const search = typeof req.query.search === 'string' ? req.query.search : undefined;
    const tag = typeof req.query.tag === 'string' ? req.query.tag : undefined;
    const page = typeof req.query.page === 'string' ? Number.parseInt(req.query.page, 10) : undefined;
    const limit = typeof req.query.limit === 'string' ? Number.parseInt(req.query.limit, 10) : undefined;

    const result = await listBlogsPublic({ search, tag, page, limit });
    res.json(result);
  } catch (error) {
    next(error);
  }
};

export const getBlogBySlugPublicHandler = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const trackView = !(req.query.trackView === '0' || req.query.trackView === 'false');
    const blog = await getBlogBySlugPublic(req.params.slug, { trackView });
    res.json({ blog });
  } catch (error) {
    next(error);
  }
};

export const blogStatsAdminHandler = async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const stats = await getBlogStatsAdmin();
    res.json({ stats });
  } catch (error) {
    next(error);
  }
};


