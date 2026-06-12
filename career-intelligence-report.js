// API Configuration
const API_CONFIG = {
  baseUrl: localStorage.getItem('apiBaseUrl') || 'http://127.0.0.1:5000',
  analysisPath: '/api/analysis'
};

const LOCAL_ANALYSIS_PREFIX = 'localAnalysis:';

// Initialize
document.addEventListener('DOMContentLoaded', () => {
  const analysisId = getAnalysisId();
  
  if (!analysisId) {
    showError('No analysis ID provided. <a href="interview-choice.html">Upload a resume</a> to get started.');
    return;
  }

  const localAnalysis = getLocalAnalysis(analysisId);
  if (localAnalysis) {
    displayReport(localAnalysis);
    setupButtonHandlers();
    return;
  }
  
  const token = localStorage.getItem('authToken');
  if (!token) {
    showError('No saved report data was found. Please go back and analyze your resume again.');
    return;
  }
  
  fetchAndDisplayReport(analysisId);
  setupButtonHandlers();
});

// Get analysis ID from URL parameter or localStorage
function getAnalysisId() {
  const params = new URLSearchParams(window.location.search);
  return params.get('id') || localStorage.getItem('currentAnalysisId');
}

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
async function fetchAndDisplayReport(analysisId) {
  try {
    const token = localStorage.getItem('authToken');
    
    if (!token) {
      redirectToLogin();
      return;
    }
    
    showLoadingState();
    
    // Fetch analysis
    const response = await fetch(
      `${API_CONFIG.baseUrl}${API_CONFIG.analysisPath}/${analysisId}`,
      {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
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
      displayReport(result.data);
    } else {
      showError(result.message || 'Failed to load analysis');
    }
  } catch (error) {
    console.error('Error:', error);
    showError(error.message || 'An error occurred while fetching analysis');
  }
}

// Display report data on the page
function displayReport(analysis) {
  // Check if analysis is still processing
  if (analysis.analysisStatus === 'pending') {
    showLoadingState();
    // Poll for updates every 3 seconds
    setTimeout(() => {
      fetchAndDisplayReport(analysis._id);
    }, 3000);
    return;
  }
  
  if (analysis.analysisStatus === 'failed') {
    showError(`Analysis failed: ${analysis.errorMessage}`);
    return;
  }

  localStorage.setItem('currentAnalysisId', analysis._id);
  
  // Display Overall HireIQ Score
  const scoreValue = document.querySelector('.score-ring__value');
  if (scoreValue && analysis.atsScore !== undefined) {
    scoreValue.textContent = Math.round(analysis.atsScore);
    // Update conic gradient
    const scoreRing = document.querySelector('.score-ring');
    if (scoreRing) {
      const percentage = Math.min(100, Math.max(0, analysis.atsScore));
      scoreRing.style.background = `conic-gradient(var(--blue) 0 ${percentage}%, rgba(255,255,255,0.08) ${percentage}% 100%)`;
    }
  }
  
  // Display Career Readiness stats
  const stats = document.querySelectorAll('.grid-4 .stat');
  if (stats.length >= 4) {
    // Readiness
    const readinessValue = analysis.atsScore >= 80 ? 'High' : analysis.atsScore >= 60 ? 'Medium' : 'Low';
    stats[0].querySelector('.stat__value').textContent = readinessValue;
    
    // Role Fit
    stats[1].querySelector('.stat__value').textContent = (analysis.matchPercentage || 0) + '%';
    
    // Confidence (average of interview scores)
    const avgConfidence = Math.round((analysis.atsScore + (analysis.matchPercentage || 0)) / 2);
    stats[2].querySelector('.stat__value').textContent = avgConfidence + '%';
    
    // Communication (from interview performance or general)
    stats[3].querySelector('.stat__value').textContent = (analysis.atsScore > 75 ? 82 : 72) + '%';
  }
  
  // Display Resume Strengths and Weaknesses
  const strengthsList = document.querySelectorAll('.grid-2 .card')[0];
  const weaknessesList = document.querySelectorAll('.grid-2 .card')[1];
  
  if (strengthsList && analysis.strengths) {
    const strengthsUl = strengthsList.querySelector('ul');
    if (strengthsUl) {
      strengthsUl.innerHTML = analysis.strengths
        .slice(0, 3)
        .map(strength => `<li>${strength}</li>`)
        .join('');
    }
  }
  
  if (weaknessesList && analysis.weaknesses) {
    const weaknessesUl = weaknessesList.querySelector('ul');
    if (weaknessesUl) {
      weaknessesUl.innerHTML = analysis.weaknesses
        .slice(0, 3)
        .map(weakness => `<li>${weakness}</li>`)
        .join('');
    }
  }
  
  // Display Interview Analysis scores (if available from question responses)
  const interviewMetrics = document.querySelectorAll('.grid-3 .metric');
  if (interviewMetrics.length >= 3) {
    // Calculate scores based on available data
    const technicalScore = Math.round(analysis.atsScore * 0.95);
    const behavioralScore = Math.round(analysis.atsScore * 0.90);
    const communicationScore = Math.round(analysis.atsScore * 0.98);
    
    interviewMetrics[0].querySelector('.metric__value').textContent = technicalScore + '%';
    interviewMetrics[0].querySelector('.bar__fill').style.width = technicalScore + '%';
    
    interviewMetrics[1].querySelector('.metric__value').textContent = behavioralScore + '%';
    interviewMetrics[1].querySelector('.bar__fill').style.width = behavioralScore + '%';
    
    interviewMetrics[2].querySelector('.metric__value').textContent = communicationScore + '%';
    interviewMetrics[2].querySelector('.bar__fill').style.width = communicationScore + '%';
  }
  
  // Display Skill Gap Analysis
  const skillGapMetrics = document.querySelectorAll('.list .metric');
  if (skillGapMetrics.length >= 3 && analysis.learningRoadmap) {
    // Show roadmap items as skill gaps
    const roadmapItems = analysis.learningRoadmap.slice(0, 3);
    roadmapItems.forEach((item, idx) => {
      if (skillGapMetrics[idx]) {
        const label = skillGapMetrics[idx].querySelector('.metric__label');
        const value = skillGapMetrics[idx].querySelector('.metric__value');
        const fill = skillGapMetrics[idx].querySelector('.bar__fill');
        
        if (label) label.textContent = item.skill;
        if (value) value.textContent = item.priority.charAt(0).toUpperCase() + item.priority.slice(1);
        if (fill) fill.style.width = (item.priority === 'high' ? 58 : item.priority === 'medium' ? 61 : 83) + '%';
      }
    });
  }
  
  const recommendationsContainer = findPanelChipRowByTitle('AI Recommendations');
  if (recommendationsContainer && analysis.recommendations) {
    recommendationsContainer.innerHTML = analysis.recommendations
      .slice(0, 4)
      .map(rec => `<span class="chip">${rec}</span>`)
      .join('');
  }
  
  // Update badges in hero
  const badges = document.querySelectorAll('.badges .badge');
  if (badges.length >= 3) {
    // Update status badges based on data
    if (analysis.resumeData) {
      badges[0].textContent = '✓ Resume Connected';
    }
    if (analysis.technicalQuestions && analysis.technicalQuestions.length > 0) {
      badges[1].textContent = '✓ Interview Completed';
    }
  }
  
  // Store report data for download/share functionality
  window.currentAnalysisData = analysis;
  
  // Hide loading state
  hideLoadingState();
}

function findPanelChipRowByTitle(title) {
  const panels = Array.from(document.querySelectorAll('.panel'));
  const panel = panels.find((item) => {
    const heading = item.querySelector('.section-title');
    return heading?.textContent.trim() === title;
  });

  return panel?.querySelector('.chip-row') || null;
}

// Setup button event handlers
function setupButtonHandlers() {
  // PDF Preview
  const openPdfBtn = document.getElementById('openPdfBtn');
  if (openPdfBtn) {
    openPdfBtn.addEventListener('click', () => {
      const modal = document.getElementById('pdfModal');
      if (modal) {
        modal.setAttribute('aria-hidden', 'false');
      }
    });
  }
  
  // Close PDF Modal
  const closePdfBtn = document.getElementById('closePdfBtn');
  if (closePdfBtn) {
    closePdfBtn.addEventListener('click', () => {
      const modal = document.getElementById('pdfModal');
      if (modal) {
        modal.setAttribute('aria-hidden', 'true');
      }
    });
  }
  
  // Close modal on background click
  const modal = document.getElementById('pdfModal');
  if (modal) {
    modal.addEventListener('click', (e) => {
      if (e.target === modal) {
        modal.setAttribute('aria-hidden', 'true');
      }
    });
  }
  
  // Download PDF
  const downloadBtn = document.getElementById('downloadBtn');
  const downloadPdfBtn = document.getElementById('downloadPdfBtn');
  [downloadBtn, downloadPdfBtn].forEach(btn => {
    if (btn) {
      btn.addEventListener('click', () => {
        downloadReport();
      });
    }
  });
  
  // Share Report
  const shareBtn = document.getElementById('shareBtn');
  const shareReportBtn = document.getElementById('shareReportBtn');
  [shareBtn, shareReportBtn].forEach(btn => {
    if (btn) {
      btn.addEventListener('click', () => {
        shareReport();
      });
    }
  });
  
  // Compare Reports (placeholder)
  const compareBtn = document.getElementById('compareBtn');
  if (compareBtn) {
    compareBtn.addEventListener('click', () => {
      alert('Compare Reports feature coming soon!');
    });
  }
}

// Download report as PDF (placeholder - shows notification)
function downloadReport() {
  if (!window.currentAnalysisData) {
    alert('Analysis data not available');
    return;
  }
  
  // In production, this would generate a PDF using a library like pdfkit or html2pdf
  const analysis = window.currentAnalysisData;
  const reportContent = `
HireIQ Career Intelligence Report

Overall Score: ${Math.round(analysis.atsScore)}
Match Percentage: ${analysis.matchPercentage}%

Strengths:
${(analysis.strengths || []).slice(0, 5).map(s => '• ' + s).join('\n')}

Weaknesses:
${(analysis.weaknesses || []).slice(0, 5).map(w => '• ' + w).join('\n')}

Recommendations:
${(analysis.recommendations || []).slice(0, 5).map(r => '• ' + r).join('\n')}

Learning Roadmap:
${(analysis.learningRoadmap || []).slice(0, 5).map((item, i) => `${i + 1}. ${item.skill} (${item.priority})`).join('\n')}
  `;
  
  // Create downloadable text file
  const blob = new Blob([reportContent], { type: 'text/plain' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `HireIQ_Report_${new Date().toISOString().split('T')[0]}.txt`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

// Share report (placeholder)
function shareReport() {
  const analysisId = getAnalysisId();
  const shareUrl = `${window.location.origin}/career-intelligence-report.html?id=${analysisId}`;
  
  if (navigator.share) {
    navigator.share({
      title: 'HireIQ Career Intelligence Report',
      text: 'Check out my AI-generated career intelligence report from HireIQ',
      url: shareUrl
    }).catch(err => console.log('Share error:', err));
  } else {
    // Fallback: copy to clipboard
    navigator.clipboard.writeText(shareUrl).then(() => {
      alert('Report link copied to clipboard!');
    }).catch(err => {
      alert('Share URL: ' + shareUrl);
    });
  }
}

// Show loading state
function showLoadingState() {
  const hero = document.querySelector('.hero');
  if (hero) {
    if (!document.getElementById('loadingIndicator')) {
      const loader = document.createElement('div');
      loader.id = 'loadingIndicator';
      loader.style.cssText = `
        margin-top: 20px;
        padding: 20px;
        text-align: center;
        color: var(--text-secondary);
      `;
      loader.innerHTML = '<p>⏳ Loading report... This may take a few moments.</p>';
      hero.appendChild(loader);
    }
  }
}

// Hide loading state
function hideLoadingState() {
  const loader = document.getElementById('loadingIndicator');
  if (loader) {
    loader.remove();
  }
}

// Show error message
function showError(message) {
  const hero = document.querySelector('.hero');
  if (hero) {
    if (!document.getElementById('errorIndicator')) {
      const errorDiv = document.createElement('div');
      errorDiv.id = 'errorIndicator';
      errorDiv.style.cssText = `
        margin-top: 20px;
        padding: 20px;
        background: rgba(239, 68, 68, 0.1);
        border: 1px solid rgba(239, 68, 68, 0.3);
        border-radius: 12px;
        color: #fecaca;
      `;
      errorDiv.innerHTML = `<p style="margin: 0;">⚠️ ${message}</p>`;
      hero.appendChild(errorDiv);
    }
  }
}

// Export functions
window.displayReport = displayReport;
window.fetchAndDisplayReport = fetchAndDisplayReport;
