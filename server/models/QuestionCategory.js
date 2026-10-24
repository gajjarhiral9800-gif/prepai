import mongoose from 'mongoose';

const questionCategorySchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  description: { type: String, default: '' },
  targetRole: { type: String, default: 'General' },
  type: { type: String, enum: ['interview', 'quiz', 'all'], default: 'all' },
  createdAt: { type: Date, default: Date.now }
});

export const QuestionCategory = mongoose.models.QuestionCategory || mongoose.model('QuestionCategory', questionCategorySchema);
