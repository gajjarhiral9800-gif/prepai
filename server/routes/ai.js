import express from 'express';
import multer from 'multer';
import { createRequire } from 'module';
import { authMiddleware } from '../middleware/auth.js';

const require = createRequire(import.meta.url);
const pdfParse = require('pdf-parse');

const router = express.Router();
router.use(authMiddleware);

// Configure multer memory storage for resume uploads
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 } // 10MB limit
});

// Helper function to call Gemini API if key is available, else fallback
async function callGeminiApi(prompt, userApiKey) {
  const apiKey = process.env.GEMINI_API_KEY || userApiKey;
  if (!apiKey) {
    return null; // Return null to trigger fallback
  }

  const candidateModels = ['gemini-3-flash-preview', 'gemini-3.5-flash', 'gemini-3.8-flash', 'gemini-flash-latest'];
  for (const model of candidateModels) {
    try {
      const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }]
        }),
        signal: AbortSignal.timeout(15000)
      });

      if (!response.ok) {
        continue;
      }

      const data = await response.json();
      const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
      if (text) return text;
    } catch (err) {
      // continue to next model or fallback
    }
  }

  return null;
}

// Helper to parse JSON from AI response text safely
function cleanAndParseJSON(text) {
  if (!text) return null;
  try {
    let cleaned = text.replace(/```json\n?/gi, '').replace(/```\n?/g, '').trim();
    const firstBrace = cleaned.indexOf('{');
    const firstBracket = cleaned.indexOf('[');
    if (firstBrace !== -1 && (firstBracket === -1 || firstBrace < firstBracket)) {
      const lastBrace = cleaned.lastIndexOf('}');
      if (lastBrace !== -1) {
        cleaned = cleaned.substring(firstBrace, lastBrace + 1);
      }
    } else if (firstBracket !== -1) {
      const lastBracket = cleaned.lastIndexOf(']');
      if (lastBracket !== -1) {
        cleaned = cleaned.substring(firstBracket, lastBracket + 1);
      }
    }
    return JSON.parse(cleaned);
  } catch (err) {
    console.error('Failed to parse AI JSON:', err);
    return null;
  }
}

// Helper to shuffle array elements randomly
function shuffleArray(array) {
  const arr = [...array];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

// Helper to randomize quiz options and remap correct answer index
function randomizeQuizOptions(quizList) {
  if (!Array.isArray(quizList)) return [];
  return quizList.map((q, idx) => {
    if (!q.options || !Array.isArray(q.options)) return q;
    const optionsWithIndices = q.options.map((opt, optIdx) => ({
      opt,
      isCorrect: optIdx === q.correctAnswer
    }));
    const shuffled = shuffleArray(optionsWithIndices);
    const newCorrectIndex = shuffled.findIndex(item => item.isCorrect);
    return {
      ...q,
      id: idx + 1,
      options: shuffled.map(item => item.opt),
      correctAnswer: newCorrectIndex >= 0 ? newCorrectIndex : 0
    };
  });
}

// Multi-Domain Role Benchmark Definitions
const ROLE_BENCHMARKS = {
  graphic_design: {
    title: 'Graphic Designer',
    keywords: ['graphic', 'graphic designer', 'graphic design', 'visual designer', 'brand designer', 'illustrator', 'banner', 'logo', 'vector', 'photoshop', 'branding designer', 'creative designer', 'print designer'],
    benchmarkSkills: [
      'Adobe Illustrator',
      'Adobe Photoshop',
      'Adobe InDesign',
      'Figma',
      'Typography',
      'Vector Graphics',
      'Brand Identity',
      'Color Theory',
      'Layout Design',
      'Print Production (CMYK/RGB)',
      'Canva',
      'Visual Hierarchy',
      'CorelDraw',
      'Packaging Design'
    ],
    recommendedProjects: [
      {
        title: "Comprehensive Corporate Brand Identity & Vector System",
        category: "Graphic Design & Branding",
        description: "Develop a complete visual identity kit including logo variations, color hierarchy, vector icon sets in Adobe Illustrator, and print mockup guidelines."
      },
      {
        title: "Multi-Format Marketing Collateral & Packaging Design",
        category: "Print & Packaging Production",
        description: "Design multi-page brand brochures, packaging dies, and promotional social posters in Adobe Photoshop and InDesign with 300 DPI prepress standards."
      }
    ]
  },
  ui_ux: {
    title: 'UI/UX Designer',
    keywords: ['ui', 'ux', 'ui/ux', 'product designer', 'user experience', 'user interface', 'interaction designer', 'wireframe', 'prototype'],
    benchmarkSkills: [
      'Figma',
      'Wireframing',
      'Prototyping',
      'User Research',
      'Design Systems',
      'Usability Testing',
      'Information Architecture',
      'Mobile App UI',
      'Responsive Web UI',
      'Micro-interactions',
      'Adobe XD'
    ],
    recommendedProjects: [
      {
        title: "SaaS Analytics Web Application Design System",
        category: "UI/UX & Design Systems",
        description: "Create an accessible component library in Figma with light/dark variants, design tokens, interactive micro-states, and user testing metrics."
      },
      {
        title: "Mobile E-Commerce App User Journey & Prototype",
        category: "Mobile Product Design",
        description: "Conduct usability research, journey mapping, wireframing, and build high-fidelity interactive prototypes in Figma with 85%+ usability satisfaction."
      }
    ]
  },
  video_editing: {
    title: 'Video Editor & Motion Designer',
    keywords: ['video', 'edit', 'editor', 'video editing', 'motion graphics', 'premiere', 'after effects', 'davinci', 'final cut', 'videographer', 'youtube', 'filmmaking'],
    benchmarkSkills: [
      'Adobe Premiere Pro',
      'After Effects',
      'DaVinci Resolve',
      'Motion Graphics',
      'Color Grading',
      'Sound Design & Audio Mixing',
      'Storyboarding',
      'Keyframing',
      'VFX & Compositing',
      'Subtitling & Pacing',
      'CapCut'
    ],
    recommendedProjects: [
      {
        title: "High-Energy Commercial Promo & Motion Graphics Reel",
        category: "Video Editing & Motion Graphics",
        description: "Edit a dynamic 60-second commercial with 2D motion graphics in After Effects, kinetic typography, and custom sound design."
      },
      {
        title: "Cinematic Documentary Multi-Cam Color Grading & Audio Mix",
        category: "Post-Production & Color Grading",
        description: "Produce a cinematic sequence demonstrating node-based color grading in DaVinci Resolve, noise reduction, and multi-track audio mastering."
      }
    ]
  },
  frontend: {
    title: 'Frontend Developer',
    keywords: ['frontend', 'front end', 'react', 'react.js', 'vue', 'angular', 'javascript', 'typescript', 'web developer', 'ui developer'],
    benchmarkSkills: [
      'React',
      'JavaScript (ES6+)',
      'TypeScript',
      'HTML5/CSS3',
      'Tailwind CSS',
      'State Management (Redux/Zustand)',
      'REST APIs',
      'Git & GitHub',
      'Responsive Design',
      'Performance Optimization',
      'Vite'
    ],
    recommendedProjects: [
      {
        title: "Modern Interactive SaaS Dashboard with State & Charts",
        category: "Frontend Web Application",
        description: "Build a responsive React application featuring dark mode, custom dashboards with Recharts, client-side routing, and RESTful API integration."
      },
      {
        title: "High-Performance E-Commerce Web Storefront with Cart State",
        category: "React & TypeScript",
        description: "Develop a typed React/TypeScript shopping application with optimized lazy loading, persistent cart storage, and checkout flow."
      }
    ]
  },
  backend: {
    title: 'Backend Developer',
    keywords: ['backend', 'back end', 'node', 'express', 'django', 'fastapi', 'spring', 'database', 'sql', 'nosql', 'api engineer'],
    benchmarkSkills: [
      'Node.js',
      'Express',
      'Python',
      'SQL / PostgreSQL',
      'MongoDB',
      'RESTful API Design',
      'Docker',
      'Authentication & JWT',
      'System Architecture',
      'Redis Caching'
    ],
    recommendedProjects: [
      {
        title: "Scalable Microservices API with JWT Auth & Redis Cache",
        category: "Backend Architecture",
        description: "Build robust REST APIs with token-based authentication, role permissions, Redis caching for fast response times, and automated tests."
      },
      {
        title: "High-Concurrency Real-Time Event & Messaging Server",
        category: "Distributed Systems",
        description: "Develop a WebSocket-based messaging backend with database indexing, transaction consistency, and Docker deployment."
      }
    ]
  },
  fullstack: {
    title: 'Full Stack Developer',
    keywords: ['fullstack', 'full stack', 'mern', 'software engineer', 'software developer', 'full-stack', 'developer'],
    benchmarkSkills: [
      'React',
      'Node.js',
      'Express',
      'JavaScript / TypeScript',
      'Database (SQL / MongoDB)',
      'RESTful APIs',
      'Git',
      'Docker',
      'JWT Authentication',
      'Cloud Deployment (AWS/GCP)'
    ],
    recommendedProjects: [
      {
        title: "Full-Stack Enterprise Management Platform with Auth & DB",
        category: "Full Stack Development",
        description: "End-to-end web app with React frontend, Node/Express backend, relational database schema, JWT auth, and automated CI/CD pipeline."
      },
      {
        title: "Collaborative Workspace with Real-Time Data Sync",
        category: "Full Stack Development",
        description: "Interactive productivity platform with user workspaces, real-time collaboration, secure REST APIs, and responsive UI."
      }
    ]
  },
  data_science: {
    title: 'Data Analyst / Scientist',
    keywords: ['data', 'data analyst', 'data scientist', 'machine learning', 'analytics', 'data engineer', 'power bi', 'tableau', 'pandas', 'numpy'],
    benchmarkSkills: [
      'Python',
      'SQL',
      'Pandas & NumPy',
      'Data Visualization (Tableau/Power BI)',
      'Machine Learning (Scikit-Learn)',
      'Statistical Analysis',
      'Exploratory Data Analysis (EDA)',
      'Excel (Advanced)',
      'Data Cleaning'
    ],
    recommendedProjects: [
      {
        title: "Customer Churn Prediction & Predictive ML Pipeline",
        category: "Machine Learning & Predictive Analytics",
        description: "Build an end-to-end machine learning pipeline with exploratory data analysis, feature engineering, and ROC-AUC evaluation."
      },
      {
        title: "Executive Business Intelligence Dashboard & KPI Insights",
        category: "Data Visualization & SQL",
        description: "Design interactive Power BI / Tableau dashboards backed by complex SQL aggregations to identify business revenue drivers."
      }
    ]
  },
  marketing: {
    title: 'Digital Marketing Specialist',
    keywords: ['marketing', 'digital marketer', 'seo', 'social media', 'content marketer', 'ads manager', 'ppc', 'growth marketer'],
    benchmarkSkills: [
      'Search Engine Optimization (SEO)',
      'Google Analytics 4',
      'Content Strategy',
      'Social Media Marketing',
      'Meta Ads Manager',
      'PPC & Google Ads',
      'Email Marketing Campaigns',
      'Copywriting',
      'Conversion Rate Optimization (CRO)'
    ],
    recommendedProjects: [
      {
        title: "Multi-Channel Growth Campaign & Inbound Funnel Strategy",
        category: "Digital Marketing & Growth",
        description: "Architect and execute an organic SEO and paid ads strategy, measuring CAC, ROAS, and conversion funnel improvements via GA4."
      }
    ]
  }
};

// Identify target domain benchmark from job description or role title
function detectRoleBenchmark(jdText) {
  const lower = (jdText || '').toLowerCase().trim();
  
  if (lower.includes('graphic') || lower.includes('illustrator') || lower.includes('photoshop') || lower.includes('indesign') || lower.includes('vector') || lower.includes('logo designer') || lower.includes('brand designer') || lower.includes('grapgic')) {
    return { key: 'graphic_design', ...ROLE_BENCHMARKS.graphic_design };
  }
  if (lower.includes('ui/ux') || lower.includes('ui designer') || lower.includes('ux designer') || lower.includes('product designer') || lower.includes('figma') || lower.includes('wireframe')) {
    return { key: 'ui_ux', ...ROLE_BENCHMARKS.ui_ux };
  }
  if (lower.includes('video') || lower.includes('premiere') || lower.includes('after effects') || lower.includes('davinci') || lower.includes('motion graphic') || lower.includes('editing')) {
    return { key: 'video_editing', ...ROLE_BENCHMARKS.video_editing };
  }
  if (lower.includes('frontend') || lower.includes('front end') || lower.includes('react') || lower.includes('vue') || lower.includes('angular')) {
    return { key: 'frontend', ...ROLE_BENCHMARKS.frontend };
  }
  if (lower.includes('backend') || lower.includes('back end') || lower.includes('node') || lower.includes('express') || lower.includes('fastapi') || lower.includes('django')) {
    return { key: 'backend', ...ROLE_BENCHMARKS.backend };
  }
  if (lower.includes('data') || lower.includes('analytics') || lower.includes('machine learning') || lower.includes('tableau') || lower.includes('power bi')) {
    return { key: 'data_science', ...ROLE_BENCHMARKS.data_science };
  }
  if (lower.includes('marketing') || lower.includes('seo') || lower.includes('social media') || lower.includes('content strategist')) {
    return { key: 'marketing', ...ROLE_BENCHMARKS.marketing };
  }
  if (lower.includes('fullstack') || lower.includes('full stack') || lower.includes('developer') || lower.includes('software engineer')) {
    return { key: 'fullstack', ...ROLE_BENCHMARKS.fullstack };
  }

  if (lower.includes('design')) {
    return { key: 'graphic_design', ...ROLE_BENCHMARKS.graphic_design };
  }
  return { key: 'fullstack', ...ROLE_BENCHMARKS.fullstack };
}

// Extract and thoroughly evaluate candidate's existing projects from resume
function extractExistingProjectsFromResume(resumeText, roleBenchmark) {
  if (!resumeText) return [];
  const lines = resumeText.split(/\r?\n/).map(l => l.trim()).filter(Boolean);

  const projects = [];
  let inProjectSection = false;
  let currentProject = null;

  const projectHeaderRegex = /^(projects?|technical projects?|academic projects?|key projects?|portfolio)\b/i;
  const otherSectionRegex = /^(experience|work experience|employment|education|skills|certifications|summary|profile|awards)\b/i;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    if (projectHeaderRegex.test(line)) {
      inProjectSection = true;
      continue;
    }
    if (inProjectSection && otherSectionRegex.test(line)) {
      inProjectSection = false;
      if (currentProject) {
        projects.push(currentProject);
        currentProject = null;
      }
      break;
    }

    if (inProjectSection) {
      const isHeader = /^(\d+[\.\)]|[\u2022\-\*#])\s*([A-Za-z0-9].{3,60})/i.test(line) ||
                       (!line.startsWith('•') && !line.startsWith('-') && line.length < 70 && !line.endsWith('.') && lines[i+1]?.length > 0);

      if (isHeader) {
        if (currentProject) {
          projects.push(currentProject);
        }
        currentProject = {
          rawTitle: line.replace(/^(\d+[\.\)]|[\u2022\-\*#])\s*/, '').replace(/[:|\-–].*$/, '').trim(),
          lines: [line]
        };
      } else if (currentProject) {
        currentProject.lines.push(line);
      }
    }
  }

  if (currentProject) {
    projects.push(currentProject);
  }

  // If no explicit project section found, parse from potential project titles in text
  if (projects.length === 0) {
    const potentialTitles = lines.filter(l => 
      /project|app|system|website|platform|portal|redesign|campaign|dashboard|branding|identity|portfolio|collateral/i.test(l) &&
      l.length > 5 && l.length < 80
    );

    if (potentialTitles.length > 0) {
      potentialTitles.slice(0, 2).forEach((title) => {
        projects.push({
          rawTitle: title.replace(/^[\u2022\-\*\d\.]+\s*/, ''),
          lines: lines.slice(Math.max(0, lines.indexOf(title)), Math.min(lines.length, lines.indexOf(title) + 4))
        });
      });
    } else {
      projects.push({
        rawTitle: `${roleBenchmark.title} Portfolio Milestone`,
        lines: lines.slice(0, 6)
      });
    }
  }

  return projects.slice(0, 3).map((p, idx) => {
    const projectContent = p.lines.join(' ');

    const detectedTools = roleBenchmark.benchmarkSkills.filter(sk => 
      new RegExp(`\\b${sk.replace(/[-/\\^$*+?.()|[\]{}]/g, '\\$&')}\\b`, 'i').test(projectContent)
    );

    const isDesignRole = roleBenchmark.key === 'graphic_design' || roleBenchmark.key === 'ui_ux';
    const isVideoRole = roleBenchmark.key === 'video_editing';

    const hasRoleTools = detectedTools.length > 0;
    const relevanceScore = hasRoleTools ? (80 + Math.min(detectedTools.length * 5, 15)) : 65;

    let strengths = '';
    let criticalGaps = '';
    let improvedBulletPoints = [];

    if (isDesignRole) {
      strengths = detectedTools.length > 0 
        ? `Applied industry-relevant tools (${detectedTools.join(', ')}) demonstrating direct visual execution.`
        : "Demonstrated creative initiative with structured visual presentation.";
      
      criticalGaps = "Lacks explicit mention of essential tools (e.g. Adobe Illustrator, Adobe Photoshop, InDesign) and quantifiable commercial impact (e.g. 300 DPI prepress standards, brand conversion rate, social reach).";
      
      improvedBulletPoints = [
        `• Spearheaded visual design and vector illustration in Adobe Illustrator, expanding multi-channel brand reach by 35%.`,
        `• Designed marketing collateral and print packaging mockups in Adobe Photoshop with 300 DPI CMYK precision, achieving zero prepress errors.`
      ];
    } else if (isVideoRole) {
      strengths = detectedTools.length > 0 
        ? `Timeline workflow utilizing ${detectedTools.join(', ')} shows functional production fluency.`
        : "Good narrative sequencing and pacing.";
      
      criticalGaps = "Missing key post-production tools (DaVinci Resolve color grading, After Effects kinetic typography) and quantifiable viewer watch-time benchmarks.";
      
      improvedBulletPoints = [
        `• Edited high-retention commercial video content in Adobe Premiere Pro and After Effects, increasing viewer watch time by 42%.`,
        `• Performed cinematic color grading and multi-track audio mixing in DaVinci Resolve across 20+ production deliverables.`
      ];
    } else {
      strengths = detectedTools.length > 0 
        ? `Hands-on implementation leveraging ${detectedTools.join(', ')}.`
        : "Structured technical architecture with clear problem-solving objectives.";
      
      criticalGaps = "Lacks quantifiable engineering benchmarks (e.g., latency reduction %, test coverage, user scale) and production deployment details.";
      
      improvedBulletPoints = [
        `• Architected and shipped scalable core features with RESTful APIs, reducing data load times by 32% for 5,000+ active users.`,
        `• Implemented modular component hierarchy and end-to-end test coverage, cutting regression defects by 40%.`
      ];
    }

    return {
      projectTitle: p.rawTitle || `Project ${idx + 1}`,
      techUsed: detectedTools.length > 0 ? detectedTools : ['General Project Tools'],
      roleRelevance: `${relevanceScore}% (${relevanceScore >= 80 ? 'High' : 'Moderate'} Fit for ${roleBenchmark.title})`,
      strengths,
      criticalGaps,
      improvedBulletPoints
    };
  });
}

// Dynamic ATS Analysis
async function performATSAnalysis(resumeText, jobDescription, userApiKey) {
  const jdText = jobDescription || 'Professional role position with core industry skills and project requirements.';
  const roleBenchmark = detectRoleBenchmark(jdText);
  const targetTitle = roleBenchmark.title;

  // 1. Try Gemini AI Generation first
  const prompt = `You are an expert HR ATS Resume Screener & Career Strategist.
Analyze the candidate's resume against the Job Description or Target Role.

Resume Text: "${resumeText.substring(0, 3500)}"
Target Role / Job Description: "${jdText.substring(0, 1500)}"

CRITICAL ROLE & SKILLS INSTRUCTIONS:
1. Target Role: Evaluate specifically for "${targetTitle}".
2. Benchmark Core Skills:
   - If the role is Graphic Designer, essential tools are Adobe Illustrator, Adobe Photoshop, Adobe InDesign, Figma, Typography, Vector Graphics, Brand Identity, Layout Design, Color Theory, Print Production.
   - For any other role, use standard industry tools.
   - Check if the candidate's resume actually contains each core tool.
   - If the candidate lacks ANY essential tools (e.g., a Graphic Designer lacking Illustrator or Photoshop), YOU MUST LIST THEM in "missingSkills"!
   - NEVER suggest irrelevant software tools (like React or Node.js) for Graphic Design or Video Editing!
3. Candidate's Existing Projects Analysis:
   - Extract up to 3 projects that the candidate has done from their resume text.
   - For each project, evaluate:
     * projectTitle: Name of the project from the resume.
     * techUsed: Tools or technologies mentioned in that project.
     * roleRelevance: Relevance percentage (e.g. "85% Match for ${targetTitle}").
     * strengths: What the candidate did well.
     * criticalGaps: What essential tools (like Illustrator/Photoshop) or metrics are missing.
     * improvedBulletPoints: 2 rewritten bullet points using the STAR method with action verbs and quantifiable metrics tailored to ${targetTitle}.
4. Recommended New Projects:
   - Suggest 2 concrete new portfolio project ideas tailored to ${targetTitle}.

Return ONLY a JSON object with this exact schema:
{
  "atsScore": 75,
  "targetRoleDetected": "${targetTitle}",
  "summary": "Detailed summary evaluating fit for ${targetTitle} against industry standards",
  "requiredSkillsCount": 4,
  "requiredProjectsCount": 2,
  "foundKeywords": ["Skill 1", "Skill 2"],
  "missingSkills": ["Essential Missing Skill 1 (e.g. Adobe Illustrator)", "Essential Missing Skill 2 (e.g. Adobe Photoshop)", "Adobe InDesign", "Typography"],
  "existingProjectsAnalysis": [
    {
      "projectTitle": "Title from Resume",
      "techUsed": ["Tool 1", "Tool 2"],
      "roleRelevance": "85%",
      "strengths": "Strength description",
      "criticalGaps": "Missing tools/metrics",
      "improvedBulletPoints": [
        "• High impact rewritten bullet 1 with metrics and tools",
        "• High impact rewritten bullet 2"
      ]
    }
  ],
  "recommendedProjects": [
    {
      "title": "Role-tailored Project Title 1",
      "category": "Domain Category",
      "description": "Specific project details and skills to demonstrate on resume for this job."
    },
    {
      "title": "Role-tailored Project Title 2",
      "category": "Domain Category",
      "description": "Specific project details and skills to demonstrate on resume for this job."
    }
  ],
  "actionableAdvice": [
    "Step 1 to improve resume for this role",
    "Step 2 on framing project metrics"
  ]
}`;

  const aiText = await callGeminiApi(prompt, userApiKey);
  const parsed = cleanAndParseJSON(aiText);

  if (parsed && typeof parsed.atsScore === 'number') {
    if (!parsed.existingProjectsAnalysis || !Array.isArray(parsed.existingProjectsAnalysis) || parsed.existingProjectsAnalysis.length === 0) {
      parsed.existingProjectsAnalysis = extractExistingProjectsFromResume(resumeText, roleBenchmark);
    }
    if (!parsed.targetRoleDetected) {
      parsed.targetRoleDetected = targetTitle;
    }
    return parsed;
  }

  // 2. Intelligent Dynamic Benchmark Fallback Engine
  const benchmarkSkills = roleBenchmark.benchmarkSkills;

  // Match skills present in resume vs benchmark
  const foundKeywords = benchmarkSkills.filter(kw => {
    const escaped = kw.replace(/[-/\\^$*+?.()|[\]{}]/g, '\\$&');
    return new RegExp(`\\b${escaped}\\b`, 'i').test(resumeText);
  });

  // Any benchmark skill NOT in resume is a missing skill!
  const missingSkills = benchmarkSkills.filter(kw => !foundKeywords.includes(kw));

  const existingProjectsAnalysis = extractExistingProjectsFromResume(resumeText, roleBenchmark);
  const recommendedProjects = roleBenchmark.recommendedProjects;

  const atsScore = Math.min(45 + (foundKeywords.length * 8), 92);

  return {
    atsScore,
    targetRoleDetected: targetTitle,
    summary: `Your resume matches ${foundKeywords.length} core competencies for a ${targetTitle} position. To achieve a 90%+ ATS score and pass recruiter screening, our AI recommends adding ${missingSkills.slice(0, 4).join(', ')} and elevating your project metrics.`,
    requiredSkillsCount: missingSkills.length,
    requiredProjectsCount: recommendedProjects.length,
    foundKeywords,
    missingSkills: missingSkills.slice(0, 6),
    existingProjectsAnalysis,
    recommendedProjects,
    actionableAdvice: [
      `Add critical missing skills (${missingSkills.slice(0, 3).join(', ')}) directly to your technical skills and project descriptions.`,
      `Upgrade your existing projects with the AI-rewritten high-impact bullet points and concrete metrics shown below.`,
      `Feature the ${recommendedProjects.length} recommended portfolio projects to demonstrate role-specific mastery for ${targetTitle}.`
    ]
  };
}

// Fallback Resume Generator for AI Resume Builder
function generateFallbackResume(mode, resumeText, targetJob, missingSkills, userData) {
  const roleBenchmark = detectRoleBenchmark(targetJob || 'Graphic Designer');
  const targetTitle = roleBenchmark.title;
  
  const allCoreSkills = [...new Set([...(missingSkills || []), ...roleBenchmark.benchmarkSkills])].slice(0, 10);
  const name = userData?.fullName || (resumeText ? resumeText.split('\n')[0].replace(/[^a-zA-Z\s]/g, '').trim() : '') || 'Alex Morgan';
  const email = userData?.email || 'alex.morgan.portfolio@example.com';
  const phone = userData?.phone || '+1 (555) 234-5678';
  const location = userData?.location || 'New York, NY (Open to Remote)';

  return {
    fullName: name,
    contact: {
      email,
      phone,
      location,
      portfolio: userData?.portfolioUrl || 'https://alexmorgan.design',
      linkedin: userData?.linkedinUrl || 'https://linkedin.com/in/alexmorgan'
    },
    targetRole: targetTitle,
    summary: `Results-driven and creative ${targetTitle} with demonstrable expertise across ${allCoreSkills.slice(0, 4).join(', ')}. Proven track record of executing high-impact visual design and cross-functional deliverables, elevating brand visibility and streamlining production workflows.`,
    skills: {
      coreTools: allCoreSkills.slice(0, 6),
      domainExpertise: roleBenchmark.benchmarkSkills.slice(4, 9),
      softSkills: ['Creative Direction', 'Cross-Functional Collaboration', 'Agile Project Delivery', 'Client Presentation']
    },
    projects: [
      {
        name: `${targetTitle} Brand Identity & Vector Design System`,
        tools: allCoreSkills.slice(0, 3).join(', '),
        period: '2025',
        bullets: [
          `Spearheaded end-to-end design system and vector assets using ${allCoreSkills.slice(0, 2).join(' and ')}, increasing brand consistency across 4 multi-platform channels by 35%.`,
          `Engineered print-ready packaging layouts and digital marketing collateral compliant with 300 DPI CMYK prepress standards.`,
          `Delivered reusable component libraries and typography tokens, accelerating design turnaround by 40%.`
        ]
      },
      {
        name: `Interactive Promotional Campaign & Digital Collateral`,
        tools: allCoreSkills.slice(1, 4).join(', '),
        period: '2024 - 2025',
        bullets: [
          `Designed 30+ responsive digital promotional assets and social creatives, driving a 28% increase in user engagement.`,
          `Conducted asset optimization and color balancing, reducing file load times by 25% while maintaining visual fidelity.`
        ]
      }
    ],
    experience: [
      {
        role: targetTitle,
        company: 'Creative Studios & Freelance',
        location: 'Remote / Hybrid',
        period: '2023 - Present',
        bullets: [
          `Led visual design and production for 20+ commercial client projects using ${allCoreSkills.slice(0, 2).join(' and ')}.`,
          `Partnered with marketing and product teams to conceptualize and deploy cohesive multi-format campaigns.`
        ]
      }
    ],
    education: [
      {
        degree: `Bachelor's in ${targetTitle.includes('Design') ? 'Fine Arts / Graphic Design' : 'Computer Science / Relevant Field'}`,
        institution: 'State University / Institute of Technology',
        year: '2020 - 2024'
      }
    ],
    certifications: [
      `Professional Certification in ${targetTitle} & Industry Standard Tools`,
      `Advanced Visual Hierarchy & Design System Foundations`
    ]
  };
}

// 3a. POST /api/ai/resume/analyze (Raw text input)
router.post('/resume/analyze', async (req, res) => {
  try {
    const { resumeText, jobDescription } = req.body;

    if (!resumeText || !resumeText.trim()) {
      return res.status(400).json({ error: 'Resume text is required' });
    }

    const analysis = await performATSAnalysis(resumeText, jobDescription, req.user.apiKey);
    return res.json({ analysis });
  } catch (err) {
    console.error('Analyze resume error:', err);
    res.status(500).json({ error: 'Failed to analyze resume' });
  }
});

// Helper to parse text from PDF buffer across pdf-parse v1 and v2
async function parsePdfBuffer(buffer) {
  // Support pdf-parse v2 (PDFParse class)
  if (pdfParse && pdfParse.PDFParse) {
    try {
      const parser = new pdfParse.PDFParse({ data: buffer });
      await parser.load();
      const res = await parser.getText();
      if (typeof parser.destroy === 'function') {
        await parser.destroy();
      }
      if (res && res.text && res.text.trim()) {
        return res.text;
      }
    } catch (v2Err) {
      console.warn('PDFParse v2 error:', v2Err.message);
    }
  }

  // Support pdf-parse v1 (callable function)
  if (typeof pdfParse === 'function') {
    try {
      const data = await pdfParse(buffer);
      if (data && data.text && data.text.trim()) {
        return data.text;
      }
    } catch (v1Err) {
      console.warn('pdf-parse v1 error:', v1Err.message);
    }
  }

  return '';
}

// 3b. POST /api/ai/resume/upload-analyze (Multer file upload endpoint: .pdf, .docx, .txt)
router.post('/resume/upload-analyze', upload.single('resumeFile'), async (req, res) => {
  try {
    const { jobDescription } = req.body;
    let extractedText = req.body.resumeText || '';

    // If file uploaded via multer, parse text from buffer
    if (req.file) {
      const mimeType = req.file.mimetype;
      const fileName = req.file.originalname.toLowerCase();

      if (mimeType === 'application/pdf' || fileName.endsWith('.pdf')) {
        extractedText = await parsePdfBuffer(req.file.buffer);
      } else {
        // Plain text or string buffer
        extractedText = req.file.buffer.toString('utf-8');
      }
    }

    if (!extractedText || !extractedText.trim()) {
      return res.status(400).json({ 
        error: 'Failed to extract readable text from the uploaded PDF. Please make sure the PDF has selectable text (not a flat image scan), or switch to the "Paste Resume Text" tab.' 
      });
    }

    const analysis = await performATSAnalysis(extractedText, jobDescription, req.user.apiKey);
    return res.json({ analysis, extractedText });
  } catch (err) {
    console.error('Multer file upload analyze error:', err);
    res.status(500).json({ error: 'Failed to parse resume file: ' + err.message });
  }
});

// 1. POST /api/ai/interview/generate-questions
router.post('/interview/generate-questions', async (req, res) => {
  try {
    const { role = 'Frontend Developer', level = 'Mid-Level', type = 'Technical' } = req.body;
    const sessionSeed = `seed_${Date.now()}_${Math.floor(Math.random() * 1000000)}`;
    
    const prompt = `You are a senior technical interviewer. Generate 4 COMPLETELY UNIQUE, structured interview questions for a ${level} ${role} focusing on ${type} topics.
    Session Seed: ${sessionSeed}.
    
    IMPORTANT RULES:
    - Generate brand new questions every session. Avoid repeating standard textbook questions.
    - Vary technical sub-topics, scenarios, and trade-off discussions.
    
    Return ONLY a JSON array of objects with this schema:
    [
      {
        "id": 1,
        "question": "Question text here",
        "category": "Topic area",
        "hint": "Key concepts to cover in candidate answer"
      }
    ]`;

    const aiText = await callGeminiApi(prompt, req.user.apiKey);
    const parsed = cleanAndParseJSON(aiText);

    if (parsed && Array.isArray(parsed) && parsed.length > 0) {
      return res.json({ questions: parsed, source: 'gemini-ai' });
    }

    // Fallback Mock Bank tailored by role
    const fallbackBank = {
      'Graphic Designer': [
        { id: 1, question: 'How do you approach creating a cohesive visual brand identity and design system for a new digital product?', category: 'Branding & Design Systems', hint: 'Typography scales, color harmony, visual consistency, design tokens' },
        { id: 2, question: 'Explain the principles of layout hierarchy, grid systems, and whitespace in print vs digital graphics.', category: 'Visual Hierarchy', hint: 'Rule of thirds, focal points, baseline grids, contrast' },
        { id: 3, question: 'How do you handle client feedback that contradicts core design and accessibility best practices?', category: 'Design Communication', hint: 'Data-driven design decisions, WCAG compliance, stakeholder alignment' },
        { id: 4, question: 'What is your process for preparing high-resolution asset handoffs for frontend developers and print vendors?', category: 'Asset Handoff', hint: 'Vector vs raster, SVG optimization, DPI, color profiles (RGB vs CMYK)' }
      ],
      'UI/UX Designer': [
        { id: 1, question: 'Walk me through your user research process when designing a complex user workflow from scratch.', category: 'User Research', hint: 'User personas, journey mapping, usability testing, wireframing' },
        { id: 2, question: 'How do you ensure your UI components meet WCAG 2.1 AA accessibility standards?', category: 'Accessibility', hint: 'Color contrast ratios, screen reader accessibility, keyboard navigation' },
        { id: 3, question: 'Describe how you conduct usability testing and iterate on prototype feedback.', category: 'Usability Testing', hint: 'A/B testing, quantitative vs qualitative metrics, rapid prototyping' },
        { id: 4, question: 'How do you collaborate with engineering teams to ensure design fidelity during frontend implementation?', category: 'Design Handoff', hint: 'Figma components, design tokens, micro-interactions, responsive specs' }
      ],
      'Frontend Developer': [
        { id: 1, question: `Can you explain the Virtual DOM in React and how reconciliation works under the hood for ${level} applications?`, category: 'React Architecture', hint: 'Diffing algorithm, key prop, fiber tree' },
        { id: 2, question: 'How do you optimize web application performance and minimize Core Web Vitals like LCP and CLS?', category: 'Performance', hint: 'Code splitting, image lazy loading, asset caching' },
        { id: 3, question: 'Describe how CSS Grid and Flexbox differ in layout calculation, and when you choose one over the other.', category: 'CSS Layouts', hint: '1D vs 2D layout systems' },
        { id: 4, question: 'Explain the concept of closures in JavaScript and provide a practical real-world use case.', category: 'JavaScript Core', hint: 'Lexical scoping, data privacy, state preservation' }
      ],
      'Backend Developer': [
        { id: 1, question: `What strategies do you use for database index optimization and query performance tuning in ${role}?`, category: 'Databases', hint: 'B-trees, composite indexes, query execution plans' },
        { id: 2, question: 'Explain the difference between horizontal and vertical scaling and how JWT stateless auth fits in.', category: 'System Architecture', hint: 'Stateless server sessions, load balancing' },
        { id: 3, question: 'How do you handle database concurrency and prevent race conditions in API endpoints?', category: 'Concurrency', hint: 'Transactions, pessimistic vs optimistic locking' },
        { id: 4, question: 'Describe how REST APIs differ from GraphQL and gRPC in terms of overhead and scalability.', category: 'API Design', hint: 'Overfetching, serialization, streaming' }
      ],
      'Full Stack Developer': [
        { id: 1, question: 'Walk me through how you design a secure user authentication system with JWT tokens and refresh tokens.', category: 'Security & Auth', hint: 'Token expiry, httpOnly cookies, token rotation' },
        { id: 2, question: 'How do you manage client-side and server-side state synchronization in modern web applications?', category: 'State Management', hint: 'TanStack Query, WebSocket, optimistic updates' },
        { id: 3, question: 'Explain the microservices architecture pattern versus monolithic architecture.', category: 'Architecture', hint: 'Service discovery, API gateway, operational overhead' },
        { id: 4, question: 'What steps do you take to secure a web app against OWASP Top 10 vulnerabilities like XSS and CSRF?', category: 'Web Security', hint: 'Sanitization, CSP headers, CORS policies' }
      ]
    };

    const questionsList = fallbackBank[role] || fallbackBank['Frontend Developer'];
    res.json({ questions: shuffleArray(questionsList), source: 'smart-fallback' });
  } catch (err) {
    console.error('Generate questions error:', err);
    res.status(500).json({ error: 'Failed to generate interview questions' });
  }
});

// Helper for intelligent fallback evaluation of interview response
function generateInterviewEvaluationFallback(question, answer, role = 'Software Engineer') {
  const trimmed = (answer || '').trim();
  const words = trimmed.split(/\s+/).filter(Boolean);
  const wordCount = words.length;
  const lower = trimmed.toLowerCase();

  // Stop words to isolate meaningful keywords
  const stopWords = new Set(['the','and','a','to','of','in','i','it','is','that','this','with','for','on','as','was','at','by','an','be','from','or','are','your','my','we','you','they','their','have','has','had','would','could','should','about','can','will','do','does','did','just','also','like']);
  const userKeyWords = words
    .map(w => w.replace(/[^a-zA-Z0-9]/g, '').toLowerCase())
    .filter(w => w.length > 3 && !stopWords.has(w));
  const uniqueKeyWords = [...new Set(userKeyWords)];

  // Detect structure & behavioral cues
  const starCues = ['situation', 'task', 'action', 'result', 'because', 'when i was', 'in my project', 'we built', 'implemented', 'designed', 'resolved', 'improved', 'led to', 'reduced', 'increased', 'optimized', 'firstly', 'secondly', 'specifically'];
  const matchedStar = starCues.filter(k => lower.includes(k));
  const hasStarStructure = matchedStar.length >= 2;

  // Detect metrics & quantifiable impact
  const metricPattern = /(\d+[\%kmb]?|\b(latency|seconds|minutes|users|scalability|performance|concurrency|throughput|fps|roi|conversion|budget|hours|downtime)\b)/gi;
  const metricsFound = trimmed.match(metricPattern) || [];
  const hasMetrics = metricsFound.length > 0;

  // Multi-Domain Keyword Dictionary
  const domainSkills = {
    'Graphic Designer': ['hierarchy', 'typography', 'grid', 'color', 'whitespace', 'contrast', 'figma', 'illustrator', 'photoshop', 'branding', 'vector', 'cmyk', 'rgb', 'dpi', 'wcag', 'scale', 'composition'],
    'UI/UX Designer': ['user', 'research', 'wireframe', 'prototype', 'figma', 'testing', 'persona', 'journey', 'usability', 'wcag', 'accessibility', 'component', 'tokens', 'heuristic', 'flow'],
    'Frontend Developer': ['react', 'virtual dom', 'dom', 'component', 'state', 'hook', 'props', 'css', 'grid', 'flexbox', 'render', 'lifecycle', 'bundle', 'vite', 'webpack', 'typescript', 'javascript', 'api', 'performance', 'reconciliation', 'closure'],
    'Backend Developer': ['database', 'sql', 'nosql', 'api', 'rest', 'graphql', 'index', 'query', 'transaction', 'acid', 'cache', 'redis', 'scaling', 'docker', 'concurrency', 'race condition', 'microservice', 'security', 'jwt'],
    'Full Stack Developer': ['frontend', 'backend', 'api', 'database', 'auth', 'jwt', 'state', 'server', 'client', 'deployment', 'security', 'react', 'node', 'architecture', 'rest', 'scalability'],
    'Data Scientist': ['machine learning', 'regression', 'classification', 'features', 'pandas', 'python', 'sql', 'pipeline', 'overfitting', 'metrics', 'roc-auc', 'clustering', 'visualization'],
    'DevOps & Cloud Engineer': ['ci/cd', 'docker', 'kubernetes', 'terraform', 'aws', 'cloud', 'monitoring', 'deployment', 'pipeline', 'security', 'infrastructure', 'automation'],
    'System Design Architect': ['scalability', 'availability', 'load balancer', 'cache', 'microservice', 'database', 'sharding', 'replication', 'consistency', 'throughput', 'latency']
  };

  const domainList = domainSkills[role] || domainSkills['Frontend Developer'];
  const matchedDomain = domainList.filter(k => lower.includes(k));

  // Dimensional scoring
  let technicalAccuracy = Math.min(52 + (matchedDomain.length * 10) + (uniqueKeyWords.length >= 4 ? 12 : 4), 96);
  let clarity = wordCount < 12 ? 45 : wordCount < 30 ? 72 : Math.min(80 + Math.floor(wordCount / 8), 95);
  let structure = Math.min(54 + (matchedStar.length * 10) + (wordCount >= 35 ? 12 : 0), 94);
  let impact = Math.min(48 + (metricsFound.length * 14) + (wordCount >= 40 ? 12 : 0), 92);

  if (wordCount < 10) {
    technicalAccuracy = 42;
    clarity = 45;
    structure = 40;
    impact = 35;
  }

  const score = Math.round((technicalAccuracy * 0.35) + (clarity * 0.25) + (structure * 0.20) + (impact * 0.20));

  let ratingLabel = 'Strong Candidate';
  if (score >= 90) ratingLabel = '🌟 Exceptional / Top Hire';
  else if (score >= 78) ratingLabel = '✅ Strong Candidate';
  else if (score >= 62) ratingLabel = '⚡ Proficient / Good Foundation';
  else if (score >= 48) ratingLabel = '📘 Developing / Needs Practice';
  else ratingLabel = '⚠️ Incomplete / Needs Work';

  const starRating = `${(score / 20).toFixed(1)}/5`;

  // Dynamically generate strengths referencing candidate's specific input
  const strengths = [];
  if (matchedDomain.length > 0) {
    strengths.push(`Directly referenced essential ${role} concepts including ${matchedDomain.slice(0, 3).map(k => `"${k}"`).join(', ')}.`);
  } else if (uniqueKeyWords.length > 0) {
    strengths.push(`Clearly integrated relevant technical focus words such as ${uniqueKeyWords.slice(0, 3).map(k => `"${k}"`).join(', ')}.`);
  } else {
    strengths.push('Directly addressed the subject matter of the prompt.');
  }

  if (wordCount >= 25) {
    strengths.push('Clear communicative delivery that presents your reasoning without distracting conversational fillers.');
  } else {
    strengths.push('Concise and direct response that targets the core question.');
  }

  if (hasMetrics) {
    strengths.push('Effective use of quantitative metrics or practical benchmarks to validate real-world results.');
  } else if (hasStarStructure) {
    strengths.push('Demonstrated structured narrative flow connecting the challenge to your chosen solution.');
  } else {
    strengths.push('Maintained a professional, confident tone appropriate for technical evaluation.');
  }

  // Dynamically generate actionable improvements
  const improvements = [];
  if (!hasMetrics) {
    improvements.push('Quantify your impact: Include concrete metrics (e.g. latency, user scale, speedup %, or cost savings) to prove measurable value.');
  }
  if (!hasStarStructure) {
    improvements.push('Structure with STAR: Clearly define the Situation/Task, specific Actions you led, and the tangible Business Result.');
  }
  if (wordCount < 40) {
    improvements.push('Elaborate on edge cases: Address potential trade-offs, alternative approaches you considered, and how you verify stability.');
  } else {
    improvements.push('Deepen architectural context: Mention monitoring, automated testing, or maintainability trade-offs.');
  }

  // Reframed / Recommended Answer: Elevate candidate's answer into executive delivery
  const kwSnippet = uniqueKeyWords.length > 0 ? uniqueKeyWords.slice(0, 3).join(', ') : 'core domain best practices';
  const cleanAns = trimmed.replace(/^[\"']|[\"']$/g, '');
  const reframedAnswer = `In my work as a ${role}, I approach this by prioritizing ${kwSnippet}. Specifically, ${cleanAns} In production, I validate this approach through automated testing, continuous performance monitoring, and clear cross-functional alignment to ensure the solution scales reliably under real-world loads.`;

  const reframingTips = "Structured your raw response into a compelling 3-part delivery: an authoritative opening thesis, concrete technical execution integrating your key concepts, and measurable production impact.";

  const sampleExemplarAnswer = `When addressing this in ${role} systems, I establish clear architectural boundaries, decouple core logic into testable units, and measure performance using automated benchmark pipelines to guarantee reliability and scalability.`;

  return {
    score,
    starRating,
    ratingLabel,
    ratingBreakdown: {
      technicalAccuracy,
      clarity,
      structure,
      impact
    },
    feedback: score >= 78 
      ? `Strong, articulate response! You demonstrated good technical knowledge of ${role} principles and directly addressed the question.`
      : `Promising start with relevant concepts. Adding structured real-world examples and quantifiable metrics will substantially elevate your score.`,
    strengths,
    improvements,
    reframedAnswer,
    reframingTips,
    sampleExemplarAnswer
  };
}

// 2. POST /api/ai/interview/evaluate
router.post('/interview/evaluate', async (req, res) => {
  try {
    const { question, answer, role = 'Software Engineer' } = req.body;
    
    if (!answer || !answer.trim()) {
      return res.status(400).json({ error: 'Answer is required for evaluation' });
    }

    const prompt = `You are a Principal Hiring Manager and Elite Interview Coach evaluating an answer for a "${role}" position.

Question: "${question}"
Candidate's Exact Answer: "${answer}"

Analyze the candidate's exact answer thoroughly and provide:
1. "score": Numerical rating from 0 to 100 based on technical accuracy, structure, clarity, and impact.
2. "starRating": Format "X.X/5" (e.g. "4.3/5").
3. "ratingLabel": One of "Exceptional / Top Hire", "Strong Candidate", "Proficient / Solid Foundation", "Developing / Needs Practice", "Incomplete / Needs Work".
4. "ratingBreakdown": Object with scores 0-100:
   - "technicalAccuracy": Score for technical correctness, relevance, and domain depth.
   - "clarity": Score for conciseness, articulation, and vocabulary.
   - "structure": Score for logical sequencing and STAR alignment.
   - "impact": Score for concrete metrics, real-world examples, and trade-offs.
5. "feedback": 2-3 sentence executive summary of the response quality and first impression.
6. "strengths": Array of 2-3 bullet points specifically citing what the candidate said well.
7. "improvements": Array of 2-3 bullet points specifically explaining what was missing, vague, or could be elevated.
8. "reframedAnswer": Reframe and elevate the candidate's actual points into an articulate, executive-level, professional interview answer (approx. 70-130 words). Keep their core ideas and technologies, but polish the structure, eliminate hesitation, and add impact.
9. "reframingTips": 1-2 sentences explaining what strategic improvements were made when reframing their answer.
10. "sampleExemplarAnswer": A gold-standard exemplar answer demonstrating industry best practice for this question.

Return ONLY a valid JSON object matching this schema without any markdown backticks.`;

    const aiText = await callGeminiApi(prompt, req.user.apiKey);
    const parsed = cleanAndParseJSON(aiText);

    if (parsed && typeof parsed.score === 'number') {
      const evaluation = {
        score: parsed.score,
        starRating: parsed.starRating || `${(parsed.score / 20).toFixed(1)}/5`,
        ratingLabel: parsed.ratingLabel || (parsed.score >= 85 ? 'Strong Candidate' : 'Proficient'),
        ratingBreakdown: parsed.ratingBreakdown || {
          technicalAccuracy: Math.min(100, parsed.score + 2),
          clarity: parsed.score,
          structure: Math.max(50, parsed.score - 4),
          impact: Math.max(45, parsed.score - 6)
        },
        feedback: parsed.feedback || 'Good response evaluating key technical aspects of the question.',
        strengths: Array.isArray(parsed.strengths) ? parsed.strengths : [parsed.strengths || 'Direct answer to the question.'],
        improvements: Array.isArray(parsed.improvements) ? parsed.improvements : [parsed.improvements || 'Incorporate more metrics.'],
        reframedAnswer: parsed.reframedAnswer || parsed.sampleExemplarAnswer,
        reframingTips: parsed.reframingTips || 'Structured your ideas into an executive narrative with technical depth and impact.',
        sampleExemplarAnswer: parsed.sampleExemplarAnswer || parsed.reframedAnswer
      };
      return res.json({ evaluation, source: 'gemini-ai' });
    }

    // Dynamic Intelligent Fallback Scoring & Reframing
    const evaluation = generateInterviewEvaluationFallback(question, answer, role);
    res.json({ evaluation, source: 'smart-fallback' });
  } catch (err) {
    console.error('Evaluate answer error:', err);
    res.status(500).json({ error: 'Failed to evaluate answer' });
  }
});

// 3c. POST /api/ai/resume/build-or-update (AI Resume Builder & Tailor)
router.post('/resume/build-or-update', async (req, res) => {
  try {
    const {
      mode = 'tailor', // 'tailor' (update existing) or 'create' (build fresh)
      resumeText = '',
      targetJob = 'Graphic Designer',
      missingSkills = [],
      userData = {}
    } = req.body;

    const roleBenchmark = detectRoleBenchmark(targetJob);
    const targetTitle = roleBenchmark.title;

    // 1. Try Gemini AI Generation
    const prompt = `You are an elite Executive Resume Writer and ATS Optimization Specialist.
${mode === 'tailor' ? 'UPGRADE AND TAILOR this candidate existing resume' : 'BUILD A BRAND NEW, ATS-COMPLIANT RESUME'} for the target job: "${targetTitle}".

Target Role: "${targetTitle}"
${mode === 'tailor' && resumeText ? `Existing Resume Content:\n"""\n${resumeText.substring(0, 3500)}\n"""` : ''}
Key Missing / Recommended Skills to explicitly incorporate: ${missingSkills.length > 0 ? missingSkills.join(', ') : roleBenchmark.benchmarkSkills.slice(0, 6).join(', ')}

Candidate Details:
- Name: ${userData.fullName || 'Candidate Name'}
- Email: ${userData.email || 'candidate@example.com'}
- Phone: ${userData.phone || '+1 (555) 000-0000'}
- Location: ${userData.location || 'City, State'}
- Portfolio / Website: ${userData.portfolioUrl || ''}
- LinkedIn: ${userData.linkedinUrl || ''}
- Experience Level: ${userData.experienceLevel || 'Mid-Level'}
- Additional Notes / Background: ${userData.notes || ''}

CRITICAL INSTRUCTIONS FOR "${targetTitle}":
- If the role is Graphic Designer, emphasize tools like Adobe Illustrator, Adobe Photoshop, Adobe InDesign, Figma, Typography, Brand Identity, Vector Graphics.
- Projects & Experience Bullets: Use strong action verbs (Spearheaded, Designed, Engineered, Conceptualized) and include quantifiable metrics (e.g., "Increased conversion by 30%", "Crafted 25+ vector assets in Illustrator", "Ensured 100% 300 DPI print prepress accuracy").
- Make sure each project has concrete tools listed and 2-3 strong ATS bullet points.
- Format must be completely structured, professional, and ATS-scannable.

Return ONLY a valid JSON object matching this schema:
{
  "fullName": "Name",
  "contact": {
    "email": "email",
    "phone": "phone",
    "location": "location",
    "portfolio": "portfolio url",
    "linkedin": "linkedin url"
  },
  "targetRole": "${targetTitle}",
  "summary": "Compelling 3-4 sentence professional summary tailored to ${targetTitle} highlighting core tools and impact.",
  "skills": {
    "coreTools": ["Tool 1", "Tool 2", "Tool 3", "Tool 4"],
    "domainExpertise": ["Skill 1", "Skill 2", "Skill 3"],
    "softSkills": ["Collaboration", "Attention to Detail", "Time Management"]
  },
  "projects": [
    {
      "name": "Project Name 1",
      "tools": "Adobe Illustrator, Photoshop",
      "period": "2025",
      "bullets": [
        "Action verb + technical execution + tools + quantifiable result",
        "Action verb + achievement + metric"
      ]
    },
    {
      "name": "Project Name 2",
      "tools": "Tools used",
      "period": "2024",
      "bullets": [
        "Action verb + achievement + metric"
      ]
    }
  ],
  "experience": [
    {
      "role": "${targetTitle}",
      "company": "Company Name / Studio",
      "location": "Remote / Hybrid",
      "period": "2023 - Present",
      "bullets": [
        "Action verb + core responsibility + metric",
        "Action verb + workflow impact"
      ]
    }
  ],
  "education": [
    {
      "degree": "Degree in relevant discipline",
      "institution": "University / College",
      "year": "2020 - 2024"
    }
  ],
  "certifications": [
    "Relevant Certification or Credential"
  ]
}`;

    const aiText = await callGeminiApi(prompt, req.user.apiKey);
    const parsed = cleanAndParseJSON(aiText);

    if (parsed && parsed.fullName && parsed.summary && parsed.projects) {
      return res.json({ resume: parsed, source: 'gemini-ai' });
    }

    // Smart Fallback Builder
    const fallbackResume = generateFallbackResume(mode, resumeText, targetJob, missingSkills, userData);
    return res.json({ resume: fallbackResume, source: 'smart-fallback' });
  } catch (err) {
    console.error('Build or update resume error:', err);
    res.status(500).json({ error: 'Failed to build or update resume' });
  }
});

// 4. POST /api/ai/quiz/generate
router.post('/quiz/generate', async (req, res) => {
  try {
    const { topic = 'React & Web Development', count = 5 } = req.body;
    const sessionSeed = `seed_${Date.now()}_${Math.floor(Math.random() * 1000000)}`;

    const prompt = `Generate a ${count}-question multiple choice quiz SPECIFICALLY on the topic of "${topic}".
    (Session Seed: ${sessionSeed}).
    
    CRITICAL GENERATION RULES:
    1. Every question and explanation MUST be directly about "${topic}".
    2. Generate COMPLETELY NEW, UNIQUE questions every single session. Do NOT repeat standard textbook questions.
    3. Ensure options are realistic, distinct, and concise.
    4. Randomly shuffle which option index (0, 1, 2, or 3) is the correct answer so it is unpredictable.
    
    Return ONLY a JSON array with this schema:
    [
      {
        "id": 1,
        "question": "Question text",
        "options": ["Option A", "Option B", "Option C", "Option D"],
        "correctAnswer": 0,
        "explanation": "Why Option A is correct"
      }
    ]`;

    const aiText = await callGeminiApi(prompt, req.user.apiKey);
    const parsed = cleanAndParseJSON(aiText);

    if (parsed && Array.isArray(parsed) && parsed.length > 0) {
      const randomizedQuiz = randomizeQuizOptions(parsed);
      return res.json({ quiz: randomizedQuiz, source: 'gemini-ai' });
    }

    // Comprehensive Quiz Banks for all topics
    const topicQuizBanks = {
      graphic: [
        {
          id: 1,
          question: "What is the primary difference between RGB and CMYK color modes?",
          options: [
            "RGB is additive for digital screens; CMYK is subtractive for physical printing",
            "CMYK offers a wider color gamut than RGB for monitors",
            "RGB uses 4 ink colors while CMYK uses red, green, and blue light",
            "There is no functional difference"
          ],
          correctAnswer: 0,
          explanation: "RGB (Red, Green, Blue) is an additive color model used for screen displays, whereas CMYK (Cyan, Magenta, Yellow, Key/Black) is subtractive used for ink printing."
        },
        {
          id: 2,
          question: "In graphic design typography, what does kerning refer to?",
          options: [
            "The vertical space between lines of body text (leading)",
            "The adjustment of spacing between two specific character letters",
            "The uniform spacing across an entire block of text (tracking)",
            "The font size scale"
          ],
          correctAnswer: 1,
          explanation: "Kerning is the process of adjusting the space between individual letter pairs to achieve visually pleasing typography."
        },
        {
          id: 3,
          question: "Which file format is best suited for scalable vector graphics that do not lose quality when resized?",
          options: ["PNG", "JPEG", "SVG", "GIF"],
          correctAnswer: 2,
          explanation: "SVG (Scalable Vector Graphics) uses mathematical equations to render lines and curves cleanly at any scale without pixelation."
        },
        {
          id: 4,
          question: "What is the 'Golden Ratio' commonly used for in visual layout design?",
          options: [
            "Setting 300 DPI print margins",
            "Creating aesthetically pleasing visual proportions (~1:1.618)",
            "Calculating screen frame rate",
            "Choosing primary brand hex codes"
          ],
          correctAnswer: 1,
          explanation: "The Golden Ratio (~1:1.618) is a mathematical proportion found in nature that artists and graphic designers use to build balanced visual compositions."
        },
        {
          id: 5,
          question: "What does WCAG color contrast ratio requirement (AA standard) ensure for text graphics?",
          options: [
            "Text color must match the background tint exactly",
            "Text must have a contrast ratio of at least 4.5:1 against its background for readability",
            "Only black text can be placed on white backgrounds",
            "Background images must be blurred"
          ],
          correctAnswer: 1,
          explanation: "WCAG 2.1 AA standard mandates a minimum contrast ratio of 4.5:1 for normal text so visually impaired users can read graphic content."
        }
      ],
      ui: [
        {
          id: 1,
          question: "What is the main goal of wireframing in the UI/UX design process?",
          options: [
            "To define final high-resolution visual color palettes",
            "To establish basic structural layouts, visual hierarchy, and element positioning",
            "To write production CSS stylesheets",
            "To execute automated usability tests"
          ],
          correctAnswer: 1,
          explanation: "Wireframes serve as low-fidelity blueprints focused on layout structure, content positioning, and user flow before visual styling is applied."
        },
        {
          id: 2,
          question: "What does Fitts's Law predict in User Interface design?",
          options: [
            "The time required to move to a target is a function of the distance to and size of the target",
            "Users spend 80% of their time on your homepage",
            "Interface animations should always last 300ms",
            "Users prefer dark mode over light mode"
          ],
          correctAnswer: 0,
          explanation: "Fitts's Law states that larger, closer interactive buttons are faster and easier for users to click or tap."
        },
        {
          id: 3,
          question: "What is the difference between Low-Fidelity and High-Fidelity prototypes?",
          options: [
            "Low-fi focuses on paper sketches/wireframes; High-fi incorporates clickable interactive UI components and real visual assets",
            "High-fi is used only for mobile apps",
            "Low-fi requires frontend coding in React",
            "There is no difference"
          ],
          correctAnswer: 0,
          explanation: "Low-fi prototypes quickly test concepts, while high-fi interactive prototypes simulate realistic product behavior."
        },
        {
          id: 4,
          question: "What is an Information Architecture (IA) sitemap used for?",
          options: [
            "Organizing and structuring navigation flow across an application",
            "Designing vector icons",
            "Writing server database schemas",
            "Measuring website load speeds"
          ],
          correctAnswer: 0,
          explanation: "Information Architecture maps out how content and pages are categorized and connected to facilitate intuitive user navigation."
        },
        {
          id: 5,
          question: "What is the primary benefit of maintaining a Design System in Figma/Adobe XD?",
          options: [
            "Ensures visual consistency, speeds up design iterations, and simplifies designer-developer handoff",
            "Eliminates the need for user testing",
            "Automatically writes backend SQL queries",
            "Reduces web hosting costs"
          ],
          correctAnswer: 0,
          explanation: "Design systems provide reusable UI tokens and component libraries that ensure visual uniformity across digital products."
        }
      ],
      react: [
        {
          id: 1,
          question: "What is the primary function of React's useEffect hook?",
          options: [
            "To update the DOM synchronously",
            "To handle side effects like data fetching and subscriptions",
            "To define global component state",
            "To style React components dynamically"
          ],
          correctAnswer: 1,
          explanation: "useEffect is specifically designed to perform side effects after render, such as API fetching or subscribing to external events."
        },
        {
          id: 2,
          question: "Why is the 'key' prop important when rendering lists of items in React?",
          options: [
            "It automatically styles list elements",
            "It helps React identify which items have changed, been added, or removed during diffing",
            "It connects the component to local storage",
            "It encrypts array item data"
          ],
          correctAnswer: 1,
          explanation: "React relies on unique keys to efficiently reconcile list items without re-rendering unchanged elements."
        },
        {
          id: 3,
          question: "What is the difference between props and state in React?",
          options: [
            "Props are passed into components from parents (immutable); State is managed internally within a component (mutable)",
            "State is read-only while props change frequently",
            "Props are used only in class components",
            "State cannot be updated using hooks"
          ],
          correctAnswer: 0,
          explanation: "Props flow downwards from parent to child components, whereas state represents local interactive component state."
        },
        {
          id: 4,
          question: "What problem does the React Context API solve?",
          options: [
            "Avoids prop-drilling by passing state globally down the component tree without manually passing props at every level",
            "Replaces CSS flexbox layouts",
            "Connects React directly to SQLite databases",
            "Speeds up JavaScript compilation"
          ],
          correctAnswer: 0,
          explanation: "React Context provides a clean way to share state like auth tokens or themes across deeply nested component hierarchies."
        },
        {
          id: 5,
          question: "What is the Virtual DOM in React?",
          options: [
            "A lightweight in-memory representation of the real DOM used to compute efficient UI diff updates",
            "A physical server location hosting web pages",
            "A browser plugin for inspecting HTML",
            "A CSS framework"
          ],
          correctAnswer: 0,
          explanation: "React updates its Virtual DOM first, calculates minimal changes using reconciliation, and batches updates to the real DOM."
        }
      ],
      node: [
        {
          id: 1,
          question: "How does Node.js handle non-blocking asynchronous I/O operations?",
          options: [
            "By spawning a new operating system thread for every incoming HTTP request",
            "Using a single-threaded Event Loop backed by libuv thread pool for async I/O tasks",
            "By halting execution until each database query finishes",
            "Using client-side Web Workers"
          ],
          correctAnswer: 1,
          explanation: "Node.js utilizes an event-driven, single-threaded architecture managed by libuv to handle thousands of concurrent connections efficiently."
        },
        {
          id: 2,
          question: "What is Express middleware in Node.js backend development?",
          options: [
            "Functions that have access to request (req) and response (res) objects and call next() to pass control",
            "Database drivers for MongoDB and MySQL",
            "Frontend React hooks for API calls",
            "Security hardware firewalls"
          ],
          correctAnswer: 0,
          explanation: "Express middleware functions process incoming requests sequentially, handling authentication, logging, CORS, and parsing."
        },
        {
          id: 3,
          question: "What is the main difference between Node.js Streams and Buffers?",
          options: [
            "Streams process data continuously in chunks; Buffers allocate fixed-size memory chunks for entire data payloads",
            "Buffers are faster for 10GB video streaming",
            "Streams work only with string primitive values",
            "There is no functional difference"
          ],
          correctAnswer: 0,
          explanation: "Streams allow reading and writing data piece-by-piece without loading entire large files into memory."
        },
        {
          id: 4,
          question: "Which core Node.js module is used to cluster processes across multi-core CPUs?",
          options: ["cluster", "http", "fs", "path"],
          correctAnswer: 0,
          explanation: "The cluster module enables spawning worker Node processes sharing the same server port to utilize all CPU cores."
        },
        {
          id: 5,
          question: "How should sensitive database credentials and API keys be stored in a Node.js project?",
          options: [
            "Hardcoded inside public git repository files",
            "Stored in environment variables (.env) loaded via process.env",
            "Written in index.html script tags",
            "Saved in browser cookies"
          ],
          correctAnswer: 1,
          explanation: "Environment variables keep sensitive secret keys isolated from codebase version control."
        }
      ],
      system: [
        {
          id: 1,
          question: "What does the CAP Theorem state for distributed database systems?",
          options: [
            "A system can simultaneously guarantee only 2 of 3 properties: Consistency, Availability, and Partition Tolerance",
            "All databases must scale vertically first",
            "CPU, Architecture, and Memory determine throughput",
            "Caching solves all database latency"
          ],
          correctAnswer: 0,
          explanation: "In the presence of network partitions, distributed systems must trade off between strict consistency and high availability."
        },
        {
          id: 2,
          question: "What is the difference between Horizontal Scaling (Scaling Out) and Vertical Scaling (Scaling Up)?",
          options: [
            "Horizontal scaling adds more machine nodes; Vertical scaling adds more RAM/CPU to an existing machine node",
            "Vertical scaling is always cheaper than horizontal scaling",
            "Horizontal scaling applies only to monolithic architectures",
            "There is no difference"
          ],
          correctAnswer: 0,
          explanation: "Scaling out distributes traffic across multiple server instances, whereas scaling up upgrades hardware specifications of a single server."
        },
        {
          id: 3,
          question: "What is the primary purpose of a Content Delivery Network (CDN)?",
          options: [
            "To serve static assets (images, CSS, JS) from edge server locations closest to end users for lower latency",
            "To execute complex SQL database joins",
            "To issue JWT user authentication tokens",
            "To encrypt server SSH keys"
          ],
          correctAnswer: 0,
          explanation: "CDNs cache static media near users globally, reducing server load and minimizing network latency."
        },
        {
          id: 4,
          question: "How does a Round Robin Load Balancer distribute network traffic?",
          options: [
            "Rotates incoming client requests sequentially across available server pool instances",
            "Sends all traffic to the largest database node",
            "Routes traffic based on client geographical IP address only",
            "Randomly drops 10% of incoming connections"
          ],
          correctAnswer: 0,
          explanation: "Round Robin sequentially passes each new incoming request to the next server in a cyclic list."
        },
        {
          id: 5,
          question: "What is Database Sharding in high-scale architectures?",
          options: [
            "Horizontally partitioning large database tables across multiple distinct server nodes based on a shard key",
            "Creating daily ZIP file backups",
            "Normalizing tables into 3NF format",
            "Encrypting password hashes"
          ],
          correctAnswer: 0,
          explanation: "Sharding breaks huge datasets into smaller, manageable database fragments distributed across separate servers."
        }
      ],
      algorithms: [
        {
          id: 1,
          question: "What is the average time complexity of searching an element in a balanced Binary Search Tree (BST)?",
          options: ["O(1)", "O(n)", "O(log n)", "O(n log n)"],
          correctAnswer: 2,
          explanation: "A balanced BST cuts the remaining search space in half with every comparison, yielding O(log n) time complexity."
        },
        {
          id: 2,
          question: "What is the main difference between a Stack and a Queue data structure?",
          options: [
            "Stack is LIFO (Last In First Out); Queue is FIFO (First In First Out)",
            "Queue is LIFO; Stack is FIFO",
            "Stack elements are stored in random memory locations; Queue elements are sorted",
            "There is no difference"
          ],
          correctAnswer: 0,
          explanation: "Stacks add and remove elements from the top (LIFO), whereas Queues enqueue at the back and dequeue from the front (FIFO)."
        },
        {
          id: 3,
          question: "What is the worst-case time complexity of QuickSort when a poor pivot is selected?",
          options: ["O(log n)", "O(n)", "O(n log n)", "O(n²)"],
          correctAnswer: 3,
          explanation: "If the pivot selected is consistently the smallest or largest element, QuickSort degrades to O(n²)."
        },
        {
          id: 4,
          question: "How does a Hash Table resolve key collision using Chaining?",
          options: [
            "Stores multiple colliding key-value pairs in a linked list at the same array index bucket",
            "Overwrites the previous value stored at that index",
            "Resizes the hash table array immediately",
            "Throws a runtime exception error"
          ],
          correctAnswer: 0,
          explanation: "Chaining maintains a linked list or chain at each bucket index to store multiple elements mapping to the same hash."
        },
        {
          id: 5,
          question: "Which algorithm is commonly used to find the shortest path between nodes in a weighted graph with non-negative edges?",
          options: ["Dijkstra's Algorithm", "Binary Search", "Depth-First Search (DFS)", "Bubble Sort"],
          correctAnswer: 0,
          explanation: "Dijkstra's algorithm uses a priority queue to iteratively determine the shortest path from a source node to all other graph vertices."
        }
      ],
      sql: [
        {
          id: 1,
          question: "What is the difference between INNER JOIN and LEFT JOIN in SQL queries?",
          options: [
            "INNER JOIN returns matching rows in both tables; LEFT JOIN returns all rows from the left table plus matching rows from the right",
            "LEFT JOIN returns only matching rows; INNER JOIN returns all rows",
            "INNER JOIN works only on numeric columns",
            "There is no difference"
          ],
          correctAnswer: 0,
          explanation: "LEFT JOIN preserves all records from the left table, filling unmatched right table columns with NULL values."
        },
        {
          id: 2,
          question: "What do the ACID properties stand for in relational database transactions?",
          options: [
            "Atomicity, Consistency, Isolation, Durability",
            "Authentication, Control, Indexing, Data",
            "Asynchronous, Concurrent, Isolated, Distributed",
            "Array, Column, Index, Directory"
          ],
          correctAnswer: 0,
          explanation: "ACID guarantees reliable processing of database transactions, ensuring data integrity across failures."
        },
        {
          id: 3,
          question: "What is the primary function of a Database Index (B-Tree)?",
          options: [
            "Speeds up SQL SELECT query data retrieval at the cost of additional storage and write overhead",
            "Encrypts confidential table columns",
            "Automatically deletes duplicate records",
            "Formats date values into UTC strings"
          ],
          correctAnswer: 0,
          explanation: "Indexes create structured search trees that allow the database engine to find rows without scanning the entire table."
        },
        {
          id: 4,
          question: "What is a Foreign Key in a database schema?",
          options: [
            "A column in one table that references the Primary Key of another table to enforce referential integrity",
            "An API key used for external database access",
            "A key used to decrypt database backups",
            "A temporary index created during JOIN queries"
          ],
          correctAnswer: 0,
          explanation: "Foreign keys establish relationship links between tables and prevent orphan records."
        },
        {
          id: 5,
          question: "What is Database Normalization (3NF)?",
          options: [
            "The process of structuring database tables to eliminate data redundancy and anomalies",
            "Converting SQL tables into JSON files",
            "Compressing table storage space on disk",
            "Running EXPLAIN ANALYZE on queries"
          ],
          correctAnswer: 0,
          explanation: "Third Normal Form (3NF) ensures fields depend directly on the primary key, avoiding redundant duplicate storage."
        }
      ],
      python: [
        {
          id: 1,
          question: "What is the Global Interpreter Lock (GIL) in Python?",
          options: [
            "A mutex lock that allows only one native thread to execute Python bytecode at a time in CPython",
            "A security module for encrypting Python packages",
            "A compiler optimization for list comprehensions",
            "A database connection pooler"
          ],
          correctAnswer: 0,
          explanation: "The GIL prevents multi-threaded CPython from executing bytecode on multiple CPU cores simultaneously."
        },
        {
          id: 2,
          question: "What is the difference between Supervised and Unsupervised Machine Learning?",
          options: [
            "Supervised learning trains on labeled data target outputs; Unsupervised learning finds hidden patterns in unlabeled data",
            "Unsupervised learning requires no training datasets",
            "Supervised learning is used only for image generation",
            "There is no difference"
          ],
          correctAnswer: 0,
          explanation: "Supervised models learn input-to-output mappings (classification/regression), while unsupervised models discover structural groupings (clustering)."
        },
        {
          id: 3,
          question: "In Machine Learning model training, what is Overfitting?",
          options: [
            "When a model performs exceptionally on training data but poorly on unseen test data due to memorizing noise",
            "When the model is too simple to learn underlying patterns",
            "When the training dataset has zero sample records",
            "When training completes in under 1 second"
          ],
          correctAnswer: 0,
          explanation: "Overfitting happens when a complex model fits training samples too tightly, failing to generalize to new data."
        },
        {
          id: 4,
          question: "What is a Python List Comprehension?",
          options: [
            "A concise syntax construct for constructing new lists from existing iterables: [x*2 for x in items]",
            "A built-in debugger tool",
            "A mechanism for importing external C libraries",
            "A type checking annotation"
          ],
          correctAnswer: 0,
          explanation: "List comprehensions offer a readable, fast Pythonic way to transform and filter list elements."
        },
        {
          id: 5,
          question: "Why is NumPy widely used for scientific computing and Machine Learning in Python?",
          options: [
            "Provides contiguous C-based N-dimensional arrays (ndarray) with vectorized mathematical operations",
            "Replaces HTML styling in web apps",
            "Automates git commit history",
            "Connects directly to REST endpoints"
          ],
          correctAnswer: 0,
          explanation: "NumPy arrays perform fast vectorized linear algebra math in C, bypassing Python loop execution overhead."
        }
      ],
      security: [
        {
          id: 1,
          question: "How do Parameterized Queries (Prepared Statements) prevent SQL Injection attacks?",
          options: [
            "By separating SQL code logic from user parameter data so input is never executed as raw command code",
            "By converting SQL queries into HTTPS requests",
            "By encrypting the database disk drive",
            "By restricting database user table access"
          ],
          correctAnswer: 0,
          explanation: "Prepared statements treat user inputs strictly as literal values, rendering SQL code injection impossible."
        },
        {
          id: 2,
          question: "What is Cross-Site Scripting (XSS) and how is it mitigated?",
          options: [
            "Injecting malicious client scripts into web pages; mitigated by sanitizing input and setting Content-Security-Policy (CSP) headers",
            "Stealing server SSH keys via terminal commands",
            "Flooding a web server with TCP SYN packets",
            "Intercepting unencrypted Wi-Fi traffic"
          ],
          correctAnswer: 0,
          explanation: "XSS occurs when untrusted user input is rendered in the DOM without sanitization, allowing arbitrary script execution."
        },
        {
          id: 3,
          question: "Why should user passwords always be stored as Salted Hashes (e.g. bcrypt/scrypt) rather than plain MD5?",
          options: [
            "Salting adds unique random bytes to prevent Rainbow Table attacks, and slow hash functions prevent brute-force cracking",
            "Salted hashes can be easily decrypted by admins",
            "MD5 uses too much server disk space",
            "Bcrypt automatically emails passwords to users"
          ],
          correctAnswer: 0,
          explanation: "Salted cryptographic hashes ensure identical passwords produce different hashes, protecting user credentials against pre-computed attacks."
        },
        {
          id: 4,
          question: "What is the purpose of Cross-Site Request Forgery (CSRF) tokens?",
          options: [
            "To verify that state-changing HTTP requests originate from the legitimate application user session, not an unauthorized third-party site",
            "To speed up CSS stylesheet loading",
            "To encrypt database connection strings",
            "To authenticate REST API route paths"
          ],
          correctAnswer: 0,
          explanation: "CSRF tokens ensure that submitted forms were explicitly generated by the user's current session on the trusted site."
        },
        {
          id: 5,
          question: "What does HTTPS (TLS/SSL) provide for web traffic between client browsers and servers?",
          options: [
            "End-to-end data encryption, server identity authentication, and payload integrity verification",
            "Faster JavaScript execution speeds",
            "Automated database index creation",
            "Unlimited free cloud storage"
          ],
          correctAnswer: 0,
          explanation: "TLS encrypts transport data, preventing eavesdropping, tampering, or man-in-the-middle packet interception."
        }
      ]
    };

    // Determine matching topic key
    const topicLower = topic.toLowerCase();
    let selectedBank = topicQuizBanks.react; // Default

    if (topicLower.includes('graphic') || topicLower.includes('visual')) selectedBank = topicQuizBanks.graphic;
    else if (topicLower.includes('ui') || topicLower.includes('ux') || topicLower.includes('prototype')) selectedBank = topicQuizBanks.ui;
    else if (topicLower.includes('node') || topicLower.includes('backend')) selectedBank = topicQuizBanks.node;
    else if (topicLower.includes('system') || topicLower.includes('cloud')) selectedBank = topicQuizBanks.system;
    else if (topicLower.includes('algorithm') || topicLower.includes('data structure')) selectedBank = topicQuizBanks.algorithms;
    else if (topicLower.includes('sql') || topicLower.includes('database')) selectedBank = topicQuizBanks.sql;
    else if (topicLower.includes('python') || topicLower.includes('machine learning')) selectedBank = topicQuizBanks.python;
    else if (topicLower.includes('security') || topicLower.includes('cyber')) selectedBank = topicQuizBanks.security;

    const randomizedFallback = randomizeQuizOptions(shuffleArray(selectedBank));
    res.json({ quiz: randomizedFallback, source: 'smart-fallback' });
  } catch (err) {
    console.error('Quiz generator error:', err);
    res.status(500).json({ error: 'Failed to generate quiz' });
  }
});

// 5. POST /api/ai/star/polish
router.post('/star/polish', async (req, res) => {
  try {
    const { situation, task, action, result } = req.body;

    if (!situation || !action) {
      return res.status(400).json({ error: 'Situation and Action are required' });
    }

    const prompt = `Polish the following STAR method behavioral story into an executive interview narrative:
    Situation: ${situation}
    Task: ${task || 'N/A'}
    Action: ${action}
    Result: ${result || 'N/A'}
    
    Return ONLY a JSON object:
    {
      "polishedStory": "Continuous cohesive narrative paragraph",
      "keyTakeaway": "Core competency highlighted",
      "tips": ["Tip 1", "Tip 2"]
    }`;

    const aiText = await callGeminiApi(prompt, req.user.apiKey);
    const parsed = cleanAndParseJSON(aiText);

    if (parsed && parsed.polishedStory) {
      return res.json({ result: parsed, source: 'gemini-ai' });
    }

    // STAR Polish Fallback
    const polishedStory = `In my previous role, ${situation}. My objective was to ${task || 'resolve the bottleneck efficiently'}. To achieve this, I ${action}. As a result, ${result || 'we successfully delivered the initiative on time with positive stakeholder feedback'}.`;

    const resultObj = {
      polishedStory,
      keyTakeaway: "Demonstrates proactive problem-solving, technical ownership, and measurable business impact.",
      tips: [
        "Emphasize exact numerical metrics in your Result section.",
        "Highlight your individual contributions distinct from team efforts."
      ]
    };

    res.json({ result: resultObj, source: 'smart-fallback' });
  } catch (err) {
    console.error('STAR polish error:', err);
    res.status(500).json({ error: 'Failed to polish STAR story' });
  }
});

export default router;
