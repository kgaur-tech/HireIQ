const { GoogleGenerativeAI } = require('@google/generative-ai');

/**
 * Perform AI analysis using Gemini
 */
async function analyzeWithGemini(resumeData, githubData, linkedinData, jobDescription) {
  try {
    if (!process.env.GEMINI_API_KEY) {
      return buildFallbackAnalysis(resumeData, githubData, linkedinData, jobDescription);
    }
    
    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
    const model = genAI.getGenerativeModel({
      model: process.env.GEMINI_MODEL || 'gemini-1.5-flash'
    });
    
    // Prepare context
    const context = buildAnalysisContext(resumeData, githubData, linkedinData, jobDescription);
    
    // Get analysis
    const analysis = await performAnalysis(model, context);
    
    return analysis;
  } catch (error) {
    console.error('Gemini analysis error:', error.message);
    return buildFallbackAnalysis(resumeData, githubData, linkedinData, jobDescription);
  }
}

/**
 * Build context for Gemini
 */
function buildAnalysisContext(resumeData, githubData, linkedinData, jobDescription) {
  const skills = resumeData.skills || [];
  const experience = resumeData.experience || [];
  const education = resumeData.education || [];
  const projects = resumeData.projects || [];
  const certifications = resumeData.certifications || [];

  return `
RESUME DATA:
- Name: ${resumeData.name}
- Email: ${resumeData.email}
- Phone: ${resumeData.phone}
- Skills: ${skills.join(', ')}
- Experience: ${experience.map(e => `${e.position} at ${e.company}`).join('; ')}
- Education: ${education.map(e => `${e.degree} in ${e.field}`).join('; ')}
- Projects: ${projects.map(p => `${p.name}: ${p.description}`).join('; ')}
- Certifications: ${certifications.join(', ')}

GITHUB DATA:
${githubData ? `
- Username: ${githubData.profile?.username}
- Followers: ${githubData.profile?.followers}
- Public Repos: ${githubData.profile?.publicRepos}
- Top Languages: ${Object.keys(githubData.languages || {}).slice(0, 5).join(', ')}
- Top Projects: ${githubData.topProjects?.map(p => `${p.name} (${p.stars} stars)`).join('; ')}
` : 'No GitHub data available'}

LINKEDIN DATA:
${linkedinData ? `
- Name: ${linkedinData.profile?.name}
- Headline: ${linkedinData.profile?.headline}
- Experience: ${linkedinData.experience?.map(e => `${e.title} at ${e.company}`).join('; ')}
- Skills: ${linkedinData.skills?.join(', ')}
` : 'No LinkedIn data available'}

JOB DESCRIPTION:
${jobDescription || 'No job description provided'}
`;
}

/**
 * Perform comprehensive analysis
 */
async function performAnalysis(model, context) {
  const prompt = `
You are an expert ATS (Applicant Tracking System) and career coach analyzing a candidate's profile.

${context}

Analyze this candidate comprehensively and respond with VALID JSON (no markdown, no code blocks) containing:

{
  "atsScore": <number 0-100>,
  "matchPercentage": <number 0-100>,
  "matchedSkills": [<array of matched skills>],
  "missingSkills": [<array of critical missing skills>],
  "strengths": [<array of 5-7 key strengths>],
  "weaknesses": [<array of 3-5 areas for improvement>],
  "recommendations": [<array of 5-7 actionable recommendations>],
  "learningRoadmap": [
    {
      "skill": "<skill name>",
      "priority": "high|medium|low",
      "timeline": "<e.g., 4 weeks>",
      "resources": [<array of learning resources>]
    }
  ],
  "technicalQuestions": [
    {
      "question": "<interview question>",
      "answer": "<model answer>",
      "difficulty": "easy|medium|hard",
      "topic": "<topic>"
    }
  ],
  "hrQuestions": [
    {
      "question": "<HR question>",
      "answer": "<model answer>"
    }
  ],
  "projectQuestions": [
    {
      "question": "<project-based question>",
      "answer": "<model answer>"
    }
  ]
}

Generate at least 10 technical questions, 10 HR questions, and 10 project-based questions.
Ensure scores are realistic and based on actual data.
`;

  const result = await model.generateContent(prompt);
  const responseText = result.response.text();
  
  // Parse JSON from response
  const analysis = parseGeminiJson(responseText);
  
  return analysis;
}

function parseGeminiJson(responseText) {
  const cleaned = responseText
    .replace(/```json/gi, '')
    .replace(/```/g, '')
    .trim();

  try {
    return JSON.parse(cleaned);
  } catch (error) {
    const jsonMatch = cleaned.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error('Invalid response format from Gemini');
    }

    return JSON.parse(jsonMatch[0]);
  }
}

function buildFallbackAnalysis(resumeData, githubData, linkedinData, jobDescription) {
  const resumeSkills = Array.isArray(resumeData.skills) ? resumeData.skills : [];
  const jobSkills = extractJobSkills(jobDescription || '');
  const matchedSkills = jobSkills.length
    ? resumeSkills.filter(skill => jobSkills.some(jobSkill => sameSkill(skill, jobSkill)))
    : resumeSkills.slice(0, 10);
  const missingSkills = jobSkills.filter(skill => !resumeSkills.some(resumeSkill => sameSkill(resumeSkill, skill)));
  const hasGithub = Boolean(githubData);
  const hasLinkedin = Boolean(linkedinData);
  const hasJobDescription = Boolean(jobDescription && jobDescription.trim());
  const profileCompleteness = [
    resumeData.email,
    resumeData.phone,
    resumeSkills.length,
    resumeData.projects?.length,
    resumeData.experience?.length,
    hasGithub,
    hasLinkedin
  ].filter(Boolean).length;
  const atsScore = clampScore(45 + profileCompleteness * 6 + Math.min(resumeSkills.length, 10));
  const matchPercentage = hasJobDescription
    ? clampScore(jobSkills.length ? Math.round((matchedSkills.length / jobSkills.length) * 100) : 60)
    : clampScore(atsScore - 8);

  return {
    atsScore,
    matchPercentage,
    matchedSkills: matchedSkills.length ? matchedSkills : resumeSkills.slice(0, 8),
    missingSkills: missingSkills.slice(0, 8),
    strengths: [
      resumeSkills.length ? `Found ${resumeSkills.length} technical skills in the resume.` : 'Resume uploaded and parsed successfully.',
      resumeData.projects?.length ? 'Project experience is visible in the resume.' : 'Profile is ready for project detail improvements.',
      resumeData.experience?.length ? 'Work experience signals are present.' : 'Fresh candidate profile can still be evaluated through projects and skills.',
      hasGithub ? 'GitHub profile was connected for engineering context.' : 'Core resume analysis is available without GitHub.',
      hasLinkedin ? 'LinkedIn profile was connected for professional context.' : 'LinkedIn can be added later for stronger profile context.'
    ],
    weaknesses: [
      missingSkills.length ? `Missing or unclear role keywords: ${missingSkills.slice(0, 5).join(', ')}.` : 'Role-specific keywords could be expanded.',
      'Add measurable outcomes to projects and experience.',
      'Keep skills grouped by language, framework, database, and tools.'
    ],
    recommendations: [
      'Add quantified impact for projects, internships, and achievements.',
      'Mirror important keywords from the target job description where truthful.',
      'Put strongest technical skills near the top of the resume.',
      'Add deployment, testing, and architecture details for major projects.',
      hasGithub ? 'Pin the most relevant GitHub repositories.' : 'Connect GitHub to strengthen project verification.'
    ],
    learningRoadmap: buildRoadmap(missingSkills),
    technicalQuestions: buildTechnicalQuestions(resumeSkills, missingSkills),
    hrQuestions: buildHrQuestions(),
    projectQuestions: buildProjectQuestions()
  };
}

function extractJobSkills(text) {
  const commonSkills = [
    'JavaScript', 'TypeScript', 'Python', 'Java', 'C++', 'React', 'Node.js',
    'Express', 'MongoDB', 'PostgreSQL', 'MySQL', 'AWS', 'Docker',
    'Kubernetes', 'REST', 'GraphQL', 'HTML', 'CSS', 'Git', 'Machine Learning',
    'Data Science', 'TensorFlow', 'PyTorch', 'Testing', 'System Design'
  ];

  const lowerText = text.toLowerCase();
  return commonSkills.filter(skill => lowerText.includes(skill.toLowerCase()));
}

function sameSkill(left, right) {
  const normalize = (value) => {
    const skill = String(value).toLowerCase();
    if (['api', 'apis', 'rest', 'rest api', 'restful'].includes(skill)) return 'api';
    if (['node', 'nodejs', 'node.js'].includes(skill)) return 'node.js';
    if (['reactjs', 'react.js'].includes(skill)) return 'react';
    return skill;
  };

  return normalize(left) === normalize(right);
}

function clampScore(score) {
  return Math.max(0, Math.min(100, Number.isFinite(score) ? score : 60));
}

function buildRoadmap(missingSkills) {
  const skills = missingSkills.length ? missingSkills.slice(0, 5) : ['System Design', 'Testing', 'Deployment'];
  return skills.map((skill, index) => ({
    skill,
    priority: index < 2 ? 'high' : 'medium',
    timeline: index < 2 ? '2-3 weeks' : '1-2 weeks',
    resources: [`${skill} fundamentals`, `${skill} practice projects`]
  }));
}

function buildTechnicalQuestions(resumeSkills, missingSkills) {
  const primarySkill = resumeSkills[0] || 'your strongest technical skill';
  const improvementSkill = missingSkills[0] || 'system design';

  return [
    `Explain a project where you used ${primarySkill}.`,
    'How would you design authentication for a web application?',
    'How do you debug a production issue?',
    'What tradeoffs do you consider while designing an API?',
    'How do you test backend and frontend changes?',
    `How would you improve your knowledge of ${improvementSkill}?`,
    'Explain database indexing and when it helps.',
    'How would you handle file uploads securely?',
    'What makes code maintainable in a team project?',
    'How do you optimize a slow web page?'
  ].map((question, index) => ({
    question,
    answer: '',
    difficulty: index > 6 ? 'hard' : index > 2 ? 'medium' : 'easy',
    topic: index === 0 ? 'Projects' : 'Technical Fundamentals'
  }));
}

function buildHrQuestions() {
  return [
    'Tell me about yourself.',
    'Why are you interested in this role?',
    'Describe a time you solved a difficult problem.',
    'How do you handle feedback?',
    'What are your strengths?',
    'What is one area you are improving?',
    'How do you manage deadlines?',
    'Describe a team conflict and how you handled it.',
    'Why should we hire you?',
    'Where do you see yourself in two years?'
  ].map(question => ({ question, answer: '' }));
}

function buildProjectQuestions() {
  return [
    'Which project best represents your current skill level?',
    'What was the hardest technical decision in your project?',
    'How did you structure the project codebase?',
    'What would you improve if you rebuilt the project?',
    'How did you test the project?',
    'How did you deploy or plan to deploy the project?',
    'What security concerns did you consider?',
    'How did you handle errors and edge cases?',
    'What did you learn from building the project?',
    'How would you scale the project for more users?'
  ].map(question => ({ question, answer: '' }));
}

module.exports = {
  analyzeWithGemini
};
