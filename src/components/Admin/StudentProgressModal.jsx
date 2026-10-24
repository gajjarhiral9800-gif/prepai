import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { 
  X, 
  Mail, 
  Calendar, 
  Trophy, 
  Award, 
  MessageSquare, 
  FileText, 
  Sparkles, 
  TrendingUp, 
  Clock, 
  ChevronDown, 
  ChevronUp, 
  CheckCircle2, 
  AlertCircle
} from 'lucide-react';

function StudentProgressModal({ studentId, isOpen, onClose }) {
  const { apiFetch } = useAuth();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [activeFilter, setActiveFilter] = useState('all');
  const [expandedSessionId, setExpandedSessionId] = useState(null);

  useEffect(() => {
    if (isOpen && studentId) {
      setLoading(true);
      setError('');
      apiFetch(`/api/admin/users/${studentId}/progress`)
        .then(res => setData(res))
        .catch(err => {
          console.error('Failed to load student progress:', err);
          setError(err.message || 'Failed to load student progress');
        })
        .finally(() => setLoading(false));
    }
  }, [isOpen, studentId]);

  if (!isOpen) return null;

  const student = data?.student;
  const summary = data?.summary || {
    totalSessions: 0,
    totalQuizzes: 0,
    avgQuizScore: 0,
    highestQuizScore: 0,
    totalInterviews: 0,
    avgInterviewScore: 0,
    highestInterviewScore: 0,
    totalResumes: 0,
    avgResumeScore: 0,
    totalStars: 0,
    overallScore: 0,
    readinessTier: 'Needs Practice',
    readinessBadge: 'developing'
  };

  const sessions = data?.sessions || [];
  const timeline = data?.timeline || [];
  const insights = data?.insights || { keyStrengths: [], areasForImprovement: [] };

  const filteredSessions = sessions.filter(s => {
    if (activeFilter === 'all') return true;
    return s.type === activeFilter;
  });

  const toggleExpand = (id) => {
    setExpandedSessionId(prev => prev === id ? null : id);
  };

  return (
    <div className="modal-backdrop" onClick={onClose} style={{ zIndex: 1200 }}>
      <div 
        className="modal-card" 
        onClick={(e) => e.stopPropagation()} 
        style={{ maxWidth: '900px', width: '92%', maxHeight: '90vh', display: 'flex', flexDirection: 'column' }}
      >
        {/* Modal Header */}
        <div className="modal-header" style={{ borderBottom: '1px solid rgba(255, 255, 255, 0.08)', paddingBottom: '1.25rem' }}>
          <div className="profile-banner-info">
            <div 
              className="avatar-large" 
              style={{ background: 'linear-gradient(135deg, #6366f1, #3b82f6)' }}
            >
              {student?.name ? student.name.charAt(0).toUpperCase() : 'S'}
            </div>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', flexWrap: 'wrap' }}>
                <h2 style={{ margin: 0, fontSize: '1.35rem' }}>{student?.name || 'Student Account'}</h2>
                <span 
                  className="badge-pill"
                  style={{ 
                    background: summary.overallScore >= 80 ? 'rgba(16, 185, 129, 0.2)' : summary.overallScore >= 60 ? 'rgba(56, 189, 248, 0.2)' : 'rgba(245, 158, 11, 0.2)',
                    borderColor: summary.overallScore >= 80 ? '#10b981' : summary.overallScore >= 60 ? '#38bdf8' : '#f59e0b',
                    color: summary.overallScore >= 80 ? '#34d399' : summary.overallScore >= 60 ? '#38bdf8' : '#fbbf24',
                    fontWeight: 700
                  }}
                >
                  {summary.readinessTier}
                </span>
              </div>
              <p className="user-email-text" style={{ margin: '0.25rem 0 0', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <Mail size={13} /> {student?.email}
                {student?.createdAt && (
                  <span style={{ color: '#64748b', marginLeft: '0.5rem', display: 'inline-flex', alignItems: 'center', gap: '0.25rem' }}>
                    <Calendar size={12} /> Registered {new Date(student.createdAt).toLocaleDateString()}
                  </span>
                )}
              </p>
            </div>
          </div>

          <button className="btn-close" onClick={onClose} title="Close window">
            <X size={20} />
          </button>
        </div>

        {/* Modal Body */}
        <div className="modal-body" style={{ overflowY: 'auto', padding: '1.5rem', flex: 1 }}>
          {error && (
            <div className="alert-error" style={{ marginBottom: '1.25rem' }}>
              {error}
            </div>
          )}

          {loading ? (
            <div style={{ textAlign: 'center', padding: '3.5rem 1rem' }}>
              <div className="spinner-large" style={{ margin: '0 auto 1rem' }}></div>
              <p style={{ color: 'var(--text-muted)' }}>Retrieving student exam history & progress metrics...</p>
            </div>
          ) : (
            <>
              {/* Metric Highlights Grid */}
              <div className="profile-stats-grid" style={{ marginBottom: '1.75rem' }}>
                {/* Quizzes */}
                <div className="stat-box cyan">
                  <Award size={22} />
                  <div>
                    <h4>{summary.totalQuizzes}</h4>
                    <span>Quizzes Taken</span>
                    <div style={{ fontSize: '0.72rem', color: '#7dd3fc', marginTop: '0.2rem' }}>
                      Avg: {summary.avgQuizScore}% | Max: {summary.highestQuizScore}%
                    </div>
                  </div>
                </div>

                {/* Interviews */}
                <div className="stat-box purple">
                  <MessageSquare size={22} />
                  <div>
                    <h4>{summary.totalInterviews}</h4>
                    <span>Mock Interviews</span>
                    <div style={{ fontSize: '0.72rem', color: '#c4b5fd', marginTop: '0.2rem' }}>
                      Avg: {summary.avgInterviewScore}% | Max: {summary.highestInterviewScore}%
                    </div>
                  </div>
                </div>

                {/* Resumes */}
                <div className="stat-box pink">
                  <FileText size={22} />
                  <div>
                    <h4>{summary.totalResumes}</h4>
                    <span>ATS Resume Scans</span>
                    <div style={{ fontSize: '0.72rem', color: '#f472b6', marginTop: '0.2rem' }}>
                      Avg Match: {summary.avgResumeScore}%
                    </div>
                  </div>
                </div>

                {/* Overall Score */}
                <div className="stat-box amber">
                  <Trophy size={22} />
                  <div>
                    <h4>{summary.overallScore}%</h4>
                    <span>Exam Average</span>
                    <div style={{ fontSize: '0.72rem', color: '#fcd34d', marginTop: '0.2rem' }}>
                      Placement Readiness
                    </div>
                  </div>
                </div>
              </div>

              {/* Score Progression Trajectory Chart */}
              {timeline.length > 0 && (
                <div style={{ 
                  background: 'rgba(255, 255, 255, 0.02)', 
                  borderRadius: '12px', 
                  border: '1px solid rgba(255, 255, 255, 0.08)',
                  padding: '1.25rem',
                  marginBottom: '1.75rem'
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                    <h3 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '1rem', margin: 0, color: '#f8fafc' }}>
                      <TrendingUp size={16} className="text-cyan" /> Student Exam Score Trajectory ({timeline.length} Recorded Tests)
                    </h3>
                    <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Chronological progression</span>
                  </div>

                  <div style={{ width: '100%', height: '140px', display: 'flex', alignItems: 'flex-end', gap: '0.75rem', paddingBottom: '0.5rem', borderBottom: '1px dashed rgba(255, 255, 255, 0.1)', overflowX: 'auto' }}>
                    {timeline.map((item, idx) => {
                      const score = item.score;
                      const height = Math.max((score / 100) * 110, 15);
                      const barColor = score >= 80 
                        ? 'linear-gradient(180deg, #10b981 0%, #059669 100%)' 
                        : score >= 60 
                        ? 'linear-gradient(180deg, #38bdf8 0%, #0284c7 100%)' 
                        : 'linear-gradient(180deg, #f59e0b 0%, #d97706 100%)';

                      return (
                        <div key={item.id || idx} style={{ flex: '0 0 55px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.3rem' }}>
                          <span style={{ fontSize: '0.75rem', fontWeight: 700, color: score >= 80 ? '#34d399' : score >= 60 ? '#38bdf8' : '#fbbf24' }}>
                            {score}%
                          </span>
                          <div 
                            style={{ 
                              width: '100%', 
                              height: `${height}px`, 
                              background: barColor, 
                              borderRadius: '6px 6px 2px 2px',
                              transition: 'height 0.4s ease'
                            }}
                            title={`${item.title} (${score}%) on ${item.date}`}
                          />
                          <span style={{ fontSize: '0.68rem', color: '#64748b', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '55px' }}>
                            {item.type.toUpperCase()}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Insights: AI-flagged Strengths & Areas for Improvement */}
              {(insights.keyStrengths?.length > 0 || insights.areasForImprovement?.length > 0) && (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1rem', marginBottom: '1.75rem' }}>
                  {insights.keyStrengths?.length > 0 && (
                    <div style={{ background: 'rgba(16, 185, 129, 0.05)', border: '1px solid rgba(16, 185, 129, 0.2)', borderRadius: '10px', padding: '1rem' }}>
                      <h4 style={{ color: '#34d399', fontSize: '0.88rem', margin: '0 0 0.5rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                        <CheckCircle2 size={15} /> Observed Candidate Strengths
                      </h4>
                      <ul style={{ margin: 0, paddingLeft: '1.2rem', fontSize: '0.82rem', color: '#cbd5e1', lineHeight: '1.5' }}>
                        {insights.keyStrengths.map((str, idx) => (
                          <li key={idx} style={{ marginBottom: '0.3rem' }}>{str}</li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {insights.areasForImprovement?.length > 0 && (
                    <div style={{ background: 'rgba(239, 68, 68, 0.05)', border: '1px solid rgba(239, 68, 68, 0.2)', borderRadius: '10px', padding: '1rem' }}>
                      <h4 style={{ color: '#f87171', fontSize: '0.88rem', margin: '0 0 0.5rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                        <AlertCircle size={15} /> Recommended Training Focus
                      </h4>
                      <ul style={{ margin: 0, paddingLeft: '1.2rem', fontSize: '0.82rem', color: '#cbd5e1', lineHeight: '1.5' }}>
                        {insights.areasForImprovement.map((imp, idx) => (
                          <li key={idx} style={{ marginBottom: '0.3rem' }}>{imp}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              )}

              {/* Complete Practice & Exam Session History Log */}
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.75rem', marginBottom: '1rem' }}>
                  <h3 style={{ fontSize: '1.05rem', margin: 0, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <Clock size={16} className="text-purple" /> Full Practice Session History ({sessions.length})
                  </h3>

                  {/* Filter Pills */}
                  <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap' }}>
                    {['all', 'quiz', 'interview', 'resume', 'star'].map(type => (
                      <button
                        key={type}
                        onClick={() => setActiveFilter(type)}
                        style={{
                          background: activeFilter === type ? 'rgba(99, 102, 241, 0.25)' : 'rgba(255, 255, 255, 0.04)',
                          border: activeFilter === type ? '1px solid #6366f1' : '1px solid rgba(255, 255, 255, 0.08)',
                          color: activeFilter === type ? '#a5b4fc' : '#94a3b8',
                          padding: '0.25rem 0.65rem',
                          borderRadius: '6px',
                          fontSize: '0.75rem',
                          cursor: 'pointer',
                          fontWeight: activeFilter === type ? 600 : 400
                        }}
                      >
                        {type.toUpperCase()}
                      </button>
                    ))}
                  </div>
                </div>

                {filteredSessions.length === 0 ? (
                  <div className="empty-state" style={{ padding: '2.5rem 1rem' }}>
                    <Clock size={32} className="empty-icon" />
                    <p>No practice sessions recorded under this filter.</p>
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                    {filteredSessions.map((sess) => {
                      const isExpanded = expandedSessionId === sess.id;
                      const sScore = sess.score || 0;

                      return (
                        <div 
                          key={sess.id}
                          style={{
                            background: 'rgba(255, 255, 255, 0.02)',
                            borderRadius: '10px',
                            border: '1px solid rgba(255, 255, 255, 0.07)',
                            overflow: 'hidden',
                            transition: 'border-color 0.2s ease'
                          }}
                        >
                          <div 
                            style={{ 
                              display: 'flex', 
                              justifyContent: 'space-between', 
                              alignItems: 'center', 
                              padding: '0.85rem 1.15rem',
                              cursor: 'pointer',
                              background: isExpanded ? 'rgba(255, 255, 255, 0.04)' : 'transparent'
                            }}
                            onClick={() => toggleExpand(sess.id)}
                          >
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                              <div className="history-type-badge" style={{ margin: 0 }}>
                                {sess.type === 'interview' && <MessageSquare size={14} />}
                                {sess.type === 'quiz' && <Award size={14} />}
                                {sess.type === 'resume' && <FileText size={14} />}
                                {sess.type === 'star' && <Sparkles size={14} />}
                                <span>{sess.type.toUpperCase()}</span>
                              </div>
                              <div>
                                <h4 style={{ margin: 0, fontSize: '0.92rem', color: '#f8fafc' }}>{sess.title}</h4>
                                <span style={{ fontSize: '0.75rem', color: '#64748b' }}>
                                  {sess.timestamp ? new Date(sess.timestamp).toLocaleString() : 'Recent'}
                                </span>
                              </div>
                            </div>

                            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                              <div style={{ textAlign: 'right' }}>
                                <span style={{ 
                                  fontSize: '1rem', 
                                  fontWeight: 700, 
                                  color: sScore >= 80 ? '#34d399' : sScore >= 60 ? '#38bdf8' : '#fbbf24' 
                                }}>
                                  {sScore}%
                                </span>
                                <span style={{ display: 'block', fontSize: '0.68rem', color: '#64748b' }}>Score</span>
                              </div>

                              <button 
                                style={{ 
                                  background: 'transparent', 
                                  border: 'none', 
                                  color: 'var(--text-muted)', 
                                  cursor: 'pointer',
                                  padding: '0.2rem'
                                }}
                              >
                                {isExpanded ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
                              </button>
                            </div>
                          </div>

                          {/* Expanded Details Panel */}
                          {isExpanded && (
                            <div style={{ 
                              padding: '1rem 1.25rem', 
                              borderTop: '1px solid rgba(255, 255, 255, 0.05)', 
                              background: 'rgba(0, 0, 0, 0.2)',
                              fontSize: '0.85rem'
                            }}>
                              {/* Quizzes Data */}
                              {sess.type === 'quiz' && sess.data && (
                                <div>
                                  <div style={{ display: 'flex', gap: '1.5rem', marginBottom: '0.75rem', color: 'var(--text-muted)' }}>
                                    <span><strong>Topic:</strong> {sess.data.topic || 'General'}</span>
                                    <span><strong>Correct Answers:</strong> {sess.data.correct} / {sess.data.total}</span>
                                    <span><strong>Accuracy:</strong> {Math.round((sess.data.correct / sess.data.total) * 100)}%</span>
                                  </div>
                                </div>
                              )}

                              {/* Mock Interview Data */}
                              {sess.type === 'interview' && sess.data && (
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                                  {sess.data.questions?.map((q, qIdx) => {
                                    const evalObj = sess.data.evaluations?.[qIdx] || sess.data.evaluations?.[String(qIdx)];
                                    return (
                                      <div key={q.id || qIdx} style={{ background: 'rgba(255, 255, 255, 0.03)', padding: '0.75rem 1rem', borderRadius: '8px' }}>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.3rem' }}>
                                          <strong style={{ color: '#a78bfa' }}>Q{qIdx + 1}: {q.question}</strong>
                                          {evalObj && <strong style={{ color: '#34d399' }}>{evalObj.score}%</strong>}
                                        </div>
                                        {evalObj && (
                                          <div style={{ fontSize: '0.8rem', color: '#94a3b8', marginTop: '0.4rem' }}>
                                            <p style={{ margin: '0 0 0.3rem' }}><strong>AI Feedback:</strong> {evalObj.feedback}</p>
                                            {evalObj.strengths?.length > 0 && (
                                              <p style={{ margin: '0 0 0.2rem', color: '#86efac' }}>
                                                <strong>Strengths:</strong> {evalObj.strengths.join(', ')}
                                              </p>
                                            )}
                                          </div>
                                        )}
                                      </div>
                                    );
                                  })}
                                </div>
                              )}

                              {/* Resume ATS Data */}
                              {sess.type === 'resume' && sess.data && (
                                <div>
                                  <p style={{ margin: '0 0 0.5rem', color: '#cbd5e1' }}>{sess.data.summary}</p>
                                  {sess.data.foundKeywords?.length > 0 && (
                                    <div style={{ marginBottom: '0.5rem' }}>
                                      <span style={{ color: '#34d399', fontWeight: 600 }}>Keywords Found: </span>
                                      <span style={{ color: '#94a3b8' }}>{sess.data.foundKeywords.join(', ')}</span>
                                    </div>
                                  )}
                                  {sess.data.missingKeywords?.length > 0 && (
                                    <div>
                                      <span style={{ color: '#f87171', fontWeight: 600 }}>Missing Industry Keywords: </span>
                                      <span style={{ color: '#94a3b8' }}>{sess.data.missingKeywords.join(', ')}</span>
                                    </div>
                                  )}
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

export default StudentProgressModal;
