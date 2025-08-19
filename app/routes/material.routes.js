const controller = require('../controllers/material.controller');
const { verifyToken, isSenior } = require('../middlewares/authJwt');

module.exports = function (app) {
  app.use(function (req, res, next) {
    res.header('Access-Control-Allow-Headers', 'Origin, Content-Type, Accept');
    next();
  });
  app.post(
    '/api/material/creatematerial',
    verifyToken,
    isSenior,
    controller.createMaterial
  );
  app.get('/api/material/getallmaterials', verifyToken, controller.getMaterials);
  app.get(
    '/api/material/getactivematerials',
    verifyToken,
    controller.getActiveMaterials
  );
  app.get(
    '/api/material/getmaterialbyid/:id',
    verifyToken,
    controller.getMaterialById
  );
  app.put(
    '/api/material/updatevendor/:id',
    verifyToken,
    isSenior,
    controller.updateMaterial
  );
  app.put(
    '/api/material/togglematerialstatus/:id',
    verifyToken,
    isSenior,
    controller.toggleMaterialStatus
  );
  app.delete(
    '/api/material/deletematerial/:id',
    verifyToken,
    isSenior,
    controller.deleteMaterial
  );
};
