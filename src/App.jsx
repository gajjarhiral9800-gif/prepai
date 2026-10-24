import React, { useState, useEffect } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import Login from './components/Auth/Login';
import Register from './components/Auth/Register';
import Dashboard from './components/Dashboard/Dashboard';
import MockInterview from './components/Interview/MockInterview';
import ResumeAnalyzer from './components/Resume/ResumeAnalyzer';
import QuizGenerator from './components/Quiz/QuizGenerator';
import StarBuilder from './components/StarBuilder/StarBuilder';
import ApiKeySettings from './components/Settings/ApiKeySettings';
import AdminPanel from './components/Admin/AdminPanel';
import UserProfileModal from './components/Profile/UserProfileModal';
import StudyHub from './components/Resources/StudyHub';
import PerformanceCompare from './components/Performance/PerformanceCompare';

import {
  Sparkles,
  LayoutDashboard,
  MessageSquare,
  FileText,
  Award,
  LogOut,
  Key,
  User,
  Menu,
  X,
  ShieldCheck,
  BookOpen,
  TrendingUp
} from 'lucide-react';
import './App.css';

function MainApp() {
  const { user, token, loading, logout } = useAuth();
  const [activeTab, setActiveTab] = useState('dashboard');
  const [authView, setAuthView] = useState('login'); // 'login' or 'register'
  const [initialEmail, setInitialEmail] = useState('');
  const [authSuccessMsg, setAuthSuccessMsg] = useState('');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);

  // Admin user is strictly locked to 'admin' (Admin Management Panel only)
  useEffect(() => {
    if (user && user.role === 'admin' && activeTab !== 'admin') {
      setActiveTab('admin');
    }
  }, [user, activeTab]);

  if (loading) {
    return (
      <div className="full-screen-loading">
        <div className="spinner-large"></div>
        <p>Loading PrepAI Platform...</p>
      </div>
    );
  }

  // Unauthenticated State: Users MUST log in before accessing the home page / dashboard
  if (!token || !user) {
    return (
      <div className="auth-wrapper">
        <div className="auth-container">
          {authView === 'login' ? (
            <Login
              onSwitchToRegister={() => {
                setAuthView('register');
                setAuthSuccessMsg('');
              }}
              prefilledEmail={initialEmail}
              initialSuccessMsg={authSuccessMsg}
            />
          ) : (
            <Register
              onSwitchToLogin={() => {
                setAuthView('login');
                setAuthSuccessMsg('');
              }}
              onRegisterSuccess={(registeredEmail, successMessage) => {
                setInitialEmail(registeredEmail);
                setAuthSuccessMsg(
                  successMessage ||
                    'Account created successfully! Please log in with your credentials to verify your account.'
                );
                setAuthView('login');
              }}
            />
          )}
        </div>
      </div>
    );
  }

  const isAdmin = user.role === 'admin';

  return (
    <div className="app-shell">
      {/* Top Navbar */}
      <header className="navbar">
        <div className="nav-brand" onClick={() => !isAdmin && setActiveTab('dashboard')}>
          <div className="brand-logo" style={isAdmin ? { background: 'linear-gradient(135deg, #ef4444, #dc2626)' } : {}}>
            <Sparkles size={22} className="logo-sparkle" />
          </div>
          <span className="brand-name">PrepAI</span>
          <span className={`brand-badge ${isAdmin ? 'role-admin' : ''}`}>
            {isAdmin ? 'ADMIN' : 'PRO'}
          </span>
        </div>

        {/* Desktop Nav Tabs */}
        <nav className={`nav-links ${mobileMenuOpen ? 'mobile-open' : ''}`}>
          {isAdmin ? (
            /* Admin can access ONLY Admin Management Panel */
            <div
              className="nav-item active"
              style={{
                color: '#fca5a5',
                background: 'rgba(239, 68, 68, 0.2)',
                border: '1px solid rgba(239, 68, 68, 0.4)',
                cursor: 'default',
                fontWeight: 600,
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.5rem'
              }}
            >
              <ShieldCheck size={18} /> Admin Management Console
            </div>
          ) : (
            /* Student Navigation Links */
            <>
              <button
                className={`nav-item ${activeTab === 'dashboard' ? 'active' : ''}`}
                onClick={() => { setActiveTab('dashboard'); setMobileMenuOpen(false); }}
              >
                <LayoutDashboard size={18} /> Dashboard
              </button>

              <button
                className={`nav-item ${activeTab === 'interview' ? 'active' : ''}`}
                onClick={() => { setActiveTab('interview'); setMobileMenuOpen(false); }}
              >
                <MessageSquare size={18} /> Mock Interview
              </button>

              <button
                className={`nav-item ${activeTab === 'quiz' ? 'active' : ''}`}
                onClick={() => { setActiveTab('quiz'); setMobileMenuOpen(false); }}
              >
                <Award size={18} /> Tech Quiz
              </button>

              <button
                className={`nav-item ${activeTab === 'resume' ? 'active' : ''}`}
                onClick={() => { setActiveTab('resume'); setMobileMenuOpen(false); }}
              >
                <FileText size={18} /> Resume ATS
              </button>

              <button
                className={`nav-item ${activeTab === 'star' ? 'active' : ''}`}
                onClick={() => { setActiveTab('star'); setMobileMenuOpen(false); }}
              >
                <Sparkles size={18} /> STAR Builder
              </button>

              <button
                className={`nav-item ${activeTab === 'study' ? 'active' : ''}`}
                onClick={() => { setActiveTab('study'); setMobileMenuOpen(false); }}
              >
                <BookOpen size={18} /> Study Hub
              </button>

              <button
                className={`nav-item ${activeTab === 'compare' ? 'active' : ''}`}
                onClick={() => { setActiveTab('compare'); setMobileMenuOpen(false); }}
              >
                <TrendingUp size={18} /> Performance
              </button>

              <button
                className={`nav-item ${activeTab === 'settings' ? 'active' : ''}`}
                onClick={() => { setActiveTab('settings'); setMobileMenuOpen(false); }}
              >
                <Key size={18} /> Settings
              </button>
            </>
          )}
        </nav>

        {/* User Profile & Actions */}
        <div className="nav-user-area">
          <div 
            className={`user-profile ${isAdmin ? '' : 'clickable-profile'}`}
            onClick={() => !isAdmin && setIsProfileModalOpen(true)}
            title={isAdmin ? "System Administrator Account (hiral2005gajjar@gmail.com)" : "Click to view full Activity & Performance History"}
          >
            <div className="avatar" style={isAdmin ? { background: 'linear-gradient(135deg, #ef4444, #991b1b)' } : {}}>
              {user.name ? user.name.charAt(0).toUpperCase() : 'U'}
            </div>
            <span className="user-name">{user.name}</span>
          </div>

          <button className="btn-logout" onClick={logout} title="Log Out">
            <LogOut size={18} />
          </button>

          {!isAdmin && (
            <button 
              className="mobile-toggle"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            >
              {mobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
            </button>
          )}
        </div>
      </header>

      {/* Main Content Body: Admins can access ONLY the Admin Panel */}
      <main className="main-content">
        {isAdmin ? (
          <AdminPanel />
        ) : (
          <>
            {activeTab === 'dashboard' && <Dashboard setActiveTab={setActiveTab} />}
            {activeTab === 'interview' && <MockInterview />}
            {activeTab === 'resume' && <ResumeAnalyzer />}
            {activeTab === 'quiz' && <QuizGenerator />}
            {activeTab === 'star' && <StarBuilder />}
            {activeTab === 'study' && <StudyHub />}
            {activeTab === 'compare' && <PerformanceCompare setActiveTab={setActiveTab} />}
            {activeTab === 'settings' && <ApiKeySettings />}
          </>
        )}
      </main>

      {/* User Activity Profile Modal (Students only) */}
      {!isAdmin && (
        <UserProfileModal
          isOpen={isProfileModalOpen}
          onClose={() => setIsProfileModalOpen(false)}
        />
      )}

      {/* App Footer */}
      <footer className="app-footer">
        <p>PrepAI — AI Interview & Career Readiness Engine • Secured with JWT Authentication</p>
      </footer>
    </div>
  );
}

function App() {
  return (
    <AuthProvider>
      <MainApp />
    </AuthProvider>
  );
}

export default App;
