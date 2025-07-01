const controller = require('../controllers/paymentStages.controller');
const { uploadImage } = require('../middlewares/uploadImage');
const fileUploader = require('../middlewares/fileUploader');
const { verifyToken, isSenior } = require('../middlewares/authJwt');

module.exports = function (app) {
  app.use(function (req, res, next) {
    res.header('Access-Control-Allow-Headers', 'Origin, Content-Type, Accept');
    next();
  });

  app.post(
    '/api/paymentstages/add',
    verifyToken,
    isSenior,
    // uploadImage.fields([
    // {
    // name: 'stages', maxCount: 10
    // }]),
    fileUploader,
    controller.addPaymentStages
  );
  app.get(
    '/api/paymentstages/getall',
    verifyToken,
    controller.getPaymentStages
  );
  app.put(
    '/api/paymentstages/stageupdatebyid',
    verifyToken,
    controller.updatePaymentStagePointById
  );
  app.put(
    '/api/paymentstages/addnewstage',
    verifyToken,
    isSenior,
    controller.addNewPaymentStagePointById
  );
  app.put(
    '/api/paymentstages/deletestage',
    verifyToken,
    isSenior,
    controller.deletePaymentStagePointById
  );
  app.delete(
    '/api/paymentstages/delete/:id',
    verifyToken,
    isSenior,
    controller.deletePaymentStages
  );
};
