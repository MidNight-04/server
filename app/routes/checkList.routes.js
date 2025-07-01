const controller = require('../controllers/checkList.controller');
const { uploadImage } = require('../middlewares/uploadImage');
const { verifyToken, isSenior } = require('../middlewares/authJwt');

module.exports = function (app) {
  app.use(function (req, res, next) {
    res.header('Access-Control-Allow-Headers', 'Origin, Content-Type, Accept');
    next();
  });

  app.post(
    '/api/project/checklist/add',
    verifyToken,
    isSenior,
    controller.addCheckList
  );
  app.get(
    '/api/project/checklist/all',
    verifyToken,
    controller.getAllCheckList
  );
  app.put(
    '/api/project/checklist/addpoint',
    verifyToken,
    isSenior,
    controller.addNewPointById
  );
  app.put(
    '/api/project/checklist/addextrapoint',
    verifyToken,
    isSenior,
    controller.addNewExtraPointById
  );
  app.put(
    '/api/project/checklist/deletepoint',
    verifyToken,
    isSenior,
    controller.deletePointById
  );
  // app.put("/api/project/checklist/addnewheading", controller.addNewHeadingById);
  app.delete(
    '/api/project/checklist/delete/:id',
    verifyToken,
    isSenior,
    controller.deleteCheckListById
  );
};
