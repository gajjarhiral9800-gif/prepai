import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { 
  Trophy, 
  MessageSquare, 
  FileText, 
  Award, 
  Flame, 
  Play, 
  Sparkles, 
  ArrowRight,
  Clock,
  CheckCircle2,
  Key,
  BookOpen,
  TrendingUp,
  Users
} from 'lucide-react';

function Dashboard({ setActiveTab }) {
  const { user, apiFetch } = useAuth();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchDashboard = async () => {
      try {
        const res = await apiFetch('/api/user/dashboard');
        setData(res);
      } catch (err) {
        console.error('Failed to fetch dashboard:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchDashboard();
  }, []);

  const metrics = data?.metrics || {
    totalInterviews: 0,
    totalQuizzes: 0,
    totalResumes: 0,
    totalStarStories: 0,
    avgInterviewScore: 0,
    avgQuizScore: 0,
    practiceStreakDays: 1
  };

  return (
    <div className="dashboard-container">
      {/* Welcome Banner */}
      <div className="welcome-banner">
        <div className="welcome-content">
          <div className="badge-pill">
            <Sparkles size={14} /> AI-Powered Interview Coach
          </div>
          <h1>Welcome back, {user?.name || 'PrepAI User'}! 👋</h1>
          <p>
            Track your progress, simulate realistic AI technical interviews, scan your resume for ATS optimization, and test your knowledge.
          </p>
        </div>
        <div className="streak-card">
          <Flame size={32} className="flame-icon" />
          <div className="streak-info">
            <span className="streak-num">{metrics.practiceStreakDays} Days</span>
            <span className="streak-label">Active Streak</span>
          </div>
        </div>
      </div>

      {/* Metrics Row */}
      <div className="metrics-grid">
        <div className="metric-card card-purple">
          <div className="metric-icon">
            <MessageSquare size={24} />
          </div>
          <div className="metric-details">
            <h3>{metrics.totalInterviews}</h3>
            <p>Mock Interviews</p>
          </div>
        </div>

        <div className="metric-card card-indigo">
          <div className="metric-icon">
            <Trophy size={24} />
          </div>
          <div className="metric-details">
            <h3>{metrics.avgInterviewScore}%</h3>
            <p>Avg Interview Score</p>
          </div>
        </div>

        <div className="metric-card card-cyan">
          <div className="metric-icon">
            <Award size={24} />
          </div>
          <div className="metric-details">
            <h3>{metrics.totalQuizzes}</h3>
            <p>Quizzes Completed</p>
          </div>
        </div>

        <div className="metric-card card-pink">
          <div className="metric-icon">
            <FileText size={24} />
          </div>
          <div className="metric-details">
            <h3>{metrics.totalResumes}</h3>
            <p>Resume ATS Scans</p>
          </div>
        </div>
      </div>

      {/* Quick Launchers Section */}
      <div className="section-header">
        <h2>Practice Suite Tools</h2>
        <p>Select a specialized AI module to start your preparation session</p>
      </div>

      <div className="tools-grid">
        {/* Mock Interview */}
        <div className="tool-card" onClick={() => setActiveTab('interview')}>
          <div className="tool-header">
            <div className="tool-icon icon-purple">
              <MessageSquare size={24} />
            </div>
            <span className="tool-badge">Popular</span>
          </div>
          <h3>AI Mock Interview Simulator</h3>
          <p>Practice realistic role-based technical questions with instant speech evaluation and STAR scoring.</p>
          <button className="tool-btn">
            Start Simulator <ArrowRight size={16} />
          </button>
        </div>

        {/* Quiz Generator */}
        <div className="tool-card" onClick={() => setActiveTab('quiz')}>
          <div className="tool-header">
            <div className="tool-icon icon-cyan">
              <Award size={24} />
            </div>
            <span className="tool-badge">Interactive</span>
          </div>
          <h3>AI Tech Quiz Generator</h3>
          <p>Generate timed technical multiple-choice quizzes on React, System Design, Algorithms, and Node.js.</p>
          <button className="tool-btn">
            Take a Quiz <ArrowRight size={16} />
          </button>
        </div>

        {/* Resume ATS Analyzer */}
        <div className="tool-card" onClick={() => setActiveTab('resume')}>
          <div className="tool-header">
            <div className="tool-icon icon-pink">
              <FileText size={24} />
            </div>
            <span className="tool-badge font-mono">ATS 90+</span>
          </div>
          <h3>Resume & ATS Match Scanner</h3>
          <p>Scan your resume text against target job descriptions to identify missing keywords and formatting gaps.</p>
          <button className="tool-btn">
            Analyze Resume <ArrowRight size={16} />
          </button>
        </div>

        {/* STAR Story Builder */}
        <div className="tool-card" onClick={() => setActiveTab('star')}>
          <div className="tool-header">
            <div className="tool-icon icon-amber">
              <Sparkles size={24} />
            </div>
            <span className="tool-badge">Behavioral</span>
          </div>
          <h3>STAR Method Story Polish</h3>
          <p>Transform raw experiences into compelling Situation-Task-Action-Result interview narratives.</p>
          <button className="tool-btn">
            Build Story <ArrowRight size={16} />
          </button>
        </div>

        {/* Study Hub & Resources */}
        <div className="tool-card" onClick={() => setActiveTab('study')}>
          <div className="tool-header">
            <div className="tool-icon icon-indigo" style={{ background: 'rgba(99, 102, 241, 0.15)', color: '#818cf8' }}>
              <BookOpen size={24} />
            </div>
            <span className="tool-badge" style={{ background: 'rgba(99, 102, 241, 0.2)', color: '#c7d2fe' }}>PDF Library</span>
          </div>
          <h3>Study Hub & Technical Cheatsheets</h3>
          <p>Access curated reference manuals, interview cheat sheets, and verified PDF guides for open study or download.</p>
          <button className="tool-btn">
            Open Study Hub <ArrowRight size={16} />
          </button>
        </div>

        {/* Peer Performance & Leaderboard Benchmark */}
        <div className="tool-card" onClick={() => setActiveTab('compare')} style={{ borderColor: 'rgba(99, 102, 241, 0.3)' }}>
          <div className="tool-header">
            <div className="tool-icon icon-cyan" style={{ background: 'rgba(6, 182, 212, 0.15)', color: '#22d3ee' }}>
              <TrendingUp size={24} />
            </div>
            <span className="tool-badge" style={{ background: 'rgba(6, 182, 212, 0.2)', color: '#67e8f9' }}>Leaderboard</span>
          </div>
          <h3>Performance & Peer Comparison</h3>
          <p>Compare your exam scores, quiz accuracy, and interview ratings against other candidates across PrepAI.</p>
          <button className="tool-btn">
            Compare Standings <ArrowRight size={16} />
          </button>
        </div>
      </div>

      {/* Recent Activity */}
      <div className="section-header" style={{ marginTop: '2.5rem' }}>
        <h2>Recent Practice History</h2>
      </div>

      <div className="history-card">
        {data?.recentSessions && data.recentSessions.length > 0 ? (
          <div className="history-list">
            {data.recentSessions.map((sess) => (
              <div key={sess.id} className="history-item">
                <div className="history-info">
                  <div className="history-type-badge">
                    {sess.type === 'interview' && <MessageSquare size={16} />}
                    {sess.type === 'quiz' && <Award size={16} />}
                    {sess.type === 'resume' && <FileText size={16} />}
                    {sess.type === 'star' && <Sparkles size={16} />}
                    <span>{sess.type.toUpperCase()}</span>
                  </div>
                  <div>
                    <h4 className="history-title">{sess.title}</h4>
                    <span className="history-time">
                      <Clock size={12} /> {new Date(sess.timestamp).toLocaleDateString()}
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
          <div className="empty-state">
            <CheckCircle2 size={40} className="empty-icon" />
            <p>No practice sessions saved yet. Start a Mock Interview or Quiz above!</p>
          </div>
        )}
      </div>
    </div>
  );
}

export default Dashboard;
