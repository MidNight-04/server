const controller = require('../controllers/taskCategory.controller');
const { verifyToken, isSenior } = require('../middlewares/authJwt');

module.exports = function (app) {
  app.use(function (req, res, next) {
    res.header('Access-Control-Allow-Headers', 'Origin, Content-Type, Accept');
    next();
  });

  app.post('/api/category/add', verifyToken, isSenior, controller.addCategory);
  app.get('/api/category/list', verifyToken, controller.getAllCategory);
  app.get(
    '/api/task-category/databyid/:id',
    verifyToken,
    controller.getTaskCategoryById
  );
  app.put(
    '/api/task-category/updatebyid',
    verifyToken,
    isSenior,
    controller.updateTaskCategoryById
  );
  app.delete(
    '/api/task-category/delete/:id',
    verifyToken,
    isSenior,
    controller.deleteTaskCategoryById
  );
};
