const controller = require('../controllers/floor.controller');
const { verifyToken, isSenior } = require('../middlewares/authJwt');

module.exports = function (app) {
  app.use(function (req, res, next) {
    res.header('Access-Control-Allow-Headers', 'Origin, Content-Type, Accept');
    next();
  });

  app.post('/api/floor/add', verifyToken, isSenior, controller.addProjectFloor);
  app.get('/api/floor/getall', verifyToken, controller.getAllProjectFloor);
  app.get(
    '/api/floor/databyid/:id',
    verifyToken,
    controller.getProjectFloorById
  );
  app.put(
    '/api/floor/updatebyid',
    verifyToken,
    isSenior,
    controller.updateProjectFloorById
  );
  app.delete(
    '/api/floor/delete/:id',
    verifyToken,
    isSenior,
    controller.deleteProjectFloorById
  );
};
