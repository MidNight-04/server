const controller = require("../controllers/projectLog.controller");
const { uploadImage } = require("../middlewares/uploadImage");


module.exports = function (app) {
  app.use(function (req, res, next) {
    res.header("Access-Control-Allow-Headers", "Origin, Content-Type, Accept");
    next();
  });

  app.post(
    "/api/log/add",
    uploadImage.fields([
      {
        name: "file",
        maxCount: 20,
      },
    ]),
    controller.addLog
  );

  app.get("/api/log/getall", controller.getAllLog);
  app.get("/api/log/siteid/:id", controller.getLogBySiteId);
};
