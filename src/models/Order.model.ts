// src/models/Order.model.js
import mongoose from 'mongoose';

const OrderItemSchema = new mongoose.Schema({
  productId: { type: mongoose.Schema.Types.ObjectId, ref: 'Product', required: true },
  title: { type: String, required: true },
  sku: { type: String },
  vendorId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  vendorSnapshot: { // denormalized vendor info for quick reference (no PII beyond vendor summary)
    vendorName: String,
    vendorPhone: String
  },
  qty: { type: Number, required: true },
  pricePerUnit: { type: Number, required: true },
  totalPrice: { type: Number, required: true },
  // Tax information per item
  taxCode: { type: String },
  taxPercentage: { type: Number, default: 18 },
  taxAmount: { type: Number, default: 0 } // Calculated tax for this item
}, { _id: false });

const ShippingAddressSchema = new mongoose.Schema({
  name: String, phone: String, line1: String, line2: String, city: String, state: String, country: String, postalCode: String
}, { _id: false });

const OrderSchema = new mongoose.Schema({
  orderNumber: { type: String, required: true, unique: true, index: true }, // e.g. ORD-20251109-0001
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  items: [OrderItemSchema],
  subtotal: { type: Number, required: true },
  shippingCost: { type: Number, default: 0 },
  tax: { type: Number, default: 0 },
  total: { type: Number, required: true },
  paymentStatus: { type: String, enum: ['pending','paid','failed','refunded'], default: 'pending', index: true },
  paymentMethod: { type: String, enum: ['razorpay','cod','other'], default: 'razorpay' },
  razorpayOrderId: { type: String }, // store gateway identifiers
  razorpayPaymentId: { type: String },
  status: { type: String, enum: ['created','vendor_shipped_to_warehouse','received_in_warehouse','packed','shipped','delivered','cancelled'], default: 'created', index: true },
  shippingAddress: ShippingAddressSchema,
  expectedDeliveryDate: { type: Date },
  shippedDate: { type: Date }, // Date when order was shipped to customer
  placedAt: { type: Date, default: Date.now },
  adminNotes: { type: String },
  isDeleted: { type: Boolean, default: false }
}, { timestamps: true });

OrderSchema.index({ userId: 1, orderNumber: 1, status: 1 });

export default mongoose.model('Order', OrderSchema);
