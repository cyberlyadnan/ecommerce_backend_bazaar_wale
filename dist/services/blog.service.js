"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getBlogStatsAdmin = exports.getBlogBySlugPublic = exports.listBlogsPublic = exports.listBlogsAdmin = exports.getBlogById = exports.deleteBlog = exports.updateBlog = exports.createBlog = void 0;
const mongoose_1 = __importDefault(require("mongoose"));
const Blog_model_1 = __importDefault(require("../models/Blog.model"));
const apiError_1 = __importDefault(require("../utils/apiError"));
const slugify_1 = __importDefault(require("../utils/slugify"));
const resolveBlogSlug = async (title, providedSlug, excludeId) => {
    const base = (0, slugify_1.default)(providedSlug ?? title);
    if (!base) {
        throw new apiError_1.default(400, 'Unable to derive blog slug');
    }
    let candidate = base;
    let attempt = 1;
    const query = { slug: candidate };
    if (excludeId) {
        query._id = { $ne: excludeId };
    }
    while (await Blog_model_1.default.exists(query)) {
        candidate = `${base}-${attempt++}`;
        query.slug = candidate;
    }
    return candidate;
};
const normaliseKeywords = (keywords) => (keywords ?? [])
    .map((k) => String(k).trim())
    .filter(Boolean)
    .slice(0, 30);
const normaliseTags = (tags) => (tags ?? [])
    .map((t) => String(t).trim())
    .filter(Boolean)
    .slice(0, 30);
const normaliseImage = (img) => {
    if (!img || !img.url)
        return undefined;
    return { url: String(img.url).trim(), alt: img.alt ? String(img.alt).trim() : undefined };
};
const computePublishedAt = (status, publishedAt) => {
    if (status !== 'published')
        return undefined;
    if (!publishedAt)
        return new Date();
    const d = publishedAt instanceof Date ? publishedAt : new Date(publishedAt);
    if (Number.isNaN(d.getTime()))
        return new Date();
    return d;
};
const createBlog = async (input, authorId) => {
    const status = input.status ?? 'draft';
    const slug = await resolveBlogSlug(input.title, input.slug);
    const doc = await Blog_model_1.default.create({
        title: input.title.trim(),
        slug,
        excerpt: input.excerpt?.trim(),
        contentHtml: input.contentHtml,
        featuredImage: normaliseImage(input.featuredImage),
        tags: normaliseTags(input.tags),
        status,
        publishedAt: computePublishedAt(status, input.publishedAt),
        author: authorId && mongoose_1.default.Types.ObjectId.isValid(authorId) ? new mongoose_1.default.Types.ObjectId(authorId) : undefined,
        seo: input.seo
            ? {
                ...input.seo,
                metaTitle: input.seo.metaTitle?.trim(),
                metaDescription: input.seo.metaDescription?.trim(),
                keywords: normaliseKeywords(input.seo.keywords),
                canonicalUrl: input.seo.canonicalUrl?.trim(),
                ogTitle: input.seo.ogTitle?.trim(),
                ogDescription: input.seo.ogDescription?.trim(),
                ogImage: normaliseImage(input.seo.ogImage),
                twitterTitle: input.seo.twitterTitle?.trim(),
                twitterDescription: input.seo.twitterDescription?.trim(),
                twitterImage: normaliseImage(input.seo.twitterImage),
            }
            : undefined,
        meta: input.meta,
    });
    return doc.toObject();
};
exports.createBlog = createBlog;
const updateBlog = async (blogId, input) => {
    if (!mongoose_1.default.Types.ObjectId.isValid(blogId)) {
        throw new apiError_1.default(400, 'Invalid blog id');
    }
    const blog = await Blog_model_1.default.findById(blogId);
    if (!blog)
        throw new apiError_1.default(404, 'Blog not found');
    if (input.title)
        blog.title = input.title.trim();
    if (input.slug || input.title) {
        blog.slug = await resolveBlogSlug(input.title ?? blog.title, input.slug ?? blog.slug, blogId);
    }
    if (typeof input.excerpt !== 'undefined')
        blog.excerpt = input.excerpt?.trim();
    if (typeof input.contentHtml !== 'undefined')
        blog.contentHtml = input.contentHtml;
    if (typeof input.featuredImage !== 'undefined')
        blog.featuredImage = normaliseImage(input.featuredImage);
    if (input.tags)
        blog.tags = normaliseTags(input.tags);
    if (input.seo) {
        const seo = input.seo;
        blog.seo = {
            ...blog.seo,
            ...seo,
            metaTitle: seo.metaTitle?.trim(),
            metaDescription: seo.metaDescription?.trim(),
            keywords: normaliseKeywords(seo.keywords),
            canonicalUrl: seo.canonicalUrl?.trim(),
            ogTitle: seo.ogTitle?.trim(),
            ogDescription: seo.ogDescription?.trim(),
            ogImage: typeof seo.ogImage !== 'undefined' ? normaliseImage(seo.ogImage) : blog.seo?.ogImage,
            twitterTitle: seo.twitterTitle?.trim(),
            twitterDescription: seo.twitterDescription?.trim(),
            twitterImage: typeof seo.twitterImage !== 'undefined'
                ? normaliseImage(seo.twitterImage)
                : blog.seo?.twitterImage,
        };
    }
    if (typeof input.status !== 'undefined') {
        blog.status = input.status;
        blog.publishedAt = computePublishedAt(input.status, input.publishedAt);
    }
    else if (typeof input.publishedAt !== 'undefined') {
        // allow adjusting publishedAt while published
        if (blog.status === 'published') {
            blog.publishedAt = computePublishedAt('published', input.publishedAt);
        }
    }
    if (typeof input.meta !== 'undefined')
        blog.meta = input.meta;
    await blog.save();
    return blog.toObject();
};
exports.updateBlog = updateBlog;
const deleteBlog = async (blogId) => {
    if (!mongoose_1.default.Types.ObjectId.isValid(blogId))
        throw new apiError_1.default(400, 'Invalid blog id');
    const blog = await Blog_model_1.default.findById(blogId).lean();
    if (!blog)
        throw new apiError_1.default(404, 'Blog not found');
    await Blog_model_1.default.findByIdAndDelete(blogId);
    return { message: 'Blog deleted successfully' };
};
exports.deleteBlog = deleteBlog;
const getBlogById = async (blogId) => {
    if (!mongoose_1.default.Types.ObjectId.isValid(blogId))
        throw new apiError_1.default(400, 'Invalid blog id');
    const blog = await Blog_model_1.default.findById(blogId).populate({ path: 'author', select: 'name email role' }).lean();
    if (!blog)
        throw new apiError_1.default(404, 'Blog not found');
    return { ...blog, _id: blog._id.toString() };
};
exports.getBlogById = getBlogById;
const listBlogsAdmin = async ({ search, status, page = 1, limit = 20, } = {}) => {
    const q = {};
    if (status && status !== 'all')
        q.status = status;
    if (search && search.trim()) {
        const term = search.trim();
        const regex = new RegExp(term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
        q.$or = [{ title: regex }, { slug: regex }, { excerpt: regex }, { tags: regex }, { tagsText: regex }];
    }
    const limitValue = Math.min(Math.max(Number(limit) || 20, 1), 100);
    const pageValue = Math.min(Math.max(Number(page) || 1, 1), 5000);
    const skip = (pageValue - 1) * limitValue;
    const [items, total] = await Promise.all([
        Blog_model_1.default.find(q)
            .sort({ publishedAt: -1, createdAt: -1 })
            .skip(skip)
            .limit(limitValue)
            .select('-contentHtml') // list view: avoid huge payload
            .lean(),
        Blog_model_1.default.countDocuments(q),
    ]);
    return {
        items: items.map((b) => ({ ...b, _id: b._id.toString() })),
        page: pageValue,
        limit: limitValue,
        total,
        totalPages: Math.max(1, Math.ceil(total / limitValue)),
    };
};
exports.listBlogsAdmin = listBlogsAdmin;
const listBlogsPublic = async ({ search, tag, page = 1, limit = 12, } = {}) => {
    const q = { status: 'published' };
    if (tag && tag.trim())
        q.tags = new RegExp(`^${tag.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i');
    if (search && search.trim()) {
        const term = search.trim();
        // prefer text index when possible, fallback to regex
        q.$text = { $search: term };
    }
    const limitValue = Math.min(Math.max(Number(limit) || 12, 1), 50);
    const pageValue = Math.min(Math.max(Number(page) || 1, 1), 5000);
    const skip = (pageValue - 1) * limitValue;
    const [items, total] = await Promise.all([
        Blog_model_1.default.find(q)
            .sort(search ? { score: { $meta: 'textScore' } } : { publishedAt: -1, createdAt: -1 })
            .skip(skip)
            .limit(limitValue)
            .select('-contentHtml')
            .lean(),
        Blog_model_1.default.countDocuments(q),
    ]);
    return {
        items: items.map((b) => ({ ...b, _id: b._id.toString() })),
        page: pageValue,
        limit: limitValue,
        total,
        totalPages: Math.max(1, Math.ceil(total / limitValue)),
    };
};
exports.listBlogsPublic = listBlogsPublic;
const getBlogBySlugPublic = async (slug, { trackView = true } = {}) => {
    if (!slug || !slug.trim())
        throw new apiError_1.default(400, 'Invalid blog slug');
    const blog = await Blog_model_1.default.findOne({ slug: slug.trim(), status: 'published' }).lean();
    if (!blog)
        throw new apiError_1.default(404, 'Blog not found');
    if (trackView) {
        // best-effort (don’t block response)
        Blog_model_1.default.updateOne({ _id: blog._id }, { $inc: { views: 1 } }).catch(() => { });
    }
    return { ...blog, _id: blog._id.toString() };
};
exports.getBlogBySlugPublic = getBlogBySlugPublic;
const getBlogStatsAdmin = async () => {
    const [total, drafts, published] = await Promise.all([
        Blog_model_1.default.countDocuments({}),
        Blog_model_1.default.countDocuments({ status: 'draft' }),
        Blog_model_1.default.countDocuments({ status: 'published' }),
    ]);
    const topByViews = await Blog_model_1.default.find({ status: 'published' })
        .sort({ views: -1 })
        .limit(8)
        .select('title slug views publishedAt')
        .lean();
    return {
        total,
        drafts,
        published,
        topByViews: topByViews.map((b) => ({ ...b, _id: b._id.toString() })),
    };
};
exports.getBlogStatsAdmin = getBlogStatsAdmin;
