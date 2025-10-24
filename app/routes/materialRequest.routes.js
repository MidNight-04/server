const controller = require('../controllers/materialRequest.controller');
const { verifyToken, isSenior } = require('../middlewares/authJwt');
const anyFileUploader = require('../middlewares/anyFileUploader');

module.exports = function (app) {
  app.use(function (req, res, next) {
    res.header('Access-Control-Allow-Headers', 'Origin, Content-Type, Accept');
    next();
  });

  app.post(
    '/api/materialrequest/create',
    verifyToken,
    controller.createMaterialRequest
  );
  app.get(
    '/api/materialrequest/requests',
    verifyToken,
    controller.materialRequests
  );
  app.get(
    '/api/materialrequest/getorderbyid/:id',
    verifyToken,
    controller.getMaterialRequestById
  );
  app.put(
    '/api/materialrequest/update/:id',
    verifyToken,
    controller.updateMaterialRequest
  );
  app.delete(
    '/api/materialrequest/deleteorder/:id',
    verifyToken,
    controller.deleteOrder
  );
  app.put(
    '/api/materialrequest/receivematerials/:requestId',
    verifyToken,
    anyFileUploader,
    controller.receiveMaterials
  );
};
