import mongoose from 'mongoose';

import Blog from '../models/Blog.model';
import ApiError from '../utils/apiError';
import slugify from '../utils/slugify';

export interface BlogSeoInput {
  metaTitle?: string;
  metaDescription?: string;
  keywords?: string[];
  canonicalUrl?: string;

  ogTitle?: string;
  ogDescription?: string;
  ogImage?: { url: string; alt?: string };

  twitterTitle?: string;
  twitterDescription?: string;
  twitterImage?: { url: string; alt?: string };

  robotsIndex?: boolean;
  robotsFollow?: boolean;
}

export interface BlogInput {
  title: string;
  slug?: string;
  excerpt?: string;
  contentHtml: string;
  featuredImage?: { url: string; alt?: string } | null;
  tags?: string[];
  status?: 'draft' | 'published';
  publishedAt?: string | Date | null;
  seo?: BlogSeoInput;
  meta?: Record<string, unknown>;
}

export interface BlogUpdateInput extends Partial<BlogInput> {}

const resolveBlogSlug = async (title: string, providedSlug?: string, excludeId?: string) => {
  const base = slugify(providedSlug ?? title);
  if (!base) {
    throw new ApiError(400, 'Unable to derive blog slug');
  }

  let candidate = base;
  let attempt = 1;
  const query: mongoose.FilterQuery<typeof Blog> = { slug: candidate };
  if (excludeId) {
    query._id = { $ne: excludeId };
  }

  while (await Blog.exists(query)) {
    candidate = `${base}-${attempt++}`;
    query.slug = candidate;
  }

  return candidate;
};

const normaliseKeywords = (keywords?: string[]) =>
  (keywords ?? [])
    .map((k) => String(k).trim())
    .filter(Boolean)
    .slice(0, 30);

const normaliseTags = (tags?: string[]) =>
  (tags ?? [])
    .map((t) => String(t).trim())
    .filter(Boolean)
    .slice(0, 30);

const normaliseImage = (img?: { url: string; alt?: string } | null) => {
  if (!img || !img.url) return undefined;
  return { url: String(img.url).trim(), alt: img.alt ? String(img.alt).trim() : undefined };
};

const computePublishedAt = (status: 'draft' | 'published', publishedAt?: string | Date | null) => {
  if (status !== 'published') return undefined;
  if (!publishedAt) return new Date();
  const d = publishedAt instanceof Date ? publishedAt : new Date(publishedAt);
  if (Number.isNaN(d.getTime())) return new Date();
  return d;
};

export const createBlog = async (input: BlogInput, authorId?: string) => {
  const status: 'draft' | 'published' = input.status ?? 'draft';
  const slug = await resolveBlogSlug(input.title, input.slug);

  const doc = await Blog.create({
    title: input.title.trim(),
    slug,
    excerpt: input.excerpt?.trim(),
    contentHtml: input.contentHtml,
    featuredImage: normaliseImage(input.featuredImage),
    tags: normaliseTags(input.tags),
    status,
    publishedAt: computePublishedAt(status, input.publishedAt),
    author: authorId && mongoose.Types.ObjectId.isValid(authorId) ? new mongoose.Types.ObjectId(authorId) : undefined,
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

export const updateBlog = async (blogId: string, input: BlogUpdateInput) => {
  if (!mongoose.Types.ObjectId.isValid(blogId)) {
    throw new ApiError(400, 'Invalid blog id');
  }

  const blog = await Blog.findById(blogId);
  if (!blog) throw new ApiError(404, 'Blog not found');

  if (input.title) blog.title = input.title.trim();
  if (input.slug || input.title) {
    blog.slug = await resolveBlogSlug(input.title ?? blog.title, input.slug ?? blog.slug, blogId);
  }

  if (typeof input.excerpt !== 'undefined') blog.excerpt = input.excerpt?.trim();
  if (typeof input.contentHtml !== 'undefined') blog.contentHtml = input.contentHtml;
  if (typeof input.featuredImage !== 'undefined') blog.featuredImage = normaliseImage(input.featuredImage) as any;
  if (input.tags) blog.tags = normaliseTags(input.tags) as any;

  if (input.seo) {
    const seo = input.seo;
    blog.seo = {
      ...(blog.seo as any),
      ...seo,
      metaTitle: seo.metaTitle?.trim(),
      metaDescription: seo.metaDescription?.trim(),
      keywords: normaliseKeywords(seo.keywords),
      canonicalUrl: seo.canonicalUrl?.trim(),
      ogTitle: seo.ogTitle?.trim(),
      ogDescription: seo.ogDescription?.trim(),
      ogImage: typeof seo.ogImage !== 'undefined' ? normaliseImage(seo.ogImage) : (blog.seo as any)?.ogImage,
      twitterTitle: seo.twitterTitle?.trim(),
      twitterDescription: seo.twitterDescription?.trim(),
      twitterImage:
        typeof seo.twitterImage !== 'undefined'
          ? normaliseImage(seo.twitterImage)
          : (blog.seo as any)?.twitterImage,
    } as any;
  }

  if (typeof input.status !== 'undefined') {
    blog.status = input.status;
    blog.publishedAt = computePublishedAt(input.status, input.publishedAt) as any;
  } else if (typeof input.publishedAt !== 'undefined') {
    // allow adjusting publishedAt while published
    if (blog.status === 'published') {
      blog.publishedAt = computePublishedAt('published', input.publishedAt) as any;
    }
  }

  if (typeof input.meta !== 'undefined') blog.meta = input.meta as any;

  await blog.save();
  return blog.toObject();
};

export const deleteBlog = async (blogId: string) => {
  if (!mongoose.Types.ObjectId.isValid(blogId)) throw new ApiError(400, 'Invalid blog id');
  const blog = await Blog.findById(blogId).lean();
  if (!blog) throw new ApiError(404, 'Blog not found');
  await Blog.findByIdAndDelete(blogId);
  return { message: 'Blog deleted successfully' };
};

export const getBlogById = async (blogId: string) => {
  if (!mongoose.Types.ObjectId.isValid(blogId)) throw new ApiError(400, 'Invalid blog id');
  const blog = await Blog.findById(blogId).populate({ path: 'author', select: 'name email role' }).lean();
  if (!blog) throw new ApiError(404, 'Blog not found');
  return { ...blog, _id: blog._id.toString() } as any;
};

export const listBlogsAdmin = async ({
  search,
  status,
  page = 1,
  limit = 20,
}: {
  search?: string;
  status?: 'draft' | 'published' | 'all';
  page?: number;
  limit?: number;
} = {}) => {
  const q: mongoose.FilterQuery<typeof Blog> = {};

  if (status && status !== 'all') q.status = status;

  if (search && search.trim()) {
    const term = search.trim();
    const regex = new RegExp(term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
    q.$or = [{ title: regex }, { slug: regex }, { excerpt: regex }, { tags: regex }, { tagsText: regex }];
  }

  const limitValue = Math.min(Math.max(Number(limit) || 20, 1), 100);
  const pageValue = Math.min(Math.max(Number(page) || 1, 1), 5000);
  const skip = (pageValue - 1) * limitValue;

  const [items, total] = await Promise.all([
    Blog.find(q)
      .sort({ publishedAt: -1, createdAt: -1 })
      .skip(skip)
      .limit(limitValue)
      .select('-contentHtml') // list view: avoid huge payload
      .lean(),
    Blog.countDocuments(q),
  ]);

  return {
    items: items.map((b: any) => ({ ...b, _id: b._id.toString() })),
    page: pageValue,
    limit: limitValue,
    total,
    totalPages: Math.max(1, Math.ceil(total / limitValue)),
  };
};

export const listBlogsPublic = async ({
  search,
  tag,
  page = 1,
  limit = 12,
}: {
  search?: string;
  tag?: string;
  page?: number;
  limit?: number;
} = {}) => {
  const q: mongoose.FilterQuery<typeof Blog> = { status: 'published' };
  if (tag && tag.trim()) q.tags = new RegExp(`^${tag.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i');

  if (search && search.trim()) {
    const term = search.trim();
    // prefer text index when possible, fallback to regex
    q.$text = { $search: term };
  }

  const limitValue = Math.min(Math.max(Number(limit) || 12, 1), 50);
  const pageValue = Math.min(Math.max(Number(page) || 1, 1), 5000);
  const skip = (pageValue - 1) * limitValue;

  const [items, total] = await Promise.all([
    Blog.find(q)
      .sort(search ? { score: { $meta: 'textScore' } } : { publishedAt: -1, createdAt: -1 })
      .skip(skip)
      .limit(limitValue)
      .select('-contentHtml')
      .lean(),
    Blog.countDocuments(q),
  ]);

  return {
    items: items.map((b: any) => ({ ...b, _id: b._id.toString() })),
    page: pageValue,
    limit: limitValue,
    total,
    totalPages: Math.max(1, Math.ceil(total / limitValue)),
  };
};

export const getBlogBySlugPublic = async (slug: string, { trackView = true } = {}) => {
  if (!slug || !slug.trim()) throw new ApiError(400, 'Invalid blog slug');

  const blog = await Blog.findOne({ slug: slug.trim(), status: 'published' }).lean();
  if (!blog) throw new ApiError(404, 'Blog not found');

  if (trackView) {
    // best-effort (don’t block response)
    Blog.updateOne({ _id: blog._id }, { $inc: { views: 1 } }).catch(() => {});
  }

  return { ...blog, _id: blog._id.toString() } as any;
};

export const getBlogStatsAdmin = async () => {
  const [total, drafts, published] = await Promise.all([
    Blog.countDocuments({}),
    Blog.countDocuments({ status: 'draft' }),
    Blog.countDocuments({ status: 'published' }),
  ]);

  const topByViews = await Blog.find({ status: 'published' })
    .sort({ views: -1 })
    .limit(8)
    .select('title slug views publishedAt')
    .lean();

  return {
    total,
    drafts,
    published,
    topByViews: topByViews.map((b: any) => ({ ...b, _id: b._id.toString() })),
  };
};


