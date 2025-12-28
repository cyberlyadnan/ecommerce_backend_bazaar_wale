import {
  Document,
  Model,
  Schema,
  Types,
  model,
} from 'mongoose';

import { UserRole } from './User.model';

export interface ISession extends Document {
  user: Types.ObjectId;
  role: UserRole;
  refreshTokenHash: string;
  userAgent?: string;
  ipAddress?: string;
  expiresAt: Date;
  createdAt: Date;
  updatedAt: Date;
}

const SessionSchema = new Schema<ISession>(
  {
    user: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    role: { type: String, enum: ['customer', 'vendor', 'admin'], required: true },
    refreshTokenHash: { type: String, required: true },
    userAgent: { type: String },
    ipAddress: { type: String },
    expiresAt: { type: Date, required: true, index: true },
  },
  { timestamps: true },
);

SessionSchema.index({ user: 1, refreshTokenHash: 1 });

const Session: Model<ISession> = model<ISession>('Session', SessionSchema);

export default Session;

