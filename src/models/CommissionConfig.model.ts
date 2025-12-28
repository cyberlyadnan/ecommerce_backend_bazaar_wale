import mongoose from 'mongoose';

const CommissionConfigSchema = new mongoose.Schema(
  {
    key: { type: String, required: true, unique: true, index: true, default: 'default' },
    commissionPercent: { type: Number, default: 5, min: 0, max: 100 },
    updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true },
);

export default mongoose.model('CommissionConfig', CommissionConfigSchema);


