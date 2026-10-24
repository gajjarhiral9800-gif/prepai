import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { UserPlus, User, Mail, Lock, AlertCircle, Sparkles, CheckCircle2 } from 'lucide-react';

function Register({ onSwitchToLogin, onRegisterSuccess }) {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { register } = useAuth();

  const handleRegister = async (e) => {
    e.preventDefault();
    setError('');

    if (!name.trim()) {
      setError('Full name is required');
      return;
    }

    if (!email.includes('@') || !email.includes('.')) {
      setError('Please enter a valid email address');
      return;
    }

    if (password.length < 6) {
      setError('Password must be at least 6 characters long');
      return;
    }

    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    setLoading(true);
    try {
      const data = await register(name, email, password);
      if (onRegisterSuccess) {
        onRegisterSuccess(
          email,
          data?.message || 'Account created successfully! Please log in to verify your account.'
        );
      } else if (onSwitchToLogin) {
        onSwitchToLogin();
      }
    } catch (err) {
      setError(err.message || 'Registration failed.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-card">
      <div className="auth-header">
        <div className="auth-logo-badge">
          <Sparkles className="icon-glow" size={28} />
        </div>
        <h2>Create Account</h2>
        <p>Join PrepAI to start mastering technical interviews</p>
      </div>

      {error && (
        <div className="alert-error">
          <AlertCircle size={18} />
          <span>{error}</span>
        </div>
      )}

      <form onSubmit={handleRegister} className="auth-form">
        <div className="input-group">
          <label>Full Name</label>
          <div className="input-wrapper">
            <User className="input-icon" size={18} />
            <input
              type="text"
              placeholder="John Doe"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />
          </div>
        </div>

        <div className="input-group">
          <label>Email Address</label>
          <div className="input-wrapper">
            <Mail className="input-icon" size={18} />
            <input
              type="email"
              placeholder="you@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>
        </div>

        <div className="input-group">
          <label>Password</label>
          <div className="input-wrapper">
            <Lock className="input-icon" size={18} />
            <input
              type="password"
              placeholder="At least 6 characters"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>
        </div>

        <div className="input-group">
          <label>Confirm Password</label>
          <div className="input-wrapper">
            <Lock className="input-icon" size={18} />
            <input
              type="password"
              placeholder="Re-enter password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
            />
          </div>
        </div>

        <button type="submit" className="btn-primary auth-submit" disabled={loading}>
          {loading ? (
            <span className="spinner"></span>
          ) : (
            <>
              <UserPlus size={18} /> Register Now
            </>
          )}
        </button>
      </form>

      <div className="auth-footer">
        <span>Already have an account? </span>
        <button type="button" className="btn-link" onClick={onSwitchToLogin}>
          Log in
        </button>
      </div>
    </div>
  );
}

export default Register;
