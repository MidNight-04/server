const controller = require('../controllers/projectRole.controller');
const { verifyToken, isSenior } = require('../middlewares/authJwt');

module.exports = function (app) {
  app.use(function (req, res, next) {
    res.header('Access-Control-Allow-Headers', 'Origin, Content-Type, Accept');
    next();
  });

  app.post(
    '/api/role/add',
    verifyToken,
    isSenior,
    controller.addProjectRole
  );
  app.get('/api/role/getall', verifyToken, controller.getAllRole);
  app.get(
    '/api/role/databyid/:id',
    verifyToken,
    controller.getProjectRoleById
  );
  app.put(
    '/api/role/updatebyid',
    verifyToken,
    isSenior,
    controller.updateProjectRoleById
  );
  app.delete(
    '/api/role/delete/:id',
    verifyToken,
    isSenior,
    controller.deleteProjectRoleById
  );
  // app.post("/api/notification/createNotification", controller.createNotification);
  // app.post("/api/notification/updateNotification", controller.updateNotification);
};
