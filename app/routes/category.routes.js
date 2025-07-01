const controller = require('../controllers/categoryDetails.controller');
const { uploadImage } = require('../middlewares/uploadImage');
const { verifyToken, isSenior } = require('../middlewares/authJwt');
module.exports = function (app) {
  app.use(function (req, res, next) {
    res.header('Access-Control-Allow-Headers', 'Origin, Content-Type, Accept');
    next();
  });
  app.post(
    '/api/admin/category/add',
    verifyToken,
    isSenior,
    uploadImage.fields([
      {
        name: 'categoryImage',
        maxCount: 10,
      },
    ]),
    controller.saveCategoryDetails
  );
  app.post(
    '/api/admin/category/update',
    uploadImage.fields([
      {
        name: 'categoryImage',
        maxCount: 10,
      },
    ]),
    verifyToken,
    isSenior,
    controller.updateCategoryDetails
  );
  app.patch(
    '/api/admin/category/update-status',
    controller.updateCategoryStatus
  );
  app.get('/api/admin/category/list', verifyToken, controller.getAllCategory);
  app.get(
    '/api/admin/category/list/categoryName',
    verifyToken,
    controller.getCategoryListByName
  );
  app.post(
    '/api/admin/view-category',
    verifyToken,
    controller.getCategoryDetailsById
  );
  app.delete(
    '/api/admin/category/delete/:id',
    verifyToken,
    isSenior,
    controller.deleteCategoryDetails
  );
};
