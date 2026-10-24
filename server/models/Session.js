import mongoose from 'mongoose';

const sessionSchema = new mongoose.Schema({
  userId: { type: String, required: true, index: true },
  type: { type: String, required: true }, // 'interview', 'quiz', 'resume', 'star'
  title: { type: String, required: true },
  score: { type: Number, default: 0 },
  data: { type: mongoose.Schema.Types.Mixed, default: {} },
  timestamp: { type: Date, default: Date.now }
});

export const Session = mongoose.models.Session || mongoose.model('Session', sessionSchema);
