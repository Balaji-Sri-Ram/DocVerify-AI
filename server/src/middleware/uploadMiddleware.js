const multer = require('multer');

// Memory storage: Privacy & Security first.
// Document images are held strictly in RAM during request processing and never written to disk.
const storage = multer.memoryStorage();

const ALLOWED_MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/jpg'];
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10 MB limit

function fileFilter(req, file, cb) {
  if (ALLOWED_MIME_TYPES.includes(file.mimetype.toLowerCase())) {
    cb(null, true);
  } else {
    const error = new Error(`Unsupported file type: ${file.mimetype}. Allowed types: JPEG, PNG, WEBP.`);
    error.code = 'INVALID_FILE_TYPE';
    cb(error, false);
  }
}

const upload = multer({
  storage,
  limits: {
    fileSize: MAX_FILE_SIZE,
    files: 1
  },
  fileFilter
});

module.exports = upload;
