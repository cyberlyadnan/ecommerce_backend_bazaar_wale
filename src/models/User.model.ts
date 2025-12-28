import {
  HydratedDocument,
  Model,
  Schema,
  Types,
  model,
} from 'mongoose';

export type UserRole = 'customer' | 'vendor' | 'admin';
export type VendorStatus = 'pending' | 'active' | 'rejected' | 'suspended';

export interface Address {
  label?: string;
  name: string;
  phone: string;
  email?: string;
  line1: string;
  line2?: string;
  city: string;
  state: string;
  country?: string;
  postalCode: string;
  isDefault?: boolean;
}

export interface IUser {
  role: UserRole;
  name: string;
  email?: string;
  phone?: string;
  passwordHash?: string;
  isPhoneVerified: boolean;
  isEmailVerified: boolean;
  businessName?: string;
  gstNumber?: string;
  aadharNumber?: string;
  panNumber?: string;
  businessAddress?: Address;
  vendorStatus?: VendorStatus;
  addresses: Address[];
  meta?: Record<string, unknown>;
  lastLoginAt?: Date;
  isDeleted: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export type UserDocument = HydratedDocument<IUser>;

const AddressSchema = new Schema<Address>(
  {
    label: { type: String },
    name: { type: String, required: true },
    phone: { type: String, required: true },
    email: { type: String },
    line1: { type: String, required: true },
    line2: { type: String },
    city: { type: String, required: true },
    state: { type: String, required: true },
    country: { type: String, default: 'India' },
    postalCode: { type: String, required: true },
    isDefault: { type: Boolean, default: false },
  },
  { _id: false },
);

const UserSchema = new Schema<IUser, UserModel>(
  {
    role: { type: String, enum: ['customer', 'vendor', 'admin'], required: true, index: true },
    name: { type: String, required: true },
    email: { type: String },
    phone: { type: String },
    passwordHash: { type: String },
    isPhoneVerified: { type: Boolean, default: false },
    isEmailVerified: { type: Boolean, default: false },
    businessName: { type: String, index: true },
    gstNumber: { type: String },
    aadharNumber: { type: String },
    panNumber: { type: String },
    businessAddress: { type: AddressSchema },
    vendorStatus: {
      type: String,
      enum: ['pending', 'active', 'rejected', 'suspended'],
      default: 'pending',
      index: true,
    },
    addresses: { type: [AddressSchema], default: [] },
    meta: { type: Schema.Types.Mixed },
    lastLoginAt: { type: Date },
    isDeleted: { type: Boolean, default: false },
  },
  { timestamps: true },
);

UserSchema.index({ email: 1 }, { sparse: true });
UserSchema.index({ phone: 1 }, { sparse: true });

export interface UserModel extends Model<IUser> {
  softDelete(id: Types.ObjectId): Promise<void>;
}

UserSchema.statics.softDelete = async function softDelete(id: Types.ObjectId) {
  await this.updateOne({ _id: id }, { $set: { isDeleted: true } });
};

const User: UserModel = model<IUser, UserModel>('User', UserSchema);

export default User;
