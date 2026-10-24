
import React, {
  createContext,
  useContext,
  useState,
  useEffect,
} from 'react';

const AuthContext = createContext();

const API_URL = 'https://prepai-2nwb.onrender.com';

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(
    () => sessionStorage.getItem('prepai_token') || ''
  );
  const [loading, setLoading] = useState(true);

  // All API requests go to the Render backend.
  const apiFetch = async (url, options = {}) => {
    const headers = {
      'Content-Type': 'application/json',
      ...options.headers,
    };

    const currentToken = sessionStorage.getItem('prepai_token');

    if (currentToken) {
      headers.Authorization = `Bearer ${currentToken}`;
    }

    // Prevent relative URLs from accidentally targeting Netlify.
    const fullUrl = url.startsWith('http')
      ? url
      : `${API_URL}${url.startsWith('/') ? '' : '/'}${url}`;

    const res = await fetch(fullUrl, {
      ...options,
      headers,
    });

    const contentType = res.headers.get('content-type') || '';

    if (!contentType.includes('application/json')) {
      throw new Error(
        `Backend returned a non-JSON response (HTTP ${res.status}). Check the Render API URL.`
      );
    }

    const data = await res.json();

    if (!res.ok) {
      throw new Error(data.error || 'An error occurred');
    }

    return data;
  };

  // Verify the saved session when the app loads.
  useEffect(() => {
    let cancelled = false;

    const fetchMe = async () => {
      if (!token) {
        setLoading(false);
        return;
      }

      try {
        const data = await apiFetch('/api/auth/me');

        if (!cancelled) {
          setUser(data.user);
        }
      } catch (err) {
        console.warn('Failed to verify token:', err.message);

        if (!cancelled) {
          sessionStorage.removeItem('prepai_token');
          setToken('');
          setUser(null);
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    fetchMe();

    return () => {
      cancelled = true;
    };
  }, [token]);

  // Login
  const login = async (email, password) => {
    const data = await apiFetch('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({
        email: email.trim().toLowerCase(),
        password,
      }),
    });

    if (data.otpRequired) {
      return data;
    }

    if (data.token) {
      sessionStorage.setItem('prepai_token', data.token);
      setToken(data.token);
      setUser(data.user);
    }

    return data;
  };

  // Register
  const register = async (name, email, password) => {
    return await apiFetch('/api/auth/register', {
      method: 'POST',
      body: JSON.stringify({ name, email, password }),
    });
  };

  // Verify login OTP
  const verifyOtp = async (email, otp) => {
    const data = await apiFetch('/api/auth/verify-otp', {
      method: 'POST',
      body: JSON.stringify({ email, otp }),
    });

    if (data.token) {
      sessionStorage.setItem('prepai_token', data.token);
      setToken(data.token);
      setUser(data.user);
    }

    return data;
  };

  // Resend OTP
  const resendOtp = async (email) => {
    return await apiFetch('/api/auth/resend-otp', {
      method: 'POST',
      body: JSON.stringify({ email }),
    });
  };

  // Forgot password
  const forgotPassword = async (email) => {
    return await apiFetch('/api/auth/forgot-password', {
      method: 'POST',
      body: JSON.stringify({ email }),
    });
  };

  // Reset password
  const resetPassword = async (email, otp, newPassword) => {
    return await apiFetch('/api/auth/reset-password', {
      method: 'POST',
      body: JSON.stringify({ email, otp, newPassword }),
    });
  };

  // Logout
  const logout = () => {
    sessionStorage.removeItem('prepai_token');
    setToken('');
    setUser(null);
  };

  // Update API key
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
