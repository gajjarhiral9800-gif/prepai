import express from 'express';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { db } from '../db.js';
import { authMiddleware } from '../middleware/auth.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const UPLOADS_DIR = path.join(__dirname, '..', 'public', 'uploads');

const router = express.Router();

// Apply auth middleware to all user routes
router.use(authMiddleware);

// GET /api/user/dashboard
router.get('/dashboard', async (req, res) => {
  try {
    const sessions = await db.getUserSessions(req.user.id);
    
    const interviews = sessions.filter(s => s.type === 'interview');
    const quizzes = sessions.filter(s => s.type === 'quiz');
    const resumeReviews = sessions.filter(s => s.type === 'resume');
    const starStories = sessions.filter(s => s.type === 'star');

    const totalInterviews = interviews.length;
    const totalQuizzes = quizzes.length;
    
    const interviewScores = interviews.map(i => i.score).filter(s => typeof s === 'number');
    const avgInterviewScore = interviewScores.length > 0 
      ? Math.round(interviewScores.reduce((a, b) => a + b, 0) / interviewScores.length) 
      : 0;

    const quizScores = quizzes.map(q => q.score).filter(s => typeof s === 'number');
    const avgQuizScore = quizScores.length > 0
      ? Math.round(quizScores.reduce((a, b) => a + b, 0) / quizScores.length)
      : 0;

    res.json({
      metrics: {
        totalInterviews,
        totalQuizzes,
        totalResumes: resumeReviews.length,
        totalStarStories: starStories.length,
        avgInterviewScore,
        avgQuizScore,
        practiceStreakDays: sessions.length > 0 ? Math.min(sessions.length, 7) : 1
      },
      recentSessions: sessions.slice(-10).reverse()
    });
  } catch (err) {
    console.error('Dashboard route error:', err);
    res.status(500).json({ error: 'Failed to fetch user dashboard metrics' });
  }
});

// GET /api/user/performance-compare (Student Peer Performance & Leaderboard Comparison)
router.get('/performance-compare', async (req, res) => {
  try {
    const currentUserId = req.user.id;
    const allUsers = await db.getAllUsers();
    const allSessions = await db.getAllSessions();

    // Filter out root admin account
    const students = allUsers.filter(u => 
      u.email?.toLowerCase() !== 'hiral2005gajjar@gmail.com' && u.role !== 'admin'
    );

    // Compute metrics for all students
    const studentStats = students.map(u => {
      const uId = u.id || (u._id ? u._id.toString() : '');
      const uSessions = allSessions.filter(s => s.userId === uId);
      const quizzes = uSessions.filter(s => s.type === 'quiz');
      const interviews = uSessions.filter(s => s.type === 'interview');

      const quizScores = quizzes.map(q => q.score).filter(s => typeof s === 'number');
      const interviewScores = interviews.map(i => i.score).filter(s => typeof s === 'number');
      const examScores = [...quizScores, ...interviewScores];

      const avgQuizScore = quizScores.length 
        ? Math.round(quizScores.reduce((a, b) => a + b, 0) / quizScores.length) 
        : 0;
      const avgInterviewScore = interviewScores.length 
        ? Math.round(interviewScores.reduce((a, b) => a + b, 0) / interviewScores.length) 
        : 0;
      const overallAvgScore = examScores.length 
        ? Math.round(examScores.reduce((a, b) => a + b, 0) / examScores.length) 
        : 0;

      return {
        id: uId,
        name: u.name || 'Student Candidate',
        email: u.email,
        totalExams: quizzes.length + interviews.length,
        totalQuizzes: quizzes.length,
        totalInterviews: interviews.length,
        avgQuizScore,
        avgInterviewScore,
        overallAvgScore,
        sessionsCount: uSessions.length,
        practiceStreak: uSessions.length > 0 ? Math.min(uSessions.length, 7) : 1
      };
    });

    // Global cohort stats
    const studentIds = new Set(students.map(u => u.id || (u._id ? u._id.toString() : '')));
    const studentSessions = allSessions.filter(s => studentIds.has(s.userId));
    const allQuizzes = studentSessions.filter(s => s.type === 'quiz');
    const allInterviews = studentSessions.filter(s => s.type === 'interview');
    
    const allQuizScores = allQuizzes.map(q => q.score).filter(s => typeof s === 'number');
    const allInterviewScores = allInterviews.map(i => i.score).filter(s => typeof s === 'number');
    const allExamScores = [...allQuizScores, ...allInterviewScores];

    const cohortAvgQuiz = allQuizScores.length 
      ? Math.round(allQuizScores.reduce((a, b) => a + b, 0) / allQuizScores.length) 
      : 72;
    const cohortAvgInterview = allInterviewScores.length 
      ? Math.round(allInterviewScores.reduce((a, b) => a + b, 0) / allInterviewScores.length) 
      : 80;
    const cohortAvgExam = allExamScores.length 
      ? Math.round(allExamScores.reduce((a, b) => a + b, 0) / allExamScores.length) 
      : 76;

    // Leaderboard Ranking
    // Sort students by: overallAvgScore desc, then totalExams desc
    const rankedStudents = [...studentStats].sort((a, b) => {
      if (b.overallAvgScore !== a.overallAvgScore) {
        return b.overallAvgScore - a.overallAvgScore;
      }
      return b.totalExams - a.totalExams;
    });

    let currentUserRank = 1;
    const leaderboard = rankedStudents.map((s, idx) => {
      const rank = idx + 1;
      const isCurrentUser = s.id === currentUserId;
      if (isCurrentUser) currentUserRank = rank;

      let badge = 'Active Learner 📚';
      if (rank === 1) badge = 'Top Ranker 🏆';
      else if (rank === 2) badge = 'Elite Scholar 🥈';
      else if (rank === 3) badge = 'Bronze Star 🥉';
      else if (s.overallAvgScore >= 85) badge = 'Mastery Level ⚡';
      else if (s.overallAvgScore >= 70) badge = 'High Achiever 🚀';

      return {
        rank,
        id: s.id,
        name: isCurrentUser ? `${s.name} (You)` : s.name,
        isCurrentUser,
        totalExams: s.totalExams,
        totalQuizzes: s.totalQuizzes,
        totalInterviews: s.totalInterviews,
        avgQuizScore: s.avgQuizScore,
        avgInterviewScore: s.avgInterviewScore,
        overallAvgScore: s.overallAvgScore,
        badge
      };
    });

    const totalStudents = studentStats.length || 1;
    // Calculate Percentile (e.g. Top 10% = 90th percentile)
    const percentile = totalStudents > 1 
      ? Math.max(5, Math.min(99, Math.round(((totalStudents - currentUserRank + 0.5) / totalStudents) * 100))) 
      : 95;

    const currentUserStat = studentStats.find(s => s.id === currentUserId) || {
      totalExams: 0,
      totalQuizzes: 0,
      totalInterviews: 0,
      avgQuizScore: 0,
      avgInterviewScore: 0,
      overallAvgScore: 0,
      practiceStreak: 1
    };

    // Domain / Topic Breakdown Comparison
    const domainTopics = [
      'React & Web Development',
      'Node.js & Backend Architecture',
      'System Design & Cloud',
      'Algorithms & Data Structures',
      'UI/UX Design & Prototyping',
      'Graphic Design & Visual Arts',
      'Database Design & SQL',
      'Python & Machine Learning'
    ];

    const domainComparison = domainTopics.map(topic => {
      // Find all sessions relevant to this topic
      const topicMatches = (title, dataTopic) => {
        const t = (title || '').toLowerCase();
        const dt = (dataTopic || '').toLowerCase();
        const target = topic.toLowerCase();
        return t.includes(target) || dt.includes(target) || (target.includes('react') && t.includes('react')) || (target.includes('backend') && (t.includes('backend') || t.includes('node')));
      };

      const cohortTopicSessions = studentSessions.filter(s => topicMatches(s.title, s.data?.topic));
      const userTopicSessions = cohortTopicSessions.filter(s => s.userId === currentUserId);

      const cohortScores = cohortTopicSessions.map(s => s.score).filter(s => typeof s === 'number');
      const userScores = userTopicSessions.map(s => s.score).filter(s => typeof s === 'number');

      const cohortAvg = cohortScores.length 
        ? Math.round(cohortScores.reduce((a, b) => a + b, 0) / cohortScores.length)
        : Math.min(85, Math.max(65, cohortAvgExam + Math.floor(Math.sin(topic.length) * 8)));

      const userAvg = userScores.length 
        ? Math.round(userScores.reduce((a, b) => a + b, 0) / userScores.length)
        : null;

      return {
        topic,
        userScore: userAvg,
        cohortScore: cohortAvg,
        userAttempts: userScores.length,
        cohortAttempts: cohortScores.length
      };
    });

    res.json({
      userMetrics: {
        rank: currentUserRank,
        totalStudents,
        percentile,
        totalExams: currentUserStat.totalExams,
        totalQuizzes: currentUserStat.totalQuizzes,
        totalInterviews: currentUserStat.totalInterviews,
        avgQuizScore: currentUserStat.avgQuizScore,
        avgInterviewScore: currentUserStat.avgInterviewScore,
        overallAvgScore: currentUserStat.overallAvgScore,
        practiceStreak: currentUserStat.practiceStreak
      },
      cohortMetrics: {
        totalStudents,
        avgQuizScore: cohortAvgQuiz,
        avgInterviewScore: cohortAvgInterview,
        overallAvgScore: cohortAvgExam,
        totalExams: allExamScores.length
      },
      domainComparison,
      leaderboard
    });
  } catch (err) {
    console.error('Performance compare route error:', err);
    res.status(500).json({ error: 'Failed to generate performance comparison' });
  }
});

// POST /api/user/save-session
router.post('/save-session', async (req, res) => {
  try {
    const { type, title, score, data } = req.body;
    
    if (!type || !title) {
      return res.status(400).json({ error: 'Session type and title are required' });
    }

    const saved = await db.saveSession({
      userId: req.user.id,
      type,
      title,
      score: score || 0,
      data: data || {}
    });

    res.status(201).json({ message: 'Session saved successfully', session: saved });
  } catch (err) {
    console.error('Save session error:', err);
    res.status(500).json({ error: 'Failed to save practice session' });
  }
});

// GET /api/user/resources (Student Study Hub)
router.get('/resources', async (req, res) => {
  try {
    const resources = await db.getResources();
    res.json({ resources });
  } catch (err) {
    console.error('Fetch student resources error:', err);
    res.status(500).json({ error: 'Failed to fetch learning resources' });
  }
});

// GET /api/user/resources/:id/download
router.get('/resources/:id/download', async (req, res) => {
  try {
    const { id } = req.params;
    const resource = await db.getResourceById(id);
    if (!resource) {
      return res.status(404).json({ error: 'Study material not found' });
    }
    const filename = path.basename(resource.fileUrl);
    const filePath = path.join(UPLOADS_DIR, filename);
    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ error: 'Study file not found on server' });
    }
    const downloadName = resource.fileName || `${(resource.title || 'study-guide').replace(/[^a-zA-Z0-9_-]/g, '_')}.pdf`;
    res.download(filePath, downloadName);
  } catch (err) {
    console.error('Download resource error:', err);
    res.status(500).json({ error: 'Failed to download study guide' });
  }
});

// GET /api/user/subjects (Student Subjects directory)
router.get('/subjects', async (req, res) => {
  try {
    const subjects = await db.getSubjects();
    res.json({ subjects });
  } catch (err) {
    console.error('Fetch student subjects error:', err);
    res.status(500).json({ error: 'Failed to fetch subjects' });
  }
});

export default router;
