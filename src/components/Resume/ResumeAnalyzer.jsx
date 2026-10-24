import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { 
  FileText, 
  Sparkles, 
  CheckCircle2, 
  AlertCircle, 
  ArrowRight, 
  Upload, 
  File, 
  Download, 
  Copy, 
  Check, 
  Printer, 
  Edit3, 
  RefreshCw, 
  Wand2, 
  Layers, 
  Briefcase, 
  Mail, 
  Phone, 
  MapPin, 
  Globe, 
  ExternalLink,
  ChevronRight
} from 'lucide-react';

function ResumeAnalyzer() {
  const { user, apiFetch } = useAuth();
  
  // Top Level Navigation Tab: 'scanner' | 'builder'
  const [activeMainTab, setActiveMainTab] = useState('scanner');

  // --- SCANNER STATES ---
  const [activeInputTab, setActiveInputTab] = useState('upload'); // 'upload' | 'text'
  const [selectedFile, setSelectedFile] = useState(null);
  const [resumeText, setResumeText] = useState('');
  const [jobDescription, setJobDescription] = useState('Graphic Designer');
  const [loading, setLoading] = useState(false);
  const [analysis, setAnalysis] = useState(null);
  const [copiedBulletIdx, setCopiedBulletIdx] = useState(null);

  // --- BUILDER / UPDATER STATES ---
  const [builderMode, setBuilderMode] = useState('tailor'); // 'tailor' | 'create'
  const [builderData, setBuilderData] = useState({
    targetJob: 'Graphic Designer',
    fullName: user?.name || 'Alex Morgan',
    email: user?.email || 'alex.morgan.portfolio@example.com',
    phone: '+1 (555) 234-5678',
    location: 'New York, NY (Open to Remote)',
    portfolioUrl: 'https://alexmorgan.design',
    linkedinUrl: 'https://linkedin.com/in/alexmorgan',
    experienceLevel: 'Mid-Level',
    notes: '',
    missingSkills: ['Adobe Illustrator', 'Adobe Photoshop', 'Adobe InDesign', 'Typography']
  });
  const [generatedResume, setGeneratedResume] = useState(null);
  const [isGeneratingResume, setIsGeneratingResume] = useState(false);
  const [isEditingResume, setIsEditingResume] = useState(false);
  const [copiedResume, setCopiedResume] = useState(false);
  const [savedSessionMsg, setSavedSessionMsg] = useState('');
  const [resumeTheme, setResumeTheme] = useState('indigo');

  const themeOptions = [
    { id: 'indigo', name: 'Indigo Accent', color: '#4338ca' },
    { id: 'cyan', name: 'Ocean Cyan', color: '#0284c7' },
    { id: 'emerald', name: 'Emerald', color: '#059669' },
    { id: 'charcoal', name: 'Slate Dark', color: '#0f172a' },
    { id: 'rose', name: 'Rose Red', color: '#e11d48' }
  ];

  const currentAccent = themeOptions.find(t => t.id === resumeTheme)?.color || '#4338ca';

  // Quick Role Presets
  const popularRoles = [
    'Graphic Designer',
    'Video Editor',
    'UI/UX Designer',
    'Frontend Developer',
    'Full Stack Developer',
    'Data Analyst'
  ];

  // ==========================
  // 1. SCANNER HANDLERS
  // ==========================
  const handleAnalyze = async () => {
    if (activeInputTab === 'upload' && !selectedFile && !resumeText.trim()) {
      alert('Please select a resume file (.pdf, .txt) or paste your resume content.');
      return;
    }
    if (activeInputTab === 'text' && !resumeText.trim()) {
      alert('Please paste your resume text to analyze.');
      return;
    }

    setLoading(true);
    try {
      let data;
      if (activeInputTab === 'upload' && selectedFile) {
        const formData = new FormData();
        formData.append('resumeFile', selectedFile);
        formData.append('jobDescription', jobDescription);

        data = await apiFetch('/api/ai/resume/upload-analyze', {
          method: 'POST',
          body: formData
        });

        if (data.extractedText) {
          setResumeText(data.extractedText);
        }
      } else {
        data = await apiFetch('/api/ai/resume/analyze', {
          method: 'POST',
          body: JSON.stringify({ resumeText, jobDescription })
        });
      }

      setAnalysis(data.analysis);

      // Pre-fill builder data with detected role and missing skills
      if (data.analysis) {
        setBuilderData(prev => ({
          ...prev,
          targetJob: data.analysis.targetRoleDetected || jobDescription || 'Graphic Designer',
          missingSkills: data.analysis.missingSkills || prev.missingSkills
        }));

        // Automatically save session to history
        apiFetch('/api/user/save-session', {
          method: 'POST',
          body: JSON.stringify({
            type: 'resume',
            title: `ATS Review: ${data.analysis.targetRoleDetected || jobDescription || 'General Role'} (${data.analysis.atsScore}%)`,
            score: data.analysis.atsScore || 75,
            data: data.analysis
          })
        }).catch(err => console.error('Auto save error:', err));
      }
    } catch (err) {
      alert('Failed to analyze resume: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  // One-click switch from Scanner into Resume Builder
  const handleTransferToBuilder = () => {
    setActiveMainTab('builder');
    setBuilderMode('tailor');
    if (analysis) {
      setBuilderData(prev => ({
        ...prev,
        targetJob: analysis.targetRoleDetected || jobDescription || prev.targetJob,
        missingSkills: analysis.missingSkills || prev.missingSkills
      }));
    }
    // Automatically trigger builder if resume has not been built yet
    if (!generatedResume) {
      triggerBuildResume(analysis?.targetRoleDetected || jobDescription, analysis?.missingSkills);
    }
  };

  const handleCopyBullets = (bullets, idx) => {
    const textToCopy = Array.isArray(bullets) ? bullets.join('\n') : bullets;
    navigator.clipboard.writeText(textToCopy);
    setCopiedBulletIdx(idx);
    setTimeout(() => setCopiedBulletIdx(null), 2500);
  };

  // ==========================
  // 2. RESUME BUILDER HANDLERS
  // ==========================
  const triggerBuildResume = async (overrideTargetRole, overrideMissingSkills) => {
    setIsGeneratingResume(true);
    setSavedSessionMsg('');
    try {
      const payload = {
        mode: builderMode,
        resumeText: resumeText || '',
        targetJob: overrideTargetRole || builderData.targetJob || 'Graphic Designer',
        missingSkills: overrideMissingSkills || builderData.missingSkills || [],
        userData: {
          fullName: builderData.fullName,
          email: builderData.email,
          phone: builderData.phone,
          location: builderData.location,
          portfolioUrl: builderData.portfolioUrl,
          linkedinUrl: builderData.linkedinUrl,
          experienceLevel: builderData.experienceLevel,
          notes: builderData.notes
        }
      };

      const res = await apiFetch('/api/ai/resume/build-or-update', {
        method: 'POST',
        body: JSON.stringify(payload)
      });

      if (res.resume) {
        setGeneratedResume(res.resume);

        // Auto save to sessions
        apiFetch('/api/user/save-session', {
          method: 'POST',
          body: JSON.stringify({
            type: 'resume',
            title: `AI Resume Built: ${res.resume.targetRole || builderData.targetJob} (${builderMode === 'tailor' ? 'Tailored' : 'New'})`,
            score: 95,
            data: res.resume
          })
        }).catch(e => console.error('Auto save resume error:', e));
      }
    } catch (err) {
      alert('Failed to generate resume: ' + err.message);
    } finally {
      setIsGeneratingResume(false);
    }
  };

  // Print as PDF using styled print preview
  const handlePrintPdf = () => {
    window.print();
  };

  // Download formatted plaintext / doc file
  const handleDownloadText = () => {
    if (!generatedResume) return;

    let doc = `${(generatedResume.fullName || 'RESUME').toUpperCase()}\n`;
    doc += `${generatedResume.targetRole || builderData.targetJob}\n`;
    doc += `Email: ${generatedResume.contact?.email || ''} | Phone: ${generatedResume.contact?.phone || ''} | Location: ${generatedResume.contact?.location || ''}\n`;
    if (generatedResume.contact?.portfolio) doc += `Portfolio: ${generatedResume.contact?.portfolio}\n`;
    if (generatedResume.contact?.linkedin) doc += `LinkedIn: ${generatedResume.contact?.linkedin}\n`;
    doc += `\n${'='.repeat(60)}\n`;
    doc += `PROFESSIONAL SUMMARY\n${'='.repeat(60)}\n`;
    doc += `${generatedResume.summary || ''}\n\n`;

    doc += `${'='.repeat(60)}\n`;
    doc += `TECHNICAL & DOMAIN SKILLS\n${'='.repeat(60)}\n`;
    if (generatedResume.skills?.coreTools) doc += `Core Tools: ${generatedResume.skills.coreTools.join(', ')}\n`;
    if (generatedResume.skills?.domainExpertise) doc += `Domain Competencies: ${generatedResume.skills.domainExpertise.join(', ')}\n`;
    if (generatedResume.skills?.softSkills) doc += `Professional Skills: ${generatedResume.skills.softSkills.join(', ')}\n`;
    doc += `\n`;

    if (generatedResume.projects && generatedResume.projects.length > 0) {
      doc += `${'='.repeat(60)}\n`;
      doc += `FEATURED PROJECTS & CASE STUDIES\n${'='.repeat(60)}\n`;
      generatedResume.projects.forEach(p => {
        doc += `${p.name} | ${p.tools || ''} (${p.period || ''})\n`;
        if (p.bullets) {
          p.bullets.forEach(b => {
            doc += `  • ${b.replace(/^•\s*/, '')}\n`;
          });
        }
        doc += `\n`;
      });
    }

    if (generatedResume.experience && generatedResume.experience.length > 0) {
      doc += `${'='.repeat(60)}\n`;
      doc += `PROFESSIONAL EXPERIENCE\n${'='.repeat(60)}\n`;
      generatedResume.experience.forEach(exp => {
        doc += `${exp.role} - ${exp.company} (${exp.period || ''}) [${exp.location || ''}]\n`;
        if (exp.bullets) {
          exp.bullets.forEach(b => {
            doc += `  • ${b.replace(/^•\s*/, '')}\n`;
          });
        }
        doc += `\n`;
      });
    }

    if (generatedResume.education && generatedResume.education.length > 0) {
      doc += `${'='.repeat(60)}\n`;
      doc += `EDUCATION\n${'='.repeat(60)}\n`;
      generatedResume.education.forEach(ed => {
        doc += `${ed.degree} - ${ed.institution} (${ed.year || ''})\n`;
      });
      doc += `\n`;
    }

    if (generatedResume.certifications && generatedResume.certifications.length > 0) {
      doc += `${'='.repeat(60)}\n`;
      doc += `CERTIFICATIONS & CREDENTIALS\n${'='.repeat(60)}\n`;
      generatedResume.certifications.forEach(c => {
        doc += `  • ${c}\n`;
      });
    }

    const blob = new Blob([doc], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    const cleanFileName = (generatedResume.fullName || 'resume').toLowerCase().replace(/[^a-z0-9]/g, '_');
    link.download = `${cleanFileName}_${(generatedResume.targetRole || 'ats_resume').toLowerCase().replace(/[^a-z0-9]/g, '_')}.txt`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const handleCopyResumeToClipboard = () => {
    if (!generatedResume) return;
    const text = JSON.stringify(generatedResume, null, 2);
    navigator.clipboard.writeText(text);
    setCopiedResume(true);
    setTimeout(() => setCopiedResume(false), 2500);
  };

  return (
    <div className="module-container">
      {/* Top Main Navigation Tabs */}
      <div className="resume-module-tabs">
        <button
          className={`resume-tab-btn ${activeMainTab === 'scanner' ? 'active' : ''}`}
          onClick={() => setActiveMainTab('scanner')}
          type="button"
        >
          <FileText size={18} />
          <span>ATS Compatibility Scanner</span>
        </button>
        <button
          className={`resume-tab-btn ${activeMainTab === 'builder' ? 'active' : ''}`}
          onClick={() => setActiveMainTab('builder')}
          type="button"
        >
          <Sparkles size={18} />
          <span>AI Resume Builder & Tailor</span>
          <span className="badge-highlight">AI Studio</span>
        </button>
      </div>

      {/* ======================================================== */}
      {/* TAB 1: ATS COMPATIBILITY SCANNER                         */}
      {/* ======================================================== */}
      {activeMainTab === 'scanner' && (
        <div className="scanner-view-wrapper">
          <div className="module-header" style={{ marginBottom: '1.5rem' }}>
            <div className="badge-pill">
              <FileText size={14} /> Multi-Domain ATS Scoring & Skill Gap Engine
            </div>
            <h1>Resume & ATS Compatibility Scanner</h1>
            <p>
              Type your target job (e.g. <strong>Graphic Designer</strong>, <strong>Video Editor</strong>, <strong>Frontend Developer</strong>) 
              to scan against industry benchmark toolsets, discover missing skills, and receive deep evaluations of your existing projects.
            </p>
          </div>

          <div className="resume-grid">
            {/* Input Card */}
            <div className="input-card">
              {/* Input Mode Selector */}
              <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.25rem' }}>
                <button
                  className={`pill ${activeInputTab === 'upload' ? 'active' : ''}`}
                  onClick={() => setActiveInputTab('upload')}
                  type="button"
                >
                  <Upload size={14} /> Upload Resume (.PDF / .TXT)
                </button>
                <button
                  className={`pill ${activeInputTab === 'text' ? 'active' : ''}`}
                  onClick={() => setActiveInputTab('text')}
                  type="button"
                >
                  <FileText size={14} /> Paste Resume Text
                </button>
              </div>

              {activeInputTab === 'upload' ? (
                <div className="input-group">
                  <label>1. Select Resume Document</label>
                  <div style={{
                    padding: '1.75rem',
                    border: '2px dashed var(--border-glow)',
                    borderRadius: '12px',
                    textAlign: 'center',
                    background: 'rgba(15, 23, 42, 0.5)',
                    cursor: 'pointer'
                  }}>
                    <Upload size={32} style={{ color: 'var(--cyan)', marginBottom: '0.5rem' }} />
                    <p style={{ fontSize: '0.9rem', color: 'var(--text-main)', fontWeight: 600 }}>
                      {selectedFile ? selectedFile.name : 'Click to select or drag & drop PDF/TXT file'}
                    </p>
                    <span style={{ fontSize: '0.78rem', color: 'var(--text-dim)' }}>
                      Supports .pdf, .docx, .txt (Max 10MB)
                    </span>
                    <input
                      type="file"
                      accept=".pdf,.docx,.txt"
                      onChange={(e) => setSelectedFile(e.target.files[0])}
                      style={{ display: 'block', marginTop: '1rem', width: '100%' }}
                    />
                  </div>
                </div>
              ) : (
                <div className="input-group">
                  <label>1. Paste Your Resume Content</label>
                  <textarea
                    rows={8}
                    placeholder="Paste your resume sections (Profile, Skills, Experience, Projects)..."
                    value={resumeText}
                    onChange={(e) => setResumeText(e.target.value)}
                  />
                </div>
              )}

              {/* Target Job Title & Quick Presets */}
              <div className="input-group" style={{ marginTop: '1.25rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.4rem' }}>
                  <label style={{ margin: 0 }}>2. Target Job Title or Job Description</label>
                  <span style={{ fontSize: '0.75rem', color: 'var(--cyan)' }}>Quick Presets below</span>
                </div>
                <input
                  type="text"
                  placeholder="e.g. Graphic Designer"
                  value={jobDescription}
                  onChange={(e) => setJobDescription(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '0.75rem 1rem',
                    background: 'var(--bg-input)',
                    border: '1px solid var(--border-color)',
                    borderRadius: '8px',
                    color: '#fff',
                    marginBottom: '0.6rem'
                  }}
                />

                {/* Quick Role Chips */}
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem', marginTop: '0.2rem' }}>
                  {popularRoles.map(role => (
                    <button
                      key={role}
                      type="button"
                      onClick={() => setJobDescription(role)}
                      style={{
                        background: jobDescription.toLowerCase() === role.toLowerCase() 
                          ? 'rgba(6, 182, 212, 0.25)' 
                          : 'rgba(255, 255, 255, 0.05)',
                        border: jobDescription.toLowerCase() === role.toLowerCase()
                          ? '1px solid var(--cyan)'
                          : '1px solid var(--border-color)',
                        color: jobDescription.toLowerCase() === role.toLowerCase() ? '#ffffff' : 'var(--text-muted)',
                        padding: '0.25rem 0.65rem',
                        borderRadius: '20px',
                        fontSize: '0.75rem',
                        cursor: 'pointer',
                        transition: 'all 0.2s ease'
                      }}
                    >
                      {role}
                    </button>
                  ))}
                </div>
              </div>

              <button 
                className="btn-primary" 
                onClick={handleAnalyze} 
                disabled={loading}
                style={{ width: '100%', marginTop: '1.5rem', justifyContent: 'center' }}
              >
                {loading ? (
                  <span className="spinner"></span>
                ) : (
                  <>
                    <Sparkles size={18} /> Analyze ATS Match & Check Missing Skills
                  </>
                )}
              </button>
            </div>

            {/* Results Card */}
            <div className="results-card">
              {analysis ? (
                <div className="analysis-wrapper">
                  {/* ATS Score Banner */}
                  <div className="score-banner">
                    <div className="ats-score-badge">
                      <span className="ats-num">{analysis.atsScore}%</span>
                      <span className="ats-label">ATS Score</span>
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.3rem' }}>
                        <h3 style={{ margin: 0 }}>ATS Compatibility Match</h3>
                        {analysis.targetRoleDetected && (
                          <span className="tag" style={{ background: 'rgba(99, 102, 241, 0.2)', color: '#c7d2fe', fontSize: '0.75rem' }}>
                            Target: {analysis.targetRoleDetected}
                          </span>
                        )}
                      </div>
                      <p style={{ fontSize: '0.88rem', color: 'var(--text-muted)', lineHeight: '1.4' }}>
                        {analysis.summary}
                      </p>
                    </div>
                  </div>

                  {/* 1. Missing Skills Section (Prominent) */}
                  <div className="keyword-section" style={{
                    padding: '1.2rem',
                    background: 'rgba(245, 158, 11, 0.08)',
                    border: '1px solid rgba(245, 158, 11, 0.3)',
                    borderRadius: '14px',
                    marginBottom: '1.25rem'
                  }}>
                    <h4 style={{ color: '#fbbf24', display: 'flex', alignItems: 'center', gap: '0.5rem', margin: 0, marginBottom: '0.6rem' }}>
                      <AlertCircle size={18} /> Missing Essential Skills for {analysis.targetRoleDetected || jobDescription} ({analysis.missingSkills?.length || 0})
                    </h4>
                    <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '0.75rem' }}>
                      These industry-standard tools and competencies were not found in your resume text. Adding them significantly increases interview callbacks:
                    </p>
                    <div className="tag-cloud">
                      {analysis.missingSkills?.map((kw, idx) => (
                        <span key={idx} className="tag tag-warning" style={{ fontSize: '0.85rem', padding: '0.35rem 0.8rem' }}>
                          + {kw}
                        </span>
                      ))}
                    </div>
                  </div>

                  {/* 2. Key Matching Skills Section */}
                  <div className="keyword-section">
                    <h4><CheckCircle2 size={16} /> Key Matching Skills Found ({analysis.foundKeywords?.length || 0})</h4>
                    <div className="tag-cloud">
                      {analysis.foundKeywords && analysis.foundKeywords.length > 0 ? (
                        analysis.foundKeywords.map((kw, idx) => (
                          <span key={idx} className="tag tag-success">{kw}</span>
                        ))
                      ) : (
                        <span style={{ fontSize: '0.85rem', color: 'var(--text-dim)' }}>
                          No core {analysis.targetRoleDetected || jobDescription} skills matched yet.
                        </span>
                      )}
                    </div>
                  </div>

                  {/* 3. Deep Dive into Candidate's Existing Projects (USER's REQUIREMENT) */}
                  {analysis.existingProjectsAnalysis && analysis.existingProjectsAnalysis.length > 0 && (
                    <div className="existing-projects-section" style={{ margin: '1.5rem 0' }}>
                      <h4 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--cyan)', marginBottom: '0.85rem' }}>
                        <Layers size={18} /> Detailed Evaluation of Your Existing Resume Projects ({analysis.existingProjectsAnalysis.length})
                      </h4>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                        {analysis.existingProjectsAnalysis.map((proj, pIdx) => (
                          <div key={pIdx} className="project-detail-card" style={{
                            padding: '1.25rem',
                            background: 'rgba(15, 23, 42, 0.75)',
                            border: '1px solid rgba(6, 182, 212, 0.25)',
                            borderRadius: '12px'
                          }}>
                            {/* Project Header */}
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.5rem', marginBottom: '0.6rem' }}>
                              <h5 style={{ fontSize: '1rem', fontWeight: 700, color: '#ffffff', margin: 0 }}>
                                {proj.projectTitle}
                              </h5>
                              <span className="tag" style={{ background: 'rgba(6, 182, 212, 0.15)', color: 'var(--cyan)', fontSize: '0.75rem' }}>
                                {proj.roleRelevance}
                              </span>
                            </div>

                            {/* Detected Tools */}
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', flexWrap: 'wrap', marginBottom: '0.75rem' }}>
                              <span style={{ fontSize: '0.75rem', color: 'var(--text-dim)' }}>Tools Detected:</span>
                              {proj.techUsed?.map((t, tIdx) => (
                                <span key={tIdx} style={{
                                  fontSize: '0.72rem',
                                  padding: '0.15rem 0.5rem',
                                  background: 'rgba(255, 255, 255, 0.06)',
                                  borderRadius: '4px',
                                  color: 'var(--text-muted)'
                                }}>
                                  {t}
                                </span>
                              ))}
                            </div>

                            {/* Strengths & Gaps */}
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '0.5rem', marginBottom: '0.9rem' }}>
                              <div style={{ fontSize: '0.82rem', color: '#6ee7b7' }}>
                                <strong>✓ Strength:</strong> {proj.strengths}
                              </div>
                              <div style={{ fontSize: '0.82rem', color: '#fde047' }}>
                                <strong>⚠ Skill Gap / Missing:</strong> {proj.criticalGaps}
                              </div>
                            </div>

                            {/* AI Rewritten High-Impact Bullet Points */}
                            {proj.improvedBulletPoints && proj.improvedBulletPoints.length > 0 && (
                              <div style={{
                                background: 'rgba(0, 0, 0, 0.35)',
                                padding: '0.85rem 1rem',
                                borderRadius: '8px',
                                borderLeft: '3px solid var(--cyan)'
                              }}>
                                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.4rem' }}>
                                  <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--cyan)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                                    ✨ AI-Rewritten High-Impact Bullet Points (STAR + Metrics):
                                  </span>
                                  <button
                                    type="button"
                                    onClick={() => handleCopyBullets(proj.improvedBulletPoints, pIdx)}
                                    style={{
                                      display: 'inline-flex',
                                      alignItems: 'center',
                                      gap: '0.3rem',
                                      fontSize: '0.72rem',
                                      padding: '0.2rem 0.5rem',
                                      borderRadius: '4px',
                                      background: copiedBulletIdx === pIdx ? 'rgba(16, 185, 129, 0.3)' : 'rgba(255, 255, 255, 0.1)',
                                      color: copiedBulletIdx === pIdx ? '#6ee7b7' : '#fff',
                                      border: 'none',
                                      cursor: 'pointer'
                                    }}
                                  >
                                    {copiedBulletIdx === pIdx ? <Check size={12} /> : <Copy size={12} />}
                                    {copiedBulletIdx === pIdx ? 'Copied!' : 'Copy Bullets'}
                                  </button>
                                </div>
                                <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                                  {proj.improvedBulletPoints.map((bullet, bIdx) => (
                                    <li key={bIdx} style={{ fontSize: '0.82rem', color: 'var(--text-main)', lineHeight: '1.4' }}>
                                      {bullet}
                                    </li>
                                  ))}
                                </ul>
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* 4. Recommended New Projects to Add to Portfolio */}
                  {analysis.recommendedProjects && analysis.recommendedProjects.length > 0 && (
                    <div className="projects-recommendation-section" style={{ margin: '1.5rem 0' }}>
                      <h4 style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', color: '#c084fc', marginBottom: '0.75rem' }}>
                        <Sparkles size={16} /> Recommended Role Portfolio Projects to Add ({analysis.recommendedProjects.length})
                      </h4>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                        {analysis.recommendedProjects.map((proj, idx) => (
                          <div key={idx} style={{
                            padding: '1rem 1.25rem',
                            background: 'rgba(15, 23, 42, 0.7)',
                            border: '1px solid rgba(192, 132, 252, 0.3)',
                            borderRadius: '12px'
                          }}>
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.4rem' }}>
                              <h5 style={{ fontSize: '0.95rem', fontWeight: 700, color: '#ffffff', margin: 0 }}>{proj.title}</h5>
                              <span className="tag" style={{ background: 'rgba(192, 132, 252, 0.2)', color: '#d8b4fe', fontSize: '0.7rem' }}>
                                {proj.category}
                              </span>
                            </div>
                            <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', lineHeight: '1.4', margin: 0 }}>
                              {proj.description}
                            </p>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* 5. Actionable Advice */}
                  <div className="advice-section" style={{ marginBottom: '1.5rem' }}>
                    <h4>Optimization Action Items</h4>
                    <ul>
                      {analysis.actionableAdvice?.map((adv, idx) => (
                        <li key={idx}>
                          <ArrowRight size={14} /> {adv}
                        </li>
                      ))}
                    </ul>
                  </div>

                  {/* 6. Call-To-Action Banner: Transfer to AI Resume Builder */}
                  <div style={{
                    padding: '1.5rem',
                    background: 'linear-gradient(135deg, rgba(99, 102, 241, 0.2), rgba(6, 182, 212, 0.2))',
                    border: '1px solid rgba(99, 102, 241, 0.5)',
                    borderRadius: '14px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    flexWrap: 'wrap',
                    gap: '1rem'
                  }}>
                    <div>
                      <h4 style={{ color: '#fff', margin: 0, fontSize: '1.05rem', fontWeight: 700 }}>
                        ⚡ Want AI to rewrite and add these missing skills for you?
                      </h4>
                      <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', margin: '0.3rem 0 0 0' }}>
                        Our AI Resume Builder will incorporate {analysis.missingSkills?.slice(0, 3).join(', ')}, enhance your projects with metrics, and allow instant PDF download.
                      </p>
                    </div>
                    <button
                      className="btn-primary"
                      onClick={handleTransferToBuilder}
                      type="button"
                      style={{ whiteSpace: 'nowrap' }}
                    >
                      <Wand2 size={16} /> Update Resume with AI Now <ChevronRight size={16} />
                    </button>
                  </div>
                </div>
              ) : (
                <div className="empty-state">
                  <FileText size={48} className="empty-icon" />
                  <h3>Paste your resume on the left to begin ATS analysis</h3>
                  <p>Our AI analyzes your skills, tests against target industry standards (e.g. Graphic Designer), and evaluates your existing projects in detail.</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* TAB 2: AI RESUME BUILDER & TAILOR (DOWNLOAD READY)       */}
      {/* ======================================================== */}
      {activeMainTab === 'builder' && (
        <div className="builder-view-wrapper">
          <div className="module-header" style={{ marginBottom: '1.5rem' }}>
            <div className="badge-pill" style={{ background: 'linear-gradient(135deg, var(--purple), var(--pink))' }}>
              <Wand2 size={14} /> AI Resume Builder & Tailor Studio
            </div>
            <h1>Generate or Update Your Resume with AI</h1>
            <p>
              AI incorporates missing skills (like Adobe Illustrator & Photoshop for Graphic Designers), rewrites your projects with quantified metrics, and generates an ATS-ready resume you can download in PDF or text format.
            </p>
          </div>

          <div className="builder-grid">
            {/* Left: Configuration Form */}
            <div className="input-card builder-form-card">
              {/* Mode Switcher Segmented Control */}
              <div className="builder-mode-switcher">
                <button
                  type="button"
                  className={`builder-mode-btn ${builderMode === 'tailor' ? 'active' : ''}`}
                  onClick={() => setBuilderMode('tailor')}
                >
                  <RefreshCw size={14} /> Update Existing Resume
                </button>
                <button
                  type="button"
                  className={`builder-mode-btn ${builderMode === 'create' ? 'active' : ''}`}
                  onClick={() => setBuilderMode('create')}
                >
                  <Sparkles size={14} /> Build from Scratch
                </button>
              </div>

              {/* Section 1: Target Role & Skills */}
              <div className="builder-form-section">
                <div className="builder-form-section-header">
                  <Sparkles size={14} /> 1. Target Role & Essential Skills
                </div>
                
                <div className="input-group">
                  <label>Target Job Title</label>
                  <input
                    type="text"
                    placeholder="e.g. Graphic Designer"
                    value={builderData.targetJob}
                    onChange={(e) => setBuilderData({ ...builderData, targetJob: e.target.value })}
                  />
                </div>

                {/* Quick Presets */}
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem', marginTop: '0.45rem', marginBottom: '0.9rem' }}>
                  {popularRoles.map(role => (
                    <button
                      key={role}
                      type="button"
                      onClick={() => setBuilderData({ ...builderData, targetJob: role })}
                      className={`builder-preset-chip ${builderData.targetJob?.toLowerCase() === role.toLowerCase() ? 'active' : ''}`}
                    >
                      {role}
                    </button>
                  ))}
                </div>

                <div className="input-group">
                  <label>Skills to Explicitly Incorporate</label>
                  <input
                    type="text"
                    placeholder="e.g. Adobe Illustrator, Photoshop, InDesign, Typography"
                    value={Array.isArray(builderData.missingSkills) ? builderData.missingSkills.join(', ') : builderData.missingSkills}
                    onChange={(e) => setBuilderData({ 
                      ...builderData, 
                      missingSkills: e.target.value.split(',').map(s => s.trim()).filter(Boolean) 
                    })}
                  />
                  <span style={{ fontSize: '0.74rem', color: 'var(--text-dim)', marginTop: '0.25rem', display: 'block' }}>
                    Comma-separated tools. These will be highlighted in your resume skills matrix.
                  </span>
                </div>
              </div>

              <div className="builder-form-divider"></div>

              {/* Section 2: Candidate Info */}
              <div className="builder-form-section">
                <div className="builder-form-section-header">
                  <Mail size={14} /> 2. Candidate Contact Information
                </div>

                <div className="builder-grid-2col">
                  <div className="input-group">
                    <label>Full Name</label>
                    <input
                      type="text"
                      placeholder="Your Full Name"
                      value={builderData.fullName}
                      onChange={(e) => setBuilderData({ ...builderData, fullName: e.target.value })}
                    />
                  </div>
                  <div className="input-group">
                    <label>Email Address</label>
                    <input
                      type="email"
                      placeholder="your.email@example.com"
                      value={builderData.email}
                      onChange={(e) => setBuilderData({ ...builderData, email: e.target.value })}
                    />
                  </div>
                </div>

                <div className="builder-grid-2col">
                  <div className="input-group">
                    <label>Phone Number</label>
                    <input
                      type="text"
                      placeholder="+1 (555) 000-0000"
                      value={builderData.phone}
                      onChange={(e) => setBuilderData({ ...builderData, phone: e.target.value })}
                    />
                  </div>
                  <div className="input-group">
                    <label>Location</label>
                    <input
                      type="text"
                      placeholder="City, State / Remote"
                      value={builderData.location}
                      onChange={(e) => setBuilderData({ ...builderData, location: e.target.value })}
                    />
                  </div>
                </div>

                <div className="builder-grid-2col">
                  <div className="input-group">
                    <label>Portfolio / Website</label>
                    <input
                      type="text"
                      placeholder="https://yourportfolio.com"
                      value={builderData.portfolioUrl}
                      onChange={(e) => setBuilderData({ ...builderData, portfolioUrl: e.target.value })}
                    />
                  </div>
                  <div className="input-group">
                    <label>LinkedIn Profile</label>
                    <input
                      type="text"
                      placeholder="https://linkedin.com/in/username"
                      value={builderData.linkedinUrl}
                      onChange={(e) => setBuilderData({ ...builderData, linkedinUrl: e.target.value })}
                    />
                  </div>
                </div>
              </div>

              <div className="builder-form-divider"></div>

              {/* Section 3: Experience & Content */}
              <div className="builder-form-section">
                <div className="builder-form-section-header">
                  <Briefcase size={14} /> 3. Experience & Source Resume
                </div>

                <div className="input-group">
                  <label>Experience Level</label>
                  <select
                    value={builderData.experienceLevel}
                    onChange={(e) => setBuilderData({ ...builderData, experienceLevel: e.target.value })}
                  >
                    <option value="Entry-Level / Fresher">Entry-Level / Fresher (0-2 Years)</option>
                    <option value="Mid-Level">Mid-Level (2-5 Years)</option>
                    <option value="Senior / Lead">Senior / Lead (5+ Years)</option>
                  </select>
                </div>

                {builderMode === 'tailor' && (
                  <div className="input-group" style={{ marginTop: '0.85rem' }}>
                    <label>Existing Resume Content</label>
                    <textarea
                      rows={4}
                      placeholder="Paste current resume text to tailor and enhance..."
                      value={resumeText}
                      onChange={(e) => setResumeText(e.target.value)}
                    />
                  </div>
                )}
              </div>

              <button
                type="button"
                className="btn-primary"
                onClick={() => triggerBuildResume()}
                disabled={isGeneratingResume}
                style={{ width: '100%', marginTop: '1.25rem', justifyContent: 'center' }}
              >
                {isGeneratingResume ? (
                  <>
                    <span className="spinner"></span> AI is Tailoring Your Resume...
                  </>
                ) : (
                  <>
                    <Wand2 size={18} /> {builderMode === 'tailor' ? 'Update & Tailor Resume with AI' : 'Generate Full Resume with AI'}
                  </>
                )}
              </button>
            </div>

            {/* Right: Live Interactive ATS Resume Workspace */}
            <div className="resume-preview-card">
              {/* Document Toolbar */}
              <div className="resume-toolbar-container">
                <div className="resume-toolbar-left">
                  <span className="tag tag-success" style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem', fontSize: '0.76rem' }}>
                    <CheckCircle2 size={13} /> ATS 95%+ Ready
                  </span>

                  {/* Accent Color Picker */}
                  <div className="theme-selector-group">
                    <span>Accent:</span>
                    {themeOptions.map((th) => (
                      <button
                        key={th.id}
                        type="button"
                        className={`theme-color-dot ${resumeTheme === th.id ? 'active' : ''}`}
                        style={{ backgroundColor: th.color }}
                        onClick={() => setResumeTheme(th.id)}
                        title={th.name}
                      />
                    ))}
                  </div>

                  {savedSessionMsg && (
                    <span style={{ fontSize: '0.78rem', color: '#6ee7b7' }}>{savedSessionMsg}</span>
                  )}
                </div>

                {/* Toolbar Actions */}
                <div className="resume-toolbar-actions">
                  <button
                    type="button"
                    onClick={() => setIsEditingResume(!isEditingResume)}
                    className="pill"
                    style={{ background: isEditingResume ? 'rgba(99, 102, 241, 0.4)' : 'rgba(255, 255, 255, 0.08)' }}
                    title="Toggle direct text editing"
                  >
                    <Edit3 size={13} /> {isEditingResume ? 'Exit Edit' : 'Edit Text'}
                  </button>

                  <button
                    type="button"
                    onClick={handleCopyResumeToClipboard}
                    className="pill"
                    title="Copy full resume text"
                  >
                    {copiedResume ? <Check size={13} /> : <Copy size={13} />}
                    {copiedResume ? 'Copied!' : 'Copy'}
                  </button>

                  <button
                    type="button"
                    onClick={handleDownloadText}
                    className="pill"
                    title="Download Plaintext ATS format"
                  >
                    <Download size={13} /> .TXT
                  </button>

                  <button
                    type="button"
                    onClick={handlePrintPdf}
                    className="btn-primary"
                    style={{ padding: '0.45rem 1.1rem', fontSize: '0.85rem' }}
                    title="Print or Save to PDF (Vector Sharp)"
                  >
                    <Printer size={15} /> Download PDF
                  </button>
                </div>
              </div>

              {/* Realistic Document Paper Workspace */}
              <div className="resume-paper-wrapper">
                {generatedResume ? (
                  <div 
                    id="printableResumeArea" 
                    className="printable-resume"
                    style={{ '--resume-accent': currentAccent }}
                  >
                    {/* Header */}
                    <div className="resume-header-block">
                      <h1 className="resume-candidate-name">
                        {isEditingResume ? (
                          <input
                            type="text"
                            value={generatedResume.fullName}
                            onChange={(e) => setGeneratedResume({ ...generatedResume, fullName: e.target.value })}
                            className="resume-inline-input"
                          />
                        ) : (
                          generatedResume.fullName
                        )}
                      </h1>
                      
                      <div className="resume-target-title">
                        {isEditingResume ? (
                          <input
                            type="text"
                            value={generatedResume.targetRole}
                            onChange={(e) => setGeneratedResume({ ...generatedResume, targetRole: e.target.value })}
                            className="resume-inline-input"
                          />
                        ) : (
                          generatedResume.targetRole || builderData.targetJob
                        )}
                      </div>

                      <div className="resume-contact-row">
                        {generatedResume.contact?.email && (
                          <span><Mail size={12} /> {generatedResume.contact.email}</span>
                        )}
                        {generatedResume.contact?.phone && (
                          <span><Phone size={12} /> {generatedResume.contact.phone}</span>
                        )}
                        {generatedResume.contact?.location && (
                          <span><MapPin size={12} /> {generatedResume.contact.location}</span>
                        )}
                        {generatedResume.contact?.portfolio && (
                          <span>
                            <Globe size={12} /> 
                            <a href={generatedResume.contact.portfolio.startsWith('http') ? generatedResume.contact.portfolio : `https://${generatedResume.contact.portfolio}`} target="_blank" rel="noreferrer">
                              {generatedResume.contact.portfolio.replace(/^https?:\/\//, '')}
                            </a>
                          </span>
                        )}
                      </div>
                    </div>

                    {/* 1. Professional Summary */}
                    <div className="resume-section-block">
                      <h3 className="resume-section-title">PROFESSIONAL SUMMARY</h3>
                      <div className="resume-divider"></div>
                      {isEditingResume ? (
                        <textarea
                          rows={3}
                          value={generatedResume.summary}
                          onChange={(e) => setGeneratedResume({ ...generatedResume, summary: e.target.value })}
                          className="resume-inline-textarea"
                        />
                      ) : (
                        <p className="resume-body-text">{generatedResume.summary}</p>
                      )}
                    </div>

                    {/* 2. Technical & Domain Skills Matrix */}
                    <div className="resume-section-block">
                      <h3 className="resume-section-title">TECHNICAL & CORE COMPETENCIES</h3>
                      <div className="resume-divider"></div>
                      <div className="resume-skills-grid">
                        {generatedResume.skills?.coreTools && (
                          <div className="resume-skill-row">
                            <span className="resume-skill-heading">Core Tools & Software:</span>
                            <div className="resume-skill-tags">
                              {generatedResume.skills.coreTools.map((tool, idx) => (
                                <span key={idx} className="resume-skill-tag">{tool}</span>
                              ))}
                            </div>
                          </div>
                        )}
                        {generatedResume.skills?.domainExpertise && (
                          <div className="resume-skill-row">
                            <span className="resume-skill-heading">Domain Expertise:</span>
                            <div className="resume-skill-tags">
                              {generatedResume.skills.domainExpertise.map((skill, idx) => (
                                <span key={idx} className="resume-skill-tag">{skill}</span>
                              ))}
                            </div>
                          </div>
                        )}
                        {generatedResume.skills?.softSkills && (
                          <div className="resume-skill-row">
                            <span className="resume-skill-heading">Professional Strengths:</span>
                            <div className="resume-skill-tags">
                              {generatedResume.skills.softSkills.map((soft, idx) => (
                                <span key={idx} className="resume-skill-tag">{soft}</span>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* 3. Featured Projects with Quantified Metrics */}
                    {generatedResume.projects && generatedResume.projects.length > 0 && (
                      <div className="resume-section-block">
                        <h3 className="resume-section-title">FEATURED PROJECTS & CASE STUDIES</h3>
                        <div className="resume-divider"></div>
                        <div className="resume-items-list">
                          {generatedResume.projects.map((proj, idx) => (
                            <div key={idx} className="resume-item">
                              <div className="resume-item-header">
                                <span className="resume-item-name">{proj.name}</span>
                                <span className="resume-item-period">{proj.period || '2025'}</span>
                              </div>
                              {proj.tools && (
                                <div className="resume-item-sub">
                                  <em>Technologies & Tools:</em> {proj.tools}
                                </div>
                              )}
                              {proj.bullets && (
                                <ul className="resume-bullets">
                                  {proj.bullets.map((b, bIdx) => (
                                    <li key={bIdx}>{b.replace(/^•\s*/, '')}</li>
                                  ))}
                                </ul>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* 4. Professional Experience */}
                    {generatedResume.experience && generatedResume.experience.length > 0 && (
                      <div className="resume-section-block">
                        <h3 className="resume-section-title">PROFESSIONAL EXPERIENCE</h3>
                        <div className="resume-divider"></div>
                        <div className="resume-items-list">
                          {generatedResume.experience.map((exp, idx) => (
                            <div key={idx} className="resume-item">
                              <div className="resume-item-header">
                                <span className="resume-item-name">{exp.role} — {exp.company}</span>
                                <span className="resume-item-period">{exp.period}</span>
                              </div>
                              {exp.location && (
                                <div className="resume-item-sub">{exp.location}</div>
                              )}
                              {exp.bullets && (
                                <ul className="resume-bullets">
                                  {exp.bullets.map((b, bIdx) => (
                                    <li key={bIdx}>{b.replace(/^•\s*/, '')}</li>
                                  ))}
                                </ul>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* 5. Education */}
                    {generatedResume.education && generatedResume.education.length > 0 && (
                      <div className="resume-section-block">
                        <h3 className="resume-section-title">EDUCATION</h3>
                        <div className="resume-divider"></div>
                        {generatedResume.education.map((ed, idx) => (
                          <div key={idx} className="resume-item" style={{ marginBottom: '0.4rem' }}>
                            <div className="resume-item-header">
                              <span className="resume-item-name">{ed.degree}</span>
                              <span className="resume-item-period">{ed.year}</span>
                            </div>
                            <div className="resume-item-sub">{ed.institution}</div>
                          </div>
                        ))}
                      </div>
                    )}

                    {/* 6. Certifications */}
                    {generatedResume.certifications && generatedResume.certifications.length > 0 && (
                      <div className="resume-section-block">
                        <h3 className="resume-section-title">CERTIFICATIONS & CREDENTIALS</h3>
                        <div className="resume-divider"></div>
                        <ul className="resume-bullets">
                          {generatedResume.certifications.map((c, idx) => (
                            <li key={idx}>{c}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="builder-empty-canvas" style={{ width: '100%', maxWidth: '800px', minHeight: '850px' }}>
                    <div style={{
                      width: '72px',
                      height: '72px',
                      borderRadius: '20px',
                      background: 'rgba(99, 102, 241, 0.15)',
                      border: '1px solid rgba(99, 102, 241, 0.3)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: 'var(--cyan)'
                    }}>
                      <Wand2 size={36} />
                    </div>
                    <h3 style={{ fontSize: '1.4rem', fontWeight: 700, margin: '0.5rem 0 0 0', color: '#fff' }}>
                      Ready to Build Your ATS-Optimized Resume
                    </h3>
                    <p style={{ maxWidth: '500px', fontSize: '0.92rem', color: 'var(--text-muted)', lineHeight: '1.5' }}>
                      Click <strong>"Update & Tailor Resume with AI"</strong> on the left to inject your target role skills (Illustrator, Photoshop, etc.), quantify your projects, and view your document sheet here.
                    </p>
                    <button
                      type="button"
                      className="btn-primary"
                      onClick={() => triggerBuildResume()}
                      disabled={isGeneratingResume}
                      style={{ marginTop: '0.75rem' }}
                    >
                      <Sparkles size={16} /> Generate Preview Now
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default ResumeAnalyzer;
