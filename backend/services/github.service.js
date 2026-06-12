const axios = require('axios');

const GITHUB_API = 'https://api.github.com';

function getGitHubHeaders() {
  const headers = {
    Accept: 'application/vnd.github.v3+json',
    'X-GitHub-Api-Version': '2022-11-28'
  };

  if (process.env.GITHUB_TOKEN) {
    headers.Authorization = `Bearer ${process.env.GITHUB_TOKEN}`;
  }

  return headers;
}

/**
 * Analyze GitHub profile and extract data
 * @param {string} githubUrl - GitHub profile URL
 * @returns {Promise<Object>} GitHub analysis data
 */
async function analyzeGitHub(githubUrl) {
  try {
    if (!githubUrl) {
      return null;
    }
    
    const username = extractUsername(githubUrl);
    if (!username) {
      throw new Error('Invalid GitHub URL');
    }
    
    const githubData = {
      profile: await fetchGitHubProfile(username),
      repositories: await fetchRepositories(username),
      languages: await analyzeLanguages(username),
      topProjects: await getTopProjects(username)
    };
    
    return githubData;
  } catch (error) {
    console.error('GitHub analysis error:', error.message);
    return null;
  }
}

/**
 * Extract username from GitHub URL
 */
function extractUsername(url) {
  try {
    const parsed = new URL(url);
    if (!/(^|\.)github\.com$/i.test(parsed.hostname)) {
      return null;
    }

    return parsed.pathname.split('/').filter(Boolean)[0] || null;
  } catch (error) {
    const match = url.match(/github\.com\/([a-zA-Z0-9-]+)/i);
    return match ? match[1] : null;
  }
}

/**
 * Fetch GitHub user profile
 */
async function fetchGitHubProfile(username) {
  try {
    const headers = getGitHubHeaders();
    const response = await axios.get(`${GITHUB_API}/users/${username}`, { headers });
    const data = response.data;
    
    return {
      username: data.login,
      name: data.name || data.login,
      bio: data.bio || '',
      location: data.location || '',
      followers: data.followers || 0,
      following: data.following || 0,
      publicRepos: data.public_repos || 0,
      profileUrl: data.html_url
    };
  } catch (error) {
    throw new Error(`Failed to fetch GitHub profile: ${error.message}`);
  }
}

/**
 * Fetch user repositories
 */
async function fetchRepositories(username) {
  try {
    const headers = getGitHubHeaders();
    const response = await axios.get(`${GITHUB_API}/users/${username}/repos`, {
      headers,
      params: {
        sort: 'stars',
        direction: 'desc',
        per_page: 20
      }
    });
    
    return response.data.map(repo => ({
      name: repo.name,
      description: repo.description || 'No description',
      url: repo.html_url,
      language: repo.language || 'Unknown',
      stars: repo.stargazers_count || 0,
      forks: repo.forks_count || 0,
      topics: repo.topics || []
    }));
  } catch (error) {
    console.error('Error fetching repositories:', error.message);
    return [];
  }
}

/**
 * Analyze programming languages used
 */
async function analyzeLanguages(username) {
  try {
    const headers = getGitHubHeaders();
    const response = await axios.get(`${GITHUB_API}/users/${username}/repos`, {
      headers,
      params: { per_page: 100 }
    });
    
    const languages = {};
    
    for (const repo of response.data) {
      if (repo.language) {
        languages[repo.language] = (languages[repo.language] || 0) + 1;
      }
    }
    
    return languages;
  } catch (error) {
    console.error('Error analyzing languages:', error.message);
    return {};
  }
}

/**
 * Get top projects
 */
async function getTopProjects(username) {
  try {
    const headers = getGitHubHeaders();
    const response = await axios.get(`${GITHUB_API}/users/${username}/repos`, {
      headers,
      params: {
        sort: 'stars',
        direction: 'desc',
        per_page: 5
      }
    });
    
    return response.data.map(repo => ({
      name: repo.name,
      stars: repo.stargazers_count || 0,
      language: repo.language || 'Unknown'
    }));
  } catch (error) {
    console.error('Error fetching top projects:', error.message);
    return [];
  }
}

module.exports = {
  analyzeGitHub
};
