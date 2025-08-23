const controller = require('../controllers/purpose.controller');
const { verifyToken, isSenior } = require('../middlewares/authJwt');

module.exports = function (app) {
  app.use(function (req, res, next) {
    res.header('Access-Control-Allow-Headers', 'Origin, Content-Type, Accept');
    next();
  });
  app.post('/api/purpose/createpurpose', verifyToken, controller.createPurpose);
  app.get('/api/purpose/getallpurposes', verifyToken, controller.getPurposes);
};
