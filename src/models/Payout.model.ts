// src/models/Payout.model.js
import mongoose from 'mongoose';

const PayoutSchema = new mongoose.Schema({
  vendorId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  // payout amounts
  grossAmount: { type: Number, default: 0, min: 0 }, // before commission
  commissionPercent: { type: Number, default: 0, min: 0, max: 100 },
  commissionAmount: { type: Number, default: 0, min: 0 },
  netAmount: { type: Number, default: 0, min: 0 }, // after commission (vendor payout)
  amount: { type: Number, required: true }, // legacy alias for netAmount
  currency: { type: String, default: 'INR' },
  ordersIncluded: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Order' }],
  status: { type: String, enum: ['pending','processing','paid','rejected'], default: 'pending', index: true },
  scheduledAt: { type: Date }, // when admin scheduled payout
  paidAt: { type: Date },
  adminNotes: { type: String },
  paymentReference: { type: String }, // bank reference / remarks
  paymentMode: { type: String, enum: ['bank','upi','cash','other'], default: 'bank' },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
}, { timestamps: true });

export default mongoose.model('Payout', PayoutSchema);
