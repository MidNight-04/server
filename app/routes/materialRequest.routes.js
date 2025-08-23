const controller = require('../controllers/materialRequest.controller');
const { verifyToken, isSenior } = require('../middlewares/authJwt');

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
    '/api/materialrequest/getallrequest',
    controller.getAllMaterialRequests
  );
  app.get(
    '/api/materialrequest/getorderbyid/:id',
    controller.getMaterialRequestById
  );
  app.get(
    '/api/materialrequest/getordersbysite/:siteId',
    controller.getOrdersBySite
  );
  app.put('/api/materialrequest/update/:id', controller.updateMaterialRequest);
  app.put(
    '/api/materialrequest/addmaterialtoorder/:id',
    controller.addMaterialToOrder
  );
  app.delete(
    '/api/materialrequest/removematerialfromorder/:id',
    controller.removeMaterialFromOrder
  );
  app.delete('/api/materialrequest/deleteorder/:id', controller.deleteOrder);
  app.put(
    '/api/materialrequest/receivematerials/:requestId',
    verifyToken,
    controller.receiveMaterials
  );
};
