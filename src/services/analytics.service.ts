import mongoose from 'mongoose';
import AnalyticsEvent from '../models/AnalyticsEvent.model';
import Product from '../models/Product.model';
import Order from '../models/Order.model';

export type AnalyticsEventInput = {
  type: 'page_view' | 'product_view' | 'session_start';
  visitorId?: string;
  sessionId?: string;
  productId?: string;
  path?: string;
  referrer?: string;
  title?: string;
  userAgent?: string;
  metadata?: Record<string, unknown>;
};

export async function recordAnalyticsEvent(input: AnalyticsEventInput): Promise<void> {
  const doc: Record<string, unknown> = {
    type: input.type,
    path: input.path ?? '/',
    referrer: input.referrer ?? '',
    title: input.title,
    userAgent: input.userAgent,
    metadata: input.metadata,
  };
  if (input.visitorId) doc.visitorId = input.visitorId;
  if (input.sessionId) doc.sessionId = input.sessionId;
  if (input.productId && mongoose.Types.ObjectId.isValid(input.productId)) {
    doc.productId = new mongoose.Types.ObjectId(input.productId);
  }
  await AnalyticsEvent.create(doc);

  if (input.type === 'product_view' && input.productId && mongoose.Types.ObjectId.isValid(input.productId)) {
    await Product.findByIdAndUpdate(input.productId, { $inc: { viewCount: 1 } });
  }
}

function startOfDay(d: Date): Date {
  const x = new Date(d);
  x.setUTCHours(0, 0, 0, 0);
  return x;
}

function daysAgo(n: number): Date {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return startOfDay(d);
}

export interface AnalyticsOverview {
  totalPageViews: number;
  uniqueVisitors: number;
  returningVisitors: number;
  totalProductViews: number;
  periodDays: number;
  from: string;
  to: string;
}

export async function getAnalyticsOverview(periodDays: number = 30): Promise<AnalyticsOverview> {
  const from = daysAgo(periodDays);
  const to = new Date();

  const [totalPageViews, uniqueVisitors, totalProductViews, visitorDays] = await Promise.all([
    AnalyticsEvent.countDocuments({ type: 'page_view', createdAt: { $gte: from, $lte: to } }),
    AnalyticsEvent.distinct('visitorId', { type: { $in: ['page_view', 'product_view', 'session_start'] }, createdAt: { $gte: from, $lte: to }, visitorId: { $exists: true, $nin: [null, ''] } }),
    AnalyticsEvent.countDocuments({ type: 'product_view', createdAt: { $gte: from, $lte: to } }),
    AnalyticsEvent.aggregate([
      { $match: { type: { $in: ['page_view', 'product_view'] }, createdAt: { $gte: from, $lte: to }, visitorId: { $exists: true, $nin: [null, ''] } } },
      { $group: { _id: { visitorId: '$visitorId', day: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } } } } },
      { $group: { _id: '$_id.visitorId', days: { $sum: 1 } } },
      { $match: { days: { $gt: 1 } } },
      { $count: 'count' },
    ]),
  ]);

  const uniqueVisitorCount = uniqueVisitors.length;
  const returningCount = visitorDays[0]?.count ?? 0;

  return {
    totalPageViews,
    uniqueVisitors: uniqueVisitorCount,
    returningVisitors: returningCount,
    totalProductViews,
    periodDays,
    from: from.toISOString(),
    to: to.toISOString(),
  };
}

export interface TopProductView {
  productId: string;
  title: string;
  slug: string;
  viewCount: number;
  totalSold?: number;
}

export async function getTopViewedProducts(limit: number = 20, periodDays?: number): Promise<TopProductView[]> {
  const match: mongoose.FilterQuery<unknown> = { type: 'product_view' };
  if (periodDays != null && periodDays > 0) {
    match.createdAt = { $gte: daysAgo(periodDays) };
  }
  const aggregated = await AnalyticsEvent.aggregate([
    { $match: match },
    { $group: { _id: '$productId', viewCount: { $sum: 1 } } },
    { $sort: { viewCount: -1 } },
    { $limit: limit },
    { $lookup: { from: 'products', localField: '_id', foreignField: '_id', as: 'product' } },
    { $unwind: { path: '$product', preserveNullAndEmptyArrays: true } },
    {
      $project: {
        productId: '$_id',
        title: '$product.title',
        slug: '$product.slug',
        viewCount: 1,
        totalSold: '$product.totalSold',
      },
    },
  ]);

  return aggregated.map((r) => ({
    productId: r.productId?.toString() ?? '',
    title: r.title ?? 'Unknown product',
    slug: r.slug ?? '',
    viewCount: r.viewCount ?? 0,
    totalSold: r.totalSold,
  }));
}

export interface ProductViewCountRow {
  productId: string;
  title: string;
  slug: string;
  viewCount: number;
}

export async function getProductViewCounts(limit: number = 50): Promise<ProductViewCountRow[]> {
  const products = await Product.find({})
    .select('_id title slug viewCount')
    .sort({ viewCount: -1 })
    .limit(limit)
    .lean();
  return products.map((p) => ({
    productId: p._id.toString(),
    title: p.title,
    slug: p.slug ?? '',
    viewCount: p.viewCount ?? 0,
  }));
}

export interface VisitsByDay {
  date: string;
  pageViews: number;
  productViews: number;
  uniqueVisitors: number;
}

export async function getVisitsOverTime(days: number = 30): Promise<VisitsByDay[]> {
  const from = daysAgo(days);
  const pipeline = [
    {
      $match: {
        type: { $in: ['page_view', 'product_view'] },
        createdAt: { $gte: from },
      },
    },
    {
      $group: {
        _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
        pageViews: { $sum: { $cond: [{ $eq: ['$type', 'page_view'] }, 1, 0] } },
        productViews: { $sum: { $cond: [{ $eq: ['$type', 'product_view'] }, 1, 0] } },
        visitors: { $addToSet: '$visitorId' },
      },
    },
    { $sort: { _id: 1 as const } },
    {
      $project: {
        date: '$_id',
        pageViews: 1,
        productViews: 1,
        uniqueVisitors: { $size: { $filter: { input: '$visitors', as: 'v', cond: { $and: [{ $ne: ['$$v', null] }, { $ne: ['$$v', ''] }] } } } },
      },
    },
  ];
  const result = await AnalyticsEvent.aggregate(pipeline);
  return result.map((r) => ({
    date: r.date,
    pageViews: r.pageViews ?? 0,
    productViews: r.productViews ?? 0,
    uniqueVisitors: r.uniqueVisitors ?? 0,
  }));
}

export interface TopPageRow {
  path: string;
  title?: string;
  views: number;
}

export async function getTopPages(limit: number = 15, periodDays: number = 30): Promise<TopPageRow[]> {
  const from = daysAgo(periodDays);
  const result = await AnalyticsEvent.aggregate([
    { $match: { type: 'page_view', createdAt: { $gte: from } } },
    { $group: { _id: '$path', views: { $sum: 1 }, title: { $first: '$title' } } },
    { $sort: { views: -1 } },
    { $limit: limit },
    { $project: { path: '$_id', title: 1, views: 1, _id: 0 } },
  ]);
  return result;
}

export interface SalesInsight {
  productId: string;
  title: string;
  slug: string;
  viewCount: number;
  totalSold: number;
  conversionRate: number;
}

export async function getSalesInsights(limit: number = 20): Promise<SalesInsight[]> {
  const products = await Product.find({ viewCount: { $gt: 0 } })
    .select('_id title slug viewCount totalSold')
    .sort({ viewCount: -1 })
    .limit(limit)
    .lean();
  return products.map((p) => {
    const views = p.viewCount ?? 0;
    const sold = p.totalSold ?? 0;
    const conversionRate = views > 0 ? Math.round((sold / views) * 10000) / 100 : 0;
    return {
      productId: p._id.toString(),
      title: p.title,
      slug: p.slug ?? '',
      viewCount: views,
      totalSold: sold,
      conversionRate,
    };
  });
}

export interface RevenueByDay {
  date: string;
  orderCount: number;
  revenue: number;
}

export async function getRevenueOverTime(days: number = 30): Promise<RevenueByDay[]> {
  const from = daysAgo(days);
  const result = await Order.aggregate([
    { $match: { isDeleted: false, paymentStatus: 'paid', status: { $ne: 'cancelled' }, placedAt: { $gte: from } } },
    { $group: { _id: { $dateToString: { format: '%Y-%m-%d', date: '$placedAt' } }, orderCount: { $sum: 1 }, revenue: { $sum: '$total' } } },
    { $sort: { _id: 1 } },
    { $project: { date: '$_id', orderCount: 1, revenue: 1, _id: 0 } },
  ]);
  return result;
}
