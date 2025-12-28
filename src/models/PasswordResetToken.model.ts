import {
  Document,
  Model,
  Schema,
  Types,
  model,
} from 'mongoose';

export interface IPasswordResetToken extends Document {
  user: Types.ObjectId;
  tokenHash: string;
  expiresAt: Date;
  usedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const PasswordResetTokenSchema = new Schema<IPasswordResetToken>(
  {
    user: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    tokenHash: { type: String, required: true },
    expiresAt: { type: Date, required: true, index: true },
    usedAt: { type: Date },
  },
  { timestamps: true },
);

PasswordResetTokenSchema.index({ user: 1, tokenHash: 1 });

const PasswordResetToken: Model<IPasswordResetToken> = model<IPasswordResetToken>(
  'PasswordResetToken',
  PasswordResetTokenSchema,
);

export default PasswordResetToken;

