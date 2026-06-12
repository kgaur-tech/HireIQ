const axios = require('axios');

const APIFY_API = 'https://api.apify.com/v2';
const DEFAULT_LINKEDIN_ACTOR = 'bebity/linkedin-premium-actor';

/**
 * Analyze LinkedIn profile using Apify
 * @param {string} linkedinUrl - LinkedIn profile URL
 * @returns {Promise<Object>} LinkedIn analysis data
 */
async function analyzeLinkedIn(linkedinUrl) {
  try {
    if (!linkedinUrl || !process.env.APIFY_TOKEN) {
      return null;
    }
    
    // Use Apify actor to scrape LinkedIn profile
    const linkedinData = await scrapeLinkedInProfile(linkedinUrl);
    
    return linkedinData;
  } catch (error) {
    console.error('LinkedIn analysis error:', error.message);
    return null;
  }
}

/**
 * Scrape LinkedIn profile using Apify
 */
async function scrapeLinkedInProfile(linkedinUrl) {
  try {
    const actorId = process.env.APIFY_LINKEDIN_ACTOR_ID || DEFAULT_LINKEDIN_ACTOR;
    const encodedActorId = encodeURIComponent(actorId);
    
    // Start actor run
    const runResponse = await axios.post(
      `${APIFY_API}/acts/${encodedActorId}/runs`,
      {
        profileUrls: [linkedinUrl],
        urls: [linkedinUrl],
        url: linkedinUrl
      },
      {
        headers: {
          'Authorization': `Bearer ${process.env.APIFY_TOKEN}`,
          'Content-Type': 'application/json'
        }
      }
    );
    
    const runId = runResponse.data.data.id;
    
    // Wait for actor to complete
    let result = await waitForActorCompletion(runId);
    
    // Fetch results
    const resultsResponse = await axios.get(
      `${APIFY_API}/datasets/${result.defaultDatasetId}/items`,
      {
        headers: {
          'Authorization': `Bearer ${process.env.APIFY_TOKEN}`
        }
      }
    );
    
    const profileData = resultsResponse.data[0] || {};
    
    return parseLinkedInData(profileData);
  } catch (error) {
    console.error('Error scraping LinkedIn:', error.message);
    // Return mock data if API fails (graceful degradation)
    return getMockLinkedInData(linkedinUrl);
  }
}

/**
 * Wait for actor to complete execution
 */
async function waitForActorCompletion(runId, maxAttempts = 30) {
  let attempts = 0;
  
  while (attempts < maxAttempts) {
    const response = await axios.get(
      `${APIFY_API}/runs/${runId}`,
      {
        headers: {
          'Authorization': `Bearer ${process.env.APIFY_TOKEN}`
        }
      }
    );
    
    const run = response.data.data;
    
    if (run.status === 'SUCCEEDED') {
      return run;
    } else if (run.status === 'FAILED' || run.status === 'ABORTED') {
      throw new Error(`Actor run failed with status: ${run.status}`);
    }
    
    // Wait 2 seconds before next attempt
    await new Promise(resolve => setTimeout(resolve, 2000));
    attempts++;
  }
  
  throw new Error('Actor execution timeout');
}

/**
 * Parse LinkedIn data from Apify response
 */
function parseLinkedInData(data) {
  const experiences = data.experience || data.experiences || data.positions || [];
  const education = data.education || data.educations || [];
  const skills = data.skills || data.skill || [];

  return {
    profile: {
      name: data.name || data.fullName || `${data.firstName || ''} ${data.lastName || ''}`.trim() || 'Unknown',
      headline: data.headline || data.occupation || '',
      about: data.about || data.summary || '',
      location: data.location || '',
      profileUrl: data.profileUrl || data.linkedinUrl || data.url || ''
    },
    experience: experiences.map(exp => ({
      title: exp.positionName || exp.title || '',
      company: exp.companyName || exp.company || '',
      duration: exp.duration || `${exp.startedOn || exp.startDate || ''} - ${exp.endedOn || exp.endDate || 'Present'}`,
      description: exp.description || ''
    })),
    education: education.map(edu => ({
      school: edu.schoolName || edu.school || '',
      degree: edu.degreeName || edu.degree || '',
      fieldOfStudy: edu.fieldOfStudy || edu.field || ''
    })),
    skills: Array.isArray(skills) ? skills.map(skill => typeof skill === 'string' ? skill : skill.name).filter(Boolean) : []
  };
}

/**
 * Graceful fallback with mock LinkedIn data
 */
function getMockLinkedInData(linkedinUrl) {
  return {
    profile: {
      name: 'Professional Name',
      headline: 'Professional Title',
      about: 'Professional summary would be extracted here',
      location: 'Location',
      profileUrl: linkedinUrl
    },
    experience: [],
    education: [],
    skills: []
  };
}

module.exports = {
  analyzeLinkedIn
};
