import { ApiError } from '../utils/apiError';
import Subscriber, { ISubscriber } from '../models/Subscriber.model';

export async function subscribeEmail(data: {
  email: string;
  metadata?: { ipAddress?: string; userAgent?: string; source?: string };
}): Promise<ISubscriber> {
  const email = data.email.trim().toLowerCase();
  if (!email) {
    throw new ApiError(400, 'Email is required');
  }

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    throw new ApiError(400, 'Invalid email address');
  }

  const existing = await Subscriber.findOne({ email });
  if (existing) {
    if (existing.status === 'unsubscribed') {
      existing.status = 'active';
      existing.metadata = { ...existing.metadata, ...data.metadata };
      await existing.save();
      return existing;
    }
    return existing;
  }

  const subscriber = await Subscriber.create({
    email,
    status: 'active',
    metadata: data.metadata,
  });
  return subscriber;
}

export async function listSubscribers(params: {
  status?: 'active' | 'unsubscribed';
  limit?: number;
  skip?: number;
}) {
  const { status, limit = 50, skip = 0 } = params;
  const query = status ? { status } : {};

  const [subscribers, total] = await Promise.all([
    Subscriber.find(query).sort({ createdAt: -1 }).skip(skip).limit(limit).lean(),
    Subscriber.countDocuments(query),
  ]);

  return { subscribers, total };
}
