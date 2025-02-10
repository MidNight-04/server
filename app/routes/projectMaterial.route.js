const controller = require("../controllers/projectMaterial.controller");
const { uploadImage } = require("../middlewares/uploadImage");

module.exports = function (app) {
    app.use(function (req, res, next) {
        res.header(
            "Access-Control-Allow-Headers",
            "Origin, Content-Type, Accept"
        );
        next();
    });
    app.post("/api/project-material/add", controller.addProjectMaterial);
    app.get("/api/project-material/getall", controller.getAllProjectMaterial);
    app.get("/api/project-material/:id", controller.getProjectMaterialBySiteID);
    app.get("/api/project-material-request/id/:id", controller.getProjectMaterialRequestById);
    app.put("/api/project-material-request/updatebypm", controller.updateProjectMaterialRequestByPM);
    app.put("/api/project-material-request/updatebyoperation", controller.updateProjectMaterialRequestByOperation);
    app.put("/api/project-material-request/updatebyadmin", controller.updateProjectMaterialRequestByAdmin);
    app.put("/api/project-material-request/orderbyadmin", controller.orderProjectMaterialRequestByAdmin);
    app.put("/api/project-material-request/deliveredbyadmin", controller.deliveredProjectMaterialRequestByAdmin);
    app.put("/api/project-material-request/updatedeliveredmaterialbypm", controller.updateDeliveredMaterialbypm);
    // app.delete("/api/project-material/delete/:id", controller.deleteProjectMaterialById);
    
};