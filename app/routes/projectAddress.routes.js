const controller = require('../controllers/projectAddress.controller');
const { verifyToken, isSenior } = require('../middlewares/authJwt');

module.exports = function (app) {
  app.use(function (req, res, next) {
    res.header('Access-Control-Allow-Headers', 'Origin, Content-Type, Accept');
    next();
  });

  // Address api
  app.post(
    '/api/project/add-address',
    verifyToken,
    isSenior,
    controller.addAddress
  );
  app.post(
    '/api/project/update-address',
    verifyToken,
    isSenior,
    controller.updateAddress
  );
  app.post(
    '/api/project/delete-address',
    verifyToken,
    isSenior,
    controller.deleteAddress
  );
  app.post('/api/project/get-address', verifyToken, controller.getAddress);
};
