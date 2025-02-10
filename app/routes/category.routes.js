const controller = require("../controllers/categoryDetails.controller");
const { uploadImage } = require('../middlewares/uploadImage');
module.exports = function (app) {
    app.use(function (req, res, next) {
        res.header(
            "Access-Control-Allow-Headers",
            "Origin, Content-Type, Accept"
        );
        next();
    });
    app.post("/api/admin/category/add", uploadImage.fields([
            {
            name: 'categoryImage', maxCount: 10
        }
        ]), controller.saveCategoryDetails);
    app.post("/api/admin/category/update", uploadImage.fields([
            {
            name: 'categoryImage', maxCount: 10
        }
        ]), controller.updateCategoryDetails);
    app.patch("/api/admin/category/update-status", controller.updateCategoryStatus);
    app.get("/api/admin/category/list", controller.getAllCategory);
    app.get("/api/admin/category/list/categoryName", controller.getCategoryListByName);
    app.post("/api/admin/view-category", controller.getCategoryDetailsById);
    app.delete("/api/admin/category/delete/:id", controller.deleteCategoryDetails);
};