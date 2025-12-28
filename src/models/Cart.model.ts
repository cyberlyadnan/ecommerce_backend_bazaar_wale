// src/models/Cart.model.js
import mongoose from 'mongoose';

const CartItemSchema = new mongoose.Schema({
  productId: { type: mongoose.Schema.Types.ObjectId, ref: 'Product', required: true },
  title: { type: String, required: true },
  vendorId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  pricePerUnit: { type: Number, required: true },
  qty: { type: Number, required: true, min: 1 },
  minOrderQty: { type: Number, default: 1 },
  meta: { type: mongoose.Schema.Types.Mixed }
}, { _id: false });

const CartSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, unique: true },
  items: [CartItemSchema],
  updatedAt: { type: Date, default: Date.now }
}, { timestamps: true });

CartSchema.index({ userId: 1 });

export default mongoose.model('Cart', CartSchema);
