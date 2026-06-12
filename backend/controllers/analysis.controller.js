const fs = require('fs');
const path = require('path');
const mongoose = require('mongoose');
const Analysis = require('../models/Analysis');
const User = require('../models/User');
const { parseResume } = require('../services/resume.service');
const { analyzeGitHub } = require('../services/github.service');
const { analyzeLinkedIn } = require('../services/linkedin.service');
const { analyzeWithGemini } = require('../services/gemini.service');

const publicAnalyses = new Map();

/**
 * Create new analysis
 */
async function createAnalysis(req, res) {
  let uploadedFile = null;
  
  try {
    const { githubUrl, linkedinUrl, jobDescription } = req.body;
    const userId = req.user.id;

    if (mongoose.connection.readyState !== 1) {
      return res.status(503).json({
        success: false,
        message: 'Database is not connected. Update MONGODB_URI in backend/.env and restart the backend.'
      });
    }
    
    // Validate file upload
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'Resume file is required'
      });
    }
    
    uploadedFile = req.file;
    
    // Validate file type
    const allowedExtensions = ['.pdf', '.docx', '.doc'];
    const fileExt = path.extname(uploadedFile.originalname).toLowerCase();
    
    if (!allowedExtensions.includes(fileExt)) {
      fs.unlinkSync(uploadedFile.path);
      return res.status(400).json({
        success: false,
        message: 'Only PDF, DOCX, and DOC files are supported'
      });
    }
    
    // Create analysis document
    const analysis = new Analysis({
      userId,
      resumeFile: uploadedFile.path,
      githubUrl: githubUrl || null,
      linkedinUrl: linkedinUrl || null,
      jobDescription: jobDescription || null,
      analysisStatus: 'pending'
    });
    
    await analysis.save();
    
    // Process analysis asynchronously
    processAnalysisAsync(analysis._id, uploadedFile.path, githubUrl, linkedinUrl, jobDescription)
      .catch(error => {
        console.error('Analysis processing error:', error);
        Analysis.findByIdAndUpdate(analysis._id, {
          analysisStatus: 'failed',
          errorMessage: error.message
        }).exec();
      });
    
    res.status(202).json({
      success: true,
      message: 'Analysis started',
      data: {
        analysisId: analysis._id,
        status: 'processing'
      }
    });
  } catch (error) {
    // Clean up uploaded file on error
    if (uploadedFile) {
      try {
        fs.unlinkSync(uploadedFile.path);
      } catch (e) {
        console.error('Error deleting file:', e);
      }
    }
    
    console.error('Create analysis error:', error);
    res.status(500).json({
      success: false,
      message: 'Analysis creation failed',
      error: error.message
    });
  }
}

/**
 * Create analysis without login. This keeps the resume page connected to the
 * same API pipeline even when the user has not authenticated yet.
 */
async function createPublicAnalysis(req, res) {
  if (mongoose.connection.readyState !== 1) {
    return createMemoryPublicAnalysis(req, res);
  }

  req.user = {
    id: await getPublicUserId()
  };

  return createAnalysis(req, res);
}

async function createMemoryPublicAnalysis(req, res) {
  let uploadedFile = null;

  try {
    const { githubUrl, linkedinUrl, jobDescription } = req.body;

    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'Resume file is required'
      });
    }

    uploadedFile = req.file;

    const allowedExtensions = ['.pdf', '.docx', '.doc'];
    const fileExt = path.extname(uploadedFile.originalname).toLowerCase();

    if (!allowedExtensions.includes(fileExt)) {
      fs.unlinkSync(uploadedFile.path);
      return res.status(400).json({
        success: false,
        message: 'Only PDF, DOCX, and DOC files are supported'
      });
    }

    const analysisId = `public-${Date.now()}-${Math.round(Math.random() * 1E9)}`;
    const analysis = {
      _id: analysisId,
      userId: 'public-memory',
      resumeFile: uploadedFile.path,
      githubUrl: githubUrl || null,
      linkedinUrl: linkedinUrl || null,
      jobDescription: jobDescription || null,
      analysisStatus: 'pending',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    publicAnalyses.set(analysisId, analysis);

    processMemoryAnalysisAsync(analysisId, uploadedFile.path, githubUrl, linkedinUrl, jobDescription)
      .catch(error => {
        console.error('Public analysis processing error:', error);
        const failedAnalysis = publicAnalyses.get(analysisId);
        if (failedAnalysis) {
          failedAnalysis.analysisStatus = 'failed';
          failedAnalysis.errorMessage = error.message;
          failedAnalysis.updatedAt = new Date().toISOString();
        }
      });

    res.status(202).json({
      success: true,
      message: 'Analysis started',
      data: {
        analysisId,
        status: 'processing'
      }
    });
  } catch (error) {
    if (uploadedFile) {
      try {
        fs.unlinkSync(uploadedFile.path);
      } catch (e) {
        console.error('Error deleting file:', e);
      }
    }

    console.error('Create public memory analysis error:', error);
    res.status(500).json({
      success: false,
      message: 'Analysis creation failed',
      error: error.message
    });
  }
}

async function getPublicUserId() {
  const email = 'resume-guest@hireiq.local';
  let user = await User.findOne({ email });

  if (!user) {
    user = await User.create({
      email,
      password: `Guest-${Date.now()}-${Math.random().toString(36).slice(2)}`,
      name: 'Resume Guest',
      role: 'student'
    });
  }

  return user._id;
}

async function processMemoryAnalysisAsync(analysisId, resumePath, githubUrl, linkedinUrl, jobDescription) {
  const analysis = publicAnalyses.get(analysisId);
  if (!analysis) return;

  console.log('Step 1: Parsing public resume...');
  const resumeData = await parseResume(resumePath);
  analysis.resumeData = resumeData;

  if (githubUrl) {
    console.log('Step 2: Analyzing public GitHub...');
    const githubData = await analyzeGitHub(githubUrl);
    if (githubData) {
      analysis.githubData = githubData;
    }
  }

  if (linkedinUrl) {
    console.log('Step 3: Analyzing public LinkedIn...');
    const linkedinData = await analyzeLinkedIn(linkedinUrl);
    if (linkedinData) {
      analysis.linkedinData = linkedinData;
    }
  }

  console.log('Step 4: Performing public AI analysis...');
  const aiAnalysis = await analyzeWithGemini(
    resumeData,
    analysis.githubData,
    analysis.linkedinData,
    jobDescription
  );

  Object.assign(analysis, aiAnalysis, {
    analysisStatus: 'completed',
    updatedAt: new Date().toISOString()
  });

  publicAnalyses.set(analysisId, analysis);
  console.log('Public analysis completed:', analysisId);
}

/**
 * Process analysis asynchronously
 */
async function processAnalysisAsync(analysisId, resumePath, githubUrl, linkedinUrl, jobDescription) {
  try {
    const analysis = await Analysis.findById(analysisId);
    
    // Step 1: Parse resume
    console.log('Step 1: Parsing resume...');
    const resumeData = await parseResume(resumePath);
    analysis.resumeData = resumeData;
    
    // Step 2: Analyze GitHub
    if (githubUrl) {
      console.log('Step 2: Analyzing GitHub...');
      const githubData = await analyzeGitHub(githubUrl);
      if (githubData) {
        analysis.githubData = githubData;
      }
    }
    
    // Step 3: Analyze LinkedIn
    if (linkedinUrl) {
      console.log('Step 3: Analyzing LinkedIn...');
      const linkedinData = await analyzeLinkedIn(linkedinUrl);
      if (linkedinData) {
        analysis.linkedinData = linkedinData;
      }
    }
    
    // Step 4: Perform AI analysis with Gemini
    console.log('Step 4: Performing AI analysis...');
    const aiAnalysis = await analyzeWithGemini(
      resumeData,
      analysis.githubData,
      analysis.linkedinData,
      jobDescription
    );
    
    // Update analysis with AI results
    analysis.atsScore = aiAnalysis.atsScore;
    analysis.matchPercentage = aiAnalysis.matchPercentage;
    analysis.matchedSkills = aiAnalysis.matchedSkills;
    analysis.missingSkills = aiAnalysis.missingSkills;
    analysis.strengths = aiAnalysis.strengths;
    analysis.weaknesses = aiAnalysis.weaknesses;
    analysis.recommendations = aiAnalysis.recommendations;
    analysis.learningRoadmap = aiAnalysis.learningRoadmap;
    analysis.technicalQuestions = aiAnalysis.technicalQuestions;
    analysis.hrQuestions = aiAnalysis.hrQuestions;
    analysis.projectQuestions = aiAnalysis.projectQuestions;
    analysis.analysisStatus = 'completed';
    
    await analysis.save();
    console.log('Analysis completed:', analysisId);
  } catch (error) {
    console.error('Error processing analysis:', error);
    throw error;
  }
}

/**
 * Get analysis by ID
 */
async function getAnalysis(req, res) {
  try {
    const { id } = req.params;
    const userId = req.user.id;
    
    const analysis = await Analysis.findById(id);
    
    if (!analysis) {
      return res.status(404).json({
        success: false,
        message: 'Analysis not found'
      });
    }
    
    // Check authorization
    if (analysis.userId.toString() !== userId) {
      return res.status(403).json({
        success: false,
        message: 'Unauthorized access'
      });
    }
    
    res.json({
      success: true,
      data: analysis
    });
  } catch (error) {
    console.error('Get analysis error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve analysis',
      error: error.message
    });
  }
}

/**
 * Get public/guest analysis by ID
 */
async function getPublicAnalysis(req, res) {
  try {
    const { id } = req.params;

    if (publicAnalyses.has(id)) {
      return res.json({
        success: true,
        data: publicAnalyses.get(id)
      });
    }

    if (mongoose.connection.readyState !== 1) {
      return res.status(404).json({
        success: false,
        message: 'Analysis not found. Public analyses are kept in memory while the backend is running.'
      });
    }

    const analysis = await Analysis.findById(id);

    if (!analysis) {
      return res.status(404).json({
        success: false,
        message: 'Analysis not found'
      });
    }

    res.json({
      success: true,
      data: analysis
    });
  } catch (error) {
    console.error('Get public analysis error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve analysis',
      error: error.message
    });
  }
}

/**
 * Get user's analysis history
 */
async function getAnalysisHistory(req, res) {
  try {
    const userId = req.user.id;
    
    const analyses = await Analysis.find({ userId })
      .select('-resumeData.rawText')
      .sort({ createdAt: -1 })
      .limit(20);
    
    res.json({
      success: true,
      data: analyses
    });
  } catch (error) {
    console.error('Get history error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve history',
      error: error.message
    });
  }
}

module.exports = {
  createAnalysis,
  createPublicAnalysis,
  getAnalysis,
  getPublicAnalysis,
  getAnalysisHistory
};
