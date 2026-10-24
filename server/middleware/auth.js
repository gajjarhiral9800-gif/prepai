import jwt from 'jsonwebtoken';
import { db } from '../db.js';

const JWT_SECRET = process.env.JWT_SECRET || 'prepai_jwt_super_secret_key_2026_secure';

export const authMiddleware = async (req, res, next) => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Access denied. No token provided.' });
  }

  const token = authHeader.split(' ')[1];

  if (!token || token === 'null' || token === 'undefined') {
    return res.status(401).json({ error: 'Access denied. No token provided.' });
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    const user = await db.findUserById(decoded.id);

    if (!user) {
      return res.status(401).json({ error: 'Invalid authentication token. User not found.' });
    }

    // Attach user (without password hash) to request
    const { passwordHash, ...userClean } = user;
    userClean.role = userClean.email === 'hiral2005gajjar@gmail.com' ? 'admin' : 'student';
    req.user = userClean;
    next();
  } catch (err) {
    return res.status(401).json({ error: 'Invalid or expired token.' });
  }
};
