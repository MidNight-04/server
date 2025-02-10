const multer = require("multer");
const multerS3 = require("multer-s3");
const { S3Client } = require("@aws-sdk/client-s3");
const { accessKeyId, secretAccessKey } = require("../config/auth.config");
const path = require("path");
// create s3 instance using S3Client
const s3 = new S3Client({
  credentials: {
    accessKeyId,
    secretAccessKey,
  },
  region: "us-east-1", // this is the region that you select in AWS account
});

const s3Storage = multerS3({
  s3: s3, // s3 instance
  bucket: "thekedar-bucket", // change it as per your project requirement
  acl: "public-read", // storage access type
  metadata: (req, file, cb) => {
    // console.log("upcoming----",file);
    cb(null, { fieldname: file.fieldname });
  },
  key: (req, file, cb) => {
    const fileName =
      Date.now() + "_" + file.fieldname + "_" + file.originalname;
    cb(null, fileName);
  },
});
// function to sanitize files and send error for unsupported files
function sanitizeFile(file, cb) {
  // console.log("upcoming----",file);
  // Define the allowed extension
  const fileExts = [
    ".png",
    ".jpg",
    ".jpeg",
    ".gif",
    ".pdf",
    ".in",
    ".xlsx",
    ".blob",
  ];
  // console.log(file)
  // Check allowed extensions
  const isAllowedExt = fileExts.includes(
    path.extname(file.originalname.toLowerCase())
  );
  if (
    (isAllowedExt && file.mimetype.startsWith("image/")) ||
    file.mimetype.startsWith("application/") ||
    file.mimetype.startsWith("audio/")
  ) {
    return cb(null, true); // no errors
  } else {
    // pass error msg to callback, which can be displaye in frontend
    cb("Error: File type not allowed!");
  }
}

// our middleware
const uploadImage = multer({
  storage: s3Storage,
  fileFilter: (req, file, callback) => {
    sanitizeFile(file, callback);
  },
  limits: {
    fileSize: 1024 * 1024 * 30, // 2mb file size
  },
});

// module.exports = uploadImage;
exports.uploadImage = uploadImage;
