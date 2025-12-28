// src/models/Category.model.js
import mongoose from 'mongoose';

const CategorySchema = new mongoose.Schema({
  name: { type: String, required: true, unique: true },
  slug: { type: String, required: true, unique: true },
  parent: { type: mongoose.Schema.Types.ObjectId, ref: 'Category', default: null }, // for subcategories
  description: { type: String },
  image: { type: String }, // URL to category image
  isActive: { type: Boolean, default: true }
}, { timestamps: true });

export default mongoose.model('Category', CategorySchema);
