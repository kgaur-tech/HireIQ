const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const authMiddleware = require('../middleware/auth.middleware');
const {
  createAnalysis,
  createPublicAnalysis,
  getAnalysis,
  getPublicAnalysis,
  getAnalysisHistory
} = require('../controllers/analysis.controller');

// Create uploads directory if it doesn't exist
const uploadsDir = path.join(__dirname, '../uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

// Configure multer
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, uploadsDir);
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const ext = path.extname(file.originalname);
    const name = path.basename(file.originalname, ext);
    cb(null, name + '-' + uniqueSuffix + ext);
  }
});

const upload = multer({
  storage: storage,
  limits: {
    fileSize: parseInt(process.env.MAX_FILE_SIZE) || 5242880 // 5MB default
  },
  fileFilter: function (req, file, cb) {
    const allowedMimes = ['application/pdf', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'application/msword'];
    
    if (allowedMimes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type. Only PDF and Word documents are allowed.'));
    }
  }
});

// Routes
// Create analysis from resume page without login
router.post('/public', upload.single('resume'), createPublicAnalysis);

// Get public analysis from resume page without login
router.get('/public/:id', getPublicAnalysis);

// Create analysis (protected)
router.post('/', authMiddleware, upload.single('resume'), createAnalysis);

// Get analysis history (protected)
router.get('/user/history', authMiddleware, getAnalysisHistory);

// Get analysis (protected)
router.get('/:id', authMiddleware, getAnalysis);

module.exports = router;
