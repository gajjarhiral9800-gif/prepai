import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { Key, ShieldCheck, CheckCircle2, Save, ExternalLink, Sparkles, AlertCircle } from 'lucide-react';

function ApiKeySettings() {
  const { user, updateApiKey } = useAuth();
  const [apiKey, setApiKey] = useState(user?.apiKey || '');
  const [loading, setLoading] = useState(false);
  const [statusMsg, setStatusMsg] = useState({ type: '', text: '' });

  const handleSave = async (e) => {
    e.preventDefault();
    setLoading(true);
    setStatusMsg({ type: '', text: '' });

    try {
      await updateApiKey(apiKey.trim());
      setStatusMsg({
        type: 'success',
        text: 'API Key updated successfully! Your custom Gemini key will be used for AI modules.'
      });
    } catch (err) {
      setStatusMsg({
        type: 'error',
        text: err.message || 'Failed to update API key.'
      });
    } finally {
      setLoading(false);
    }
  };

  const hasCustomKey = Boolean(user?.apiKey && user.apiKey.trim());

  return (
    <div className="module-container" style={{ maxWidth: '800px', margin: '0 auto' }}>
      <div className="module-header">
        <div className="badge-pill">
          <Key size={14} /> Security & AI Integration
        </div>
        <h1>API Key Configuration</h1>
        <p>Configure your personal Google Gemini API key for high-performance custom AI interview generation.</p>
      </div>

      <div className="config-card">
        {/* Status Indicator */}
        <div className={`status-banner ${hasCustomKey ? 'status-active' : 'status-fallback'}`}>
          {hasCustomKey ? (
            <>
              <CheckCircle2 size={24} className="text-success" />
              <div>
                <h4>Personal Gemini API Key Active</h4>
                <p>Your custom key is attached to AI interview, resume, and quiz requests.</p>
              </div>
            </>
          ) : (
            <>
              <Sparkles size={24} className="text-cyan" />
              <div>
                <h4>Smart AI Engine Active (Built-in Fallback)</h4>
                <p>You are using PrepAI's built-in intelligent engine. Add a personal key below for unlimited custom Gemini 2.5 Flash generations.</p>
              </div>
            </>
          )}
        </div>

        {statusMsg.text && (
          <div className={`alert-${statusMsg.type === 'success' ? 'success' : 'error'}`} style={{ marginTop: '1rem' }}>
            {statusMsg.type === 'success' ? <CheckCircle2 size={18} /> : <AlertCircle size={18} />}
            <span>{statusMsg.text}</span>
          </div>
        )}

        <form onSubmit={handleSave} style={{ marginTop: '1.5rem' }}>
          <div className="input-group">
            <label>Google Gemini API Key</label>
            <div className="input-wrapper">
              <Key className="input-icon" size={18} />
              <input
                type="password"
                placeholder="AIzaSy..."
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
              />
            </div>
            <span className="input-help">
              Don't have a key? Get a free API key from{' '}
              <a
                href="https://aistudio.google.com/app/apikey"
                target="_blank"
                rel="noreferrer"
                className="external-link"
              >
                Google AI Studio <ExternalLink size={12} />
              </a>
            </span>
          </div>

          <div className="security-notice">
            <ShieldCheck size={18} className="text-indigo" />
            <span>
              Your API key is encrypted and stored safely in your user database profile. It is never shared or exposed publicly.
            </span>
          </div>

          <button
            type="submit"
            className="btn-primary"
            disabled={loading}
            style={{ width: '100%', marginTop: '1.5rem', justifyContent: 'center' }}
          >
            {loading ? (
              <span className="spinner"></span>
            ) : (
              <>
                <Save size={18} /> Save API Key Settings
              </>
            )}
          </button>
        </form>
      </div>
    </div>
  );
}

export default ApiKeySettings;
