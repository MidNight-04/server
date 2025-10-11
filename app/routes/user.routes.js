const { authJwt } = require('../middlewares');
const controller = require('../controllers/user.controller');
const { verifyToken } = require('../middlewares/authJwt');

module.exports = function (app) {
  app.use(function (req, res, next) {
    res.header('Access-Control-Allow-Headers', 'Origin, Content-Type, Accept');
    next();
  });

  app.get('/api/test/all', controller.allAccess);

  app.get('/api/test/user', [authJwt.verifyToken], controller.userBoard);

  app.get(
    '/api/test/mod',
    [authJwt.verifyToken, authJwt.isModerator],
    controller.moderatorBoard
  );

  app.get(
    '/api/test/admin',
    [authJwt.verifyToken, authJwt.isAdmin],
    controller.adminBoard
  );
  app.get('/api/user/getallusers', verifyToken, controller.getAllUsers);
  app.get(
    '/api/user/toggleuserstatus/:id',
    verifyToken,
    controller.toggleUserStatusById
  );
  app.post(
    '/api/user/addplayerid/:playerId',
    verifyToken,
    controller.addPlayerId
  );
  app.delete(
    '/api/user/removePlayerId/:playerId',
    verifyToken,
    controller.removePlayerId
  );
};
