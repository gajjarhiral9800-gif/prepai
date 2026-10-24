// In-memory OTP Store with TTL and rate limiting
const otpCache = new Map();
const lastSentCache = new Map();

const OTP_TTL_MS = 5 * 60 * 1000; // 5 minutes
const RESEND_COOLDOWN_MS = 30 * 1000; // 30 seconds cooldown
const MAX_ATTEMPTS = 5;

export const otpStore = {
  // Generate and save a new OTP
  saveOtp: (email, otp) => {
    const normalizedEmail = email.trim().toLowerCase();
    otpCache.set(normalizedEmail, {
      otp: otp.toString(),
      expiresAt: Date.now() + OTP_TTL_MS,
      attempts: 0,
    });
    lastSentCache.set(normalizedEmail, Date.now());
  },

  // Check if resend is allowed (cooldown check)
  canResend: (email) => {
    const normalizedEmail = email.trim().toLowerCase();
    const lastSent = lastSentCache.get(normalizedEmail);
    if (!lastSent) return { allowed: true };

    const elapsed = Date.now() - lastSent;
    if (elapsed < RESEND_COOLDOWN_MS) {
      const waitSeconds = Math.ceil((RESEND_COOLDOWN_MS - elapsed) / 1000);
      return { allowed: false, waitSeconds };
    }
    return { allowed: true };
  },

  // Verify an entered OTP
  verifyOtp: (email, otpInput) => {
    const normalizedEmail = email.trim().toLowerCase();
    const record = otpCache.get(normalizedEmail);

    if (!record) {
      return {
        valid: false,
        error: 'No active OTP found. Please request a new verification code.',
      };
    }

    if (Date.now() > record.expiresAt) {
      otpCache.delete(normalizedEmail);
      return {
        valid: false,
        error: 'Verification code has expired. Please request a new code.',
      };
    }

    record.attempts += 1;
    if (record.attempts > MAX_ATTEMPTS) {
      otpCache.delete(normalizedEmail);
      return {
        valid: false,
        error: 'Too many incorrect attempts. Please log in again to receive a new code.',
      };
    }

    if (record.otp !== otpInput.toString().trim()) {
      const remaining = MAX_ATTEMPTS - record.attempts;
      return {
        valid: false,
        error: `Incorrect verification code. ${remaining} attempt${remaining === 1 ? '' : 's'} remaining.`,
      };
    }

    // Valid OTP - clean up immediately
    otpCache.delete(normalizedEmail);
    return { valid: true };
  },

  // Delete an OTP
  clearOtp: (email) => {
    otpCache.delete(email.trim().toLowerCase());
  },
};
