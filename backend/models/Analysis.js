const mongoose = require('mongoose');

const analysisSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  
  // Input Files and URLs
  resumeFile: {
    type: String,
    required: true
  },
  githubUrl: String,
  linkedinUrl: String,
  jobDescription: String,
  
  // Parsed Resume Data
  resumeData: {
    name: String,
    email: String,
    phone: String,
    skills: [String],
    education: [{
      institution: String,
      degree: String,
      field: String,
      graduationYear: String
    }],
    experience: [{
      company: String,
      position: String,
      duration: String,
      description: String
    }],
    projects: [{
      name: String,
      description: String,
      technologies: [String]
    }],
    certifications: [String],
    rawText: String
  },
  
  // GitHub Analysis
  githubData: {
    profile: {
      username: String,
      name: String,
      bio: String,
      location: String,
      followers: Number,
      following: Number,
      publicRepos: Number,
      profileUrl: String
    },
    repositories: [{
      name: String,
      description: String,
      url: String,
      language: String,
      stars: Number,
      forks: Number,
      topics: [String]
    }],
    languages: {
      type: Map,
      of: Number
    },
    topProjects: [{
      name: String,
      stars: Number,
      language: String
    }]
  },
  
  // LinkedIn Analysis
  linkedinData: {
    profile: {
      name: String,
      headline: String,
      about: String,
      location: String,
      profileUrl: String
    },
    experience: [{
      title: String,
      company: String,
      duration: String,
      description: String
    }],
    education: [{
      school: String,
      degree: String,
      fieldOfStudy: String
    }],
    skills: [String]
  },
  
  // ATS Analysis Results
  atsScore: {
    type: Number,
    min: 0,
    max: 100
  },
  matchPercentage: {
    type: Number,
    min: 0,
    max: 100
  },
  
  // Skill Analysis
  matchedSkills: [String],
  missingSkills: [String],
  
  // Assessment
  strengths: [String],
  weaknesses: [String],
  recommendations: [String],
  learningRoadmap: [{
    skill: String,
    priority: String, // 'high', 'medium', 'low'
    resources: [String],
    timeline: String
  }],
  
  // Interview Questions
  technicalQuestions: [{
    question: String,
    answer: String,
    difficulty: String, // 'easy', 'medium', 'hard'
    topic: String
  }],
  hrQuestions: [{
    question: String,
    answer: String
  }],
  projectQuestions: [{
    question: String,
    answer: String
  }],
  
  // Metadata
  analysisStatus: {
    type: String,
    enum: ['pending', 'completed', 'failed'],
    default: 'pending'
  },
  errorMessage: String,
  
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

// Index for faster queries
analysisSchema.index({ userId: 1, createdAt: -1 });

module.exports = mongoose.model('Analysis', analysisSchema);
