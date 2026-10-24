import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { User } from './models/User.js';
import { Session } from './models/Session.js';
import { Subject } from './models/Subject.js';
import { Resource } from './models/Resource.js';
import { QuestionCategory } from './models/QuestionCategory.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DATA_DIR = path.join(__dirname, 'data');
const DATA_FILE = path.join(DATA_DIR, 'db.json');

let isMongoConnected = false;

// Auto-seed Admin Account (hiral2005gajjar@gmail.com / Admin@123)
async function seedAdminUser() {
  try {
    const adminEmail = 'hiral2005gajjar@gmail.com';
    const existingAdmin = isMongoConnected 
      ? await User.findOne({ email: adminEmail })
      : readJsonDb().users.find(u => u.email.toLowerCase() === adminEmail);

    if (!existingAdmin) {
      const salt = await bcrypt.genSalt(10);
      const passwordHash = await bcrypt.hash('Admin@123', salt);

      if (isMongoConnected) {
        await User.create({
          name: 'Hiral Gajjar',
          email: adminEmail,
          passwordHash,
          role: 'admin'
        });
      } else {
        const data = readJsonDb();
        data.users.push({
          id: 'admin_root',
          name: 'Hiral Gajjar',
          email: adminEmail,
          passwordHash,
          role: 'admin',
          apiKey: '',
          createdAt: new Date().toISOString()
        });
        writeJsonDb(data);
      }
      console.log('👑 Admin user auto-seeded: hiral2005gajjar@gmail.com / Admin@123');
    }
  } catch (err) {
    console.error('Failed to seed admin user:', err);
  }
}

// Attempt MongoDB Connection
// Attempt MongoDB Connection
const mongoUri = process.env.MONGODB_URI;

export const dbReady = (async () => {
  if (!mongoUri) {
    if (process.env.NODE_ENV === 'production') {
      throw new Error('MONGODB_URI is missing in production');
    }

    console.warn('MONGODB_URI missing; using local JSON fallback.');
    await seedAdminUser();
    return;
  }

  try {
    await mongoose.connect(mongoUri, {
      serverSelectionTimeoutMS: 15000
    });

    isMongoConnected = true;
    console.log('MongoDB Atlas connected successfully');

    await seedAdminUser();
  } catch (err) {
    isMongoConnected = false;
    console.error('MongoDB connection failed:', err.message);

    if (process.env.NODE_ENV === 'production') {
      throw err;
    }

    await seedAdminUser();
  }
})();

// --- JSON File Fallback Engine ---
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

const initialData = { users: [], sessions: [], subjects: [], resources: [], categories: [] };

function readJsonDb() {
  try {
    if (!fs.existsSync(DATA_FILE)) {
      fs.writeFileSync(DATA_FILE, JSON.stringify(initialData, null, 2));
      return initialData;
    }
    const content = fs.readFileSync(DATA_FILE, 'utf-8');
    const parsed = JSON.parse(content || '{}');
    return {
      users: parsed.users || [],
      sessions: parsed.sessions || [],
      subjects: parsed.subjects || [],
      resources: parsed.resources || [],
      categories: parsed.categories || []
    };
  } catch (err) {
    return initialData;
  }
}

function writeJsonDb(data) {
  try {
    fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2));
  } catch (err) {
    console.error('Error writing JSON database:', err);
  }
}

// Unified Database Abstraction Layer
export const db = {
  findUserByEmail: async (email) => {
    if (isMongoConnected) {
      try {
        const user = await User.findOne({ email: email.toLowerCase() }).lean();
        if (user) {
          user.id = user._id.toString();
          return user;
        }
      } catch (e) {}
    }
    const data = readJsonDb();
    return data.users.find(u => u.email.toLowerCase() === email.toLowerCase());
  },

  findUserById: async (id) => {
    if (isMongoConnected) {
      try {
        const user = await User.findById(id).lean();
        if (user) {
          user.id = user._id.toString();
          return user;
        }
      } catch (e) {}
    }
    const data = readJsonDb();
    return data.users.find(u => u.id === id);
  },

  createUser: async (userObj) => {
    if (isMongoConnected) {
      try {
        const newUser = await User.create({
          name: userObj.name,
          email: userObj.email.toLowerCase(),
          passwordHash: userObj.passwordHash,
          role: userObj.role || 'student',
          apiKey: userObj.apiKey || ''
        });
        const obj = newUser.toObject();
        obj.id = obj._id.toString();
        return obj;
      } catch (e) { console.error('Mongo create error:', e); }
    }
    const data = readJsonDb();
    const newUser = {
      id: 'usr_' + Date.now() + '_' + Math.random().toString(36).substr(2, 5),
      createdAt: new Date().toISOString(),
      role: userObj.role || 'student',
      apiKey: '',
      ...userObj
    };
    data.users.push(newUser);
    writeJsonDb(data);
    return newUser;
  },

  updateUserApiKey: async (userId, apiKey) => {
    if (isMongoConnected) {
      try {
        const updated = await User.findByIdAndUpdate(
          userId,
          { apiKey: apiKey || '' },
          { new: true }
        ).lean();
        if (updated) {
          updated.id = updated._id.toString();
          return updated;
        }
      } catch (e) {}
    }
    const data = readJsonDb();
    const idx = data.users.findIndex(u => u.id === userId);
    if (idx !== -1) {
      data.users[idx].apiKey = apiKey;
      writeJsonDb(data);
      return data.users[idx];
    }
    return null;
  },

  updateUserPassword: async (email, passwordHash) => {
    const cleanEmail = email.trim().toLowerCase();
    if (isMongoConnected) {
      try {
        const updated = await User.findOneAndUpdate(
          { email: cleanEmail },
          { passwordHash },
          { new: true }
        ).lean();
        if (updated) {
          return { ...updated, id: updated._id.toString() };
        }
      } catch (e) {
        console.error('Mongo updateUserPassword error:', e);
      }
    }
    const data = readJsonDb();
    const userIndex = (data.users || []).findIndex(u => u.email.toLowerCase() === cleanEmail);
    if (userIndex !== -1) {
      data.users[userIndex].passwordHash = passwordHash;
      writeJsonDb(data);
      return data.users[userIndex];
    }
    return null;
  },

  saveSession: async (sessionObj) => {
    if (isMongoConnected) {
      try {
        const newSess = await Session.create({
          userId: sessionObj.userId,
          type: sessionObj.type,
          title: sessionObj.title,
          score: sessionObj.score || 0,
          data: sessionObj.data || {}
        });
        const obj = newSess.toObject();
        obj.id = obj._id.toString();
        return obj;
      } catch (e) {}
    }
    const data = readJsonDb();
    const newSession = {
      id: 'sess_' + Date.now() + '_' + Math.random().toString(36).substr(2, 5),
      timestamp: new Date().toISOString(),
      ...sessionObj
    };
    data.sessions.push(newSession);
    writeJsonDb(data);
    return newSession;
  },

  getUserSessions: async (userId) => {
    if (isMongoConnected) {
      try {
        const sessions = await Session.find({ userId }).sort({ timestamp: 1 }).lean();
        return sessions.map(s => ({ ...s, id: s._id.toString() }));
      } catch (e) {}
    }
    const data = readJsonDb();
    return (data.sessions || []).filter(s => s.userId === userId);
  },

  getAllSessions: async () => {
    if (isMongoConnected) {
      try {
        const sessions = await Session.find().sort({ timestamp: -1 }).lean();
        return sessions.map(s => ({ ...s, id: s._id.toString() }));
      } catch (e) {}
    }
    const data = readJsonDb();
    return data.sessions || [];
  },

  getAllUsers: async () => {
    if (isMongoConnected) {
      try {
        const users = await User.find().lean();
        return users.map(u => ({ ...u, id: u._id.toString() }));
      } catch (e) {}
    }
    const data = readJsonDb();
    return data.users || [];
  },

  // --- ADMIN PANEL DATABASE METHODS ---
  getAdminAnalytics: async () => {
    let totalStudents = 0;
    let totalInterviews = 0;
    let totalQuizzes = 0;
    let totalResumes = 0;
    let totalScores = [];

    if (isMongoConnected) {
      try {
        totalStudents = await User.countDocuments({ role: 'student' });
        const allSessions = await Session.find().lean();
        totalInterviews = allSessions.filter(s => s.type === 'interview').length;
        totalQuizzes = allSessions.filter(s => s.type === 'quiz').length;
        totalResumes = allSessions.filter(s => s.type === 'resume').length;
        totalScores = allSessions.map(s => s.score).filter(s => typeof s === 'number' && s > 0);
      } catch (e) {}
    } else {
      const data = readJsonDb();
      totalStudents = data.users.filter(u => u.role !== 'admin').length;
      totalInterviews = data.sessions.filter(s => s.type === 'interview').length;
      totalQuizzes = data.sessions.filter(s => s.type === 'quiz').length;
      totalResumes = data.sessions.filter(s => s.type === 'resume').length;
      totalScores = data.sessions.map(s => s.score).filter(s => typeof s === 'number' && s > 0);
    }

    const avgPlatformScore = totalScores.length > 0 
      ? Math.round(totalScores.reduce((a, b) => a + b, 0) / totalScores.length)
      : 82;

    return {
      totalStudents,
      totalInterviews,
      totalQuizzes,
      totalResumes,
      avgPlatformScore
    };
  },

  getAllUsersWithMetrics: async () => {
    let users = [];
    let sessions = [];

    if (isMongoConnected) {
      try {
        users = await User.find().lean();
        sessions = await Session.find().lean();
      } catch (e) {}
    } else {
      const data = readJsonDb();
      users = data.users;
      sessions = data.sessions;
    }

    return users.map(u => {
      const uId = u._id ? u._id.toString() : u.id;
      const uSessions = sessions.filter(s => s.userId === uId);
      const scores = uSessions.map(s => s.score).filter(s => typeof s === 'number');
      const avgScore = scores.length > 0 ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length) : 0;

      return {
        id: uId,
        name: u.name,
        email: u.email,
        role: u.role || 'student',
        createdAt: u.createdAt,
        sessionsCount: uSessions.length,
        avgScore
      };
    });
  },

  deleteUser: async (id) => {
    if (isMongoConnected) {
      try {
        await User.findByIdAndDelete(id);
        await Session.deleteMany({ userId: id });
        return true;
      } catch (e) {}
    }
    const data = readJsonDb();
    data.users = data.users.filter(u => u.id !== id);
    data.sessions = data.sessions.filter(s => s.userId !== id);
    writeJsonDb(data);
    return true;
  },

  // Subjects
  getSubjects: async () => {
    if (isMongoConnected) {
      try {
        const subs = await Subject.find().lean();
        return subs.map(s => ({ ...s, id: s._id.toString() }));
      } catch (e) {}
    }
    return readJsonDb().subjects;
  },
  createSubject: async (obj) => {
    if (isMongoConnected) {
      try {
        const sub = await Subject.create(obj);
        return { ...sub.toObject(), id: sub._id.toString() };
      } catch (e) {}
    }
    const data = readJsonDb();
    const newSub = { id: 'subj_' + Date.now(), ...obj };
    data.subjects.push(newSub);
    writeJsonDb(data);
    return newSub;
  },
  deleteSubject: async (id) => {
    if (isMongoConnected) {
      try { await Subject.findByIdAndDelete(id); return true; } catch (e) {}
    }
    const data = readJsonDb();
    data.subjects = data.subjects.filter(s => s.id !== id);
    writeJsonDb(data);
    return true;
  },

  // Resources
  getResources: async () => {
    if (isMongoConnected) {
      try {
        const resList = await Resource.find().sort({ uploadedAt: -1 }).lean();
        return resList.map(r => ({ ...r, id: r._id.toString() }));
      } catch (e) {}
    }
    return readJsonDb().resources;
  },
  getResourceById: async (id) => {
    if (isMongoConnected) {
      try {
        const r = await Resource.findById(id).lean();
        if (r) return { ...r, id: r._id.toString() };
      } catch (e) {}
    }
    const data = readJsonDb();
    return (data.resources || []).find(r => r.id === id || r._id === id);
  },
  createResource: async (obj) => {
    if (isMongoConnected) {
      try {
        const resObj = await Resource.create(obj);
        return { ...resObj.toObject(), id: resObj._id.toString() };
      } catch (e) {}
    }
    const data = readJsonDb();
    const newRes = { id: 'res_' + Date.now(), uploadedAt: new Date().toISOString(), ...obj };
    data.resources.push(newRes);
    writeJsonDb(data);
    return newRes;
  },
  deleteResource: async (id) => {
    if (isMongoConnected) {
      try { await Resource.findByIdAndDelete(id); return true; } catch (e) {}
    }
    const data = readJsonDb();
    data.resources = data.resources.filter(r => r.id !== id && r._id !== id);
    writeJsonDb(data);
    return true;
  },

  // Categories
  getQuestionCategories: async () => {
    if (isMongoConnected) {
      try {
        const cats = await QuestionCategory.find().lean();
        return cats.map(c => ({ ...c, id: c._id.toString() }));
      } catch (e) {}
    }
    return readJsonDb().categories;
  },
  createQuestionCategory: async (obj) => {
    if (isMongoConnected) {
      try {
        const cat = await QuestionCategory.create(obj);
        return { ...cat.toObject(), id: cat._id.toString() };
      } catch (e) {}
    }
    const data = readJsonDb();
    const newCat = { id: 'cat_' + Date.now(), ...obj };
    data.categories.push(newCat);
    writeJsonDb(data);
    return newCat;
  },
  deleteQuestionCategory: async (id) => {
    if (isMongoConnected) {
      try { await QuestionCategory.findByIdAndDelete(id); return true; } catch (e) {}
    }
    const data = readJsonDb();
    data.categories = data.categories.filter(c => c.id !== id);
    writeJsonDb(data);
    return true;
  }
};
