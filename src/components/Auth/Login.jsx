import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../../context/AuthContext';
import {
  LogIn,
  Mail,
  Lock,
  AlertCircle,
  Sparkles,
  ShieldCheck,
  ArrowLeft,
  RefreshCw,
  CheckCircle2,
  KeyRound,
  Eye,
  EyeOff
} from 'lucide-react';

function Login({ onSwitchToRegister, prefilledEmail = '', initialSuccessMsg = '' }) {
  // mode: 'login' | 'forgot-request' | 'forgot-verify'
  const [mode, setMode] = useState('login');
  
  // Login fields
  const [email, setEmail] = useState(prefilledEmail || '');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  // Forgot password fields
  const [forgotEmail, setForgotEmail] = useState('');
  const [otpDigits, setOtpDigits] = useState(['', '', '', '', '', '']);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const otpInputsRef = useRef([]);

  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState(initialSuccessMsg || '');
  const [loading, setLoading] = useState(false);
  const [devMode, setDevMode] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(0);

  const { login, forgotPassword, resetPassword } = useAuth();

  useEffect(() => {
    if (prefilledEmail) {
      setEmail(prefilledEmail);
    }
    if (initialSuccessMsg) {
      setSuccessMsg(initialSuccessMsg);
    }
  }, [prefilledEmail, initialSuccessMsg]);

  // Handle Resend cooldown countdown
  useEffect(() => {
    let timer;
    if (resendCooldown > 0) {
      timer = setInterval(() => {
        setResendCooldown((prev) => (prev > 0 ? prev - 1 : 0));
      }, 1000);
    }
    return () => clearInterval(timer);
  }, [resendCooldown]);

  // Focus the first OTP box when entering forgot-verify step
  useEffect(() => {
    if (mode === 'forgot-verify') {
      setTimeout(() => {
        otpInputsRef.current[0]?.focus();
      }, 100);
    }
  }, [mode]);

  // ==========================================
  // 1. Direct Login (Instant Home Page Access)
  // ==========================================
  const handleLoginSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccessMsg('');

    if (!email || !password) {
      setError('Please fill in both email and password.');
      return;
    }

    setLoading(true);
    try {
      await login(email, password);
      // login() stores token and sets user state in AuthContext.
      // App.jsx will automatically route user to home page (or admin panel if admin)!
    } catch (err) {
      setError(err.message || 'Login failed. Please check your email and password.');
    } finally {
      setLoading(false);
    }
  };

  // ==========================================
  // 2. Forgot Password - Step 1: Request OTP
  // ==========================================
  const handleForgotRequestSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccessMsg('');

    if (!forgotEmail || !forgotEmail.trim()) {
      setError('Please enter your registered email address.');
      return;
    }

    setLoading(true);
    try {
      const res = await forgotPassword(forgotEmail.trim().toLowerCase());
      setSuccessMsg(res.message || `A 6-digit verification code was sent to ${forgotEmail}`);
      setDevMode(Boolean(res.devMode));
      setResendCooldown(60);
      setMode('forgot-verify');

      if (res.devOtp) {
        handlePasteDigits(res.devOtp);
      }
    } catch (err) {
      setError(err.message || 'Could not send reset code. Please check your email.');
    } finally {
      setLoading(false);
    }
  };

  // ==========================================
  // 3. Forgot Password - Step 2: Reset & Save
  // ==========================================
  const handleResetPasswordSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccessMsg('');

    const otpCode = otpDigits.join('').trim();
    if (otpCode.length !== 6) {
      setError('Please enter the complete 6-digit verification code.');
      return;
    }

    if (!newPassword || newPassword.length < 6) {
      setError('New password must be at least 6 characters long.');
      return;
    }

    if (newPassword !== confirmPassword) {
      setError('New password and confirm password do not match.');
      return;
    }

    setLoading(true);
    try {
      const res = await resetPassword(forgotEmail.trim().toLowerCase(), otpCode, newPassword);
      setEmail(forgotEmail);
      setPassword('');
      setOtpDigits(['', '', '', '', '', '']);
      setNewPassword('');
      setConfirmPassword('');
      setMode('login');
      setSuccessMsg(res.message || 'Password updated successfully! You can now sign in with your new password.');
    } catch (err) {
      setError(err.message || 'Failed to reset password. Please check the verification code.');
    } finally {
      setLoading(false);
    }
  };

  // OTP digit input handlers
  const handleDigitChange = (index, value) => {
    const cleanVal = value.replace(/[^0-9]/g, '');
    const newDigits = [...otpDigits];

    if (cleanVal.length > 1) {
      handlePasteDigits(cleanVal);
      return;
    }

    newDigits[index] = cleanVal;
    setOtpDigits(newDigits);

    // Auto-advance to next box
    if (cleanVal && index < 5) {
      otpInputsRef.current[index + 1]?.focus();
    }
  };

  const handleKeyDown = (index, e) => {
    if (e.key === 'Backspace' && !otpDigits[index] && index > 0) {
      otpInputsRef.current[index - 1]?.focus();
    }
  };

  const handlePasteDigits = (pastedText) => {
    const cleanPasted = pastedText.replace(/[^0-9]/g, '').slice(0, 6);
    if (!cleanPasted) return;

    const newDigits = ['', '', '', '', '', ''];
    for (let i = 0; i < cleanPasted.length; i++) {
      newDigits[i] = cleanPasted[i];
    }
    setOtpDigits(newDigits);

    const nextIndex = Math.min(cleanPasted.length, 5);
    otpInputsRef.current[nextIndex]?.focus();
  };

  const handlePaste = (e) => {
    e.preventDefault();
    const pasted = e.clipboardData.getData('text');
    handlePasteDigits(pasted);
  };

  const handleResend = async () => {
    if (resendCooldown > 0 || loading) return;
    setError('');
    setLoading(true);
    try {
      const res = await forgotPassword(forgotEmail.trim().toLowerCase());
      setSuccessMsg(res.message || `A new verification code was sent to ${forgotEmail}`);
      setResendCooldown(60);
      if (res.devOtp) {
        handlePasteDigits(res.devOtp);
      }
    } catch (err) {
      setError(err.message || 'Failed to resend code.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-card">
      {/* ========================================================
          MODE 1: STANDARD DIRECT LOGIN (INSTANT ACCESS)
          ======================================================== */}
      {mode === 'login' && (
        <>
          <div className="auth-header">
            <div className="auth-logo-badge">
              <Sparkles className="icon-glow" size={28} />
            </div>
            <h2>Welcome Back</h2>
            <p>Sign in with your email and password to access your dashboard.</p>
          </div>

          {error && (
            <div className="alert-error">
              <AlertCircle size={18} />
              <span>{error}</span>
            </div>
          )}

          {successMsg && !error && (
            <div className="alert-success">
              <CheckCircle2 size={18} />
              <span>{successMsg}</span>
            </div>
          )}

          <form onSubmit={handleLoginSubmit} className="auth-form">
            <div className="input-group">
              <label>Email Address</label>
              <div className="input-wrapper">
                <Mail className="input-icon" size={18} />
                <input
                  type="email"
                  placeholder="you@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  autoComplete="email"
                  required
                />
              </div>
            </div>

            <div className="input-group">
              <div className="input-label-row">
                <label>Password</label>
                <button
                  type="button"
                  className="btn-link-forgot"
                  onClick={() => {
                    setForgotEmail(email);
                    setError('');
                    setSuccessMsg('');
                    setMode('forgot-request');
                  }}
                >
                  Forgot password?
                </button>
              </div>
              <div className="input-wrapper">
                <Lock className="input-icon" size={18} />
                <input
                  type={showPassword ? 'text' : 'password'}
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  autoComplete="current-password"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  style={{
                    position: 'absolute',
                    right: '0.85rem',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    background: 'transparent',
                    border: 'none',
                    color: 'var(--text-muted)',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center'
                  }}
                  title={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            <button type="submit" className="btn-primary auth-submit" disabled={loading}>
              {loading ? (
                <span className="spinner"></span>
              ) : (
                <>
                  <LogIn size={18} /> Sign In to PrepAI
                </>
              )}
            </button>
          </form>

          <div className="auth-footer">
            <span>Don't have an account? </span>
            <button type="button" className="btn-link" onClick={onSwitchToRegister}>
              Register now
            </button>
          </div>
        </>
      )}

      {/* ========================================================
          MODE 2: FORGOT PASSWORD - STEP 1 (REQUEST OTP)
          ======================================================== */}
      {mode === 'forgot-request' && (
        <>
          <div className="auth-header">
            <div className="auth-logo-badge" style={{ background: 'linear-gradient(135deg, #f59e0b, #ef4444)' }}>
              <KeyRound className="icon-glow" size={28} />
            </div>
            <h2>Reset Password</h2>
            <p>Enter your registered email address and we'll send a 6-digit verification code to reset your password.</p>
          </div>

          {error && (
            <div className="alert-error">
              <AlertCircle size={18} />
              <span>{error}</span>
            </div>
          )}

          {successMsg && !error && (
            <div className="alert-success">
              <CheckCircle2 size={18} />
              <span>{successMsg}</span>
            </div>
          )}

          <form onSubmit={handleForgotRequestSubmit} className="auth-form">
            <div className="input-group">
              <label>Registered Email Address</label>
              <div className="input-wrapper">
                <Mail className="input-icon" size={18} />
                <input
                  type="email"
                  placeholder="Enter your registered email..."
                  value={forgotEmail}
                  onChange={(e) => setForgotEmail(e.target.value)}
                  autoComplete="email"
                  autoFocus
                  required
                />
              </div>
            </div>

            <button type="submit" className="btn-primary auth-submit" disabled={loading}>
              {loading ? (
                <span className="spinner"></span>
              ) : (
                <>
                  <Mail size={18} /> Send Verification Code
                </>
              )}
            </button>

            <button
              type="button"
              className="btn-secondary"
              style={{ width: '100%', justifyContent: 'center', marginTop: '0.4rem' }}
              onClick={() => {
                setError('');
                setSuccessMsg('');
                setMode('login');
              }}
              disabled={loading}
            >
              <ArrowLeft size={16} /> Back to Sign In
            </button>
          </form>

          <div className="auth-footer">
            <span>Remember your password? </span>
            <button 
              type="button" 
              className="btn-link" 
              onClick={() => { setError(''); setSuccessMsg(''); setMode('login'); }}
            >
              Sign In
            </button>
          </div>
        </>
      )}

      {/* ========================================================
          MODE 3: FORGOT PASSWORD - STEP 2 (ENTER OTP & NEW PASSWORD)
          ======================================================== */}
      {mode === 'forgot-verify' && (
        <>
          <div className="auth-header">
            <div className="auth-logo-badge" style={{ background: 'linear-gradient(135deg, #10b981, #06b6d4)' }}>
              <ShieldCheck className="icon-glow" size={28} />
            </div>
            <h2>Choose New Password</h2>
            <p>Enter the 6-digit recovery code sent to:</p>
            <div className="otp-email-badge">
              <Mail size={14} />
              <span>{forgotEmail}</span>
            </div>
          </div>

          {error && (
            <div className="alert-error">
              <AlertCircle size={18} />
              <span>{error}</span>
            </div>
          )}

          {successMsg && !error && (
            <div className="alert-success">
              <CheckCircle2 size={18} />
              <span>{successMsg}</span>
            </div>
          )}

          <form onSubmit={handleResetPasswordSubmit} className="auth-form">
            {/* 6 Digit OTP Input Boxes */}
            <div className="input-group">
              <label>6-Digit Verification Code</label>
              <div className="otp-boxes-wrapper" onPaste={handlePaste}>
                {otpDigits.map((digit, index) => (
                  <input
                    key={index}
                    ref={(el) => (otpInputsRef.current[index] = el)}
                    type="text"
                    inputMode="numeric"
                    maxLength={1}
                    value={digit}
                    onChange={(e) => handleDigitChange(index, e.target.value)}
                    onKeyDown={(e) => handleKeyDown(index, e)}
                    className="otp-box"
                    required
                  />
                ))}
              </div>

              <div className="otp-meta">
                <span>Didn't receive the code?</span>
                <button
                  type="button"
                  className="otp-resend-btn"
                  onClick={handleResend}
                  disabled={resendCooldown > 0 || loading}
                >
                  <RefreshCw size={13} className={loading ? 'animate-spin' : ''} />
                  {resendCooldown > 0 ? `Resend in ${resendCooldown}s` : 'Resend Code'}
                </button>
              </div>
            </div>

            {/* New Password */}
            <div className="input-group">
              <label>New Password (min 6 characters)</label>
              <div className="input-wrapper">
                <Lock className="input-icon" size={18} />
                <input
                  type={showNewPassword ? 'text' : 'password'}
                  placeholder="Enter your new password..."
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  minLength={6}
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowNewPassword(!showNewPassword)}
                  style={{
                    position: 'absolute',
                    right: '0.85rem',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    background: 'transparent',
                    border: 'none',
                    color: 'var(--text-muted)',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center'
                  }}
                  title={showNewPassword ? 'Hide password' : 'Show password'}
                >
                  {showNewPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            {/* Confirm New Password */}
            <div className="input-group">
              <label>Confirm New Password</label>
              <div className="input-wrapper">
                <Lock className="input-icon" size={18} />
                <input
                  type={showConfirmPassword ? 'text' : 'password'}
                  placeholder="Re-enter your new password..."
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  minLength={6}
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  style={{
                    position: 'absolute',
                    right: '0.85rem',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    background: 'transparent',
                    border: 'none',
                    color: 'var(--text-muted)',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center'
                  }}
                  title={showConfirmPassword ? 'Hide password' : 'Show password'}
                >
                  {showConfirmPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              className="btn-primary auth-submit"
              disabled={loading || otpDigits.join('').length !== 6}
            >
              {loading ? (
                <span className="spinner"></span>
              ) : (
                <>
                  <KeyRound size={18} /> Update Password & Save
                </>
              )}
            </button>

            <button
              type="button"
              className="btn-secondary"
              style={{ width: '100%', justifyContent: 'center', marginTop: '0.4rem' }}
              onClick={() => {
                setError('');
                setSuccessMsg('');
                setMode('login');
              }}
              disabled={loading}
            >
              <ArrowLeft size={16} /> Back to Sign In
            </button>
          </form>

          {devMode && (
            <div className="otp-dev-hint">
              💡 <strong>Development Mode:</strong> Verification code is also logged to your backend terminal console.
            </div>
          )}
        </>
      )}
    </div>
  );
}

export default Login;
