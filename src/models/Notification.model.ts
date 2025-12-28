// src/models/Notification.model.js
import mongoose from 'mongoose';

const NotificationSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', index: true },
  channel: { type: String, enum: ['email','sms','inapp'], default: 'inapp' },
  title: { type: String },
  body: { type: String },
  meta: { type: mongoose.Schema.Types.Mixed },
  read: { type: Boolean, default: false }
}, { timestamps: true });

export default mongoose.model('Notification', NotificationSchema);
