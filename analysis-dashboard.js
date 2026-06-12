// API Configuration
const API_CONFIG = {
  baseUrl: localStorage.getItem('apiBaseUrl') || 'http://127.0.0.1:5000',
  analysisPath: '/api/analysis'
};

const LOCAL_ANALYSIS_PREFIX = 'localAnalysis:';

// Get analysis ID from URL parameter
function getAnalysisId() {
  const params = new URLSearchParams(window.location.search);
  return params.get('id') || localStorage.getItem('currentAnalysisId');
}

// Initialize
document.addEventListener('DOMContentLoaded', () => {
  const analysisId = getAnalysisId();
  
  if (!analysisId) {
    showError('No analysis ID provided. <a href="interview-choice.html">Upload a resume</a> to get started.');
    return;
  }

  const localAnalysis = getLocalAnalysis(analysisId);
  if (localAnalysis) {
    displayAnalysis(localAnalysis);
    return;
  }
  
  fetchAndDisplayAnalysis(analysisId);
});

// Check if user is authenticated
function checkAuthToken() {
  const token = localStorage.getItem('authToken');
  if (!token) {
    redirectToLogin();
  }
}

// Redirect to login if no token
function redirectToLogin() {
  window.location.href = 'login.html';
}

function getLocalAnalysis(analysisId) {
  const stored = localStorage.getItem(`${LOCAL_ANALYSIS_PREFIX}${analysisId}`);
  if (!stored) return null;

  try {
    return JSON.parse(stored);
  } catch (error) {
    localStorage.removeItem(`${LOCAL_ANALYSIS_PREFIX}${analysisId}`);
    return null;
  }
}

// Fetch analysis from backend
async function fetchAndDisplayAnalysis(analysisId) {
  try {
    const token = localStorage.getItem('authToken');
    const isPublicAnalysis = analysisId.startsWith('public-') || sessionStorage.getItem('lastAnalysisSource') === 'public';

    const analysisUrl = token && !isPublicAnalysis
      ? `${API_CONFIG.baseUrl}${API_CONFIG.analysisPath}/${analysisId}`
      : `${API_CONFIG.baseUrl}${API_CONFIG.analysisPath}/public/${analysisId}`;

    const headers = token && !isPublicAnalysis
      ? {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      : {
          'Content-Type': 'application/json'
        };
    
    // Fetch analysis
    const response = await fetch(
      analysisUrl,
      {
        method: 'GET',
        headers
      }
    );
    
    if (!response.ok) {
      if (response.status === 404) {
        showError('Analysis not found');
      } else if (response.status === 403) {
        showError('Unauthorized access to this analysis');
      } else {
        showError('Failed to fetch analysis');
      }
      return;
    }
    
    const result = await response.json();
    
    if (result.success && result.data) {
      displayAnalysis(result.data);
    } else {
      showError(result.message || 'Failed to load analysis');
    }
  } catch (error) {
    console.error('Error:', error);
    showError(error.message || 'An error occurred while fetching analysis');
  }
}

// Display analysis data on the page
function displayAnalysis(analysis) {
  // Check if analysis is still processing
  if (analysis.analysisStatus === 'pending') {
    showLoadingState();
    // Poll for updates every 3 seconds
    const pollInterval = setInterval(() => {
      fetchAndDisplayAnalysis(analysis._id);
      clearInterval(pollInterval);
    }, 3000);
    return;
  }

  localStorage.setItem('currentAnalysisId', analysis._id);
  
  if (analysis.analysisStatus === 'failed') {
    showError(`Analysis failed: ${analysis.errorMessage}`);
    return;
  }

  updateProfileSummary(analysis);
  
  // Display ATS Score
  const atsScoreElement = document.getElementById('atsScore');
  if (atsScoreElement && analysis.atsScore !== undefined) {
    atsScoreElement.textContent = analysis.atsScore;
    updateScoreColor(atsScoreElement, analysis.atsScore);
  }
  
  // Display Match Percentage
  const matchPercentElement = document.getElementById('matchPercent');
  if (matchPercentElement && analysis.matchPercentage !== undefined) {
    matchPercentElement.textContent = analysis.matchPercentage + '%';
    updateScoreColor(matchPercentElement, analysis.matchPercentage);
  }

  const matchedCountElement = document.getElementById('matchedCount');
  if (matchedCountElement) {
    matchedCountElement.textContent = analysis.matchedSkills?.length || 0;
  }

  const missingCountElement = document.getElementById('missingCount');
  if (missingCountElement) {
    missingCountElement.textContent = analysis.missingSkills?.length || 0;
  }
  
  // Display matched skills
  const matchedSkillsContainer = document.getElementById('matchedSkills');
  if (matchedSkillsContainer && analysis.matchedSkills) {
    matchedSkillsContainer.innerHTML = analysis.matchedSkills
      .slice(0, 8)
      .map(skill => `<span class="skill-badge skill-badge--matched">${skill}</span>`)
      .join('');
  }
  
  // Display missing skills
  const missingSkillsContainer = document.getElementById('missingSkills');
  if (missingSkillsContainer && analysis.missingSkills) {
    missingSkillsContainer.innerHTML = analysis.missingSkills
      .slice(0, 5)
      .map(skill => `<span class="skill-badge skill-badge--missing">${skill}</span>`)
      .join('');
  }
  
  // Display strengths
  const strengthsContainer = document.getElementById('strengths');
  if (strengthsContainer && analysis.strengths) {
    strengthsContainer.innerHTML = analysis.strengths
      .slice(0, 6)
      .map(strength => `<li>${strength}</li>`)
      .join('');
  }
  
  // Display weaknesses
  const weaknessesContainer = document.getElementById('weaknesses');
  if (weaknessesContainer && analysis.weaknesses) {
    weaknessesContainer.innerHTML = analysis.weaknesses
      .slice(0, 6)
      .map(weakness => `<li>${weakness}</li>`)
      .join('');
  }
  
  // Display recommendations
  const recommendationsContainer = document.getElementById('recommendations');
  if (recommendationsContainer && analysis.recommendations) {
    recommendationsContainer.innerHTML = analysis.recommendations
      .slice(0, 8)
      .map(rec => `<div class="recommendation-item">${rec}</div>`)
      .join('');
  }
  
  // Display learning roadmap
  const roadmapContainer = document.getElementById('roadmap');
  if (roadmapContainer && analysis.learningRoadmap) {
    roadmapContainer.innerHTML = analysis.learningRoadmap
      .slice(0, 5)
      .map(item => `
        <div class="roadmap-item">
          <div class="roadmap-skill">${item.skill}</div>
          <div class="roadmap-priority priority-${item.priority}">${item.priority.toUpperCase()}</div>
          <div class="roadmap-timeline">${item.timeline}</div>
        </div>
      `)
      .join('');
  }
  
  // Display technical questions
  const technicalQuestionsContainer = document.getElementById('technicalQuestions');
  if (technicalQuestionsContainer && analysis.technicalQuestions) {
    technicalQuestionsContainer.innerHTML = analysis.technicalQuestions
      .slice(0, 10)
      .map((q, idx) => `
        <div class="question-item">
          <div class="question-number">Q${idx + 1}</div>
          <div class="question-details">
            <p class="question-text">${q.question}</p>
            <p class="question-topic">${q.topic || 'General'} • ${q.difficulty || 'Medium'}</p>
          </div>
        </div>
      `)
      .join('');
  }

  const hrQuestionsContainer = document.getElementById('hrQuestions');
  if (hrQuestionsContainer && analysis.hrQuestions) {
    hrQuestionsContainer.innerHTML = renderQuestionGroup('HR Questions', analysis.hrQuestions.slice(0, 5));
  }

  const projectQuestionsContainer = document.getElementById('projectQuestions');
  if (projectQuestionsContainer && analysis.projectQuestions) {
    projectQuestionsContainer.innerHTML = renderQuestionGroup('Project Questions', analysis.projectQuestions.slice(0, 5));
  }
  
  // Hide loading state
  const loadingElement = document.getElementById('loadingState');
  if (loadingElement) {
    loadingElement.style.display = 'none';
  }
}

function updateProfileSummary(analysis) {
  const resumeData = analysis.resumeData || {};
  const candidateName = resumeData.name && resumeData.name !== 'Unknown' ? resumeData.name : 'Candidate Profile';
  const resumeFileName = analysis.resumeFile ? analysis.resumeFile.split(/[\\/]/).pop() : 'Uploaded resume';
  const githubUser = getProfileHandle(analysis.githubUrl);
  const linkedinUser = getProfileHandle(analysis.linkedinUrl);

  setText('profileNameBadge', candidateName);
  setText('resumeValue', resumeFileName);
  setText('resumeSummary', [
    resumeData.email ? `Email: ${resumeData.email}` : '',
    resumeData.phone ? `Phone: ${resumeData.phone}` : '',
    resumeData.skills?.length ? `${resumeData.skills.length} skills parsed` : 'Resume parsed successfully'
  ].filter(Boolean).join(' • '));

  setText('githubValue', githubUser || 'Not provided');
  setText('githubSummary', analysis.githubData
    ? `${analysis.githubData.profile?.publicRepos || 0} public repos, ${analysis.githubData.profile?.followers || 0} followers`
    : 'GitHub profile was not provided for this scan.');

  setText('linkedinValue', linkedinUser || 'Not provided');
  setText('linkedinSummary', analysis.linkedinData?.profile?.headline || 'LinkedIn profile was not provided for this scan.');

  setText('githubStatus', analysis.githubUrl ? 'GitHub scanned' : 'GitHub not provided');
  setText('linkedinStatus', analysis.linkedinUrl ? 'LinkedIn scanned' : 'LinkedIn not provided');
  setText('resumeStatus', analysis.analysisStatus === 'completed' ? 'Resume parsed' : 'Resume processing');

  updateMetric('resumeScore', 'resumeBar', analysis.atsScore ?? 0);
  updateMetric('githubScore', 'githubBar', analysis.githubUrl ? 70 : 0);
  updateMetric('linkedinScore', 'linkedinBar', analysis.linkedinUrl ? 70 : 0);
}

function setText(id, value) {
  const element = document.getElementById(id);
  if (element) {
    element.textContent = value;
  }
}

function updateMetric(labelId, barId, value) {
  const normalized = Math.max(0, Math.min(100, Number(value) || 0));
  setText(labelId, `${normalized}%`);
  const bar = document.getElementById(barId);
  if (bar) {
    bar.style.width = `${normalized}%`;
  }
}

function getProfileHandle(url) {
  if (!url) return '';

  try {
    return new URL(url).pathname.split('/').filter(Boolean).pop() || url;
  } catch (error) {
    return url;
  }
}

function renderQuestionGroup(title, questions) {
  if (!questions.length) return '';

  return `
    <div class="question-group">
      <h3 class="question-group__title">${title}</h3>
      ${questions.map((q, idx) => `
        <div class="question-item">
          <div class="question-number">Q${idx + 1}</div>
          <div class="question-details">
            <p class="question-text">${q.question}</p>
          </div>
        </div>
      `).join('')}
    </div>
  `;
}

// Update score color based on value
function updateScoreColor(element, score) {
  element.classList.remove('score-low', 'score-medium', 'score-high');
  
  if (score >= 80) {
    element.classList.add('score-high');
  } else if (score >= 60) {
    element.classList.add('score-medium');
  } else {
    element.classList.add('score-low');
  }
}

// Show loading state
function showLoadingState() {
  const loadingElement = document.getElementById('loadingState');
  if (loadingElement) {
    loadingElement.style.display = 'flex';
  }
}

// Show error message
function showError(message) {
  const errorContainer = document.getElementById('errorContainer');
  if (errorContainer) {
    errorContainer.innerHTML = `
      <div style="padding: 20px; background: rgba(239, 68, 68, 0.1); border: 1px solid rgba(239, 68, 68, 0.3); border-radius: 12px; color: #fecaca;">
        <p style="margin: 0;">⚠️ ${message}</p>
      </div>
    `;
    errorContainer.style.display = 'block';
  }
}

// Add CSS dynamically for skill badges and other elements
const style = document.createElement('style');
style.textContent = `
  .skill-badge {
    display: inline-block;
    padding: 6px 12px;
    border-radius: 12px;
    font-size: 12px;
    font-weight: 700;
    margin: 4px 4px 4px 0;
  }
  
  .skill-badge--matched {
    background: rgba(34, 197, 94, 0.12);
    border: 1px solid rgba(34, 197, 94, 0.3);
    color: #c7f9d5;
  }
  
  .skill-badge--missing {
    background: rgba(239, 68, 68, 0.12);
    border: 1px solid rgba(239, 68, 68, 0.3);
    color: #fecaca;
  }
  
  .score-high {
    color: #22c55e !important;
  }
  
  .score-medium {
    color: #f59e0b !important;
  }
  
  .score-low {
    color: #ef4444 !important;
  }
  
  .recommendation-item {
    padding: 12px;
    background: rgba(77, 163, 255, 0.08);
    border-left: 3px solid rgba(77, 163, 255, 0.5);
    border-radius: 6px;
    margin-bottom: 8px;
    font-size: 13px;
    line-height: 1.6;
  }
  
  .roadmap-item {
    display: grid;
    grid-template-columns: 1fr 100px 100px;
    gap: 12px;
    padding: 12px;
    border: 1px solid rgba(255, 255, 255, 0.08);
    border-radius: 8px;
    margin-bottom: 8px;
    align-items: center;
  }
  
  .roadmap-skill {
    font-weight: 700;
    color: #cbd5e1;
  }
  
  .roadmap-priority {
    padding: 4px 8px;
    border-radius: 6px;
    font-size: 11px;
    font-weight: 700;
    text-align: center;
  }
  
  .priority-high {
    background: rgba(239, 68, 68, 0.12);
    color: #fecaca;
  }
  
  .priority-medium {
    background: rgba(245, 158, 11, 0.12);
    color: #fbbf24;
  }
  
  .priority-low {
    background: rgba(34, 197, 94, 0.12);
    color: #c7f9d5;
  }
  
  .roadmap-timeline {
    font-size: 12px;
    color: #94a3b8;
  }
  
  .question-item {
    display: flex;
    gap: 12px;
    padding: 12px;
    border: 1px solid rgba(255, 255, 255, 0.08);
    border-radius: 8px;
    margin-bottom: 8px;
  }
  
  .question-number {
    flex: 0 0 40px;
    height: 40px;
    display: grid;
    place-items: center;
    background: rgba(77, 163, 255, 0.12);
    border-radius: 8px;
    font-weight: 800;
    color: #d7ebff;
    font-size: 12px;
  }
  
  .question-details {
    flex: 1;
  }
  
  .question-text {
    margin: 0 0 4px;
    font-weight: 600;
    color: #cbd5e1;
    line-height: 1.5;
  }
  
  .question-topic {
    margin: 0;
    font-size: 11px;
    color: #94a3b8;
  }

  .question-group {
    display: grid;
    gap: 8px;
    margin-top: 12px;
  }

  .question-group__title {
    margin: 0 0 4px;
    font-size: 13px;
    color: #d7ebff;
    text-transform: uppercase;
    letter-spacing: 0.08em;
  }
`;
document.head.appendChild(style);

// Export functions
window.displayAnalysis = displayAnalysis;
window.fetchAndDisplayAnalysis = fetchAndDisplayAnalysis;
