const controller = require('../controllers/vendor.controller');
const { verifyToken, isSenior } = require('../middlewares/authJwt');

module.exports = function (app) {
  app.use(function (req, res, next) {
    res.header('Access-Control-Allow-Headers', 'Origin, Content-Type, Accept');
    next();
  });
  app.post(
    '/api/vendor/createvendor',
    verifyToken,
    isSenior,
    controller.createVendor
  );
  app.get('/api/vendor/getallvendors', verifyToken, controller.getAllVendors);
  app.get(
    '/api/vendor/getactivevendors',
    verifyToken,
    controller.getActiveVendors
  );
  app.get(
    '/api/vendor/getvendorbyid/:id',
    verifyToken,
    controller.getVendorById
  );
  app.put(
    '/api/vendor/updatevendor/:id',
    verifyToken,
    isSenior,
    controller.updateVendor
  );
  app.put(
    '/api/vendor/togglevendorstatus/:id',
    verifyToken,
    isSenior,
    controller.toggleVendorStatus
  );
  app.delete(
    '/api/vendor/deletevendor/:id',
    verifyToken,
    isSenior,
    controller.deleteVendor
  );
};
