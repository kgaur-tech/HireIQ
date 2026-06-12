// Mock candidate data with interview results
const mockCandidates = [
  {
    id: 1,
    name: "Arjun Sharma",
    email: "arjun.sharma@email.com",
    phone: "+91 9876543210",
    appliedRole: "Full Stack Developer",
    interviewScore: 92,
    technicalScore: 94,
    communicationScore: 88,
    problemSolving: 95,
    interviewDate: "2024-12-15",
    status: "passed",
    skills: ["React", "Node.js", "MongoDB", "Docker"],
  },
  {
    id: 2,
    name: "Priya Patel",
    email: "priya.patel@email.com",
    phone: "+91 9123456789",
    appliedRole: "Frontend Developer",
    interviewScore: 88,
    technicalScore: 86,
    communicationScore: 92,
    problemSolving: 85,
    interviewDate: "2024-12-14",
    status: "passed",
    skills: ["React", "Vue.js", "Tailwind CSS", "TypeScript"],
  },
  {
    id: 3,
    name: "Rohit Verma",
    email: "rohit.verma@email.com",
    phone: "+91 8765432109",
    appliedRole: "Backend Developer",
    interviewScore: 85,
    technicalScore: 88,
    communicationScore: 80,
    problemSolving: 86,
    interviewDate: "2024-12-13",
    status: "passed",
    skills: ["Python", "Django", "PostgreSQL", "Redis"],
  },
  {
    id: 4,
    name: "Neha Singh",
    email: "neha.singh@email.com",
    phone: "+91 7654321098",
    appliedRole: "Full Stack Developer",
    interviewScore: 82,
    technicalScore: 80,
    communicationScore: 85,
    problemSolving: 82,
    interviewDate: "2024-12-12",
    status: "passed",
    skills: ["JavaScript", "React", "Express", "MySQL"],
  },
  {
    id: 5,
    name: "Vikram Kumar",
    email: "vikram.kumar@email.com",
    phone: "+91 6543210987",
    appliedRole: "AI Engineer",
    interviewScore: 79,
    technicalScore: 82,
    communicationScore: 75,
    problemSolving: 80,
    interviewDate: "2024-12-11",
    status: "pending",
    skills: ["Python", "TensorFlow", "PyTorch", "Pandas"],
  },
  {
    id: 6,
    name: "Ananya Desai",
    email: "ananya.desai@email.com",
    phone: "+91 5432109876",
    appliedRole: "DevOps Engineer",
    interviewScore: 76,
    technicalScore: 78,
    communicationScore: 72,
    problemSolving: 78,
    interviewDate: "2024-12-10",
    status: "pending",
    skills: ["Docker", "Kubernetes", "AWS", "Jenkins"],
  },
  {
    id: 7,
    name: "Kavya Nair",
    email: "kavya.nair@email.com",
    phone: "+91 4321098765",
    appliedRole: "Frontend Developer",
    interviewScore: 91,
    technicalScore: 90,
    communicationScore: 93,
    problemSolving: 90,
    interviewDate: "2024-12-09",
    status: "passed",
    skills: ["React", "Next.js", "CSS-in-JS", "Web Performance"],
  },
  {
    id: 8,
    name: "Aditya Gupta",
    email: "aditya.gupta@email.com",
    phone: "+91 3210987654",
    appliedRole: "Full Stack Developer",
    interviewScore: 68,
    technicalScore: 65,
    communicationScore: 70,
    problemSolving: 68,
    interviewDate: "2024-12-08",
    status: "rejected",
    skills: ["JavaScript", "PHP", "MySQL"],
  },
  {
    id: 9,
    name: "Swati Rao",
    email: "swati.rao@email.com",
    phone: "+91 2109876543",
    appliedRole: "Backend Developer",
    interviewScore: 87,
    technicalScore: 89,
    communicationScore: 84,
    problemSolving: 88,
    interviewDate: "2024-12-07",
    status: "passed",
    skills: ["Java", "Spring Boot", "PostgreSQL", "Microservices"],
  },
  {
    id: 10,
    name: "Rahul Joshi",
    email: "rahul.joshi@email.com",
    phone: "+91 1098765432",
    appliedRole: "AI Engineer",
    interviewScore: 84,
    technicalScore: 86,
    communicationScore: 81,
    problemSolving: 85,
    interviewDate: "2024-12-06",
    status: "passed",
    skills: ["Python", "Machine Learning", "Deep Learning", "NLP"],
  },
  {
    id: 11,
    name: "Divya Menon",
    email: "divya.menon@email.com",
    phone: "+91 9876543211",
    appliedRole: "Frontend Developer",
    interviewScore: 80,
    technicalScore: 78,
    communicationScore: 83,
    problemSolving: 79,
    interviewDate: "2024-12-05",
    status: "passed",
    skills: ["React", "Angular", "Bootstrap", "Responsive Design"],
  },
  {
    id: 12,
    name: "Harshit Singh",
    email: "harshit.singh@email.com",
    phone: "+91 9123456780",
    appliedRole: "Full Stack Developer",
    interviewScore: 89,
    technicalScore: 91,
    communicationScore: 86,
    problemSolving: 89,
    interviewDate: "2024-12-04",
    status: "passed",
    skills: ["Node.js", "React", "MongoDB", "GraphQL"],
  },
];

// State management
let allCandidates = [...mockCandidates].sort((a, b) => b.interviewScore - a.interviewScore);
let filteredCandidates = [...allCandidates];
let currentFilters = {
  search: "",
  role: "",
  score: "",
  status: "",
};

// DOM Elements
const searchInput = document.getElementById("searchInput");
const roleFilter = document.getElementById("roleFilter");
const scoreFilter = document.getElementById("scoreFilter");
const statusFilter = document.getElementById("statusFilter");
const clearFiltersBtn = document.getElementById("clearFilters");
const applyFiltersBtn = document.getElementById("applyFilters");
const candidatesContainer = document.getElementById("candidatesContainer");
const candidateCount = document.getElementById("candidateCount");

// Initialize
document.addEventListener("DOMContentLoaded", () => {
  renderCandidates();
  setupEventListeners();
});

// Setup event listeners
function setupEventListeners() {
  applyFiltersBtn.addEventListener("click", applyFilters);
  clearFiltersBtn.addEventListener("click", clearFilters);
  searchInput.addEventListener("keyup", (e) => {
    currentFilters.search = e.target.value;
  });
}

// Apply filters
function applyFilters() {
  const search = searchInput.value.toLowerCase();
  const role = roleFilter.value;
  const score = scoreFilter.value;
  const status = statusFilter.value;

  currentFilters = { search, role, score, status };

  filteredCandidates = allCandidates.filter((candidate) => {
    // Search filter
    if (search) {
      const matchesSearch =
        candidate.name.toLowerCase().includes(search) ||
        candidate.email.toLowerCase().includes(search);
      if (!matchesSearch) return false;
    }

    // Role filter
    if (role) {
      if (!candidate.appliedRole.toLowerCase().includes(role.toLowerCase())) {
        return false;
      }
    }

    // Score filter
    if (score) {
      const [min, max] = score.split("-").map(Number);
      if (candidate.interviewScore < min || candidate.interviewScore > max) {
        return false;
      }
    }

    // Status filter
    if (status) {
      if (candidate.status !== status) return false;
    }

    return true;
  });

  // Re-sort by score after filtering
  filteredCandidates.sort((a, b) => b.interviewScore - a.interviewScore);
  renderCandidates();
}

// Clear filters
function clearFilters() {
  searchInput.value = "";
  roleFilter.value = "";
  scoreFilter.value = "";
  statusFilter.value = "";
  currentFilters = { search: "", role: "", score: "", status: "" };
  filteredCandidates = [...allCandidates].sort(
    (a, b) => b.interviewScore - a.interviewScore
  );
  renderCandidates();
}

// Render candidates
function renderCandidates() {
  if (filteredCandidates.length === 0) {
    candidatesContainer.innerHTML = `
      <div class="empty-state">
        <div class="empty-state__icon">📭</div>
        <p class="empty-state__text">No candidates found matching your filters.</p>
      </div>
    `;
    candidateCount.textContent = "0 candidates";
    return;
  }

  candidateCount.textContent = `${filteredCandidates.length} candidate${
    filteredCandidates.length !== 1 ? "s" : ""
  }`;

  candidatesContainer.innerHTML = filteredCandidates
    .map((candidate, index) => createCandidateCard(candidate, index + 1))
    .join("");

  // Add event listeners to action buttons
  document.querySelectorAll(".view-profile-btn").forEach((btn) => {
    btn.addEventListener("click", (e) => {
      const candidateId = parseInt(e.target.dataset.candidateId);
      showCandidateDetails(candidateId);
    });
  });
}

// Create candidate card
function createCandidateCard(candidate, rank) {
  const scoreColor =
    candidate.interviewScore >= 85
      ? "badge--high"
      : candidate.interviewScore >= 75
      ? "badge--medium"
      : "";

  const statusColor = {
    passed: "✓ Passed",
    rejected: "✗ Rejected",
    pending: "⏱ Pending",
  }[candidate.status];

  const skills = candidate.skills.slice(0, 3).join(", ");
  const moreSkills =
    candidate.skills.length > 3 ? `+${candidate.skills.length - 3}` : "";

  return `
    <div class="card-candidate">
      <div class="card-head">
        <div class="candidate-info">
          <h3 class="candidate-name">${candidate.name}</h3>
          <p class="candidate-role">${candidate.appliedRole}</p>
          <p class="candidate-email">${candidate.email}</p>
        </div>
        <div class="rank-badge">
          <p class="rank-number">${rank}</p>
          <p class="rank-label">Rank</p>
        </div>
      </div>

      <div class="card-stats">
        <div class="stat-item">
          <span class="stat-label">Interview</span>
          <p class="stat-value">${candidate.interviewScore}</p>
        </div>
        <div class="stat-item">
          <span class="stat-label">Technical</span>
          <p class="stat-value">${candidate.technicalScore}</p>
        </div>
        <div class="stat-item">
          <span class="stat-label">Communication</span>
          <p class="stat-value">${candidate.communicationScore}</p>
        </div>
        <div class="stat-item">
          <span class="stat-label">Problem Solving</span>
          <p class="stat-value">${candidate.problemSolving}</p>
        </div>
      </div>

      <div class="card-details">
        <div class="detail-item">
          <span class="detail-label">Phone</span>
          <p class="detail-value">${candidate.phone}</p>
        </div>
        <div class="detail-item">
          <span class="detail-label">Interview Date</span>
          <p class="detail-value">${formatDate(candidate.interviewDate)}</p>
        </div>
        <div class="detail-item">
          <span class="detail-label">Skills</span>
          <p class="detail-value">${skills} ${moreSkills}</p>
        </div>
      </div>

      <div class="card-footer">
        <div class="status-badges">
          <span class="badge ${scoreColor}">Score: ${candidate.interviewScore}/100</span>
          <span class="badge">${statusColor}</span>
        </div>
        <button class="action-btn view-profile-btn" data-candidate-id="${candidate.id}">View Full Profile</button>
      </div>
    </div>
  `;
}

// Format date
function formatDate(dateString) {
  const options = { year: "numeric", month: "short", day: "numeric" };
  return new Date(dateString).toLocaleDateString("en-US", options);
}

// Show candidate details (modal or detailed view)
function showCandidateDetails(candidateId) {
  const candidate = allCandidates.find((c) => c.id === candidateId);
  if (!candidate) return;

  alert(`
Candidate: ${candidate.name}
Email: ${candidate.email}
Phone: ${candidate.phone}
Role: ${candidate.appliedRole}

Scores:
- Overall Interview: ${candidate.interviewScore}/100
- Technical: ${candidate.technicalScore}/100
- Communication: ${candidate.communicationScore}/100
- Problem Solving: ${candidate.problemSolving}/100

Status: ${candidate.status.toUpperCase()}
Interview Date: ${formatDate(candidate.interviewDate)}

Skills: ${candidate.skills.join(", ")}

Note: Detailed view modal can be implemented in next phase
  `);
}
