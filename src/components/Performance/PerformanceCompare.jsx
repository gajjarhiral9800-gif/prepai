import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { 
  Trophy, 
  Award, 
  TrendingUp, 
  Target, 
  ArrowRight, 
  BarChart2, 
  RefreshCw,
  Search,
  MessageSquare
} from 'lucide-react';

function PerformanceCompare({ setActiveTab }) {
  const { user, apiFetch } = useAuth();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchFilter, setSearchFilter] = useState('');

  const fetchComparison = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await apiFetch('/api/user/performance-compare');
      setData(res);
    } catch (err) {
      console.error('Failed to load performance comparison:', err);
      setError(err.message || 'Failed to load peer comparison data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchComparison();
  }, []);

  const userMetrics = data?.userMetrics || {
    rank: 1,
    totalStudents: 1,
    percentile: 95,
    totalExams: 0,
    totalQuizzes: 0,
    totalInterviews: 0,
    avgQuizScore: 0,
    avgInterviewScore: 0,
    overallAvgScore: 0,
    practiceStreak: 1
  };

  const cohortMetrics = data?.cohortMetrics || {
    totalStudents: 1,
    avgQuizScore: 75,
    avgInterviewScore: 80,
    overallAvgScore: 76,
    totalExams: 0
  };

  const domainComparison = data?.domainComparison || [];
  const leaderboard = data?.leaderboard || [];

  const filteredLeaderboard = leaderboard.filter(item => 
    item.name.toLowerCase().includes(searchFilter.toLowerCase())
  );

  const scoreDiff = userMetrics.overallAvgScore - cohortMetrics.overallAvgScore;
  const quizDiff = userMetrics.avgQuizScore - cohortMetrics.avgQuizScore;
  const interviewDiff = userMetrics.avgInterviewScore - cohortMetrics.avgInterviewScore;

  return (
    <div className="module-container">
      {/* Header Banner */}
      <div className="module-header">
        <div className="badge-pill">
          <TrendingUp size={14} /> Peer Benchmarking & Leaderboard
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem' }}>
          <div>
            <h1>Student Performance & Exam Comparison</h1>
            <p>
              Compare your test scores, mock interview ratings, and technical mastery against all candidates on PrepAI.
            </p>
          </div>
          <button 
            className="btn-secondary" 
            onClick={fetchComparison}
            disabled={loading}
            style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem' }}
          >
            <RefreshCw size={15} className={loading ? 'spin-icon' : ''} /> Refresh Rankings
          </button>
        </div>
      </div>

      {error && (
        <div className="alert-error" style={{ marginBottom: '1.5rem' }}>
          {error}
        </div>
      )}

      {loading ? (
        <div style={{ textAlign: 'center', padding: '4rem 1rem' }}>
          <div className="spinner-large" style={{ margin: '0 auto 1.25rem' }}></div>
          <p style={{ color: 'var(--text-muted)' }}>Calculating peer rankings and cohort percentiles...</p>
        </div>
      ) : (
        <>
          {/* Key Standings Summary Grid */}
          <div className="metrics-grid" style={{ marginBottom: '2rem' }}>
            {/* Rank Card */}
            <div className="metric-card card-purple">
              <div className="metric-icon">
                <Trophy size={26} />
              </div>
              <div className="metric-details">
                <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.4rem' }}>
                  <h3 style={{ fontSize: '2rem' }}>#{userMetrics.rank}</h3>
                  <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>of {userMetrics.totalStudents}</span>
                </div>
                <p>Cohort Leaderboard Rank</p>
                <div style={{ marginTop: '0.4rem', fontSize: '0.75rem', color: '#c4b5fd', fontWeight: 600 }}>
                  Top {Math.max(1, 100 - userMetrics.percentile)}% Percentile Rank
                </div>
              </div>
            </div>

            {/* Overall Score Comparison Card */}
            <div className="metric-card card-indigo">
              <div className="metric-icon">
                <Target size={26} />
              </div>
              <div className="metric-details">
                <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.4rem' }}>
                  <h3 style={{ fontSize: '2rem' }}>{userMetrics.overallAvgScore}%</h3>
                  <span style={{ 
                    fontSize: '0.8rem', 
                    fontWeight: 700, 
                    color: scoreDiff >= 0 ? '#34d399' : '#f87171',
                    background: scoreDiff >= 0 ? 'rgba(52, 211, 153, 0.15)' : 'rgba(239, 68, 68, 0.15)',
                    padding: '0.15rem 0.4rem',
                    borderRadius: '4px'
                  }}>
                    {scoreDiff >= 0 ? `+${scoreDiff}%` : `${scoreDiff}%`}
                  </span>
                </div>
                <p>Your Overall Exam Score</p>
                <div style={{ marginTop: '0.4rem', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                  Cohort Average: {cohortMetrics.overallAvgScore}%
                </div>
              </div>
            </div>

            {/* Quizzes Taken & Accuracy */}
            <div className="metric-card card-cyan">
              <div className="metric-icon">
                <Award size={26} />
              </div>
              <div className="metric-details">
                <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.4rem' }}>
                  <h3 style={{ fontSize: '2rem' }}>{userMetrics.avgQuizScore}%</h3>
                  <span style={{ 
                    fontSize: '0.8rem', 
                    fontWeight: 700, 
                    color: quizDiff >= 0 ? '#34d399' : '#f87171'
                  }}>
                    {quizDiff >= 0 ? `+${quizDiff}%` : `${quizDiff}%`}
                  </span>
                </div>
                <p>Quiz Knowledge Accuracy</p>
                <div style={{ marginTop: '0.4rem', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                  {userMetrics.totalQuizzes} quizzes taken (Peer Avg: {cohortMetrics.avgQuizScore}%)
                </div>
              </div>
            </div>

            {/* Mock Interview Score */}
            <div className="metric-card card-pink">
              <div className="metric-icon">
                <MessageSquare size={26} />
              </div>
              <div className="metric-details">
                <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.4rem' }}>
                  <h3 style={{ fontSize: '2rem' }}>{userMetrics.avgInterviewScore || 'N/A'}</h3>
                  {userMetrics.avgInterviewScore > 0 && (
                    <span style={{ 
                      fontSize: '0.8rem', 
                      fontWeight: 700, 
                      color: interviewDiff >= 0 ? '#34d399' : '#f87171'
                    }}>
                      {interviewDiff >= 0 ? `+${interviewDiff}%` : `${interviewDiff}%`}
                    </span>
                  )}
                </div>
                <p>AI Mock Interview Avg</p>
                <div style={{ marginTop: '0.4rem', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                  {userMetrics.totalInterviews} sessions (Peer Avg: {cohortMetrics.avgInterviewScore}%)
                </div>
              </div>
            </div>
          </div>

          {/* Side-by-Side Benchmark Cards: You vs Cohort */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '1.5rem', marginBottom: '2.5rem' }}>
            {/* Card 1: Quiz Benchmark */}
            <div className="admin-card" style={{ padding: '1.5rem', background: 'rgba(255, 255, 255, 0.03)', border: '1px solid rgba(255, 255, 255, 0.08)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                <h3 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '1.1rem', margin: 0 }}>
                  <Award size={18} className="text-cyan" /> Tech Quizzes & Knowledge
                </h3>
                <span className="badge-pill" style={{ fontSize: '0.75rem' }}>
                  {userMetrics.totalQuizzes} Completed
                </span>
              </div>
              
              <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginBottom: '1.25rem' }}>
                Your average accuracy across conceptual technical multiple-choice exams vs all registered peers.
              </p>

              {/* Progress bars */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', marginBottom: '0.35rem' }}>
                    <span style={{ fontWeight: 600, color: '#38bdf8' }}>You ({user?.name || 'Your Score'})</span>
                    <strong style={{ color: '#38bdf8' }}>{userMetrics.avgQuizScore}%</strong>
                  </div>
                  <div style={{ height: '10px', background: 'rgba(255, 255, 255, 0.06)', borderRadius: '6px', overflow: 'hidden' }}>
                    <div 
                      style={{ 
                        height: '100%', 
                        width: `${Math.min(100, userMetrics.avgQuizScore)}%`, 
                        background: 'linear-gradient(90deg, #0284c7, #38bdf8)',
                        borderRadius: '6px',
                        transition: 'width 0.8s ease'
                      }}
                    />
                  </div>
                </div>

                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', marginBottom: '0.35rem' }}>
                    <span style={{ color: 'var(--text-muted)' }}>Class / Cohort Average</span>
                    <span style={{ color: 'var(--text-muted)' }}>{cohortMetrics.avgQuizScore}%</span>
                  </div>
                  <div style={{ height: '10px', background: 'rgba(255, 255, 255, 0.06)', borderRadius: '6px', overflow: 'hidden' }}>
                    <div 
                      style={{ 
                        height: '100%', 
                        width: `${Math.min(100, cohortMetrics.avgQuizScore)}%`, 
                        background: 'rgba(255, 255, 255, 0.25)',
                        borderRadius: '6px'
                      }}
                    />
                  </div>
                </div>
              </div>

              {setActiveTab && (
                <button 
                  className="btn-secondary" 
                  style={{ width: '100%', marginTop: '1.25rem', justifyContent: 'center', fontSize: '0.85rem' }}
                  onClick={() => setActiveTab('quiz')}
                >
                  Take another Quiz <ArrowRight size={14} />
                </button>
              )}
            </div>

            {/* Card 2: Interview Benchmark */}
            <div className="admin-card" style={{ padding: '1.5rem', background: 'rgba(255, 255, 255, 0.03)', border: '1px solid rgba(255, 255, 255, 0.08)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                <h3 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '1.1rem', margin: 0 }}>
                  <MessageSquare size={18} className="text-purple" /> AI Mock Interviews
                </h3>
                <span className="badge-pill" style={{ fontSize: '0.75rem' }}>
                  {userMetrics.totalInterviews} Completed
                </span>
              </div>

              <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginBottom: '1.25rem' }}>
                Speech clarity, technical depth, and STAR structure scores evaluated by AI vs peer candidates.
              </p>

              {/* Progress bars */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', marginBottom: '0.35rem' }}>
                    <span style={{ fontWeight: 600, color: '#a78bfa' }}>You ({user?.name || 'Your Score'})</span>
                    <strong style={{ color: '#a78bfa' }}>{userMetrics.avgInterviewScore ? `${userMetrics.avgInterviewScore}%` : 'Not Taken'}</strong>
                  </div>
                  <div style={{ height: '10px', background: 'rgba(255, 255, 255, 0.06)', borderRadius: '6px', overflow: 'hidden' }}>
                    <div 
                      style={{ 
                        height: '100%', 
                        width: `${Math.min(100, userMetrics.avgInterviewScore || 0)}%`, 
                        background: 'linear-gradient(90deg, #7c3aed, #a78bfa)',
                        borderRadius: '6px',
                        transition: 'width 0.8s ease'
                      }}
                    />
                  </div>
                </div>

                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', marginBottom: '0.35rem' }}>
                    <span style={{ color: 'var(--text-muted)' }}>Class / Cohort Average</span>
                    <span style={{ color: 'var(--text-muted)' }}>{cohortMetrics.avgInterviewScore}%</span>
                  </div>
                  <div style={{ height: '10px', background: 'rgba(255, 255, 255, 0.06)', borderRadius: '6px', overflow: 'hidden' }}>
                    <div 
                      style={{ 
                        height: '100%', 
                        width: `${Math.min(100, cohortMetrics.avgInterviewScore)}%`, 
                        background: 'rgba(255, 255, 255, 0.25)',
                        borderRadius: '6px'
                      }}
                    />
                  </div>
                </div>
              </div>

              {setActiveTab && (
                <button 
                  className="btn-secondary" 
                  style={{ width: '100%', marginTop: '1.25rem', justifyContent: 'center', fontSize: '0.85rem' }}
                  onClick={() => setActiveTab('interview')}
                >
                  Start Mock Interview <ArrowRight size={14} />
                </button>
              )}
            </div>
          </div>

          {/* Domain Mastery Comparison Breakdown */}
          {domainComparison.length > 0 && (
            <div className="admin-card" style={{ marginBottom: '2.5rem' }}>
              <div className="admin-card-header">
                <div>
                  <h2 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <BarChart2 size={20} className="text-cyan" /> Domain Mastery Benchmark
                  </h2>
                  <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>
                    See how your knowledge stacks up in each specific technical domain against other students.
                  </p>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', fontSize: '0.8rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                    <span style={{ width: '12px', height: '12px', background: '#38bdf8', borderRadius: '3px', display: 'inline-block' }}></span>
                    <span style={{ color: '#f8fafc' }}>Your Score</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                    <span style={{ width: '12px', height: '12px', background: 'rgba(255, 255, 255, 0.25)', borderRadius: '3px', display: 'inline-block' }}></span>
                    <span style={{ color: 'var(--text-muted)' }}>Cohort Avg</span>
                  </div>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1.25rem', marginTop: '1.25rem' }}>
                {domainComparison.map((domain, idx) => {
                  const hasAttempted = domain.userScore !== null;
                  const delta = hasAttempted ? domain.userScore - domain.cohortScore : null;

                  return (
                    <div 
                      key={idx} 
                      style={{ 
                        background: 'rgba(255, 255, 255, 0.02)', 
                        padding: '1rem 1.25rem', 
                        borderRadius: '10px', 
                        border: '1px solid rgba(255, 255, 255, 0.06)' 
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.5rem' }}>
                        <strong style={{ fontSize: '0.9rem', color: '#f8fafc' }}>{domain.topic}</strong>
                        {hasAttempted ? (
                          <span style={{ 
                            fontSize: '0.75rem', 
                            fontWeight: 700, 
                            color: delta >= 0 ? '#34d399' : '#f87171' 
                          }}>
                            {delta >= 0 ? `+${delta}%` : `${delta}%`}
                          </span>
                        ) : (
                          <span style={{ fontSize: '0.72rem', color: '#64748b' }}>Unattempted</span>
                        )}
                      </div>

                      {/* Dual Bars */}
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem', marginTop: '0.6rem' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                          <span style={{ fontSize: '0.72rem', color: '#38bdf8', width: '30px' }}>
                            {hasAttempted ? `${domain.userScore}%` : '-'}
                          </span>
                          <div style={{ flex: 1, height: '7px', background: 'rgba(255, 255, 255, 0.05)', borderRadius: '4px', overflow: 'hidden' }}>
                            <div 
                              style={{ 
                                height: '100%', 
                                width: hasAttempted ? `${Math.min(100, domain.userScore)}%` : '0%', 
                                background: '#38bdf8',
                                borderRadius: '4px'
                              }}
                            />
                          </div>
                        </div>

                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                          <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', width: '30px' }}>
                            {domain.cohortScore}%
                          </span>
                          <div style={{ flex: 1, height: '7px', background: 'rgba(255, 255, 255, 0.05)', borderRadius: '4px', overflow: 'hidden' }}>
                            <div 
                              style={{ 
                                height: '100%', 
                                width: `${Math.min(100, domain.cohortScore)}%`, 
                                background: 'rgba(255, 255, 255, 0.25)',
                                borderRadius: '4px'
                              }}
                            />
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Cohort Leaderboard Table */}
          <div className="admin-card">
            <div className="admin-card-header">
              <div>
                <h2 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <Trophy size={20} className="text-amber" /> PrepAI Student Leaderboard
                </h2>
                <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>
                  Live rankings based on technical exam accuracy, mock interview scoring, and consistency.
                </p>
              </div>

              <div className="input-wrapper" style={{ width: '260px' }}>
                <Search className="input-icon" size={16} />
                <input
                  type="text"
                  placeholder="Search students..."
                  value={searchFilter}
                  onChange={(e) => setSearchFilter(e.target.value)}
                />
              </div>
            </div>

            <div className="table-responsive">
              <table className="admin-table">
                <thead>
                  <tr>
                    <th style={{ width: '80px' }}>Rank</th>
                    <th>Candidate</th>
                    <th>Quizzes Completed</th>
                    <th>Mock Interviews</th>
                    <th>Total Exams</th>
                    <th>Overall Score</th>
                    <th>Achievement Badge</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredLeaderboard.length === 0 ? (
                    <tr>
                      <td colSpan="7" style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)' }}>
                        No candidates match your search filter.
                      </td>
                    </tr>
                  ) : (
                    filteredLeaderboard.map((item) => {
                      const isUser = item.isCurrentUser;
                      let rankDisplay = `#${item.rank}`;
                      if (item.rank === 1) rankDisplay = '🥇 1st';
                      else if (item.rank === 2) rankDisplay = '🥈 2nd';
                      else if (item.rank === 3) rankDisplay = '🥉 3rd';

                      return (
                        <tr 
                          key={item.id} 
                          style={isUser ? { 
                            background: 'rgba(99, 102, 241, 0.12)', 
                            borderLeft: '4px solid #6366f1' 
                          } : {}}
                        >
                          <td>
                            <strong style={{ 
                              color: item.rank === 1 ? '#f59e0b' : item.rank === 2 ? '#94a3b8' : item.rank === 3 ? '#b45309' : '#fff',
                              fontSize: item.rank <= 3 ? '1rem' : '0.9rem'
                            }}>
                              {rankDisplay}
                            </strong>
                          </td>
                          <td>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                              <div 
                                style={{ 
                                  width: '30px', 
                                  height: '30px', 
                                  borderRadius: '50%', 
                                  background: isUser ? 'linear-gradient(135deg, #6366f1, #4f46e5)' : 'rgba(255, 255, 255, 0.1)',
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                  fontWeight: 700,
                                  fontSize: '0.8rem',
                                  color: '#fff'
                                }}
                              >
                                {item.name ? item.name.charAt(0).toUpperCase() : 'U'}
                              </div>
                              <div>
                                <strong style={{ color: isUser ? '#a5b4fc' : '#f8fafc' }}>
                                  {item.name}
                                </strong>
                                {isUser && (
                                  <span 
                                    className="badge-pill" 
                                    style={{ 
                                      marginLeft: '0.5rem', 
                                      padding: '0.1rem 0.4rem', 
                                      fontSize: '0.68rem', 
                                      background: '#4f46e5', 
                                      color: '#fff' 
                                    }}
                                  >
                                    YOU
                                  </span>
                                )}
                              </div>
                            </div>
                          </td>
                          <td>{item.totalQuizzes}</td>
                          <td>{item.totalInterviews}</td>
                          <td>
                            <strong>{item.totalExams}</strong>
                          </td>
                          <td>
                            <strong 
                              style={{ 
                                color: item.overallAvgScore >= 80 ? '#34d399' : item.overallAvgScore >= 60 ? '#38bdf8' : '#f59e0b',
                                fontSize: '0.95rem'
                              }}
                            >
                              {item.overallAvgScore}%
                            </strong>
                          </td>
                          <td>
                            <span 
                              className="badge-pill"
                              style={{ 
                                background: item.rank === 1 ? 'rgba(245, 158, 11, 0.15)' : 'rgba(255, 255, 255, 0.05)',
                                borderColor: item.rank === 1 ? 'rgba(245, 158, 11, 0.3)' : 'rgba(255, 255, 255, 0.1)',
                                color: item.rank === 1 ? '#fbbf24' : '#e2e8f0',
                                fontSize: '0.75rem'
                              }}
                            >
                              {item.badge}
                            </span>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

export default PerformanceCompare;
