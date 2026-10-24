
import express from 'express';
import cors from 'cors';
import 'dotenv/config';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

import authRoutes from './routes/auth.js';
import userRoutes from './routes/user.js';
import aiRoutes from './routes/ai.js';
import adminRoutes from './routes/admin.js';
import { db, dbReady } from './db.js';



const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json());

// Serve uploaded study materials
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

// Resource download endpoint
app.get('/api/resources/:id/download', async (req, res) => {
  try {
    const { id } = req.params;
    const resource = await db.getResourceById(id);

    if (!resource) {
      return res.status(404).json({
        error: 'Study resource not found'
      });
    }

    const filename = path.basename(resource.fileUrl);
    const filePath = path.join(UPLOADS_DIR, filename);

    if (!fs.existsSync(filePath)) {
      return res.status(404).json({
        error: 'Study material file not found on server'
      });
    }

    const downloadName =
      resource.fileName ||
      `${(resource.title || 'study-guide').replace(/[^a-zA-Z0-9_-]/g, '_')}.pdf`;

    res.download(filePath, downloadName);
  } catch (err) {
    console.error('Resource download error:', err.message);

    res.status(500).json({
      error: 'Failed to download study material'
    });
  }
});

// API routes
app.use('/api/auth', authRoutes);
app.use('/api/user', userRoutes);
app.use('/api/ai', aiRoutes);
app.use('/api/admin', adminRoutes);

// Health check
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    app: 'PrepAI Backend Server',
    time: new Date().toISOString()
  });
});

// API 404 handler
app.use((req, res, next) => {
  if (req.originalUrl.startsWith('/api')) {
    return res.status(404).json({
      error: `API route not found: ${req.method} ${req.originalUrl}`
    });
  }

  next();
});

// Global error handler
app.use((err, req, res, next) => {
  console.error('Unhandled backend error:', err.message);

  if (res.headersSent) {
    return next(err);
  }

  res.status(err.status || 500).json({
    error: err.message || 'Internal server error occurred'
  });
});

// Start server on Render's assigned port
dbReady
  .then(() => {
    app.listen(PORT, '0.0.0.0', () => {
      console.log(`PrepAI backend listening on port ${PORT}`);
    });
  })
  .catch((err) => {
    console.error('Database initialization failed:', err.message);
    process.exit(1);
  });
