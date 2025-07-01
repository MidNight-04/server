const controller = require('../controllers/projectPaymentStage.controller');
const { uploadImage } = require('../middlewares/uploadImage');
const { verifyToken, isSenior } = require('../middlewares/authJwt');

module.exports = function (app) {
  app.use(function (req, res, next) {
    res.header('Access-Control-Allow-Headers', 'Origin, Content-Type, Accept');
    next();
  });

  app.get(
    '/api/project/paymentstages/getall',
    verifyToken,
    controller.getPaymentStages
  );
  app.get(
    '/api/project/paymentstages/bysiteid/:id',
    verifyToken,
    controller.getPaymentStagesBySiteID
  );
  app.post(
    '/api/project/updatepaymentstages/bysiteid/:id',
    verifyToken,
    isSenior,
    controller.updatePaymentStagesBySiteID
  );
  app.post(
    '/api/project/paymentstages/forclient',
    verifyToken,
    controller.getPaymentStagesBySiteIDClientID
  );
  app.put(
    '/api/project/paymentstages/stageupdatebyid',
    verifyToken,
    isSenior,
    controller.updatePaymentStagePointById
  );
  app.put(
    '/api/project/paymentstages/addnewstage',
    verifyToken,
    isSenior,
    controller.addNewPaymentStagePointById
  );
  app.put(
    '/api/project/paymentstages/deletestage',
    verifyToken,
    isSenior,
    controller.deletePaymentStagePointById
  );
  app.delete(
    '/api/project/paymentstages/delete/:id',
    verifyToken,
    isSenior,
    controller.deletePaymentStages
  );
};
