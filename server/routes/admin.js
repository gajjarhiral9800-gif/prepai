import express from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { authMiddleware } from '../middleware/auth.js';
import { adminMiddleware } from '../middleware/admin.js';
import { db } from '../db.js';

const router = express.Router();
router.use(authMiddleware);
router.use(adminMiddleware);

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const UPLOADS_DIR = path.join(__dirname, '..', 'public', 'uploads');

if (!fs.existsSync(UPLOADS_DIR)) {
  fs.mkdirSync(UPLOADS_DIR, { recursive: true });
}

// Multer storage for student resources
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, UPLOADS_DIR),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    cb(null, 'res_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6) + ext);
  }
});
const uploadResource = multer({ storage });

// 1. GET /api/admin/analytics
router.get('/analytics', async (req, res) => {
  try {
    const analytics = await db.getAdminAnalytics();
    res.json(analytics);
  } catch (err) {
    console.error('Admin analytics error:', err);
    res.status(500).json({ error: 'Failed to fetch platform analytics' });
  }
});

// 2. User Directory Management
router.get('/users', async (req, res) => {
  try {
    const users = await db.getAllUsersWithMetrics();
    res.json({ users });
  } catch (err) {
    console.error('Fetch admin users error:', err);
    res.status(500).json({ error: 'Failed to fetch users directory' });
  }
});

router.delete('/users/:id', async (req, res) => {
  try {
    const { id } = req.params;
    await db.deleteUser(id);
    res.json({ message: 'User account deleted successfully' });
  } catch (err) {
    console.error('Delete user error:', err);
    res.status(500).json({ error: 'Failed to delete user' });
  }
});

// GET /api/admin/users/:id/progress (Admin inspection of student detailed progress)
router.get('/users/:id/progress', async (req, res) => {
  try {
    const { id } = req.params;
    const user = await db.findUserById(id);
    if (!user) {
      return res.status(404).json({ error: 'Student account not found' });
    }

    const sessions = await db.getUserSessions(id);
    
    // Categorize sessions
    const quizzes = sessions.filter(s => s.type === 'quiz');
    const interviews = sessions.filter(s => s.type === 'interview');
    const resumes = sessions.filter(s => s.type === 'resume');
    const stars = sessions.filter(s => s.type === 'star');

    const quizScores = quizzes.map(q => q.score).filter(s => typeof s === 'number');
    const interviewScores = interviews.map(i => i.score).filter(s => typeof s === 'number');
    const resumeScores = resumes.map(r => r.score).filter(s => typeof s === 'number');
    const allExamScores = [...quizScores, ...interviewScores];

    const avgQuizScore = quizScores.length 
      ? Math.round(quizScores.reduce((a, b) => a + b, 0) / quizScores.length) 
      : 0;
    const highestQuizScore = quizScores.length ? Math.max(...quizScores) : 0;

    const avgInterviewScore = interviewScores.length 
      ? Math.round(interviewScores.reduce((a, b) => a + b, 0) / interviewScores.length) 
      : 0;
    const highestInterviewScore = interviewScores.length ? Math.max(...interviewScores) : 0;

    const avgResumeScore = resumeScores.length 
      ? Math.round(resumeScores.reduce((a, b) => a + b, 0) / resumeScores.length) 
      : 0;

    const overallScore = allExamScores.length 
      ? Math.round(allExamScores.reduce((a, b) => a + b, 0) / allExamScores.length)
      : (avgResumeScore || 0);

    // Placement Readiness Assessment
    let readinessTier = 'Needs Practice';
    let readinessBadge = 'developing';
    if (overallScore >= 85) {
      readinessTier = 'Tier-1 Placement Ready 🚀';
      readinessBadge = 'elite';
    } else if (overallScore >= 70) {
      readinessTier = 'Placement Proficient ⭐';
      readinessBadge = 'proficient';
    } else if (overallScore >= 50) {
      readinessTier = 'Developing Competency 📈';
      readinessBadge = 'developing';
    } else {
      readinessTier = 'Early Stage Preparation 📚';
      readinessBadge = 'early';
    }

    // Chronological Score Timeline for trajectory chart
    const timeline = sessions
      .filter(s => typeof s.score === 'number' && s.score > 0)
      .map(s => ({
        id: s.id,
        title: s.title,
        type: s.type,
        score: s.score,
        date: s.timestamp ? new Date(s.timestamp).toLocaleDateString() : 'N/A',
        timestamp: s.timestamp
      }));

    // Strengths & Weaknesses analysis from actual evaluations
    const strengths = [];
    const improvements = [];
    interviews.forEach(inv => {
      if (inv.data?.evaluations) {
        Object.values(inv.data.evaluations).forEach(ev => {
          if (Array.isArray(ev.strengths)) strengths.push(...ev.strengths);
          if (Array.isArray(ev.improvements)) improvements.push(...ev.improvements);
        });
      }
    });

    res.json({
      student: {
        id: user.id || (user._id ? user._id.toString() : ''),
        name: user.name,
        email: user.email,
        role: user.role,
        createdAt: user.createdAt
      },
      summary: {
        totalSessions: sessions.length,
        totalQuizzes: quizzes.length,
        avgQuizScore,
        highestQuizScore,
        totalInterviews: interviews.length,
        avgInterviewScore,
        highestInterviewScore,
        totalResumes: resumes.length,
        avgResumeScore,
        totalStars: stars.length,
        overallScore,
        readinessTier,
        readinessBadge
      },
      timeline,
      insights: {
        keyStrengths: strengths.slice(0, 5),
        areasForImprovement: improvements.slice(0, 5)
      },
      sessions: [...sessions].reverse() // Newest first
    });
  } catch (err) {
    console.error('Fetch student progress error:', err);
    res.status(500).json({ error: 'Failed to fetch student progress details' });
  }
});

// 3. Subject & Topic Management
router.get('/subjects', async (req, res) => {
  try {
    const subjects = await db.getSubjects();
    res.json({ subjects });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch subjects' });
  }
});

router.post('/subjects', async (req, res) => {
  try {
    const { name, category, description, topics } = req.body;
    if (!name || !name.trim()) {
      return res.status(400).json({ error: 'Subject name is required' });
    }
    const created = await db.createSubject({
      name: name.trim(),
      category: category || 'General',
      description: description || '',
      topics: Array.isArray(topics) ? topics : (topics || '').split(',').map(t => t.trim()).filter(Boolean)
    });
    res.status(201).json({ message: 'Subject created successfully', subject: created });
  } catch (err) {
    res.status(500).json({ error: 'Failed to create subject' });
  }
});

router.delete('/subjects/:id', async (req, res) => {
  try {
    await db.deleteSubject(req.params.id);
    res.json({ message: 'Subject deleted' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to delete subject' });
  }
});

// 4. Resource Upload & Management
router.get('/resources', async (req, res) => {
  try {
    const resources = await db.getResources();
    res.json({ resources });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch resources' });
  }
});

router.post('/resources', uploadResource.single('resourceFile'), async (req, res) => {
  try {
    const { title, description, subject } = req.body;
    if (!title || !req.file) {
      return res.status(400).json({ error: 'Title and resource file are required' });
    }
    const fileUrl = `/uploads/${req.file.filename}`;
    const resource = await db.createResource({
      title: title.trim(),
      description: description ? description.trim() : '',
      subject: subject ? subject.trim() : 'General',
      fileUrl,
      fileName: req.file.originalname,
      fileSize: req.file.size || 0,
      uploadedBy: req.user.name || 'Admin'
    });
    res.status(201).json({ message: 'Resource uploaded successfully', resource });
  } catch (err) {
    console.error('Resource upload error:', err);
    res.status(500).json({ error: 'Failed to upload resource' });
  }
});

router.delete('/resources/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const resource = await db.getResourceById(id);
    if (resource && resource.fileUrl) {
      const filename = path.basename(resource.fileUrl);
      const filePath = path.join(UPLOADS_DIR, filename);
      if (fs.existsSync(filePath)) {
        try { fs.unlinkSync(filePath); } catch (e) { console.warn('Could not remove file from disk:', e); }
      }
    }
    await db.deleteResource(id);
    res.json({ message: 'Resource deleted successfully' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to delete resource' });
  }
});

// 5. Question Categories Management
router.get('/categories', async (req, res) => {
  try {
    const categories = await db.getQuestionCategories();
    res.json({ categories });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch categories' });
  }
});

router.post('/categories', async (req, res) => {
  try {
    const { name, description, targetRole, type } = req.body;
    if (!name || !name.trim()) {
      return res.status(400).json({ error: 'Category name is required' });
    }
    const created = await db.createQuestionCategory({
      name: name.trim(),
      description: description || '',
      targetRole: targetRole || 'General',
      type: type || 'all'
    });
    res.status(201).json({ message: 'Category created successfully', category: created });
  } catch (err) {
    res.status(500).json({ error: 'Failed to create category' });
  }
});

router.delete('/categories/:id', async (req, res) => {
  try {
    await db.deleteQuestionCategory(req.params.id);
    res.json({ message: 'Category deleted' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to delete category' });
  }
});

export default router;
