import mongoose, { Schema } from 'mongoose';

export interface ISubscriber {
  email: string;
  status: 'active' | 'unsubscribed';
  metadata?: {
    ipAddress?: string;
    userAgent?: string;
    source?: string;
  };
}

const SubscriberSchema = new Schema<ISubscriber>(
  {
    email: {
      type: String,
      required: true,
      trim: true,
      lowercase: true,
      unique: true,
      index: true,
    },
    status: {
      type: String,
      enum: ['active', 'unsubscribed'],
      default: 'active',
      index: true,
    },
    metadata: {
      ipAddress: { type: String },
      userAgent: { type: String },
      source: { type: String },
    },
  },
  { timestamps: true },
);

SubscriberSchema.index({ email: 1 });
SubscriberSchema.index({ status: 1, createdAt: -1 });

export default mongoose.model<ISubscriber>('Subscriber', SubscriberSchema);
