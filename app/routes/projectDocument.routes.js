const controller = require("../controllers/projectDocument.controller");
const { uploadImage } = require('../middlewares/uploadImage');
const fileUploader = require('../middlewares/fileUploader');
module.exports = function (app) {
    app.use(function (req, res, next) {
        res.header(
            "Access-Control-Allow-Headers",
            "Origin, Content-Type, Accept"
        );
        next();
    });
    app.post("/api/admin/project-document/add",
        // uploadImage.fields([{name: 'document', maxCount: 10 }]),
        fileUploader,
        controller.addProjectDocument);
    // app.post("/api/admin/category/update", uploadImage.fields([
    //         {
    //         name: 'categoryImage', maxCount: 10
    //     }
    //     ]), controller.updateCategoryDetails);
    app.put("/api/client/project-document/update-statusbyclient", controller.updateDocumentStatusByClient);
    app.get("/api/client/project-document/bysiteid/:id", controller.getDocumentBySiteID);
    app.get("/api/client/project-document/byclient/:id", controller.getDocumentByClientID);
    app.get("/api/client/project-document/byid/:id", controller.getDocumentByID);
    app.get("/api/client/project-document/view", controller.viewDocument);
    // app.get("/api/admin/category/list/categoryName", controller.getCategoryListByName);
    // app.post("/api/admin/view-category", controller.getCategoryDetailsById);
    // app.delete("/api/admin/category/delete/:id", controller.deleteCategoryDetails);
};