const fs = require('fs');
const path = require('path');
const pdfParse = require('pdf-parse');
const mammoth = require('mammoth');

/**
 * Parse resume file and extract text and structure
 * @param {string} filePath - Path to the resume file
 * @returns {Promise<Object>} Parsed resume data
 */
async function parseResume(filePath) {
  try {
    const ext = path.extname(filePath).toLowerCase();
    let rawText = '';
    
    if (ext === '.pdf') {
      rawText = await parsePDF(filePath);
    } else if (ext === '.docx') {
      rawText = await parseDOCX(filePath);
    } else if (ext === '.doc') {
      rawText = await parseDOC(filePath);
    } else {
      throw new Error('Unsupported file format. Please use PDF, DOCX, or DOC.');
    }
    
    // Extract structured data from raw text
    const resumeData = extractResumeData(rawText);
    resumeData.rawText = rawText;
    
    return resumeData;
  } catch (error) {
    throw new Error(`Resume parsing failed: ${error.message}`);
  }
}

/**
 * Parse PDF file
 */
async function parsePDF(filePath) {
  const fileBuffer = fs.readFileSync(filePath);
  const data = await pdfParse(fileBuffer);
  return data.text;
}

/**
 * Parse DOCX file
 */
async function parseDOCX(filePath) {
  const result = await mammoth.extractRawText({ path: filePath });
  return result.value;
}

/**
 * Parse DOC file (converted to DOCX first)
 */
async function parseDOC(filePath) {
  // For .doc files, use mammoth with the file
  const result = await mammoth.extractRawText({ path: filePath });
  return result.value;
}

/**
 * Extract structured data from raw resume text
 */
function extractResumeData(text) {
  const resumeData = {
    name: extractName(text),
    email: extractEmail(text),
    phone: extractPhone(text),
    skills: extractSkills(text),
    education: extractEducation(text),
    experience: extractExperience(text),
    projects: extractProjects(text),
    certifications: extractCertifications(text)
  };
  
  return resumeData;
}

/**
 * Extract name from resume
 */
function extractName(text) {
  const lines = text.split('\n').slice(0, 5);
  for (const line of lines) {
    const cleaned = line.trim();
    if (cleaned && cleaned.length > 2 && cleaned.length < 50 && /^[a-zA-Z\s]+$/.test(cleaned)) {
      return cleaned;
    }
  }
  return 'Unknown';
}

/**
 * Extract email from resume
 */
function extractEmail(text) {
  const emailRegex = /([a-zA-Z0-9._-]+@[a-zA-Z0-9._-]+\.[a-zA-Z0-9_-]+)/;
  const match = text.match(emailRegex);
  return match ? match[1] : '';
}

/**
 * Extract phone from resume
 */
function extractPhone(text) {
  const phoneRegex = /(?:\+\d{1,3}[-.\s]?)?\(?(\d{3})\)?[-.\s]?(\d{3})[-.\s]?(\d{4})|(?:\+\d{1,3}[-.\s]?)?\d{10,}/;
  const match = text.match(phoneRegex);
  return match ? match[0] : '';
}

/**
 * Extract skills from resume
 */
function extractSkills(text) {
  const commonSkills = [
    'JavaScript', 'TypeScript', 'Python', 'Java', 'C++', 'C#', 'Go', 'Rust',
    'React', 'Vue', 'Angular', 'Svelte',
    'Node.js', 'Express', 'Django', 'Flask', 'Spring Boot',
    'MongoDB', 'PostgreSQL', 'MySQL', 'Redis', 'Firebase',
    'AWS', 'Azure', 'GCP', 'Docker', 'Kubernetes',
    'REST', 'GraphQL', 'WebSocket',
    'HTML', 'CSS', 'SASS', 'Tailwind',
    'Git', 'GitHub', 'GitLab', 'Bitbucket',
    'Linux', 'Windows', 'MacOS',
    'Agile', 'Scrum', 'Kanban',
    'Machine Learning', 'Deep Learning', 'TensorFlow', 'PyTorch',
    'NLP', 'Computer Vision', 'Data Science', 'Pandas', 'NumPy',
    'Webpack', 'Babel', 'Jest', 'Cypress',
    'Jenkins', 'GitLab CI', 'GitHub Actions',
    'Microservices', 'API', 'RESTful', 'SOAP',
    'CI/CD', 'DevOps', 'Infrastructure'
  ];
  
  const foundSkills = [];
  const textLower = text.toLowerCase();
  
  for (const skill of commonSkills) {
    if (textLower.includes(skill.toLowerCase())) {
      foundSkills.push(skill);
    }
  }
  
  return [...new Set(foundSkills)];
}

/**
 * Extract education from resume
 */
function extractEducation(text) {
  const education = [];
  const educationRegex = /(?:Bachelor|Master|B\.S|B\.A|M\.S|M\.A|PhD|BE|B\.Tech|M\.Tech|B\.Com|M\.Com|Diploma)[\s\S]*?(?=(?:Experience|Projects|Skills|$))/gi;
  
  const matches = text.match(educationRegex);
  if (matches) {
    for (const match of matches.slice(0, 3)) {
      const lines = match.split('\n').filter(l => l.trim());
      if (lines.length > 0) {
        education.push({
          institution: lines[0] || 'Unknown Institution',
          degree: lines[0] || 'Unknown Degree',
          field: lines[1] || 'Unknown Field',
          graduationYear: extractYear(match) || 'Unknown'
        });
      }
    }
  }
  
  return education;
}

/**
 * Extract experience from resume
 */
function extractExperience(text) {
  const experience = [];
  const lines = text.split('\n');
  
  let currentJob = null;
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    
    if (/\b(Manager|Engineer|Developer|Designer|Analyst|Lead|Senior|Junior|Intern)\b/i.test(line)) {
      if (currentJob) {
        experience.push(currentJob);
      }
      currentJob = {
        company: lines[i + 1]?.trim() || 'Unknown Company',
        position: line,
        duration: extractYear(line) || 'Current',
        description: ''
      };
    } else if (currentJob && line) {
      currentJob.description += line + ' ';
    }
  }
  
  if (currentJob) {
    experience.push(currentJob);
  }
  
  return experience.slice(0, 5);
}

/**
 * Extract projects from resume
 */
function extractProjects(text) {
  const projects = [];
  const projectRegex = /(?:Project|Project Name)[\s\S]*?(?=(?:Project|Experience|Skills|$))/gi;
  
  const matches = text.match(projectRegex);
  if (matches) {
    for (const match of matches.slice(0, 3)) {
      const lines = match.split('\n').filter(l => l.trim());
      if (lines.length > 0) {
        projects.push({
          name: lines[0] || 'Unknown Project',
          description: lines.slice(1).join(' ') || 'No description',
          technologies: []
        });
      }
    }
  }
  
  return projects;
}

/**
 * Extract certifications from resume
 */
function extractCertifications(text) {
  const certifications = [];
  const certRegex = /(?:Certification|Certified|Certificate)[\s\S]*?(?=(?:Certification|$))/gi;
  
  const matches = text.match(certRegex);
  if (matches) {
    for (const match of matches.slice(0, 5)) {
      const lines = match.split('\n').filter(l => l.trim());
      if (lines.length > 0) {
        certifications.push(lines[0]);
      }
    }
  }
  
  return certifications;
}

/**
 * Extract year from text
 */
function extractYear(text) {
  const yearRegex = /\b(19|20)\d{2}\b/;
  const match = text.match(yearRegex);
  return match ? match[0] : null;
}

module.exports = {
  parseResume
};
