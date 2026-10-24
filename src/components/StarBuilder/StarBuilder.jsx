import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { Sparkles, Copy, Check, BookOpen, Lightbulb } from 'lucide-react';

function StarBuilder() {
  const { apiFetch } = useAuth();
  const [situation, setSituation] = useState('');
  const [task, setTask] = useState('');
  const [action, setAction] = useState('');
  const [result, setResult] = useState('');

  const [loading, setLoading] = useState(false);
  const [polishedData, setPolishedData] = useState(null);
  const [copied, setCopied] = useState(false);

  const handlePolish = async () => {
    if (!situation.trim() || !action.trim()) {
      alert('Please fill in at least the Situation and Action fields.');
      return;
    }

    setLoading(true);
    try {
      const data = await apiFetch('/api/ai/star/polish', {
        method: 'POST',
        body: JSON.stringify({ situation, task, action, result })
      });
      setPolishedData(data.result);

      // Save to history
      apiFetch('/api/user/save-session', {
        method: 'POST',
        body: JSON.stringify({
          type: 'star',
          title: 'STAR Story: ' + (situation.substring(0, 30) + '...'),
          score: 90,
          data: data.result
        })
      }).catch(err => console.error('Auto save error:', err));
    } catch (err) {
      alert('Failed to polish STAR story: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleCopy = () => {
    if (polishedData?.polishedStory) {
      navigator.clipboard.writeText(polishedData.polishedStory);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <div className="module-container">
      <div className="module-header">
        <div className="badge-pill">
          <Sparkles size={14} /> Behavioral Story Structurer
        </div>
        <h1>STAR Method Story Polish</h1>
        <p>Convert raw experiences into high-impact behavioral interview answers (Situation, Task, Action, Result).</p>
      </div>

      <div className="star-grid">
        {/* Input Form */}
        <div className="config-card">
          <h2>Draft Your Story</h2>

          <div className="input-group">
            <label>1. Situation (Background context)</label>
            <textarea
              rows={3}
              placeholder="e.g. Our payment gateway had high latency during peak sale hours..."
              value={situation}
              onChange={(e) => setSituation(e.target.value)}
            />
          </div>

          <div className="input-group" style={{ marginTop: '1rem' }}>
            <label>2. Task (Your specific goal)</label>
            <textarea
              rows={2}
              placeholder="e.g. I was tasked with reducing API response latency below 200ms..."
              value={task}
              onChange={(e) => setTask(e.target.value)}
            />
          </div>

          <div className="input-group" style={{ marginTop: '1rem' }}>
            <label>3. Action (Steps you implemented)</label>
            <textarea
              rows={3}
              placeholder="e.g. Implemented Redis caching, optimized SQL queries, and added asynchronous queues..."
              value={action}
              onChange={(e) => setAction(e.target.value)}
            />
          </div>

          <div className="input-group" style={{ marginTop: '1rem' }}>
            <label>4. Result (Quantifiable outcome)</label>
            <textarea
              rows={2}
              placeholder="e.g. Latency dropped by 65% and system handled 50k requests with 0 downtime."
              value={result}
              onChange={(e) => setResult(e.target.value)}
            />
          </div>

          <button
            className="btn-primary"
            onClick={handlePolish}
            disabled={loading || !situation.trim() || !action.trim()}
            style={{ width: '100%', marginTop: '1.5rem', justifyContent: 'center' }}
          >
            {loading ? (
              <span className="spinner"></span>
            ) : (
              <>
                <Sparkles size={18} /> Polish Narrative with AI
              </>
            )}
          </button>
        </div>

        {/* Polished Result Box */}
        <div className="results-card">
          {polishedData ? (
            <div className="star-polished-wrapper">
              <div className="result-header">
                <h3>Executive Narrative</h3>
                <button className="btn-secondary" onClick={handleCopy}>
                  {copied ? <Check size={16} className="text-success" /> : <Copy size={16} />}
                  {copied ? 'Copied!' : 'Copy Narrative'}
                </button>
              </div>

              <div className="story-output-box">
                <p>"{polishedData.polishedStory}"</p>
              </div>

              <div className="competency-box">
                <h4><BookOpen size={16} /> Key Competency Demonstrated</h4>
                <p>{polishedData.keyTakeaway}</p>
              </div>

              {polishedData.tips && (
                <div className="tips-box">
                  <h4><Lightbulb size={16} /> Delivery Tips for Interviewers</h4>
                  <ul>
                    {polishedData.tips.map((tip, i) => (
                      <li key={i}>{tip}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          ) : (
            <div className="empty-state">
              <Sparkles size={48} className="empty-icon" />
              <h3>Enter your experience details on the left</h3>
              <p>Our AI will structure and polish your bullet points into a fluid, professional behavioral response.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default StarBuilder;
