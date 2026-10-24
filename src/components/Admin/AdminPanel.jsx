import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import StudentProgressModal from './StudentProgressModal';
import { 
  ShieldCheck, 
  Users, 
  BookOpen, 
  FolderPlus, 
  Tag, 
  TrendingUp, 
  Trash2, 
  Plus, 
  Upload, 
  Download, 
  Search, 
  MessageSquare, 
  Award, 
  FileText, 
  Eye,
  Server,
  Database,
  CheckCircle2,
  Clock,
  Sparkles,
  X
} from 'lucide-react';

function AdminPanel() {
  const { apiFetch } = useAuth();
  const [activeTab, setActiveTab] = useState('analytics');

  // Analytics state
  const [analytics, setAnalytics] = useState(null);
  
  // Users state
  const [users, setUsers] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');

  // Student Progress Inspection Modal state
  const [selectedStudentId, setSelectedStudentId] = useState(null);
  const [showProgressModal, setShowProgressModal] = useState(false);

  // Subjects state
  const [subjects, setSubjects] = useState([]);
  const [newSubjName, setNewSubjName] = useState('');
  const [newSubjCat, setNewSubjCat] = useState('Engineering');
  const [newSubjDesc, setNewSubjDesc] = useState('');
  const [newSubjTopics, setNewSubjTopics] = useState('');

  // Resources state
  const [resources, setResources] = useState([]);
  const [resTitle, setResTitle] = useState('');
  const [resDesc, setResDesc] = useState('');
  const [resSubject, setResSubject] = useState('Frontend Development');
  const [customSubject, setCustomSubject] = useState('');
  const [resFile, setResFile] = useState(null);
  const [uploadingRes, setUploadingRes] = useState(false);

  // Categories state
  const [categories, setCategories] = useState([]);
  const [catName, setCatName] = useState('');
  const [catDesc, setCatDesc] = useState('');
  const [catRole, setCatRole] = useState('General');

  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState({ type: '', text: '' });

  // Fetch data on tab change
  useEffect(() => {
    fetchData();
  }, [activeTab]);

  const fetchData = async () => {
    setLoading(true);
    setMsg({ type: '', text: '' });
    try {
      if (activeTab === 'analytics') {
        const res = await apiFetch('/api/admin/analytics');
        setAnalytics(res);
      } else if (activeTab === 'users') {
        const res = await apiFetch('/api/admin/users');
        setUsers(res.users || []);
      } else if (activeTab === 'subjects') {
        const res = await apiFetch('/api/admin/subjects');
        setSubjects(res.subjects || []);
      } else if (activeTab === 'resources') {
        const [resRes, resSub] = await Promise.all([
          apiFetch('/api/admin/resources'),
          apiFetch('/api/admin/subjects')
        ]);
        setResources(resRes.resources || []);
        setSubjects(resSub.subjects || []);
      } else if (activeTab === 'categories') {
        const res = await apiFetch('/api/admin/categories');
        setCategories(res.categories || []);
      }
    } catch (err) {
      console.error('Admin fetch error:', err);
    } finally {
      setLoading(false);
    }
  };

  // Delete User
  const handleDeleteUser = async (id, name) => {
    if (!window.confirm(`Are you sure you want to delete user "${name}"?`)) return;
    try {
      await apiFetch(`/api/admin/users/${id}`, { method: 'DELETE' });
      setUsers(prev => prev.filter(u => u.id !== id));
      setMsg({ type: 'success', text: `User "${name}" has been deleted successfully.` });
    } catch (err) {
      setMsg({ type: 'error', text: err.message || 'Failed to delete user' });
    }
  };

  // Add Subject
  const handleCreateSubject = async (e) => {
    e.preventDefault();
    if (!newSubjName.trim()) return;
    try {
      const res = await apiFetch('/api/admin/subjects', {
        method: 'POST',
        body: JSON.stringify({
          name: newSubjName,
          category: newSubjCat,
          description: newSubjDesc,
          topics: newSubjTopics
        })
      });
      setSubjects(prev => [...prev, res.subject]);
      setNewSubjName('');
      setNewSubjDesc('');
      setNewSubjTopics('');
      setMsg({ type: 'success', text: `Subject "${res.subject?.name}" created successfully.` });
    } catch (err) {
      setMsg({ type: 'error', text: err.message || 'Failed to create subject' });
    }
  };

  const handleDeleteSubject = async (id) => {
    if (!window.confirm('Are you sure you want to delete this subject?')) return;
    try {
      await apiFetch(`/api/admin/subjects/${id}`, { method: 'DELETE' });
      setSubjects(prev => prev.filter(s => s.id !== id));
      setMsg({ type: 'success', text: 'Subject deleted successfully.' });
    } catch (err) { alert(err.message); }
  };

  // Upload Resource
  const handleUploadResource = async (e) => {
    e.preventDefault();
    if (!resTitle.trim()) {
      alert('Please enter a study material title.');
      return;
    }
    if (!resFile) {
      alert('Please select a PDF file to upload.');
      return;
    }

    const finalSubject = resSubject === '__custom__' ? customSubject.trim() : resSubject;
    if (!finalSubject) {
      alert('Please select or specify a domain subject for this resource.');
      return;
    }

    setUploadingRes(true);
    setMsg({ type: '', text: '' });
    try {
      const formData = new FormData();
      formData.append('title', resTitle.trim());
      formData.append('description', resDesc.trim());
      formData.append('subject', finalSubject);
      formData.append('resourceFile', resFile);

      const data = await apiFetch('/api/admin/resources', {
        method: 'POST',
        body: formData
      });

      setResources(prev => [data.resource, ...prev]);
      setResTitle('');
      setResDesc('');
      setResFile(null);
      setCustomSubject('');
      
      const fileInput = document.getElementById('admin-resource-file-input');
      if (fileInput) fileInput.value = '';

      setMsg({ type: 'success', text: `"${data.resource.title}" published successfully to Student Study Hub!` });
    } catch (err) {
      setMsg({ type: 'error', text: err.message || 'Upload failed' });
    } finally {
      setUploadingRes(false);
    }
  };

  const handleDeleteResource = async (id) => {
    if (!window.confirm('Are you sure you want to remove this resource from Study Hub?')) return;
    try {
      await apiFetch(`/api/admin/resources/${id}`, { method: 'DELETE' });
      setResources(prev => prev.filter(r => (r.id || r._id) !== id));
      setMsg({ type: 'success', text: 'Study material deleted from server and library.' });
    } catch (err) { alert(err.message); }
  };

  // Add Question Category
  const handleCreateCategory = async (e) => {
    e.preventDefault();
    if (!catName.trim()) return;
    try {
      const res = await apiFetch('/api/admin/categories', {
        method: 'POST',
        body: JSON.stringify({
          name: catName,
          description: catDesc,
          targetRole: catRole,
          type: 'all'
        })
      });
      setCategories(prev => [...prev, res.category]);
      setCatName('');
      setCatDesc('');
      setMsg({ type: 'success', text: `Category "${res.category?.name}" created successfully.` });
    } catch (err) { setMsg({ type: 'error', text: err.message }); }
  };

  const handleDeleteCategory = async (id) => {
    if (!window.confirm('Delete this question category?')) return;
    try {
      await apiFetch(`/api/admin/categories/${id}`, { method: 'DELETE' });
      setCategories(prev => prev.filter(c => c.id !== id));
      setMsg({ type: 'success', text: 'Category deleted.' });
    } catch (err) { alert(err.message); }
  };

  const filteredUsers = users.filter(u => 
    (u.name && u.name.toLowerCase().includes(searchQuery.toLowerCase())) || 
    (u.email && u.email.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  return (
    <div className="module-container admin-wrapper">
      {/* Executive Hero Header */}
      <div className="admin-hero-header">
        <div className="admin-badge-pill">
          <ShieldCheck size={15} /> Executive Admin Control Center
        </div>
        <h1>PrepAI Administration & Control Center</h1>
        <p>
          Oversee platform health, inspect student directory, upload verified study guides directly into the Student Study Hub, 
          and configure interview subjects and technical question categories.
        </p>

        <div className="admin-stats-strip">
          <div className="admin-stat-chip">
            <ShieldCheck size={14} style={{ color: '#ef4444' }} />
            <span>Administrator: <strong>Hiral Gajjar (hiral2005gajjar@gmail.com)</strong></span>
          </div>
          <div className="admin-stat-chip">
            <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#10b981', display: 'inline-block' }}></span>
            <span>Status: <strong>System Online & Secured</strong></span>
          </div>
          <div className="admin-stat-chip">
            <Users size={14} style={{ color: 'var(--cyan)' }} />
            <span>Registered Users: <strong>{users.length || analytics?.totalStudents || 0}</strong></span>
          </div>
          <div className="admin-stat-chip">
            <FolderPlus size={14} style={{ color: 'var(--primary)' }} />
            <span>Live Study Guides: <strong>{resources.length}</strong></span>
          </div>
        </div>
      </div>

      {/* Admin Tab Navigation Bar */}
      <div className="admin-nav-bar">
        <button
          className={`admin-nav-item ${activeTab === 'analytics' ? 'active' : ''}`}
          onClick={() => setActiveTab('analytics')}
        >
          <TrendingUp size={16} /> Analytics & Performance
        </button>

        <button
          className={`admin-nav-item ${activeTab === 'users' ? 'active' : ''}`}
          onClick={() => setActiveTab('users')}
        >
          <Users size={16} /> Manage Users
          <span className="admin-tab-count">{users.length}</span>
        </button>

        <button
          className={`admin-nav-item ${activeTab === 'subjects' ? 'active' : ''}`}
          onClick={() => setActiveTab('subjects')}
        >
          <BookOpen size={16} /> Manage Subjects
          <span className="admin-tab-count">{subjects.length}</span>
        </button>

        <button
          className={`admin-nav-item ${activeTab === 'resources' ? 'active' : ''}`}
          onClick={() => setActiveTab('resources')}
        >
          <FolderPlus size={16} /> Upload Study Materials
          <span className="admin-tab-count">{resources.length}</span>
        </button>

        <button
          className={`admin-nav-item ${activeTab === 'categories' ? 'active' : ''}`}
          onClick={() => setActiveTab('categories')}
        >
          <Tag size={16} /> Question Categories
          <span className="admin-tab-count">{categories.length}</span>
        </button>
      </div>

      {/* Global Toast / Feedback */}
      {msg.text && (
        <div 
          className={`alert-${msg.type === 'success' ? 'success' : 'error'}`}
          style={{ marginBottom: '1.5rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            {msg.type === 'success' ? <CheckCircle2 size={16} /> : <X size={16} />}
            <span>{msg.text}</span>
          </div>
          <button 
            onClick={() => setMsg({ type: '', text: '' })}
            style={{ background: 'transparent', border: 'none', color: 'inherit', cursor: 'pointer' }}
          >
            <X size={14} />
          </button>
        </div>
      )}

      {/* TAB 1: ANALYTICS & STUDENT PERFORMANCE */}
      {activeTab === 'analytics' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.75rem' }}>
          <div className="metrics-grid">
            <div className="metric-card card-purple">
              <div className="metric-icon"><Users size={24} /></div>
              <div className="metric-details">
                <h3>{analytics?.totalStudents || 0}</h3>
                <p>Registered Students</p>
              </div>
            </div>

            <div className="metric-card card-indigo">
              <div className="metric-icon"><MessageSquare size={24} /></div>
              <div className="metric-details">
                <h3>{analytics?.totalInterviews || 0}</h3>
                <p>Total Mock Interviews</p>
              </div>
            </div>

            <div className="metric-card card-cyan">
              <div className="metric-icon"><Award size={24} /></div>
              <div className="metric-details">
                <h3>{analytics?.totalQuizzes || 0}</h3>
                <p>Total Quizzes Taken</p>
              </div>
            </div>

            <div className="metric-card card-pink">
              <div className="metric-icon"><FileText size={24} /></div>
              <div className="metric-details">
                <h3>{analytics?.avgPlatformScore || 85}%</h3>
                <p>Avg Student Score</p>
              </div>
            </div>
          </div>

          {/* Platform System Summary */}
          <div className="admin-card">
            <div className="admin-card-header">
              <div>
                <h2>Platform Architecture & Database Health</h2>
                <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>
                  Live service telemetry for PrepAI placement and interview preparation system.
                </p>
              </div>
              <span className="badge-pill" style={{ background: 'rgba(16, 185, 129, 0.15)', borderColor: 'rgba(16, 185, 129, 0.3)', color: '#34d399' }}>
                🟢 Healthy (Port 5000)
              </span>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1rem', marginTop: '1rem' }}>
              <div style={{ background: 'rgba(255, 255, 255, 0.03)', padding: '1rem', borderRadius: '12px', border: '1px solid rgba(255, 255, 255, 0.06)' }}>
                <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)', display: 'block', marginBottom: '0.25rem' }}>Root Administrator</span>
                <strong style={{ fontSize: '0.92rem', color: '#fca5a5' }}>hiral2005gajjar@gmail.com</strong>
              </div>

              <div style={{ background: 'rgba(255, 255, 255, 0.03)', padding: '1rem', borderRadius: '12px', border: '1px solid rgba(255, 255, 255, 0.06)' }}>
                <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)', display: 'block', marginBottom: '0.25rem' }}>Database Driver</span>
                <strong style={{ fontSize: '0.92rem', color: '#a78bfa' }}>MongoDB + JSON Redundancy</strong>
              </div>

              <div style={{ background: 'rgba(255, 255, 255, 0.03)', padding: '1rem', borderRadius: '12px', border: '1px solid rgba(255, 255, 255, 0.06)' }}>
                <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)', display: 'block', marginBottom: '0.25rem' }}>Authentication Protocol</span>
                <strong style={{ fontSize: '0.92rem', color: '#38bdf8' }}>JWT + Gmail SMTP OTP</strong>
              </div>

              <div style={{ background: 'rgba(255, 255, 255, 0.03)', padding: '1rem', borderRadius: '12px', border: '1px solid rgba(255, 255, 255, 0.06)' }}>
                <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)', display: 'block', marginBottom: '0.25rem' }}>Study Library Proxy</span>
                <strong style={{ fontSize: '0.92rem', color: '#34d399' }}>Direct Streaming & Downloads</strong>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: MANAGE USERS */}
      {activeTab === 'users' && (
        <div className="admin-card">
          <div className="admin-card-header">
            <div>
              <h2>Registered User Directory ({users.length})</h2>
              <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>
                View student accounts, performance metrics, and manage user access.
              </p>
            </div>
            <div className="input-wrapper" style={{ width: '300px' }}>
              <Search className="input-icon" size={16} />
              <input
                type="text"
                placeholder="Search by student name or email..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
          </div>

          <div className="table-responsive">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Student Name</th>
                  <th>Email Address</th>
                  <th>Account Role</th>
                  <th>Registration Date</th>
                  <th>Completed Sessions</th>
                  <th>Avg Score</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {filteredUsers.length === 0 ? (
                  <tr>
                    <td colSpan="7" style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)' }}>
                      No users match your search criteria.
                    </td>
                  </tr>
                ) : (
                  filteredUsers.map(u => (
                    <tr key={u.id || u._id}>
                      <td>
                        <strong style={{ color: '#fff' }}>{u.name}</strong>
                      </td>
                      <td style={{ color: 'var(--text-muted)' }}>{u.email}</td>
                      <td>
                        <span className={`role-badge ${u.email === 'hiral2005gajjar@gmail.com' ? 'role-admin' : 'role-student'}`}>
                          {u.email === 'hiral2005gajjar@gmail.com' ? 'ADMIN' : 'STUDENT'}
                        </span>
                      </td>
                      <td style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>
                        {u.createdAt ? new Date(u.createdAt).toLocaleDateString() : 'Active'}
                      </td>
                      <td>{u.sessionsCount || 0}</td>
                      <td>
                        <strong className="text-cyan">{u.avgScore || 0}%</strong>
                      </td>
                      <td>
                        {u.email !== 'hiral2005gajjar@gmail.com' ? (
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                            <button 
                              className="btn-action-view" 
                              onClick={() => {
                                setSelectedStudentId(u.id || u._id);
                                setShowProgressModal(true);
                              }}
                              title="Inspect detailed exam scores, practice history and progression"
                              style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '0.35rem',
                                background: 'rgba(99, 102, 241, 0.15)',
                                color: '#a5b4fc',
                                border: '1px solid rgba(99, 102, 241, 0.35)',
                                padding: '0.35rem 0.65rem',
                                borderRadius: '6px',
                                fontSize: '0.78rem',
                                cursor: 'pointer',
                                fontWeight: 600,
                                transition: 'all 0.2s ease'
                              }}
                            >
                              <TrendingUp size={13} /> View Progress
                            </button>
                            <button 
                              className="btn-action-delete" 
                              onClick={() => handleDeleteUser(u.id || u._id, u.name)}
                              title="Delete this user"
                            >
                              <Trash2 size={13} /> Delete
                            </button>
                          </div>
                        ) : (
                          <span style={{ fontSize: '0.75rem', color: '#64748b' }}>Root Admin</span>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 3: MANAGE SUBJECTS & TOPICS */}
      {activeTab === 'subjects' && (
        <div className="admin-two-col-grid">
          {/* Form Card */}
          <div className="admin-card">
            <h2>Add Career Domain Subject</h2>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginBottom: '1.25rem' }}>
              Configure domain subjects for student practice quizzes and Study Hub categorization.
            </p>

            <form onSubmit={handleCreateSubject}>
              <div className="input-group">
                <label>Subject Domain Name *</label>
                <input
                  type="text"
                  placeholder="e.g. Cloud Architecture & DevOps"
                  value={newSubjName}
                  onChange={(e) => setNewSubjName(e.target.value)}
                  required
                />
              </div>

              <div className="input-group" style={{ marginTop: '1rem' }}>
                <label>Industry Category</label>
                <select value={newSubjCat} onChange={(e) => setNewSubjCat(e.target.value)}>
                  <option value="Engineering">💻 Software & Engineering</option>
                  <option value="Data & AI">📊 Data Science & AI</option>
                  <option value="Design & Media">🎨 Design & Media</option>
                  <option value="Cloud & Systems">☁️ Cloud & Infrastructure</option>
                  <option value="Product & Business">💼 Product & Business</option>
                </select>
              </div>

              <div className="input-group" style={{ marginTop: '1rem' }}>
                <label>Key Interview Topics (comma separated)</label>
                <input
                  type="text"
                  placeholder="e.g. Docker, Kubernetes, CI/CD Pipelines, AWS Lambda"
                  value={newSubjTopics}
                  onChange={(e) => setNewSubjTopics(e.target.value)}
                />
              </div>

              <button 
                type="submit" 
                className="btn-primary" 
                style={{ width: '100%', marginTop: '1.5rem', justifyContent: 'center' }}
              >
                <Plus size={16} /> Save Subject Domain
              </button>
            </form>
          </div>

          {/* List Card */}
          <div className="admin-card">
            <div className="admin-card-header">
              <div>
                <h2>Configured Subjects ({subjects.length})</h2>
                <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>
                  Live domains available across PrepAI platform modules.
                </p>
              </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
              {subjects.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '2.5rem', color: 'var(--text-muted)' }}>
                  <BookOpen size={36} style={{ margin: '0 auto 0.75rem', opacity: 0.5 }} />
                  <p>No custom subjects created yet. Add your first subject using the form.</p>
                </div>
              ) : (
                subjects.map(s => (
                  <div key={s.id || s._id} className="admin-item-card">
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div className="admin-item-title">{s.name}</div>
                      <div className="admin-item-meta">
                        <span className="badge-pill" style={{ fontSize: '0.72rem', padding: '0.15rem 0.5rem', marginRight: '0.5rem' }}>
                          {s.category || 'Engineering'}
                        </span>
                        Topics: {Array.isArray(s.topics) ? s.topics.join(', ') : s.topics || 'All Core Fundamentals'}
                      </div>
                    </div>
                    <button 
                      className="btn-action-delete" 
                      onClick={() => handleDeleteSubject(s.id || s._id)}
                      title="Delete Subject"
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {/* TAB 4: UPLOAD RESOURCES (STUDY HUB PDFS) */}
      {activeTab === 'resources' && (
        <div className="admin-two-col-grid">
          {/* Upload Form Card */}
          <div className="admin-card">
            <h2>Upload Study Material (PDF)</h2>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginBottom: '1.25rem' }}>
              Upload technical guides, cheatsheets, and interview manuals that students can open, read, and download in the Study Hub.
            </p>

            <form onSubmit={handleUploadResource}>
              <div className="input-group">
                <label>Resource Title *</label>
                <input
                  type="text"
                  placeholder="e.g. System Design Interview Comprehensive Cheatsheet"
                  value={resTitle}
                  onChange={(e) => setResTitle(e.target.value)}
                  required
                />
              </div>

              <div className="input-group" style={{ marginTop: '1rem' }}>
                <label>Target Domain Subject *</label>
                <select 
                  value={resSubject} 
                  onChange={(e) => setResSubject(e.target.value)}
                >
                  <option value="Frontend Development">💻 Frontend Development</option>
                  <option value="Backend Development">⚙️ Backend Development</option>
                  <option value="Data Science">📊 Data Science & SQL</option>
                  <option value="UI/UX Design">✨ UI/UX Design</option>
                  <option value="Graphic Design">🎨 Graphic Design</option>
                  <option value="System Design">🏗️ System Design</option>
                  <option value="DevOps & Cloud">☁️ DevOps & Cloud</option>
                  <option value="Mobile Development">📱 Mobile App Development</option>
                  <option value="General">🌐 General Technical Preparation</option>
                  {subjects.map(s => (
                    <option key={s.id || s._id} value={s.name}>📚 {s.name}</option>
                  ))}
                  <option value="__custom__">➕ + Custom Domain Subject...</option>
                </select>
              </div>

              {resSubject === '__custom__' && (
                <div className="input-group" style={{ marginTop: '0.75rem' }}>
                  <label>Enter Custom Subject Domain</label>
                  <input
                    type="text"
                    placeholder="e.g. Cybersecurity, AI Prompt Engineering"
                    value={customSubject}
                    onChange={(e) => setCustomSubject(e.target.value)}
                    required
                  />
                </div>
              )}

              <div className="input-group" style={{ marginTop: '1rem' }}>
                <label>Description & Topics Covered</label>
                <textarea
                  rows="3"
                  placeholder="Outline key topics, technical formulas, or interview questions included in this guide..."
                  value={resDesc}
                  onChange={(e) => setResDesc(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '0.75rem',
                    borderRadius: '10px',
                    background: 'var(--bg-input)',
                    border: '1px solid var(--border-color)',
                    color: 'var(--text-main)',
                    fontSize: '0.9rem',
                    resize: 'vertical'
                  }}
                />
              </div>

              <div className="input-group" style={{ marginTop: '1rem' }}>
                <label>Select PDF Document *</label>
                <div 
                  style={{
                    border: '2px dashed var(--border-color)',
                    borderRadius: '12px',
                    padding: '1.25rem',
                    textAlign: 'center',
                    background: 'rgba(255, 255, 255, 0.02)',
                    cursor: 'pointer',
                    transition: 'all 0.2s ease',
                    position: 'relative'
                  }}
                  onClick={() => document.getElementById('admin-resource-file-input').click()}
                >
                  <input
                    id="admin-resource-file-input"
                    type="file"
                    accept=".pdf,.docx,.doc,.txt"
                    onChange={(e) => setResFile(e.target.files[0] || null)}
                    style={{ display: 'none' }}
                  />
                  {resFile ? (
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.75rem' }}>
                      <FileText size={28} style={{ color: 'var(--primary)' }} />
                      <div style={{ textAlign: 'left' }}>
                        <div style={{ fontWeight: 600, color: 'var(--text-main)', fontSize: '0.9rem' }}>
                          {resFile.name}
                        </div>
                        <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                          {(resFile.size / 1024 / 1024).toFixed(2)} MB • PDF Ready
                        </div>
                      </div>
                      <button 
                        type="button" 
                        onClick={(e) => { e.stopPropagation(); setResFile(null); }}
                        style={{ marginLeft: '1rem', background: 'rgba(239, 68, 68, 0.2)', color: '#ef4444', padding: '0.3rem 0.6rem', borderRadius: '6px' }}
                      >
                        Change
                      </button>
                    </div>
                  ) : (
                    <div>
                      <Upload size={32} style={{ color: 'var(--text-muted)', margin: '0 auto 0.5rem auto' }} />
                      <div style={{ color: 'var(--text-main)', fontWeight: 500, fontSize: '0.9rem' }}>
                        Click to choose PDF or drag and drop
                      </div>
                      <div style={{ color: 'var(--text-muted)', fontSize: '0.78rem', marginTop: '0.25rem' }}>
                        Supported formats: .pdf, .docx, .doc (Max 30MB)
                      </div>
                    </div>
                  )}
                </div>
              </div>

              <button 
                type="submit" 
                className="btn-primary" 
                disabled={uploadingRes}
                style={{ width: '100%', marginTop: '1.5rem', justifyContent: 'center' }}
              >
                {uploadingRes ? (
                  <>
                    <span className="spinner" style={{ width: '16px', height: '16px', marginRight: '0.5rem' }}></span>
                    Publishing to Study Hub...
                  </>
                ) : (
                  <>
                    <Upload size={16} /> Publish Study Material
                  </>
                )}
              </button>
            </form>
          </div>

          {/* List Card */}
          <div className="admin-card">
            <div className="admin-card-header">
              <div>
                <h2>Live Materials in Study Hub ({resources.length})</h2>
                <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>
                  Students can open, read in-app, or download these files.
                </p>
              </div>
              <span className="badge-pill" style={{ fontSize: '0.75rem' }}>
                Instant Sync
              </span>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
              {resources.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '2.5rem', color: 'var(--text-muted)' }}>
                  <BookOpen size={36} style={{ margin: '0 auto 0.75rem', opacity: 0.5 }} />
                  <p>No study resources uploaded yet. Upload your first PDF guide using the form.</p>
                </div>
              ) : (
                resources.map(r => (
                  <div key={r.id || r._id} className="admin-item-card">
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.35rem' }}>
                        <span className="category-tag" style={{ fontSize: '0.72rem', padding: '0.15rem 0.55rem' }}>
                          {r.subject || 'General'}
                        </span>
                        {r.fileSize && (
                          <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                            {(r.fileSize / 1024).toFixed(0)} KB
                          </span>
                        )}
                      </div>
                      <div className="admin-item-title">{r.title}</div>
                      <div className="admin-item-meta">
                        📄 {r.fileName || 'study-guide.pdf'} • Uploaded by {r.uploadedBy || 'Admin'}
                      </div>
                    </div>

                    <div style={{ display: 'flex', gap: '0.4rem', flexShrink: 0 }}>
                      <a 
                        href={r.fileUrl} 
                        target="_blank" 
                        rel="noreferrer" 
                        className="btn-secondary" 
                        style={{ padding: '0.35rem 0.65rem', fontSize: '0.8rem', textDecoration: 'none' }}
                        title="View PDF"
                      >
                        <Eye size={13} /> View
                      </a>
                      <a 
                        href={`/api/resources/${r.id || r._id}/download`} 
                        download={r.fileName}
                        className="btn-secondary" 
                        style={{ padding: '0.35rem 0.65rem', fontSize: '0.8rem', textDecoration: 'none' }}
                        title="Download PDF"
                      >
                        <Download size={13} />
                      </a>
                      <button 
                        className="btn-action-delete" 
                        onClick={() => handleDeleteResource(r.id || r._id)}
                        title="Delete Resource"
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {/* TAB 5: QUESTION CATEGORIES */}
      {activeTab === 'categories' && (
        <div className="admin-two-col-grid">
          {/* Form Card */}
          <div className="admin-card">
            <h2>Add Question Category</h2>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginBottom: '1.25rem' }}>
              Create categories for interview questions and behavioral evaluation rubrics.
            </p>

            <form onSubmit={handleCreateCategory}>
              <div className="input-group">
                <label>Category Name *</label>
                <input
                  type="text"
                  placeholder="e.g. Behavioral STAR Method Rubrics"
                  value={catName}
                  onChange={(e) => setCatName(e.target.value)}
                  required
                />
              </div>

              <div className="input-group" style={{ marginTop: '1rem' }}>
                <label>Target Role / Career Focus</label>
                <input
                  type="text"
                  placeholder="e.g. All Software Engineers, Product Managers"
                  value={catRole}
                  onChange={(e) => setCatRole(e.target.value)}
                />
              </div>

              <button 
                type="submit" 
                className="btn-primary" 
                style={{ width: '100%', marginTop: '1.5rem', justifyContent: 'center' }}
              >
                <Plus size={16} /> Save Question Category
              </button>
            </form>
          </div>

          {/* List Card */}
          <div className="admin-card">
            <div className="admin-card-header">
              <div>
                <h2>Question Categories ({categories.length})</h2>
                <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>
                  Available categories used in AI interview evaluation prompts.
                </p>
              </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
              {categories.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '2.5rem', color: 'var(--text-muted)' }}>
                  <Tag size={36} style={{ margin: '0 auto 0.75rem', opacity: 0.5 }} />
                  <p>No custom question categories created yet. Add one using the form.</p>
                </div>
              ) : (
                categories.map(c => (
                  <div key={c.id || c._id} className="admin-item-card">
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div className="admin-item-title">{c.name}</div>
                      <div className="admin-item-meta">
                        Target Role: <strong>{c.targetRole || 'All Roles'}</strong>
                      </div>
                    </div>
                    <button 
                      className="btn-action-delete" 
                      onClick={() => handleDeleteCategory(c.id || c._id)}
                      title="Delete Category"
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {/* Student Progress Detail Modal */}
      <StudentProgressModal
        studentId={selectedStudentId}
        isOpen={showProgressModal}
        onClose={() => {
          setShowProgressModal(false);
          setSelectedStudentId(null);
        }}
      />
    </div>
  );
}

export default AdminPanel;
