// API Configuration
const API_CONFIG = {
  baseUrl: localStorage.getItem('apiBaseUrl') || 'http://127.0.0.1:5000',
  analysisPath: '/api/analysis'
};

// State management
const state = {
  isSubmitting: false,
  selectedFile: null
};

const LOCAL_ANALYSIS_PREFIX = 'localAnalysis:';

// DOM Elements
const resumeFileInput = document.getElementById('resumeFile');
const githubInput = document.getElementById('githubUrl');
const linkedinInput = document.getElementById('linkedinUrl');
const jobDescInput = document.getElementById('jobDescription');
const analyzeBtn = document.getElementById('analyzeButton');
const statusBox = document.getElementById('statusMessage');
const fileNameDisplay = document.getElementById('fileName');

// Initialize
document.addEventListener('DOMContentLoaded', () => {
  setupEventListeners();
  // Don't check auth on page load - user should be able to see the form
  // Auth will be checked when submitting the form
});

// Setup event listeners
function setupEventListeners() {
  if (resumeFileInput) {
    resumeFileInput.addEventListener('change', handleFileSelect);
  }
  if (analyzeBtn) {
    analyzeBtn.addEventListener('click', handleAnalyze);
  }
  
  // Back button handler
  const backBtn = document.getElementById('backBtn');
  if (backBtn) {
    backBtn.addEventListener('click', () => {
      window.location.href = 'interview-choice.html';
    });
  }
}

// Handle file selection
function handleFileSelect(event) {
  const file = event.target.files[0];
  
  if (!file) {
    state.selectedFile = null;
    if (fileNameDisplay) {
      fileNameDisplay.textContent = 'No file selected';
    }
    return;
  }
  
  // Validate file type
  const allowedTypes = ['application/pdf', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'application/msword'];
  
  if (!allowedTypes.includes(file.type)) {
    showStatus('Only PDF and Word documents are supported', 'error');
    resumeFileInput.value = '';
    state.selectedFile = null;
    return;
  }
  
  // Validate file size (5MB)
  if (file.size > 5242880) {
    showStatus('File size must be less than 5MB', 'error');
    resumeFileInput.value = '';
    state.selectedFile = null;
    return;
  }
  
  state.selectedFile = file;
  if (fileNameDisplay) {
    fileNameDisplay.textContent = `✓ ${file.name} (${(file.size / 1024).toFixed(2)} KB)`;
  }
  showStatus('');
}

// Handle analyze button click
async function handleAnalyze() {
  if (state.isSubmitting) {
    return;
  }
  
  // Validate inputs
  if (!state.selectedFile) {
    showStatus('Please select a resume file', 'error');
    return;
  }
  
  const githubUrl = githubInput?.value.trim() || '';
  const linkedinUrl = linkedinInput?.value.trim() || '';
  const jobDescription = jobDescInput?.value.trim() || '';
  
  // Validate GitHub URL if provided
  if (githubUrl && !isValidGitHubUrl(githubUrl)) {
    showStatus('Invalid GitHub URL format', 'error');
    return;
  }
  
  // Validate LinkedIn URL if provided
  if (linkedinUrl && !isValidLinkedInUrl(linkedinUrl)) {
    showStatus('Invalid LinkedIn URL format', 'error');
    return;
  }
  
  await submitAnalysis(githubUrl, linkedinUrl, jobDescription);
}

// Validate GitHub URL
function isValidGitHubUrl(url) {
  return /^https?:\/\/(www\.)?github\.com\/[a-zA-Z0-9-]+\/?$/.test(url);
}

// Validate LinkedIn URL
function isValidLinkedInUrl(url) {
  return /^https?:\/\/(www\.)?linkedin\.com\/in\/[a-zA-Z0-9-]+\/?$/.test(url);
}

// Submit analysis
async function submitAnalysis(githubUrl, linkedinUrl, jobDescription) {
  setLoading(true);
  showStatus('');
  
  try {
    const token = localStorage.getItem('authToken');
    
    // Create FormData
    const formData = new FormData();
    formData.append('resume', state.selectedFile);
    if (githubUrl) formData.append('githubUrl', githubUrl);
    if (linkedinUrl) formData.append('linkedinUrl', linkedinUrl);
    if (jobDescription) formData.append('jobDescription', jobDescription);

    const analysisUrl = token
      ? `${API_CONFIG.baseUrl}${API_CONFIG.analysisPath}`
      : `${API_CONFIG.baseUrl}${API_CONFIG.analysisPath}/public`;

    const headers = token
      ? { 'Authorization': `Bearer ${token}` }
      : {};
    
    // Send request
    const response = await fetch(
      analysisUrl,
      {
        method: 'POST',
        headers,
        body: formData
      }
    );
    
    const result = await response.json();
    
    if (!response.ok) {
      showStatus(result.message || 'Analysis failed', 'error');
      return;
    }
    
    if (result.success && result.data?.analysisId) {
      showStatus('✓ Analysis started! Redirecting to results...', 'success');
      
      // Store analysis ID
      const analysisId = result.data.analysisId;
      localStorage.setItem('currentAnalysisId', analysisId);
      sessionStorage.setItem('lastAnalysisSource', token ? 'private' : 'public');
      
      window.location.assign(`analysis-dashboard.html?id=${encodeURIComponent(analysisId)}`);
    } else {
      showStatus(result.message || 'Analysis creation failed', 'error');
    }
  } catch (error) {
    console.error('Error:', error);
    showStatus(error.message || 'An error occurred during analysis', 'error');
  } finally {
    setLoading(false);
  }
}

function createLocalAnalysis(githubUrl, linkedinUrl, jobDescription) {
  const analysisId = `local-${Date.now()}`;
  const resumeName = state.selectedFile?.name || 'Uploaded resume';
  const resumeSkills = inferSkillsFromText(`${resumeName} ${jobDescription}`);
  const matchedSkills = resumeSkills.length ? resumeSkills.slice(0, 8) : ['Communication', 'Problem Solving', 'Project Work'];
  const missingSkills = ['System Design', 'Deployment', 'Testing'];

  return {
    _id: analysisId,
    analysisStatus: 'completed',
    resumeFile: resumeName,
    githubUrl,
    linkedinUrl,
    jobDescription,
    resumeData: {
      name: 'Candidate',
      email: '',
      phone: '',
      skills: resumeSkills,
      education: [],
      experience: [],
      projects: [],
      certifications: []
    },
    githubData: githubUrl ? {
      profile: {
        username: extractLastPathPart(githubUrl),
        profileUrl: githubUrl,
        publicRepos: 0,
        followers: 0
      },
      repositories: [],
      languages: {},
      topProjects: []
    } : null,
    linkedinData: linkedinUrl ? {
      profile: {
        name: 'Candidate',
        headline: 'LinkedIn profile connected',
        profileUrl: linkedinUrl
      },
      experience: [],
      education: [],
      skills: []
    } : null,
    atsScore: 78,
    matchPercentage: jobDescription ? 74 : 68,
    matchedSkills,
    missingSkills,
    strengths: [
      'Resume uploaded successfully',
      'Profile is ready for interview preparation',
      githubUrl ? 'GitHub profile connected for project review' : 'Core resume signals are available',
      linkedinUrl ? 'LinkedIn profile connected for professional context' : 'Career profile can be improved with LinkedIn data'
    ],
    weaknesses: [
      'Live AI parsing requires backend login and API keys',
      'Add measurable project outcomes for stronger ATS scoring',
      'Include role-specific keywords from the target job description'
    ],
    recommendations: [
      'Add quantified impact to your strongest projects',
      'Keep technical skills grouped by category',
      'Prepare examples for architecture, debugging, and teamwork questions',
      'Connect GitHub and LinkedIn for deeper profile analysis'
    ],
    learningRoadmap: [
      { skill: 'System Design', priority: 'high', timeline: '3 weeks', resources: ['System design basics', 'API design practice'] },
      { skill: 'Testing', priority: 'medium', timeline: '2 weeks', resources: ['Unit testing', 'Integration testing'] },
      { skill: 'Deployment', priority: 'medium', timeline: '2 weeks', resources: ['Cloud deployment', 'CI/CD fundamentals'] }
    ],
    technicalQuestions: [
      { question: 'Explain a project from your resume and the technical decisions behind it.', answer: '', difficulty: 'medium', topic: 'Projects' },
      { question: 'How would you design authentication for a web application?', answer: '', difficulty: 'medium', topic: 'Backend' },
      { question: 'How do you debug a production issue?', answer: '', difficulty: 'medium', topic: 'Problem Solving' }
    ],
    hrQuestions: [
      { question: 'Tell me about yourself.', answer: '' },
      { question: 'Why are you interested in this role?', answer: '' }
    ],
    projectQuestions: [
      { question: 'Which project best represents your current skill level?', answer: '' },
      { question: 'What would you improve if you rebuilt your latest project?', answer: '' }
    ],
    createdAt: new Date().toISOString()
  };
}

function saveLocalAnalysis(analysis) {
  localStorage.setItem('currentAnalysisId', analysis._id);
  localStorage.setItem(`${LOCAL_ANALYSIS_PREFIX}${analysis._id}`, JSON.stringify(analysis));
}

function inferSkillsFromText(text) {
  const commonSkills = [
    'JavaScript', 'TypeScript', 'Python', 'Java', 'React', 'Node.js', 'Express',
    'MongoDB', 'PostgreSQL', 'HTML', 'CSS', 'Git', 'GitHub', 'Docker',
    'AWS', 'Machine Learning', 'Data Science', 'REST APIs'
  ];
  const lowerText = text.toLowerCase();
  return commonSkills.filter((skill) => lowerText.includes(skill.toLowerCase()));
}

function extractLastPathPart(url) {
  try {
    const parsed = new URL(url);
    return parsed.pathname.split('/').filter(Boolean).pop() || 'profile';
  } catch (error) {
    return 'profile';
  }
}

// Show status message
function showStatus(message, type = '') {
  if (!statusBox) return;
  
  statusBox.textContent = message;
  statusBox.hidden = !message;
  statusBox.classList.remove('status--success', 'status--error');
  
  if (type) {
    statusBox.classList.add(`status--${type}`);
  }
}

// Set loading state
function setLoading(isLoading) {
  state.isSubmitting = isLoading;
  
  if (analyzeBtn) {
    analyzeBtn.disabled = isLoading;
    analyzeBtn.textContent = isLoading ? 'Analyzing...' : 'Analyze Resume';
    analyzeBtn.style.opacity = isLoading ? '0.6' : '1';
  }
}

// Export functions for testing
window.handleAnalyze = handleAnalyze;
window.state = state;
