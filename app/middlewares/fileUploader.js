const multer = require("multer");

var storage = multer.diskStorage({
  destination: function (req, file, callback) {
    callback(null, "uploads/");
  },
  filename: function (req, file, callback) {
    callback(null, Date.now() + "-" + file.originalname);
  },
});

// var upload = multer({
//   storage: storage,
//   limits: { fileSize: 1024 * 1024 * 30 },
// }).array("file", 20);

var upload = multer({
  storage: storage,
  limits: { fileSize: 1024 * 1024 * 30 },
}).fields([
  {
    name: "docs",
    maxCount: 20,
  },
  {
    name: "audio",
    maxCount: 10,
  },
  {
    name: "image",
    maxCount: 10,
  },
  {
    name: "file",
    maxCount: 10,
  },
  {
    name: "document",
    maxCount: 10,
  },
]);

module.exports = (req, res, next) => {
  upload(req, res, function (err) {
    req.uploadError = false;
    if (err) {
      req.uploadError = true;
    }
    next();
  });
};
