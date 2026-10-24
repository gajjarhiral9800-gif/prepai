import express from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import { db } from '../db.js';
import { authMiddleware } from '../middleware/auth.js';
import { sendOtpEmail } from '../utils/emailService.js';
import { otpStore } from '../utils/otpStore.js';

const router = express.Router();
const JWT_SECRET = process.env.JWT_SECRET || 'prepai_jwt_super_secret_key_2026_secure';

// Helper to generate JWT Token
const generateToken = (user) => {
  const role = user.email === 'hiral2005gajjar@gmail.com' ? 'admin' : 'student';
  return jwt.sign(
    { id: user.id, email: user.email, name: user.name, role },
    JWT_SECRET,
    { expiresIn: '7d' }
  );
};

// POST /api/auth/register
router.post('/register', async (req, res) => {
  try {
    const { name, email, password } = req.body;

    if (!name || !name.trim()) {
      return res.status(400).json({ error: 'Name is required' });
    }

    if (!email || !email.includes('@')) {
      return res.status(400).json({ error: 'Please enter a valid email address' });
    }

    if (!password || password.length < 6) {
      return res.status(400).json({ error: 'Password must be at least 6 characters long' });
    }

    const existingUser = await db.findUserByEmail(email);
    if (existingUser) {
      return res.status(400).json({ error: 'User with this email already exists' });
    }

    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(password, salt);

    const newUser = await db.createUser({
      name: name.trim(),
      email: email.trim().toLowerCase(),
      passwordHash
    });

    const { passwordHash: _, ...cleanUser } = newUser;

    return res.status(201).json({
      message: 'Registration successful. Please log in with your credentials to verify your account.',
      user: cleanUser
    });
  } catch (err) {
    console.error('Register error:', err);
    return res.status(500).json({ error: 'Server error during registration' });
  }
});

// POST /api/auth/login - Direct credentials login (instant access to home page/admin panel)
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }

    const cleanEmail = email.trim().toLowerCase();
    const user = await db.findUserByEmail(cleanEmail);
    if (!user) {
      return res.status(400).json({ error: 'Invalid email or password' });
    }

    const isMatch = await bcrypt.compare(password, user.passwordHash);
    if (!isMatch) {
      return res.status(400).json({ error: 'Invalid email or password' });
    }

    // Direct Login: User remembers email and password -> instant token & direct access
    const token = generateToken(user);
    const { passwordHash: _, ...cleanUser } = user;
    cleanUser.role = cleanUser.email === 'hiral2005gajjar@gmail.com' ? 'admin' : 'student';

    console.log(`✅ [LOGIN SUCCESS] User: ${cleanEmail} (${cleanUser.role})`);

    return res.json({
      message: 'Login successful',
      token,
      user: cleanUser
    });
  } catch (err) {
    console.error('Login error:', err);
    return res.status(500).json({ error: 'Server error during login' });
  }
});

// POST /api/auth/forgot-password - Step 1: Send OTP to registered email
router.post('/forgot-password', async (req, res) => {
  try {
    const { email } = req.body;

    if (!email || !email.trim()) {
      return res.status(400).json({ error: 'Please enter your registered email address' });
    }

    const cleanEmail = email.trim().toLowerCase();
    const user = await db.findUserByEmail(cleanEmail);
    if (!user) {
      return res.status(404).json({ error: 'No registered account found with this email address. Please check spelling or register.' });
    }

    // Generate secure 6-digit OTP
    const otp = crypto.randomInt(100000, 999999).toString();
    otpStore.saveOtp(cleanEmail, otp);

    console.log(`\n======================================================`);
    console.log(`🔐 [FORGOT PASSWORD OTP] User: ${cleanEmail}`);
    console.log(`🔑 Verification Code: [ ${otp} ] (Valid for 5 minutes)`);
    console.log(`======================================================\n`);

    // Send OTP email
    const emailResult = await sendOtpEmail(cleanEmail, otp, user.name);
    if (!emailResult.sent) {
      return res.status(500).json({
        error: emailResult.error || 'Failed to deliver verification code to your email. Please ensure Brevo is configured on the server.'
      });
    }

    return res.json({
      success: true,
      email: cleanEmail,
      message: `A 6-digit verification code has been sent to ${cleanEmail}`
    });
  } catch (err) {
    console.error('Forgot password error:', err);
    return res.status(500).json({ error: 'Failed to process password reset request' });
  }
});

// POST /api/auth/reset-password - Step 2: Validate OTP and set new password in database
router.post('/reset-password', async (req, res) => {
  try {
    const { email, otp, newPassword } = req.body;

    if (!email || !otp || !newPassword) {
      return res.status(400).json({ error: 'Email, verification code, and new password are required' });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({ error: 'New password must be at least 6 characters long' });
    }

    const cleanEmail = email.trim().toLowerCase();
    const verification = otpStore.verifyOtp(cleanEmail, otp);
    if (!verification.valid) {
      return res.status(400).json({ error: verification.error || 'Invalid or expired verification code' });
    }

    const user = await db.findUserByEmail(cleanEmail);
    if (!user) {
      return res.status(404).json({ error: 'User account not found' });
    }

    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(newPassword, salt);

    await db.updateUserPassword(cleanEmail, passwordHash);

    console.log(`🔑 [PASSWORD RESET SUCCESS] Updated password in database for: ${cleanEmail}`);

    return res.json({
      success: true,
      message: 'Password reset successfully! Please sign in with your new password.'
    });
  } catch (err) {
    console.error('Reset password error:', err);
    return res.status(500).json({ error: 'Server error updating password' });
  }
});

// POST /api/auth/verify-otp - Step 2: Validate OTP and complete sign-in
router.post('/verify-otp', async (req, res) => {
  try {
    const { email, otp } = req.body;

    if (!email || !otp) {
      return res.status(400).json({ error: 'Email and verification code are required' });
    }

    const verification = otpStore.verifyOtp(email, otp);
    if (!verification.valid) {
      return res.status(400).json({ error: verification.error });
    }

    const user = await db.findUserByEmail(email);
    if (!user) {
      return res.status(404).json({ error: 'User account not found' });
    }

    const token = generateToken(user);
    const { passwordHash: _, ...cleanUser } = user;

    return res.json({
      message: 'Login successful',
      token,
      user: cleanUser
    });
  } catch (err) {
    console.error('Verify OTP error:', err);
    return res.status(500).json({ error: 'Server error during OTP verification' });
  }
});

// POST /api/auth/resend-otp - Resend a new OTP with cooldown check
router.post('/resend-otp', async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({ error: 'Email is required' });
    }

    const user = await db.findUserByEmail(email);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    const check = otpStore.canResend(user.email);
    if (!check.allowed) {
      return res.status(429).json({
        error: `Please wait ${check.waitSeconds}s before requesting another verification code.`
      });
    }

    // Generate new OTP and send
    const otp = crypto.randomInt(100000, 999999).toString();
    otpStore.saveOtp(user.email, otp);
    const emailResult = await sendOtpEmail(user.email, otp, user.name);
    if (!emailResult.sent) {
      return res.status(500).json({
        error: emailResult.error || 'Failed to deliver verification code to your email. Please ensure Brevo is configured on the server.'
      });
    }

    return res.json({
      message: `A new 6-digit code has been sent to ${user.email}`
    });
  } catch (err) {
    console.error('Resend OTP error:', err);
    return res.status(500).json({ error: 'Server error resending verification code' });
  }
});

// GET /api/auth/me
router.get('/me', authMiddleware, (req, res) => {
  res.json({ user: req.user });
});

// PUT /api/auth/api-key
router.put('/api-key', authMiddleware, async (req, res) => {
  try {
    const { apiKey } = req.body;
    const updatedUser = await db.updateUserApiKey(req.user.id, apiKey || '');
    if (!updatedUser) {
      return res.status(404).json({ error: 'User not found' });
    }
    const { passwordHash: _, ...cleanUser } = updatedUser;
    res.json({ message: 'API Key updated successfully', user: cleanUser });
  } catch (err) {
    console.error('Update API Key error:', err);
    res.status(500).json({ error: 'Server error updating API key' });
  }
});

export default router;
