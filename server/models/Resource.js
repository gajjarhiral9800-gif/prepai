import mongoose from 'mongoose';

const resourceSchema = new mongoose.Schema({
  title: { type: String, required: true, trim: true },
  description: { type: String, default: '' },
  subject: { type: String, default: 'General' },
  fileUrl: { type: String, required: true },
  fileName: { type: String, required: true },
  uploadedBy: { type: String, default: 'Admin' },
  uploadedAt: { type: Date, default: Date.now }
});

export const Resource = mongoose.models.Resource || mongoose.model('Resource', resourceSchema);
