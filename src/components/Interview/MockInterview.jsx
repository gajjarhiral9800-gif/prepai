import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { 
  MessageSquare, 
  Volume2, 
  Send, 
  Sparkles, 
  CheckCircle, 
  AlertTriangle, 
  HelpCircle, 
  RefreshCw, 
  Award,
  BookOpen,
  Mic,
  MicOff,
  Copy,
  Check,
  Star,
  RotateCcw,
  TrendingUp,
  FileText
} from 'lucide-react';

function MockInterview() {
  const { apiFetch } = useAuth();

  // Setup state
  const [role, setRole] = useState('Frontend Developer');
  const [level, setLevel] = useState('Mid-Level');
  const [type, setType] = useState('Technical');
  
  // Session state
  const [questions, setQuestions] = useState([]);
  const [currentIdx, setCurrentIdx] = useState(0);
  const [answers, setAnswers] = useState({});
  const [evaluations, setEvaluations] = useState({});
  const [loadingQuestions, setLoadingQuestions] = useState(false);
  const [loadingEval, setLoadingEval] = useState(false);
  const [sessionStarted, setSessionStarted] = useState(false);
  const [saved, setSaved] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [recognitionInstance, setRecognitionInstance] = useState(null);
  const [copiedIdx, setCopiedIdx] = useState(null);

  const currentAnswer = answers[currentIdx] || '';

  const handleUpdateCurrentAnswer = (newText) => {
    setAnswers(prev => ({
      ...prev,
      [currentIdx]: newText
    }));
  };

  const handleToggleListening = () => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      alert('Voice recognition is not supported in this browser. Please use Chrome or Edge.');
      return;
    }

    if (isListening) {
      if (recognitionInstance) recognitionInstance.stop();
      setIsListening(false);
      return;
    }

    const rec = new SpeechRecognition();
    rec.continuous = true;
    rec.interimResults = false;
    rec.lang = 'en-US';

    rec.onstart = () => {
      setIsListening(true);
    };

    rec.onresult = (event) => {
      let currentTranscript = '';
      for (let i = event.resultIndex; i < event.results.length; i++) {
        if (event.results[i].isFinal) {
          currentTranscript += event.results[i][0].transcript + ' ';
        }
      }
      if (currentTranscript) {
        setAnswers(prev => {
          const prevAnswer = prev[currentIdx] || '';
          const updated = prevAnswer ? `${prevAnswer.trim()} ${currentTranscript.trim()}` : currentTranscript.trim();
          return { ...prev, [currentIdx]: updated };
        });
      }
    };

    rec.onerror = (err) => {
      console.warn('Speech recognition error:', err.error);
      setIsListening(false);
    };

    rec.onend = () => {
      setIsListening(false);
    };

    try {
      rec.start();
      setRecognitionInstance(rec);
    } catch (e) {
      console.error('Failed to start speech recognition:', e);
      setIsListening(false);
    }
  };

  const startSession = async () => {
    setLoadingQuestions(true);
    setEvaluations({});
    setAnswers({});
    setCurrentIdx(0);
    setSaved(false);

    try {
      const data = await apiFetch('/api/ai/interview/generate-questions', {
        method: 'POST',
        body: JSON.stringify({ role, level, type })
      });
      setQuestions(data.questions || []);
      setSessionStarted(true);
    } catch (err) {
      alert('Failed to generate interview questions: ' + err.message);
    } finally {
      setLoadingQuestions(false);
    }
  };

  const currentQ = questions[currentIdx];

  const handleSpeakText = (text) => {
    if ('speechSynthesis' in window && text) {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.rate = 0.95;
      window.speechSynthesis.speak(utterance);
    }
  };

  const handleEvaluateAnswer = async () => {
    const ans = (answers[currentIdx] || '').trim();
    if (!ans) {
      alert('Please enter your response before submitting for AI evaluation.');
      return;
    }

    setLoadingEval(true);
    try {
      const data = await apiFetch('/api/ai/interview/evaluate', {
        method: 'POST',
        body: JSON.stringify({
          question: currentQ.question,
          answer: ans,
          role
        })
      });

      const updatedEvaluations = {
        ...evaluations,
        [currentIdx]: data.evaluation
      };
      setEvaluations(updatedEvaluations);

      // Auto save updated interview session to backend history
      const evalList = Object.values(updatedEvaluations);
      const avgScore = evalList.length > 0 
        ? Math.round(evalList.reduce((a, b) => a + (b.score || 0), 0) / evalList.length)
        : 80;

      apiFetch('/api/user/save-session', {
        method: 'POST',
        body: JSON.stringify({
          type: 'interview',
          title: `${role} (${level}) - ${type} Mock`,
          score: avgScore,
          data: { questions, evaluations: updatedEvaluations, answers }
        })
      }).then(() => setSaved(true)).catch(err => console.error('Interview auto-save error:', err));
    } catch (err) {
      alert('Failed to evaluate answer: ' + err.message);
    } finally {
      setLoadingEval(false);
    }
  };

  const handleCopyReframed = (text) => {
    if (!text) return;
    navigator.clipboard.writeText(text);
    setCopiedIdx(currentIdx);
    setTimeout(() => {
      setCopiedIdx(null);
    }, 2500);
  };

  const handleUseReframedInAnswer = (reframedText) => {
    if (!reframedText) return;
    handleUpdateCurrentAnswer(reframedText);
  };

  const handleSaveSession = async () => {
    try {
      const evalList = Object.values(evaluations);
      const avgScore = evalList.length > 0 
        ? Math.round(evalList.reduce((a, b) => a + (b.score || 0), 0) / evalList.length)
        : 80;

      await apiFetch('/api/user/save-session', {
        method: 'POST',
        body: JSON.stringify({
          type: 'interview',
          title: `${role} (${level}) - ${type} Mock`,
          score: avgScore,
          data: { questions, evaluations, answers }
        })
      });
      setSaved(true);
    } catch (err) {
      alert('Failed to save session: ' + err.message);
    }
  };

  // Word count calculation
  const wordCount = currentAnswer.trim() ? currentAnswer.trim().split(/\s+/).filter(Boolean).length : 0;
  const currentEval = evaluations[currentIdx];

  // Helper for rating score badge styling
  const getRatingBadgeStyle = (score) => {
    if (score >= 88) return { bg: 'rgba(16, 185, 129, 0.15)', border: 'rgba(16, 185, 129, 0.3)', color: '#34d399' };
    if (score >= 75) return { bg: 'rgba(6, 182, 212, 0.15)', border: 'rgba(6, 182, 212, 0.3)', color: '#38bdf8' };
    if (score >= 60) return { bg: 'rgba(245, 158, 11, 0.15)', border: 'rgba(245, 158, 11, 0.3)', color: '#fbbf24' };
    return { bg: 'rgba(239, 68, 68, 0.15)', border: 'rgba(239, 68, 68, 0.3)', color: '#f87171' };
  };

  return (
    <div className="module-container">
      <div className="module-header">
        <div className="badge-pill">
          <MessageSquare size={14} /> AI Voice & Text Interview Simulator
        </div>
        <h1>Interactive AI Mock Interview</h1>
        <p>Answer realistic interview questions, get instant AI evaluation, detailed ratings, key strengths, improvement areas, and recommended reframed answers.</p>
      </div>

      {!sessionStarted ? (
        /* Configuration Form */
        <div className="config-card">
          <h2>Configure Session</h2>
          <div className="form-grid">
            <div className="input-group">
              <label>Target Role</label>
              <select value={role} onChange={(e) => setRole(e.target.value)}>
                <option value="Graphic Designer">🎨 Graphic Designer</option>
                <option value="UI/UX Designer">✨ UI/UX Designer</option>
                <option value="Frontend Developer">💻 Frontend Developer</option>
                <option value="Backend Developer">⚙️ Backend Developer</option>
                <option value="Full Stack Developer">🌐 Full Stack Developer</option>
                <option value="Data Scientist">📊 Data Scientist</option>
                <option value="System Design Architect">🏗️ System Design Architect</option>
                <option value="DevOps & Cloud Engineer">☁️ DevOps & Cloud Engineer</option>
              </select>
            </div>

            <div className="input-group">
              <label>Experience Level</label>
              <select value={level} onChange={(e) => setLevel(e.target.value)}>
                <option value="Junior / Entry Level">Junior / Entry Level</option>
                <option value="Mid-Level">Mid-Level</option>
                <option value="Senior / Lead">Senior / Lead</option>
              </select>
            </div>

            <div className="input-group">
              <label>Interview Type</label>
              <select value={type} onChange={(e) => setType(e.target.value)}>
                <option value="Technical Core">Technical Core</option>
                <option value="Behavioral & STAR">Behavioral & STAR</option>
                <option value="System Design">System Design</option>
              </select>
            </div>
          </div>

          <button 
            className="btn-primary" 
            onClick={startSession} 
            disabled={loadingQuestions}
            style={{ width: '100%', marginTop: '1.5rem', justifyContent: 'center' }}
          >
            {loadingQuestions ? (
              <span className="spinner"></span>
            ) : (
              <>
                <Sparkles size={18} /> Generate Questions & Begin
              </>
            )}
          </button>
        </div>
      ) : (
        /* Active Interview Simulator */
        <div className="interview-stage">
          <div className="interview-nav">
            <div className="question-pills">
              {questions.map((q, idx) => (
                <button
                  key={q.id || idx}
                  className={`pill ${idx === currentIdx ? 'active' : ''} ${evaluations[idx] ? 'completed' : ''}`}
                  onClick={() => setCurrentIdx(idx)}
                >
                  Q{idx + 1} {evaluations[idx] ? '✓' : ''}
                </button>
              ))}
            </div>

            <button className="btn-secondary" onClick={() => setSessionStarted(false)}>
              <RefreshCw size={14} /> New Session
            </button>
          </div>

          {currentQ && (
            <div className="question-card">
              <div className="question-header">
                <span className="category-tag">{currentQ.category || 'Technical Question'}</span>
                <button className="btn-audio" onClick={() => handleSpeakText(currentQ.question)} title="Listen to question audio">
                  <Volume2 size={18} /> Listen to Question
                </button>
              </div>

              <h2 className="question-text">"{currentQ.question}"</h2>

              {currentQ.hint && (
                <div className="hint-box">
                  <HelpCircle size={16} />
                  <span>Key topics to cover: {currentQ.hint}</span>
                </div>
              )}

              {/* Answer Input Section */}
              <div className="answer-section">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem', flexWrap: 'wrap', gap: '0.5rem' }}>
                  <label style={{ margin: 0, fontWeight: 600 }}>Your Interview Answer:</label>
                  <button
                    type="button"
                    className={`btn-audio ${isListening ? 'listening' : ''}`}
                    onClick={handleToggleListening}
                    style={{
                      background: isListening ? 'rgba(239, 68, 68, 0.2)' : 'rgba(99, 102, 241, 0.15)',
                      color: isListening ? '#ef4444' : '#6366f1',
                      border: isListening ? '1px solid #ef4444' : '1px solid rgba(99, 102, 241, 0.3)',
                      padding: '0.4rem 0.8rem',
                      borderRadius: '8px',
                      fontSize: '0.85rem',
                      fontWeight: 600,
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.4rem',
                      cursor: 'pointer'
                    }}
                  >
                    {isListening ? (
                      <>
                        <MicOff size={16} /> 🎙️ Recording... Speak Now (Click to Stop)
                      </>
                    ) : (
                      <>
                        <Mic size={16} /> 🎙️ Speak Answer (Voice-to-Text)
                      </>
                    )}
                  </button>
                </div>

                <textarea
                  rows={6}
                  placeholder={isListening ? "Listening to your voice... Speak your response clearly." : "Type your response clearly here or click 'Speak Answer' to speak using microphone..."}
                  value={currentAnswer}
                  onChange={(e) => handleUpdateCurrentAnswer(e.target.value)}
                  disabled={loadingEval}
                  style={{ borderColor: isListening ? '#ef4444' : undefined }}
                />

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '0.5rem', flexWrap: 'wrap', gap: '0.5rem' }}>
                  <span style={{ fontSize: '0.82rem', color: wordCount < 20 ? 'var(--text-dim)' : 'var(--text-muted)' }}>
                    {wordCount} words {wordCount < 25 ? '• Aim for 40-120 words for depth' : '• Good response length'}
                  </span>

                  <button
                    className="btn-primary"
                    onClick={handleEvaluateAnswer}
                    disabled={loadingEval || !currentAnswer.trim()}
                  >
                    {loadingEval ? (
                      <span className="spinner"></span>
                    ) : (
                      <>
                        <Send size={16} /> {currentEval ? 'Re-Evaluate with AI' : 'Evaluate Answer with AI'}
                      </>
                    )}
                  </button>
                </div>
              </div>

              {/* Complete AI Evaluation Breakdown Card */}
              {currentEval && (
                <div className="eval-card">
                  {/* Rating Header */}
                  <div className="eval-header-wrapper">
                    <div className="eval-score-ring">
                      <span className="score-num">{currentEval.score}</span>
                      <span className="score-max">/100</span>
                    </div>

                    <div className="eval-meta">
                      <div className="eval-meta-top">
                        <h3>AI Answer Rating & Performance</h3>
                        <span 
                          className="rating-badge"
                          style={{
                            background: getRatingBadgeStyle(currentEval.score).bg,
                            border: `1px solid ${getRatingBadgeStyle(currentEval.score).border}`,
                            color: getRatingBadgeStyle(currentEval.score).color
                          }}
                        >
                          {currentEval.ratingLabel || 'Evaluated Answer'}
                        </span>
                      </div>

                      <div className="eval-stars-row">
                        <span className="stars-icon">
                          <Star size={16} fill="#fbbf24" color="#fbbf24" />
                        </span>
                        <span className="stars-label">Rating: <strong>{currentEval.starRating || `${(currentEval.score / 20).toFixed(1)}/5`}</strong></span>
                      </div>
                    </div>
                  </div>

                  {/* 4-Pillar Score Breakdown */}
                  {currentEval.ratingBreakdown && (
                    <div className="score-breakdown-card">
                      <div className="breakdown-grid">
                        <div className="breakdown-item">
                          <div className="breakdown-label">
                            <span>Technical Accuracy</span>
                            <strong>{currentEval.ratingBreakdown.technicalAccuracy}%</strong>
                          </div>
                          <div className="bar-track">
                            <div className="bar-fill" style={{ width: `${currentEval.ratingBreakdown.technicalAccuracy}%`, background: '#6366f1' }}></div>
                          </div>
                        </div>

                        <div className="breakdown-item">
                          <div className="breakdown-label">
                            <span>Clarity & Communication</span>
                            <strong>{currentEval.ratingBreakdown.clarity}%</strong>
                          </div>
                          <div className="bar-track">
                            <div className="bar-fill" style={{ width: `${currentEval.ratingBreakdown.clarity}%`, background: '#06b6d4' }}></div>
                          </div>
                        </div>

                        <div className="breakdown-item">
                          <div className="breakdown-label">
                            <span>Structure & Logic (STAR)</span>
                            <strong>{currentEval.ratingBreakdown.structure}%</strong>
                          </div>
                          <div className="bar-track">
                            <div className="bar-fill" style={{ width: `${currentEval.ratingBreakdown.structure}%`, background: '#8b5cf6' }}></div>
                          </div>
                        </div>

                        <div className="breakdown-item">
                          <div className="breakdown-label">
                            <span>Impact & Metrics</span>
                            <strong>{currentEval.ratingBreakdown.impact}%</strong>
                          </div>
                          <div className="bar-track">
                            <div className="bar-fill" style={{ width: `${currentEval.ratingBreakdown.impact}%`, background: '#10b981' }}></div>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Overall Feedback */}
                  <p className="eval-feedback">{currentEval.feedback}</p>

                  {/* Strengths & Improvements Grid */}
                  <div className="eval-grid">
                    <div className="eval-box strengths">
                      <h4><CheckCircle size={17} /> Key Strengths in Your Answer</h4>
                      <ul>
                        {currentEval.strengths?.map((s, i) => (
                          <li key={i}>{s}</li>
                        ))}
                      </ul>
                    </div>

                    <div className="eval-box improvements">
                      <h4><AlertTriangle size={17} /> Key Areas to Improve</h4>
                      <ul>
                        {currentEval.improvements?.map((imp, i) => (
                          <li key={i}>{imp}</li>
                        ))}
                      </ul>
                    </div>
                  </div>

                  {/* AI Reframed / Recommended Answer Section */}
                  {currentEval.reframedAnswer && (
                    <div className="reframed-answer-card">
                      <div className="reframed-header">
                        <div className="reframed-title">
                          <Sparkles size={18} color="#a5b4fc" />
                          <div>
                            <h4>Recommended Reframing (Your Answer Reimagined)</h4>
                            <p>Here is how our AI reframes your actual answer into an executive-level, high-impact interview delivery:</p>
                          </div>
                        </div>

                        <div className="reframed-actions">
                          <button
                            type="button"
                            className="btn-action-pill"
                            onClick={() => handleSpeakText(currentEval.reframedAnswer)}
                            title="Listen to how this reframed answer is spoken"
                          >
                            <Volume2 size={14} /> Listen
                          </button>

                          <button
                            type="button"
                            className="btn-action-pill"
                            onClick={() => handleCopyReframed(currentEval.reframedAnswer)}
                            title="Copy reframed answer"
                          >
                            {copiedIdx === currentIdx ? (
                              <>
                                <Check size={14} color="#10b981" /> Copied!
                              </>
                            ) : (
                              <>
                                <Copy size={14} /> Copy Answer
                              </>
                            )}
                          </button>

                          <button
                            type="button"
                            className="btn-action-pill highlight"
                            onClick={() => handleUseReframedInAnswer(currentEval.reframedAnswer)}
                            title="Load this reframed response into your answer box to practice"
                          >
                            <RotateCcw size={14} /> Load to Practice
                          </button>
                        </div>
                      </div>

                      <div className="reframed-quote-block">
                        <p>"{currentEval.reframedAnswer}"</p>
                      </div>

                      {currentEval.reframingTips && (
                        <div className="reframing-tips-pill">
                          <TrendingUp size={15} />
                          <span><strong>Why this works better:</strong> {currentEval.reframingTips}</span>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Exemplar Model Answer Snippet */}
                  {currentEval.sampleExemplarAnswer && (
                    <div className="exemplar-box">
                      <h4><BookOpen size={16} /> Industry Gold-Standard Benchmark Answer</h4>
                      <p>"{currentEval.sampleExemplarAnswer}"</p>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Bottom Save Session Bar */}
          <div className="session-finish-bar">
            <span>Completed {Object.keys(evaluations).length} of {questions.length} questions evaluated</span>
            <button 
              className="btn-primary" 
              onClick={handleSaveSession}
              disabled={saved}
            >
              {saved ? '✓ Session Saved to History' : 'Save Session to Dashboard'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default MockInterview;
