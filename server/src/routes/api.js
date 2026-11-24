const express = require('express');
const router = express.Router();
const fs = require('fs');
const path = require('path');
const upload = require('../middleware/uploadMiddleware');
const classifyController = require('../controllers/classifyController');
const modelService = require('../services/modelService');

// Health check endpoint
router.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    uptime: process.uptime(),
    timestamp: new Date().toISOString()
  });
});

// Dataset statistics endpoint
router.get('/dataset/stats', (req, res) => {
  try {
    const rawReportPath = path.resolve(__dirname, '../../../reports/dataset_inspection_report.json');
    const workingReportPath = path.resolve(__dirname, '../../../reports/dataset_preparation_report.json');

    const result = {
      success: true,
      raw: null,
      working: null
    };

    if (fs.existsSync(rawReportPath)) {
      result.raw = JSON.parse(fs.readFileSync(rawReportPath, 'utf8'));
    }

    if (fs.existsSync(workingReportPath)) {
      result.working = JSON.parse(fs.readFileSync(workingReportPath, 'utf8'));
    }

    if (result.working) {
      result.summary = {
        totalImages: result.working.overall.total,
        splits: {
          train: result.working.overall.train,
          valid: result.working.overall.valid,
          test: result.working.overall.test
        },
        categoryNames: Object.keys(result.working.categories)
      };
      result.categories = result.working.categories;
    } else if (result.raw) {
      result.summary = result.raw.summary;
      result.categories = result.raw.categories;
    }

    res.json(result);
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Model status endpoint
router.get('/model/status', (req, res) => {
  try {
    const status = modelService.getModelStatus();
    res.json({
      success: true,
      ...status
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Classification endpoint
router.post(
  '/classify',
  (req, res, next) => {
    upload.single('image')(req, res, (err) => {
      if (err) {
        if (err.code === 'LIMIT_FILE_SIZE') {
          return res.status(400).json({
            success: false,
            status: 'INVALID_IMAGE',
            selectedType: req.body?.selectedType || null,
            detectedType: null,
            confidence: 0,
            message: 'Uploaded file exceeds the maximum allowed size of 10 MB.'
          });
        }
        if (err.code === 'INVALID_FILE_TYPE') {
          return res.status(400).json({
            success: false,
            status: 'INVALID_IMAGE',
            selectedType: req.body?.selectedType || null,
            detectedType: null,
            confidence: 0,
            message: err.message
          });
        }
        return res.status(400).json({
          success: false,
          status: 'INVALID_IMAGE',
          selectedType: req.body?.selectedType || null,
          detectedType: null,
          confidence: 0,
          message: `Upload error: ${err.message}`
        });
      }
      next();
    });
  },
  classifyController.classifyDocument
);

module.exports = router;
