const controller = require("../controllers/process.controller");
const { uploadImage } = require("../middlewares/uploadImage");
const uploader = require("../middlewares/fileUploader");

module.exports = function (app) {
  app.use(function (req, res, next) {
    res.header("Access-Control-Allow-Headers", "Origin, Content-Type, Accept");
    next();
  });

app.post("/api/constructionstep/add", uploader, controller.addConstructionStep);
  // app.post(
  //   "/api/constructionstep/add",
  //   uploadImage.fields([
  //     {
  //       name: "points",
  //       maxCount: 99,
  //     },
  //   ]),
  //   controller.addConstructionStep
  // );
  app.get("/api/constructionstep/getall", controller.getConstructionStep);
  // app.get("/api/constructionstep/databyid/:id", controller.getProjectRoleById);
  app.put(
    "/api/constructionstep/addnewfield",
    controller.addNewFieldConstructionStepById
  );
  app.put(
    "/api/constructionstep/deletefield",
    controller.deleteConstructionPointById
  );
  app.delete(
    "/api/constructionstep/delete/:id",
    controller.deleteConstructionStepById
  );
};
