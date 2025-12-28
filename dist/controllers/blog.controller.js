"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.blogStatsAdminHandler = exports.getBlogBySlugPublicHandler = exports.listBlogsPublicHandler = exports.listBlogsAdminHandler = exports.getBlogHandler = exports.deleteBlogHandler = exports.updateBlogHandler = exports.createBlogHandler = void 0;
const blog_service_1 = require("../services/blog.service");
const createBlogHandler = async (req, res, next) => {
    try {
        if (!req.user)
            throw new Error('Authentication required');
        const blog = await (0, blog_service_1.createBlog)(req.body, req.user._id.toString());
        res.status(201).json({ blog });
    }
    catch (error) {
        next(error);
    }
};
exports.createBlogHandler = createBlogHandler;
const updateBlogHandler = async (req, res, next) => {
    try {
        if (!req.user)
            throw new Error('Authentication required');
        const blog = await (0, blog_service_1.updateBlog)(req.params.blogId, req.body);
        res.json({ blog });
    }
    catch (error) {
        next(error);
    }
};
exports.updateBlogHandler = updateBlogHandler;
const deleteBlogHandler = async (req, res, next) => {
    try {
        if (!req.user)
            throw new Error('Authentication required');
        const result = await (0, blog_service_1.deleteBlog)(req.params.blogId);
        res.json(result);
    }
    catch (error) {
        next(error);
    }
};
exports.deleteBlogHandler = deleteBlogHandler;
const getBlogHandler = async (req, res, next) => {
    try {
        if (!req.user)
            throw new Error('Authentication required');
        const blog = await (0, blog_service_1.getBlogById)(req.params.blogId);
        res.json({ blog });
    }
    catch (error) {
        next(error);
    }
};
exports.getBlogHandler = getBlogHandler;
const listBlogsAdminHandler = async (req, res, next) => {
    try {
        if (!req.user)
            throw new Error('Authentication required');
        const search = typeof req.query.search === 'string' ? req.query.search : undefined;
        const status = req.query.status === 'draft' || req.query.status === 'published' || req.query.status === 'all'
            ? req.query.status
            : undefined;
        const page = typeof req.query.page === 'string' ? Number.parseInt(req.query.page, 10) : undefined;
        const limit = typeof req.query.limit === 'string' ? Number.parseInt(req.query.limit, 10) : undefined;
        const result = await (0, blog_service_1.listBlogsAdmin)({ search, status, page, limit });
        res.json(result);
    }
    catch (error) {
        next(error);
    }
};
exports.listBlogsAdminHandler = listBlogsAdminHandler;
const listBlogsPublicHandler = async (req, res, next) => {
    try {
        const search = typeof req.query.search === 'string' ? req.query.search : undefined;
        const tag = typeof req.query.tag === 'string' ? req.query.tag : undefined;
        const page = typeof req.query.page === 'string' ? Number.parseInt(req.query.page, 10) : undefined;
        const limit = typeof req.query.limit === 'string' ? Number.parseInt(req.query.limit, 10) : undefined;
        const result = await (0, blog_service_1.listBlogsPublic)({ search, tag, page, limit });
        res.json(result);
    }
    catch (error) {
        next(error);
    }
};
exports.listBlogsPublicHandler = listBlogsPublicHandler;
const getBlogBySlugPublicHandler = async (req, res, next) => {
    try {
        const trackView = !(req.query.trackView === '0' || req.query.trackView === 'false');
        const blog = await (0, blog_service_1.getBlogBySlugPublic)(req.params.slug, { trackView });
        res.json({ blog });
    }
    catch (error) {
        next(error);
    }
};
exports.getBlogBySlugPublicHandler = getBlogBySlugPublicHandler;
const blogStatsAdminHandler = async (_req, res, next) => {
    try {
        const stats = await (0, blog_service_1.getBlogStatsAdmin)();
        res.json({ stats });
    }
    catch (error) {
        next(error);
    }
};
exports.blogStatsAdminHandler = blogStatsAdminHandler;
