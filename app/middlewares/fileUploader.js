const multer = require('multer');
const fs = require('fs');
const path = require('path');

const uploadDir = path.join(process.cwd(), 'uploads');

if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
  console.log('Created uploads folder:', uploadDir);
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadDir),
  filename: (req, file, cb) => cb(null, Date.now() + '-' + file.originalname),
});

// Allowed MIME types per field
const mimeTypes = {
  image: ['image/jpeg', 'image/png', 'image/gif', 'image/webp'],
  video: ['video/mp4', 'video/mkv', 'video/avi', 'video/webm'],
  audio: ['audio/mpeg', 'audio/wav', 'audio/ogg'],
  docs: [
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  ],
  document: [
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  ],
  file: ['application/octet-stream'], // fallback (accepts any generic binary file)
};

// File filter logic
const fileFilter = (req, file, cb) => {
  const allowed = mimeTypes[file.fieldname];

  if (allowed) {
    if (!allowed.includes(file.mimetype)) {
      return cb(
        new Error(
          `Invalid file type for field "${
            file.fieldname
          }". Allowed types: ${allowed.join(', ')}`
        ),
        false
      );
    }
  }

  cb(null, true);
};

const upload = multer({
  storage,
  fileFilter,
  limits: { fileSize: 1024 * 1024 * 30 }, // 30 MB
}).fields([
  { name: 'docs', maxCount: 20 },
  { name: 'video', maxCount: 10 },
  { name: 'audio', maxCount: 10 },
  { name: 'image', maxCount: 10 },
  { name: 'file', maxCount: 10 },
  { name: 'document', maxCount: 10 },
]);

module.exports = (req, res, next) => {
  upload(req, res, err => {
    if (err) {
      console.error('Multer error:', err);
      return res.status(400).json({ success: false, message: err.message });
    }
    next();
  });
};
