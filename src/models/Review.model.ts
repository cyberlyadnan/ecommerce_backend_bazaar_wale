import mongoose from 'mongoose';

const ReviewImageSchema = new mongoose.Schema({
  url: { type: String, required: true },
  alt: { type: String, default: 'Review image' },
}, { _id: false });

const ReviewSchema = new mongoose.Schema({
  product: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'Product', 
    required: true, 
    index: true 
  },
  user: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'User', 
    required: true, 
    index: true 
  },
  rating: { 
    type: Number, 
    required: true, 
    min: 1, 
    max: 5,
    index: true
  },
  title: { type: String, trim: true },
  comment: { type: String, trim: true },
  images: [ReviewImageSchema],
  isVerifiedPurchase: { type: Boolean, default: false },
  helpfulCount: { type: Number, default: 0 },
  isApproved: { type: Boolean, default: true }, // Admin can moderate if needed
  isDeleted: { type: Boolean, default: false },
}, { timestamps: true });

// Compound index to ensure one review per user per product
ReviewSchema.index({ product: 1, user: 1 }, { unique: true });

// Index for product reviews query
ReviewSchema.index({ product: 1, isApproved: 1, isDeleted: 1 });

// Index for user reviews query
ReviewSchema.index({ user: 1, isDeleted: 1 });

export default mongoose.model('Review', ReviewSchema);

