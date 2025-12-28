import mongoose from 'mongoose';

const ShippingConfigSchema = new mongoose.Schema(
  {
    key: { type: String, required: true, unique: true, index: true, default: 'default' },
    isEnabled: { type: Boolean, default: true },
    flatRate: { type: Number, default: 100, min: 0 },
    freeShippingThreshold: { type: Number, default: 5000, min: 0 },
    updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true },
);

export default mongoose.model('ShippingConfig', ShippingConfigSchema);


