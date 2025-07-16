// const multer = require('multer');

// var storage = multer.diskStorage({
//   destination: function (req, file, callback) {
//     callback(null, 'uploads/');
//   },
//   filename: function (req, file, callback) {
//     callback(null, Date.now() + '-' + file.originalname);
//   },
// });

// // var upload = multer({
// //   storage: storage,
// //   limits: { fileSize: 1024 * 1024 * 30 },
// // }).array("file", 20);

// var upload = multer({
//   storage: storage,
//   limits: { fileSize: 1024 * 1024 * 30 },
// }).fields([
//   {
//     name: 'docs',
//     maxCount: 20,
//   },
//   {
//     name: 'audio',
//     maxCount: 10,
//   },
//   {
//     name: 'image',
//     maxCount: 10,
//   },
//   {
//     name: 'file',
//     maxCount: 10,
//   },
//   {
//     name: 'document',
//     maxCount: 10,
//   },
// ]);

// module.exports = (req, res, next) => {
//   upload(req, res, function (err) {
//     req.uploadError = false;
//     if (err) {
//       req.uploadError = true;
//     }
//     next();
//   });
// };

const multer = require('multer');
const fs = require('fs');
const path = require('path');

const uploadDir = path.join(process.cwd(), 'uploads');

if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
  console.log('Created uploads folder:', uploadDir);
}

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, uploadDir);
  },
  filename: function (req, file, cb) {
    cb(null, Date.now() + '-' + file.originalname);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 1024 * 1024 * 30 }, // 30 MB
}).fields([
  { name: 'docs', maxCount: 20 },
  { name: 'audio', maxCount: 10 },
  { name: 'image', maxCount: 10 },
  { name: 'file', maxCount: 10 },
  { name: 'document', maxCount: 10 },
]);

module.exports = (req, res, next) => {
  upload(req, res, err => {
    if (err) {
      console.error('Multer error:', err);
      req.uploadError = true;
    } else {
      req.uploadError = false;
    }
    next();
  });
};
