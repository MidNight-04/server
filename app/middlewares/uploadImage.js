const multer = require('multer');
const multerS3 = require('multer-s3');
const { S3Client } = require('@aws-sdk/client-s3');
const { accessKeyId, secretAccessKey } = require('../config/auth.config');
const path = require('path');

const s3 = new S3Client({
  credentials: {
    accessKeyId,
    secretAccessKey,
  },
  region: 'us-east-1',
});

const s3Storage = multerS3({
  s3: s3, // s3 instance
  bucket: 'thekedar-bucket', // change it as per your project requirement
  acl: 'public-read', // storage access type
  metadata: (req, file, cb) => {
    cb(null, { fieldname: file.fieldname });
  },
  key: (req, file, cb) => {
    const fileName =
      Date.now() + '_' + file.fieldname + '_' + file.originalname;
    cb(null, fileName);
  },
});

function sanitizeFile(file, cb) {
  const fileExts = [
    '.png',
    '.jpg',
    '.jpeg',
    '.gif',
    '.pdf',
    '.xlsx',
    '.xls',
    '.doc',
    '.docx',
    '.ppt',
    '.pptx',
    '.wav',
    '.mp3',
    '.ogg',
    '.flac',
  ];
  const isAllowedExt = fileExts.includes(
    path.extname(file.originalname.toLowerCase())
  );
  if (
    (isAllowedExt && file.mimetype.startsWith('image/')) ||
    file.mimetype.startsWith('application/') ||
    file.mimetype.startsWith('audio/')
  ) {
    return cb(null, true); // no errors
  } else {
    cb('Error: File type not allowed!');
  }
}

const uploadImage = multer({
  storage: s3Storage,
  fileFilter: (req, file, callback) => {
    sanitizeFile(file, callback);
  },
  limits: {
    fileSize: 1024 * 1024 * 30, // 2mb file size
  },
});

exports.uploadImage = uploadImage;
