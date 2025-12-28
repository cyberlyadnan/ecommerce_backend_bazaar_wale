import {
  Document,
  Model,
  Schema,
  Types,
  model,
} from 'mongoose';

export type VendorVerificationStatus = 'pending' | 'approved' | 'rejected';

export interface VendorDocument {
  type?: string;
  url?: string;
  fileName?: string;
}

export interface IVendorVerification extends Document {
  userId: Types.ObjectId;
  submittedAt: Date;
  documents: VendorDocument[];
  businessName?: string;
  gstNumber?: string;
  aadharNumber?: string;
  panNumber?: string;
  status: VendorVerificationStatus;
  adminNotes?: string;
  reviewedBy?: Types.ObjectId;
  reviewedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const VendorVerificationSchema = new Schema<IVendorVerification>(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    submittedAt: { type: Date, default: Date.now },
    documents: [
      {
        type: {
          type: String,
        },
        url: { type: String },
        fileName: { type: String },
      },
    ],
    businessName: { type: String },
    gstNumber: { type: String },
    aadharNumber: { type: String },
    panNumber: { type: String },
    status: {
      type: String,
      enum: ['pending', 'approved', 'rejected'],
      default: 'pending',
      index: true,
    },
    adminNotes: { type: String },
    reviewedBy: { type: Schema.Types.ObjectId, ref: 'User' },
    reviewedAt: { type: Date },
  },
  { timestamps: true },
);

const VendorVerification: Model<IVendorVerification> = model<IVendorVerification>(
  'VendorVerification',
  VendorVerificationSchema,
);

export default VendorVerification;
