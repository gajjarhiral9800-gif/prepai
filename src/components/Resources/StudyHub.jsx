import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { 
  BookOpen, 
  Search, 
  Download, 
  ExternalLink, 
  FileText, 
  Clock, 
  Sparkles, 
  X, 
  Maximize2, 
  Minimize2, 
  Copy, 
  Check, 
  RotateCcw,
  BookMarked,
  Layers
} from 'lucide-react';

function StudyHub() {
  const { apiFetch } = useAuth();
  const [resources, setResources] = useState([]);
  const [subjects, setSubjects] = useState([]);
  const [selectedSubject, setSelectedSubject] = useState('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState('newest');
  const [loading, setLoading] = useState(true);

  // In-App Study Reader Modal State
  const [activeResource, setActiveResource] = useState(null);
  const [studySeconds, setStudySeconds] = useState(0);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showNotes, setShowNotes] = useState(false);
  const [studyNotes, setStudyNotes] = useState('');
  const [copyFeedback, setCopyFeedback] = useState(false);

  useEffect(() => {
    fetchData();
  }, []);

  // Study Session Timer
  useEffect(() => {
    let timer;
    if (activeResource) {
      setStudySeconds(0);
      timer = setInterval(() => {
        setStudySeconds(prev => prev + 1);
      }, 1000);

      // Load saved notes for this resource
      const savedNotes = localStorage.getItem(`prepai_notes_${activeResource.id || activeResource._id}`) || '';
      setStudyNotes(savedNotes);
    }
    return () => clearInterval(timer);
  }, [activeResource]);

  // Handle ESC key to exit study reader
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && activeResource) {
        setActiveResource(null);
        setIsFullscreen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [activeResource]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [resData, subData] = await Promise.all([
        apiFetch('/api/user/resources'),
        apiFetch('/api/user/subjects')
      ]);
      setResources(resData.resources || []);
      setSubjects(subData.subjects || []);
    } catch (err) {
      console.error('Failed to load study hub data:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleNotesChange = (text) => {
    setStudyNotes(text);
    if (activeResource) {
      localStorage.setItem(`prepai_notes_${activeResource.id || activeResource._id}`, text);
    }
  };

  const handleCopyNotes = () => {
    if (!studyNotes) return;
    navigator.clipboard.writeText(studyNotes);
    setCopyFeedback(true);
    setTimeout(() => setCopyFeedback(false), 2000);
  };

  // Format study timer seconds into mm:ss or hh:mm:ss
  const formatTimer = (totalSeconds) => {
    const hrs = Math.floor(totalSeconds / 3600);
    const mins = Math.floor((totalSeconds % 3600) / 60);
    const secs = totalSeconds % 60;
    if (hrs > 0) {
      return `${hrs.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const formatFileSize = (bytes) => {
    if (!bytes) return 'PDF Document';
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(0) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  };

  // Determine Domain color class for badges
  const getDomainClass = (subject = '') => {
    const s = subject.toLowerCase();
    if (s.includes('design') || s.includes('ui') || s.includes('ux')) return 'design';
    if (s.includes('front') || s.includes('react') || s.includes('web')) return 'frontend';
    if (s.includes('back') || s.includes('node') || s.includes('api') || s.includes('server')) return 'backend';
    if (s.includes('data') || s.includes('ai') || s.includes('sql') || s.includes('python')) return 'data';
    if (s.includes('system') || s.includes('architect') || s.includes('cloud') || s.includes('devops')) return 'system';
    return 'general';
  };

  // Dynamically assemble unique subject list for pills
  const availableDomains = ['All', ...new Set([
    ...resources.map(r => r.subject).filter(Boolean),
    ...subjects.map(s => s.name).filter(Boolean),
    'Frontend Development',
    'Backend Development',
    'Data Science',
    'UI/UX Design',
    'Graphic Design',
    'System Design'
  ])];

  // Filtering & Sorting
  const filteredResources = resources.filter(res => {
    const matchesSubject = selectedSubject === 'All' || res.subject === selectedSubject;
    const q = searchQuery.toLowerCase().trim();
    const matchesSearch = !q || 
      (res.title && res.title.toLowerCase().includes(q)) ||
      (res.description && res.description.toLowerCase().includes(q)) ||
      (res.fileName && res.fileName.toLowerCase().includes(q)) ||
      (res.subject && res.subject.toLowerCase().includes(q));
    return matchesSubject && matchesSearch;
  }).sort((a, b) => {
    if (sortBy === 'newest') {
      return new Date(b.uploadedAt || b.createdAt || 0) - new Date(a.uploadedAt || a.createdAt || 0);
    }
    if (sortBy === 'oldest') {
      return new Date(a.uploadedAt || a.createdAt || 0) - new Date(b.uploadedAt || b.createdAt || 0);
    }
    if (sortBy === 'title') {
      return (a.title || '').localeCompare(b.title || '');
    }
    if (sortBy === 'subject') {
      return (a.subject || '').localeCompare(b.subject || '');
    }
    return 0;
  });

  return (
    <div className="module-container study-hub-wrapper">
      {/* Hero Section */}
      <div className="study-hub-hero">
        <div className="study-hero-badge">
          <BookOpen size={14} /> Student Resource Library & Reference Hub
        </div>
        <h1>Study Hub & Learning Materials</h1>
        <p>
          Master technical interviews with curated cheatsheets, system design frameworks, domain study guides, 
          and reference manuals uploaded by instructors and administrators. Open & study directly inside PrepAI or download to your device.
        </p>

        <div className="study-stats-row">
          <div className="study-stat-pill">
            <BookMarked size={15} style={{ color: 'var(--primary)' }} />
            <span>Total Guides: <strong>{resources.length}</strong></span>
          </div>
          <div className="study-stat-pill">
            <Layers size={15} style={{ color: 'var(--cyan)' }} />
            <span>Active Domains: <strong>{new Set(resources.map(r => r.subject)).size || 1}</strong></span>
          </div>
          <div className="study-stat-pill">
            <FileText size={15} style={{ color: 'var(--success)' }} />
            <span>Format: <strong>High-Res Verified PDFs</strong></span>
          </div>
        </div>
      </div>

      {/* Filter and Search Controls */}
      <div className="study-filter-card">
        {/* Search Bar */}
        <div className="study-search-bar">
          <Search size={18} className="study-search-icon" />
          <input
            type="text"
            className="study-search-input"
            placeholder="Search by guide title, technology, topic keywords (e.g. React, SQL, STAR, Architecture)..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
          {searchQuery && (
            <button 
              className="study-search-clear" 
              onClick={() => setSearchQuery('')}
              title="Clear search"
            >
              <X size={16} />
            </button>
          )}
        </div>

        {/* Quick Subject Filter Pills */}
        <div className="subject-pills-row">
          {availableDomains.map((domain) => (
            <button
              key={domain}
              className={`subject-pill-btn ${selectedSubject === domain ? 'active' : ''}`}
              onClick={() => setSelectedSubject(domain)}
            >
              {domain === 'All' ? '🌐 All Domains' : domain}
            </button>
          ))}
        </div>

        {/* Secondary Filter Meta & Sort */}
        <div className="study-meta-bar">
          <div>
            Showing <strong>{filteredResources.length}</strong> of <strong>{resources.length}</strong> study materials
            {selectedSubject !== 'All' && <span> in <em>{selectedSubject}</em></span>}
            {searchQuery && <span> matching <em>"{searchQuery}"</em></span>}
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
            <span>Sort By:</span>
            <select 
              className="study-sort-select"
              value={sortBy} 
              onChange={(e) => setSortBy(e.target.value)}
            >
              <option value="newest">🕒 Newest Added</option>
              <option value="oldest">⏳ Oldest First</option>
              <option value="title">🔤 Title (A to Z)</option>
              <option value="subject">🏷️ Domain Subject</option>
            </select>
            {(selectedSubject !== 'All' || searchQuery) && (
              <button 
                onClick={() => { setSelectedSubject('All'); setSearchQuery(''); }}
                style={{ background: 'transparent', color: 'var(--primary)', fontSize: '0.82rem', marginLeft: '0.5rem', textDecoration: 'underline' }}
              >
                Reset Filters
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Resource Cards Grid */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: '4rem 1rem' }}>
          <span className="spinner spinner-large"></span>
          <p style={{ marginTop: '1.25rem', color: '#94a3b8', fontSize: '1rem' }}>
            Fetching curated study guides and reference materials...
          </p>
        </div>
      ) : filteredResources.length > 0 ? (
        <div className="study-grid">
          {filteredResources.map((item) => (
            <div key={item.id || item._id} className="study-card">
              <div>
                {/* Card Top Meta */}
                <div className="study-card-header">
                  <span className={`domain-tag ${getDomainClass(item.subject)}`}>
                    {item.subject || 'General'}
                  </span>
                  <span className="file-type-pill">
                    <FileText size={12} /> {formatFileSize(item.fileSize)}
                  </span>
                </div>

                {/* Title */}
                <h3 className="study-card-title" title={item.title}>
                  {item.title}
                </h3>

                {/* Description */}
                <p className="study-card-desc">
                  {item.description || 'Comprehensive reference resource and interview preparation study guide.'}
                </p>

                {/* File info strip */}
                <div className="study-file-info">
                  <FileText size={14} style={{ color: 'var(--primary)', flexShrink: 0 }} />
                  <span className="study-file-name" title={item.fileName || 'study-guide.pdf'}>
                    {item.fileName || 'study-material.pdf'}
                  </span>
                  <span style={{ fontSize: '0.72rem', color: '#64748b', display: 'flex', alignItems: 'center', gap: '0.25rem', flexShrink: 0 }}>
                    <Clock size={11} />
                    {item.uploadedAt ? new Date(item.uploadedAt).toLocaleDateString() : 'Recent'}
                  </span>
                </div>
              </div>

              {/* Action Buttons: Open & Study vs Download */}
              <div className="study-card-actions">
                {/* 1. Open and Study in In-App PDF Reader Modal */}
                <button
                  type="button"
                  className="btn-study-open"
                  onClick={() => setActiveResource(item)}
                  title="Open and study this guide in PrepAI Reader"
                >
                  <BookOpen size={16} /> Open & Study
                </button>

                {/* 2. Download PDF directly */}
                <a
                  href={`/api/resources/${item.id || item._id}/download`}
                  download={item.fileName || `${item.title}.pdf`}
                  className="btn-study-download"
                  title="Download PDF to your computer"
                >
                  <Download size={15} /> Download
                </a>

                {/* 3. Open in new browser tab */}
                <a
                  href={item.fileUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="btn-study-ext"
                  title="Open PDF directly in new browser tab"
                >
                  <ExternalLink size={15} />
                </a>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="study-empty-state">
          <div className="study-empty-icon">
            <BookOpen size={32} />
          </div>
          <h3>No Study Resources Found</h3>
          <p>
            {searchQuery || selectedSubject !== 'All' 
              ? `No materials matched "${searchQuery || selectedSubject}". Try selecting another domain or clearing your search keywords.`
              : 'The administrator has not uploaded study materials yet. Please check back shortly for updated guides and documentation!'}
          </p>
          {(searchQuery || selectedSubject !== 'All') && (
            <button 
              className="btn-primary"
              onClick={() => { setSelectedSubject('All'); setSearchQuery(''); }}
              style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem' }}
            >
              <RotateCcw size={15} /> View All Study Guides
            </button>
          )}
        </div>
      )}

      {/* =====================================================================
          IN-APP PDF STUDY READER MODAL
          ===================================================================== */}
      {activeResource && (
        <div 
          className="study-modal-backdrop"
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              setActiveResource(null);
              setIsFullscreen(false);
            }
          }}
        >
          <div className={`study-modal-container ${isFullscreen ? 'fullscreen' : ''}`}>
            {/* Modal Header */}
            <div className="study-modal-header">
              <div className="study-modal-header-left">
                <span className={`domain-tag ${getDomainClass(activeResource.subject)}`}>
                  {activeResource.subject || 'General'}
                </span>
                <span className="study-modal-title" title={activeResource.title}>
                  {activeResource.title}
                </span>
              </div>

              {/* Live Study Session Timer */}
              <div className="study-timer-badge" title="Active Study Time in this session">
                <Clock size={14} /> Study Session: {formatTimer(studySeconds)}
              </div>

              {/* Action Toolbar */}
              <div className="study-modal-controls">
                {/* Notes Toggle */}
                <button 
                  className={`btn-modal-action ${showNotes ? 'active' : ''}`}
                  onClick={() => setShowNotes(!showNotes)}
                  title="Toggle Study Notes Notepad"
                >
                  <FileText size={15} /> {showNotes ? 'Hide Notes' : 'Study Notes'}
                </button>

                {/* Open in full tab */}
                <a 
                  href={activeResource.fileUrl} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="btn-modal-action"
                  title="Open in new browser tab"
                >
                  <ExternalLink size={15} /> Open in Tab
                </a>

                {/* Download PDF button */}
                <a 
                  href={`/api/resources/${activeResource.id || activeResource._id}/download`} 
                  download={activeResource.fileName || `${activeResource.title}.pdf`}
                  className="btn-modal-action"
                  title="Download PDF"
                >
                  <Download size={15} /> Download PDF
                </a>

                {/* Fullscreen Toggle */}
                <button 
                  className="btn-modal-action"
                  onClick={() => setIsFullscreen(!isFullscreen)}
                  title={isFullscreen ? 'Exit Fullscreen' : 'Enter Fullscreen'}
                >
                  {isFullscreen ? <Minimize2 size={15} /> : <Maximize2 size={15} />}
                </button>

                {/* Close Button */}
                <button 
                  className="btn-modal-close"
                  onClick={() => { setActiveResource(null); setIsFullscreen(false); }}
                  title="Close Study Reader (ESC)"
                >
                  <X size={18} />
                </button>
              </div>
            </div>

            {/* Modal Body: Embedded PDF Viewer + Side Notes Drawer */}
            <div className="study-modal-body">
              {/* PDF Viewer Pane */}
              <div className="study-viewer-pane">
                <iframe
                  src={`${activeResource.fileUrl}#toolbar=1&navpanes=1`}
                  title={activeResource.title}
                  className="study-pdf-frame"
                />
              </div>

              {/* Study Notes Drawer (Collapsible) */}
              {showNotes && (
                <div className="study-notes-pane">
                  <div className="study-notes-header">
                    <h4><Sparkles size={16} style={{ color: 'var(--primary)' }} /> Study Notes</h4>
                    <button 
                      onClick={handleCopyNotes}
                      className="btn-modal-action"
                      style={{ padding: '0.25rem 0.5rem', fontSize: '0.75rem' }}
                      title="Copy notes to clipboard"
                    >
                      {copyFeedback ? (
                        <>
                          <Check size={13} style={{ color: 'var(--success)' }} /> Copied!
                        </>
                      ) : (
                        <>
                          <Copy size={13} /> Copy
                        </>
                      )}
                    </button>
                  </div>

                  <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginBottom: '0.75rem' }}>
                    Jot down key takeaways, interview questions, or formulas while reviewing this document. Notes are auto-saved to your browser.
                  </p>

                  <textarea
                    className="study-notes-textarea"
                    placeholder="Type your study notes here..."
                    value={studyNotes}
                    onChange={(e) => handleNotesChange(e.target.value)}
                  />

                  <div className="study-notes-footer">
                    <span>Auto-saved locally</span>
                    {studyNotes && (
                      <button 
                        onClick={() => handleNotesChange('')}
                        style={{ background: 'transparent', color: '#fca5a5', border: 'none', cursor: 'pointer', fontSize: '0.75rem' }}
                      >
                        Clear Notes
                      </button>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default StudyHub;
