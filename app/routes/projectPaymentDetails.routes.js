const controller = require('../controllers/projectPaymentDetails.controller');
const { verifyToken, isSenior } = require('../middlewares/authJwt');

module.exports = function (app) {
  app.use(function (req, res, next) {
    res.header('Access-Control-Allow-Headers', 'Origin, Content-Type, Accept');
    next();
  });
  app.post(
    '/api/project/initiate-payment',
    verifyToken,
    isSenior,
    controller.initiatePayment
  );
  app.post(
    '/api/project/verify-payment',
    verifyToken,
    isSenior,
    controller.verifyPayment
  );
};
