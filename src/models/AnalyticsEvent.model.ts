import mongoose from 'mongoose';

export type AnalyticsEventType = 'page_view' | 'product_view' | 'session_start';

const AnalyticsEventSchema = new mongoose.Schema(
  {
    type: { type: String, required: true, enum: ['page_view', 'product_view', 'session_start'], index: true },
    visitorId: { type: String, index: true },
    sessionId: { type: String, index: true },
    productId: { type: mongoose.Schema.Types.ObjectId, ref: 'Product', index: true },
    path: { type: String, default: '/', index: true },
    referrer: { type: String, default: '' },
    title: { type: String },
    userAgent: { type: String },
    metadata: { type: mongoose.Schema.Types.Mixed },
  },
  { timestamps: true }
);

AnalyticsEventSchema.index({ createdAt: -1 });
AnalyticsEventSchema.index({ type: 1, createdAt: -1 });
AnalyticsEventSchema.index({ visitorId: 1, createdAt: -1 });
AnalyticsEventSchema.index({ productId: 1, createdAt: -1 });
AnalyticsEventSchema.index({ path: 1, createdAt: -1 });

export default mongoose.model('AnalyticsEvent', AnalyticsEventSchema);
