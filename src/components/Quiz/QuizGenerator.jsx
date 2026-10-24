import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { Award, Sparkles, CheckCircle2, XCircle, RotateCcw, HelpCircle, Clock, Timer } from 'lucide-react';

function QuizGenerator() {
  const { apiFetch } = useAuth();
  const [topic, setTopic] = useState('React & Web Development');
  const [count, setCount] = useState(5);
  const [timedMode, setTimedMode] = useState(false);
  const [durationMinutes, setDurationMinutes] = useState(5);
  const [timeLeft, setTimeLeft] = useState(0);
  const [timerActive, setTimerActive] = useState(false);

  const [quiz, setQuiz] = useState([]);
  const [userAnswers, setUserAnswers] = useState({});
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [activeQuestion, setActiveQuestion] = useState(0);

  // Countdown timer effect
  useEffect(() => {
    let interval = null;
    if (timerActive && timeLeft > 0 && !submitted) {
      interval = setInterval(() => {
        setTimeLeft(prev => {
          if (prev <= 1) {
            clearInterval(interval);
            setTimerActive(false);
            autoSubmitQuiz();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [timerActive, timeLeft, submitted]);

  const autoSubmitQuiz = () => {
    alert("⏱️ Time's Up! Your quiz answers have been automatically submitted.");
    handleSubmitQuiz();
  };

  const handleGenerateQuiz = async () => {
    setLoading(true);
    setQuiz([]);
    setUserAnswers({});
    setSubmitted(false);
    setActiveQuestion(0);
    setTimerActive(false);

    try {
      const data = await apiFetch('/api/ai/quiz/generate', {
        method: 'POST',
        body: JSON.stringify({ topic, count })
      });
      setQuiz(data.quiz || []);
      if (timedMode) {
        setTimeLeft(durationMinutes * 60);
        setTimerActive(true);
      }
    } catch (err) {
      alert('Failed to generate quiz: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleOptionSelect = (qIdx, optIdx) => {
    if (submitted) return;
    setUserAnswers(prev => ({
      ...prev,
      [qIdx]: optIdx
    }));
  };

  const handleSubmitQuiz = async () => {
    setSubmitted(true);

    // Calculate final score
    let correct = 0;
    quiz.forEach((q, idx) => {
      if (userAnswers[idx] === q.correctAnswer) {
        correct++;
      }
    });

    const finalScore = Math.round((correct / quiz.length) * 100);

    // Save to backend history
    try {
      await apiFetch('/api/user/save-session', {
        method: 'POST',
        body: JSON.stringify({
          type: 'quiz',
          title: `${topic} Technical Quiz`,
          score: finalScore,
          data: { topic, correct, total: quiz.length }
        })
      });
    } catch (err) {
      console.error('Failed to save quiz result:', err);
    }
  };

  const currentQ = quiz[activeQuestion];
  const scorePercent = submitted && quiz.length > 0
    ? Math.round((Object.keys(userAnswers).filter(k => userAnswers[k] === quiz[k].correctAnswer).length / quiz.length) * 100)
    : 0;

  return (
    <div className="module-container">
      <div className="module-header">
        <div className="badge-pill">
          <Award size={14} /> Interactive Knowledge Assessor
        </div>
        <h1>AI Technical Quiz Generator</h1>
        <p>Test your conceptual knowledge with dynamically generated AI quizzes and step-by-step explanations.</p>
      </div>

      {quiz.length === 0 ? (
        <div className="config-card">
          <h2>Generate Quiz Session</h2>
          <div className="form-grid">
            <div className="input-group">
              <label>Quiz Topic</label>
              <select value={topic} onChange={(e) => setTopic(e.target.value)}>
                <option value="Graphic Design & Visual Arts">🎨 Graphic Design & Visual Arts</option>
                <option value="UI/UX Design & Prototyping">✨ UI/UX Design & Prototyping</option>
                <option value="React & Web Development">⚛️ React & Web Development</option>
                <option value="Node.js & Backend Architecture">🟢 Node.js & Backend Architecture</option>
                <option value="System Design & Cloud">☁️ System Design & Cloud</option>
                <option value="Algorithms & Data Structures">🧠 Algorithms & Data Structures</option>
                <option value="Database Design & SQL">🗄️ Database Design & SQL</option>
                <option value="Python & Machine Learning">🐍 Python & Machine Learning</option>
                <option value="Cybersecurity & Web Security">🛡️ Cybersecurity & Web Security</option>
              </select>
            </div>

            <div className="input-group">
              <label>Number of Questions</label>
              <select value={count} onChange={(e) => setCount(Number(e.target.value))}>
                <option value={5}>5 Questions</option>
                <option value={10}>10 Questions</option>
              </select>
            </div>
          </div>

          <div style={{ marginTop: '1.25rem', padding: '1rem', background: 'rgba(255, 255, 255, 0.03)', borderRadius: '10px', border: '1px solid rgba(255, 255, 255, 0.08)' }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', cursor: 'pointer', fontWeight: 600, color: '#f8fafc' }}>
              <input
                type="checkbox"
                checked={timedMode}
                onChange={(e) => setTimedMode(e.target.checked)}
                style={{ width: '18px', height: '18px', accentColor: '#6366f1' }}
              />
              <Timer size={18} className="text-purple" /> Enable Timed Exam Mode (Countdown Timer)
            </label>

            {timedMode && (
              <div style={{ marginTop: '0.75rem', display: 'flex', alignItems: 'center', gap: '1rem' }}>
                <span style={{ fontSize: '0.85rem', color: '#94a3b8' }}>Select Time Limit:</span>
                <select
                  value={durationMinutes}
                  onChange={(e) => setDurationMinutes(Number(e.target.value))}
                  style={{ width: 'auto', padding: '0.4rem 0.8rem', fontSize: '0.85rem' }}
                >
                  <option value={3}>⏱️ 3 Minutes (Speed Run)</option>
                  <option value={5}>⏱️ 5 Minutes (Standard)</option>
                  <option value={10}>⏱️ 10 Minutes (Deep Dive)</option>
                </select>
              </div>
            )}
          </div>

          <button 
            className="btn-primary" 
            onClick={handleGenerateQuiz} 
            disabled={loading}
            style={{ width: '100%', marginTop: '1.5rem', justifyContent: 'center' }}
          >
            {loading ? (
              <span className="spinner"></span>
            ) : (
              <>
                <Sparkles size={18} /> Start Custom Quiz
              </>
            )}
          </button>
        </div>
      ) : (
        <div className="quiz-stage">
          {/* Top Progress & Timer Bar */}
          <div className="quiz-nav" style={{ flexWrap: 'wrap', gap: '1rem' }}>
            <span>Question {activeQuestion + 1} of {quiz.length}</span>

            {timedMode && !submitted && (
              <div 
                className="badge-pill" 
                style={{ 
                  background: timeLeft <= 60 ? 'rgba(239, 68, 68, 0.2)' : 'rgba(99, 102, 241, 0.2)',
                  color: timeLeft <= 60 ? '#ef4444' : '#818cf8',
                  border: timeLeft <= 60 ? '1px solid #ef4444' : '1px solid #6366f1',
                  fontWeight: 700,
                  fontSize: '0.9rem'
                }}
              >
                <Clock size={16} /> Time Remaining: {Math.floor(timeLeft / 60)}:{(timeLeft % 60).toString().padStart(2, '0')}
              </div>
            )}

            <div className="quiz-dots">
              {quiz.map((_, i) => (
                <span
                  key={i}
                  className={`dot ${i === activeQuestion ? 'active' : ''} ${userAnswers[i] !== undefined ? 'answered' : ''}`}
                  onClick={() => setActiveQuestion(i)}
                />
              ))}
            </div>
          </div>

          {currentQ && (
            <div className="quiz-question-card">
              <h2 className="q-title">{currentQ.question}</h2>

              <div className="options-grid">
                {currentQ.options?.map((opt, optIdx) => {
                  const isSelected = userAnswers[activeQuestion] === optIdx;
                  const isCorrect = currentQ.correctAnswer === optIdx;

                  let optClass = 'option-btn';
                  if (isSelected) optClass += ' selected';
                  if (submitted) {
                    if (isCorrect) optClass += ' correct';
                    else if (isSelected && !isCorrect) optClass += ' incorrect';
                  }

                  return (
                    <button
                      key={optIdx}
                      className={optClass}
                      onClick={() => handleOptionSelect(activeQuestion, optIdx)}
                    >
                      <span className="opt-prefix">{String.fromCharCode(65 + optIdx)}</span>
                      <span className="opt-text">{opt}</span>
                      {submitted && isCorrect && <CheckCircle2 className="opt-icon text-success" size={18} />}
                      {submitted && isSelected && !isCorrect && <XCircle className="opt-icon text-error" size={18} />}
                    </button>
                  );
                })}
              </div>

              {submitted && currentQ.explanation && (
                <div className="explanation-box">
                  <h4><HelpCircle size={16} /> Concept Explanation</h4>
                  <p>{currentQ.explanation}</p>
                </div>
              )}

              <div className="quiz-footer-actions">
                <button
                  className="btn-secondary"
                  disabled={activeQuestion === 0}
                  onClick={() => setActiveQuestion(prev => prev - 1)}
                >
                  Previous
                </button>

                {activeQuestion < quiz.length - 1 ? (
                  <button
                    className="btn-primary"
                    onClick={() => setActiveQuestion(prev => prev + 1)}
                  >
                    Next Question
                  </button>
                ) : (
                  !submitted && (
                    <button className="btn-primary" onClick={handleSubmitQuiz}>
                      Submit Quiz
                    </button>
                  )
                )}
              </div>
            </div>
          )}

          {submitted && (
            <div className="quiz-result-banner">
              <div className="result-score">
                <Award size={36} />
                <div>
                  <h3>Quiz Result: {scorePercent}%</h3>
                  <p>You answered {quiz.filter((q, i) => userAnswers[i] === q.correctAnswer).length} of {quiz.length} correctly.</p>
                </div>
              </div>
              <button className="btn-secondary" onClick={handleGenerateQuiz}>
                <RotateCcw size={16} /> Try Another Quiz
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default QuizGenerator;
