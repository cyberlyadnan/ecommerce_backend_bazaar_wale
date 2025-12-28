import mongoose from 'mongoose';

const BlogImageSchema = new mongoose.Schema(
  {
    url: { type: String, required: true },
    alt: { type: String },
  },
  { _id: false },
);

const BlogSeoSchema = new mongoose.Schema(
  {
    metaTitle: { type: String },
    metaDescription: { type: String },
    keywords: { type: [String], default: [] },
    canonicalUrl: { type: String },

    ogTitle: { type: String },
    ogDescription: { type: String },
    ogImage: BlogImageSchema,

    twitterTitle: { type: String },
    twitterDescription: { type: String },
    twitterImage: BlogImageSchema,

    robotsIndex: { type: Boolean, default: true },
    robotsFollow: { type: Boolean, default: true },
  },
  { _id: false },
);

const BlogSchema = new mongoose.Schema(
  {
    title: { type: String, required: true, index: true },
    slug: { type: String, required: true, unique: true, index: true },
    excerpt: { type: String },

    // HTML content (from rich text editor)
    contentHtml: { type: String, required: true },

    featuredImage: BlogImageSchema,

    tags: { type: [String], default: [] },
    tagsText: { type: String, default: '' },

    // publish controls
    status: { type: String, enum: ['draft', 'published'], default: 'draft', index: true },
    publishedAt: { type: Date, index: true },

    // author/admin who created it
    author: { type: mongoose.Schema.Types.ObjectId, ref: 'User', index: true },

    seo: BlogSeoSchema,

    // stats
    views: { type: Number, default: 0 },

    // optional future-proof bucket
    meta: { type: mongoose.Schema.Types.Mixed },
  },
  { timestamps: true },
);

// Mirror tags into a text-searchable string
BlogSchema.pre('save', function setTagsText(next) {
  const anyThis = this as any;
  if (Array.isArray(anyThis.tags) && anyThis.tags.length > 0) {
    anyThis.tagsText = anyThis.tags.map((t: string) => String(t).trim()).filter(Boolean).join(' ');
  } else {
    anyThis.tagsText = '';
  }
  next();
});

BlogSchema.pre('findOneAndUpdate', function setTagsText(next) {
  const updateRaw = this.getUpdate();
  const update: Record<string, unknown> | undefined = updateRaw && typeof updateRaw === 'object' && !Array.isArray(updateRaw) ? updateRaw as Record<string, unknown> : undefined;
  if (update) {
    const tags =
      (update.tags as string[] | undefined) ??
      ((update.$set as Record<string, unknown> | undefined)?.tags as string[] | undefined);
    if (Array.isArray(tags)) {
      const tagsText = tags.map((t) => String(t).trim()).filter(Boolean).join(' ');
      if (!update.$set) update.$set = {};
      (update.$set as Record<string, unknown>).tagsText = tagsText;
      this.setUpdate(update);
    }
  }
  next();
});

// Indexes for search + publishing
BlogSchema.index({
  title: 'text',
  excerpt: 'text',
  contentHtml: 'text',
  tagsText: 'text',
  'seo.metaTitle': 'text',
  'seo.metaDescription': 'text',
});
BlogSchema.index({ status: 1, publishedAt: -1, createdAt: -1 });

export default mongoose.model('Blog', BlogSchema);


