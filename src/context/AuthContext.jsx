import React, { createContext, useContext, useState, useEffect } from 'react';

const AuthContext = createContext();

// Clear any legacy persistent token so opening the project always starts at login
try {
  localStorage.removeItem('prepai_token');
} catch (e) {}

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  // Use sessionStorage so closing and reopening the project always requires a fresh login
  const [token, setToken] = useState(sessionStorage.getItem('prepai_token') || '');
  const [loading, setLoading] = useState(true);

  // Helper for API calls with JWT attached
  const apiFetch = async (url, options = {}) => {
    const headers = {
      'Content-Type': 'application/json',
      ...options.headers,
    };

    const currentToken = sessionStorage.getItem('prepai_token');
    if (currentToken) {
      headers['Authorization'] = `Bearer ${currentToken}`;
    }

    const res = await fetch(url, { ...options, headers });
    const data = await res.json();

    if (!res.ok) {
      throw new Error(data.error || 'An error occurred');
    }
    return data;
  };

  // Load user profile on mount if token exists in active session
  useEffect(() => {
    const fetchMe = async () => {
      if (!token) {
        setLoading(false);
        return;
      }
      try {
        const data = await apiFetch('/api/auth/me');
        setUser(data.user);
      } catch (err) {
        console.warn('Failed to verify token:', err.message);
        logout();
      } finally {
        setLoading(false);
      }
    };

    fetchMe();
  }, [token]);

  // Step 1: Login request (validates credentials and requests OTP)
  const login = async (email, password) => {
    const data = await apiFetch('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });

    // If OTP is required, return response so Login component can display OTP input
    if (data.otpRequired) {
      return data;
    }

    if (data.token) {
      sessionStorage.setItem('prepai_token', data.token);
      localStorage.setItem('prepai_token', data.token);
      setToken(data.token);
      setUser(data.user);
    }
    return data;
  };

  // Forgot Password: Step 1 - Request OTP
  const forgotPassword = async (email) => {
    return await apiFetch('/api/auth/forgot-password', {
      method: 'POST',
      body: JSON.stringify({ email }),
    });
  };

  // Forgot Password: Step 2 - Verify OTP & Set New Password
  const resetPassword = async (email, otp, newPassword) => {
    return await apiFetch('/api/auth/reset-password', {
      method: 'POST',
      body: JSON.stringify({ email, otp, newPassword }),
    });
  };

  // Step 2: Verify OTP and establish session
  const verifyOtp = async (email, otp) => {
    const data = await apiFetch('/api/auth/verify-otp', {
      method: 'POST',
      body: JSON.stringify({ email, otp }),
    });

    if (data.token) {
      sessionStorage.setItem('prepai_token', data.token);
      localStorage.setItem('prepai_token', data.token);
      setToken(data.token);
      setUser(data.user);
    }
    return data;
  };

  // Resend OTP code with cooldown
  const resendOtp = async (email) => {
    const data = await apiFetch('/api/auth/resend-otp', {
      method: 'POST',
      body: JSON.stringify({ email }),
    });
    return data;
  };

  const register = async (name, email, password) => {
    const data = await apiFetch('/api/auth/register', {
      method: 'POST',
      body: JSON.stringify({ name, email, password }),
    });

    // Do NOT automatically log in. Newly registered users must log in with email OTP first!
    return data;
  };

  const logout = () => {
    sessionStorage.removeItem('prepai_token');
    localStorage.removeItem('prepai_token');
    setToken('');
    setUser(null);
  };

  const updateApiKey = async (apiKey) => {
    const data = await apiFetch('/api/auth/api-key', {
      method: 'PUT',
      body: JSON.stringify({ apiKey }),
    });
    setUser(data.user);
    return data;
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        loading,
        login,
        verifyOtp,
        resendOtp,
        register,
        forgotPassword,
        resetPassword,
        logout,
        updateApiKey,
        apiFetch,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
