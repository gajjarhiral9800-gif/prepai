import mongoose from 'mongoose';

const subjectSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  category: { type: String, default: 'General' },
  description: { type: String, default: '' },
  topics: [{ type: String }],
  createdAt: { type: Date, default: Date.now }
});

export const Subject = mongoose.models.Subject || mongoose.model('Subject', subjectSchema);
