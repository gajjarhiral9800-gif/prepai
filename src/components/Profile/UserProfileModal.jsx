import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { 
  X, 
  User, 
  Mail, 
  ShieldCheck, 
  Calendar, 
  Trophy, 
  MessageSquare, 
  Award, 
  FileText, 
  Sparkles, 
  Clock,
  Activity,
  TrendingUp
} from 'lucide-react';

function UserProfileModal({ isOpen, onClose }) {
  const { user, apiFetch } = useAuth();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (isOpen && user) {
      setLoading(true);
      apiFetch('/api/user/dashboard')
        .then(res => setData(res))
        .catch(err => console.error('Failed to load user profile metrics:', err))
        .finally(() => setLoading(false));
    }
  }, [isOpen, user]);

  if (!isOpen || !user) return null;

  const metrics = data?.metrics || {
    totalInterviews: 0,
    totalQuizzes: 0,
    totalResumes: 0,
    totalStarStories: 0,
    avgInterviewScore: 0,
    avgQuizScore: 0,
    practiceStreakDays: 1
  };

  const sessions = data?.recentSessions || [];

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-card" onClick={(e) => e.stopPropagation()}>
        {/* Modal Header */}
        <div className="modal-header">
          <div className="profile-banner-info">
            <div className="avatar-large">
              {user.name ? user.name.charAt(0).toUpperCase() : 'U'}
            </div>
            <div>
              <h2>{user.name}</h2>
              <p className="user-email-text">
                <Mail size={14} /> {user.email}
              </p>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <span className={`role-badge ${user.role === 'admin' ? 'role-admin' : 'role-student'}`}>
              <ShieldCheck size={14} /> {user.role === 'admin' ? 'ADMINISTRATOR' : 'STUDENT'}
            </span>
            <button className="btn-close" onClick={onClose}>
              <X size={20} />
            </button>
          </div>
        </div>

        {/* Account Details & Metrics Grid */}
        <div className="modal-body">
          <div className="profile-stats-grid">
            <div className="stat-box purple">
              <MessageSquare size={20} />
              <div>
                <h4>{metrics.totalInterviews}</h4>
                <span>Interviews</span>
              </div>
            </div>

            <div className="stat-box cyan">
              <Award size={20} />
              <div>
                <h4>{metrics.totalQuizzes}</h4>
                <span>Quizzes</span>
              </div>
            </div>

            <div className="stat-box pink">
              <FileText size={20} />
              <div>
                <h4>{metrics.totalResumes}</h4>
                <span>Resumes Scanned</span>
              </div>
            </div>

            <div className="stat-box amber">
              <Trophy size={20} />
              <div>
                <h4>{metrics.avgInterviewScore || metrics.avgQuizScore || 85}%</h4>
                <span>Avg Performance</span>
              </div>
            </div>
          </div>

          {/* SVG Visual Performance Growth Chart */}
          {sessions.length > 0 && (
            <div style={{ marginTop: '1.75rem', padding: '1.25rem', background: 'rgba(255, 255, 255, 0.02)', borderRadius: '12px', border: '1px solid rgba(255, 255, 255, 0.08)' }}>
              <h3 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '1.05rem', marginBottom: '1rem', color: '#f8fafc' }}>
                <TrendingUp size={18} className="text-purple" /> Score Trajectory & Performance Growth
              </h3>

              <div style={{ width: '100%', height: '140px', display: 'flex', alignItems: 'flex-end', gap: '1rem', paddingBottom: '0.5rem', borderBottom: '1px dashed rgba(255, 255, 255, 0.1)' }}>
                {sessions.slice(-7).map((sess, idx) => {
                  const sScore = typeof sess.score === 'number' ? sess.score : 80;
                  const barHeight = Math.max((sScore / 100) * 110, 15);
                  const barColor = sScore >= 80 ? 'linear-gradient(180deg, #10b981 0%, #059669 100%)' : sScore >= 60 ? 'linear-gradient(180deg, #6366f1 0%, #4f46e5 100%)' : 'linear-gradient(180deg, #f59e0b 0%, #d97706 100%)';

                  return (
                    <div key={sess.id || idx} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.3rem' }}>
                      <span style={{ fontSize: '0.75rem', fontWeight: 700, color: sScore >= 80 ? '#10b981' : sScore >= 60 ? '#818cf8' : '#f59e0b' }}>
                        {sScore}%
                      </span>
                      <div 
                        style={{ 
                          width: '100%', 
                          maxHeight: `${barHeight}px`,
                          height: `${barHeight}px`, 
                          background: barColor, 
                          borderRadius: '6px 6px 2px 2px',
                          transition: 'height 0.5s ease'
                        }} 
                        title={`${sess.title} (${sScore}%)`}
                      />
                      <span style={{ fontSize: '0.7rem', color: '#64748b', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '55px' }}>
                        {sess.type.toUpperCase()}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Detailed Activity History Feed */}
          <div style={{ marginTop: '1.75rem' }}>
            <h3 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '1.1rem', marginBottom: '1rem' }}>
              <Activity size={18} className="text-cyan" /> Complete Activity & Practice Log
            </h3>

            {loading ? (
              <div style={{ textAlign: 'center', padding: '2rem' }}>
                <span className="spinner"></span>
              </div>
            ) : sessions.length > 0 ? (
              <div className="modal-history-list">
                {sessions.map((sess) => (
                  <div key={sess.id} className="history-item">
                    <div className="history-info">
                      <div className="history-type-badge">
                        {sess.type === 'interview' && <MessageSquare size={14} />}
                        {sess.type === 'quiz' && <Award size={14} />}
                        {sess.type === 'resume' && <FileText size={14} />}
                        {sess.type === 'star' && <Sparkles size={14} />}
                        <span>{sess.type.toUpperCase()}</span>
                      </div>
                      <div>
                        <h4 className="history-title">{sess.title}</h4>
                        <span className="history-time">
                          <Clock size={12} /> {new Date(sess.timestamp).toLocaleString()}
                        </span>
                      </div>
                    </div>
                    <div className="history-score">
                      <span className="score-num">{sess.score}%</span>
                      <span className="score-label">Score</span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="empty-state" style={{ padding: '2rem 1rem' }}>
                <Clock size={36} className="empty-icon" />
                <p>No activity sessions recorded yet. Start practicing in Mock Interviews or Quizzes!</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default UserProfileModal;
