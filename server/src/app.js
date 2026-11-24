const express = require('express');
const cors = require('cors');
const path = require('path');
const apiRoutes = require('./routes/api');
const modelService = require('./services/modelService');
const ocrService = require('./services/ocrService');

const app = express();
const PORT = process.env.PORT || 5000;

// Enable CORS for frontend development
app.use(cors());

// Parse JSON and urlencoded requests
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Mount API routes
app.use('/api', apiRoutes);

// Serve built static frontend if available
const clientDistPath = path.resolve(__dirname, '../../client/dist');
const fs = require('fs');
if (fs.existsSync(clientDistPath)) {
  app.use(express.static(clientDistPath));
}

// Fallback for SPA routing (only if not an /api route)
app.get('*', (req, res, next) => {
  if (req.path.startsWith('/api')) return next();
  if (fs.existsSync(path.join(clientDistPath, 'index.html'))) {
    return res.sendFile(path.join(clientDistPath, 'index.html'));
  }
  res.json({
    message: 'AI-Based Identity Document Classification and Verification API',
    status: 'online',
    version: '1.0.0'
  });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('[Server Error]:', err.stack || err.message);
  res.status(err.status || 500).json({
    success: false,
    error: err.message || 'Internal Server Error'
  });
});

if (require.main === module) {
  const server = app.listen(PORT, async () => {
    console.log(`Server running on http://localhost:${PORT}`);
    console.log(`Health check: http://localhost:${PORT}/api/health`);
    console.log(`Dataset stats: http://localhost:${PORT}/api/dataset/stats`);
    console.log(`Model status: http://localhost:${PORT}/api/model/status`);
    console.log(`Classify API: POST http://localhost:${PORT}/api/classify`);

    // Asynchronously preload model and OCR worker into memory on server start
    try {
      await Promise.all([
        modelService.initModel(),
        ocrService.initOcrWorker()
      ]);
      console.log('✅ Model & OCR pipeline ready for live inference.');
    } catch (e) {
      console.warn('⚠️ Warning: Model/OCR preload failed. Will retry on first request:', e.message);
    }
  });

  server.on('error', (err) => {
    if (err.code === 'EADDRINUSE') {
      console.error(`\n❌ Error: Port ${PORT} is already in use by another process.`);
      console.error(`To free port ${PORT}, run:`);
      console.error(`  powershell -Command "Stop-Process -Id (Get-NetTCPConnection -LocalPort ${PORT}).OwningProcess -Force"\n`);
      process.exit(1);
    } else {
      console.error('Server error:', err);
      process.exit(1);
    }
  });
}

module.exports = app;
