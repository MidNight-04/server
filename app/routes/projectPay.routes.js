const controller = require('../controllers/projectPay.controller');
const { verifyToken, isSenior } = require('../middlewares/authJwt');

module.exports = function (app) {
  app.use(function (req, res, next) {
    res.header('Access-Control-Allow-Headers', 'Origin, Content-Type, Accept');
    next();
  });

  app.get(
    '/api/project/paydetailbysiteid/:id',
    verifyToken,
    controller.payDetailBySiteID
  );
};
