import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';
import authRoutes from './routes/auth.js';
import userRoutes from './routes/user.js';
import aiRoutes from './routes/ai.js';
import adminRoutes from './routes/admin.js';
import { db } from './db.js';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json());

// Serve uploaded study materials with proper PDF headers for in-browser studying
const UPLOADS_DIR = path.join(__dirname, 'public', 'uploads');
if (!fs.existsSync(UPLOADS_DIR)) {
  fs.mkdirSync(UPLOADS_DIR, { recursive: true });
}

app.use('/uploads', express.static(UPLOADS_DIR, {
  setHeaders: (res, filePath) => {
    if (filePath.endsWith('.pdf')) {
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', 'inline');
    }
  }
}));

// Direct Resource Download Endpoint (supports forced attachment download with clean file name)
app.get('/api/resources/:id/download', async (req, res) => {
  try {
    const { id } = req.params;
    const resource = await db.getResourceById(id);
    if (!resource) {
      return res.status(404).json({ error: 'Study resource not found' });
    }
    const filename = path.basename(resource.fileUrl);
    const filePath = path.join(UPLOADS_DIR, filename);
    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ error: 'Study material file not found on server' });
    }
    const downloadName = resource.fileName || `${(resource.title || 'study-guide').replace(/[^a-zA-Z0-9_-]/g, '_')}.pdf`;
    res.download(filePath, downloadName);
  } catch (err) {
    console.error('Resource download error:', err);
    res.status(500).json({ error: 'Failed to download study material' });
  }
});

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/user', userRoutes);
app.use('/api/ai', aiRoutes);
app.use('/api/admin', adminRoutes);

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', app: 'PrepAI Backend Server', time: new Date().toISOString() });
});

// API 404 Handler (Always returns JSON, preventing HTML responses)
app.use((req, res, next) => {
  if (req.originalUrl.startsWith('/api')) {
    return res.status(404).json({ error: `API route not found: ${req.method} ${req.originalUrl}` });
  }
  next();
});

// Global Error Handler (Always returns JSON)
app.use((err, req, res, next) => {
  console.error('Unhandled backend error:', err);
  res.status(err.status || 500).json({ error: err.message || 'Internal server error occurred' });
});

// Start Server
app.listen(PORT, () => {
  console.log(`🚀 PrepAI Backend Server listening on port http://localhost:${PORT}`);
});
