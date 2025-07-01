const controller = require('../controllers/process.controller');
const { uploadImage } = require('../middlewares/uploadImage');
const uploader = require('../middlewares/fileUploader');
const { verifyToken, isSenior } = require('../middlewares/authJwt');

module.exports = function (app) {
  app.use(function (req, res, next) {
    res.header('Access-Control-Allow-Headers', 'Origin, Content-Type, Accept');
    next();
  });

  app.post(
    '/api/constructionstep/add',
    verifyToken,
    isSenior,
    uploader,
    controller.addConstructionStep
  );
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
  app.get(
    '/api/constructionstep/getall',
    verifyToken,
    controller.getConstructionStep
  );
  // app.get("/api/constructionstep/databyid/:id", controller.getProjectRoleById);
  app.put(
    '/api/constructionstep/addnewfield',
    verifyToken,
    isSenior,
    controller.addNewFieldConstructionStepById
  );
  app.put(
    '/api/constructionstep/deletefield',
    verifyToken,
    isSenior,
    controller.deleteConstructionPointById
  );
  app.delete(
    '/api/constructionstep/delete/:id',
    verifyToken,
    isSenior,
    controller.deleteConstructionStepById
  );
  app.put('/api/constructionstep/reorder', controller.reorderSteps);
};
